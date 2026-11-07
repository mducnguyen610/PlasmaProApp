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

// Đã bỏ todayStatus và metStreak (chuỗi ngày liên tiếp, mẫu myAir): điều trị plasma theo đợt có ngày nghỉ
// theo lịch, nên chuỗi bị gãy dù bệnh nhân làm đúng y lệnh. Thay bằng courseProgress/courseStatus trong course.ts.

/** Trạng thái một ngày trên lịch tháng (mẫu Nerivio, nhưng tách "chưa đồng bộ" khỏi "không dùng"). */
export type DayKind = 'met' | 'partial' | 'none' | 'over' | 'unsynced' | 'today' | 'rest' | 'planned' | 'outside';
export interface DayCell { date: string; count: number; kind: DayKind }

/**
 * Các ô của một tháng (yyyy-mm), bắt đầu từ thứ Hai; ô đệm của tháng trước/sau có date rỗng.
 * - outside: ngoài thời gian liệu trình hoặc trong tương lai.
 * - today: hôm nay chưa đủ (ngày chưa kết thúc, không tính là thiếu).
 * - unsynced: ngày đã qua nhưng thiết bị chưa gửi dữ liệu (đặc tả 7.2).
 * - planned: ngày có buổi theo lịch trong tương lai.
 * - rest: ngày nghỉ theo lịch của đợt (khi có `scheduled`); có phiên vào ngày nghỉ thì là over.
 */
export function monthCells(month: string, sessions: DeviceSession[], target: number | null | undefined, lastSyncDay: string | null, planStart: string | null, planEnd: string | null, today: string, scheduled?: (date: string) => boolean): DayCell[] {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const done = sessions.filter((s) => s.status === 'completed');
  const cells: DayCell[] = Array.from({ length: lead }, () => ({ date: '', count: 0, kind: 'outside' as const }));
  for (let d = 1; d <= daysIn; d++) {
    const date = `${month}-${String(d).padStart(2, '0')}`;
    const count = done.filter((s) => s.start.slice(0, 10) === date).length;
    let kind: DayKind;
    if (date > today && scheduled && (!planStart || date >= planStart) && (!planEnd || date <= planEnd)) kind = scheduled(date) ? 'planned' : 'rest';
    else if (date > today || (planStart && date < planStart) || (planEnd && date > planEnd)) kind = count > 0 ? 'partial' : 'outside';
    else if (scheduled && !scheduled(date)) kind = count > 0 ? 'over' : 'rest';
    else if (target != null && target > 0 && count > target) kind = 'over';
    else if (target != null && target > 0 && count === target) kind = 'met';
    else if (date === today) kind = 'today';
    else if (count === 0 && (lastSyncDay === null || date > lastSyncDay)) kind = 'unsynced';
    else if (count === 0) kind = 'none';
    else kind = target == null ? 'met' : 'partial';
    cells.push({ date, count, kind });
  }
  while (cells.length % 7) cells.push({ date: '', count: 0, kind: 'outside' });
  return cells;
}
