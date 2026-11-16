// Chạy: node src/lib/commitQueue.test.ts
// Stage 9B (S8-B06): tái hiện mất cập nhật khi hai commit chồng nhau, và kiểm hàng đợi mới.
import assert from 'node:assert/strict';
import { createCommitQueue } from './commitQueue.ts';

type D = { area: number | null; kind: string; n: number; log?: string[] };
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));

/** Bộ nhớ giả: ghi mất `delay` ms, có thể cho lỗi; `mem` là dataRef, `disk` là AsyncStorage. */
function harness(initial: D, opts: { delays?: number[]; failAt?: number[] } = {}) {
  const h = { mem: initial, disk: JSON.stringify(initial), writes: 0 };
  const deps = {
    read: () => h.mem,
    write: async (next: D) => {
      const i = h.writes++;
      await tick(opts.delays?.[i] ?? 5);
      if (opts.failAt?.includes(i)) throw new Error('đầy bộ nhớ');
      h.disk = JSON.stringify(next);
    },
    apply: (next: D) => { h.mem = next; },
    wrapWriteError: (e: unknown) => Object.assign(new Error('PersistError'), { cause: e }),
  };
  return { h, deps };
}

// 1. Tái hiện lỗi cũ: commit cũ tính từ dataRef trước khi chờ ghi. Hai lần gọi liền nhau, lần sau đè mất lần trước.
{
  const { h, deps } = harness({ area: null, kind: 'wound', n: 0 }, { delays: [20, 5] });
  const oldCommit = async (fn: (d: D) => D) => { const next = fn(deps.read()); await deps.write(next); deps.apply(next); };
  await Promise.all([oldCommit((d) => ({ ...d, area: 5.5 })), oldCommit((d) => ({ ...d, kind: 'reference' }))]);
  // Lần ghi số đo xong sau cùng nên đè bản đã đổi loại ảnh: thay đổi loại ảnh bị mất (hành vi được tái hiện, không phải mong muốn).
  assert.equal(h.mem.area, 5.5);
  assert.equal(h.mem.kind, 'wound', 'lỗi cũ: thay đổi loại ảnh bị mất');
}

// 2. Hàng đợi: hai commit chồng nhau đổi hai trường khác nhau, cả hai được giữ, cả trong bộ nhớ và bộ nhớ máy.
{
  const { h, deps } = harness({ area: null, kind: 'wound', n: 0 }, { delays: [20, 5] });
  const commit = createCommitQueue<D>(deps);
  await Promise.all([commit((d) => ({ ...d, area: 5.5 })), commit((d) => ({ ...d, kind: 'reference' }))]);
  assert.deepEqual(h.mem, { area: 5.5, kind: 'reference', n: 0 });
  assert.deepEqual(JSON.parse(h.disk), h.mem, 'bộ nhớ máy khớp màn hình');
}

// 3. Cùng một trường: thứ tự xác định theo thứ tự gọi, mỗi lần tính từ bản mới nhất (tăng đếm không mất lần nào).
{
  const { h, deps } = harness({ area: null, kind: 'wound', n: 0 }, { delays: [15, 1, 8, 2] });
  const commit = createCommitQueue<D>(deps);
  await Promise.all([1, 2, 3, 4].map((i) => commit((d) => ({ ...d, n: d.n + 1, log: [...(d.log ?? []), `c${i}`] }))));
  assert.equal(h.mem.n, 4);
  assert.deepEqual(h.mem.log, ['c1', 'c2', 'c3', 'c4']);
}

// 4. Ghi lỗi: commit đó bị từ chối với PersistError, dữ liệu không đổi; commit sau vẫn chạy trên bản đúng.
{
  const { h, deps } = harness({ area: null, kind: 'wound', n: 0 }, { failAt: [0] });
  const commit = createCommitQueue<D>(deps);
  const a = commit((d) => ({ ...d, area: 9 }));
  const b = commit((d) => ({ ...d, kind: 'reference' }));
  await assert.rejects(a, /PersistError/);
  await b;
  assert.equal(h.mem.area, null, 'lần ghi lỗi không được coi là đã lưu');
  assert.equal(h.mem.kind, 'reference');
  assert.deepEqual(JSON.parse(h.disk), h.mem);
}

// 5. Lỗi kiểm tra trong hàm (ví dụ không có quyền): từ chối, không ghi gì, hàng đợi vẫn chạy tiếp.
{
  const { h, deps } = harness({ area: null, kind: 'wound', n: 0 });
  const commit = createCommitQueue<D>(deps);
  const bad = commit(() => { throw new Error('Chỉ bác sĩ phụ trách'); });
  const ok = commit((d) => ({ ...d, n: 1 }));
  await assert.rejects(bad, /bác sĩ phụ trách/);
  await ok;
  assert.equal(h.writes, 1);
  assert.equal(h.mem.n, 1);
}

// 6. Dữ liệu đổi bằng đường khác (update đồng bộ, ghi ảnh mới) trong lúc chờ ghi: commit tính lại, không xóa thay đổi kia.
{
  const { h, deps } = harness({ area: null, kind: 'wound', n: 0 }, { delays: [20, 5] });
  const commit = createCommitQueue<D>(deps);
  const p = commit((d) => ({ ...d, area: 7 }));
  await tick(5);
  h.mem = { ...h.mem, kind: 'reference' }; // update() đồng bộ chen vào
  await p;
  assert.deepEqual(h.mem, { area: 7, kind: 'reference', n: 0 });
  assert.deepEqual(JSON.parse(h.disk), h.mem);
}

// 7. Tính lại bị từ chối (dữ liệu mới không còn hợp lệ cho thao tác): giữ bản mới nhất, ghi lại bản đó, báo lỗi.
{
  const { h, deps } = harness({ area: null, kind: 'wound', n: 0 }, { delays: [20, 5] });
  const commit = createCommitQueue<D>(deps);
  const p = commit((d) => { if (d.kind === 'excluded') throw new Error('Ảnh đã bị loại'); return { ...d, area: 3 }; });
  await tick(5);
  h.mem = { ...h.mem, kind: 'excluded' };
  await assert.rejects(p, /đã bị loại/);
  assert.deepEqual(h.mem, { area: null, kind: 'excluded', n: 0 });
  assert.deepEqual(JSON.parse(h.disk), h.mem, 'bộ nhớ máy được ghi lại theo màn hình');
}

console.log('commitQueue.test: đạt');
