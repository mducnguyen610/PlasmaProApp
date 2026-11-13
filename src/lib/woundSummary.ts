/**
 * P1-02: tóm tắt một vết thương từ dữ liệu sẵn có, dùng cho B04 (dòng vết) và B05 (khối Hiện trạng). Chỉ đọc, không suy luận.
 * - chartPoints: đúng quy tắc chọn điểm của AreaChart (ảnh đã gán nhãn, có số, rõ ngày chụp; mỗi ngày lấy ảnh mã nhỏ nhất).
 * - newerUnmeasured: ảnh chưa đo có ngày chụp sau ảnh đã đo mới nhất (hoặc mọi ảnh chưa đo khi chưa có số đo), mới trước.
 */
type Img = { id: string; woundId: string; status: string; areaCm2: number | null; captureDate: string; capture?: { sourceDateKnown?: boolean } };
type Ev = { woundId: string; date: string };

export function chartPoints<T extends Img>(images: T[]): T[] {
  const byDate = new Map<string, T>();
  for (const im of images) {
    if (im.status !== 'labeled' || im.areaCm2 === null || im.capture?.sourceDateKnown === false) continue;
    const prev = byDate.get(im.captureDate);
    if (!prev || im.id < prev.id) byDate.set(im.captureDate, im);
  }
  return [...byDate.values()].sort((a, b) => a.captureDate.localeCompare(b.captureDate));
}

export interface WoundSummary<T, E> { latest: T | null; previous: T | null; newerUnmeasured: T[]; lastEval: E | null }

export function woundSummary<T extends Img, E extends Ev>(images: T[], evaluations: E[], woundId: string): WoundSummary<T, E> {
  const mine = images.filter((i) => i.woundId === woundId);
  const labeled = mine.filter((i) => i.status === 'labeled' && i.areaCm2 !== null).sort((a, b) => a.captureDate.localeCompare(b.captureDate));
  const latest = labeled[labeled.length - 1] ?? null;
  const pts = chartPoints(mine);
  // "Lần trước": điểm liền trước điểm của ảnh mới nhất trên biểu đồ (cùng quy tắc với AreaChart).
  const k = latest ? pts.findIndex((p) => p.captureDate === latest.captureDate) : -1;
  const previous = k > 0 ? pts[k - 1] : null;
  const newerUnmeasured = mine
    .filter((i) => i.status === 'unlabeled' && (!latest || i.captureDate > latest.captureDate))
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate) || b.id.localeCompare(a.id));
  const lastEval = evaluations.filter((e) => e.woundId === woundId).sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  return { latest, previous, newerUnmeasured, lastEval };
}
