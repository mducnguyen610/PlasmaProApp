import type { CoursePhase, DeviceSession, TreatmentPlan, WoundImage } from './types';

/**
 * Đợt điều trị plasma theo vết thương (tài liệu ui-review/chuc-nang-theo-dac-thu-dieu-tri-plasma.md):
 * có giai đoạn với tần suất thưa dần, có điểm kết thúc khi liền thương, sau đó theo dõi.
 * Khác mẫu myAir/Nerivio (dùng đều mỗi ngày, lâu dài) nên không tính chuỗi ngày liên tiếp.
 *
 * Tệp này chỉ dùng kiểu từ types.ts để chạy được bằng `node` trong bài kiểm thử.
 */

/** Các thứ cố định cho "n buổi mỗi tuần" (1 = thứ Hai ... 7 = Chủ nhật). Giá trị giả định cho demo. */
export const WEEK_DAYS: Record<number, number[]> = {
  1: [1],
  2: [1, 4],
  3: [1, 3, 5],
  4: [1, 2, 4, 5],
  5: [1, 2, 3, 4, 5],
  6: [1, 2, 3, 4, 5, 6],
  7: [1, 2, 3, 4, 5, 6, 7],
};
const WD_LABEL = ['', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Ngày tính lại sau khi liền để chụp ảnh kiểm tra. Giá trị giả định, chờ bác sĩ chọn (FDA 2006: ít nhất 3 tháng). */
export const FOLLOW_UP_DAYS = [14, 30, 90];
/** Khoảng cách giữa hai lần xác nhận liền (FDA 2006: hai lần khám cách nhau 2 tuần). */
export const CLOSURE_CONFIRM_DAYS = 14;
/** Mốc xem lại hiệu quả mặc định và ngưỡng tham khảo (Sheehan 2003, loét bàn chân đái tháo đường). */
export const DEFAULT_REVIEW_DAY = 28;
export const REVIEW_MIN_REDUCTION = 0.5;

const MS = 86400000;
/** Giờ Việt Nam so với UTC, tính bằng phút. Cùng giá trị với timeZoneOffsetMin của đặc tả giao thức (ICD mục 7). */
export const VN_OFFSET_MIN = 420;

/**
 * Ngày theo giờ Việt Nam (UTC+7), dạng YYYY-MM-DD, từ một thời điểm (KT6, DR9).
 * Không dùng múi giờ của điện thoại: máy Plasma Pro chạy theo UTC+7, nên điện thoại đặt múi giờ khác
 * vẫn phải thấy cùng "hôm nay" với máy. Không dùng `toISOString().slice(0, 10)`: đó là ngày theo UTC,
 * sai một ngày từ 00:00 đến 06:59 giờ Việt Nam. Chỉ truyền thời điểm (Date, số ms, chuỗi có giờ),
 * không truyền chuỗi chỉ có ngày vì JS hiểu chuỗi đó là nửa đêm UTC.
 */
export function localDay(at: Date | string | number = new Date()): string {
  const t = at instanceof Date ? at.getTime() : new Date(at).getTime();
  return new Date(t + VN_OFFSET_MIN * 60000).toISOString().slice(0, 10);
}
export const addDays = (iso: string, n: number) => new Date(new Date(`${iso.slice(0, 10)}T00:00:00Z`).getTime() + n * MS).toISOString().slice(0, 10);
export const dayDiff = (a: string, b: string) => Math.round((new Date(`${b.slice(0, 10)}T00:00:00Z`).getTime() - new Date(`${a.slice(0, 10)}T00:00:00Z`).getTime()) / MS);
const isoWeekday = (iso: string) => {
  const d = new Date(`${iso}T00:00:00Z`).getUTCDay();
  return d === 0 ? 7 : d;
};

export function phasesOf(plan: Pick<TreatmentPlan, 'phases' | 'startDate' | 'endDate'>): CoursePhase[] {
  return plan.phases && plan.phases.length > 0 ? plan.phases : [{ from: plan.startDate, to: plan.endDate, pattern: 'daily', n: 1 }];
}

export function phaseIndexOn(plan: Pick<TreatmentPlan, 'phases' | 'startDate' | 'endDate'>, date: string): number {
  return phasesOf(plan).findIndex((p) => date >= p.from && date <= p.to);
}

export function isScheduledInPhase(p: CoursePhase, date: string): boolean {
  if (date < p.from || date > p.to) return false;
  if (p.pattern === 'daily') return true;
  if (p.pattern === 'every_n_days') return dayDiff(p.from, date) % Math.max(1, p.n) === 0;
  return (WEEK_DAYS[Math.min(7, Math.max(1, p.n))] ?? []).includes(isoWeekday(date));
}

export function isScheduled(plan: Pick<TreatmentPlan, 'phases' | 'startDate' | 'endDate'>, date: string): boolean {
  return phasesOf(plan).some((p) => isScheduledInPhase(p, date));
}

export function phaseLabel(p: CoursePhase): string {
  if (p.pattern === 'daily') return 'Mỗi ngày';
  if (p.pattern === 'every_n_days') return p.n === 2 ? 'Cách ngày' : `Cách ${p.n} ngày một lần`;
  const days = (WEEK_DAYS[p.n] ?? []).map((d) => WD_LABEL[d]).join(', ');
  return `${p.n} buổi mỗi tuần (${days})`;
}

export function scheduledDays(plan: Pick<TreatmentPlan, 'phases' | 'startDate' | 'endDate'>, from?: string, to?: string): string[] {
  const out: string[] = [];
  const ps = phasesOf(plan);
  const start = from ?? ps[0].from;
  const end = to ?? ps[ps.length - 1].to;
  for (let d = start, guard = 0; d <= end && guard < 3660; d = addDays(d, 1), guard++) if (isScheduled(plan, d)) out.push(d);
  return out;
}

export interface CourseProgress {
  /** Tổng số buổi theo lịch của cả đợt (dự kiến). */
  total: number;
  /** Số buổi theo lịch đã có ít nhất một phiên hoàn tất. */
  done: number;
  /** Buổi theo lịch đã qua, đã đồng bộ, mà không có phiên nào. */
  missed: number;
  /** Phiên hoàn tất vào ngày nghỉ theo lịch hoặc vượt số lần mỗi buổi. */
  extra: number;
  /** Phiên thiết bị chặn (ngoài lịch, vượt số lần). */
  blocked: number;
  /** Hôm nay: trước đợt, ngày có buổi, ngày nghỉ, sau ngày dự kiến kết thúc. */
  today: 'before' | 'treat' | 'rest' | 'after';
  todayCount: number;
  perVisit: number;
  next: string | null;
  phaseIndex: number;
  phaseCount: number;
}

const dayOf = (s: DeviceSession) => localDay(s.start);

export function courseProgress(plan: TreatmentPlan, sessions: DeviceSession[], today: string, lastSyncDay: string | null): CourseProgress {
  const ps = phasesOf(plan);
  const days = scheduledDays(plan);
  const perVisit = plan.sessionsPerDay != null && plan.sessionsPerDay > 0 ? plan.sessionsPerDay : 1;
  const done = sessions.filter((s) => s.status === 'completed');
  const count = (d: string) => done.filter((s) => dayOf(s) === d).length;
  const scheduledSet = new Set(days);
  let doneN = 0;
  let missed = 0;
  for (const d of days) {
    if (d > today) break;
    if (count(d) > 0) doneN++;
    else if (d < today && lastSyncDay !== null && d <= lastSyncDay) missed++;
  }
  const start = ps[0].from;
  const end = ps[ps.length - 1].to;
  let extra = 0;
  for (const s of done) {
    const d = dayOf(s);
    if (d < start || d > end) continue;
    if (!scheduledSet.has(d)) extra++;
  }
  for (const d of days) extra += Math.max(0, count(d) - perVisit);
  const blocked = sessions.filter((s) => s.status === 'over_limit').length;
  const todayKind: CourseProgress['today'] = today < start ? 'before' : today > end ? 'after' : scheduledSet.has(today) ? 'treat' : 'rest';
  const todayCount = count(today);
  const next = days.find((d) => d > today || (d === today && todayCount < perVisit)) ?? null;
  return { total: days.length, done: doneN, missed, extra, blocked, today: todayKind, todayCount, perVisit, next, phaseIndex: phaseIndexOn(plan, today), phaseCount: ps.length };
}

export interface CourseStatus {
  kind: 'treat' | 'done' | 'rest' | 'over' | 'before' | 'after';
  title: string;
  detail: string;
}

/** Câu chính cho trang chủ bệnh nhân. `fmt` định dạng ngày (truyền từ giao diện). */
export function courseStatus(pr: CourseProgress, fmt: (iso: string) => string): CourseStatus {
  const nextText = pr.next ? `Buổi tiếp theo: ${fmt(pr.next)}.` : 'Không còn buổi nào theo lịch.';
  if (pr.today === 'before') return { kind: 'before', title: 'Đợt điều trị chưa bắt đầu', detail: nextText };
  if (pr.today === 'after') return { kind: 'after', title: 'Đã qua ngày dự kiến của đợt', detail: 'Bác sĩ sẽ xem lại vết thương và quyết định kết thúc hay kéo dài đợt.' };
  if (pr.today === 'rest' && pr.todayCount > 0) return { kind: 'over', title: 'Hôm nay là ngày nghỉ theo lịch', detail: `Đã ghi nhận ${pr.todayCount} lần chiếu. Hãy báo bác sĩ phụ trách.` };
  if (pr.today === 'rest') return { kind: 'rest', title: 'Hôm nay nghỉ theo lịch', detail: nextText };
  if (pr.todayCount > pr.perVisit) return { kind: 'over', title: `Đã chiếu ${pr.todayCount} lần, nhiều hơn ${pr.perVisit}`, detail: 'Hãy báo bác sĩ phụ trách.' };
  if (pr.todayCount >= pr.perVisit) return { kind: 'done', title: 'Đã xong buổi hôm nay', detail: `Buổi ${pr.done}/${pr.total} của đợt. ${nextText}` };
  return {
    kind: 'treat',
    title: 'Hôm nay có buổi điều trị',
    detail: pr.perVisit > 1 ? `Hôm nay là buổi ${pr.done + (pr.todayCount > 0 ? 0 : 1)}/${pr.total} · đã chiếu ${pr.todayCount}/${pr.perVisit} lần` : `Hôm nay là buổi ${pr.done + 1}/${pr.total} của đợt`,
  };
}

/** Gợi ý thời gian chiếu theo diện tích (giây). Bác sĩ phải xác nhận; hệ số chờ nhóm phần cứng. */
export function suggestDurationSec(areaCm2: number | null | undefined, secondsPerCm2: number | null | undefined): number | null {
  if (areaCm2 == null || secondsPerCm2 == null || areaCm2 <= 0 || secondsPerCm2 <= 0) return null;
  return Math.round(areaCm2 * secondsPerCm2);
}

export function fmtDuration(sec: number | null | undefined): string {
  if (sec == null) return 'Chưa đặt';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m === 0 ? `${s} giây` : s === 0 ? `${m} phút` : `${m} phút ${s} giây`;
}

export interface AreaReview {
  state: 'no_data' | 'pending' | 'ok' | 'low';
  baseline: number | null;
  latest: number | null;
  /** Tỷ lệ giảm 0..1 (âm nếu tăng). */
  reduction: number | null;
  reviewDate: string;
}

/**
 * Mốc xem lại hiệu quả: so diện tích đầu đợt với số đo gần nhất. Chỉ là gợi ý cho bác sĩ, không tự đổi liệu trình.
 * Ngưỡng 50% ở tuần 4 lấy từ Sheehan và cộng sự (2003) cho loét bàn chân đái tháo đường.
 */
export function areaReview(images: WoundImage[], plan: Pick<TreatmentPlan, 'startDate' | 'reviewAtDay' | 'areaAtStart'>, today: string): AreaReview {
  const reviewDate = addDays(plan.startDate, plan.reviewAtDay ?? DEFAULT_REVIEW_DAY);
  const labeled = images.filter((i) => i.areaCm2 !== null && i.status === 'labeled').sort((a, b) => a.captureDate.localeCompare(b.captureDate));
  const before = labeled.filter((i) => i.captureDate <= plan.startDate);
  const baseImg = before[before.length - 1] ?? labeled[0];
  const baseline = plan.areaAtStart ?? baseImg?.areaCm2 ?? null;
  const last = labeled[labeled.length - 1];
  const latest = last && last.captureDate > plan.startDate ? last.areaCm2 : null;
  if (baseline == null || latest == null || baseline <= 0) return { state: 'no_data', baseline, latest, reduction: null, reviewDate };
  const reduction = (baseline - latest) / baseline;
  if (today < reviewDate) return { state: 'pending', baseline, latest, reduction, reviewDate };
  return { state: reduction >= REVIEW_MIN_REDUCTION ? 'ok' : 'low', baseline, latest, reduction, reviewDate };
}

export const followUpDates = (from: string) => FOLLOW_UP_DAYS.map((n) => ({ days: n, date: addDays(from, n) }));
