// Chạy: node src/lib/planVersion.test.ts
// Giai đoạn B (AU-04, AU-05): xác nhận đọc phiên bản, liên kết phiên với phiên bản, chuyển đổi dữ liệu cũ.
import assert from 'node:assert/strict';
import { activeVersionOf, canLoadPlan, loadedPlanLink, migratePlans, needsPatientAck, protocolIdFor } from './planVersion.ts';

const P = (x: object) => ({ id: 'pl', patientId: 'p-1', woundId: 'w-1', version: 1, status: 'active', confirmed: true, editedAt: '2026-11-01T00:00:00Z', ...x }) as never;

// needsPatientAck, canLoadPlan
assert.equal(needsPatientAck(P({})), true, 'đang áp dụng, đã xác nhận, chưa đọc');
assert.equal(needsPatientAck(P({ patientAckAt: '2026-11-02' })), false);
assert.equal(needsPatientAck(P({ confirmed: false })), false, 'bác sĩ chưa xác nhận thì bệnh nhân chưa thấy');
assert.equal(needsPatientAck(P({ status: 'paused' })), false);
assert.equal(needsPatientAck(undefined), false);
assert.equal(canLoadPlan(P({})), false, 'chưa đọc thì không nạp');
assert.equal(canLoadPlan(P({ patientAckAt: '2026-11-02' })), true);
assert.equal(canLoadPlan(P({ patientAckAt: '2026-11-02', status: 'paused' })), false, 'tạm dừng thì không nạp');
assert.equal(canLoadPlan(P({ patientAckAt: '2026-11-02', status: 'ended' })), false);
assert.equal(canLoadPlan(P({ patientAckAt: '2026-11-02', confirmed: false })), false);

// activeVersionOf: phiên bản cao nhất đang áp dụng của đúng vết thương
const plans = [
  P({ id: 'a', version: 1, status: 'ended', patientAckAt: 'x' }),
  P({ id: 'b', version: 2, patientAckAt: 'x', protocolId: 'pr-1' }),
  P({ id: 'c', woundId: 'w-2', version: 1, patientAckAt: 'x' }),
];
assert.equal(activeVersionOf(plans, 'p-1', 'w-1')?.id, 'b');
assert.equal(activeVersionOf(plans, 'p-1', undefined), undefined, 'không rõ vết thì không đoán');
assert.equal(activeVersionOf(plans, 'p-2', 'w-1'), undefined, 'hồ sơ khác');

// loadedPlanLink: theo lần nạp máy đã nhận gần nhất, đúng hồ sơ và vết thương
const L = (x: object) => ({ id: 'l', deviceId: 'd-1', patientId: 'p-1', planId: 'b', planVersion: 2, at: '2026-11-03T08:00:00Z', by: 'u', transport: 'simulated', result: 'acked', attempts: 1, protocolVersion: 1, capsSource: 'table', ...x }) as never;
assert.deepEqual(loadedPlanLink([L({})], plans, 'p-1', 'w-1'), { planId: 'b', planVersion: 2, protocolId: 'pr-1' });
assert.equal(loadedPlanLink([L({ result: 'timeout' })], plans, 'p-1', 'w-1'), null, 'máy chưa nhận thì không gắn');
assert.equal(loadedPlanLink([L({})], plans, 'p-1', 'w-2'), null, 'lần nạp của vết khác');
assert.equal(loadedPlanLink([L({ patientId: 'p-2' })], plans, 'p-1', 'w-1'), null, 'hồ sơ khác');
assert.equal(loadedPlanLink([L({ planId: 'khong-co' })], plans, 'p-1', 'w-1'), null, 'phiên bản không tồn tại');
assert.equal(
  loadedPlanLink([L({ planId: 'a', planVersion: 1, at: '2026-11-01T08:00:00Z' }), L({ at: '2026-11-03T08:00:00Z' })], plans, 'p-1', 'w-1')?.planId,
  'b', 'lấy lần nạp mới nhất',
);
// Bác sĩ tạo phiên bản mới nhưng máy vẫn giữ bản cũ: phiên gắn bản máy đang giữ.
const withNew = [...plans, P({ id: 'd', version: 3 })];
assert.equal(loadedPlanLink([L({})], withNew, 'p-1', 'w-1')?.planVersion, 2);

// protocolIdFor
let n = 0;
const make = () => `pr-new-${++n}`;
assert.equal(protocolIdFor(plans, 'p-1', 'w-1', false, make), 'pr-1', 'phiên bản mới nối tiếp phác đồ đang có');
assert.equal(protocolIdFor(plans, 'p-1', 'w-1', true, make), 'pr-new-1', 'phác đồ mới');
assert.equal(protocolIdFor(plans, 'p-1', 'w-9', false, make), 'pr-new-2', 'vết chưa có phác đồ');

// migratePlans: xác định, không theo vị trí mảng, không xóa
const wounds = [
  { id: 'w-b', patientId: 'p-1', code: 'VT02', startDate: '2026-10-05' },
  { id: 'w-a', patientId: 'p-1', code: 'VT01', startDate: '2026-10-01' },
] as never[];
const legacy = [P({ id: 'old', woundId: undefined }), P({ id: 'kept', woundId: 'w-b', protocolId: 'pr-x', patientAckAt: 't' }), P({ id: 'orphan', patientId: 'p-9', woundId: undefined })];
const m1 = migratePlans(legacy, wounds);
assert.equal(m1.length, 3, 'không xóa bản ghi');
assert.equal(m1[0].woundId, 'w-a', 'vết mở sớm nhất, không phải phần tử đầu mảng');
assert.equal(m1[0].protocolId, 'pr-cu-p-1-w-a');
assert.equal(m1[0].patientAckAt, undefined, 'không giả lập xác nhận của bệnh nhân');
assert.equal(m1[1], legacy[1], 'bản đã đủ trường giữ nguyên đối tượng');
assert.equal(m1[2].woundId, undefined, 'không có vết thương thì không gán');
assert.deepEqual(migratePlans(m1, wounds), m1, 'chạy lại cho cùng kết quả');
assert.deepEqual(migratePlans(legacy, [...wounds].reverse()), m1, 'không phụ thuộc thứ tự mảng vết thương');

console.log('planVersion: đạt');
