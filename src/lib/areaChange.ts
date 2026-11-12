import type { WoundImage } from './types.ts';

/**
 * PP-06: so sánh hai số đo diện tích gần nhất do bác sĩ nhập của một vết thương.
 * Chọn điểm giống biểu đồ AreaChart: ảnh đã gán nhãn, có diện tích, rõ ngày chụp; một ngày nhiều ảnh thì lấy ảnh có mã nhỏ nhất.
 * Chỉ báo số đo sau lớn hơn số đo trước. Không tính lại diện tích, không suy ra mức độ hay xu hướng lâm sàng.
 */
export interface AreaIncrease { previous: number; latest: number; previousDate: string; latestDate: string }

export function latestAreaIncrease(images: WoundImage[]): AreaIncrease | null {
  const byDate = new Map<string, WoundImage>();
  for (const im of images) {
    if (im.status !== 'labeled' || im.areaCm2 === null || im.capture?.sourceDateKnown === false) continue;
    const prev = byDate.get(im.captureDate);
    if (!prev || im.id < prev.id) byDate.set(im.captureDate, im);
  }
  const pts = [...byDate.values()].sort((a, b) => a.captureDate.localeCompare(b.captureDate));
  if (pts.length < 2) return null;
  const a = pts[pts.length - 2], b = pts[pts.length - 1];
  if (b.areaCm2! <= a.areaCm2!) return null;
  return { previous: a.areaCm2!, latest: b.areaCm2!, previousDate: a.captureDate, latestDate: b.captureDate };
}
