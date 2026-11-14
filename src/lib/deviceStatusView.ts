import type { SessionState } from './device/spec.ts';
import type { LinkState } from './device/transport.ts';
import type { SessionView } from './sessionDisplay.ts';

/**
 * Stage 7 (T01, T02): gộp dữ liệu thiết bị ĐÃ CÓ thành một trạng thái để hiển thị ở thanh trạng thái.
 * Hàm thuần, chỉ đọc dữ liệu truyền vào; không đọc hay ghi thiết bị, không thêm trạng thái phần cứng mới.
 *
 * Nguồn dữ liệu của từng trạng thái (chỉ những gì hệ thống hiện có):
 * - disconnected, connecting, connected, error: LinkState do đường truyền phát (transport.onState).
 * - ready: chỉ có ở T01, khi màn tính được mọi điều kiện gửi (canSend bỏ cờ `sending`). Màn khác truyền null.
 * - busy: bản tin STA `running` còn mới, hoặc máy vừa trả NAK `BUSY`.
 * - error: LinkState `error`, hoặc STA `error`.
 * - unknown: đã có bản tin STA chưa kết thúc nhưng mất kết nối (lost) hoặc quá ngưỡng không có bản tin (stale);
 *   hoặc đã kết nối nhưng máy không trả lời lệnh hỏi thông tin. Không suy ra máy đang chạy hay đã dừng.
 */
export type DeviceStatusKey = 'disconnected' | 'connecting' | 'connected' | 'ready' | 'busy' | 'error' | 'unknown';

export interface DeviceStatusInput {
  linkState: LinkState;
  /** Trạng thái trong bản tin STA cuối cùng, null nếu chưa nhận. */
  sessionState: SessionState | null;
  /** Kết quả sessionDisplay cho bản tin cuối. */
  sessionView: SessionView;
  /** T01: đủ điều kiện nạp (true), chưa đủ (false). Màn không xét điều kiện nạp: null. */
  readyToSend: boolean | null;
  /** Máy vừa trả NAK BUSY cho lần gửi cuối. */
  nakBusy?: boolean;
  /** Đã kết nối nhưng máy không trả lời lệnh hỏi thông tin (RK3). */
  unidentified?: boolean;
}

export function deviceStatusView(i: DeviceStatusInput): DeviceStatusKey {
  // Mất kết nối khi bản tin cuối chưa phải trạng thái kết thúc: không biết máy đang làm gì.
  if (i.sessionView === 'lost') return 'unknown';
  if (i.linkState === 'connecting') return 'connecting';
  if (i.linkState === 'error') return 'error';
  if (i.linkState === 'disconnected') return 'disconnected';
  // Còn kết nối.
  if (i.sessionView === 'stale') return 'unknown';
  if (i.sessionState === 'error') return 'error';
  if (i.sessionState === 'running') return 'busy';
  if (i.nakBusy) return 'busy';
  if (i.unidentified) return 'unknown';
  if (i.readyToSend === true) return 'ready';
  return 'connected';
}

/** Nhãn chữ tiếng Việt cho thanh trạng thái. Không dùng "Sẵn sàng" ngoài trạng thái ready. */
export const DEVICE_STATUS_LABEL: Record<DeviceStatusKey, string> = {
  disconnected: 'Chưa kết nối',
  connecting: 'Đang kết nối',
  connected: 'Đã kết nối',
  ready: 'Sẵn sàng nạp',
  busy: 'Máy đang bận',
  error: 'Có lỗi',
  unknown: 'Không rõ trạng thái',
};
