// Chạy: node src/lib/sessionDisplay.test.ts
import assert from 'node:assert/strict';
import { sessionDisplay } from './sessionDisplay.ts';

const at = '2026-11-13T08:00:00.000Z';
const t = (sec: number) => new Date(at).getTime() + sec * 1000;
const base = { linkState: 'connected' as const, state: 'running' as const, statusAt: at, now: t(1), staleAfterSec: 5 };

// Chưa nhận bản tin
assert.deepEqual(sessionDisplay({ ...base, state: null, statusAt: null }), { view: 'none', ageSec: null });
// Bản tin mới, còn kết nối
assert.equal(sessionDisplay(base).view, 'live');
// Đúng ngưỡng 5 giây vẫn live, quá ngưỡng thành stale
assert.equal(sessionDisplay({ ...base, now: t(5) }).view, 'live');
assert.deepEqual(sessionDisplay({ ...base, now: t(6) }), { view: 'stale', ageSec: 6 });
// Mất kết nối khi đang điều trị: không rõ trạng thái hiện tại
assert.equal(sessionDisplay({ ...base, linkState: 'disconnected' }).view, 'lost');
assert.equal(sessionDisplay({ ...base, linkState: 'error' }).view, 'lost');
assert.equal(sessionDisplay({ ...base, linkState: 'connecting', now: t(30) }).view, 'lost');
// Mất kết nối khi máy đang chờ: cũng không rõ
assert.equal(sessionDisplay({ ...base, state: 'idle', linkState: 'disconnected' }).view, 'lost');
// Máy đã báo kết thúc: vẫn là sự kiện đã nhận, kể cả khi đã ngắt hay đã lâu
for (const s of ['done', 'stopped', 'error'] as const) {
  assert.equal(sessionDisplay({ ...base, state: s, linkState: 'disconnected', now: t(600) }).view, 'live');
}
// Chờ (idle) lâu không có bản tin khi còn kết nối: không coi là stale (ngưỡng chỉ áp cho đang điều trị, như trước)
assert.equal(sessionDisplay({ ...base, state: 'idle', now: t(60) }).view, 'live');
console.log('sessionDisplay: đạt');
