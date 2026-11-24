// Chạy: node src/lib/sessionSchedule.test.ts
// Logic chốt 25/11/2026 (mục 5, M25, M27..M30): phiên dự kiến tự sinh theo lịch, 9 trạng thái, hoãn và hủy.
import assert from 'node:assert/strict';
import { protocolLastDay, protocolSlots, sessionEndedAt, slotChangeBlocker, slotSummary, versionOn } from './sessionSchedule.ts';

const P = (x: object) => ({ id: 'v1', patientId: 'p-1', woundId: 'w-1', protocolId: 'pr-1', version: 1, status: 'active', confirmed: true, startDate: '2026-11-01', endDate: '2026-11-07', editedAt: '2026-11-01T01:00:00Z', editedBy: 'u-bs', reason: '', durationSec: 180, ...x }) as never;
const S = (x: object) => ({ sessionId: 's', deviceId: 'd-1', start: '2026-11-02T02:00:00Z', durationMin: 3, energyWh: null, status: 'completed', source: 'device', woundId: 'w-1', protocolId: 'pr-1', ...x }) as never;
const C = (x: object) => ({ id: 'c1', protocolId: 'pr-1', patientId: 'p-1', woundId: 'w-1', date: '2026-11-05', kind: 'cancel', reason: 'r', at: '2026-11-03T00:00:00Z', by: 'u-bs', ...x }) as never;
const today = '2026-11-04';
const st = (slots: { date: string; status: string }[]) => Object.fromEntries(slots.map((s) => [s.date, s.status]));

// Mỗi ngày có lịch là một phiên; trạng thái theo ngày và phiên máy báo
const sessions = [
  S({ sessionId: 'a', start: '2026-11-01T02:00:00Z' }),
  S({ sessionId: 'b', start: '2026-11-02T02:00:00Z', status: 'interrupted', endState: 'stopped' }),
  S({ sessionId: 'c', start: '2026-11-03T02:00:00Z', status: 'interrupted', endState: 'error' }),
];
const slots = protocolSlots({ versions: [P({})], sessions, changes: [C({}), C({ id: 'c2', date: '2026-11-06', kind: 'postpone', newDate: '2026-11-09' })], today });
assert.deepEqual(st(slots), {
  '2026-11-01': 'completed', '2026-11-02': 'interrupted', '2026-11-03': 'failed', '2026-11-04': 'due_today',
  '2026-11-05': 'cancelled', '2026-11-06': 'postponed', '2026-11-07': 'upcoming', '2026-11-09': 'upcoming',
});
assert.equal(slots.find((s) => s.date === '2026-11-09')!.originDate, '2026-11-06', 'phiên hoãn sang ngày mới ghi ngày gốc');
// Ngày đã qua không có phiên: Đã bỏ lỡ (hết ngày theo lịch, M30)
assert.equal(st(protocolSlots({ versions: [P({})], sessions: [], changes: [], today }))['2026-11-03'], 'missed');
// Phiên vượt giới hạn (máy không phát) không tính là phiên đã chạy
assert.equal(st(protocolSlots({ versions: [P({})], sessions: [S({ status: 'over_limit', start: '2026-11-02T02:00:00Z' })], changes: [], today }))['2026-11-02'], 'missed');
// Đang thực hiện chỉ khi máy báo STA running (mốc LiveSession), không vì đã gửi lệnh
const now = new Date('2026-11-04T03:01:00Z').getTime();
const live = [{ deviceId: 'd-1', patientId: 'p-1', woundId: 'w-1', startedAt: '2026-11-04T03:00:00Z' }];
assert.equal(st(protocolSlots({ versions: [P({})], sessions: [], changes: [], live, today, nowMs: now }))['2026-11-04'], 'running');
// Mốc đang chạy quá lâu (mất kết nối) thì không hiện Đang thực hiện mãi
assert.equal(st(protocolSlots({ versions: [P({})], sessions: [], changes: [], live, today, nowMs: now + 60 * 60000 }))['2026-11-04'], 'due_today');
// Phiên đã kết thúc sau mốc chạy thì theo phiên máy báo
assert.equal(st(protocolSlots({ versions: [P({})], sessions: [S({ start: '2026-11-04T03:00:00Z' })], changes: [], live, today, nowMs: now }))['2026-11-04'], 'completed');
// Phiên máy ghi vào ngày không có lịch vẫn hiện
const extra = protocolSlots({ versions: [P({ phases: [{ from: '2026-11-01', to: '2026-11-07', pattern: 'every_n_days', n: 2 }] })], sessions: [S({ start: '2026-11-02T02:00:00Z' })], changes: [], today });
assert.equal(extra.find((s) => s.date === '2026-11-02')!.extra, true);

// Phiên bản mới áp dụng từ ngày bác sĩ chọn: lịch đổi từ ngày đó, ngày trước giữ phiên bản cũ
const vers = [P({ phases: [{ from: '2026-11-01', to: '2026-11-07', pattern: 'daily', n: 1 }] }), P({ id: 'v2', version: 2, status: 'scheduled', effectiveFrom: '2026-11-05', phases: [{ from: '2026-11-01', to: '2026-11-07', pattern: 'every_n_days', n: 2 }] })];
assert.equal(versionOn(vers, '2026-11-04')!.id, 'v1');
assert.equal(versionOn(vers, '2026-11-05')!.id, 'v2');
assert.deepEqual(protocolSlots({ versions: vers, sessions: [], changes: [], today }).map((s) => s.date), ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-07']);

// Kết thúc sớm: không sinh phiên sau ngày kết thúc thực tế
const ended = P({ status: 'ended', statusLog: [{ at: '2026-11-03T05:00:00Z', by: 'u', action: 'end', reason: 'x' }] });
assert.equal(protocolLastDay([ended]), '2026-11-03');
assert.equal(protocolSlots({ versions: [ended], sessions: [], changes: [], today }).length, 3);
// Dữ liệu cũ kết thúc không có mốc: dừng trước phác đồ sau
assert.equal(protocolLastDay([P({ status: 'ended' })], '2026-11-04'), '2026-11-03');

// Theo dõi thực hiện
const sum = slotSummary(slots);
assert.deepEqual(sum, { planned: 6, completed: 1, failedOrInterrupted: 2, missed: 0, notDone: 3 });

// Hoãn, hủy chỉ phiên chưa diễn ra; bắt buộc lý do; ngày mới sau ngày phiên
const due = slots.find((s) => s.date === '2026-11-04');
assert.equal(slotChangeBlocker(due, 'cancel', 'bận', null, today), null);
assert.equal(slotChangeBlocker(due, 'cancel', ' ', null, today), 'Nhập lý do hủy.');
assert.equal(slotChangeBlocker(due, 'postpone', 'bận', '2026-11-04', today), 'Ngày mới phải sau ngày của phiên.');
assert.equal(slotChangeBlocker(due, 'postpone', 'bận', '2026-11-08', today), null);
assert.equal(slotChangeBlocker(slots[0], 'cancel', 'x', null, today), 'Chỉ hoãn hoặc hủy phiên chưa diễn ra.');

// Thời điểm máy hoàn thành: trường riêng, phiên cũ tính từ start + thời lượng
assert.deepEqual(sessionEndedAt(S({ endedAt: '2026-11-02T02:03:30Z' })), { at: '2026-11-02T02:03:30Z', estimated: false });
assert.deepEqual(sessionEndedAt(S({})), { at: '2026-11-02T02:03:00.000Z', estimated: true });
console.log('sessionSchedule.test: đạt');
