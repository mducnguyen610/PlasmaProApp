// Chạy: node src/lib/measurementSource.test.ts
import assert from 'node:assert/strict';
import { daysBetween, measurementSource, neighbourImages, previousMeasuredImage } from './measurementSource.ts';
import { previousArea } from './plausibility.ts';

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
// previousMeasuredImage trùng previousArea (số và ngày) trên nhiều tổ hợp.
const I = (id: string, woundId: string, captureDate: string, areaCm2: number | null, status = 'labeled') => ({ id, woundId, captureDate, areaCm2, status });
const imgs = [I('A', 'w1', '2026-10-01', 10), I('B', 'w1', '2026-10-10', 9), I('C', 'w2', '2026-10-12', 3), I('D', 'w1', '2026-10-15', null, 'unlabeled'), I('E', 'w1', '2026-10-20', 8, 'excluded'), I('F', 'w1', '2026-10-25', 7)];
for (const cur of imgs) {
  const a = previousArea(imgs, cur); const m = previousMeasuredImage(imgs, cur);
  assert.deepEqual(m ? { areaCm2: m.areaCm2, captureDate: m.captureDate } : null, a, cur.id);
  if (m) assert.equal(m.woundId, cur.woundId);
}
assert.equal(previousMeasuredImage(imgs, imgs[3])?.id, 'B');
// Ảnh liền trước, liền sau chỉ trong cùng vết.
assert.deepEqual(Object.values(neighbourImages(imgs, imgs[1])).map((x) => x?.id), ['A', 'D']);
assert.deepEqual(Object.values(neighbourImages(imgs, imgs[2])).map((x) => x?.id), [undefined, undefined]);
assert.deepEqual(Object.values(neighbourImages(imgs, imgs[5])).map((x) => x?.id), ['E', undefined]);
console.log('measurementSource: ok');
