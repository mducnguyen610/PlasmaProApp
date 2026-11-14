// Chạy: node src/lib/areaProgress.test.ts
// Ca C01 đến C16 trong PLASMA_PRO_P2_TEST_PLAN. Dữ liệu chỉ dùng cho kiểm thử (minh họa), không vào seed.
import assert from 'node:assert/strict';
import { addMonths, changeLine, chartLabel, excludedText, noPointsText, fmtPct, inRange, niceAxis, progressInput, progressSummary, rangeOptions, splitByMethod, summaryText, xScale } from './areaProgress.ts';
import { measurementSource } from './measurementSource.ts';
import { chartPoints } from './woundSummary.ts';

const SW = 'Phần mềm đo trên ảnh', RULER = 'Thước đo trên vết thương';
type Img = Parameters<typeof progressInput>[0][number];
const I = (id: string, captureDate: string, areaCm2: number | null, o: Partial<Img> = {}): Img => ({
  id, woundId: 'w1', captureDate, areaCm2, status: areaCm2 === null ? 'unlabeled' : 'labeled', source: 'doctor', measureMethod: SW,
  history: areaCm2 === null ? [] : [{ at: `${captureDate}T09:00:00Z`, by: 'u-bs', toArea: areaCm2 }], capture: { sourceDateKnown: true }, ...o,
});
const T = '2026-11-13';
const pts = (imgs: Img[]) => progressInput(imgs, 'w1', T, [], measurementSource).points;

// C01: 0 ảnh.
assert.deepEqual(pts([]), []);
assert.equal(progressSummary([]).kind, 'none');
// C02: 1 lần đo.
const one = progressSummary(pts([I('A', '2026-10-01', 12)]));
assert.equal(one.kind, 'one');
assert.equal(summaryText(one).detail, 'Mới có 1 lần đo. Cần thêm lần đo để thấy sự thay đổi.');
assert.equal(summaryText(one).headline, null);
// C03: 10 → 8.
const c3 = progressSummary(pts([I('A', '2026-10-01', 10), I('B', '2026-10-08', 8)]));
assert.ok(c3.kind === 'change' && c3.delta === -2 && fmtPct(c3.pct) === '20,0%');
// C04: D5, 5 điểm, giảm 35,0%, 28 ngày.
const D5 = [I('IMG1', '2026-10-01', 12), I('IMG2', '2026-10-08', 10.5), I('IMG3', '2026-10-15', 9.6), I('IMG4', '2026-10-22', 8.7), I('IMG5', '2026-10-29', 7.8)];
const d5 = pts(D5);
assert.deepEqual(d5.map((p) => p.imageId), ['IMG1', 'IMG2', 'IMG3', 'IMG4', 'IMG5']);
const s5 = progressSummary(d5);
assert.ok(s5.kind === 'change' && s5.days === 28);
assert.deepEqual(summaryText(s5), { headline: '↓ Giảm 35,0% so với lần đo đầu', detail: 'Diện tích giảm từ 12,0 cm² (01/10) xuống 7,8 cm² (29/10), sau 28 ngày.' });
assert.equal(d5[0].enteredBy, 'u-bs', 'người nhập lấy từ measurementSource');
// C05: tăng 8 → 9.
assert.deepEqual(summaryText(progressSummary(pts([I('A', '2026-10-01', 8), I('B', '2026-10-29', 9)]))), { headline: '↑ Tăng 12,5% so với lần đo đầu', detail: 'Diện tích tăng từ 8,0 cm² (01/10) lên 9,0 cm² (29/10), sau 28 ngày.' });
// C06: không đổi.
assert.deepEqual(summaryText(progressSummary(pts([I('A', '2026-10-01', 8), I('B', '2026-10-29', 8)]))), { headline: null, detail: 'Diện tích không đổi so với lần đo ngày 01/10.' });
// C07: X tỉ lệ theo ngày: 90 ngày rồi 7 ngày.
const x = (d: string) => xScale(d, '2026-07-01', '2026-10-06', 0, 970);
assert.equal(x('2026-07-01'), 0); assert.equal(x('2026-09-29'), 900); assert.equal(x('2026-10-06'), 970);
// C08: unlabeled, excluded, sourceDateKnown=false không thành điểm, đếm đúng nhóm.
const c8 = progressInput([I('A', '2026-10-01', 10), I('B', '2026-10-05', null), I('C', '2026-10-06', 9, { status: 'excluded' }), I('D', '2026-10-07', 9, { capture: { sourceDateKnown: false } })], 'w1', T);
assert.deepEqual(c8.points.map((p) => p.imageId), ['A']);
assert.deepEqual(c8.excluded, { unmeasured: 1, unknownDate: 1, invalid: 0, sameDayHidden: 0, rejected: 1 });
assert.deepEqual(c8.unmeasuredDates, ['2026-10-05']);
assert.equal(excludedText(c8.excluded), 'Không đưa vào biểu đồ: 1 ảnh chưa đo, 1 ảnh không rõ ngày chụp, 1 ảnh bác sĩ không dùng.');
// C09: số âm, NaN, vô cực, ngày tương lai, ngày sai.
const c9 = progressInput([I('A', '2026-10-01', -1), I('B', '2026-10-02', NaN), I('C', '2026-10-03', Infinity), I('D', '2026-12-01', 5), I('E', '2026-02-30', 5)], 'w1', T);
assert.equal(c9.points.length, 0); assert.equal(c9.excluded.invalid, 5);
// C10: mốc 0 cm²: có điểm, không phần trăm.
const c10 = progressSummary(pts([I('A', '2026-10-01', 0), I('B', '2026-10-08', 2)]));
assert.equal(c10.kind, 'zeroBase'); assert.equal(summaryText(c10).detail, 'Không tính phần trăm vì lần đo đầu bằng 0 cm².');
// C11: hai phương pháp xen kẽ. Nhóm chính = phương pháp điểm cuối; % luôn theo nhóm chính.
const mix = pts([I('A', '2026-10-01', 14, { measureMethod: RULER }), I('B', '2026-10-08', 12), I('C', '2026-10-15', 13, { measureMethod: RULER }), I('D', '2026-10-22', 9)]);
const sp = splitByMethod(mix);
assert.equal(sp.mainLabel, SW); assert.deepEqual(sp.main.map((p) => p.imageId), ['B', 'D']); assert.deepEqual(sp.others.map((p) => p.imageId), ['A', 'C']);
const sm = progressSummary(mix);
assert.ok(sm.kind === 'change' && sm.base.imageId === 'B' && fmtPct(sm.pct) === '25,0%');
// Nhóm chính chỉ có 1 điểm: không so phần trăm.
const m2 = progressSummary(pts([I('A', '2026-10-01', 14, { measureMethod: RULER }), I('B', '2026-10-08', 12)]));
assert.equal(m2.kind, 'mixed'); assert.equal(summaryText(m2).detail, 'Các lần đo dùng phương pháp khác nhau nên không so phần trăm.');
// Khóa phương pháp: trim, không phân biệt hoa thường; trống là một nhóm riêng.
assert.equal(splitByMethod(pts([I('A', '2026-10-01', 5, { measureMethod: '  phần mềm đo trên ảnh ' }), I('B', '2026-10-02', 4)])).others.length, 0);
assert.equal(splitByMethod(pts([I('A', '2026-10-01', 5, { measureMethod: '' }), I('B', '2026-10-02', 4)])).others.length, 1);
// C12: hai ảnh cùng ngày lấy mã nhỏ nhất, khớp chartPoints.
const c12imgs = [I('IMG0002', '2026-10-08', 10.2), I('IMG0007', '2026-10-08', 10.0), I('IMG0001', '2026-10-01', 12.5)];
const c12 = progressInput(c12imgs, 'w1', T);
assert.deepEqual(c12.points.map((p) => p.imageId), chartPoints(c12imgs).map((i) => i.id));
assert.deepEqual(c12.sameDay.map((p) => p.imageId), ['IMG0007']); assert.equal(c12.excluded.sameDayHidden, 1);
// C13: ảnh của vết khác không lẫn vào.
assert.deepEqual(pts([I('A', '2026-10-01', 5), I('B', '2026-10-02', 4, { woundId: 'w2' })]).map((p) => p.imageId), ['A']);
// C14: khoảng thời gian. Lựa chọn chỉ hiện khi có điểm ngoài khoảng; chỉ còn Toàn bộ khi mọi điểm trong 1 tháng.
assert.equal(addMonths('2026-11-13', -1), '2026-10-13'); assert.equal(addMonths('2026-03-31', -1), '2026-02-28');
const wide = pts([I('A', '2026-04-01', 20), I('B', '2026-09-01', 15), I('C', '2026-11-01', 10)]);
assert.deepEqual(rangeOptions(wide, T), ['m1', 'm3', 'm6', 'all']);
assert.deepEqual(rangeOptions(pts([I('A', '2026-09-01', 15), I('B', '2026-11-01', 10)]), T), ['m1', 'all'], '3 và 6 tháng chứa mọi điểm thì ẩn');
assert.deepEqual(inRange(wide, 'm3', T).map((p) => p.imageId), ['B', 'C']);
assert.deepEqual(rangeOptions(d5.filter((p) => p.date >= '2026-10-15'), T), ['all']);
// C15: làm tròn 12,5 → 8,4 = 32,8%.
const c15 = progressSummary(pts([I('A', '2026-10-01', 12.5), I('B', '2026-10-15', 8.4)]));
assert.ok(c15.kind === 'change' && fmtPct(c15.pct) === '32,8%');
// C16: đánh giá gắn ảnh: chỉ imageId trùng và đã công bố.
const evs = [{ id: 'e1', woundId: 'w1', imageId: 'IMG2', date: '2026-10-08', visibleToPatient: true }, { id: 'e2', woundId: 'w1', imageId: 'IMG3', date: '2026-10-15', visibleToPatient: false }, { id: 'e3', woundId: 'w1', date: '2026-10-22', visibleToPatient: true }];
const c16 = progressInput(D5, 'w1', T, evs, measurementSource).points;
assert.deepEqual(c16.map((p) => p.evaluationId), [null, 'e1', null, null, null]);
// Trục Y từ 0, bước tròn, tối đa 5 khoảng.
assert.deepEqual(niceAxis(12), { max: 15, step: 5 }); assert.deepEqual(niceAxis(8.4), { max: 10, step: 2 }); assert.deepEqual(niceAxis(0), { max: 1, step: 0.2 }); assert.deepEqual(niceAxis(0.7), { max: 0.8, step: 0.2 });
// Nhãn trợ năng: ngày đầy đủ, không từ chủ quan.
const lbl = chartLabel('VT01', d5, 15);
assert.equal(lbl, 'Biểu đồ đường diện tích vết thương VT01. 5 lần đo từ ngày 1 tháng 10 năm 2026 đến ngày 29 tháng 10 năm 2026. Trục dọc từ 0 đến 15 xăng ti mét vuông. Lần đầu 12,0; gần nhất 7,8.');
for (const w of ['lành', 'hồi phục', 'tốt lên', 'xấu đi', 'cải thiện']) {
  assert.ok(!lbl.includes(w));
  for (const s of [s5, c3, c10, m2, one]) { const t = summaryText(s); assert.ok(!`${t.headline} ${t.detail}`.includes(w), w); }
}
// Dòng thay đổi ở thẻ trang chủ (P2-01a).
assert.equal(changeLine(c15), '↓ Giảm 32,8% so với lần đo 01/10');
assert.equal(changeLine(progressSummary(pts([I('A', '2026-10-01', 8), I('B', '2026-10-29', 9)]))), '↑ Tăng 12,5% so với lần đo 01/10');
assert.equal(changeLine(progressSummary(pts([I('A', '2026-10-01', 8), I('B', '2026-10-29', 8)]))), 'Không đổi so với lần đo 01/10');
assert.equal(changeLine(one), null); assert.equal(changeLine(m2), null); assert.equal(changeLine(c10), null);
// Stage 8 (S8-B03): biểu đồ trống vì ảnh có số đo nhưng không rõ ngày chụp: không báo "Chưa có lần đo diện tích".
const z0 = { unmeasured: 0, unknownDate: 0, invalid: 0, sameDayHidden: 0, rejected: 0 };
const s8a = progressInput([I('IMG9', '2026-10-01', 5.5, { capture: { sourceDateKnown: false } })], 'w1', T);
assert.equal(s8a.points.length, 0);
assert.equal(noPointsText(s8a.excluded, 1), 'Chưa có lần đo nào vẽ được trên biểu đồ. Ảnh đã chụp: 1. Không đưa vào biểu đồ: 1 ảnh không rõ ngày chụp.');
assert.equal(noPointsText({ ...z0, unmeasured: 2 }, 2), 'Chưa có lần đo diện tích. Ảnh đã chụp: 2.');
assert.equal(noPointsText({ ...z0, unmeasured: 1, invalid: 1 }, 2), 'Chưa có lần đo nào vẽ được trên biểu đồ. Ảnh đã chụp: 2. Không đưa vào biểu đồ: 1 ảnh chưa đo, 1 ảnh có số đo hoặc ngày không hợp lệ.');
console.log('areaProgress: ok');
