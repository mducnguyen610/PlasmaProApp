// Chạy: node src/lib/woundStatus.test.ts
// Giai đoạn B (CN1 H6, H7, H11; XN-12): trạng thái vết, trạng thái chung, thứ tự cập nhật, điều kiện xóa vết.
import assert from 'node:assert/strict';
import { patientCareStatus, woundCareStatus, woundDeleteBlocker, woundUpdatedAt } from './woundStatus.ts';

const W = (x: object) => ({ id: 'w-1', status: 'active', startDate: '2026-10-01', ...x }) as never;
const plan = (woundId: string, status: string) => ({ woundId, status }) as never;

assert.equal(woundCareStatus(W({}), []), 'not_treated', 'chưa từng có phác đồ');
assert.equal(woundCareStatus(W({}), [plan('w-1', 'draft')]), 'not_treated', 'bản nháp không tính');
assert.equal(woundCareStatus(W({}), [plan('w-1', 'active')]), 'treating');
assert.equal(woundCareStatus(W({ status: 'awaiting_closure' }), [plan('w-1', 'paused')]), 'treating', 'tạm dừng chờ xác nhận liền vẫn là đang điều trị');
assert.equal(woundCareStatus(W({ status: 'follow_up' }), [plan('w-1', 'ended')]), 'ended', 'đã lành');
assert.equal(woundCareStatus(W({ status: 'closed' }), []), 'ended', 'kết thúc theo dõi');
assert.equal(woundCareStatus(W({ revisitAt: '2026-11-20' }), []), 'revisit', 'bác sĩ đặt');
assert.equal(woundCareStatus(W({ revisitAt: '2026-11-20' }), [plan('w-1', 'active')]), 'treating', 'đang điều trị ưu tiên hơn tái khám');
assert.equal(woundCareStatus(W({}), [plan('w-2', 'active')]), 'not_treated', 'phác đồ của vết khác');
assert.equal(woundCareStatus(W({}), [plan('w-1', 'ended')]), 'revisit', 'phác đồ đã kết thúc, chưa lành: tự hiện Cần tái khám (chốt 24/11/2026)');
assert.equal(woundCareStatus(W({}), [plan('w-1', 'ended'), plan('w-1', 'draft')]), 'revisit', 'bản nháp mới không đổi trạng thái');

// Trạng thái chung theo ưu tiên
const ws = [W({ id: 'a', status: 'follow_up' }), W({ id: 'b', revisitAt: 'x' }), W({ id: 'c' })];
assert.equal(patientCareStatus(ws, []), 'revisit');
assert.equal(patientCareStatus(ws, [plan('c', 'active')]), 'treating');
assert.equal(patientCareStatus([W({ id: 'a', status: 'closed' }), W({ id: 'c' })], []), 'not_treated');
assert.equal(patientCareStatus([W({ id: 'a', status: 'closed' })], []), 'ended');
assert.equal(patientCareStatus([], []), 'not_treated');

// Mốc cập nhật gần nhất
const w1 = W({ startDate: '2026-10-01' });
assert.equal(woundUpdatedAt(w1, [], [], []), '2026-10-01');
assert.equal(woundUpdatedAt(w1, [{ woundId: 'w-1', uploadDate: '2026-11-01', captureDate: '2026-10-30' }], [{ woundId: 'w-1', editedAt: '2026-11-05T09:00:00Z' }], [{ woundId: 'w-2', start: '2026-12-01' }]), '2026-11-05T09:00:00Z');
assert.equal(woundUpdatedAt(W({ updatedAt: '2026-11-22T00:00:00Z' }), [], [], [{ woundId: 'w-1', start: '2026-11-10T08:00:00Z' }]), '2026-11-22T00:00:00Z');

// Xóa vết: chỉ khi chưa có ảnh, phác đồ, phiên, đánh giá
const empty = { images: [], plans: [], sessions: [], evaluations: [] };
assert.equal(woundDeleteBlocker('w-1', empty), null);
assert.ok(woundDeleteBlocker('w-1', { ...empty, images: [{ woundId: 'w-1' }] })?.includes('1 ảnh'));
assert.ok(woundDeleteBlocker('w-1', { ...empty, plans: [{ woundId: 'w-1' }] })?.includes('phác đồ'));
assert.ok(woundDeleteBlocker('w-1', { ...empty, sessions: [{ woundId: 'w-1' }] })?.includes('phiên'));
assert.ok(woundDeleteBlocker('w-1', { ...empty, evaluations: [{ woundId: 'w-1' }] })?.includes('đánh giá'));
assert.equal(woundDeleteBlocker('w-1', { ...empty, images: [{ woundId: 'w-2' }] }), null, 'dữ liệu vết khác');

console.log('woundStatus.test: đạt');
