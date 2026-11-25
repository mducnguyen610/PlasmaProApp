/**
 * Giai đoạn B, CN2: nhãn theo từng ảnh để huấn luyện lại mô-đun nhận diện (học có người trong vòng lặp).
 * Hàm thuần, không phụ thuộc React, chạy được bằng node để kiểm thử.
 *
 * Bốn lớp dữ liệu (N5): ảnh gốc (WoundImage.uri, không sửa), dự đoán AI (capture.wound, không sửa), nhãn bác sĩ đang gán
 * (label, chưa xác nhận), nhãn đã xác nhận (label.confirmedAt). Sửa nhãn đã xác nhận đưa nhãn về Đang gán và ghi lịch sử.
 */
import type { Patient, WoundImage } from './types.ts';

/** L1: loại ảnh. "data_collection" không gắn phiên, không tính cho phác đồ. */
export type ImageType = 'baseline' | 'follow_up' | 'post_session' | 'data_collection';
export const IMAGE_TYPES: { value: ImageType; label: string }[] = [
  { value: 'baseline', label: 'Ảnh ban đầu' },
  { value: 'follow_up', label: 'Ảnh theo dõi trong điều trị' },
  { value: 'post_session', label: 'Ảnh sau điều trị' },
  { value: 'data_collection', label: 'Ảnh thu thập dữ liệu' },
];
export const IMAGE_TYPE_LABEL = Object.fromEntries(IMAGE_TYPES.map((x) => [x.value, x.label])) as Record<ImageType, string>;

/** G1: 5 tính chất. G2 (XN-15): thang Không có, Thấp, Trung bình, Cao; mỗi tính chất có ghi chú. */
export type TraitKey = 'granulation' | 'necrosis' | 'exudate' | 'periwound' | 'infection';
export const TRAITS: { key: TraitKey; label: string }[] = [
  { key: 'granulation', label: 'Mô hạt' },
  { key: 'necrosis', label: 'Mô hoại tử' },
  { key: 'exudate', label: 'Dịch tiết' },
  { key: 'periwound', label: 'Da quanh vết' },
  { key: 'infection', label: 'Dấu hiệu nhiễm khuẩn' },
];
export type TraitLevel = 'none' | 'low' | 'medium' | 'high';
export const TRAIT_LEVELS: { value: TraitLevel; label: string }[] = [
  { value: 'none', label: 'Không có' },
  { value: 'low', label: 'Thấp' },
  { value: 'medium', label: 'Trung bình' },
  { value: 'high', label: 'Cao' },
];
export const TRAIT_LEVEL_LABEL = Object.fromEntries(TRAIT_LEVELS.map((x) => [x.value, x.label])) as Record<TraitLevel, string>;

/** K2: lý do ảnh Không đạt. */
export const QUALITY_REASONS = ['Mờ', 'Thiếu sáng', 'Lệch khung', 'Thiếu thước'] as const;

export type Point = [number, number];

export interface ImageLabel {
  imageType?: ImageType;
  /** Viền vết bác sĩ chốt, tọa độ chuẩn hóa 0..1 trên ảnh đã lưu. Viền AI gốc giữ riêng ở capture.wound.hull. */
  outline?: Point[];
  /** Nguồn viền: lấy nguyên viền AI, viền AI đã chỉnh, hoặc bác sĩ khoanh từ viền mặc định. */
  outlineSource?: 'ai' | 'ai_edited' | 'manual';
  traits?: Partial<Record<TraitKey, { level?: TraitLevel; note?: string }>>;
  note?: string;
  /** K4: mức tin cậy. */
  confidence?: 'certain' | 'uncertain';
  /** K2: chất lượng ảnh. */
  quality?: 'pass' | 'fail';
  qualityReason?: string;
  /** K1: bác sĩ bấm Xác nhận nhãn. */
  confirmedAt?: string;
  confirmedBy?: string;
  updatedAt?: string;
  updatedBy?: string;
}

/** Một lần thay đổi nhãn (N6). */
export interface LabelEvent { at: string; by: string; action: 'save' | 'confirm' | 'unconfirm'; detail: string }

/** S1: trạng thái ảnh trong kho. */
export type LabelState = 'unlabeled' | 'draft' | 'complete' | 'confirmed' | 'rejected';
export const LABEL_STATE: Record<LabelState, { label: string; tone: 'gray' | 'amber' | 'blue' | 'green' | 'red' }> = {
  unlabeled: { label: 'Chưa gán nhãn', tone: 'gray' },
  draft: { label: 'Đang gán', tone: 'amber' },
  complete: { label: 'Đủ nhãn', tone: 'blue' },
  confirmed: { label: 'Đã xác nhận', tone: 'green' },
  rejected: { label: 'Loại', tone: 'red' },
};

type Img = Pick<WoundImage, 'status'> & { label?: ImageLabel };

/** A5: ảnh "Không sử dụng" (giữ ảnh, không tính cho phác đồ, biểu đồ, kho). Dùng lại trạng thái excluded và lý do excludeReason có sẵn. */
export const isUnused = (im: Img) => im.status === 'excluded';

/** K3: đủ nhãn khi có loại ảnh, viền đã chốt (ít nhất 3 điểm) và đủ 5 tính chất. */
export function missingLabelParts(label: ImageLabel | undefined): string[] {
  const out: string[] = [];
  if (!label?.imageType) out.push('loại ảnh');
  if (!label?.outline || label.outline.length < 3) out.push('vùng vết');
  const missingTraits = TRAITS.filter((t) => !label?.traits?.[t.key]?.level);
  if (missingTraits.length) out.push(missingTraits.map((t) => t.label.toLowerCase()).join(', '));
  return out;
}
export const isLabelComplete = (label: ImageLabel | undefined) => missingLabelParts(label).length === 0;

/** Điều kiện bấm "Xác nhận nhãn" (K1): đủ nhãn theo K3, đã chọn mức tin cậy (K4) và chất lượng Đạt (K2). */
export function missingForConfirm(label: ImageLabel | undefined): string[] {
  const out = missingLabelParts(label);
  if (!label?.confidence) out.push('mức tin cậy');
  if (!label?.quality) out.push('chất lượng ảnh');
  else if (label.quality === 'fail') out.push('chất lượng Đạt (ảnh Không đạt không xác nhận vào kho)');
  return out;
}

function hasAnyLabel(l: ImageLabel | undefined): boolean {
  return !!l && !!(l.imageType || l.outline?.length || l.note || l.confidence || l.quality || Object.values(l.traits ?? {}).some((t) => t?.level || t?.note));
}

/** S1. Không đạt chất lượng hoặc không sử dụng thì Loại; còn lại theo mức gán. */
export function labelState(im: Img): LabelState {
  if (isUnused(im) || im.label?.quality === 'fail') return 'rejected';
  if (im.label?.confirmedAt) return 'confirmed';
  if (isLabelComplete(im.label)) return 'complete';
  return hasAnyLabel(im.label) ? 'draft' : 'unlabeled';
}

/** T1: lọc "Chưa gán đủ nhãn". */
export const needsLabel = (im: Img) => ['unlabeled', 'draft'].includes(labelState(im));

/**
 * N9, C1, C2: ảnh vào tập huấn luyện khi nhãn đã xác nhận, chất lượng Đạt, không bị đánh dấu không sử dụng, và bệnh nhân
 * đang đồng ý cho dùng dữ liệu (kiểm tại thời điểm dựng tập, nên ảnh chụp trước khi đồng ý chỉ vào sau khi đồng ý).
 */
export function trainingEligible(im: Img & Pick<WoundImage, 'patientId'>, patient: Pick<Patient, 'id' | 'researchConsent'> | undefined): boolean {
  return !!patient && patient.id === im.patientId && !!patient.researchConsent && labelState(im) === 'confirmed' && im.label?.quality === 'pass';
}

/**
 * Áp một lần lưu nhãn. Nhãn đã xác nhận mà nội dung đổi thì bỏ xác nhận (về Đang gán) và ghi lịch sử "unconfirm".
 * Trả nhãn mới và các dòng lịch sử phát sinh. Không đổi ảnh gốc, không đổi dự đoán AI.
 */
export function applyLabelPatch(prev: ImageLabel | undefined, patch: Omit<ImageLabel, 'confirmedAt' | 'confirmedBy' | 'updatedAt' | 'updatedBy'>, by: string, at: string): { label: ImageLabel; events: LabelEvent[] } {
  const base = prev ?? {};
  const merged: ImageLabel = { ...base, ...patch, traits: { ...base.traits, ...patch.traits } };
  if (merged.quality !== 'fail') delete merged.qualityReason;
  const changed = labelDiff(base, merged);
  if (!changed.length) return { label: base, events: [] };
  const events: LabelEvent[] = [{ at, by, action: 'save', detail: changed.join('; ') }];
  const label: ImageLabel = { ...merged, updatedAt: at, updatedBy: by };
  if (base.confirmedAt) {
    delete label.confirmedAt;
    delete label.confirmedBy;
    events.push({ at, by, action: 'unconfirm', detail: 'Nhãn đã sửa sau khi xác nhận, cần xác nhận lại.' });
  }
  return { label, events };
}

/** Mô tả các trường nhãn khác nhau, để ghi lịch sử. */
export function labelDiff(a: ImageLabel, b: ImageLabel): string[] {
  const out: string[] = [];
  const v = (x: unknown) => (x === undefined || x === null || x === '' ? '—' : String(x));
  if (a.imageType !== b.imageType) out.push(`Loại ảnh: ${a.imageType ? IMAGE_TYPE_LABEL[a.imageType] : '—'} → ${b.imageType ? IMAGE_TYPE_LABEL[b.imageType] : '—'}`);
  if (JSON.stringify(a.outline ?? null) !== JSON.stringify(b.outline ?? null)) out.push(`Vùng vết: ${a.outline?.length ?? 0} → ${b.outline?.length ?? 0} điểm (${b.outlineSource === 'ai' ? 'viền AI' : b.outlineSource === 'ai_edited' ? 'viền AI đã chỉnh' : 'khoanh tay'})`);
  for (const t of TRAITS) {
    const x = a.traits?.[t.key], y = b.traits?.[t.key];
    if (x?.level !== y?.level) out.push(`${t.label}: ${x?.level ? TRAIT_LEVEL_LABEL[x.level] : '—'} → ${y?.level ? TRAIT_LEVEL_LABEL[y.level] : '—'}`);
    if ((x?.note ?? '') !== (y?.note ?? '')) out.push(`Ghi chú ${t.label.toLowerCase()}: ${v(x?.note)} → ${v(y?.note)}`);
  }
  if ((a.note ?? '') !== (b.note ?? '')) out.push(`Ghi chú: ${v(a.note)} → ${v(b.note)}`);
  if (a.confidence !== b.confidence) out.push(`Tin cậy: ${a.confidence === 'certain' ? 'Chắc chắn' : a.confidence === 'uncertain' ? 'Không chắc' : '—'} → ${b.confidence === 'certain' ? 'Chắc chắn' : b.confidence === 'uncertain' ? 'Không chắc' : '—'}`);
  if (a.quality !== b.quality || (a.qualityReason ?? '') !== (b.qualityReason ?? '')) out.push(`Chất lượng: ${a.quality === 'pass' ? 'Đạt' : a.quality === 'fail' ? `Không đạt (${v(a.qualityReason)})` : '—'} → ${b.quality === 'pass' ? 'Đạt' : b.quality === 'fail' ? `Không đạt (${v(b.qualityReason)})` : '—'}`);
  return out;
}

/** Rút gọn viền AI còn tối đa n điểm cách đều theo thứ tự (để kéo điểm được). Viền ít điểm hơn giữ nguyên. */
export function simplifyOutline(hull: Point[], n = 12): Point[] {
  if (hull.length <= n) return hull.map(([x, y]) => [x, y]);
  return Array.from({ length: n }, (_, i) => hull[Math.floor((i * hull.length) / n)]).map(([x, y]) => [x, y]);
}

/** Viền mặc định khi không có AI: hình tám cạnh giữa ảnh, để bác sĩ kéo các điểm vào đúng bờ vết. */
export function defaultOutline(n = 8, cx = 0.5, cy = 0.5, r = 0.2): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const a = (2 * Math.PI * i) / n;
    return [round4(cx + r * Math.cos(a)), round4(cy + r * Math.sin(a))];
  });
}

const round4 = (x: number) => Math.round(x * 10000) / 10000;
export const clamp01 = (x: number) => round4(Math.min(1, Math.max(0, x)));

/** Diện tích đa giác theo tỉ lệ ảnh (0..1), công thức dây giày. Chỉ để hiển thị tỉ lệ; không đổi ra cm². */
export function outlineAreaFraction(pts: Point[]): number {
  if (pts.length < 3) return 0;
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}

/** Loại ảnh gợi ý khi bác sĩ chưa chọn: ảnh đầu tiên của vết là Ảnh ban đầu; ảnh bệnh nhân gắn phiên là Ảnh sau điều trị. */
export function suggestImageType(im: Pick<WoundImage, 'id' | 'woundId' | 'captureDate' | 'source'> & { sessionId?: string }, sameWound: Pick<WoundImage, 'id' | 'captureDate'>[]): ImageType {
  if (im.sessionId || im.source === 'patient') return 'post_session';
  const first = [...sameWound].sort((a, b) => a.captureDate.localeCompare(b.captureDate) || a.id.localeCompare(b.id))[0];
  return first?.id === im.id ? 'baseline' : 'follow_up';
}

/**
 * S3, N9: tập huấn luyện suy ra tự động (không còn bước bác sĩ bấm chia sẻ từng ảnh). Chỉ quản trị viên được xuất (S3);
 * tài khoản quản trị phải được cấp quyền dữ liệu nghiên cứu như trước. Vai trò khác nhận danh sách rỗng.
 * Kiểm tra phía ứng dụng, không thay phân quyền máy chủ.
 */
export function trainingImages(
  data: { images: (WoundImage & { label?: ImageLabel })[]; patients: Pick<Patient, 'id' | 'researchConsent'>[] },
  actor: { role: string; locked: boolean; pendingApproval?: boolean; researchAccess?: boolean } | null | undefined,
): WoundImage[] {
  if (!actor || actor.locked || actor.pendingApproval || actor.role !== 'admin' || !actor.researchAccess) return [];
  return data.images.filter((im) => trainingEligible(im, data.patients.find((p) => p.id === im.patientId)));
}
