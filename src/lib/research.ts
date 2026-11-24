import { IMAGE_TYPE_LABEL, labelState, TRAITS } from './imageLabel';
import { buildFilename, formatAreaForName, splitForPatient } from './naming';
import type { AppData, WoundImage } from './types';

/**
 * Giai đoạn B (CN2 N9, C1, C2): xuất tập huấn luyện từ ảnh đã xác nhận nhãn.
 * Chỉ dùng mã nghiên cứu; không có họ tên, số điện thoại, năm sinh, mã hồ sơ lâm sàng, ngày chụp tuyệt đối,
 * mã bác sĩ hay mã thiết bị. Mốc thời gian quy về số ngày kể từ ngày bắt đầu theo dõi vết.
 * Tuổi chỉ ghi theo nhóm 10 năm lúc chụp, không ghi năm sinh (người dùng chốt 24/11/2026).
 */
export function researchFilename(data: AppData, im: WoundImage) {
  const p = data.patients.find(p => p.id === im.patientId);
  const w = data.wounds.find(w => w.id === im.woundId);
  if (!p?.researchCode || !w) throw new Error('Ảnh chưa đủ thông tin nghiên cứu.');
  const area = im.areaCm2 !== null && Number.isFinite(im.areaCm2) && im.areaCm2 >= 0 ? im.areaCm2 : null;
  return buildFilename(p.researchCode, w.code, im.id, area, 'png');
}

/**
 * Nhóm tuổi 10 năm lúc chụp ảnh ("40-49"); từ 90 tuổi gộp "90+" để nhóm cao tuổi ít người không lộ danh tính.
 * Có ngày sinh đầy đủ thì tính đúng tuổi, chỉ có năm sinh thì lấy năm chụp trừ năm sinh. Thiếu hoặc sai thì null.
 */
export function ageGroup(p: { birthYear?: number; birthDate?: string }, captureDate: string): string | null {
  const birth = p.birthDate && /^\d{4}-\d{2}-\d{2}/.test(p.birthDate) ? p.birthDate.slice(0, 10) : null;
  const year = birth ? Number(birth.slice(0, 4)) : p.birthYear;
  if (!year || !Number.isInteger(year) || !/^\d{4}-\d{2}-\d{2}/.test(captureDate)) return null;
  let age = Number(captureDate.slice(0, 4)) - year;
  if (birth && captureDate.slice(5, 10) < birth.slice(5, 10)) age -= 1;
  if (age < 0 || age > 130) return null;
  if (age >= 90) return '90+';
  const lo = Math.floor(age / 10) * 10;
  return `${lo}-${lo + 9}`;
}

const dayIndex = (iso: string) => Math.floor(Date.parse(iso.slice(0, 10) + 'T00:00:00Z') / 86400000);

/** Số ngày từ ngày bắt đầu theo dõi vết đến ngày chụp, và thứ tự chụp trong vết (1 là ảnh đầu). */
export function researchTimeline(data: AppData, im: WoundImage) {
  const w = data.wounds.find(w => w.id === im.woundId);
  const same = data.images.filter(i => i.woundId === im.woundId)
    .sort((a, b) => a.captureDate.localeCompare(b.captureDate) || a.id.localeCompare(b.id));
  const day = w ? dayIndex(im.captureDate) - dayIndex(w.startDate) : NaN;
  return { daysSinceStart: Number.isFinite(day) ? day : null, captureOrder: same.findIndex(i => i.id === im.id) + 1 };
}

function sessionLink(data: AppData, im: WoundImage) {
  const s = im.sessionId ? data.sessions.find(s => s.sessionId === im.sessionId) : undefined;
  return { linked: !!s, planVersion: s?.planVersion ?? null };
}

const csvCell = (v: string | number | null | undefined) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
};

export function researchCsv(data: AppData, images: WoundImage[]) {
  const head = ['image_id', 'filename', 'subject_code', 'wound_code', 'split', 'age_group', 'image_type', 'label_state', 'confidence', 'quality',
    ...TRAITS.map(t => t.key), 'area_cm2', 'days_since_start', 'capture_order', 'after_session', 'plan_version'];
  const rows = images.map(im => {
    const p = data.patients.find(p => p.id === im.patientId)!;
    const w = data.wounds.find(w => w.id === im.woundId)!;
    const t = researchTimeline(data, im);
    const s = sessionLink(data, im);
    return [im.id, researchFilename(data, im), p.researchCode!, w.code, splitForPatient(p.researchCode!), ageGroup(p, im.captureDate) ?? '', im.label?.imageType ?? '', labelState(im),
      im.label?.confidence ?? '', im.label?.quality ?? '', ...TRAITS.map(tr => im.label?.traits?.[tr.key]?.level ?? ''),
      im.areaCm2 !== null && Number.isFinite(im.areaCm2) ? formatAreaForName(im.areaCm2) : '', t.daysSinceStart, t.captureOrder, s.linked ? 1 : 0, s.planVersion];
  });
  return [head, ...rows].map(row => row.map(csvCell).join(',')).join('\n') + '\n';
}

/** Ảnh hiển thị ở kho kỹ thuật: bản nghiên cứu đã bỏ metadata nếu có, nếu không thì ảnh demo. */
export function researchPhoto(im: WoundImage): WoundImage {
  return { ...im, uri: im.researchUri === 'demo' ? null : im.researchUri ?? (im.uri && im.source !== 'demo' ? im.uri : null) };
}

/**
 * labels.json: viền bác sĩ chốt, mức 5 tính chất, ghi chú lâm sàng không xuất (là văn bản tự do, có thể chứa định danh).
 * Dự đoán AI gốc giữ nguyên để so sánh: viền, khung, bộ dò, diện tích ước lượng.
 */
export function researchLabels(data: AppData, images: WoundImage[]) {
  return images.map(im => {
    const p = data.patients.find(p => p.id === im.patientId)!;
    const w = data.wounds.find(w => w.id === im.woundId)!;
    const t = researchTimeline(data, im);
    const s = sessionLink(data, im);
    const l = im.label ?? {};
    return {
      image_id: im.id,
      filename: researchFilename(data, im),
      subject_code: p.researchCode,
      wound_code: w.code,
      split: splitForPatient(p.researchCode!),
      age_group: ageGroup(p, im.captureDate),
      image_type: l.imageType ?? null,
      image_type_label: l.imageType ? IMAGE_TYPE_LABEL[l.imageType] : null,
      outline: (l.outline ?? []).map(pt => [...pt]),
      outline_source: l.outlineSource ?? null,
      traits: Object.fromEntries(TRAITS.map(tr => [tr.key, l.traits?.[tr.key]?.level ?? null])),
      confidence: l.confidence ?? null,
      quality: l.quality ?? null,
      area_reference_cm2: im.areaCm2,
      ai: im.capture?.wound ? {
        detector: im.capture.wound.detector,
        box: { ...im.capture.wound.box },
        hull: im.capture.wound.hull.map(pt => [...pt]),
        area_fraction: im.capture.wound.areaFraction,
        automatic_area_cm2: im.capture.automaticMeasurement?.areaCm2 ?? null,
      } : null,
      timeline: { days_since_start: t.daysSinceStart, capture_order: t.captureOrder },
      session: { after_session: s.linked, plan_version: s.planVersion },
    };
  });
}

/** Explicit allowlist: never export device IDs, timestamps, clinician IDs or free-text fields. */
export function researchCaptureMetadata(images: WoundImage[]) {
  return images.map(im => ({
    image_id: im.id,
    area_reference_cm2: im.areaCm2,
    area_reference_source: im.source === 'demo' ? 'synthetic_demo' : 'clinician_manual',
    automatic_area_cm2: im.capture?.automaticMeasurement?.areaCm2 ?? null,
    automatic_area_status: im.capture?.automaticMeasurement?.status ?? 'unavailable',
    capture: im.capture ? {
      source: im.capture.imageSource,
      width: im.capture.width,
      height: im.capture.height,
      roi: { ...im.capture.roi },
      roi_coordinates: im.capture.roiCoordinates,
      quality_profile: im.capture.quality.profileId,
      quality_profile_validated: im.capture.quality.profileValidated,
      lighting: im.capture.quality.lighting,
      sharpness: im.capture.quality.sharpness,
      metrics: im.capture.quality.metrics ? { ...im.capture.quality.metrics } : null,
      reviewed_framing: im.capture.visualReview.framing,
      reviewed_lighting: im.capture.visualReview.lighting,
      reviewed_sharpness: im.capture.visualReview.sharpness,
      wound_detection: im.capture.wound ? { detector: im.capture.wound.detector, box: { ...im.capture.wound.box }, hull: im.capture.wound.hull.map(pt => [...pt]), area_fraction: im.capture.wound.areaFraction } : null,
      // Hình học AR của đúng frame đã chụp; không có ID phiên, thời điểm hay thông tin thiết bị.
      ar: im.capture.ar ? {
        framework: im.capture.ar.framework,
        intrinsics: { ...im.capture.ar.intrinsics },
        image_rotation_deg: im.capture.ar.imageRotationDeg,
        center_distance_m: im.capture.distance.valueM,
        center_distance_source: im.capture.distance.source,
        camera_forward: im.capture.ar.cameraForward ?? null,
        plane_normal: im.capture.ar.centerHit?.planeNormal ?? null,
        depth_available: !!im.capture.ar.depth,
      } : null,
    } : null,
  }));
}
