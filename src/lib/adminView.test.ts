// Chạy: node src/lib/adminView.test.ts
import assert from 'node:assert/strict';
import { accountDisplayName, accountStatus, filterAccounts, groupErrorsByDay, ROLE_PERMISSIONS } from './adminView.ts';

const data = {
  patients: [{ id: 'p-1', code: 'BN001' }, { id: 'p-2', code: 'BN002' }],
  accounts: [
    { id: 'u-1', role: 'doctor', name: 'Nguyễn Đức An', username: 'bacsi', locked: false },
    { id: 'u-2', role: 'doctor', name: 'Lê Bình', username: 'bacsi2', locked: true },
    { id: 'u-3', role: 'patient', name: 'Trần Văn C', username: 'benhnhan', patientId: 'p-1', locked: false },
    { id: 'u-4', role: 'doctor', name: 'Phạm Dũng', username: 'moi', locked: true, pendingApproval: true },
    { id: 'u-5', role: 'admin', name: 'Quản trị kỹ thuật', username: 'quantri', locked: false },
  ],
} as never;
const A = (data as { accounts: never[] }).accounts;

// Trạng thái: chờ duyệt ưu tiên hơn đã khóa (như Q01 cũ).
assert.equal(accountStatus(A[3]), 'pending');
assert.equal(accountStatus(A[1]), 'locked');
assert.equal(accountStatus(A[0]), 'active');
// Bệnh nhân hiện mã hồ sơ, không hiện họ tên.
assert.equal(accountDisplayName(data, A[2]), 'BN001');
assert.equal(accountDisplayName(data, A[0]), 'Nguyễn Đức An');
// Tìm không dấu, theo tên đăng nhập, có @; tìm họ tên bệnh nhân không ra (chỉ mã hồ sơ).
const ids = (l: { id: string }[]) => l.map((a) => a.id).join(',');
assert.equal(ids(filterAccounts(data, 'duc an', 'all', 'all')), 'u-1');
assert.equal(ids(filterAccounts(data, '@BACSI2', 'all', 'all')), 'u-2');
assert.equal(ids(filterAccounts(data, 'bn001', 'all', 'all')), 'u-3');
assert.equal(ids(filterAccounts(data, 'Trần Văn', 'all', 'all')), '');
// Lọc trạng thái, vai trò; rỗng thì giữ đủ và đúng thứ tự.
assert.equal(ids(filterAccounts(data, '', 'all', 'all')), 'u-1,u-2,u-3,u-4,u-5');
assert.equal(ids(filterAccounts(data, '', 'locked', 'all')), 'u-2');
assert.equal(ids(filterAccounts(data, '', 'pending', 'doctor')), 'u-4');
assert.equal(ids(filterAccounts(data, '', 'active', 'doctor')), 'u-1');
assert.equal(ids(filterAccounts(data, '  ', 'all', 'admin')), 'u-5');

// Nhật ký: mới nhất trước, nhóm theo ngày giờ Việt Nam; 17:30Z ngày 13 là 00:30 ngày 14 ở VN.
const errs = [
  { id: 'e1', at: '2026-11-12T03:00:00Z', message: 'a', resolved: true },
  { id: 'e2', at: '2026-11-13T17:30:00Z', message: 'b', resolved: false },
  { id: 'e3', at: '2026-11-14T02:00:00Z', message: 'c', resolved: false },
  { id: 'e4', at: '2026-11-13T09:00:00Z', message: 'd', resolved: true },
];
const g = groupErrorsByDay(errs, 'all');
assert.deepEqual(g.map((x) => [x.day, x.items.map((e) => e.id).join(',')]), [['2026-11-14', 'e3,e2'], ['2026-11-13', 'e4'], ['2026-11-12', 'e1']]);
assert.equal(g.reduce((n, x) => n + x.items.length, 0), errs.length);
assert.deepEqual(groupErrorsByDay(errs, 'open').flatMap((x) => x.items.map((e) => e.id)), ['e3', 'e2']);
assert.deepEqual(groupErrorsByDay(errs, 'resolved').flatMap((x) => x.items.map((e) => e.id)), ['e4', 'e1']);
assert.deepEqual(groupErrorsByDay([], 'all'), []);
// Không đổi mảng gốc.
assert.equal(errs[0].id, 'e1');
// Mọi vai trò có mô tả quyền.
for (const r of ['doctor', 'patient', 'admin'] as const) assert.ok(ROLE_PERMISSIONS[r].length > 0);
console.log('adminView: đạt');
