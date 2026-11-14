// Chạy: node src/lib/deviceStatusView.test.ts
import assert from 'node:assert/strict';
import { deviceStatusView } from './deviceStatusView.ts';

const base = { linkState: 'connected' as const, sessionState: null, sessionView: 'none' as const, readyToSend: null };

// Kênh cáp
assert.equal(deviceStatusView({ ...base, linkState: 'disconnected' }), 'disconnected');
assert.equal(deviceStatusView({ ...base, linkState: 'connecting' }), 'connecting');
assert.equal(deviceStatusView({ ...base, linkState: 'error' }), 'error');
assert.equal(deviceStatusView(base), 'connected');

// Ready chỉ khi màn T01 tính đủ điều kiện, và chỉ khi còn kết nối
assert.equal(deviceStatusView({ ...base, readyToSend: true }), 'ready');
assert.equal(deviceStatusView({ ...base, readyToSend: false }), 'connected');
assert.equal(deviceStatusView({ ...base, linkState: 'disconnected', readyToSend: true }), 'disconnected');
assert.equal(deviceStatusView({ ...base, linkState: 'error', readyToSend: true }), 'error');
// Máy không trả lời lệnh hỏi thông tin: không rõ, không phải Ready
assert.equal(deviceStatusView({ ...base, readyToSend: true, unidentified: true }), 'unknown');

// Phiên
assert.equal(deviceStatusView({ ...base, sessionState: 'running', sessionView: 'live', readyToSend: true }), 'busy');
assert.equal(deviceStatusView({ ...base, nakBusy: true }), 'busy');
assert.equal(deviceStatusView({ ...base, sessionState: 'error', sessionView: 'live' }), 'error');
assert.equal(deviceStatusView({ ...base, sessionState: 'done', sessionView: 'live' }), 'connected');
// Quá ngưỡng không có STA khi đang điều trị: không rõ, không giả định còn chạy
assert.equal(deviceStatusView({ ...base, sessionState: 'running', sessionView: 'stale' }), 'unknown');
// Mất kết nối khi phiên chưa kết thúc: không rõ, không hiện "Đã kết nối" hay "Chưa kết nối"
assert.equal(deviceStatusView({ ...base, linkState: 'disconnected', sessionState: 'running', sessionView: 'lost' }), 'unknown');
assert.equal(deviceStatusView({ ...base, linkState: 'connecting', sessionState: 'running', sessionView: 'lost' }), 'unknown');
// Mất kết nối sau khi máy đã báo kết thúc: là sự kiện đã nhận, hiện đúng trạng thái cáp
assert.equal(deviceStatusView({ ...base, linkState: 'disconnected', sessionState: 'stopped', sessionView: 'live' }), 'disconnected');
console.log('deviceStatusView: đạt');
