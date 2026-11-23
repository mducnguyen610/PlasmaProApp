// Chạy: node src/lib/imageLabel.test.ts
// Giai đoạn B (CN2): trạng thái nhãn S1, đủ nhãn K3, xác nhận K1, tập huấn luyện N9/C1/C2, lịch sử N6, viền.
import assert from 'node:assert/strict';
import {
  applyLabelPatch, defaultOutline, isUnused, labelState, missingForConfirm, missingLabelParts, needsLabel, outlineAreaFraction,
  simplifyOutline, suggestImageType, trainingEligible, type ImageLabel,
} from './imageLabel.ts';

const full: ImageLabel = {
  imageType: 'follow_up',
  outline: [[0.1, 0.1], [0.5, 0.1], [0.5, 0.5]],
  outlineSource: 'ai_edited',
  traits: { granulation: { level: 'medium' }, necrosis: { level: 'none' }, exudate: { level: 'low', note: 'dịch trong' }, periwound: { level: 'none' }, infection: { level: 'none' } },
  confidence: 'certain',
  quality: 'pass',
};
const I = (x: object) => ({ id: 'IMG1', patientId: 'p-1', woundId: 'w-1', status: 'unlabeled', ...x }) as never;

// S1
assert.equal(labelState(I({})), 'unlabeled');
assert.equal(labelState(I({ label: { note: 'x' } })), 'draft');
assert.equal(labelState(I({ label: { imageType: 'baseline' } })), 'draft');
assert.equal(labelState(I({ label: full })), 'complete');
assert.equal(labelState(I({ label: { ...full, confirmedAt: 't', confirmedBy: 'u' } })), 'confirmed');
assert.equal(labelState(I({ label: { ...full, quality: 'fail', qualityReason: 'Mờ' } })), 'rejected', 'Không đạt thì Loại');
assert.equal(labelState(I({ label: { ...full, confirmedAt: 't' }, status: 'excluded', excludeReason: 'chụp nhầm' })), 'rejected', 'Không sử dụng thì Loại');
assert.equal(labelState(I({ status: 'excluded' })), 'rejected', 'ảnh đã loại ở dữ liệu cũ');
assert.equal(isUnused(I({ status: 'excluded' })), true);
assert.equal(needsLabel(I({})), true);
assert.equal(needsLabel(I({ label: { note: 'x' } })), true);
assert.equal(needsLabel(I({ label: full })), false);

// K3: loại ảnh + viền + 5 tính chất (tin cậy, chất lượng không thuộc K3)
assert.deepEqual(missingLabelParts(full), []);
assert.deepEqual(missingLabelParts({ ...full, confidence: undefined, quality: undefined }), [], 'K3 không cần tin cậy, chất lượng');
assert.ok(missingLabelParts({ ...full, outline: [[0, 0], [1, 1]] }).includes('vùng vết'), 'viền dưới 3 điểm');
assert.ok(missingLabelParts({ ...full, traits: { ...full.traits, infection: {} } }).join().includes('nhiễm khuẩn'));
assert.ok(missingLabelParts({}).includes('loại ảnh'));
// K1: xác nhận cần thêm tin cậy và chất lượng Đạt
assert.deepEqual(missingForConfirm(full), []);
assert.ok(missingForConfirm({ ...full, confidence: undefined }).includes('mức tin cậy'));
assert.ok(missingForConfirm({ ...full, quality: 'fail' }).join().includes('Đạt'));

// N9, C1, C2
const pYes = { id: 'p-1', researchConsent: true }, pNo = { id: 'p-1', researchConsent: false };
const conf = I({ label: { ...full, confirmedAt: 't', confirmedBy: 'u' } });
assert.equal(trainingEligible(conf, pYes), true);
assert.equal(trainingEligible(conf, pNo), false, 'C1: không đồng ý thì không vào tập');
assert.equal(trainingEligible(I({ label: full }), pYes), false, 'chưa xác nhận');
assert.equal(trainingEligible(I({ label: { ...full, confirmedAt: 't' }, status: 'excluded' }), pYes), false, 'không sử dụng');
assert.equal(trainingEligible(conf, { id: 'p-2', researchConsent: true }), false, 'hồ sơ khác');
assert.equal(trainingEligible(conf, undefined), false);
assert.equal(trainingEligible(I({ source: 'patient', label: { ...full, confirmedAt: 't' } }), pYes), true, 'ảnh bệnh nhân chụp cũng vào khi đã xác nhận');

// applyLabelPatch: lịch sử, bỏ xác nhận khi sửa
const a1 = applyLabelPatch(undefined, { imageType: 'baseline' }, 'u-bs1', 't1');
assert.equal(a1.label.imageType, 'baseline');
assert.equal(a1.label.updatedBy, 'u-bs1');
assert.equal(a1.events.length, 1);
assert.ok(a1.events[0].detail.includes('Ảnh ban đầu'));
const same = applyLabelPatch(a1.label, { imageType: 'baseline' }, 'u-bs1', 't2');
assert.equal(same.events.length, 0, 'không đổi thì không ghi lịch sử');
assert.equal(same.label, a1.label);
const confirmed: ImageLabel = { ...full, confirmedAt: 't', confirmedBy: 'u-bs1' };
const edited = applyLabelPatch(confirmed, { traits: { exudate: { level: 'high' } } }, 'u-bs1', 't3');
assert.equal(edited.label.confirmedAt, undefined, 'sửa sau xác nhận thì về Đang gán');
assert.deepEqual(edited.events.map((e) => e.action), ['save', 'unconfirm']);
assert.equal(edited.label.traits?.granulation?.level, 'medium', 'giữ tính chất khác');
assert.equal(edited.label.traits?.exudate?.level, 'high');
const q = applyLabelPatch({ quality: 'fail', qualityReason: 'Mờ' }, { quality: 'pass' }, 'u', 't');
assert.equal(q.label.qualityReason, undefined, 'Đạt thì bỏ lý do không đạt');

// Viền
const hull = Array.from({ length: 40 }, (_, i) => [i / 40, i / 40] as [number, number]);
assert.equal(simplifyOutline(hull).length, 12);
assert.equal(simplifyOutline(hull.slice(0, 5)).length, 5);
assert.equal(defaultOutline().length, 8);
assert.ok(defaultOutline().every(([x, y]) => x >= 0 && x <= 1 && y >= 0 && y <= 1));
assert.equal(outlineAreaFraction([[0, 0], [1, 0], [1, 1], [0, 1]]), 1);
assert.equal(outlineAreaFraction([[0, 0], [1, 1]]), 0);

// Gợi ý loại ảnh
const imgs = [{ id: 'A', captureDate: '2026-10-01' }, { id: 'B', captureDate: '2026-10-10' }];
assert.equal(suggestImageType({ id: 'A', woundId: 'w', captureDate: '2026-10-01', source: 'doctor' }, imgs), 'baseline');
assert.equal(suggestImageType({ id: 'B', woundId: 'w', captureDate: '2026-10-10', source: 'doctor' }, imgs), 'follow_up');
assert.equal(suggestImageType({ id: 'C', woundId: 'w', captureDate: '2026-10-11', source: 'patient', sessionId: 's' }, imgs), 'post_session');

console.log('imageLabel.test: đạt');
