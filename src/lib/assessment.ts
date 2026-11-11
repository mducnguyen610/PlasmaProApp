import type { WoundAssessment } from './types';

/**
 * Trường đánh giá vết thương có cấu trúc (mẫu biểu mẫu của Swift Skin and Wound).
 * BẢN NHÁP CHO DEMO: danh mục cần bác sĩ trong nhóm chọn lại, nên dựa trên một thang đã
 * kiểm định (ví dụ PUSH hoặc BWAT). Giai đoạn tì đè theo NPIAP 2016 (Edsberg và cs., 2016).
 */
export const WOUND_TYPES = ['Loét do tì đè', 'Loét bàn chân đái tháo đường', 'Loét do bệnh tĩnh mạch', 'Vết thương sau mổ', 'Bỏng', 'Chấn thương', 'Khác'] as const;
export const PRESSURE_STAGES = ['Giai đoạn 1', 'Giai đoạn 2', 'Giai đoạn 3', 'Giai đoạn 4', 'Không phân giai đoạn được', 'Tổn thương mô sâu'] as const;
export const PERCENT_BANDS = ['0%', '1–25%', '26–50%', '51–75%', '76–100%'] as const;
export const EXUDATE = ['Không', 'Ít', 'Vừa', 'Nhiều'] as const;
export const INFECTION = ['Không có dấu hiệu', 'Nghi ngờ', 'Có dấu hiệu'] as const;

export const HELP = {
  woundType: 'Nguyên nhân chính gây vết thương. Bắt buộc.',
  pressureStage: 'Chỉ hỏi khi là loét do tì đè. Phân giai đoạn theo NPIAP 2016.',
  granulation: 'Ước lượng phần trăm diện tích nền vết thương là mô hạt (đỏ, dạng hạt).',
  epithelial: 'Ước lượng phần trăm diện tích đã phủ biểu mô (lớp da mới, hồng nhạt).',
  exudate: 'Lượng dịch tiết quan sát được trên băng gạc. Bắt buộc.',
  infection: 'Đỏ lan rộng, nóng, sưng, mủ, mùi hôi hoặc sốt. Bắt buộc.',
} as const;

export const PRESSURE = WOUND_TYPES[0];

/** Trả về thông báo lỗi đầu tiên, hoặc null nếu đủ trường bắt buộc. */
export function assessmentError(a: Partial<WoundAssessment>): string | null {
  if (!a.woundType) return 'Hãy chọn loại vết thương.';
  if (a.woundType === PRESSURE && !a.pressureStage) return 'Loét do tì đè cần chọn giai đoạn.';
  if (!a.exudate) return 'Hãy chọn mức dịch tiết.';
  if (!a.infection) return 'Hãy chọn dấu hiệu nhiễm trùng.';
  return null;
}

export function assessmentSummary(a: WoundAssessment): string {
  return [
    a.woundType + (a.pressureStage ? ` (${a.pressureStage.toLowerCase()})` : ''),
    a.granulation ? `mô hạt ${a.granulation}` : null,
    a.epithelial ? `biểu mô hóa ${a.epithelial}` : null,
    `dịch tiết ${a.exudate.toLowerCase()}`,
    `nhiễm trùng: ${a.infection.toLowerCase()}`,
  ].filter(Boolean).join(' · ');
}

/** Tuổi vết thương tính từ ngày bắt đầu theo dõi, không bắt bác sĩ nhập lại. */
export function woundAge(startDate: string, today: string): string {
  const days = Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${startDate}T00:00:00Z`)) / 86400000));
  if (days < 14) return `${days} ngày`;
  if (days < 60) return `${Math.floor(days / 7)} tuần`;
  return `${Math.floor(days / 30)} tháng`;
}
