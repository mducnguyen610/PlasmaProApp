// Chạy: node src/lib/patientHome.test.ts
import assert from 'node:assert/strict';
import { patientHomeCourses } from './patientHome.ts';

const c = (id: string, ws: string, ps?: string) => ({ w: { id, status: ws }, plan: ps ? { id: 'pl-' + id, status: ps } : undefined });
// Giống logic cũ trong màn: find đầu tiên cho mỗi loại, giữ thứ tự vết thương.
const list = [c('1', 'active', 'paused'), c('2', 'follow_up'), c('3', 'active', 'active'), c('4', 'active', 'active'), c('5', 'awaiting_closure', 'paused'), c('6', 'follow_up')];
const r = patientHomeCourses(list);
assert.equal(r.treating?.w.id, '3', 'đợt active đầu tiên');
assert.equal(r.followUp?.w.id, '2');
assert.equal(r.awaiting?.w.id, '5');
const none = patientHomeCourses([c('1', 'active'), c('2', 'closed', 'ended')]);
assert.equal(none.treating, undefined); assert.equal(none.followUp, undefined); assert.equal(none.awaiting, undefined);
assert.deepEqual(patientHomeCourses([]), { treating: undefined, followUp: undefined, awaiting: undefined });
console.log('patientHome.test: đạt');
