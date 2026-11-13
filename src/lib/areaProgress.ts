/**
 * P2-02a: dữ liệu cho biểu đồ đường "Tiến triển diện tích" (đặc tả PLASMA_PRO_P2_WOUND_PROGRESS_CHART_SPEC mục 3 đến 7).
 * Hàm thuần, không đọc store. Chỉ đọc số đo đã lưu trên chính ảnh (WoundImage.areaCm2); không tính lại diện tích,
 * không nội suy, không làm mượt, không dự báo, không suy ra mức độ hay xu hướng lâm sàng.
 * Không dùng plan.areaAtStart và không thay areaReview (course.ts): ReviewNote của bác sĩ giữ nguyên.
 * Người nhập lấy qua tham số sourceOf (truyền measurementSource của P1-07b), để tệp không phụ thuộc lúc chạy và chạy được unit test bằng node.
 */

type Img = {
  id: string; woundId: string; status: string; areaCm2: number | null; captureDate: string; source: 'doctor' | 'patient' | 'demo';
  measureMethod?: string;
  history: { at: string; by: string; toArea: number | null }[];
  capture?: { sourceDateKnown?: boolean; manualReference?: { areaCm2: number | null; confirmedBy: string | null; confirmedAt: string | null } };
};
type Ev = { id: string; woundId: string; imageId?: string; date: string; visibleToPatient: boolean };

export interface AreaPoint {
  imageId: string;
  woundId: string;
  date: string;
  areaCm2: number;
  method: string | null;
  methodKey: string;
  source: 'doctor' | 'patient' | 'demo';
  enteredBy: string | null;
  enteredAt: string | null;
  /** Đánh giá đã công bố gắn đúng ảnh này (Evaluation.imageId), null nếu không có. */
  evaluationId: string | null;
}
/** Ảnh không thành điểm, đếm theo lý do (V1 đến V6). rejected: ảnh bác sĩ đã loại (status excluded). */
export interface ExcludedCount { unmeasured: number; unknownDate: number; invalid: number; sameDayHidden: number; rejected: number }
export interface ProgressInput {
  points: AreaPoint[];
  /** Ảnh hợp lệ nhưng cùng ngày với điểm đã chọn (mã lớn hơn): không vẽ, vẫn liệt kê trong danh sách lần đo. */
  sameDay: AreaPoint[];
  /** Ngày của ảnh chưa đo có ngày chụp rõ: vẽ dấu tròn rỗng sát trục, không có giá trị. */
  unmeasuredDates: string[];
  excluded: ExcludedCount;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;
const validDay = (d: string) => ISO.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().slice(0, 10) === d;

/** Khóa nhóm phương pháp: chuỗi đã trim, không phân biệt hoa thường; trống là nhóm "Chưa ghi phương pháp". Không gộp chuỗi khác nhau. */
export function methodKey(method?: string | null): string { return (method ?? '').trim().toLowerCase(); }
export function methodLabel(method?: string | null): string { return (method ?? '').trim() || 'Chưa ghi phương pháp'; }

export function progressInput<T extends Img>(images: T[], woundId: string, today: string, evaluations: Ev[] = [], sourceOf: (im: T) => { by: string; at: string | null } | null = () => null): ProgressInput {
  const excluded: ExcludedCount = { unmeasured: 0, unknownDate: 0, invalid: 0, sameDayHidden: 0, rejected: 0 };
  const unmeasuredDates = new Set<string>();
  const valid: T[] = [];
  for (const im of images) {
    if (im.woundId !== woundId) continue; // V1
    if (im.status === 'excluded') { excluded.rejected++; continue; }
    if (im.status !== 'labeled' || im.areaCm2 === null) { // V2
      excluded.unmeasured++;
      if (im.capture?.sourceDateKnown !== false && validDay(im.captureDate) && im.captureDate <= today) unmeasuredDates.add(im.captureDate);
      continue;
    }
    if (im.capture?.sourceDateKnown === false) { excluded.unknownDate++; continue; } // V4
    if (typeof im.areaCm2 !== 'number' || !Number.isFinite(im.areaCm2) || im.areaCm2 < 0 || !validDay(im.captureDate) || im.captureDate > today) { excluded.invalid++; continue; } // V3, V5
    valid.push(im);
  }
  const published = evaluations.filter((e) => e.woundId === woundId && e.visibleToPatient && e.imageId);
  const toPoint = (im: T): AreaPoint => {
    const src = sourceOf(im);
    const ev = published.filter((e) => e.imageId === im.id).sort((a, b) => b.date.localeCompare(a.date))[0];
    const method = im.measureMethod?.trim() || null;
    return { imageId: im.id, woundId: im.woundId, date: im.captureDate, areaCm2: im.areaCm2!, method, methodKey: methodKey(method), source: im.source,
      enteredBy: src?.by ?? null, enteredAt: src?.at ?? null, evaluationId: ev?.id ?? null };
  };
  // V6: mỗi ngày một điểm, ảnh có mã nhỏ nhất (cùng quy tắc chartPoints, woundSummary.ts).
  const byDate = new Map<string, T>();
  for (const im of valid) { const prev = byDate.get(im.captureDate); if (!prev || im.id < prev.id) byDate.set(im.captureDate, im); }
  const chosen = new Set([...byDate.values()].map((i) => i.id));
  const sameDay = valid.filter((i) => !chosen.has(i.id)).map(toPoint).sort((a, b) => a.date.localeCompare(b.date) || a.imageId.localeCompare(b.imageId));
  excluded.sameDayHidden = sameDay.length;
  const points = [...byDate.values()].map(toPoint).sort((a, b) => a.date.localeCompare(b.date));
  return { points, sameDay, unmeasuredDates: [...unmeasuredDates].sort(), excluded };
}

/** Câu đếm ảnh không vào biểu đồ. Không có ảnh bị loại thì trả null. */
export function excludedText(x: ExcludedCount): string | null {
  const parts = [
    x.unmeasured ? `${x.unmeasured} ảnh chưa đo` : '',
    x.unknownDate ? `${x.unknownDate} ảnh không rõ ngày chụp` : '',
    x.invalid ? `${x.invalid} ảnh có số đo hoặc ngày không hợp lệ` : '',
    x.rejected ? `${x.rejected} ảnh bác sĩ không dùng` : '',
    x.sameDayHidden ? `${x.sameDayHidden} ảnh chụp cùng ngày với lần đo khác` : '',
  ].filter(Boolean);
  return parts.length ? `Không đưa vào biểu đồ: ${parts.join(', ')}.` : null;
}

// Khoảng thời gian (mục 5).
export type RangeKey = 'm1' | 'm3' | 'm6' | 'all';
export const RANGE_LABEL: Record<RangeKey, string> = { m1: '1 tháng', m3: '3 tháng', m6: '6 tháng', all: 'Toàn bộ' };
const MONTHS: Record<Exclude<RangeKey, 'all'>, number> = { m1: 1, m3: 3, m6: 6 };

/** Lùi n tháng theo lịch; ngày không tồn tại (31/02) dồn về ngày cuối tháng. */
export function addMonths(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1 + n, 1));
  const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate();
  t.setUTCDate(Math.min(d, last));
  return t.toISOString().slice(0, 10);
}
export function rangeStart(range: RangeKey, today: string): string | null { return range === 'all' ? null : addMonths(today, -MONTHS[range]); }
export function inRange<T extends { date: string }>(points: T[], range: RangeKey, today: string): T[] {
  const from = rangeStart(range, today);
  return from ? points.filter((p) => p.date >= from) : points;
}
/** Lựa chọn N tháng chỉ hiện khi khoảng có ít nhất 1 điểm và có điểm nằm ngoài khoảng. Chỉ còn "Toàn bộ" thì trả mảng một phần tử (ẩn bộ chọn). */
export function rangeOptions(points: { date: string }[], today: string): RangeKey[] {
  const out: RangeKey[] = [];
  for (const r of ['m1', 'm3', 'm6'] as const) { const n = inRange(points, r, today).length; if (n >= 1 && n < points.length) out.push(r); }
  return [...out, 'all'];
}

// Nhóm phương pháp (mục 7, QĐ-P2-1 = C).
export interface MethodSplit { mainKey: string | null; mainLabel: string | null; main: AreaPoint[]; others: AreaPoint[] }
export function splitByMethod(points: AreaPoint[]): MethodSplit {
  const last = points[points.length - 1];
  if (!last) return { mainKey: null, mainLabel: null, main: [], others: [] };
  return { mainKey: last.methodKey, mainLabel: methodLabel(last.method), main: points.filter((p) => p.methodKey === last.methodKey), others: points.filter((p) => p.methodKey !== last.methodKey) };
}

// Tóm tắt và phần trăm (mục 6): luôn trong nhóm chính.
export type ProgressSummary =
  | { kind: 'none' }
  | { kind: 'one'; point: AreaPoint }
  | { kind: 'mixed'; point: AreaPoint }
  | { kind: 'zeroBase'; base: AreaPoint; current: AreaPoint }
  | { kind: 'change'; base: AreaPoint; current: AreaPoint; delta: number; pct: number; days: number };

export function progressSummary(points: AreaPoint[]): ProgressSummary {
  const { main } = splitByMethod(points);
  if (points.length === 0) return { kind: 'none' };
  if (points.length === 1) return { kind: 'one', point: points[0] };
  if (main.length < 2) return { kind: 'mixed', point: main[main.length - 1] };
  const base = main[0], current = main[main.length - 1];
  if (base.areaCm2 === 0) return { kind: 'zeroBase', base, current };
  const delta = current.areaCm2 - base.areaCm2;
  return { kind: 'change', base, current, delta, pct: (delta / base.areaCm2) * 100, days: dayDiff(base.date, current.date) };
}

/** Phần trăm tuyệt đối, 1 chữ số thập phân, dấu phẩy: 32,8%. */
export function fmtPct(pct: number): string { return `${(Math.round(Math.abs(pct) * 10) / 10).toFixed(1).replace('.', ',')}%`; }
/** Diện tích 1 chữ số thập phân, dấu phẩy (cùng cách hiển thị formatAreaDisplay). */
const fmtArea = (a: number) => `${(Math.round(a * 10) / 10).toFixed(1).replace('.', ',')} cm²`;
const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;
export function dayDiff(a: string, b: string): number { return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000); }

/** Câu chữ mục 6.3, 6.4. headline null khi không có dòng nổi bật. Không có từ đánh giá ("lành", "hồi phục", "tốt lên"…). */
export function summaryText(s: ProgressSummary): { headline: string | null; detail: string | null } {
  switch (s.kind) {
    case 'none': return { headline: null, detail: null };
    case 'one': return { headline: null, detail: 'Mới có 1 lần đo. Cần thêm lần đo để thấy sự thay đổi.' };
    case 'mixed': return { headline: null, detail: 'Các lần đo dùng phương pháp khác nhau nên không so phần trăm.' };
    case 'zeroBase': return { headline: null, detail: 'Không tính phần trăm vì lần đo đầu bằng 0 cm².' };
    case 'change': {
      const { base, current, delta, pct, days } = s;
      if (delta === 0) return { headline: null, detail: `Diện tích không đổi so với lần đo ngày ${ddmm(base.date)}.` };
      const down = delta < 0;
      return {
        headline: `${down ? '↓ Giảm' : '↑ Tăng'} ${fmtPct(pct)} so với lần đo đầu`,
        detail: `Diện tích ${down ? 'giảm' : 'tăng'} từ ${fmtArea(base.areaCm2)} (${ddmm(base.date)}) ${down ? 'xuống' : 'lên'} ${fmtArea(current.areaCm2)} (${ddmm(current.date)}), sau ${days} ngày.`,
      };
    }
  }
}

// Trục (mục 8).
/** Số tròn trên giá trị lớn nhất, bước 1, 2, 5 × 10^k, 4 đến 5 vạch, bắt đầu từ 0. */
export function niceAxis(maxValue: number): { max: number; step: number } {
  const v = maxValue > 0 ? maxValue : 1;
  // Bước tròn nhỏ nhất sao cho trục có tối đa 5 khoảng.
  const p = 10 ** Math.floor(Math.log10(v / 5));
  const step = [1, 2, 5, 10].map((m) => m * p).find((s) => Math.ceil(v / s - 1e-9) <= 5) ?? 10 * p;
  return { max: Math.round(Math.ceil(v / step - 1e-9) * step * 1e6) / 1e6, step };
}
/** Tọa độ X tỉ lệ theo số ngày giữa from và to (ngày lịch). */
export function xScale(date: string, from: string, to: string, x0: number, x1: number): number {
  const span = dayDiff(from, to);
  if (span <= 0) return (x0 + x1) / 2;
  return x0 + ((x1 - x0) * dayDiff(from, date)) / span;
}

const MONTH_DAY = (d: string) => `ngày ${Number(d.slice(8, 10))} tháng ${Number(d.slice(5, 7))}`;
/** Ngày viết đầy đủ cho trình đọc màn hình: "ngày 1 tháng 10 năm 2026". */
export function spokenDate(d: string): string { return `${MONTH_DAY(d)} năm ${d.slice(0, 4)}`; }
const spokenArea = (a: number) => `${(Math.round(a * 10) / 10).toFixed(1).replace('.', ',')} xăng ti mét vuông`;
export function pointLabel(p: AreaPoint): string { return `${spokenDate(p.date)}, ${spokenArea(p.areaCm2)}, ${methodLabel(p.method).toLowerCase()}`; }
/** Nhãn tóm tắt của cả biểu đồ (mục 11): ngày đầy đủ, không từ chủ quan. */
export function chartLabel(code: string, drawn: AreaPoint[], axisMax: number): string {
  if (drawn.length === 0) return `Biểu đồ đường diện tích vết thương ${code}. Chưa có lần đo.`;
  const a = drawn[0], b = drawn[drawn.length - 1];
  return `Biểu đồ đường diện tích vết thương ${code}. ${drawn.length} lần đo từ ${spokenDate(a.date)} đến ${spokenDate(b.date)}. `
    + `Trục dọc từ 0 đến ${String(axisMax).replace('.', ',')} xăng ti mét vuông. Lần đầu ${fmtArea(a.areaCm2).replace(' cm²', '')}; gần nhất ${fmtArea(b.areaCm2).replace(' cm²', '')}.`;
}
