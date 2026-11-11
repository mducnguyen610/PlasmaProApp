// Chạy: node src/lib/assessment.test.ts
import assert from 'node:assert/strict';
import { assessmentError, assessmentSummary, woundAge } from './assessment.ts';

assert.equal(assessmentError({}), 'Hãy chọn loại vết thương.');
assert.equal(assessmentError({ woundType: 'Loét do tì đè', exudate: 'Ít', infection: 'Không có dấu hiệu' }), 'Loét do tì đè cần chọn giai đoạn.');
assert.equal(assessmentError({ woundType: 'Bỏng', exudate: 'Ít' }), 'Hãy chọn dấu hiệu nhiễm trùng.');
assert.equal(assessmentError({ woundType: 'Bỏng', exudate: 'Ít', infection: 'Nghi ngờ' }), null);
assert.equal(
  assessmentSummary({ woundType: 'Loét do tì đè', pressureStage: 'Giai đoạn 2', granulation: '51–75%', exudate: 'Vừa', infection: 'Không có dấu hiệu' }),
  'Loét do tì đè (giai đoạn 2) · mô hạt 51–75% · dịch tiết vừa · nhiễm trùng: không có dấu hiệu',
);
assert.equal(woundAge('2026-11-01', '2026-11-03'), '2 ngày');
assert.equal(woundAge('2026-10-01', '2026-11-03'), '4 tuần');
assert.equal(woundAge('2026-06-01', '2026-11-03'), '5 tháng');
console.log('assessment: ok');
