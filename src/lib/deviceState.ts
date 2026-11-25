import type { Device, DeviceEvent, DeviceEventKind, DeviceLinkLog, DeviceSession, Patient, TreatmentPlan } from './types';

/**
 * Giai đoạn B (CN4): trạng thái máy, điều kiện giao máy, lịch sử máy. Hàm thuần, kiểm thử bằng node (deviceState.test.ts).
 * D1: Sẵn sàng, Đang giao cho bệnh nhân, Lỗi hoặc bảo trì. Lỗi đứng trên mọi trạng thái vòng đời (máy đang giao vẫn có thể báo lỗi).
 */
export type DeviceStatus = 'ready' | 'in_use' | 'maintenance' | 'fault';

export const DEVICE_STATUS: Record<DeviceStatus, { label: string; tone: 'green' | 'blue' | 'amber' | 'red' }> = {
  ready: { label: 'Sẵn sàng', tone: 'green' },
  in_use: { label: 'Đang giao cho bệnh nhân', tone: 'blue' },
  maintenance: { label: 'Đã thu hồi chờ khử khuẩn', tone: 'amber' },
  fault: { label: 'Lỗi', tone: 'red' },
};

export function deviceStatus(d: Pick<Device, 'lifecycle' | 'fault' | 'patientId'>): DeviceStatus {
  if (d.fault) return 'fault';
  const lc = d.lifecycle ?? (d.patientId ? 'in_use' : 'ready');
  if (lc === 'in_use') return 'in_use';
  if (lc === 'returned' || lc === 'disinfected') return 'maintenance';
  return 'ready';
}

/** D2: phác đồ đang hoạt động của bệnh nhân (bất kỳ vết nào). Tạm dừng, nháp, kết thúc đều không tính. */
export function hasActivePlan(plans: Pick<TreatmentPlan, 'patientId' | 'status'>[], patientId: string): boolean {
  return plans.some((p) => p.patientId === patientId && p.status === 'active');
}

/**
 * Lý do chưa giao được máy cho bệnh nhân (D2, D8), null khi giao được.
 * Không tự gỡ máy cũ của bệnh nhân: bệnh nhân đang giữ máy khác thì phải thu hồi trước (AU-26).
 */
export function assignBlocker(
  dev: Pick<Device, 'id' | 'code' | 'patientId' | 'lifecycle' | 'fault'> | undefined,
  patient: Pick<Patient, 'id' | 'deviceId' | 'archivedAt'> | undefined,
  devices: Pick<Device, 'id' | 'code' | 'patientId'>[],
  plans: Pick<TreatmentPlan, 'patientId' | 'status'>[],
): string | null {
  if (!dev) return 'Không tìm thấy thiết bị.';
  if (!patient) return 'Không tìm thấy hồ sơ bệnh nhân.';
  if (patient.archivedAt) return 'Hồ sơ đã lưu trữ, không giao máy mới.';
  if (dev.patientId === patient.id) return null;
  if (dev.patientId) return `Máy ${dev.code} đang giao cho bệnh nhân khác.`;
  const held = devices.find((x) => x.id !== dev.id && (x.patientId === patient.id || x.id === patient.deviceId));
  if (held) return `Bệnh nhân đang giữ máy ${held.code}. Thu hồi máy đó trước khi giao máy khác.`;
  const st = deviceStatus(dev);
  if (st === 'fault') return `Máy ${dev.code} đang báo lỗi, chưa giao được.`;
  if (st !== 'ready') return `Máy ${dev.code} chưa khử khuẩn xong, chưa giao được.`;
  if (!hasActivePlan(plans, patient.id)) return 'Bệnh nhân chưa có phác đồ đang hoạt động. Lập và xác nhận phác đồ trước khi giao máy.';
  return null;
}

/** Đề tài chỉ dùng dòng máy HFP: máy đăng ký mới luôn mang dòng này, Admin không sửa (người dùng chốt 24/11/2026). */
export const DEVICE_MODEL = 'Plasma Pro HFP';

/** D1 (AU-25): kiểm danh mục máy. Mã TB-xxx và sê-ri bắt buộc, không trùng máy khác. Dòng máy cố định (DEVICE_MODEL). */
export function catalogErrors(
  input: { code: string; serial: string },
  devices: Pick<Device, 'id' | 'code' | 'serial'>[],
  selfId?: string,
): { code?: string; serial?: string } {
  const code = input.code.trim().toUpperCase(), serial = input.serial.trim();
  const others = devices.filter((d) => d.id !== selfId);
  const out: { code?: string; serial?: string } = {};
  if (!/^TB-\d{3,}$/.test(code)) out.code = 'Định dạng TB-xxx.';
  else if (others.some((d) => d.code.toUpperCase() === code)) out.code = 'Mã thiết bị đã tồn tại.';
  if (!serial) out.serial = 'Nhập số sê-ri.';
  else if (others.some((d) => (d.serial ?? '').trim().toUpperCase() === serial.toUpperCase())) out.serial = 'Số sê-ri đã có ở máy khác.';
  return out;
}

export const DEVICE_EVENT_LABEL: Record<DeviceEventKind | 'session' | 'load', string> = {
  register: 'Thêm vào danh mục',
  edit: 'Sửa thông tin máy',
  assign: 'Giao cho bệnh nhân',
  return: 'Thu hồi',
  disinfect: 'Đã khử khuẩn, sẵn sàng',
  care: 'Chăm sóc máy',
  connect: 'Kết nối',
  disconnect: 'Ngắt kết nối',
  error: 'Máy báo lỗi',
  fault_clear: 'Đã xử lý lỗi',
  session: 'Phiên điều trị',
  load: 'Nạp phác đồ',
};

export interface DeviceHistoryRow { key: string; at: string; kind: DeviceEventKind | 'session' | 'load'; by?: string; patientId?: string; detail?: string }

const SESSION_STATUS = { completed: 'hoàn tất', interrupted: 'gián đoạn', over_limit: 'vượt giới hạn' } as const;

/** D4: lịch sử máy gộp nhật ký máy, phiên điều trị (đã bỏ bản trùng mã phiên) và lần nạp phác đồ; mới trước. Chỉ xem. */
export function deviceHistory(
  deviceId: string,
  events: DeviceEvent[],
  sessions: DeviceSession[],
  links: DeviceLinkLog[],
): DeviceHistoryRow[] {
  const seen = new Set<string>();
  const rows: DeviceHistoryRow[] = [
    ...events.filter((e) => e.deviceId === deviceId).map((e) => ({ key: e.id, at: e.at, kind: e.kind, by: e.by, patientId: e.patientId, detail: e.detail })),
    ...sessions.filter((s) => s.deviceId === deviceId && !seen.has(s.sessionId) && (seen.add(s.sessionId), true)).map((s) => ({
      key: `s-${s.sessionId}`, at: s.start, kind: 'session' as const,
      detail: `${s.durationMin} phút, ${SESSION_STATUS[s.status]}${s.planVersion ? `, phiên bản ${s.planVersion}` : ''}`,
    })),
    ...links.filter((l) => l.deviceId === deviceId).map((l) => ({
      key: l.id, at: l.at, kind: 'load' as const, by: l.by, patientId: l.patientId, detail: `Phiên bản ${l.planVersion}, kết quả ${l.result}`,
    })),
  ];
  return rows.sort((a, b) => b.at.localeCompare(a.at));
}

/** D5: lỗi máy báo trong phiên. ICD hiện chỉ có trạng thái STA "error" (mã 4), chưa có mã lỗi riêng của firmware. */
/** Giao thức USB/UART chưa có mã lỗi chi tiết nên chỉ ghi trạng thái Lỗi và mô tả, không tự đặt mã (người dùng chốt 24/11/2026). */
export const STA_ERROR_FAULT = { message: 'Máy báo trạng thái lỗi trong phiên điều trị.' } as const;
