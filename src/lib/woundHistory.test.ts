// Chạy: node src/lib/woundHistory.test.ts
import assert from 'node:assert/strict';
import { buildTimeline, findRecord, groupImagesByDay, imageState, measurementHistory, orderPair, parseSelection, planState, plansOfWound, resolvePair, toggleSelection } from './woundHistory.ts';

const img = (id: string, woundId: string, captureDate: string, areaCm2: number | null, extra: Record<string, unknown> = {}) => ({
  id, woundId, captureDate, areaCm2, status: (areaCm2 === null ? 'unlabeled' : 'labeled') as 'unlabeled' | 'labeled' | 'excluded', measureMethod: areaCm2 === null ? undefined : 'Thước', history: [] as { at: string; by: string; fromArea: number | null; toArea: number | null }[], ...extra,
});
const W1 = { id: 'w-1', patientId: 'p-1' };
const images = [
  img('IMG1', 'w-1', '2026-11-01', 12),
  img('IMG2', 'w-1', '2026-11-05', 10),
  img('IMG3', 'w-1', '2026-11-05', null),
  img('IMG9', 'w-2', '2026-11-06', 4),
];
const evaluations = [
  { id: 'e1', woundId: 'w-1', date: '2026-11-05', visibleToPatient: true, areaCm2: 10 },
  { id: 'e2', woundId: 'w-1', date: '2026-11-03', visibleToPatient: false, areaCm2: null },
  { id: 'e9', woundId: 'w-2', date: '2026-11-04', visibleToPatient: true, areaCm2: 3 },
];
const plans = [
  { id: 'pl1', patientId: 'p-1', woundId: 'w-1', status: 'active' as const, confirmed: true, editedAt: '2026-11-01T09:00:00Z', startDate: '2026-11-01', version: 1 },
  { id: 'pl2', patientId: 'p-1', woundId: 'w-1', status: 'draft' as const, confirmed: false, editedAt: '2026-11-06T09:00:00Z', startDate: '2026-11-07', version: 2 },
  { id: 'plOld', patientId: 'p-1', woundId: undefined, status: 'ended' as const, confirmed: false, editedAt: '2026-10-01T09:00:00Z', startDate: '2026-10-01', version: 0 },
  { id: 'plX', patientId: 'p-2', woundId: 'w-2', status: 'active' as const, confirmed: true, editedAt: '2026-11-02T09:00:00Z', startDate: '2026-11-02', version: 1 },
];
const sessions = [
  { sessionId: 's1', start: '2026-11-02T08:00:00Z', woundId: 'w-1' },
  { sessionId: 's9', start: '2026-11-02T09:00:00Z', woundId: 'w-2' },
];

// Trạng thái lưu theo ngữ nghĩa có sẵn.
assert.equal(imageState({ status: 'labeled' }), 'xac-nhan');
assert.equal(imageState({ status: 'unlabeled' }), 'da-luu');
assert.equal(imageState({ status: 'excluded' }), 'da-loai');
assert.equal(planState({ status: 'draft', confirmed: false }), 'nhap');
assert.equal(planState({ status: 'active', confirmed: true }), 'xac-nhan');
assert.equal(planState({ status: 'paused', confirmed: false }), 'da-luu');

// Đợt cũ không có woundId thuộc vết đầu tiên; vết khác thì không.
assert.deepEqual(plansOfWound(plans, W1, 'w-1').map((p) => p.id), ['pl1', 'pl2', 'plOld']);
assert.deepEqual(plansOfWound(plans, { id: 'w-1b', patientId: 'p-1' }, 'w-1').map((p) => p.id), []);

// Dòng thời gian bác sĩ: đủ loại, chỉ vết w-1, mới trước, thứ tự ổn định.
const doc = buildTimeline({ wound: W1, firstWoundId: 'w-1', images, evaluations, plans, sessions, isDoctor: true });
assert.deepEqual(doc.map((t) => `${t.kind}:${t.id}`), ['dot:pl2', 'danh-gia:e1', 'anh:IMG2', 'anh:IMG3', 'danh-gia:e2', 'buoi:s1', 'dot:pl1', 'anh:IMG1', 'dot:plOld']);
assert.ok(doc.every((t) => !['IMG9', 'e9', 'plX', 's9'].includes(t.id)), 'không lẫn bản ghi vết khác');
assert.equal(doc.find((t) => t.id === 'pl2')?.state, 'nhap');
// Bệnh nhân: không nháp, không đợt chưa xác nhận, không đánh giá nội bộ, không buổi điều trị.
const pat = buildTimeline({ wound: W1, firstWoundId: 'w-1', images, evaluations, plans, sessions, isDoctor: false });
assert.deepEqual(pat.map((t) => `${t.kind}:${t.id}`), ['danh-gia:e1', 'anh:IMG2', 'anh:IMG3', 'dot:pl1', 'anh:IMG1']);
// Vết chưa có lịch sử.
assert.deepEqual(buildTimeline({ wound: { id: 'w-3', patientId: 'p-3' }, firstWoundId: 'w-3', images, evaluations, plans, sessions, isDoctor: true }), []);

// Tìm bản ghi: phải đúng loại và id trong dòng thời gian của vết.
assert.equal(findRecord(doc, 'danh-gia', 'e1')?.id, 'e1');
assert.equal(findRecord(doc, 'anh', 'e1'), null);
assert.equal(findRecord(doc, 'danh-gia', 'e9'), null);
assert.equal(findRecord(pat, 'danh-gia', 'e2'), null);
assert.equal(findRecord(doc, undefined, undefined), null);

// Nhóm ảnh theo ngày, mới trước; nhiều ảnh trong một ngày; ngày chưa rõ ở nhóm cuối; không lẫn vết khác.
const withUnknown = [...images, img('IMG4', 'w-1', '2026-11-08', null, { capture: { sourceDateKnown: false } })];
const groups = groupImagesByDay(withUnknown, 'w-1');
assert.deepEqual(groups.map((g) => [g.date, g.images.map((i) => i.id)]), [['2026-11-05', ['IMG2', 'IMG3']], ['2026-11-01', ['IMG1']], [null, ['IMG4']]]);
assert.deepEqual(groupImagesByDay(images, 'w-3'), []);

// Lịch sử số đo: tách nguồn, giữ số cũ đã thay, số tham khảo chỉ cho bác sĩ.
const mImages = [
  img('IMG1', 'w-1', '2026-11-01', 12, { history: [
    { at: '2026-11-01T10:00:00Z', by: 'u1', fromArea: null, toArea: 13 },
    { at: '2026-11-02T10:00:00Z', by: 'u1', fromArea: 13, toArea: 12 },
  ] }),
  img('IMG2', 'w-1', '2026-11-05', null, { capture: { automaticMeasurement: { areaCm2: 11.8, status: 'estimated_unvalidated' } } }),
  img('IMG9', 'w-2', '2026-11-06', 4),
];
const mDoc = measurementHistory({ woundId: 'w-1', images: mImages, evaluations, isDoctor: true });
assert.deepEqual(mDoc.map((m) => `${m.kind}:${m.recordId}:${m.areaCm2}`), ['danh-gia:e1:10', 'tham-khao:IMG2:11.8', 'bac-si:IMG1:12']);
assert.deepEqual(mDoc.find((m) => m.recordId === 'IMG1')?.replaced?.map((h) => [h.fromArea, h.toArea]), [[13, 12]]);
assert.equal(mDoc.find((m) => m.kind === 'tham-khao')?.refSource, 'ar');
// Số AR không bao giờ thành số bác sĩ (QĐ-1): ảnh IMG2 không có dòng bac-si.
assert.ok(!mDoc.some((m) => m.kind === 'bac-si' && m.recordId === 'IMG2'));
const mPat = measurementHistory({ woundId: 'w-1', images: mImages, evaluations, isDoctor: false });
assert.deepEqual(mPat.map((m) => m.kind), ['danh-gia', 'bac-si']);
// Số AR chưa kiểm chứng ở trạng thái khác thì không hiện.
assert.equal(measurementHistory({ woundId: 'w-1', images: [img('IMG5', 'w-1', '2026-11-01', null, { capture: { automaticMeasurement: { areaCm2: null, status: 'unavailable' } } })], evaluations: [], isDoctor: true }).length, 0);

// Cặp so sánh: mặc định cũ nhất / mới nhất; id lạ hoặc của vết khác bị bỏ, có lý do.
const p0 = resolvePair(images, 'w-1', undefined, undefined);
assert.deepEqual([p0.A?.id, p0.B?.id], ['IMG1', 'IMG3']);
assert.deepEqual(p0.issues, ['thieu-so-do']);
const p1 = resolvePair(images, 'w-1', 'IMG9', 'IMG2');
assert.deepEqual([p1.A?.id, p1.B?.id, p1.issues], ['IMG1', 'IMG2', ['truoc-khong-hop-le']]);
const p2 = resolvePair(images, 'w-1', 'IMG2', 'IMG2');
assert.ok(p2.issues.includes('cung-mot-anh'));
const p3 = resolvePair(withUnknown, 'w-1', 'IMG1', 'IMG4');
assert.ok(p3.issues.includes('thieu-ngay'));
assert.deepEqual(resolvePair(images, 'w-3', 'IMG1', 'IMG2'), { A: null, B: null, issues: [] });

// Lựa chọn ảnh để so sánh: chỉ id của vết, tối đa 2, ảnh thứ ba thay ảnh chọn sớm nhất.
assert.deepEqual(parseSelection('IMG1,IMG9,IMG1,IMG2,IMG3', images, 'w-1'), ['IMG1', 'IMG2']);
assert.deepEqual(parseSelection(undefined, images, 'w-1'), []);
assert.deepEqual(toggleSelection(['IMG1'], 'IMG2'), ['IMG1', 'IMG2']);
assert.deepEqual(toggleSelection(['IMG1', 'IMG2'], 'IMG3'), ['IMG2', 'IMG3']);
assert.deepEqual(toggleSelection(['IMG1', 'IMG2'], 'IMG1'), ['IMG2']);
// Ảnh chụp sớm hơn là "Trước" bất kể thứ tự chọn.
assert.deepEqual(orderPair(['IMG2', 'IMG1'], images)?.map((i) => i.id), ['IMG1', 'IMG2']);
assert.equal(orderPair(['IMG2'], images), null);

console.log('woundHistory: đạt');
