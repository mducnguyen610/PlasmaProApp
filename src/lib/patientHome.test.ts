// Chạy: node src/lib/patientHome.test.ts
import assert from 'node:assert/strict';
import { patientHomeCourses } from './patientHome.ts';

const c = (id: string, code: string, ws: string, ps?: string) => ({ w: { id, code, status: ws }, plan: ps ? { id: 'pl-' + id, status: ps } : undefined });
// 27/11/2026 (FR6, UR1): nhiều vết đang điều trị thì liệt kê tất cả theo mã vết, không tự chọn vết "đầu tiên".
const list = [c('1', 'VT-05', 'active', 'paused'), c('2', 'VT-04', 'follow_up'), c('3', 'VT-03', 'active', 'active'), c('4', 'VT-01', 'active', 'active'), c('5', 'VT-02', 'awaiting_closure', 'paused'), c('6', 'VT-06', 'follow_up')];
const r = patientHomeCourses(list);
assert.deepEqual(r.treatingAll.map((x) => x.w.id), ['4', '3'], 'mọi vết đang điều trị, theo mã vết');
assert.equal(r.treating, undefined, 'nhiều vết thì không chọn một vết');
assert.equal(r.followUp?.w.id, '2');
assert.equal(r.awaiting?.w.id, '5');
// Thứ tự mảng đầu vào không đổi kết quả (thứ tự ổn định).
const rev = patientHomeCourses([...list].reverse());
assert.deepEqual(rev.treatingAll.map((x) => x.w.id), ['4', '3']);
const one = patientHomeCourses([c('1', 'VT-01', 'active', 'active'), c('2', 'VT-02', 'active', 'paused')]);
assert.equal(one.treating?.w.id, '1', 'đúng một vết thì là vết đó');
const none = patientHomeCourses([c('1', 'VT-01', 'active'), c('2', 'VT-02', 'closed', 'ended')]);
assert.equal(none.treating, undefined); assert.equal(none.followUp, undefined); assert.equal(none.awaiting, undefined);
assert.deepEqual(patientHomeCourses([]), { treatingAll: [], treating: undefined, followUp: undefined, awaiting: undefined });
console.log('patientHome.test: đạt');
