// Chạy: node src/lib/measurementSource.test.ts
import assert from 'node:assert/strict';
import { daysBetween, measurementSource } from './measurementSource.ts';

const h = (by: string, at: string, toArea: number | null) => ({ by, at, toArea });
// Chưa đo: không có nguồn.
assert.equal(measurementSource({ areaCm2: null, history: [h('u1', '2026-11-01T08:00:00Z', 5)] }), null);
// Lấy lần sửa gần nhất có số trùng số hiện tại.
assert.deepEqual(measurementSource({ areaCm2: 5, measureMethod: ' Thước ', history: [h('u1', '2026-11-01T08:00:00Z', 5), h('u2', '2026-11-02T08:00:00Z', 6), h('u3', '2026-11-03T08:00:00Z', 5)] }), { by: 'u3', at: '2026-11-03T08:00:00Z', method: 'Thước' });
// Người xác nhận trong manualReference được ưu tiên khi số trùng.
assert.deepEqual(measurementSource({ areaCm2: 5, history: [h('u1', '2026-11-01T08:00:00Z', 5)], capture: { manualReference: { areaCm2: 5, confirmedBy: 'u9', confirmedAt: '2026-11-04T08:00:00Z' } } }), { by: 'u9', at: '2026-11-04T08:00:00Z', method: null });
// manualReference khác số hiện tại thì bỏ qua.
assert.equal(measurementSource({ areaCm2: 5, history: [], capture: { manualReference: { areaCm2: 4, confirmedBy: 'u9', confirmedAt: null } } }), null);
assert.equal(daysBetween('2026-10-21', '2026-11-11'), 21);
assert.equal(daysBetween('2026-11-11', '2026-10-21'), 21);
console.log('measurementSource: ok');
