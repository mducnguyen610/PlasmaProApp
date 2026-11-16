// Luồng "Chụp cho bệnh nhân mới" (bác sĩ): ảnh chụp trước, tạo hồ sơ sau.
// Ảnh vừa chụp nằm ở trạng thái chờ (PendingCapture), ngoài AppData: chưa là WoundImage, chưa có image_id, không thuộc vết hay hồ sơ nào.
// Chỉ khi store ghi một lần duy nhất cả hồ sơ, tài khoản, vết thương và ảnh (commitPendingCapture) thì ảnh mới có quan hệ.
// Hàm thuần, không phụ thuộc React, để chạy bằng node khi kiểm thử.
import type { CaptureMetadata } from './capture/types.ts';
import type { AppData, Patient, WoundImage } from './types.ts';

/** Như normalizePhone (patientRecord.ts) và addPatient trước đây: bỏ khoảng trắng. Viết lại tại chỗ để tệp chạy được bằng node khi kiểm thử. */
const normalizePhone = (s: string) => s.replace(/\s/g, '');

/** Thông tin bác sĩ đang nhập ở biểu mẫu tạo hồ sơ, giữ cùng ảnh chờ để quay lại hoặc mở lại ứng dụng không mất. */
export interface PendingPatientForm {
  name: string;
  birthYear: string;
  sex: Patient['sex'];
  phone: string;
  woundLocation: string;
  consent: boolean;
}

export const EMPTY_PENDING_FORM: PendingPatientForm = { name: '', birthYear: '', sex: 'Nam', phone: '', woundLocation: '', consent: false };

/** Ảnh chờ gắn hồ sơ. Không phải bản ghi lâm sàng; không có image_id, patient_id, wound_id. */
export interface PendingCapture {
  /** Mã bản chờ, dùng đặt tên tệp tạm. */
  id: string;
  /** Bác sĩ đã chụp. Bản chờ chỉ hiện và chỉ dùng được với đúng tài khoản này. */
  doctorId: string;
  /** Thời điểm đưa ảnh vào trạng thái chờ. */
  heldAt: string;
  /** Tệp tạm (bản sao trong thư mục ứng dụng trên máy; data URL trên web). */
  uri: string;
  ext: WoundImage['ext'];
  width: number;
  height: number;
  /** Ngày chụp như luồng chụp cho hồ sơ có sẵn (localDay của lúc bấm chụp, hoặc ngày EXIF của ảnh thư viện). */
  captureDate: string;
  sourceDateKnown: boolean;
  /** Siêu dữ liệu chụp dựng đúng như B10 dựng khi lưu (capturedAt, chất lượng, khoanh vùng, AR). */
  capture: CaptureMetadata;
  /** Số đo bác sĩ nhập ở bước 3 (văn bản như ô nhập) và phương pháp; trống nếu chưa đo. */
  areaText: string;
  method: string;
  form: PendingPatientForm;
  /** false: chỉ giữ trong phiên đang mở (ghi bộ nhớ máy lỗi); đóng ứng dụng sẽ mất. */
  durable: boolean;
}

/**
 * Hồ sơ trùng theo đúng quy tắc của addPatient (B03): cùng số điện thoại sau khi bỏ khoảng trắng.
 * Không thêm quy tắc định danh mới (họ tên, năm sinh không dùng để so).
 */
export function findPhoneDuplicate(patients: Patient[], phone: string): Patient | undefined {
  const p = normalizePhone(phone);
  return p ? patients.find((x) => normalizePhone(x.phone) === p) : undefined;
}

/** Phần thông tin hồ sơ trùng được hiện cho bác sĩ, theo quyền xem hiện có: hồ sơ của chính bác sĩ thì có họ tên, còn lại chỉ mã hồ sơ. */
export function duplicateView(dup: Patient, doctorId: string): { code: string; name?: string; birthYear?: number; own: boolean; archived: boolean } {
  const own = dup.doctorId === doctorId;
  return own ? { code: dup.code, name: dup.name, birthYear: dup.birthYear, own, archived: !!dup.archivedAt } : { code: dup.code, own, archived: !!dup.archivedAt };
}

export type NewPatientErrors = Partial<Record<'name' | 'birthYear' | 'woundLocation', string>>;

/**
 * Kiểm biểu mẫu tạo hồ sơ từ ảnh. Họ tên và năm sinh: cùng điều kiện và câu báo với màn Thêm bệnh nhân (B03, patients/new.tsx).
 * Vị trí vết thương: ở B03 không bắt buộc; ở luồng này bắt buộc vì ảnh phải thuộc một vết thương, và ứng dụng không tự đặt vị trí.
 * Số điện thoại: như B03, không kiểm định dạng; chỉ kiểm trùng (findPhoneDuplicate).
 */
export function validateNewPatientForm(f: PendingPatientForm, year = new Date().getFullYear()): { errors: NewPatientErrors; value?: { name: string; birthYear: number; phone: string; woundLocation: string } } {
  const errors: NewPatientErrors = {};
  const y = Number(f.birthYear);
  if (!f.name.trim()) errors.name = 'Nhập họ tên bệnh nhân.';
  if (!Number.isInteger(y) || y < 1900 || y > year) errors.birthYear = 'Năm sinh không hợp lệ.';
  const loc = f.woundLocation.trim().replace(/\s+/g, ' ');
  if (!loc) errors.woundLocation = 'Nhập vị trí vết thương trong ảnh. Ảnh sẽ thuộc vết thương này.';
  else if (loc.length > 100) errors.woundLocation = 'Vị trí tối đa 100 ký tự.';
  if (Object.keys(errors).length) return { errors };
  return { errors, value: { name: f.name.trim(), birthYear: y, phone: f.phone.trim(), woundLocation: loc } };
}

/**
 * Ảnh chờ đã được ghi thành ảnh trong dữ liệu chưa (khóa chống ghi lặp: captureId sinh một lần cho mỗi lần chụp).
 * Dùng khi mở lại ứng dụng mà bản chờ còn sót (ví dụ ghi xong dữ liệu nhưng chưa kịp xóa bản chờ): không cho tạo lần hai.
 */
export function committedImageOf(d: Pick<AppData, 'images'>, pending: Pick<PendingCapture, 'capture'>): WoundImage | undefined {
  return d.images.find((im) => im.capture?.captureId === pending.capture.captureId);
}

/**
 * Ảnh của lần chụp này đã nằm trong dữ liệu và liên kết đúng chưa: ảnh có captureId này, vết của ảnh tồn tại và thuộc đúng hồ sơ của ảnh,
 * hồ sơ tồn tại; nếu có `expect` thì patient_id, wound_id phải đúng như mong đợi. Chỉ khi hàm này trả ảnh thì mới được xóa ảnh chờ.
 */
export function verifyLinked(d: Pick<AppData, 'images' | 'wounds' | 'patients'>, captureId: string, expect?: { patientId: string; woundId: string }): WoundImage | null {
  const im = d.images.find((x) => x.capture?.captureId === captureId);
  if (!im) return null;
  const w = d.wounds.find((x) => x.id === im.woundId);
  if (!w || w.patientId !== im.patientId || !d.patients.some((x) => x.id === im.patientId)) return null;
  if (expect && (im.patientId !== expect.patientId || im.woundId !== expect.woundId)) return null;
  return im;
}

/** Bản chờ đọc từ bộ nhớ máy có đủ trường dùng được không (dữ liệu cũ hoặc hỏng thì bỏ qua, không làm hỏng màn). */
export function isPendingCapture(x: unknown): x is PendingCapture {
  const p = x as PendingCapture | null;
  return !!p && typeof p.id === 'string' && typeof p.doctorId === 'string' && typeof p.uri === 'string' && !!p.uri
    && typeof p.captureDate === 'string' && !!p.capture && typeof p.capture.captureId === 'string' && !!p.form && typeof p.form.name === 'string';
}

/** Số bộ lọc đang áp dụng ở B09 (hiện chỉ có ô tìm kiếm). */
export function activeFilterCount(f: { q: string }): number {
  return f.q.trim() ? 1 : 0;
}
