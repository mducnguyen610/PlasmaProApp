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
