// Chạy: node src/lib/localDay.test.ts
// Ngày "hôm nay" và ngày của phiên phải theo giờ máy, không theo UTC.
// Ở Việt Nam (UTC+7), 06:30 sáng ngày 08/11 vẫn là 23:30 ngày 07/11 theo UTC.
import assert from 'node:assert/strict';
import type { DeviceSession, TreatmentPlan } from './types.ts';

process.env.TZ = 'Asia/Ho_Chi_Minh';
const { localDay, courseProgress } = await import('./course.ts');
const { monthCells } = await import('./adherence.ts');
const { fmtDateTime } = await import('./format.ts');

const morning = '2026-11-07T23:30:00.000Z'; // 06:30 ngày 08/11 giờ Việt Nam
assert.equal(localDay(morning), '2026-11-08');
assert.equal(localDay(new Date(morning)), '2026-11-08');
assert.equal(localDay('2026-11-08T16:59:00.000Z'), '2026-11-08'); // 23:59 giờ Việt Nam
assert.equal(localDay('2026-11-08T17:00:00.000Z'), '2026-11-09'); // 00:00 ngày hôm sau
assert.equal(fmtDateTime(morning), '06:30 08/11/2026');

// Buổi chiếu lúc 06:30 được tính vào ngày 08/11, không phải 07/11.
const plan: TreatmentPlan = {
  id: 'pl', patientId: 'p', version: 1, status: 'active', sessionsPerDay: 1, minIntervalMin: null, targetEnergyWh: null,
  startDate: '2026-11-02', endDate: '2026-11-15', reviewSchedule: '', notes: '', editedBy: 'u', editedAt: '', reason: '', confirmed: true,
  phases: [{ from: '2026-11-02', to: '2026-11-15', pattern: 'daily', n: 1 }],
};
const session: DeviceSession = { sessionId: 's', deviceId: 'd', start: morning, durationMin: 3, energyWh: null, status: 'completed', source: 'device' };
const pr = courseProgress(plan, [session], '2026-11-08', '2026-11-08');
assert.equal(pr.done, 1);
assert.equal(pr.today, 'treat');
const cells = monthCells('2026-11', [session], 1, '2026-11-08', plan.startDate, plan.endDate, '2026-11-08');
assert.equal(cells.find((c) => c.date === '2026-11-08')?.count, 1);
assert.equal(cells.find((c) => c.date === '2026-11-07')?.count, 0);

console.log('localDay: ngày theo giờ máy (Asia/Ho_Chi_Minh) đạt');
