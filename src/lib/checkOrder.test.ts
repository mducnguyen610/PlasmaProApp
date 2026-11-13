// Chạy: node src/lib/checkOrder.test.ts
import assert from 'node:assert/strict';
import { orderChecks } from './checkOrder.ts';

const c = (key: string, ok: boolean | null) => ({ key, ok });
const src = [c('wound', true), c('light', false), c('distance', null), c('steady', false), c('tilt', true)];
const copy = JSON.stringify(src);
assert.deepEqual(orderChecks(src).map((x) => x.key), ['light', 'steady', 'distance', 'wound', 'tilt']);
assert.equal(JSON.stringify(src), copy, 'không đổi mảng gốc');
// Mọi tổ hợp 3 mục: chưa đạt luôn đứng trước, cùng nhóm giữ thứ tự gốc, đủ phần tử.
const vals = [true, false, null] as const;
for (const a of vals) for (const b of vals) for (const d of vals) {
  const xs = [c('a', a), c('b', b), c('d', d)];
  const out = orderChecks(xs);
  assert.equal(out.length, 3);
  const rank = (v: boolean | null) => (v === false ? 0 : v === null ? 1 : 2);
  for (let i = 1; i < 3; i++) {
    assert.ok(rank(out[i - 1].ok) <= rank(out[i].ok));
    if (rank(out[i - 1].ok) === rank(out[i].ok)) assert.ok(xs.indexOf(out[i - 1]) < xs.indexOf(out[i]));
  }
}
console.log('checkOrder: ok');
