// Chạy: node src/lib/simStartGate.test.ts
// Stage 9B (S8-B07): sau khi tải lại, máy giả lập chưa có liệu trình thì không hiện "Bắt đầu điều trị" và có lý do rõ.
import assert from 'node:assert/strict';
import { SIM_NO_CONFIG_TEXT, simStartGate } from './simStartGate.ts';

const base = { simControls: true, connected: true, running: false, configLoaded: true };
assert.deepEqual(simStartGate(base), { show: true, reason: null }, 'giả lập đã có liệu trình');
assert.deepEqual(simStartGate({ ...base, configLoaded: false }), { show: false, reason: SIM_NO_CONFIG_TEXT }, 'sau tải lại: không có liệu trình');
assert.equal(simStartGate({ ...base, configLoaded: undefined }).show, false, 'không rõ thì không hiện');
assert.deepEqual(simStartGate({ ...base, running: true }), { show: false, reason: null }, 'đang chạy: chỗ này không có nút bắt đầu');
assert.deepEqual(simStartGate({ ...base, connected: false, configLoaded: false }), { show: false, reason: null }, 'chưa kết nối: thông báo kết nối lo việc này');
assert.deepEqual(simStartGate({ ...base, simControls: false, configLoaded: undefined }), { show: false, reason: null }, 'thiết bị thật: không có nút, không có câu');
assert.ok(!/đã bắt đầu|thành công/i.test(SIM_NO_CONFIG_TEXT), 'không báo thành công giả');

console.log('simStartGate.test: đạt');
