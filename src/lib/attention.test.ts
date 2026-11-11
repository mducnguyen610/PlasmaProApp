// Chạy: node src/lib/attention.test.ts
import assert from 'node:assert/strict';
import { classifyToday, rankPatients, type AttentionInput } from './attention.ts';

const T = '2026-11-11';
const mk = (patch: Partial<AttentionInput> = {}): AttentionInput => ({
  patientId: 'p', hasActivePlan: true, scheduledToday: true, completedToday: 0, targetPerDay: 1, lastSyncDay: T, today: T, missedLast7: 0, openReports: 0, severity: undefined, ...patch,
});

assert.equal(classifyToday(mk({ hasActivePlan: false })), 'no_plan');
assert.equal(classifyToday(mk({ scheduledToday: false })), 'rest');
assert.equal(classifyToday(mk({ completedToday: 1 })), 'treated');
assert.equal(classifyToday(mk({ lastSyncDay: null })), 'no_data');
assert.equal(classifyToday(mk({ lastSyncDay: '2026-11-09' })), 'no_data');
assert.equal(classifyToday(mk()), 'due');
// Đủ buổi hôm nay nhưng lần đồng bộ cuối là ngày cũ: dữ liệu đã có, vẫn là đã chiếu.
assert.equal(classifyToday(mk({ completedToday: 2, targetPerDay: 2, lastSyncDay: '2026-11-01' })), 'treated');

const report = mk({ patientId: 'r', openReports: 1 });
const severe = mk({ patientId: 's', severity: 'severe' });
const missed = mk({ patientId: 'm', missedLast7: 3 });
const r1 = rankPatients([missed, severe, report]);
assert.deepEqual(r1.map((a) => a.patientId), ['r', 's', 'm']);
assert.ok(r1[0].reasons.includes('1 báo cáo chưa xử lý'));
const tie = rankPatients([mk({ patientId: 'a' }), mk({ patientId: 'b' })]);
assert.deepEqual(tie.map((a) => a.patientId), ['a', 'b']);
// 2 báo cáo (200) + Trung bình (20) + bỏ lỡ 2 (20) + chưa có dữ liệu (5) = 245
const sum = rankPatients([mk({ openReports: 2, severity: 'moderate', missedLast7: 2, lastSyncDay: null })])[0];
assert.equal(sum.score, 245);
assert.deepEqual(sum.reasons, ['2 báo cáo chưa xử lý', 'Mức độ Trung bình', 'Bỏ lỡ 2 buổi trong 7 ngày', 'Chưa có dữ liệu hôm nay']);
console.log('attention.test: ok');
