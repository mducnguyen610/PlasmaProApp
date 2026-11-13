/**
 * P1-07b: nguồn của số diện tích bác sĩ đang lưu trên một ảnh (ai nhập, lúc nào, phương pháp), dùng chung cho B08 và B11.
 * Quy tắc chuyển nguyên từ B11 (P0 DS-02): ưu tiên người xác nhận trong capture.manualReference khi số trùng số hiện tại,
 * nếu không thì lần sửa nhãn gần nhất có toArea bằng số hiện tại. Chỉ đọc dữ liệu đã lưu; không có thì trả null, không đoán.
 */
export interface MeasurementSource { by: string; at: string | null; method: string | null }
type Img = {
  areaCm2: number | null;
  measureMethod?: string;
  history: { at: string; by: string; toArea: number | null }[];
  capture?: { manualReference?: { areaCm2: number | null; confirmedBy: string | null; confirmedAt: string | null } };
};

export function measurementSource(im: Img): MeasurementSource | null {
  if (im.areaCm2 === null) return null;
  const method = im.measureMethod?.trim() || null;
  const ref = im.capture?.manualReference;
  if (ref && ref.areaCm2 === im.areaCm2 && ref.confirmedBy) return { by: ref.confirmedBy, at: ref.confirmedAt, method };
  const lastSet = [...im.history].reverse().find((h) => h.toArea === im.areaCm2);
  return lastSet ? { by: lastSet.by, at: lastSet.at, method } : null;
}

/** Số ngày giữa hai ngày ISO (yyyy-mm-dd), chỉ là phép trừ lịch; giá trị tuyệt đối. */
export function daysBetween(a: string, b: string): number {
  return Math.abs(Math.round((Date.parse(`${b.slice(0, 10)}T00:00:00Z`) - Date.parse(`${a.slice(0, 10)}T00:00:00Z`)) / 86400000));
}

/**
 * P1-06a: ảnh có số đo gần nhất trước ảnh đang mở, cùng vết. Cùng bộ lọc và thứ tự với previousArea (plausibility.ts, không sửa),
 * nên số hiển thị trùng số mà cảnh báo bất thường dùng để so. Unit test so với previousArea.
 */
type Prev = { id: string; woundId: string; areaCm2: number | null; captureDate: string; status: string };
export function previousMeasuredImage<T extends Prev>(images: T[], current: { id: string; woundId: string; captureDate: string }): T | null {
  return images
    .filter((i) => i.woundId === current.woundId && i.id !== current.id && i.areaCm2 !== null && i.status === 'labeled' && i.captureDate <= current.captureDate)
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate))[0] ?? null;
}

/** P1-06b: ảnh liền trước và liền sau trong cùng vết, theo ngày chụp rồi mã ảnh. Không bao giờ trả ảnh của vết khác. */
export function neighbourImages<T extends { id: string; woundId: string; captureDate: string }>(images: T[], current: { id: string; woundId: string }): { prev: T | null; next: T | null } {
  const same = images.filter((i) => i.woundId === current.woundId).sort((a, b) => a.captureDate.localeCompare(b.captureDate) || a.id.localeCompare(b.id));
  const k = same.findIndex((i) => i.id === current.id);
  if (k < 0) return { prev: null, next: null };
  return { prev: same[k - 1] ?? null, next: same[k + 1] ?? null };
}
