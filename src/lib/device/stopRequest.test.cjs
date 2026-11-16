/* global __dirname */
// Chạy: node src/lib/device/stopRequest.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = {};
function load(file) {
  const full = path.resolve(__dirname, file + '.ts');
  if (cache[full]) return cache[full];
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => load(path.relative(__dirname, path.resolve(path.dirname(full), name))), mod, mod.exports);
  cache[full] = mod.exports;
  return mod.exports;
}
// Stage 9C (gói C): vòng đời yêu cầu dừng. Gửi yêu cầu, chờ, chỉ xác nhận khi máy gửi trạng thái kết thúc SAU lúc bấm.
const { stopRequestView } = load('stopRequest');
const t0 = Date.parse('2026-11-15T10:00:00Z');
const iso = (ms) => new Date(ms).toISOString();
// Logic T02 trước Stage 9C, chép nguyên văn để so.
const old = ({ stopAt, state, statusAt, now }) => {
  const confirmed = stopAt !== null && !!state && (state === 'stopped' || state === 'done' || state === 'error') && !!statusAt && new Date(statusAt).getTime() >= stopAt;
  return { confirmed, waitSec: stopAt !== null && !confirmed ? Math.max(0, Math.floor((now - stopAt) / 1000)) : null };
};
const cases = [
  ['chưa bấm', { stopAt: null, state: 'running', statusAt: iso(t0), now: t0 }, { confirmed: false, waitSec: null }],
  ['vừa bấm, máy vẫn running', { stopAt: t0, state: 'running', statusAt: iso(t0 + 500), now: t0 + 1500 }, { confirmed: false, waitSec: 1 }],
  ['bản tin stopped CŨ (trước lúc bấm) không được tính', { stopAt: t0, state: 'stopped', statusAt: iso(t0 - 1), now: t0 + 2000 }, { confirmed: false, waitSec: 2 }],
  ['máy gửi stopped sau lúc bấm', { stopAt: t0, state: 'stopped', statusAt: iso(t0 + 800), now: t0 + 900 }, { confirmed: true, waitSec: null }],
  ['máy báo lỗi sau lúc bấm: vẫn là trạng thái kết thúc', { stopAt: t0, state: 'error', statusAt: iso(t0 + 800), now: t0 + 900 }, { confirmed: true, waitSec: null }],
  ['chưa có bản tin nào', { stopAt: t0, state: null, statusAt: null, now: t0 + 7000 }, { confirmed: false, waitSec: 7 }],
  ['chờ lâu, không xác nhận', { stopAt: t0, state: 'running', statusAt: iso(t0 + 100), now: t0 + 30000 }, { confirmed: false, waitSec: 30 }],
  ['đồng hồ lùi: không âm', { stopAt: t0, state: 'running', statusAt: iso(t0), now: t0 - 5000 }, { confirmed: false, waitSec: 0 }],
  ['idle không phải trạng thái kết thúc', { stopAt: t0, state: 'idle', statusAt: iso(t0 + 800), now: t0 + 900 }, { confirmed: false, waitSec: 0 }],
];
for (const [name, input, want] of cases) {
  assert.deepEqual(stopRequestView(input), want, name);
  assert.deepEqual(stopRequestView(input), old(input), `${name}: giống logic cũ`);
}
console.log('stopRequest.test: đạt');
