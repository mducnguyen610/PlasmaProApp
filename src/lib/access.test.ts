// Chạy: node src/lib/access.test.ts
// Stage 9B (S8-B05): chính sách phân quyền của addReport, setReportHandled, resolveSyncError ở lớp kho dữ liệu trên máy.
import assert from 'node:assert/strict';
import { canAddReport, canHandleReport, canResolveSyncError } from './access.ts';

const A = (x: object) => ({ id: 'u', username: 'u', name: 'U', locked: false, ...x }) as never;
const bs1 = A({ id: 'u-bs1', role: 'doctor' });
const bs2 = A({ id: 'u-bs2', role: 'doctor' });
const bsLocked = A({ id: 'u-bs1', role: 'doctor', locked: true });
const bn1 = A({ id: 'u-bn1', role: 'patient', patientId: 'p-1' });
const bn2 = A({ id: 'u-bn2', role: 'patient', patientId: 'p-2' });
const bnLocked = A({ id: 'u-bn1', role: 'patient', patientId: 'p-1', locked: true });
const admin = A({ id: 'u-qt', role: 'admin' });
const adminLocked = A({ id: 'u-qt', role: 'admin', locked: true });
const p1 = { id: 'p-1', doctorId: 'u-bs1' } as never;
const p1Archived = { id: 'p-1', doctorId: 'u-bs1', archivedAt: '2026-11-01' } as never;

// addReport: chỉ bệnh nhân, chỉ cho hồ sơ của mình.
assert.equal(canAddReport(bn1, 'p-1'), true);
assert.equal(canAddReport(bn2, 'p-1'), false, 'bệnh nhân khác');
assert.equal(canAddReport(bnLocked, 'p-1'), false, 'tài khoản bị khóa');
assert.equal(canAddReport(bs1, 'p-1'), false, 'bác sĩ không gửi thay');
assert.equal(canAddReport(admin, 'p-1'), false);
assert.equal(canAddReport(null, 'p-1'), false, 'chưa đăng nhập');

// setReportHandled: chỉ bác sĩ phụ trách; hồ sơ đã lưu trữ vẫn được (giữ hành vi B04).
assert.equal(canHandleReport(bs1, p1), true);
assert.equal(canHandleReport(bs1, p1Archived), true);
assert.equal(canHandleReport(bs2, p1), false, 'bác sĩ không phụ trách');
assert.equal(canHandleReport(bsLocked, p1), false);
assert.equal(canHandleReport(bn1, p1), false, 'bệnh nhân không tự đánh dấu');
assert.equal(canHandleReport(admin, p1), false, 'quản trị không xử lý báo cáo lâm sàng');
assert.equal(canHandleReport(bs1, undefined), false, 'không có hồ sơ');

// resolveSyncError: chỉ quản trị viên chưa khóa (cùng điều kiện requireAdmin).
assert.equal(canResolveSyncError(admin), true);
assert.equal(canResolveSyncError(adminLocked), false);
assert.equal(canResolveSyncError(bs1), false);
assert.equal(canResolveSyncError(bn1), false);
assert.equal(canResolveSyncError(null), false);

console.log('access.test: đạt');
