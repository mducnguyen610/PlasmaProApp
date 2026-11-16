// Chạy: node src/lib/monitorTarget.test.ts
// Stage 9B (S8-B04): N07 mở theo dõi phiên với đúng vết thương khi không mơ hồ; nhiều vết thì bắt chọn ở T01.
import assert from 'node:assert/strict';
import { monitorTarget } from './monitorTarget.ts';

const plan = (x: object) => ({ id: 'pl', patientId: 'p-1', version: 1, status: 'active', confirmed: true, ...x }) as never;

// Một vết có đợt đang áp dụng đã xác nhận: truyền đúng woundId.
assert.deepEqual(monitorTarget([{ woundId: 'w-1', plan: plan({ woundId: 'w-1' }) }]), { kind: 'monitor', woundId: 'w-1' });
// Vết thứ hai không có đợt, hoặc đợt chưa xác nhận, tạm dừng, nháp: không tính, vẫn đúng một vết.
assert.deepEqual(monitorTarget([
  { woundId: 'w-1', plan: undefined },
  { woundId: 'w-2', plan: plan({ woundId: 'w-2' }) },
  { woundId: 'w-3', plan: plan({ woundId: 'w-3', confirmed: false }) },
  { woundId: 'w-4', plan: plan({ woundId: 'w-4', status: 'paused' }) },
  { woundId: 'w-5', plan: plan({ woundId: 'w-5', status: 'draft' }) },
]), { kind: 'monitor', woundId: 'w-2' }, 'chọn đúng vết đủ điều kiện, không phải phần tử đầu mảng');
// Hai vết đủ điều kiện: không tự gán, phải chọn ở T01.
assert.deepEqual(monitorTarget([{ woundId: 'w-1', plan: plan({}) }, { woundId: 'w-2', plan: plan({}) }]), { kind: 'choose' });
// Không có vết nào đủ điều kiện: giữ hành vi cũ.
assert.deepEqual(monitorTarget([]), { kind: 'none' });
assert.deepEqual(monitorTarget([{ woundId: 'w-1', plan: plan({ status: 'ended' }) }]), { kind: 'none' });

console.log('monitorTarget.test: đạt');
