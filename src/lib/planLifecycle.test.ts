// Chạy: node src/lib/planLifecycle.test.ts
// Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 4): ngày áp dụng phiên bản, gia hạn, kết thúc, số phác đồ, chặn phiên.
import assert from 'node:assert/strict';
import { applyExtension, changeHistory, extendBlocker, pendingExtension, protocolNumber, protocolsOfWound, protocolTitle, runBlocker, settlePlans, versionStart, versionStatusLabel } from './planLifecycle.ts';
import { needsPatientAck } from './planVersion.ts';

const P = (x: object) => ({ id: 'pl', patientId: 'p-1', woundId: 'w-1', protocolId: 'pr-1', version: 1, status: 'active', confirmed: true, startDate: '2026-11-01', endDate: '2026-11-30', editedAt: '2026-11-01T01:00:00Z', editedBy: 'u-bs', reason: 'lập', ...x }) as never;

// versionStart: phiên bản mới theo effectiveFrom, phiên bản đầu theo ngày bắt đầu, phiên bản cũ theo ngày lưu
assert.equal(versionStart(P({ effectiveFrom: '2026-11-10' }), false), '2026-11-10');
assert.equal(versionStart(P({}), true), '2026-11-01');
assert.equal(versionStart(P({ editedAt: '2026-11-05T20:00:00Z' }), false), '2026-11-06', 'giờ Việt Nam');

// settlePlans: chưa tới ngày thì giữ nguyên mảng
const v1 = P({ id: 'v1' });
const v2 = P({ id: 'v2', version: 2, status: 'scheduled', effectiveFrom: '2026-11-10' });
const before = [v1, v2];
assert.equal(settlePlans(before, '2026-11-09'), before);
const after = settlePlans(before, '2026-11-10');
assert.equal(after.find((x: { id: string }) => x.id === 'v2')!.status, 'active');
const old = after.find((x: { id: string }) => x.id === 'v1')!;
assert.equal(old.status, 'ended');
assert.equal(old.supersededBy, 'v2');
assert.equal(versionStatusLabel(old), 'Đã thay thế');
assert.equal(versionStatusLabel(P({ status: 'ended' })), null);
assert.equal(after.length, 2, 'không xóa phiên bản');
// phác đồ đang tạm dừng: phiên bản mới vào hiệu lực ở trạng thái tạm dừng
const paused = settlePlans([P({ id: 'v1', status: 'paused' }), P({ id: 'v2', version: 2, status: 'scheduled', effectiveFrom: '2026-11-10' })], '2026-11-12');
assert.equal(paused.find((x: { id: string }) => x.id === 'v2')!.status, 'paused');

// Gia hạn: đổi ngày kết thúc, không đổi version, ghi nhật ký, chờ bệnh nhân đọc
const ext = applyExtension(P({ phases: [{ from: '2026-11-01', to: '2026-11-15', pattern: 'daily', n: 1 }, { from: '2026-11-16', to: '2026-11-30', pattern: 'n_per_week', n: 3 }], patientAckAt: 'x' }), '2026-12-14', 'chậm lành', 'u-bs', '2026-11-20T00:00:00Z');
assert.equal(ext.endDate, '2026-12-14');
assert.equal(ext.version, 1);
assert.equal(ext.phases![1].to, '2026-12-14');
assert.equal(ext.phases![0].to, '2026-11-15');
assert.deepEqual(pendingExtension(ext), { at: '2026-11-20T00:00:00Z', by: 'u-bs', fromEnd: '2026-11-30', toEnd: '2026-12-14', reason: 'chậm lành' });
assert.equal(needsPatientAck(ext), true, 'gia hạn chưa đọc thì bệnh nhân cần xác nhận');
assert.equal(needsPatientAck({ ...ext, extensions: [{ ...ext.extensions![0], ackAt: 'y' }] }), false);
assert.equal(extendBlocker(P({}), '2026-11-30', 'x'), 'Ngày kết thúc mới phải sau ngày kết thúc hiện tại.');
assert.equal(extendBlocker(P({}), '2026-12-01', ' '), 'Nhập lý do gia hạn.');
assert.equal(extendBlocker(P({ status: 'ended' }), '2026-12-01', 'x'), 'Chỉ gia hạn phác đồ đang hoạt động hoặc tạm dừng.');
assert.equal(extendBlocker(P({}), '2026-12-01', 'x'), null);

// runBlocker: chưa đọc gia hạn chỉ chặn sau ngày kết thúc cũ
assert.equal(runBlocker(ext, [], '2026-11-25'), null);
assert.match(runBlocker(ext, [], '2026-12-01')!, /ngày kết thúc mới/);
assert.equal(runBlocker(P({ status: 'paused', patientAckAt: 'x' }), [], '2026-11-05'), 'Phác đồ đang tạm dừng.');
assert.match(runBlocker(P({}), [], '2026-11-05')!, /chưa xác nhận đã đọc/);
const ch = (x: object) => ({ id: 'c', protocolId: 'pr-1', patientId: 'p-1', woundId: 'w-1', date: '2026-11-05', kind: 'cancel', reason: 'r', at: '2026-11-04T00:00:00Z', by: 'u-bs', ...x }) as never;
assert.equal(runBlocker(P({ patientAckAt: 'x' }), [ch({})], '2026-11-05'), 'Bác sĩ đã hủy phiên hôm nay.');
assert.match(runBlocker(P({ patientAckAt: 'x' }), [ch({ kind: 'postpone', newDate: '2026-11-07' })], '2026-11-05')!, /hoãn/);
assert.equal(runBlocker(P({ patientAckAt: 'x' }), [ch({ protocolId: 'pr-khac' })], '2026-11-05'), null, 'thay đổi của phác đồ khác không chặn');

// Số và tên phác đồ
const many = [P({ id: 'a', protocolId: 'pr-a', editedAt: '2026-10-01T00:00:00Z', status: 'ended' }), P({ id: 'b', protocolId: 'pr-b', editedAt: '2026-11-01T00:00:00Z' }), P({ id: 'c', protocolId: 'pr-c', woundId: 'w-2' })];
assert.equal(protocolNumber(many, 'w-1', 'pr-a'), 1);
assert.equal(protocolNumber(many, 'w-1', 'pr-b'), 2);
assert.equal(protocolNumber(many, 'w-2', 'pr-c'), 1, 'đánh số riêng theo vết');
assert.equal(protocolTitle(undefined, 2), 'Phác đồ số 002');
assert.equal(protocolTitle(P({ title: ' Phác đồ Plasma A ' }), 2), 'Phác đồ Plasma A');
const views = protocolsOfWound(many, 'p-1', 'w-1');
assert.deepEqual(views.map((v) => v.protocolId), ['pr-b', 'pr-a'], 'phác đồ đang hoạt động trước, lịch sử sau');
assert.equal(views[0].open, true);
assert.equal(views[1].open, false);

// Lịch sử thay đổi: phiên bản, gia hạn, trạng thái; mới trước
const hist = changeHistory([P({ id: 'v1', statusLog: [{ at: '2026-11-03T00:00:00Z', by: 'u', action: 'pause', reason: 'kích ứng' }] }), { ...ext, id: 'v2', version: 2, effectiveFrom: '2026-11-21', editedAt: '2026-11-19T00:00:00Z' }], (x) => x);
assert.deepEqual(hist.map((h) => h.kind), ['extend', 'version', 'pause', 'create']);
console.log('planLifecycle.test: đạt');
