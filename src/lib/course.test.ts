// Chạy: node src/lib/course.test.ts
import assert from 'node:assert/strict';
import { areaReview, courseProgress, courseStatus, isScheduled, phaseLabel, scheduledDays, suggestDurationSec, fmtDuration } from './course.ts';
import type { DeviceSession, TreatmentPlan, WoundImage } from './types.ts';

const plan: TreatmentPlan = {
  id: 'pl', patientId: 'p', version: 1, status: 'active', sessionsPerDay: 1, minIntervalMin: null, targetEnergyWh: null,
  startDate: '2026-10-05', endDate: '2026-10-25', reviewSchedule: '', notes: '', editedBy: 'u', editedAt: '', reason: '', confirmed: true,
  phases: [
    { from: '2026-10-05', to: '2026-10-11', pattern: 'daily', n: 1 }, // 7 buổi
    { from: '2026-10-12', to: '2026-10-25', pattern: 'n_per_week', n: 3 }, // T2, T4, T6: 6 buổi
  ],
};
// 05/10/2026 là thứ Hai
assert.equal(scheduledDays(plan).length, 13);
assert.equal(isScheduled(plan, '2026-10-13'), false); // thứ Ba, giai đoạn 2
assert.equal(isScheduled(plan, '2026-10-14'), true); // thứ Tư
assert.equal(phaseLabel(plan.phases![1]), '3 buổi mỗi tuần (T2, T4, T6)');
assert.equal(phaseLabel({ from: '', to: '', pattern: 'every_n_days', n: 2 }), 'Cách ngày');
assert.equal(scheduledDays({ ...plan, phases: [{ from: '2026-10-01', to: '2026-10-10', pattern: 'every_n_days', n: 3 }] }).join(), '2026-10-01,2026-10-04,2026-10-07,2026-10-10');

const ses = (day: string, status: DeviceSession['status'] = 'completed'): DeviceSession => ({
  sessionId: day + status, deviceId: 'd', start: `${day}T08:00:00.000Z`, durationMin: 3, energyWh: null, status, source: 'device',
});
// Làm đủ giai đoạn 1 trừ 07/10; chiếu thêm ngày nghỉ 13/10
const s = ['2026-10-05', '2026-10-06', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-13'].map((d) => ses(d));
const pr = courseProgress(plan, s, '2026-10-14', '2026-10-13');
assert.equal(pr.total, 13);
assert.equal(pr.done, 7); // 6 buổi giai đoạn 1 + 12/10
assert.equal(pr.missed, 1); // 07/10
assert.equal(pr.extra, 1); // 13/10 là ngày nghỉ
assert.equal(pr.today, 'treat');
assert.equal(pr.next, '2026-10-14');
assert.equal(pr.phaseIndex, 1);
const fmt = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7);
assert.equal(courseStatus(pr, fmt).detail, 'Buổi 8/13 của đợt');
const pr2 = courseProgress(plan, [...s, ses('2026-10-14')], '2026-10-14', '2026-10-14');
assert.equal(courseStatus(pr2, fmt).kind, 'done');
assert.equal(pr2.next, '2026-10-16');
assert.equal(courseStatus(courseProgress(plan, s, '2026-10-15', '2026-10-14'), fmt).kind, 'rest');
assert.equal(courseStatus(courseProgress(plan, [...s, ses('2026-10-15')], '2026-10-15', '2026-10-15'), fmt).kind, 'over');
assert.equal(courseStatus(courseProgress(plan, s, '2026-10-30', '2026-10-30'), fmt).kind, 'after');
// Chưa đồng bộ thì không tính là bỏ lỡ
assert.equal(courseProgress(plan, [], '2026-10-08', null).missed, 0);

// Liều theo diện tích
assert.equal(suggestDurationSec(8.4, 30), 252);
assert.equal(suggestDurationSec(null, 30), null);
assert.equal(fmtDuration(252), '4 phút 12 giây');
assert.equal(fmtDuration(180), '3 phút');

// Mốc xem lại tuần 4
const img = (d: string, a: number | null): WoundImage => ({ id: d, woundId: 'w', patientId: 'p', uri: null, ext: 'png', filename: '', captureDate: d, uploadDate: d, uploadedBy: 'u', source: 'demo', areaCm2: a, status: a === null ? 'unlabeled' : 'labeled', history: [] });
const imgs = [img('2026-10-05', 10), img('2026-10-20', 7), img('2026-11-02', 6), img('2026-11-03', null)];
assert.equal(areaReview(imgs, { startDate: '2026-10-05', reviewAtDay: 28 }, '2026-10-20').state, 'pending');
const r = areaReview(imgs, { startDate: '2026-10-05', reviewAtDay: 28 }, '2026-11-03');
assert.equal(r.state, 'low'); // giảm 40% < 50%
assert.equal(Math.round(r.reduction! * 100), 40);
assert.equal(areaReview([...imgs, img('2026-11-03', 4)].filter((i) => i.areaCm2 !== null), { startDate: '2026-10-05' }, '2026-11-03').state, 'ok');
assert.equal(areaReview([img('2026-10-05', 10)], { startDate: '2026-10-05' }, '2026-11-03').state, 'no_data');
console.log('course: ok');
