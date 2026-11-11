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
  energy_not_allowed: 'Mức năng lượng của đợt không có trong danh sách của máy, bác sĩ cần lưu phiên bản mới.',
  mode_not_allowed: 'Chế độ điều trị của đợt không có trên máy này, bác sĩ cần lưu phiên bản mới.',
  mode_not_in_spec: 'Chế độ điều trị không có trong giao thức.',
  value_out_of_wire_range: 'Có giá trị vượt giới hạn của giao thức.',
  capabilities_unknown: 'Chưa biết năng lực của mẫu máy này.',
};

export function sendResultLabel(r: SendResult): string {
  switch (r.kind) {
    case 'acked':
      return r.attempts > 1 ? `Máy đã nhận cấu hình (sau ${r.attempts} lần gửi).` : 'Máy đã nhận cấu hình.';
    case 'nacked':
      return `Máy từ chối cấu hình, mã ${r.code}.`;
    case 'timeout':
      return `Máy không trả lời sau ${r.attempts} lần gửi.`;
    case 'disconnected':
      return 'Mất kết nối, hãy cắm lại cáp và gửi lại.';
    case 'incompatible':
      return `Máy dùng giao thức phiên bản ${r.deviceVersion}, ứng dụng dùng phiên bản ${r.appVersion}, cần cập nhật ứng dụng hoặc firmware.`;
    case 'invalid':
      return 'Cấu hình không hợp lệ: ' + r.errors.map((e) => CONFIG_ERROR_LABEL[e]).join(' ');
  }
}
