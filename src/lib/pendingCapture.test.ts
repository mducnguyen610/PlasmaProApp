// Chạy: node src/lib/pendingCapture.test.ts
// Luồng "Chụp cho bệnh nhân mới": so trùng hồ sơ theo đúng quy tắc của addPatient, kiểm biểu mẫu, khóa chống ghi lặp, đếm bộ lọc B09.
import assert from 'node:assert/strict';
import { activeFilterCount, committedImageOf, duplicateView, EMPTY_PENDING_FORM, findPhoneDuplicate, isPendingCapture, validateNewPatientForm } from './pendingCapture.ts';

const P = (x: object) => ({ id: 'p-1', code: 'BN001', name: 'Nguyễn Văn A', birthYear: 1958, sex: 'Nam', phone: '09xx xxx 001', doctorId: 'u-bs1', researchConsent: true, createdAt: '2026-10-01', ...x }) as never;
const all = [P({}), P({ id: 'p-9', code: 'BN009', name: 'Người Khác', phone: '0933 444 555', doctorId: 'u-bs2' }), P({ id: 'p-8', code: 'BN008', phone: '', doctorId: 'u-bs1' })];

// So trùng: chỉ theo số điện thoại sau khi bỏ khoảng trắng (như addPatient); số trống không bao giờ trùng; họ tên trùng không tính.
assert.equal(findPhoneDuplicate(all, '09xx xxx 001')?.id, 'p-1');
assert.equal(findPhoneDuplicate(all, '09xxxxx001')?.id, 'p-1');
assert.equal(findPhoneDuplicate(all, ' 0933444555 ')?.id, 'p-9');
assert.equal(findPhoneDuplicate(all, ''), undefined);
assert.equal(findPhoneDuplicate(all, '   '), undefined);
assert.equal(findPhoneDuplicate([P({ phone: '0911' })], '0912'), undefined);

// Hiện thông tin hồ sơ trùng theo quyền xem: hồ sơ của mình có họ tên, năm sinh; của bác sĩ khác chỉ mã hồ sơ.
assert.deepEqual(duplicateView(all[0], 'u-bs1'), { code: 'BN001', name: 'Nguyễn Văn A', birthYear: 1958, own: true, archived: false });
const other = duplicateView(all[1], 'u-bs1');
assert.deepEqual(other, { code: 'BN009', own: false, archived: false });
assert.equal('name' in other, false);
assert.equal(duplicateView(P({ archivedAt: '2026-11-01' }), 'u-bs1').archived, true);

// Biểu mẫu: họ tên, năm sinh như B03 (cùng câu báo); vị trí vết bắt buộc (ảnh phải thuộc một vết), không tự điền.
const f = (x: object) => ({ ...EMPTY_PENDING_FORM, ...x });
let r = validateNewPatientForm(f({}), 2026);
assert.deepEqual(r.errors, { name: 'Nhập họ tên bệnh nhân.', birthYear: 'Năm sinh không hợp lệ.', woundLocation: 'Nhập vị trí vết thương trong ảnh. Ảnh sẽ thuộc vết thương này.' });
assert.equal(r.value, undefined);
r = validateNewPatientForm(f({ name: ' Lê  Văn B ', birthYear: '1970', woundLocation: '  Mu   bàn chân ', phone: ' 0912 ' }), 2026);
assert.deepEqual(r.value, { name: 'Lê  Văn B', birthYear: 1970, phone: '0912', woundLocation: 'Mu bàn chân' });
assert.ok(validateNewPatientForm(f({ name: 'A', birthYear: '1899', woundLocation: 'x' }), 2026).errors.birthYear);
assert.ok(validateNewPatientForm(f({ name: 'A', birthYear: '2027', woundLocation: 'x' }), 2026).errors.birthYear);
assert.ok(validateNewPatientForm(f({ name: 'A', birthYear: '1970.5', woundLocation: 'x' }), 2026).errors.birthYear);
assert.ok(validateNewPatientForm(f({ name: 'A', birthYear: '1970', woundLocation: 'x'.repeat(101) }), 2026).errors.woundLocation);
// Số điện thoại không kiểm định dạng (như B03): không thêm quy tắc định danh mới.
assert.ok(validateNewPatientForm(f({ name: 'A', birthYear: '1970', woundLocation: 'x', phone: 'abc' }), 2026).value);

// Khóa chống ghi lặp: captureId của ảnh chờ đã có trong dữ liệu thì nhận ra.
const cap = { capture: { captureId: 'CAP-1' } } as never;
assert.equal(committedImageOf({ images: [{ id: 'IMG1', capture: { captureId: 'CAP-1' } }] } as never, cap)?.id, 'IMG1');
assert.equal(committedImageOf({ images: [{ id: 'IMG1', capture: { captureId: 'CAP-2' } }, { id: 'IMG0' }] } as never, cap), undefined);

// Ảnh chờ đọc từ bộ nhớ máy: thiếu trường thì bỏ qua.
const good = { id: 'CHO-1', doctorId: 'u-bs1', uri: 'data:x', captureDate: '2026-11-16', capture: { captureId: 'CAP-1' }, form: EMPTY_PENDING_FORM };
assert.equal(isPendingCapture(good), true);
assert.equal(isPendingCapture(null), false);
assert.equal(isPendingCapture({ ...good, uri: '' }), false);
assert.equal(isPendingCapture({ ...good, capture: {} }), false);
assert.equal(isPendingCapture({ ...good, form: undefined }), false);

// Bộ lọc B09: chỉ có ô tìm kiếm.
assert.equal(activeFilterCount({ q: '' }), 0);
assert.equal(activeFilterCount({ q: '   ' }), 0);
assert.equal(activeFilterCount({ q: 'pham' }), 1);

console.log('pendingCapture.test: đạt');
