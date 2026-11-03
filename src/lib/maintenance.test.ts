// Chạy: node src/lib/maintenance.test.ts
import assert from 'node:assert/strict';
import { CARE_ITEMS, careStatus } from './maintenance.ts';
import type { DeviceSession } from './types.ts';

const s = (start: string, status: DeviceSession['status'] = 'completed'): DeviceSession => ({ sessionId: start, deviceId: 'd', start, durationMin: 15, energyWh: null, status, source: 'device' });
const clean = { ...CARE_ITEMS[0], everySessions: 4 };
const list = [s('2026-10-01T07:00:00Z'), s('2026-10-02T07:00:00Z'), s('2026-10-03T07:00:00Z', 'interrupted'), s('2026-10-04T07:00:00Z')];
// Chưa làm lần nào: đếm mọi phiên hoàn tất, bỏ phiên bị ngắt
assert.deepEqual([careStatus(clean, list, null).used, careStatus(clean, list, null).remaining], [3, 1]);
assert.equal(careStatus(clean, list, null).due, false); // còn 1 phiên, chưa đến hạn
// Mục thật: vệ sinh sau mỗi phiên
assert.equal(CARE_ITEMS[0].everySessions, 1);
assert.equal(careStatus(CARE_ITEMS[0], list, '2026-10-03T12:00:00Z').due, true); // đã có 1 phiên sau lần vệ sinh
assert.equal(careStatus(CARE_ITEMS[0], list, '2026-10-04T12:00:00Z').due, false);
// Đã làm sau phiên 02/10: chỉ còn 1 phiên tính
const after = careStatus(clean, list, '2026-10-02T12:00:00Z');
assert.deepEqual([after.used, after.remaining, after.due], [1, 3, false]);
// Quá hạn: còn số âm, vẫn là đến hạn
assert.equal(careStatus({ ...clean, everySessions: 2 }, list, null).remaining, -1);
console.log('maintenance: ok');
