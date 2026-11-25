// Chạy: node src/lib/deviceState.test.ts
// Giai đoạn B (CN4 D1..D9, AU-25..28): trạng thái máy, điều kiện giao, danh mục, lịch sử máy.
import assert from 'node:assert/strict';
import { assignBlocker, catalogErrors, deviceHistory, deviceStatus, hasActivePlan } from './deviceState.ts';
import { LIFECYCLE } from './maintenance.ts';

// deviceStatus: lỗi đứng trên vòng đời; máy cũ không có vòng đời suy từ việc đang giao
assert.equal(deviceStatus({ lifecycle: 'ready' }), 'ready');
assert.equal(deviceStatus({ lifecycle: 'in_use', patientId: 'p' }), 'in_use');
assert.equal(deviceStatus({ lifecycle: 'returned' }), 'maintenance');
assert.equal(deviceStatus({ lifecycle: 'disinfected' }), 'maintenance');
assert.equal(deviceStatus({ lifecycle: 'in_use', fault: { code: 'x', message: 'm', at: 't' } }), 'fault');
assert.equal(deviceStatus({ patientId: 'p' }), 'in_use');
assert.equal(deviceStatus({}), 'ready');

// XN-09: thu hồi rồi đánh dấu khử khuẩn là Sẵn sàng; máy cũ "disinfected" cũng chuyển thẳng Sẵn sàng
assert.equal(LIFECYCLE.in_use.next, 'returned');
assert.equal(LIFECYCLE.returned.next, 'ready');
assert.equal(LIFECYCLE.disinfected.next, 'ready');
assert.equal(LIFECYCLE.ready.next, undefined);

// hasActivePlan: chỉ phác đồ đang hoạt động
const plans = [{ patientId: 'p1', status: 'paused' }, { patientId: 'p2', status: 'active' }, { patientId: 'p3', status: 'draft' }] as never[];
assert.equal(hasActivePlan(plans, 'p1'), false);
assert.equal(hasActivePlan(plans, 'p2'), true);
assert.equal(hasActivePlan(plans, 'p3'), false);

// assignBlocker
const devs = [
  { id: 'd1', code: 'TB-001', lifecycle: 'ready' },
  { id: 'd2', code: 'TB-002', lifecycle: 'in_use', patientId: 'p9' },
  { id: 'd3', code: 'TB-003', lifecycle: 'returned' },
  { id: 'd4', code: 'TB-004', lifecycle: 'ready', fault: { message: 'm', at: 't' } },
  { id: 'd5', code: 'TB-005', lifecycle: 'in_use', patientId: 'p4' },
] as never[];
const pt = (id: string, x: object = {}) => ({ id, ...x }) as never;
const d = (id: string) => (devs as { id: string }[]).find((x) => x.id === id) as never;
assert.equal(assignBlocker(d('d1'), pt('p2'), devs, plans), null, 'máy sẵn sàng, có phác đồ hoạt động');
assert.match(assignBlocker(d('d1'), pt('p1'), devs, plans)!, /chưa có phác đồ đang hoạt động/, 'D2: phác đồ tạm dừng không giao');
assert.match(assignBlocker(d('d2'), pt('p2'), devs, plans)!, /đang giao cho bệnh nhân khác/, 'D8: máy của người khác');
assert.match(assignBlocker(d('d3'), pt('p2'), devs, plans)!, /chưa khử khuẩn/);
assert.match(assignBlocker(d('d4'), pt('p2'), devs, plans)!, /đang báo lỗi/);
assert.match(assignBlocker(d('d1'), pt('p4', { deviceId: 'd5' }), devs, [...plans, { patientId: 'p4', status: 'active' }] as never[])!, /đang giữ máy TB-005/, 'D8: không tự gỡ máy cũ');
assert.match(assignBlocker(d('d1'), pt('p2', { archivedAt: '2026-11-01' }), devs, plans)!, /lưu trữ/);
assert.equal(assignBlocker(undefined, pt('p2'), devs, plans), 'Không tìm thấy thiết bị.');

// catalogErrors (AU-25)
const cat = [{ id: 'd1', code: 'TB-001', serial: 'SN-1' }, { id: 'd2', code: 'TB-002' }] as never[];
assert.deepEqual(catalogErrors({ code: 'tb-010', serial: 'SN-9' }, cat), {});
assert.equal(catalogErrors({ code: 'TB-001', serial: 'SN-9' }, cat).code, 'Mã thiết bị đã tồn tại.');
assert.equal(catalogErrors({ code: 'TB-001', serial: 'SN-1' }, cat, 'd1').code, undefined, 'sửa chính máy đó không tính trùng');
assert.equal(catalogErrors({ code: 'X1', serial: '' }, cat).code, 'Định dạng TB-xxx.');
assert.equal(catalogErrors({ code: 'TB-011', serial: 'sn-1' }, cat).serial, 'Số sê-ri đã có ở máy khác.');
assert.equal(catalogErrors({ code: 'TB-011', serial: '' }, cat).serial, 'Nhập số sê-ri.');

// deviceHistory (D4): gộp, bỏ phiên trùng mã, mới trước, chỉ của máy đó
const h = deviceHistory('d1',
  [{ id: 'e1', deviceId: 'd1', at: '2026-11-01T01:00:00Z', by: 'u', kind: 'assign', patientId: 'p1' }, { id: 'e2', deviceId: 'd2', at: '2026-11-05T00:00:00Z', by: 'u', kind: 'return' }],
  [{ sessionId: 's1', deviceId: 'd1', start: '2026-11-02T00:00:00Z', durationMin: 3, energyWh: null, status: 'completed', source: 'device' },
    { sessionId: 's1', deviceId: 'd1', start: '2026-11-02T00:00:00Z', durationMin: 3, energyWh: null, status: 'completed', source: 'device' }],
  [{ id: 'l1', deviceId: 'd1', patientId: 'p1', planId: 'pl', planVersion: 2, at: '2026-11-01T12:00:00Z', by: 'u', transport: 'simulated', result: 'acked', attempts: 1, protocolVersion: 1, capsSource: 'table' }] as never[]);
assert.deepEqual(h.map((r) => r.kind), ['session', 'load', 'assign']);
assert.match(h[0].detail!, /3 phút, hoàn tất/);
console.log('deviceState: ok');
