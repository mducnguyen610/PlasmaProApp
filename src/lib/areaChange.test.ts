// Chạy: node src/lib/areaChange.test.ts
import assert from 'node:assert/strict';
import { latestAreaIncrease } from './areaChange.ts';

const im = (id: string, date: string, area: number | null, extra: Record<string, unknown> = {}) =>
  ({ id, captureDate: date, areaCm2: area, status: area === null ? 'unlabeled' : 'labeled', ...extra }) as never;

// Giảm dần: không báo
assert.equal(latestAreaIncrease([im('A1', '2026-10-13', 12.5), im('A2', '2026-10-20', 10.2), im('A3', '2026-10-27', 8.4)]), null);
// Lần sau lớn hơn lần trước: báo, giữ nguyên số bác sĩ nhập
assert.deepEqual(latestAreaIncrease([im('A1', '2026-10-13', 12.5), im('A2', '2026-10-20', 8.4), im('A3', '2026-10-27', 9.1)]),
  { previous: 8.4, latest: 9.1, previousDate: '2026-10-20', latestDate: '2026-10-27' });
// Bằng nhau: không báo
assert.equal(latestAreaIncrease([im('A1', '2026-10-13', 8.4), im('A2', '2026-10-20', 8.4)]), null);
// Chỉ một số đo: không báo
assert.equal(latestAreaIncrease([im('A1', '2026-10-13', 8.4)]), null);
// Bỏ ảnh chưa đo và ảnh chưa rõ ngày chụp
assert.equal(latestAreaIncrease([im('A1', '2026-10-13', 8.4), im('A2', '2026-10-20', null), im('A3', '2026-10-27', 9.9, { capture: { sourceDateKnown: false } })]), null);
// Một ngày nhiều ảnh: lấy ảnh mã nhỏ nhất, không cộng
assert.deepEqual(latestAreaIncrease([im('A1', '2026-10-13', 5), im('A3', '2026-10-20', 4), im('A2', '2026-10-20', 6)])?.latest, 6);
console.log('areaChange.test: ok');
