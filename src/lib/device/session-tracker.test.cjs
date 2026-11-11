/* global __dirname */
// Chạy: node src/lib/device/session-tracker.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file) {
  const full = path.resolve(__dirname, file + '.ts');
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(() => ({}), mod, mod.exports);
  return mod.exports;
}
const { createSessionTracker } = load('session-tracker');

const t0 = Date.UTC(2026, 10, 11, 1, 0, 0);
const at = (s) => new Date(t0 + s * 1000);

// Phiên chạy đủ: một bản ghi done, thời lượng từ STA running đầu tới STA done.
{
  const tr = createSessionTracker();
  assert.equal(tr.push({ state: 'idle', remainingSec: 0 }, at(0)), null);
  for (let i = 0; i < 60; i++) assert.equal(tr.push({ state: 'running', remainingSec: 60 - i }, at(1 + i)), null);
  assert.equal(tr.running, true);
  const f = tr.push({ state: 'done', remainingSec: 0 }, at(61));
  assert.equal(f.outcome, 'done');
  assert.equal(f.durationSec, 60);
  assert.equal(f.startedAt.getTime(), at(1).getTime());
  // STA done lặp lại không sinh bản ghi thứ hai.
  assert.equal(tr.push({ state: 'done', remainingSec: 0 }, at(62)), null);
  assert.equal(tr.running, false);
}
// Dừng giữa chừng và lỗi máy đều được ghi, với kết quả tương ứng.
{
  const tr = createSessionTracker();
  tr.push({ state: 'running', remainingSec: 30 }, at(0));
  assert.equal(tr.push({ state: 'stopped', remainingSec: 20 }, at(10)).outcome, 'stopped');
  tr.push({ state: 'running', remainingSec: 30 }, at(20));
  assert.equal(tr.push({ state: 'error', remainingSec: null }, at(25)).outcome, 'error');
}
// Mở màn khi máy đã báo done (chưa thấy running): không ghi.
{
  const tr = createSessionTracker();
  assert.equal(tr.push({ state: 'done', remainingSec: 0 }, at(0)), null);
}
// Mất kết nối giữa phiên: reset bỏ phiên dở, STA done sau khi cắm lại không ghi.
{
  const tr = createSessionTracker();
  tr.push({ state: 'running', remainingSec: 30 }, at(0));
  tr.reset();
  assert.equal(tr.push({ state: 'done', remainingSec: 0 }, at(40)), null);
}
console.log('session-tracker.test: ok');
