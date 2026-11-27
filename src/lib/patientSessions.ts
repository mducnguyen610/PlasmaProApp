/**
 * Logic sử dụng vai trò bệnh nhân (27/11/2026): phiên điều trị thuộc về ai, gắn vết nào, theo phiên bản phác đồ nào.
 * Hàm thuần, không phụ thuộc React, chạy được bằng node (patientSessions.test.ts).
 *
 * Quy tắc (FR8, FR11, FR14; NFR3, NFR4):
 * - Phiên thuộc bệnh nhân ghi trong bản ghi (DeviceSession.patientId). Bản ghi cũ chưa có trường này: suy theo lịch sử giao, thu hồi
 *   máy (DeviceEvent assign, return) tại thời điểm bắt đầu phiên. Không suy theo người đang giữ máy hôm nay: máy D1 đã giao lại cho Q
 *   thì Q không thấy phiên cũ của P, và P vẫn thấy phiên cũ của mình sau khi đổi sang D2.
 * - Phiên chỉ tính cho một vết khi bản ghi ghi đúng vết đó. Phiên thiếu woundId không được cộng vào vết đang mở; nó được giữ để đối soát.
 * - Không có nguồn đối soát đầy đủ (nhật ký máy chưa đọc lại được), nên không tự kết luận "Đã bỏ lỡ" từ ngày hay từ việc vắng bản ghi.
 */
import type { DeviceEvent, DeviceLinkLog, DeviceSession, TreatmentPlan } from './types.ts';

type OwnerCtx = {
  devices: { id: string; patientId?: string; assignedAt?: string }[];
  deviceEvents?: Pick<DeviceEvent, 'deviceId' | 'at' | 'kind' | 'patientId'>[];
};

/**
 * Bệnh nhân sở hữu phiên. undefined khi không xác định duy nhất được (bản ghi cũ, máy không có lịch sử giao): phiên đó cần đối soát,
 * không hiện cho bệnh nhân nào.
 */
export function sessionOwner(s: Pick<DeviceSession, 'patientId' | 'deviceId' | 'start'>, ctx: OwnerCtx): string | undefined {
  if (s.patientId) return s.patientId;
  const evs = (ctx.deviceEvents ?? [])
    .filter((e) => e.deviceId === s.deviceId && (e.kind === 'assign' || e.kind === 'return'))
    .sort((a, b) => a.at.localeCompare(b.at));
  if (evs.length) {
    let holder: string | undefined;
    let known = false;
    for (const e of evs) {
      if (e.at > s.start) break;
      known = true;
      holder = e.kind === 'assign' ? e.patientId : undefined;
    }
    if (known) return holder;
    // Phiên trước mốc đầu tiên: chỉ biết chắc khi mốc đầu là thu hồi của một bệnh nhân (người đó giữ máy tới lúc thu hồi).
    return evs[0].kind === 'return' ? evs[0].patientId : undefined;
  }
  // Máy không có nhật ký giao: chỉ nhận người đang giữ khi biết thời điểm giao và phiên diễn ra sau đó.
  const dev = ctx.devices.find((d) => d.id === s.deviceId);
  if (dev?.patientId && dev.assignedAt && dev.assignedAt <= s.start) return dev.patientId;
  return undefined;
}

/** Bỏ bản ghi gửi trùng theo mã phiên (đặc tả 7.2): giữ bản đầu tiên. */
export function dedupeSessions<T extends Pick<DeviceSession, 'sessionId'>>(list: T[]): T[] {
  const seen = new Set<string>();
  return list.filter((s) => (seen.has(s.sessionId) ? false : (seen.add(s.sessionId), true)));
}

/** Phiên của một bệnh nhân (mọi máy bệnh nhân từng giữ), đã bỏ bản trùng, mới trước. */
export function sessionsOfPatient<T extends DeviceSession>(sessions: T[], patientId: string, ctx: OwnerCtx): T[] {
  return dedupeSessions(sessions.filter((s) => sessionOwner(s, ctx) === patientId)).sort((a, b) => b.start.localeCompare(a.start));
}

/** Phiên tính cho một vết: chỉ phiên ghi đúng vết đó. */
export function sessionsOfWound<T extends Pick<DeviceSession, 'woundId'>>(sessions: T[], woundId: string): T[] {
  return sessions.filter((s) => s.woundId === woundId);
}

/** Phiên thiếu liên kết vết (bản ghi cũ hoặc phiên ghi lúc không xác định được liệu trình máy đang giữ): còn tra được để đối soát. */
export function unlinkedSessions<T extends Pick<DeviceSession, 'woundId'>>(sessions: T[]): T[] {
  return sessions.filter((s) => !s.woundId);
}

/**
 * Ngày cuối đã đối soát đủ với nguồn dữ liệu đầy đủ (FR12). Hiện chưa có nguồn nào (nhật ký máy chưa đọc lại được, chưa có máy chủ),
 * nên luôn null: lịch không dùng "Đã bỏ lỡ". Khi có nguồn đối soát thật, hàm này trả ngày đó và quy tắc ở sessionSchedule tự áp dụng.
 */
export function reconciledThrough(): string | null {
  return null;
}

export type LinkIssue = NonNullable<DeviceSession['linkIssue']>;
export const LINK_ISSUE_TEXT: Record<LinkIssue, string> = {
  no_load: 'Không có lần nạp liệu trình nào được ghi cho máy này trước phiên',
  uncertain_load: 'Sau lần máy nhận liệu trình còn lần gửi chưa có xác nhận, chưa biết máy đang giữ liệu trình nào',
  wound_mismatch: 'Liệu trình máy đang giữ thuộc vết khác với vết đang mở trên màn theo dõi',
};

export interface ResolvedLink {
  link: Pick<DeviceSession, 'planId' | 'planVersion' | 'protocolId' | 'woundId' | 'linkId'> | null;
  issue: LinkIssue | null;
}

/**
 * Liệu trình máy thực sự chạy trong phiên: lần nạp gần nhất mà CHÍNH máy này đã nhận (ACK) cho CHÍNH bệnh nhân này trước lúc bắt đầu
 * phiên. Không chọn theo phiên bản mới nhất của phác đồ (bác sĩ ban hành B2 lúc phiên B1 đang chạy thì phiên vẫn thuộc B1).
 * - linkId: lần nạp màn Nạp liệu trình vừa thực hiện; chỉ dùng khi đó vẫn là lần máy nhận gần nhất.
 * - Sau lần nhận còn lần gửi chưa có ACK (hết thời gian, khung lỗi, NAK): chưa biết máy giữ cấu hình nào, không gắn (đặc tả chưa xác minh
 *   máy giữ hay bỏ cấu hình cũ khi NAK).
 * - Vết của liệu trình khác vết màn theo dõi đang mở: không gắn vết nào, giữ để đối soát.
 */
export function resolveSessionLink(input: {
  links: DeviceLinkLog[];
  plans: Pick<TreatmentPlan, 'id' | 'patientId' | 'woundId' | 'version' | 'protocolId'>[];
  patientId: string;
  deviceId: string;
  startedAt: string;
  woundId?: string;
  linkId?: string;
}): ResolvedLink {
  const mine = input.links
    .filter((l) => l.patientId === input.patientId && l.deviceId === input.deviceId && l.at <= input.startedAt)
    .sort((a, b) => a.at.localeCompare(b.at));
  const acked = mine.filter((l) => l.result === 'acked');
  const last = acked[acked.length - 1];
  if (!last) return { link: null, issue: 'no_load' };
  if (mine.some((l) => l.at > last.at && l.result !== 'acked')) return { link: null, issue: 'uncertain_load' };
  const plan = input.plans.find((p) => p.id === last.planId && p.patientId === input.patientId);
  if (!plan || !plan.woundId) return { link: null, issue: 'no_load' };
  if (input.woundId && input.woundId !== plan.woundId) return { link: null, issue: 'wound_mismatch' };
  return { link: { planId: plan.id, planVersion: plan.version, protocolId: plan.protocolId, woundId: plan.woundId, linkId: last.id }, issue: null };
}

/** Câu trạng thái đồng bộ của một phiên theo bằng chứng có trên máy này (FR11, FR12). */
export function syncText(s: Pick<DeviceSession, 'syncedAt' | 'source'>, viewer: 'patient' | 'doctor'): string {
  if (s.syncedAt) return 'Đã đồng bộ máy chủ';
  if (s.source === 'simulated') return 'Dữ liệu mô phỏng';
  return viewer === 'patient' ? 'Đã lưu trên điện thoại, chưa đồng bộ máy chủ' : 'Chỉ có trên máy này, chưa qua máy chủ';
}

/** Kết quả phiên theo điều máy báo; không suy ra khi máy chưa báo trạng thái cuối. */
export function sessionResultLabel(s: Pick<DeviceSession, 'status' | 'endState'>): string {
  if (s.status === 'unknown') return 'Chưa đủ dữ liệu (chưa nhận trạng thái kết thúc)';
  if (s.status === 'completed') return 'Hoàn thành';
  if (s.status === 'over_limit') return 'Vượt giới hạn (không tính)';
  if (s.endState === 'error') return 'Thất bại';
  return 'Bị gián đoạn';
}
