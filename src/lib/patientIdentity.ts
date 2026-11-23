/**
 * Giai đoạn B, CN1 (H1, H3, H5, H8; XN-11): định danh hồ sơ bệnh nhân. Hàm thuần, chạy được bằng node để kiểm thử.
 *
 * - Ngày sinh đầy đủ (birthDate, yyyy-mm-dd). Hồ sơ cũ chỉ có năm sinh: hiện "Chưa đủ ngày sinh", không tự đặt ngày.
 * - Trùng cả họ tên, ngày sinh, số điện thoại: chặn và mở hồ sơ có sẵn. Chỉ trùng số điện thoại: cảnh báo, vẫn cho tạo.
 * - Tìm kiếm chỉ theo mã bệnh nhân, cho phép một phần mã, 20 hồ sơ mỗi trang.
 */
import type { Patient } from './types.ts';

export const PAGE_SIZE = 20;

export const normalizePhone = (s: string) => s.replace(/\s/g, '');
/** So họ tên không phân biệt hoa thường, khoảng trắng thừa, dạng Unicode tổ hợp. Giữ dấu tiếng Việt (Hà khác Hạ). */
export const normalizeName = (s: string) => s.normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('vi');

/** Đọc ngày dd/mm/yyyy thành yyyy-mm-dd. Ngày không có thật, trước 1900 hoặc sau hôm nay thì trả lỗi. */
export function parseBirthDate(text: string, today: string): { value?: string; error?: string } {
  const t = text.trim();
  if (!t) return { error: 'Nhập ngày sinh.' };
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return { error: 'Ngày sinh theo dạng dd/mm/yyyy.' };
  const [d, mo, y] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) return { error: 'Ngày sinh không có thật.' };
  const iso = `${m[3]}-${m[2]}-${m[1]}`;
  if (y < 1900) return { error: 'Năm sinh từ 1900.' };
  if (iso > today) return { error: 'Ngày sinh không được sau hôm nay.' };
  return { value: iso };
}

/** yyyy-mm-dd thành dd/mm/yyyy (ô nhập). */
export const isoToVn = (iso: string | undefined) => (iso && /^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');

/** Nhãn ngày sinh. Hồ sơ cũ chỉ có năm: nêu rõ chưa đủ, kèm năm đã ghi. */
export function birthLabel(p: Pick<Patient, 'birthDate' | 'birthYear'>): string {
  if (p.birthDate) return isoToVn(p.birthDate);
  return p.birthYear ? `Chưa đủ ngày sinh (năm ${p.birthYear})` : 'Chưa đủ ngày sinh';
}

export interface IdentityInput { name: string; birthDate: string; phone: string }

/**
 * exact: hồ sơ trùng cả ba trường (chặn tạo, mở hồ sơ có sẵn). phoneOnly: hồ sơ chỉ trùng số điện thoại (cảnh báo).
 * Hồ sơ cũ chưa có ngày sinh đầy đủ không bao giờ là trùng cả ba trường; trùng số thì vào phoneOnly. Không tự gộp hồ sơ.
 */
export function findDuplicates(patients: Patient[], input: IdentityInput, exceptId?: string): { exact?: Patient; phoneOnly: Patient[] } {
  const phone = normalizePhone(input.phone);
  const name = normalizeName(input.name);
  const others = patients.filter((p) => p.id !== exceptId);
  const exact = phone && name && input.birthDate
    ? others.find((p) => normalizePhone(p.phone) === phone && normalizeName(p.name) === name && p.birthDate === input.birthDate)
    : undefined;
  const phoneOnly = phone ? others.filter((p) => p !== exact && normalizePhone(p.phone) === phone) : [];
  return { exact, phoneOnly };
}

/** Mã bệnh nhân dạng so khớp: bỏ khoảng trắng, chữ hoa. */
const codeKey = (s: string) => s.replace(/\s/g, '').toUpperCase();

/** Tìm theo mã (một phần mã, không phân biệt hoa thường). Ô trống thì không lọc. Không tìm theo họ tên. */
export function matchesCode(p: Pick<Patient, 'code'>, query: string): boolean {
  const q = codeKey(query);
  return !q || codeKey(p.code).includes(q);
}

/** Một trang kết quả; trang ngoài khoảng được kéo về trang hợp lệ gần nhất. */
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE): { items: T[]; page: number; pages: number; total: number } {
  const pages = Math.max(1, Math.ceil(items.length / size));
  const p = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  return { items: items.slice((p - 1) * size, p * size), page: p, pages, total: items.length };
}

/** Một dòng nhật ký sửa hồ sơ: giá trị cũ, mới, người sửa, thời điểm. */
export interface PatientEditEntry { id: string; patientId: string; at: string; by: string; field: string; from: string; to: string }

/** Các dòng nhật ký cho một lần sửa: chỉ trường thực sự đổi. Giá trị ghi dạng chữ để đọc lại được. */
export function patientEditEntries(before: Patient, after: Patient, by: string, at: string, makeId: (i: number) => string): PatientEditEntry[] {
  const fields: { key: keyof Patient; label: string }[] = [
    { key: 'name', label: 'Họ tên' },
    { key: 'birthDate', label: 'Ngày sinh' },
    { key: 'sex', label: 'Giới tính' },
    { key: 'phone', label: 'Số điện thoại' },
    { key: 'researchConsent', label: 'Đồng ý dùng dữ liệu' },
  ];
  const text = (k: keyof Patient, v: unknown) => (v === undefined || v === null || v === '' ? '—' : k === 'birthDate' ? isoToVn(String(v)) : typeof v === 'boolean' ? (v ? 'Có' : 'Không') : String(v));
  return fields
    .filter((f) => (before[f.key] ?? '') !== (after[f.key] ?? ''))
    .map((f, i) => ({ id: makeId(i), patientId: before.id, at, by, field: f.label, from: text(f.key, before[f.key]), to: text(f.key, after[f.key]) }));
}

/** Cùng quy tắc với đăng ký tài khoản: 0 + 9 số, hoặc +84 + 9 số, bỏ khoảng trắng. */
export const PHONE_RE = /^(0[0-9]{9}|\+84[0-9]{9})$/;

export interface PatientFormInput { name: string; birthDate: string; phone: string }
export type PatientFormErrors = Partial<Record<keyof PatientFormInput, string>>;
export interface PatientFormValue { name: string; birthDate: string; birthYear: number; phone: string }

function checkName(input: string, errors: PatientFormErrors) {
  const name = input.trim().replace(/\s+/g, ' ');
  if (!name) errors.name = 'Nhập họ tên bệnh nhân.';
  else if (name.length > 100) errors.name = 'Họ tên tối đa 100 ký tự.';
  return name;
}

/**
 * Kiểm biểu mẫu tạo hồ sơ (H1, H3): họ tên, ngày sinh, số điện thoại bắt buộc; giới tính chọn sẵn ở màn.
 * exact: trùng cả ba trường, chặn tạo. warnings.phone: chỉ trùng số điện thoại, vẫn cho tạo sau khi bác sĩ xác nhận.
 */
export function validateNewPatient(input: PatientFormInput, patients: Patient[], today: string):
  { errors: PatientFormErrors; warnings: PatientFormErrors; exact?: Patient; phoneOnly: Patient[]; value?: PatientFormValue } {
  const errors: PatientFormErrors = {};
  const name = checkName(input.name, errors);
  const bd = parseBirthDate(input.birthDate, today);
  if (bd.error) errors.birthDate = bd.error;
  const phone = input.phone.trim();
  if (!phone) errors.phone = 'Nhập số điện thoại.';
  else if (!PHONE_RE.test(normalizePhone(phone))) errors.phone = 'Số điện thoại gồm 10 số bắt đầu bằng 0, hoặc +84 và 9 số.';
  if (Object.keys(errors).length) return { errors, warnings: {}, phoneOnly: [] };
  const { exact, phoneOnly } = findDuplicates(patients, { name, birthDate: bd.value!, phone });
  const warnings: PatientFormErrors = phoneOnly.length ? { phone: `Số điện thoại đã có ở hồ sơ ${phoneOnly.map((p) => p.code).join(', ')}. Kiểm tra lại trước khi tạo hồ sơ mới.` } : {};
  if (exact) return { errors: { name: `Đã có hồ sơ ${exact.code} trùng họ tên, ngày sinh và số điện thoại.` }, warnings, exact, phoneOnly };
  return { errors, warnings, phoneOnly, value: { name, birthDate: bd.value!, birthYear: Number(bd.value!.slice(0, 4)), phone } };
}

/**
 * Kiểm biểu mẫu sửa hồ sơ (H8, XN-11): họ tên, ngày sinh bắt buộc (hồ sơ cũ chỉ có năm phải bổ sung ngày đầy đủ),
 * số điện thoại không bỏ trống. Số không đổi thì không kiểm định dạng (dữ liệu mô phỏng có số đã che).
 * Trùng cả ba trường với hồ sơ khác: chặn. Chỉ trùng số: cảnh báo.
 */
export function validatePatientEdit(input: PatientFormInput, current: Patient, patients: Patient[], today: string):
  { errors: PatientFormErrors; warnings: PatientFormErrors; value?: PatientFormValue } {
  const errors: PatientFormErrors = {};
  const name = checkName(input.name, errors);
  const bd = parseBirthDate(input.birthDate, today);
  if (bd.error) errors.birthDate = current.birthDate ? bd.error : `${bd.error} Hồ sơ cũ chỉ có năm sinh, cần bổ sung ngày sinh đầy đủ.`;
  const phone = input.phone.trim();
  const changedPhone = normalizePhone(phone) !== normalizePhone(current.phone);
  if (!phone) errors.phone = 'Nhập số điện thoại.';
  else if (changedPhone && !PHONE_RE.test(normalizePhone(phone))) errors.phone = 'Số điện thoại gồm 10 số bắt đầu bằng 0, hoặc +84 và 9 số.';
  if (Object.keys(errors).length) return { errors, warnings: {} };
  const { exact, phoneOnly } = findDuplicates(patients, { name, birthDate: bd.value!, phone }, current.id);
  if (exact) return { errors: { name: `Trùng họ tên, ngày sinh và số điện thoại với hồ sơ ${exact.code}.` }, warnings: {} };
  const warnings: PatientFormErrors = changedPhone && phoneOnly.length ? { phone: `Số điện thoại đã có ở hồ sơ ${phoneOnly.map((p) => p.code).join(', ')}.` } : {};
  return { errors, warnings, value: { name, birthDate: bd.value!, birthYear: Number(bd.value!.slice(0, 4)), phone } };
}

/** Biểu mẫu sửa khác hồ sơ đang lưu. */
export function patientFormDirty(input: PatientFormInput, current: Patient) {
  return input.name.trim() !== current.name || input.birthDate.trim() !== isoToVn(current.birthDate) || normalizePhone(input.phone.trim()) !== normalizePhone(current.phone);
}

/** Ngày sinh rút gọn cho dòng định danh ("sinh ..."): ngày đầy đủ, hoặc năm kèm "chưa đủ ngày sinh" với hồ sơ cũ. */
export function birthShort(p: Pick<Patient, 'birthDate' | 'birthYear'>): string {
  return p.birthDate ? isoToVn(p.birthDate) : `${p.birthYear}, chưa đủ ngày sinh`;
}
