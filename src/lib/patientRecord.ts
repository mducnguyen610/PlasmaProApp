// Hàm thuần cho việc bác sĩ quản lý hồ sơ bệnh nhân và vết thương sau khi tạo: sửa thông tin hành chính, lưu trữ hồ sơ, sửa vị trí vết thương.
// Không đổi quyền, không đổi quy trình lâm sàng. Viết không phụ thuộc React để chạy được bằng node khi kiểm thử.
import type { Device, Patient, Wound } from './types';

/** Cùng quy tắc với đăng ký tài khoản (store.register): 0 + 9 số, hoặc +84 + 9 số, bỏ khoảng trắng. */
export const PHONE_RE = /^(0[0-9]{9}|\+84[0-9]{9})$/;
export const normalizePhone = (s: string) => s.replace(/\s/g, '');

/** Trường bác sĩ phụ trách được sửa trên hồ sơ. doctorId (phân công) chỉ quản trị đổi ở Q01, các trường định danh không ai sửa. */
export const DOCTOR_EDITABLE_PATIENT_FIELDS = ['name', 'birthYear', 'phone', 'researchConsent', 'consentDate'] as const;
type DoctorField = (typeof DOCTOR_EDITABLE_PATIENT_FIELDS)[number];

/** Tách phần bác sĩ được sửa và danh sách trường bị từ chối (ví dụ doctorId, id, code, archivedAt). */
export function splitDoctorPatientPatch(patch: Partial<Patient>): { allowed: Partial<Pick<Patient, DoctorField>>; forbidden: string[] } {
  const allowed: Partial<Pick<Patient, DoctorField>> = {};
  const forbidden: string[] = [];
  for (const key of Object.keys(patch) as (keyof Patient)[]) {
    if ((DOCTOR_EDITABLE_PATIENT_FIELDS as readonly string[]).includes(key)) (allowed as Record<string, unknown>)[key] = patch[key];
    else forbidden.push(key);
  }
  return { allowed, forbidden };
}

export interface PatientEditInput { name: string; birthYear: string; phone: string }
export type PatientEditErrors = Partial<Record<keyof PatientEditInput, string>>;

/**
 * Kiểm tra biểu mẫu "Chỉnh sửa hồ sơ". Quy tắc lấy từ màn thêm bệnh nhân (B03) và đăng ký:
 * họ tên bắt buộc; năm sinh là số nguyên 1900 đến năm hiện tại; số điện thoại được để trống như B03,
 * nếu nhập thì đúng định dạng của màn đăng ký và không trùng hồ sơ khác (như addPatient).
 * Số điện thoại không đổi thì không kiểm định dạng, vì dữ liệu mô phỏng có số đã che (09xx xxx 001).
 */
export function validatePatientEdit(input: PatientEditInput, current: Patient, others: Patient[], year = new Date().getFullYear()):
  { errors: PatientEditErrors; value?: { name: string; birthYear: number; phone: string } } {
  const errors: PatientEditErrors = {};
  const name = input.name.trim().replace(/\s+/g, ' ');
  if (!name) errors.name = 'Nhập họ tên bệnh nhân.';
  else if (name.length > 100) errors.name = 'Họ tên tối đa 100 ký tự.';
  const yText = input.birthYear.trim();
  const y = Number(yText);
  if (!yText) errors.birthYear = 'Nhập năm sinh.';
  else if (!/^\d{4}$/.test(yText) || !Number.isInteger(y) || y < 1900 || y > year) errors.birthYear = `Năm sinh là số có 4 chữ số, từ 1900 đến ${year}.`;
  const phone = input.phone.trim();
  const changedPhone = normalizePhone(phone) !== normalizePhone(current.phone);
  if (changedPhone && phone) {
    if (!PHONE_RE.test(normalizePhone(phone))) errors.phone = 'Số điện thoại gồm 10 số bắt đầu bằng 0, hoặc +84 và 9 số.';
    else {
      const dup = others.find((x) => x.id !== current.id && normalizePhone(x.phone) === normalizePhone(phone));
      if (dup) errors.phone = `Số điện thoại đã có ở hồ sơ ${dup.code}.`;
    }
  }
  if (Object.keys(errors).length) return { errors };
  return { errors, value: { name, birthYear: y, phone } };
}

/** Biểu mẫu có thay đổi so với hồ sơ đang lưu (để bật nút Lưu và hỏi trước khi rời màn). */
export function patientEditDirty(input: PatientEditInput, current: Patient) {
  return input.name.trim() !== current.name || input.birthYear.trim() !== String(current.birthYear) || normalizePhone(input.phone.trim()) !== normalizePhone(current.phone);
}

/** Vị trí vết thương là văn bản tự do như khi thêm vết (addWound); chỉ bắt buộc có nội dung và khác vị trí đang lưu. */
export function validateWoundLocation(input: string, current: Wound): { error?: string; value?: string } {
  const value = input.trim().replace(/\s+/g, ' ');
  if (!value) return { error: 'Nhập vị trí vết thương.' };
  if (value.length > 100) return { error: 'Vị trí tối đa 100 ký tự.' };
  if (value === current.location) return { error: 'Vị trí mới trùng vị trí đang lưu.' };
  return { value };
}

export const isArchived = (p: Pick<Patient, 'archivedAt'> | undefined) => !!p?.archivedAt;

/**
 * Lý do chưa lưu trữ được hồ sơ. Máy đang giao thì phải thu hồi trước (quy trình thu hồi hiện có),
 * để bệnh nhân không còn điều trị tại nhà trên một hồ sơ đã lưu trữ.
 */
export function archiveBlocker(patient: Patient, devices: Device[]): string | null {
  if (patient.archivedAt) return 'Hồ sơ đã được lưu trữ.';
  const dev = devices.find((d) => d.patientId === patient.id || d.id === patient.deviceId);
  if (dev) return `Bệnh nhân đang giữ máy ${dev.code}. Thu hồi máy trước khi lưu trữ hồ sơ.`;
  return null;
}
