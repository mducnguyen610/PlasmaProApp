// Chạy: node src/lib/patientRecord.test.ts
import assert from 'node:assert/strict';
import { canManagePatient } from './access.ts';
import { archiveBlocker, isArchived, splitDoctorPatientPatch, validateWoundLocation } from './patientRecord.ts';

const P = (x: object) => ({ id: 'p-1', code: 'BN001', name: 'Nguyễn Văn A', birthYear: 1958, sex: 'Nam', phone: '09xx xxx 001', doctorId: 'u-bs1', researchConsent: true, createdAt: '2026-10-01', ...x }) as never;
const p1 = P({});
const p2 = P({ id: 'p-2', code: 'BN002', phone: '0912345678' });
// Giai đoạn B (CN1): kiểm biểu mẫu sửa hồ sơ chuyển sang patientIdentity.ts (ngày sinh đầy đủ, trùng 3 trường); kiểm thử ở patientIdentity.test.ts.

// Bác sĩ chỉ được sửa họ tên, năm sinh, số điện thoại, đồng ý nghiên cứu; doctorId và các trường định danh bị từ chối.
// Giai đoạn B (CN2 N10, C1): bác sĩ không còn sửa đồng ý dùng dữ liệu thay bệnh nhân.
assert.deepEqual(splitDoctorPatientPatch({ name: 'X', researchConsent: false, consentDate: undefined }).forbidden, ['researchConsent', 'consentDate']);
assert.deepEqual(splitDoctorPatientPatch({ doctorId: 'u-bs2' }).forbidden, ['doctorId']);
assert.deepEqual(splitDoctorPatientPatch({ name: 'X', id: 'p-9', code: 'BN009', archivedAt: 'x', deviceId: 'd-1' } as never).forbidden.sort(), ['archivedAt', 'code', 'deviceId', 'id']);

// Quyền: bác sĩ phụ trách; bác sĩ khác, quản trị, bệnh nhân, tài khoản khóa đều không.
const doc = (id: string, x: object = {}) => ({ id, role: 'doctor', locked: false, ...x }) as never;
assert.equal(canManagePatient(doc('u-bs1'), p1), true);
assert.equal(canManagePatient(doc('u-bs2'), p1), false);
assert.equal(canManagePatient(doc('u-bs1', { locked: true }), p1), false);
assert.equal(canManagePatient({ id: 'u-qt', role: 'admin', locked: false } as never, p1), false);
assert.equal(canManagePatient({ id: 'u-bn1', role: 'patient', locked: false, patientId: 'p-1' } as never, p1), false);

// Lưu trữ: chặn khi bệnh nhân còn giữ máy; đã lưu trữ thì không lưu trữ lại.
const devs = [{ id: 'd-1', code: 'TB-001', patientId: 'p-1' }] as never;
assert.ok(archiveBlocker(P({ deviceId: 'd-1' }), devs)?.includes('TB-001'));
assert.ok(archiveBlocker(p1, devs)?.includes('TB-001'), 'máy trỏ vào hồ sơ dù hồ sơ thiếu deviceId');
assert.equal(archiveBlocker(p2, devs), null);
assert.ok(archiveBlocker(P({ id: 'p-2', archivedAt: '2026-11-15T00:00:00Z' }), []));
assert.equal(isArchived(P({ archivedAt: '2026-11-15T00:00:00Z' })), true);
assert.equal(isArchived(p1), false);

// Vị trí vết thương: văn bản tự do, bắt buộc, khác vị trí đang lưu.
const w = { id: 'w-1', patientId: 'p-1', code: 'VT01', location: 'Gót chân phải', startDate: '2026-10-01', status: 'active' } as never;
assert.equal(validateWoundLocation('  Gót   chân trái ', w).value, 'Gót chân trái');
assert.ok(validateWoundLocation('   ', w).error);
assert.ok(validateWoundLocation('Gót chân phải', w).error);
assert.ok(validateWoundLocation('x'.repeat(101), w).error);

console.log('patientRecord.test: đạt');
