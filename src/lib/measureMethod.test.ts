// Chạy: node src/lib/measureMethod.test.ts
import assert from 'node:assert/strict';
import { previousMethod } from './measureMethod.ts';

const im = (id: string, date: string, area: number | null, method?: string, woundId = 'w-1') =>
  ({ id, woundId, captureDate: date, areaCm2: area, status: area === null ? 'unlabeled' : 'labeled', measureMethod: method });
const cur = { id: 'C', woundId: 'w-1', captureDate: '2026-11-10' };

// Lấy lần đo gần nhất trước ảnh hiện tại có ghi phương pháp
assert.deepEqual(previousMethod([im('A', '2026-10-13', 12.5, 'Thước A'), im('B', '2026-10-27', 8.4, 'Thước B')], cur), { method: 'Thước B', imageId: 'B', captureDate: '2026-10-27' });
// Ảnh gần nhất không ghi phương pháp thì lấy ảnh trước đó có ghi
assert.equal(previousMethod([im('A', '2026-10-13', 12.5, 'Thước A'), im('B', '2026-10-27', 8.4)], cur)?.method, 'Thước A');
// Không có lịch sử, chỉ có ảnh sau, ảnh khác vết thương, ảnh chưa đo: không điền
assert.equal(previousMethod([], cur), null);
assert.equal(previousMethod([im('D', '2026-11-20', 7, 'Thước D')], cur), null);
assert.equal(previousMethod([im('E', '2026-10-01', 7, 'Thước E', 'w-2')], cur), null);
assert.equal(previousMethod([im('F', '2026-10-01', null, 'Thước F')], cur), null);
// Bỏ qua ước lượng AR và chuỗi rỗng
assert.equal(previousMethod([im('G', '2026-10-01', 7, 'Ước lượng AR, bác sĩ đã xem lại'), im('H', '2026-10-02', 7, '  ')], cur), null);
// Không lấy chính ảnh hiện tại
assert.equal(previousMethod([im('C', '2026-11-10', 7, 'Thước C')], cur), null);
console.log('measureMethod.test: ok');
