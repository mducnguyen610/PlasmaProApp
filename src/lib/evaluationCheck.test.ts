// Chạy: node src/lib/evaluationCheck.test.ts
import assert from 'node:assert/strict';
import { assessmentError, EXUDATE, INFECTION, PRESSURE, PRESSURE_STAGES, WOUND_TYPES } from './assessment.ts';
import { ASSESSMENT_FIELD, assessmentProblems, evaluationProblems, nextReviewError } from './evaluationCheck.ts';

// Thiếu cả 4 mục (loét tì đè): báo đủ 4, đúng thứ tự của assessmentError.
assert.deepEqual(assessmentProblems(assessmentError, { woundType: PRESSURE }).map((p) => p.key), ['pressureStage', 'exudate', 'infection']);
assert.deepEqual(assessmentProblems(assessmentError, {}).map((p) => p.key), ['woundType', 'exudate', 'infection']);
assert.deepEqual(evaluationProblems(assessmentError, {}, '', '').map((p) => p.label), ['Loại vết thương', 'Dịch tiết', 'Dấu hiệu nhiễm trùng', 'Mức độ']);
assert.deepEqual(evaluationProblems(assessmentError, { woundType: 'Bỏng', exudate: 'Ít', infection: 'Nghi ngờ' }, 'mild', ''), []);
assert.equal(evaluationProblems(assessmentError, { woundType: 'Bỏng', exudate: 'Ít', infection: 'Nghi ngờ' }, 'mild', '31/02/2026')[0].msg, 'Ngày tái đánh giá không tồn tại.');
assert.equal(nextReviewError('1/2/2026'), 'Ngày tái đánh giá theo dạng dd/mm/yyyy.');
assert.equal(nextReviewError('28/02/2026'), null);

// Danh sách và quy tắc không được lệch: mỗi tổ hợp thiếu trường, lỗi đầu tiên của danh sách là đúng câu assessmentError trả về,
// danh sách rỗng khi và chỉ khi assessmentError trả null, và mọi câu đều có trường tương ứng.
const opt = <T,>(xs: readonly T[]) => [undefined, ...xs];
let n = 0;
for (const woundType of opt(WOUND_TYPES)) for (const pressureStage of opt(PRESSURE_STAGES.slice(0, 1))) for (const exudate of opt(EXUDATE.slice(0, 1))) for (const infection of opt(INFECTION.slice(0, 1))) {
  const a = { woundType, pressureStage, exudate, infection };
  const first = assessmentError(a);
  const list = assessmentProblems(assessmentError, a);
  assert.equal(list[0]?.msg ?? null, first);
  assert.equal(list.length === 0, first === null);
  for (const p of list) assert.ok(ASSESSMENT_FIELD[p.msg], `câu chưa có trường: ${p.msg}`);
  // Điền đúng các trường trong danh sách thì assessmentError hết lỗi.
  const fixed = { ...a, ...Object.fromEntries(list.map((p) => [p.key, 'x'])) };
  if (fixed.woundType === 'x') fixed.woundType = 'Bỏng';
  assert.equal(assessmentError(fixed), null);
  n++;
}
console.log(`evaluationCheck: ok (${n} tổ hợp)`);
