// Kiểm tra mức hợp lý của diện tích bác sĩ nhập, trước khi lưu.
// Mục đích: bắt lỗi gõ nhầm (thừa số 0, nhầm mm² với cm², nhập vào nhầm ảnh) có thể làm sai diễn biến vết thương.
// Đây chỉ là cảnh báo để bác sĩ xác nhận lại, không chặn việc lưu.

export interface AreaReference {
  areaCm2: number;
  captureDate: string;
}

/** Diện tích lớn hơn ngưỡng này (cm²) cần xác nhận lại. Ngưỡng là đề xuất cho bản demo, chưa có căn cứ lâm sàng. */
export const LARGE_AREA_CM2 = 200;
/** Tỉ lệ thay đổi so với lần đo gần nhất cần xác nhận lại (gấp hơn 2 lần hoặc còn dưới một nửa). */
export const CHANGE_RATIO = 2;

/**
 * Trả về lời cảnh báo nếu diện tích mới bất thường, hoặc null nếu hợp lý.
 * previous: lần đo gần nhất của cùng vết thương (khác ảnh đang sửa), nếu có.
 */
export function areaWarning(newArea: number, previous: AreaReference | null): string | null {
  if (!Number.isFinite(newArea) || newArea <= 0) return null;
  const parts: string[] = [];
  if (newArea > LARGE_AREA_CM2) parts.push(`Diện tích ${fmt(newArea)} cm² lớn hơn ${LARGE_AREA_CM2} cm².`);
  if (previous && previous.areaCm2 > 0) {
    const ratio = newArea / previous.areaCm2;
    if (ratio >= CHANGE_RATIO || ratio <= 1 / CHANGE_RATIO) {
      parts.push(`Lần đo trước (${previous.captureDate}) là ${fmt(previous.areaCm2)} cm², nay ${ratio > 1 ? 'tăng' : 'giảm'} ${fmt(ratio > 1 ? ratio : 1 / ratio)} lần.`);
    }
  }
  if (parts.length === 0) return null;
  return parts.join(' ') + ' Hãy kiểm tra lại đơn vị (cm² hay mm²), số 0 và đúng ảnh của vết thương.';
}

const fmt = (n: number) => (Math.round(n * 100) / 100).toString().replace('.', ',');

/** Lần đo gần nhất trước ngày chụp của ảnh đang sửa, cùng vết thương, đã có diện tích. */
export function previousArea(
  images: { id: string; woundId: string; areaCm2: number | null; captureDate: string; status: string }[],
  current: { id: string; woundId: string; captureDate: string },
): AreaReference | null {
  const prev = images
    .filter((i) => i.woundId === current.woundId && i.id !== current.id && i.areaCm2 !== null && i.status === 'labeled' && i.captureDate <= current.captureDate)
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate))[0];
  return prev ? { areaCm2: prev.areaCm2!, captureDate: prev.captureDate } : null;
}
