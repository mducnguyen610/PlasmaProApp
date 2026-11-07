// Chạy: node src/lib/adherence.test.ts
import assert from 'node:assert/strict';
import { monthCells } from './adherence.ts';
import type { DeviceSession } from './types.ts';

const ses = (day: string, i: number, status: DeviceSession['status'] = 'completed'): DeviceSession => ({
  sessionId: `${day}-${i}`, deviceId: 'd-1', start: `${day}T0${i}:00:00.000Z`, durationMin: 10, energyWh: null, status, source: 'device',
});
const two = (day: string) => [ses(day, 1), ses(day, 5)];

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
// Lịch theo đợt: ngày nghỉ theo lịch không bị tính là "không dùng"
{
  const odd = (d: string) => Number(d.slice(8)) % 2 === 1; // giả lập lịch cách ngày
  const s = [ses('2026-10-05', 1), ses('2026-10-06', 1)];
  const cells = monthCells('2026-10', s, 1, '2026-10-09', '2026-10-05', '2026-10-31', '2026-10-10', odd);
  const at = (d: string) => cells.find((c) => c.date === d)!;
  assert.equal(at('2026-10-05').kind, 'met');
  assert.equal(at('2026-10-06').kind, 'over'); // chiếu vào ngày nghỉ
  assert.equal(at('2026-10-08').kind, 'rest');
  assert.equal(at('2026-10-07').kind, 'none'); // ngày có lịch, đã đồng bộ, không chiếu
  assert.equal(at('2026-10-11').kind, 'planned');
  assert.equal(at('2026-10-12').kind, 'rest');
}
console.log('monthCells: ok');
