// Chạy: node src/lib/woundSummary.test.ts
import assert from 'node:assert/strict';
import { chartPoints, woundSummary } from './woundSummary.ts';

const I = (id: string, woundId: string, captureDate: string, areaCm2: number | null, status = areaCm2 === null ? 'unlabeled' : 'labeled', known = true) =>
  ({ id, woundId, captureDate, areaCm2, status, capture: { sourceDateKnown: known } });
const imgs = [
  I('IMG0001', 'w1', '2026-10-01', 12.5), I('IMG0002', 'w1', '2026-10-08', 10.2), I('IMG0007', 'w1', '2026-10-08', 10.0),
  I('IMG0003', 'w1', '2026-10-15', 8.4), I('IMG0004', 'w1', '2026-10-29', null), I('IMG0005', 'w2', '2026-10-20', 3),
  I('IMG0008', 'w1', '2026-10-10', 9, 'labeled', false),
];
// Mỗi ngày một điểm, mã nhỏ nhất; bỏ ảnh chưa rõ ngày; chỉ ảnh đã gán nhãn.
assert.deepEqual(chartPoints(imgs.filter((i) => i.woundId === 'w1')).map((i) => i.id), ['IMG0001', 'IMG0002', 'IMG0003']);
const ev = [{ woundId: 'w1', date: '2026-10-15' }, { woundId: 'w1', date: '2026-10-20' }, { woundId: 'w2', date: '2026-10-30' }];
const s = woundSummary(imgs, ev, 'w1');
assert.equal(s.latest?.id, 'IMG0003');
assert.equal(s.previous?.id, 'IMG0002', 'lần trước trùng điểm áp chót của biểu đồ');
assert.deepEqual(s.newerUnmeasured.map((i) => i.id), ['IMG0004']);
assert.equal(s.lastEval?.date, '2026-10-20');
// Vết khác không lẫn.
const s2 = woundSummary(imgs, ev, 'w2');
assert.equal(s2.latest?.id, 'IMG0005'); assert.equal(s2.previous, null); assert.deepEqual(s2.newerUnmeasured, []); assert.equal(s2.lastEval?.date, '2026-10-30');
// Chưa có số đo: mọi ảnh chưa đo đều là "chưa đo".
const s3 = woundSummary([I('A', 'w3', '2026-10-01', null), I('B', 'w3', '2026-10-05', null)], [], 'w3');
assert.equal(s3.latest, null); assert.deepEqual(s3.newerUnmeasured.map((i) => i.id), ['B', 'A']); assert.equal(s3.lastEval, null);
// Ảnh chưa đo cũ hơn số đo mới nhất không tính là "mới hơn".
const s4 = woundSummary([I('A', 'w4', '2026-10-01', null), I('B', 'w4', '2026-10-05', 4)], [], 'w4');
assert.deepEqual(s4.newerUnmeasured, []);
console.log('woundSummary: ok');
