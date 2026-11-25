// Chạy: node src/lib/planVersion.test.ts
// Giai đoạn B (AU-04, AU-05): xác nhận đọc phiên bản, liên kết phiên với phiên bản, chuyển đổi dữ liệu cũ.
import assert from 'node:assert/strict';
import { activeVersionOf, canLoadPlan, loadedPlanLink, migratePlans, needsPatientAck, openProtocolId, planDeleteBlocker, planPhotoCandidates, protocolIdFor } from './planVersion.ts';

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


// CN3 P2, P7: phác đồ đang mở
assert.equal(openProtocolId([P({ protocolId: 'pr-1', status: 'active' })], 'p-1', 'w-1'), 'pr-1');
assert.equal(openProtocolId([P({ protocolId: 'pr-1', status: 'paused' })], 'p-1', 'w-1'), 'pr-1');
assert.equal(openProtocolId([P({ protocolId: 'pr-1', status: 'draft' })], 'p-1', 'w-1'), 'pr-1', 'nháp vẫn là phác đồ đang lập');
assert.equal(openProtocolId([P({ protocolId: 'pr-1', version: 1 }), P({ protocolId: 'pr-1', version: 2, status: 'ended' })], 'p-1', 'w-1'), undefined, 'phiên bản mới nhất đã kết thúc');
assert.equal(openProtocolId([], 'p-1', 'w-1'), undefined);
assert.equal(openProtocolId([P({ protocolId: 'pr-1' })], 'p-1', 'w-2'), undefined, 'vết khác');

// CN3 P1, P3: ảnh căn cứ trong ngày, Đạt, không "Không sử dụng"
const IM = (x: object) => ({ id: 'IMG1', woundId: 'w-1', captureDate: '2026-11-23', uploadDate: '2026-11-23', status: 'unlabeled', label: { quality: 'pass' }, ...x }) as never;
const TODAY = '2026-11-23';
assert.deepEqual(planPhotoCandidates([IM({})], 'w-1', TODAY).map((x: { id: string }) => x.id), ['IMG1']);
assert.equal(planPhotoCandidates([IM({ captureDate: '2026-11-22' })], 'w-1', TODAY).length, 0, 'không phải hôm nay');
assert.equal(planPhotoCandidates([IM({ label: { quality: 'fail' } })], 'w-1', TODAY).length, 0, 'không đạt');
assert.equal(planPhotoCandidates([IM({ label: undefined })], 'w-1', TODAY).length, 0, 'chưa đánh giá chất lượng');
assert.equal(planPhotoCandidates([IM({ status: 'excluded' })], 'w-1', TODAY).length, 0, 'không sử dụng');
assert.equal(planPhotoCandidates([IM({ woundId: 'w-2' })], 'w-1', TODAY).length, 0, 'vết khác');
assert.equal(planPhotoCandidates([IM({ capture: { sourceDateKnown: false } })], 'w-1', TODAY).length, 0, 'ngày chụp không xác định');
assert.equal(planPhotoCandidates([IM({})], undefined, TODAY).length, 0);
assert.deepEqual(planPhotoCandidates([IM({ id: 'IMG1', capture: { capturedAt: '2026-11-23T01:00:00Z' } }), IM({ id: 'IMG2', capture: { capturedAt: '2026-11-23T03:00:00Z' } })], 'w-1', TODAY).map((x: { id: string }) => x.id), ['IMG2', 'IMG1'], 'mới nhất trước');

// CN3 P9: xóa phác đồ chỉ khi chưa có phiên
const vs = [P({ id: 'v1', protocolId: 'pr-9', startDate: '2026-11-01', endDate: '2026-11-30' }), P({ id: 'v2', version: 2, protocolId: 'pr-9', startDate: '2026-11-05', endDate: '2026-12-10' })];
assert.equal(planDeleteBlocker(vs, [], [], 'pr-9'), null);
assert.ok(planDeleteBlocker(vs, [{ planId: 'v1', woundId: 'w-1', start: '2026-11-02T08:00:00Z' }], [], 'pr-9')?.includes('1 phiên'));
assert.ok(planDeleteBlocker(vs, [{ protocolId: 'pr-9', woundId: 'w-1', start: '2026-11-02T08:00:00Z' }], [], 'pr-9')?.includes('phiên'));
assert.ok(planDeleteBlocker(vs, [], [{ planId: 'v2' }], 'pr-9')?.includes('nạp xuống máy'));
assert.ok(planDeleteBlocker(vs, [{ woundId: 'w-1', start: '2026-12-01T08:00:00Z' }], [], 'pr-9')?.includes('phiên cũ'), 'phiên cũ chưa gắn phiên bản trong khoảng ngày');
assert.equal(planDeleteBlocker(vs, [{ woundId: 'w-1', start: '2026-10-01T08:00:00Z' }], [], 'pr-9'), null, 'phiên cũ ngoài khoảng ngày');
assert.equal(planDeleteBlocker(vs, [{ woundId: 'w-2', start: '2026-11-10T08:00:00Z' }], [], 'pr-9'), null, 'phiên của vết khác');
assert.equal(planDeleteBlocker(vs, [{ planId: 'khac', woundId: 'w-1', start: '2026-11-10T08:00:00Z' }], [], 'pr-9'), null, 'phiên của phác đồ khác');
assert.ok(planDeleteBlocker(vs, [], [], 'pr-x'));

console.log('planVersion: đạt');
