// Đợt 5 (PP-13): câu thông báo của màn Nạp liệu trình (T01) dành riêng cho bệnh nhân, bỏ thuật ngữ kỹ thuật.
// Theo bảng câu chữ đã duyệt 12/11/2026 (DOT5_BANG_CAU_CHU.md, C32, C33, C36, C45 đến C66).
// Chọn câu theo mã kết quả, mã NAK và mã lỗi (không dò theo chữ). Không sửa src/lib/device: bác sĩ và quản trị viên vẫn thấy câu cũ.
// Record theo kiểu của lớp thiết bị nên khi lớp đó thêm mã mới, tsc báo thiếu câu ở đây.

import type { ConfigMissing } from './device';
import type { ConfigError } from './device/protocol';
import type { SendResult } from './device/sender';

export const PATIENT_MISSING_LABEL: Record<ConfigMissing, string> = { duration: 'thời gian điều trị', energy: 'mức năng lượng', mode: 'chế độ điều trị' };

export const PATIENT_CONFIG_ERROR: Record<ConfigError, string> = {
  patient_id_empty: 'Hồ sơ của bạn chưa có mã. Hãy báo bác sĩ.',
  patient_id_too_long: 'Mã hồ sơ quá dài nên máy không nhận. Hãy báo bác sĩ.',
  patient_id_charset: 'Mã hồ sơ có ký tự máy không đọc được. Hãy báo bác sĩ.',
  time_invalid: 'Thời gian điều trị trong đợt điều trị chưa đúng. Hãy báo bác sĩ.',
  time_out_of_range: 'Thời gian điều trị không nằm trong khoảng máy cho phép. Hãy báo bác sĩ.',
  energy_invalid: 'Mức năng lượng trong đợt điều trị chưa đúng. Hãy báo bác sĩ.',
  energy_not_allowed: 'Máy không có mức năng lượng của đợt này. Hãy báo bác sĩ.',
  mode_not_allowed: 'Máy này không có chế độ điều trị của đợt này. Hãy báo bác sĩ.',
  mode_not_in_spec: 'Ứng dụng chưa hỗ trợ chế độ điều trị này. Hãy báo bác sĩ.',
  value_out_of_wire_range: 'Có giá trị máy không nhận được. Hãy báo bác sĩ.',
  capabilities_unknown: 'Ứng dụng chưa có thông tin về mẫu máy này. Hãy báo bác sĩ.',
};

/** Lời giải thích mã NAK cho bệnh nhân. Mã gốc vẫn ghi kèm để báo bác sĩ hoặc kỹ thuật. Có gửi lại hay không vẫn theo nakHint. */
const PATIENT_NAK: Record<string, string> = {
  BAD_CHECKSUM: 'Dữ liệu gửi bị lỗi. Cắm chặt cáp, rồi chạm "Gửi lại".',
  BAD_FIELDS: 'Máy không nhận liệu trình này. Gửi lại vẫn sẽ lỗi. Hãy báo bác sĩ.',
  BUSY: 'Máy đang điều trị hoặc đang bận. Chờ máy xong, rồi chạm "Gửi lại".',
};

export const PATIENT_UNIDENTIFIED = 'Máy chưa phản hồi. Chạm "Ngắt kết nối", rồi chạm "Kết nối" lại.';

export function patientIncompatible(deviceVersion: number | string, appVersion: number | string): string {
  return `Máy và ứng dụng chưa khớp phiên bản. Hãy báo bác sĩ. (Máy: ${deviceVersion}, ứng dụng: ${appVersion}.)`;
}

export function patientSendResultLabel(r: SendResult): string {
  switch (r.kind) {
    case 'acked':
      return r.attempts > 1 ? `Máy đã nhận liệu trình (sau ${r.attempts} lần gửi).` : 'Máy đã nhận liệu trình.';
    case 'nacked':
      return `${PATIENT_NAK[r.code] ?? 'Máy không nhận liệu trình. Hãy báo bác sĩ.'} (Mã ${r.code}.)`;
    case 'timeout':
      return `Máy không phản hồi sau ${r.attempts} lần gửi. Kiểm tra máy đã bật và cáp đã cắm. Sau đó chạm "Gửi lại".`;
    case 'corrupted':
      return `Máy gửi về dữ liệu lỗi sau ${r.attempts} lần gửi. Kiểm tra cáp, rồi chạm "Gửi lại".`;
    case 'disconnected':
      return 'Mất kết nối với máy. Cắm lại cáp, chạm "Kết nối lại", rồi gửi lại.';
    case 'unidentified':
      return PATIENT_UNIDENTIFIED;
    case 'incompatible':
      return patientIncompatible(r.deviceVersion, r.appVersion);
    case 'invalid':
      return 'Liệu trình chưa nạp được: ' + r.errors.map((e) => PATIENT_CONFIG_ERROR[e]).join(' ');
  }
}
