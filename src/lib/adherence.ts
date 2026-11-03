import type { DeviceSession, TreatmentPlan } from './types';

export interface Adherence {
  /** Ngày có dữ liệu đồng bộ trong khoảng xét (không tính ngày chưa đồng bộ). */
  daysWithData: number;
  /** Ngày có số phiên hoàn tất bằng mục tiêu. */
  daysMet: number;
  /** Ngày có nhiều phiên hơn mục tiêu (không nên xảy ra nếu thiết bị ngắt đúng). */
  daysOver: number;
  /** Cặp phiên liên tiếp có giãn cách nhỏ hơn mức tối thiểu. */
  intervalViolations: number;
  intervalPairs: number;
  /** Phiên thiết bị đã tự ngắt vì vượt ngưỡng liệu trình. */
  blocked: number;
}

/**
 * Đánh giá tuân thủ liệu trình từ nhật ký thiết bị (theo màn "Đánh giá hiệu quả điều trị" trên slide).
 * Chỉ tính các ngày đã đồng bộ, để không nhầm "chưa có dữ liệu" thành "không sử dụng" (đặc tả 7.2).
 */
export function computeAdherence(sessions: DeviceSession[], plan: TreatmentPlan | undefined, days: string[], lastSyncDay: string | null): Adherence {
  const synced = days.filter((d) => lastSyncDay !== null && d <= lastSyncDay);
  const done = sessions.filter((s) => s.status === 'completed');
  let daysMet = 0;
  let daysOver = 0;
  let intervalViolations = 0;
  let intervalPairs = 0;
  for (const d of synced) {
    const day = done.filter((s) => s.start.slice(0, 10) === d).sort((a, b) => a.start.localeCompare(b.start));
    if (plan?.sessionsPerDay != null) {
      if (day.length === plan.sessionsPerDay) daysMet++;
      if (day.length > plan.sessionsPerDay) daysOver++;
    }
    if (plan?.minIntervalMin != null) {
      for (let i = 1; i < day.length; i++) {
        intervalPairs++;
        const gap = (new Date(day[i].start).getTime() - new Date(day[i - 1].start).getTime()) / 60000 - day[i - 1].durationMin;
        if (gap < plan.minIntervalMin) intervalViolations++;
      }
    }
  }
  const blocked = sessions.filter((s) => s.status === 'over_limit' && synced.includes(s.start.slice(0, 10))).length;
  return { daysWithData: synced.length, daysMet, daysOver, intervalViolations, intervalPairs, blocked };
}

/** Trạng thái điều trị trong ngày, diễn đạt cho bệnh nhân (mẫu myAir: một câu chính ở đầu trang). */
export interface TodayStatus {
  kind: 'no_target' | 'remaining' | 'met' | 'over';
  /** Câu chính, ví dụ "Hôm nay: còn 2 lần" hoặc "Đã đủ 2/2 lần". */
  title: string;
  /** Dòng phụ, ví dụ "Đã làm 0/2 lần". */
  detail: string;
}

export function todayStatus(done: number, target: number | null | undefined): TodayStatus {
  if (target == null || target <= 0) return { kind: 'no_target', title: `Hôm nay: đã điều trị ${done} lần`, detail: 'Bác sĩ chưa đặt số lần mỗi ngày.' };
  if (done < target) return { kind: 'remaining', title: `Hôm nay: còn ${target - done} lần`, detail: `Đã làm ${done}/${target} lần` };
  if (done === target) return { kind: 'met', title: `Đã đủ ${target}/${target} lần`, detail: 'Hôm nay đã làm đủ theo liệu trình.' };
  return { kind: 'over', title: `Đã làm ${done} lần, nhiều hơn ${target} lần`, detail: 'Hãy báo bác sĩ phụ trách.' };
}

const prevDay = (d: string) => new Date(new Date(`${d}T00:00:00Z`).getTime() - 86400000).toISOString().slice(0, 10);

/**
 * Chuỗi ngày liên tiếp làm đủ đúng số lần của liệu trình, tính lùi từ hôm nay.
 * - Hôm nay chỉ được cộng khi đã đủ; chưa đủ thì bỏ qua vì ngày chưa kết thúc.
 * - Một ngày đã qua mà thiết bị chưa đồng bộ thì dừng chuỗi: không biết có làm hay không (đặc tả 7.2).
 * - Không tính các ngày trước khi liệu trình bắt đầu.
 */
export function metStreak(sessions: DeviceSession[], target: number | null | undefined, today: string, lastSyncDay: string | null, planStart: string): number {
  if (target == null || target <= 0) return 0;
  const count = (d: string) => sessions.filter((s) => s.status === 'completed' && s.start.slice(0, 10) === d).length;
  let streak = 0;
  let d = today;
  if (count(today) === target) streak++;
  d = prevDay(d);
  for (let guard = 0; guard < 3650 && d >= planStart; guard++, d = prevDay(d)) {
    if (lastSyncDay === null || d > lastSyncDay) break;
    if (count(d) !== target) break;
    streak++;
  }
  return streak;
}
