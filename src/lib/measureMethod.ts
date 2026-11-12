/**
 * PP-11: phương pháp đo của lần đo trước cùng vết thương, để điền sẵn làm gợi ý trong form nhập diện tích (B11).
 * Chọn giống previousArea (plausibility.ts): ảnh khác của cùng vết thương, đã gán nhãn, có diện tích, ngày chụp không sau ảnh hiện tại;
 * lấy ảnh gần nhất có ghi phương pháp. Bỏ qua phương pháp "Ước lượng AR…" vì số AR gắn với dữ liệu của đúng ảnh đó.
 * Không có căn cứ thì trả null (form để trống như cũ). Chỉ đọc, không lưu.
 */
export interface MethodRef { method: string; imageId: string; captureDate: string }
type Img = { id: string; woundId: string; areaCm2: number | null; captureDate: string; status: string; measureMethod?: string; capture?: { sourceDateKnown?: boolean } };

export function previousMethod(images: Img[], current: { id: string; woundId: string; captureDate: string }): MethodRef | null {
  const prev = images
    .filter((i) => i.woundId === current.woundId && i.id !== current.id && i.areaCm2 !== null && i.status === 'labeled'
      && i.captureDate <= current.captureDate && !!i.measureMethod?.trim() && !i.measureMethod.trim().startsWith('Ước lượng AR'))
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate) || b.id.localeCompare(a.id))[0];
  return prev ? { method: prev.measureMethod!.trim(), imageId: prev.id, captureDate: prev.captureDate } : null;
}
