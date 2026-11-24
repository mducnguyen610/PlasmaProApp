// Chạy: node src/lib/patientIdentity.test.ts
// Giai đoạn B (CN1 H1, H3, H5, H8; XN-11): ngày sinh, trùng hồ sơ, tìm theo mã, phân trang, nhật ký sửa.
import assert from 'node:assert/strict';
import {
  birthLabel, birthShort, findDuplicates, foldVi, isoToVn, matchesCode, matchesNameOrCode, paginate, parseBirthDate, patientEditEntries, patientFormDirty, validateNewPatient, validatePatientEdit,
} from './patientIdentity.ts';

const TODAY = '2026-11-23';
const P = (x: object) => ({ id: 'p-1', code: 'BN001', name: 'Nguyễn Văn A', birthYear: 1958, birthDate: '1958-03-12', sex: 'Nam', phone: '0912345678', doctorId: 'u-bs1', researchConsent: true, createdAt: '2026-10-01', ...x }) as never;
const p1 = P({});
const legacy = P({ id: 'p-2', code: 'BN002', name: 'Phạm Thị B', birthYear: 1965, birthDate: undefined, phone: '09xx xxx 002' });
const p3 = P({ id: 'p-3', code: 'BN003', name: 'Trần Văn M', birthDate: '1972-01-01', birthYear: 1972, phone: '0987654321' });
const all = [p1, legacy, p3];

// parseBirthDate
assert.equal(parseBirthDate('12/03/1958', TODAY).value, '1958-03-12');
assert.ok(parseBirthDate('', TODAY).error);
assert.ok(parseBirthDate('1958', TODAY).error, 'chỉ năm');
assert.ok(parseBirthDate('31/02/1990', TODAY).error, 'ngày không có thật');
assert.ok(parseBirthDate('29/02/2023', TODAY).error, 'không nhuận');
assert.equal(parseBirthDate('29/02/2024', TODAY).value, '2024-02-29', 'năm nhuận');
assert.ok(parseBirthDate('01/01/1899', TODAY).error);
assert.ok(parseBirthDate('24/11/2026', TODAY).error, 'sau hôm nay');
assert.equal(parseBirthDate('23/11/2026', TODAY).value, '2026-11-23');

// Nhãn ngày sinh: hồ sơ cũ nêu rõ chưa đủ, không tự đặt ngày
assert.equal(birthLabel(p1), '12/03/1958');
assert.equal(birthLabel(legacy), 'Chưa đủ ngày sinh (năm 1965)');
assert.equal(birthShort(legacy), '1965, chưa đủ ngày sinh');
assert.equal(isoToVn('1958-03-12'), '12/03/1958');
assert.equal(isoToVn(undefined), '');

// Trùng: cả 3 trường thì chặn; chỉ số điện thoại thì cảnh báo
const ex = findDuplicates(all, { name: '  nguyễn  văn a ', birthDate: '1958-03-12', phone: '0912 345 678' });
assert.equal(ex.exact?.id, 'p-1', 'không phân biệt hoa thường, khoảng trắng');
assert.deepEqual(ex.phoneOnly, []);
const ph = findDuplicates(all, { name: 'Nguyễn Văn C', birthDate: '1958-03-12', phone: '0912345678' });
assert.equal(ph.exact, undefined);
assert.deepEqual(ph.phoneOnly.map((x: { id: string }) => x.id), ['p-1']);
assert.equal(findDuplicates(all, { name: 'Nguyễn Văn A', birthDate: '1958-03-13', phone: '0912345678' }).exact, undefined, 'khác ngày sinh');
assert.equal(findDuplicates(all, { name: 'Nguyễn Văn Á', birthDate: '1958-03-12', phone: '0912345678' }).exact, undefined, 'giữ dấu tiếng Việt');
// Hồ sơ cũ chỉ có năm sinh không bao giờ trùng đủ 3 trường
assert.equal(findDuplicates(all, { name: 'Phạm Thị B', birthDate: '1965-01-01', phone: '09xx xxx 002' }).exact, undefined);
assert.equal(findDuplicates(all, { name: 'Phạm Thị B', birthDate: '1965-01-01', phone: '09xx xxx 002' }).phoneOnly.length, 1);
assert.equal(findDuplicates(all, { name: 'Nguyễn Văn A', birthDate: '1958-03-12', phone: '0912345678' }, 'p-1').exact, undefined, 'bỏ qua chính hồ sơ đang sửa');

// validateNewPatient
const nv = (name: string, bd: string, phone: string) => validateNewPatient({ name, birthDate: bd, phone }, all, TODAY);
assert.deepEqual(nv('Lê Văn D', '01/02/1980', '0901234567').value, { name: 'Lê Văn D', birthDate: '1980-02-01', birthYear: 1980, phone: '0901234567' });
assert.deepEqual(Object.keys(nv('', '', '').errors).sort(), ['birthDate', 'name', 'phone'], 'họ tên, ngày sinh, số điện thoại bắt buộc');
assert.ok(nv('A', '01/02/1980', '12345').errors.phone, 'sai định dạng số');
assert.equal(nv('Nguyễn Văn A', '12/03/1958', '0912345678').exact?.id, 'p-1');
assert.equal(nv('Nguyễn Văn A', '12/03/1958', '0912345678').value, undefined, 'trùng 3 trường thì không có giá trị để tạo');
const warn = nv('Nguyễn Văn Z', '12/03/1958', '0912345678');
assert.ok(warn.value, 'chỉ trùng số vẫn tạo được');
assert.ok(warn.warnings.phone?.includes('BN001'));

// validatePatientEdit: hồ sơ cũ phải bổ sung ngày sinh đầy đủ
const ed = (cur: never, name: string, bd: string, phone: string) => validatePatientEdit({ name, birthDate: bd, phone }, cur, all, TODAY);
assert.ok(ed(legacy, 'Phạm Thị B', '', '09xx xxx 002').errors.birthDate?.includes('bổ sung'));
assert.deepEqual(ed(legacy, 'Phạm Thị B', '05/06/1965', '09xx xxx 002').value, { name: 'Phạm Thị B', birthDate: '1965-06-05', birthYear: 1965, phone: '09xx xxx 002' }, 'số đã che không đổi thì không kiểm định dạng');
assert.ok(ed(p3, 'Trần Văn M', '01/01/1972', '').errors.phone, 'không bỏ trống số');
assert.ok(ed(p3, 'Trần Văn M', '01/01/1972', '12345').errors.phone);
assert.ok(ed(p3, 'Nguyễn Văn A', '12/03/1958', '0912345678').errors.name?.includes('BN001'), 'sửa thành trùng 3 trường: chặn');
const ew = ed(p3, 'Trần Văn M', '01/01/1972', '0912345678');
assert.ok(ew.value && ew.warnings.phone?.includes('BN001'), 'đổi sang số trùng: cảnh báo, vẫn lưu được');
assert.equal(ed(p1, 'Nguyễn Văn A', '12/03/1958', '0912345678').warnings.phone, undefined, 'không đổi số thì không cảnh báo');
assert.equal(patientFormDirty({ name: 'Nguyễn Văn A', birthDate: '12/03/1958', phone: '0912 345 678' }, p1), false);
assert.equal(patientFormDirty({ name: 'Nguyễn Văn A', birthDate: '13/03/1958', phone: '0912345678' }, p1), true);

// Tìm chỉ theo mã, một phần mã, không theo họ tên
assert.equal(matchesCode(p1, 'bn00'), true);
assert.equal(matchesCode(p1, '001'), true);
assert.equal(matchesCode(p1, ' bn 001 '), true);
assert.equal(matchesCode(p1, 'Nguyễn'), false, 'không tìm theo họ tên');
assert.equal(matchesCode(p1, ''), true);
// Logic chốt 25/11 (M6, thay H5): tìm theo một phần tên, không phân biệt dấu và hoa thường, hoặc một phần mã
assert.equal(foldVi('  Nguyễn  Văn Đức '), 'nguyen van duc');
assert.equal(matchesNameOrCode(p1, 'nguyen van'), true, 'bỏ dấu');
assert.equal(matchesNameOrCode(p1, 'VĂN A'), true, 'hoa thường, có dấu');
assert.equal(matchesNameOrCode(p1, 'bn001'), true, 'theo mã');
assert.equal(matchesNameOrCode(p1, 'Trần'), false);
assert.equal(matchesNameOrCode(p1, ''), true);

// Phân trang 20 mỗi trang
const many = Array.from({ length: 45 }, (_, i) => i);
assert.deepEqual(paginate(many, 1).items, many.slice(0, 20));
assert.deepEqual(paginate(many, 3).items, many.slice(40));
assert.equal(paginate(many, 3).pages, 3);
assert.equal(paginate(many, 9).page, 3, 'trang quá số trang kéo về trang cuối');
assert.equal(paginate([], 1).pages, 1);

// Nhật ký sửa: cũ, mới, người sửa, thời điểm; chỉ trường đổi
const after = { ...(p1 as object), name: 'Nguyễn Văn An', phone: '0912345679' } as never;
const log = patientEditEntries(p1, after, 'u-bs1', '2026-11-23T10:00:00Z', (i) => `pe-${i}`);
assert.deepEqual(log.map((x) => [x.field, x.from, x.to]), [['Họ tên', 'Nguyễn Văn A', 'Nguyễn Văn An'], ['Số điện thoại', '0912345678', '0912345679']]);
assert.equal(log[0].by, 'u-bs1');
assert.equal(log[0].at, '2026-11-23T10:00:00Z');
assert.deepEqual(patientEditEntries(legacy, { ...(legacy as object), birthDate: '1965-06-05' } as never, 'u', 't', String).map((x) => [x.from, x.to]), [['—', '05/06/1965']]);
assert.deepEqual(patientEditEntries(p1, p1, 'u', 't', String), []);

console.log('patientIdentity.test: đạt');
