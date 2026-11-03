// Chạy: node src/lib/adherence.test.ts
import assert from 'node:assert/strict';
import { metStreak, monthCells, todayStatus } from './adherence.ts';
import type { DeviceSession } from './types.ts';

// Câu trạng thái trong ngày
assert.equal(todayStatus(0, 2).title, 'Hôm nay: còn 2 lần');
assert.equal(todayStatus(1, 2).detail, 'Đã làm 1/2 lần');
assert.equal(todayStatus(2, 2).title, 'Đã đủ 2/2 lần');
assert.equal(todayStatus(2, 2).kind, 'met');
assert.equal(todayStatus(3, 2).kind, 'over');
assert.equal(todayStatus(1, null).kind, 'no_target');

const ses = (day: string, i: number, status: DeviceSession['status'] = 'completed'): DeviceSession => ({
  sessionId: `${day}-${i}`, deviceId: 'd-1', start: `${day}T0${i}:00:00.000Z`, durationMin: 10, energyWh: null, status, source: 'device',
});
const two = (day: string) => [ses(day, 1), ses(day, 5)];

// Ba ngày đủ liên tiếp, hôm nay chưa đủ: chuỗi 3 (hôm nay không làm đứt chuỗi)
const a = [...two('2026-10-08'), ...two('2026-10-09'), ...two('2026-10-10'), ses('2026-10-11', 1)];
assert.equal(metStreak(a, 2, '2026-10-11', '2026-10-11', '2026-10-01'), 3);
// Hôm nay đã đủ: cộng thêm 1
assert.equal(metStreak([...a, ses('2026-10-11', 6)], 2, '2026-10-11', '2026-10-11', '2026-10-01'), 4);
// Một ngày thiếu làm đứt chuỗi
assert.equal(metStreak([...two('2026-10-08'), ses('2026-10-09', 1), ...two('2026-10-10')], 2, '2026-10-11', '2026-10-11', '2026-10-01'), 1);
// Ngày quá số lần cũng không tính là đạt
assert.equal(metStreak([...two('2026-10-10'), ses('2026-10-10', 7)], 2, '2026-10-11', '2026-10-11', '2026-10-01'), 0);
// Phiên bị ngắt không được tính
assert.equal(metStreak([ses('2026-10-10', 1), ses('2026-10-10', 5, 'interrupted')], 2, '2026-10-11', '2026-10-11', '2026-10-01'), 0);
// Chưa đồng bộ hôm qua: không biết, nên chuỗi 0 dù dữ liệu cũ đều đủ
assert.equal(metStreak([...two('2026-10-08'), ...two('2026-10-09')], 2, '2026-10-11', '2026-10-09', '2026-10-01'), 0);
// Không tính trước ngày bắt đầu liệu trình
assert.equal(metStreak([...two('2026-10-08'), ...two('2026-10-09'), ...two('2026-10-10')], 2, '2026-10-11', '2026-10-11', '2026-10-09'), 2);
// Chưa đặt số lần
assert.equal(metStreak(a, null, '2026-10-11', '2026-10-11', '2026-10-01'), 0);

console.log('adherence: ok');

// Lịch tháng
{
  const s = [...two('2026-10-06'), ses('2026-10-07', 1), ...two('2026-10-08'), ses('2026-10-09', 1), ses('2026-10-09', 3), ses('2026-10-09', 5)];
  const cells = monthCells('2026-10', s, 2, '2026-10-09', '2026-10-05', '2026-12-04', '2026-10-12');
  const at = (d: string) => cells.find((c) => c.date === d)!;
  // 01/10/2026 là thứ Năm: 3 ô đệm (T2, T3, T4)
  assert.equal(cells.slice(0, 3).every((c) => c.date === ''), true);
  assert.equal(cells[3].date, '2026-10-01');
  assert.equal(cells.length % 7, 0);
  assert.equal(at('2026-10-04').kind, 'outside'); // trước ngày bắt đầu
  assert.equal(at('2026-10-05').kind, 'none'); // đã đồng bộ, không dùng
  assert.equal(at('2026-10-06').kind, 'met');
  assert.equal(at('2026-10-07').kind, 'partial');
  assert.equal(at('2026-10-09').kind, 'over');
  assert.equal(at('2026-10-10').kind, 'unsynced'); // sau lần đồng bộ cuối
  assert.equal(at('2026-10-12').kind, 'today');
  assert.equal(at('2026-10-13').kind, 'outside'); // tương lai
}
console.log('monthCells: ok');
