// Chạy: node src/lib/plausibility.test.ts
import assert from 'node:assert/strict';
import { areaWarning, previousArea } from './plausibility.ts';

// Hợp lý: không cảnh báo
assert.equal(areaWarning(12.5, { areaCm2: 14, captureDate: '2026-10-01' }), null);
assert.equal(areaWarning(12.5, null), null);
// 0 đã có xác nhận riêng, không cảnh báo ở đây
assert.equal(areaWarning(0, { areaCm2: 14, captureDate: '2026-10-01' }), null);
// Nhầm mm² thành cm² (1250 thay vì 12,5): cảnh báo cả ngưỡng lớn và tỉ lệ
const big = areaWarning(1250, { areaCm2: 12.5, captureDate: '2026-10-01' });
assert.ok(big && big.includes('lớn hơn 200') && big.includes('tăng 100 lần'), String(big));
// Thừa/thiếu một số: giảm 10 lần
assert.ok(areaWarning(1.25, { areaCm2: 12.5, captureDate: '2026-10-01' })?.includes('giảm 10 lần'));
// Ngưỡng biên: đúng gấp 2 thì cảnh báo, 1,9 lần thì không
assert.ok(areaWarning(20, { areaCm2: 10, captureDate: '2026-10-01' }));
assert.equal(areaWarning(19, { areaCm2: 10, captureDate: '2026-10-01' }), null);

// previousArea: chọn lần đo gần nhất trước ngày chụp, cùng vết thương, bỏ ảnh đang sửa và ảnh chưa nhãn
const imgs = [
  { id: 'a', woundId: 'w1', areaCm2: 10, captureDate: '2026-09-01', status: 'labeled' },
  { id: 'b', woundId: 'w1', areaCm2: 8, captureDate: '2026-09-15', status: 'labeled' },
  { id: 'c', woundId: 'w1', areaCm2: null, captureDate: '2026-09-20', status: 'unlabeled' },
  { id: 'd', woundId: 'w2', areaCm2: 50, captureDate: '2026-09-25', status: 'labeled' },
  { id: 'e', woundId: 'w1', areaCm2: 3, captureDate: '2026-10-10', status: 'labeled' },
];
assert.deepEqual(previousArea(imgs, { id: 'c', woundId: 'w1', captureDate: '2026-09-20' }), { areaCm2: 8, captureDate: '2026-09-15' });
assert.deepEqual(previousArea(imgs, { id: 'b', woundId: 'w1', captureDate: '2026-09-15' }), { areaCm2: 10, captureDate: '2026-09-01' });
assert.equal(previousArea(imgs, { id: 'a', woundId: 'w1', captureDate: '2026-09-01' }), null);
console.log('plausibility: tất cả kiểm thử đạt');
