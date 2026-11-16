// Chạy: node src/lib/persistence.test.ts
// Stage 9C (gói D): ghi tuần tự đúng thứ tự gọi, lỗi ghi được báo, dữ liệu hỏng được giữ bản sao, đọc lỗi được báo.
import assert from 'node:assert/strict';
import { createPersistence, SESSION_KEY, STORAGE_KEY, UNREADABLE_PREFIX, type KeyValueStore } from './persistence.ts';

type Op = { key: string; value: string };
function fakeKv(opts: { delays?: number[]; failWrites?: Set<number>; failRead?: boolean } = {}) {
  const mem = new Map<string, string>();
  const done: Op[] = [];
  let n = 0;
  const kv: KeyValueStore = {
    async getItem(k) { if (opts.failRead) throw new Error('read'); return mem.get(k) ?? null; },
    async setItem(k, v) {
      const i = n++;
      await new Promise((r) => setTimeout(r, opts.delays?.[i] ?? 0));
      if (opts.failWrites?.has(i)) throw new Error('quota');
      mem.set(k, v); done.push({ key: k, value: v });
    },
    async removeItem(k) { mem.delete(k); },
  };
  return { kv, mem, done };
}

// 1. Ghi tuần tự: lần ghi đầu chậm hơn vẫn không bị lần sau vượt; bản cuối trong kho là bản gọi sau cùng.
{
  const { kv, mem, done } = fakeKv({ delays: [30, 0, 0] });
  const p = createPersistence<{ v: number }>(kv);
  await Promise.all([p.saveData({ v: 1 }), p.saveData({ v: 2 }), p.saveData({ v: 3 })]);
  assert.deepEqual(done.map((x) => JSON.parse(x.value).v), [1, 2, 3], 'đúng thứ tự gọi');
  assert.equal(JSON.parse(mem.get(STORAGE_KEY)!).v, 3);
}
// 2. Lỗi ghi: ném cho nơi gọi; lần ghi sau vẫn chạy được (hàng không bị kẹt).
{
  const { kv, mem } = fakeKv({ failWrites: new Set([0]) });
  const p = createPersistence<{ v: number }>(kv);
  await assert.rejects(p.saveData({ v: 1 }), /quota/);
  await p.saveData({ v: 2 });
  assert.equal(JSON.parse(mem.get(STORAGE_KEY)!).v, 2);
}
// 3. Chụp dữ liệu lúc gọi: sửa đối tượng sau khi gọi không đổi bản đã xếp hàng.
{
  const { kv, mem } = fakeKv({ delays: [20] });
  const p = createPersistence<{ v: number }>(kv);
  const obj = { v: 1 };
  const w = p.saveData(obj); obj.v = 99; await w;
  assert.equal(JSON.parse(mem.get(STORAGE_KEY)!).v, 1);
}
// 4. Đọc: trống, có dữ liệu, có phiên.
{
  const { kv, mem } = fakeKv();
  const p = createPersistence<{ v: number }>(kv);
  assert.deepEqual(await p.load(), { kind: 'empty', session: null });
  mem.set(STORAGE_KEY, '{"v":5}'); mem.set(SESSION_KEY, 'u-1');
  assert.deepEqual(await p.load(), { kind: 'loaded', data: { v: 5 }, session: 'u-1' });
}
// 5. Dữ liệu hỏng: chép nguyên văn sang khóa sao lưu, khóa chính chưa bị ghi đè.
{
  const { kv, mem } = fakeKv();
  const p = createPersistence<{ v: number }>(kv, () => 1234);
  mem.set(STORAGE_KEY, '{hỏng');
  const r = await p.load();
  assert.deepEqual(r, { kind: 'unreadable', backupKey: UNREADABLE_PREFIX + '1234', session: null });
  assert.equal(mem.get(UNREADABLE_PREFIX + '1234'), '{hỏng');
  assert.equal(mem.get(STORAGE_KEY), '{hỏng');
}
// 6. Dữ liệu hỏng và chép sao lưu cũng lỗi: báo backupKey null.
{
  const { kv, mem } = fakeKv({ failWrites: new Set([0]) });
  const p = createPersistence<{ v: number }>(kv);
  mem.set(STORAGE_KEY, 'x');
  const r = await p.load();
  assert.equal(r.kind, 'unreadable');
  assert.equal(r.kind === 'unreadable' && r.backupKey, null);
}
// 7. Kho không đọc được: báo failed.
{
  const { kv } = fakeKv({ failRead: true });
  const r = await createPersistence(kv).load();
  assert.equal(r.kind, 'failed');
}
// 8. Phiên đăng nhập đi cùng hàng ghi.
{
  const { kv, mem } = fakeKv({ delays: [20, 0] });
  const p = createPersistence<{ v: number }>(kv);
  await Promise.all([p.saveData({ v: 1 }), p.saveSession('u-2')]);
  assert.equal(mem.get(SESSION_KEY), 'u-2');
  await p.clearSession();
  assert.equal(mem.get(SESSION_KEY), undefined);
}
console.log('persistence.test: đạt');
