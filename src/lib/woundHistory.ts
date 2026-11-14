/**
 * Giao diện theo tác vụ, giai đoạn 4 (B08 Lịch sử và so sánh ảnh): dữ liệu cho các màn chỉ đọc của một vết thương.
 * Hàm thuần, không đọc store, không ghi gì. Chỉ sắp xếp và lọc các bản ghi đã lưu; không tính lại diện tích,
 * không suy ra tiến triển, không tạo kết luận lâm sàng. Mọi hàm chỉ nhận bản ghi có woundId trùng vết đang mở.
 *
 * Liên kết khóa trong mô hình hiện có (không đổi):
 * - Bệnh nhân: Wound.patientId. Ảnh mang cả woundId và patientId; đánh giá chỉ mang woundId (và imageId tùy chọn).
 * - Buổi điều trị: DeviceSession.woundId (lọc sẵn bằng sessionsForWound trước khi đưa vào đây).
 * - Đợt điều trị: TreatmentPlan.woundId, bản cũ không có woundId thì thuộc vết đầu tiên của bệnh nhân (như B05, coursePlan).
 * - "record_id" của màn chi tiết là cặp (loại, id) với id là Evaluation.id, WoundImage.id, TreatmentPlan.id hoặc DeviceSession.sessionId.
 */
import type { DeviceSession, Evaluation, TreatmentPlan, Wound, WoundImage } from './types';

export type RecordKind = 'danh-gia' | 'anh' | 'dot' | 'buoi';
export const RECORD_KINDS: RecordKind[] = ['danh-gia', 'anh', 'dot', 'buoi'];

/**
 * Trạng thái lưu theo ngữ nghĩa có sẵn trong dữ liệu (không thêm trạng thái mới):
 * - nhap: đợt điều trị status 'draft' (bản nháp, chưa áp dụng).
 * - xac-nhan: bản ghi có người xác nhận (ảnh status 'labeled' có số đo bác sĩ; đợt đã gửi bệnh nhân xác nhận, confirmed).
 * - da-luu: đã lưu nhưng chưa có bước xác nhận (ảnh chưa đo, đánh giá, đợt chưa xác nhận, buổi điều trị).
 * - da-loai: ảnh bị loại khỏi bộ dữ liệu (status 'excluded'); ảnh vẫn được giữ.
 */
export type SaveState = 'nhap' | 'xac-nhan' | 'da-luu' | 'da-loai';

export interface TimelineEntry {
  kind: RecordKind;
  id: string;
  /** Ngày hoặc thời điểm ISO dùng để xếp; ngày chụp chưa rõ thì vẫn xếp theo ngày tải lên đã lưu (captureDate). */
  at: string;
  /** false khi ảnh có ngày chụp chưa xác định (capture.sourceDateKnown === false). */
  dateKnown: boolean;
  state: SaveState;
}

type Img = Pick<WoundImage, 'id' | 'woundId' | 'captureDate' | 'status' | 'areaCm2'> & { capture?: { sourceDateKnown?: boolean } };
type Ev = Pick<Evaluation, 'id' | 'woundId' | 'date' | 'visibleToPatient'>;
type Plan = Pick<TreatmentPlan, 'id' | 'patientId' | 'woundId' | 'status' | 'confirmed' | 'editedAt' | 'startDate' | 'version'>;
type Ses = Pick<DeviceSession, 'sessionId' | 'start' | 'woundId'>;

export function imageState(im: Pick<WoundImage, 'status'>): SaveState {
  return im.status === 'excluded' ? 'da-loai' : im.status === 'labeled' ? 'xac-nhan' : 'da-luu';
}

export function planState(pl: Pick<TreatmentPlan, 'status' | 'confirmed'>): SaveState {
  return pl.status === 'draft' ? 'nhap' : pl.confirmed ? 'xac-nhan' : 'da-luu';
}

/** Đợt điều trị thuộc vết thương: cùng quy tắc với B05 và coursePlan (bản cũ không có woundId thì thuộc vết đầu tiên). */
export function plansOfWound<T extends Pick<TreatmentPlan, 'patientId' | 'woundId'>>(plans: T[], wound: Pick<Wound, 'id' | 'patientId'>, firstWoundId: string | undefined): T[] {
  return plans.filter((pl) => pl.patientId === wound.patientId && (pl.woundId ?? firstWoundId) === wound.id);
}

/**
 * Dòng thời gian của một vết thương, mới trước. Chỉ gồm bản ghi của đúng vết (lọc lại theo woundId kể cả khi đầu vào đã lọc).
 * Bệnh nhân (isDoctor false): đánh giá đã công bố, ảnh, đợt đã gửi và bệnh nhân xác nhận; không có bản nháp và buổi điều trị
 * (như B05/N05 hiện nay).
 */
export function buildTimeline(input: {
  wound: Pick<Wound, 'id' | 'patientId'>;
  firstWoundId: string | undefined;
  images: Img[];
  evaluations: Ev[];
  plans: Plan[];
  sessions: Ses[];
  isDoctor: boolean;
}): TimelineEntry[] {
  const { wound, isDoctor } = input;
  const out: TimelineEntry[] = [];
  for (const e of input.evaluations) {
    if (e.woundId !== wound.id || (!isDoctor && !e.visibleToPatient)) continue;
    out.push({ kind: 'danh-gia', id: e.id, at: e.date, dateKnown: true, state: 'da-luu' });
  }
  for (const im of input.images) {
    if (im.woundId !== wound.id) continue;
    out.push({ kind: 'anh', id: im.id, at: im.captureDate, dateKnown: im.capture?.sourceDateKnown !== false, state: imageState(im) });
  }
  for (const pl of plansOfWound(input.plans, wound, input.firstWoundId)) {
    if (!isDoctor && (pl.status === 'draft' || !pl.confirmed)) continue;
    // Ngày của một phiên bản đợt là lúc lưu phiên bản (editedAt); thiếu thì lấy ngày bắt đầu.
    out.push({ kind: 'dot', id: pl.id, at: pl.editedAt || pl.startDate, dateKnown: true, state: planState(pl) });
  }
  if (isDoctor) {
    for (const s of input.sessions) {
      if (s.woundId !== undefined && s.woundId !== wound.id) continue;
      out.push({ kind: 'buoi', id: s.sessionId, at: s.start, dateKnown: true, state: 'da-luu' });
    }
  }
  // Mới trước theo ngày (10 ký tự đầu), cùng ngày thì theo thời điểm đầy đủ, rồi theo loại và id để thứ tự luôn ổn định.
  return out.sort((a, b) => b.at.slice(0, 10).localeCompare(a.at.slice(0, 10)) || b.at.localeCompare(a.at) || RECORD_KINDS.indexOf(a.kind) - RECORD_KINDS.indexOf(b.kind) || a.id.localeCompare(b.id));
}

/** Tìm bản ghi theo (loại, id) trong dòng thời gian đã lọc; không có thì null (màn chi tiết báo không tìm thấy). */
export function findRecord(timeline: TimelineEntry[], kind: string | undefined, id: string | undefined): TimelineEntry | null {
  return timeline.find((t) => t.kind === kind && t.id === id) ?? null;
}

export interface ImageGroup<T> { key: string; date: string | null; images: T[] }

/**
 * Ảnh nhóm theo ngày chụp, ngày mới trước; trong ngày giữ thứ tự mã ảnh. Ảnh có ngày chụp chưa rõ gom vào một nhóm riêng ở cuối
 * (date null) thay vì xếp theo ngày tải lên. Chỉ ảnh của woundId.
 */
export function groupImagesByDay<T extends Img>(images: T[], woundId: string): ImageGroup<T>[] {
  const known = new Map<string, T[]>();
  const unknown: T[] = [];
  for (const im of images) {
    if (im.woundId !== woundId) continue;
    if (im.capture?.sourceDateKnown === false) { unknown.push(im); continue; }
    const d = im.captureDate.slice(0, 10);
    known.set(d, [...(known.get(d) ?? []), im]);
  }
  const groups: ImageGroup<T>[] = [...known.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([d, ims]) => ({ key: d, date: d, images: [...ims].sort((a, b) => a.id.localeCompare(b.id)) }));
  if (unknown.length) groups.push({ key: 'chua-ro-ngay', date: null, images: [...unknown].sort((a, b) => a.id.localeCompare(b.id)) });
  return groups;
}

/**
 * Kết quả đo đã lưu của vết, mới trước. Ba nguồn tách riêng, không gộp, không chọn hộ:
 * - bac-si: số bác sĩ đo đang lưu trên ảnh (WoundImage.areaCm2), kèm phương pháp.
 * - danh-gia: diện tích ghi trong một lần đánh giá (Evaluation.areaCm2).
 * - tham-khao: ước lượng AR hoặc AI lưu trong capture (chưa kiểm chứng, chỉ tham khảo, QĐ-1).
 * Số cũ đã bị thay (LabelChange) không mất: trả về trong `replaced` của ảnh, đọc từ history có sẵn.
 */
export type MeasurementKind = 'bac-si' | 'danh-gia' | 'tham-khao';
export interface MeasurementEntry {
  kind: MeasurementKind;
  /** Mã bản ghi nguồn: id ảnh hoặc id đánh giá. */
  recordId: string;
  recordKind: 'anh' | 'danh-gia';
  at: string;
  dateKnown: boolean;
  areaCm2: number;
  method: string | null;
  /** Chỉ cho tham-khao: 'ar' (automaticMeasurement) hoặc 'ai' (mô-đun nhận diện). */
  refSource?: 'ar' | 'ai';
  /** Chỉ cho bac-si: các số trước đó đã bị thay, mới trước. */
  replaced?: { at: string; by: string; fromArea: number | null; toArea: number | null }[];
}

type MImg = Img & Pick<WoundImage, 'measureMethod'> & {
  history: { at: string; by: string; fromArea: number | null; toArea: number | null }[];
  capture?: { sourceDateKnown?: boolean; automaticMeasurement?: { areaCm2: number | null; status: string }; wound?: { areaCm2?: number | null } };
};
type MEv = Ev & Pick<Evaluation, 'areaCm2'>;

export function measurementHistory(input: { woundId: string; images: MImg[]; evaluations: MEv[]; isDoctor: boolean }): MeasurementEntry[] {
  const out: MeasurementEntry[] = [];
  for (const im of input.images) {
    if (im.woundId !== input.woundId) continue;
    const dateKnown = im.capture?.sourceDateKnown !== false;
    if (im.areaCm2 !== null) {
      // Lần sửa có fromArea khác null là lần thay một số đã lưu; history có sẵn giữ số cũ, chỉ đọc lại.
      const replaced = im.history.filter((h) => h.fromArea !== null).reverse();
      out.push({ kind: 'bac-si', recordId: im.id, recordKind: 'anh', at: im.captureDate, dateKnown, areaCm2: im.areaCm2, method: im.measureMethod?.trim() || null, replaced });
    }
    // Số tham khảo chỉ hiện cho bác sĩ (bệnh nhân không thấy số AI/AR ở B11 và N05 hiện nay).
    if (!input.isDoctor) continue;
    const ar = im.capture?.automaticMeasurement;
    if (ar && ar.status === 'estimated_unvalidated' && ar.areaCm2 !== null) {
      out.push({ kind: 'tham-khao', recordId: im.id, recordKind: 'anh', at: im.captureDate, dateKnown, areaCm2: ar.areaCm2, method: null, refSource: 'ar' });
    } else if (typeof im.capture?.wound?.areaCm2 === 'number') {
      out.push({ kind: 'tham-khao', recordId: im.id, recordKind: 'anh', at: im.captureDate, dateKnown, areaCm2: im.capture.wound.areaCm2, method: null, refSource: 'ai' });
    }
  }
  for (const e of input.evaluations) {
    if (e.woundId !== input.woundId || e.areaCm2 === null || (!input.isDoctor && !e.visibleToPatient)) continue;
    out.push({ kind: 'danh-gia', recordId: e.id, recordKind: 'danh-gia', at: e.date, dateKnown: true, areaCm2: e.areaCm2, method: null });
  }
  const order: MeasurementKind[] = ['bac-si', 'danh-gia', 'tham-khao'];
  return out.sort((a, b) => b.at.slice(0, 10).localeCompare(a.at.slice(0, 10)) || order.indexOf(a.kind) - order.indexOf(b.kind) || a.recordId.localeCompare(b.recordId));
}

/**
 * Kiểm cặp ảnh so sánh. Chỉ nhận ảnh của đúng vết; id lạ, của vết khác hoặc trống thì bỏ và dùng mặc định
 * (ảnh cũ nhất làm "Trước", mới nhất làm "Sau", như B08 trước đây), kèm lý do để màn báo cho người dùng.
 */
export type PairIssue = 'truoc-khong-hop-le' | 'sau-khong-hop-le' | 'cung-mot-anh' | 'thieu-ngay' | 'thieu-so-do';
export function resolvePair<T extends Img>(images: T[], woundId: string, truoc: string | undefined, sau: string | undefined): { A: T | null; B: T | null; issues: PairIssue[] } {
  const same = images.filter((i) => i.woundId === woundId).sort((a, b) => a.captureDate.localeCompare(b.captureDate) || a.id.localeCompare(b.id));
  const issues: PairIssue[] = [];
  if (same.length === 0) return { A: null, B: null, issues };
  const find = (id: string | undefined) => (id ? same.find((i) => i.id === id) ?? null : null);
  let A = find(truoc);
  let B = find(sau);
  if (truoc && !A) issues.push('truoc-khong-hop-le');
  if (sau && !B) issues.push('sau-khong-hop-le');
  A = A ?? same[0];
  B = B ?? same[same.length - 1];
  if (A.id === B.id) issues.push('cung-mot-anh');
  if (A.capture?.sourceDateKnown === false || B.capture?.sourceDateKnown === false) issues.push('thieu-ngay');
  if (A.areaCm2 === null || B.areaCm2 === null) issues.push('thieu-so-do');
  return { A, B, issues };
}

/** Danh sách id chọn để so sánh (tham số "chon" dạng "IMG1,IMG2"): chỉ giữ id của đúng vết, không trùng, tối đa 2, giữ thứ tự chọn. */
export function parseSelection(raw: string | undefined, images: Img[], woundId: string): string[] {
  if (!raw) return [];
  const ok = new Set(images.filter((i) => i.woundId === woundId).map((i) => i.id));
  return [...new Set(raw.split(',').map((x) => x.trim()).filter((x) => ok.has(x)))].slice(0, 2);
}

/** Chọn hoặc bỏ chọn một ảnh; đã đủ 2 thì ảnh mới thay ảnh chọn sớm nhất. */
export function toggleSelection(sel: string[], id: string): string[] {
  if (sel.includes(id)) return sel.filter((x) => x !== id);
  return [...sel, id].slice(-2);
}

/** Thứ tự "Trước"/"Sau" cho hai ảnh đã chọn: ảnh chụp sớm hơn là "Trước" (cùng ngày thì theo mã ảnh). Không đủ 2 thì null. */
export function orderPair<T extends Img>(sel: string[], images: T[]): [T, T] | null {
  const pair = sel.map((id) => images.find((i) => i.id === id)).filter((x): x is T => !!x);
  if (pair.length !== 2) return null;
  pair.sort((a, b) => a.captureDate.localeCompare(b.captureDate) || a.id.localeCompare(b.id));
  return [pair[0], pair[1]];
}
