// Chạy: node src/lib/devices.test.ts
import assert from 'node:assert/strict';
import { reassignDevice } from './devices.ts';

const devices = [{ id: 'd1', patientId: 'p1' }, { id: 'd2', patientId: 'p2' }, { id: 'd3' }];
const patients = [{ id: 'p1', deviceId: 'd1' }, { id: 'p2', deviceId: 'd2' }, { id: 'p3' }];

// Gán d3 cho p1: d1 phải được gỡ khỏi p1 (trước đây d1 vẫn trỏ vào p1).
let r = reassignDevice(devices, patients, 'd3', 'p1');
assert.deepEqual(r.devices, [{ id: 'd1', patientId: undefined }, { id: 'd2', patientId: 'p2' }, { id: 'd3', patientId: 'p1' }]);
assert.deepEqual(r.patients, [{ id: 'p1', deviceId: 'd3' }, { id: 'p2', deviceId: 'd2' }, { id: 'p3' }]);

// Chuyển d2 từ p2 sang p1: p2 mất thiết bị, d1 được gỡ.
r = reassignDevice(devices, patients, 'd2', 'p1');
assert.equal(r.devices.filter((d) => d.patientId === 'p1').length, 1);
assert.equal(r.patients.find((p) => p.id === 'p2')!.deviceId, undefined);
assert.equal(r.devices.find((d) => d.id === 'd1')!.patientId, undefined);

// Bỏ gán d1.
r = reassignDevice(devices, patients, 'd1', null);
assert.equal(r.devices.find((d) => d.id === 'd1')!.patientId, undefined);
assert.equal(r.patients.find((p) => p.id === 'p1')!.deviceId, undefined);
assert.equal(r.patients.find((p) => p.id === 'p2')!.deviceId, 'd2');

// Mọi trường hợp: mỗi bệnh nhân có tối đa một thiết bị, hai phía khớp nhau.
for (const dev of ['d1', 'd2', 'd3']) for (const pt of ['p1', 'p2', 'p3', null]) {
  const x = reassignDevice(devices, patients, dev, pt);
  for (const p of x.patients) {
    const owned = x.devices.filter((d) => d.patientId === p.id);
    assert.ok(owned.length <= 1, `${dev}->${pt}: ${p.id} có ${owned.length} thiết bị`);
    assert.equal(owned[0]?.id, p.deviceId, `${dev}->${pt}: ${p.id} lệch liên kết`);
  }
}
console.log('devices: tất cả kiểm thử đạt');
