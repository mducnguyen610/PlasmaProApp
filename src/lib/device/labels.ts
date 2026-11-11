// Nhãn tiếng Việt cho lớp thiết bị, dùng chung giữa các màn.

import type { ConfigError } from './protocol';
import type { SendResult } from './sender';
import type { SessionState } from './spec';
import type { LinkState } from './transport';
import type { ConfigMissing } from './index';

export const LINK_LABEL: Record<LinkState, string> = { disconnected: 'Chưa kết nối', connecting: 'Đang kết nối', connected: 'Đã kết nối', error: 'Lỗi kết nối' };

export const SESSION_LABEL: Record<SessionState, string> = { idle: 'Chờ', running: 'Đang chiếu', done: 'Đã xong', stopped: 'Đã dừng', error: 'Lỗi trên máy' };

export const MISSING_LABEL: Record<ConfigMissing, string> = { duration: 'thời gian chiếu', energy: 'mức năng lượng', mode: 'chế độ điều trị' };

export const CONFIG_ERROR_LABEL: Record<ConfigError, string> = {
  patient_id_empty: 'Hồ sơ chưa có mã.',
  patient_id_too_long: 'Mã hồ sơ dài hơn giới hạn của máy.',
  patient_id_charset: 'Mã hồ sơ có ký tự máy không nhận.',
  time_invalid: 'Thời gian chiếu phải là số giây nguyên dương.',
  time_out_of_range: 'Thời gian chiếu nằm ngoài khoảng máy cho phép.',
  energy_invalid: 'Mức năng lượng phải là số nguyên.',
  energy_not_allowed: 'Mức năng lượng của đợt không có trong danh sách của máy, bác sĩ cần lưu phiên bản mới.',
  mode_not_allowed: 'Chế độ điều trị của đợt không có trên máy này, bác sĩ cần lưu phiên bản mới.',
  mode_not_in_spec: 'Chế độ điều trị không có trong giao thức.',
  value_out_of_wire_range: 'Có giá trị vượt giới hạn của giao thức.',
  capabilities_unknown: 'Chưa biết năng lực của mẫu máy này.',
};

/**
 * Lời giải thích mã NAK cho người dùng (wireframe T01, G1 đến G4). Mã gốc vẫn ghi kèm để báo bác sĩ hoặc kỹ thuật.
 * `retry`: gửi lại có ích hay không. ICD mục 7 cấm ứng dụng tự gửi lại khi nhận NAK, nên người dùng bấm.
 */
export const NAK_HINT: Record<string, { text: string; retry: boolean }> = {
  BAD_CHECKSUM: { text: 'Dữ liệu bị lỗi trên đường truyền. Kiểm tra cáp đã cắm chặt rồi bấm Gửi lại.', retry: true },
  BAD_FIELDS: { text: 'Máy không nhận giá trị của đợt điều trị. Gửi lại sẽ vẫn lỗi, hãy báo bác sĩ.', retry: false },
  BUSY: { text: 'Máy đang chiếu hoặc đang bận. Chờ máy xong rồi bấm Gửi lại.', retry: true },
};

export function nakHint(code: string): { text: string; retry: boolean } {
  return NAK_HINT[code] ?? { text: 'Máy từ chối cấu hình. Hãy báo bác sĩ.', retry: false };
}

/** Giây còn lại dạng phút:giây, ví dụ 176 thành "2:56". */
export function fmtRemaining(sec: number | null | undefined): string {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return '–';
  const s = Math.round(sec);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function sendResultLabel(r: SendResult): string {
  switch (r.kind) {
    case 'acked':
      return r.attempts > 1 ? `Máy đã nhận cấu hình (sau ${r.attempts} lần gửi).` : 'Máy đã nhận cấu hình.';
    case 'nacked':
      return `${nakHint(r.code).text} (Mã ${r.code}.)`;
    case 'timeout':
      return `Máy không trả lời sau ${r.attempts} lần gửi. Kiểm tra máy đã bật và cáp đã cắm rồi gửi lại.`;
    case 'corrupted':
      return `Máy trả về dữ liệu hỏng (sai checksum hoặc sai cấu trúc) sau ${r.attempts} lần gửi. Hãy kiểm tra cáp rồi gửi lại.`;
    case 'disconnected':
      return 'Mất kết nối, hãy cắm lại cáp và gửi lại.';
    case 'unidentified':
      return 'Máy chưa trả lời lệnh hỏi thông tin nên chưa kiểm được phiên bản giao thức. Hãy ngắt rồi kết nối lại.';
    case 'incompatible':
      return `Máy dùng giao thức phiên bản ${r.deviceVersion}, ứng dụng dùng phiên bản ${r.appVersion}, cần cập nhật ứng dụng hoặc firmware.`;
    case 'invalid':
      return 'Cấu hình không hợp lệ: ' + r.errors.map((e) => CONFIG_ERROR_LABEL[e]).join(' ');
  }
}
