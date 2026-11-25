// Hàm thuần cho việc bác sĩ quản lý hồ sơ bệnh nhân và vết thương sau khi tạo: sửa thông tin hành chính, lưu trữ hồ sơ, sửa vị trí vết thương.
// Không đổi quyền, không đổi quy trình lâm sàng. Viết không phụ thuộc React để chạy được bằng node khi kiểm thử.
import type { Device, Patient, Wound } from './types';


/** Trường bác sĩ phụ trách được sửa trên hồ sơ. doctorId (phân công) chỉ quản trị đổi ở Q01, các trường định danh không ai sửa. */
export const DOCTOR_EDITABLE_PATIENT_FIELDS = ['name', 'birthYear', 'birthDate', 'phone'] as const;
// Giai đoạn B (CN2 N10, C1): researchConsent, consentDate do bệnh nhân tự chọn, bác sĩ không sửa.
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

// Giai đoạn B (CN1): kiểm biểu mẫu sửa hồ sơ chuyển sang patientIdentity.ts (ngày sinh đầy đủ, quy tắc trùng 3 trường).

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
