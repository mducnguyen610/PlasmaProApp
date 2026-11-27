/**
 * Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 5, M25, M27..M30): phiên dự kiến tự sinh theo lịch của phác đồ và
 * 9 trạng thái phiên. Hàm thuần, chạy được bằng node (sessionSchedule.test.ts).
 *
 * Phiên dự kiến không lưu thành bản ghi: mỗi ngày có lịch của phác đồ là một phiên, suy từ lịch (course.ts), các lần hoãn, hủy
 * (SessionChange), phiên máy báo về (DeviceSession) và mốc "đang chạy" (LiveSession). Nhờ vậy không phải sửa lịch sử khi lịch đổi.
 *
 * Quy tắc M25: không coi là Đang thực hiện chỉ vì đã gửi lệnh (chỉ khi máy báo STA running); không coi là Hoàn thành khi máy chưa
 * báo done; phiên Thất bại, Bị gián đoạn, Đã hủy vẫn giữ; không tự gửi lại lệnh, không tự khởi động lại phiên (tệp này chỉ đọc).
 */
// @ts-ignore TS5097: đuôi .ts để chạy kiểm thử bằng node; Metro và tsc vẫn phân giải đúng tệp.
import { addDays, isScheduled, localDay } from './course.ts';
// @ts-ignore TS5097
import { protocolsOfWound, versionStart } from './planLifecycle.ts';
import type { DeviceSession, LiveSession, SessionChange, TreatmentPlan } from './types.ts';

/**
 * no_data (27/11/2026, FR12, UR7): "Chưa đủ dữ liệu". Ngày đã qua mà chưa có bản ghi, hoặc phiên không nhận được trạng thái kết thúc.
 * missed chỉ dùng khi ngày đó đã được đối soát với nguồn dữ liệu đầy đủ (reconciledThrough); hiện chưa có nguồn nên không xuất hiện.
 */
export type SlotStatus = 'upcoming' | 'due_today' | 'running' | 'completed' | 'missed' | 'no_data' | 'postponed' | 'cancelled' | 'failed' | 'interrupted';

export const SLOT_STATUS: Record<SlotStatus, { label: string; tone: 'gray' | 'blue' | 'teal' | 'green' | 'amber' | 'red' | 'violet' }> = {
  upcoming: { label: 'Sắp đến lịch', tone: 'gray' },
  due_today: { label: 'Đến lịch hôm nay', tone: 'blue' },
  running: { label: 'Đang thực hiện', tone: 'teal' },
  completed: { label: 'Hoàn thành', tone: 'green' },
  missed: { label: 'Đã bỏ lỡ', tone: 'amber' },
  no_data: { label: 'Chưa đủ dữ liệu', tone: 'gray' },
  postponed: { label: 'Đã hoãn', tone: 'violet' },
  cancelled: { label: 'Đã hủy', tone: 'gray' },
  failed: { label: 'Thất bại', tone: 'red' },
  interrupted: { label: 'Bị gián đoạn', tone: 'amber' },
};

export interface Slot {
  /** Ngày phiên (yyyy-mm-dd, giờ Việt Nam). */
  date: string;
  status: SlotStatus;
  /** Phiên này là phiên được hoãn từ ngày originDate. */
  originDate?: string;
  /** Lần hoãn, hủy áp lên ngày này (nếu có). */
  change?: SessionChange;
  /** Phiên máy báo về trong ngày (mới trước). */
  sessions: DeviceSession[];
  /** Phiên máy ghi vào ngày không có lịch. */
  extra?: boolean;
  /** Phiên bản phác đồ áp dụng cho ngày này. */
  versionId?: string;
}

/** Mốc "đang chạy" quá lâu so với thời lượng dự kiến thì coi là mất kết nối, không hiện Đang thực hiện mãi (không suy ra kết quả). */
export const LIVE_GRACE_MIN = 10;

/** Ngày cuối có phiên của phác đồ: kết thúc sớm thì ngày kết thúc thực tế, còn lại ngày kết thúc dự kiến. */
export function protocolLastDay(versions: TreatmentPlan[], nextProtocolStart?: string): string {
  const latest = versions[versions.length - 1];
  const end = latest.endDate;
  if (latest.status !== 'ended' || latest.supersededBy) return end;
  const ev = [...(latest.statusLog ?? [])].reverse().find((e) => e.action === 'end');
  if (ev) return localDay(ev.at) < end ? localDay(ev.at) : end;
  // Dữ liệu cũ: phác đồ kết thúc khi lập phác đồ mới cho vết, không có mốc kết thúc. Dừng trước ngày bắt đầu phác đồ sau.
  if (nextProtocolStart && addDays(nextProtocolStart, -1) < end) return addDays(nextProtocolStart, -1);
  return end;
}

/** Phiên bản áp dụng cho một ngày: phiên bản cao nhất (không tính nháp) đã bắt đầu áp dụng từ ngày đó trở về trước. */
export function versionOn(versions: TreatmentPlan[], date: string): TreatmentPlan | undefined {
  const real = versions.filter((v) => v.status !== 'draft');
  let hit: TreatmentPlan | undefined;
  real.forEach((v, i) => { if (versionStart(v, i === 0) <= date) hit = v; });
  return hit ?? real[0];
}

function sessionSlotStatus(list: DeviceSession[]): SlotStatus | null {
  const real = list.filter((s) => s.status !== 'over_limit');
  if (!real.length) return null;
  if (real.some((s) => s.status === 'completed')) return 'completed';
  if (real.some((s) => s.endState === 'error')) return 'failed';
  if (real.some((s) => s.status === 'interrupted')) return 'interrupted';
  // Chỉ có phiên thiếu trạng thái kết thúc (mất cáp, rời màn): giữ chưa xác định.
  return 'no_data';
}

export function protocolSlots(input: {
  versions: TreatmentPlan[];
  sessions: DeviceSession[];
  changes: SessionChange[];
  live?: LiveSession[];
  today: string;
  nowMs?: number;
  /** Ngày bắt đầu phác đồ kế tiếp của cùng vết (để cắt dữ liệu cũ). */
  nextProtocolStart?: string;
  /** Ngày cuối đã đối soát đủ với nguồn đầy đủ (patientSessions.reconciledThrough). Trống: không dùng "Đã bỏ lỡ". */
  reconciledThrough?: string | null;
}): Slot[] {
  const versions = input.versions.filter((v) => v.status !== 'draft');
  if (!versions.length) return [];
  const protocolId = versions[0].protocolId;
  const woundId = versions[0].woundId;
  const first = versions[0].startDate;
  const last = protocolLastDay(versions, input.nextProtocolStart);
  const changes = input.changes.filter((c) => c.protocolId === protocolId).sort((a, b) => a.at.localeCompare(b.at));
  const lastChange = (d: string) => changes.filter((c) => c.date === d).pop();
  const ids = new Set(versions.map((v) => v.id));
  // 27/11/2026: phiên chỉ thuộc phác đồ khi bản ghi gắn phác đồ, phiên bản hoặc đúng vết. Phiên thiếu woundId không được cộng vào vết
  // nào (trước đây tính cho mọi vết); chúng nằm trong danh sách đối soát (patientSessions.unlinkedSessions).
  const mine = input.sessions.filter((s) =>
    s.protocolId ? s.protocolId === protocolId : s.planId ? ids.has(s.planId) : !!woundId && s.woundId === woundId && localDay(s.start) >= first && localDay(s.start) <= last);
  const sessionsOn = (d: string) => mine.filter((s) => localDay(s.start) === d).sort((a, b) => b.start.localeCompare(a.start));
  const now = input.nowMs ?? Date.now();
  const live = (input.live ?? []).find((l) => !!l.woundId && l.woundId === woundId && versions.some((v) => v.patientId === l.patientId)
    && now - new Date(l.startedAt).getTime() <= ((versionOn(versions, localDay(l.startedAt))?.durationSec ?? 600) / 60 + LIVE_GRACE_MIN) * 60000
    && !mine.some((s) => s.start >= l.startedAt));
  const statusFor = (d: string, base: SlotStatus | null): SlotStatus => {
    const fromDevice = sessionSlotStatus(sessionsOn(d));
    if (live && localDay(live.startedAt) === d) return 'running';
    if (fromDevice) return fromDevice;
    if (base) return base;
    if (d > input.today) return 'upcoming';
    if (d === input.today) return 'due_today';
    // Qua ngày mà chưa có bản ghi: chưa biết phiên có diễn ra không (dữ liệu có thể chưa về). Chỉ "Đã bỏ lỡ" khi đã đối soát đủ.
    return input.reconciledThrough && d <= input.reconciledThrough ? 'missed' : 'no_data';
  };

  const slots: Slot[] = [];
  const planned = new Set<string>();
  for (let d = first, guard = 0; d <= last && guard < 3660; d = addDays(d, 1), guard++) {
    const v = versionOn(versions, d);
    if (!v || !isScheduled(v, d)) continue;
    planned.add(d);
    const c = lastChange(d);
    const base: SlotStatus | null = c?.kind === 'cancel' ? 'cancelled' : c?.kind === 'postpone' ? 'postponed' : null;
    slots.push({ date: d, status: statusFor(d, base), change: c, sessions: sessionsOn(d), versionId: v.id });
  }
  // Phiên được hoãn sang ngày mới: thêm một phiên dự kiến ở ngày mới (nếu ngày đó chưa có lịch).
  for (const c of changes) {
    if (c.kind !== 'postpone' || !c.newDate || lastChange(c.date)?.id !== c.id) continue;
    if (planned.has(c.newDate) || slots.some((s) => s.date === c.newDate)) continue;
    const moved = lastChange(c.newDate);
    const base: SlotStatus | null = moved?.kind === 'cancel' ? 'cancelled' : moved?.kind === 'postpone' ? 'postponed' : null;
    slots.push({ date: c.newDate, status: statusFor(c.newDate, base), originDate: c.date, change: moved, sessions: sessionsOn(c.newDate), versionId: versionOn(versions, c.newDate)?.id });
  }
  // Phiên máy ghi vào ngày không có lịch: vẫn hiện (không bỏ dữ liệu máy báo về).
  const extraDays = [...new Set(mine.filter((s) => s.status !== 'over_limit').map((s) => localDay(s.start)))].filter((d) => !slots.some((s) => s.date === d));
  for (const d of extraDays) slots.push({ date: d, status: statusFor(d, null), sessions: sessionsOn(d), extra: true, versionId: versionOn(versions, d)?.id });
  if (live && !slots.some((s) => s.date === localDay(live.startedAt))) {
    slots.push({ date: localDay(live.startedAt), status: 'running', sessions: [], extra: true });
  }
  return slots.sort((a, b) => a.date.localeCompare(b.date));
}

export interface SlotSummary { planned: number; completed: number; notDone: number; failedOrInterrupted: number; missed: number; noData: number }

/** Nhóm 4 "Theo dõi thực hiện": tổng phiên dự kiến, đã hoàn thành, chưa thực hiện, thất bại hoặc gián đoạn. */
export function slotSummary(slots: Slot[]): SlotSummary {
  const planned = slots.filter((s) => !s.extra && s.status !== 'cancelled' && !(s.status === 'postponed' && !s.sessions.length));
  const completed = planned.filter((s) => s.status === 'completed').length;
  const failedOrInterrupted = planned.filter((s) => s.status === 'failed' || s.status === 'interrupted').length;
  const missed = planned.filter((s) => s.status === 'missed').length;
  const noData = planned.filter((s) => s.status === 'no_data').length;
  return { planned: planned.length, completed, failedOrInterrupted, missed, noData, notDone: planned.length - completed - failedOrInterrupted };
}

/** M29: chỉ hoãn, hủy phiên chưa diễn ra (Sắp đến lịch hoặc Đến lịch hôm nay). Trả lý do chặn hoặc null. */
export function slotChangeBlocker(slot: Slot | undefined, kind: 'postpone' | 'cancel', reason: string, newDate: string | null, today: string): string | null {
  if (!slot) return 'Không tìm thấy phiên.';
  if (slot.status !== 'upcoming' && slot.status !== 'due_today') return 'Chỉ hoãn hoặc hủy phiên chưa diễn ra.';
  if (!reason.trim()) return kind === 'postpone' ? 'Nhập lý do hoãn.' : 'Nhập lý do hủy.';
  if (kind === 'postpone') {
    if (!newDate) return 'Nhập ngày mới dạng dd/mm/yyyy.';
    if (newDate <= slot.date || newDate < today) return 'Ngày mới phải sau ngày của phiên.';
  }
  return null;
}

/** Ngày giờ máy hoàn thành (M28, mục 9 #13): endedAt máy báo; phiên cũ tính từ start + thời lượng. */
export function sessionEndedAt(s: Pick<DeviceSession, 'start' | 'durationMin' | 'endedAt'>): { at: string; estimated: boolean } {
  if (s.endedAt) return { at: s.endedAt, estimated: false };
  return { at: new Date(new Date(s.start).getTime() + Math.round(s.durationMin * 60000)).toISOString(), estimated: true };
}

/**
 * 27/11/2026 (FR6, UR1, NFR1): một mục lịch của bệnh nhân là một phiên dự kiến của một phác đồ trong một ngày, định danh bằng cặp
 * (mã phác đồ, ngày) như phía bác sĩ dùng khi hoãn, hủy phiên (changeSessionSlot). Không sinh mã phiên thiết bị cho lượt chưa diễn ra.
 */
export interface ScheduleItem {
  key: string;
  protocolId: string;
  woundId: string;
  woundCode: string;
  date: string;
  status: SlotStatus;
  /** Phiên bản phác đồ áp dụng cho ngày này. */
  versionId?: string;
  version?: number;
  originDate?: string;
  extra?: boolean;
}

export const scheduleItemKey = (protocolId: string, date: string) => `${protocolId}:${date}`;

/**
 * Lịch của mọi vết đang có phác đồ mở. Phiên bản bác sĩ chưa xác nhận không hiện cho bệnh nhân (confirmedOnly). Sắp xếp ổn định theo
 * ngày, rồi mã vết, rồi mã phác đồ: thứ tự chỉ để dễ đọc, không phải thứ tự ưu tiên điều trị, và không phụ thuộc thứ tự trong dữ liệu.
 */
export function scheduleItems(input: {
  plans: TreatmentPlan[];
  wounds: { id: string; code: string; patientId: string }[];
  patientId: string;
  sessions: DeviceSession[];
  changes: SessionChange[];
  live?: LiveSession[];
  today: string;
  from?: string;
  to?: string;
  confirmedOnly?: boolean;
  reconciledThrough?: string | null;
  nowMs?: number;
}): ScheduleItem[] {
  const out: ScheduleItem[] = [];
  for (const w of input.wounds.filter((x) => x.patientId === input.patientId)) {
    const views = protocolsOfWound(input.plans, input.patientId, w.id);
    for (const v of views.filter((x) => x.open)) {
      const versions = input.confirmedOnly ? v.versions.filter((x) => x.confirmed) : v.versions;
      if (!versions.length) continue;
      const slots = protocolSlots({
        versions, sessions: input.sessions, changes: input.changes, live: input.live, today: input.today, nowMs: input.nowMs,
        nextProtocolStart: views.map((x) => x.startDate).filter((d) => d > v.startDate).sort()[0],
        reconciledThrough: input.reconciledThrough,
      });
      for (const s of slots) {
        if ((input.from && s.date < input.from) || (input.to && s.date > input.to)) continue;
        const ver = versions.find((x) => x.id === s.versionId);
        out.push({
          key: scheduleItemKey(v.protocolId, s.date), protocolId: v.protocolId, woundId: w.id, woundCode: w.code, date: s.date, status: s.status,
          versionId: s.versionId, version: ver?.version, originDate: s.originDate, extra: s.extra,
        });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.woundCode.localeCompare(b.woundCode) || a.protocolId.localeCompare(b.protocolId));
}
