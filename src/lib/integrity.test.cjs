/* global __dirname */
// Chạy: node src/lib/integrity.test.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = {};
function load(file) {
  if (/\.(png|jpe?g)$/.test(file)) return 1; // ảnh mẫu: số hiệu tài nguyên giả
  const full = path.resolve(__dirname, file + '.ts');
  if (cache[full]) return cache[full];
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)(name => load(path.relative(__dirname, path.resolve(path.dirname(full), name))), mod, mod.exports);
  cache[full] = mod.exports;
  return mod.exports;
}
// Stage 9C (gói D): dữ liệu mẫu không có bản ghi mồ côi hay lệch bệnh nhân; bộ kiểm bắt được từng kiểu lỗi.
const { checkIntegrity } = load('integrity');
const { createSeed } = load('seed');

const seed = createSeed();
assert.deepEqual(checkIntegrity(seed), [], 'dữ liệu mẫu sạch');

const clone = () => JSON.parse(JSON.stringify(seed));
const codes = (d) => checkIntegrity(d).map((x) => `${x.code}:${x.entity}`);

{ const d = clone(); d.wounds.push({ ...d.wounds[0], id: 'w-x', patientId: 'p-khong-co' }); assert.ok(codes(d).includes('orphan:wound')); }
{ const d = clone(); const other = d.wounds.find((w) => w.patientId !== d.images[0].patientId); d.images[0] = { ...d.images[0], woundId: other.id }; assert.ok(codes(d).includes('cross_patient:image'), 'ảnh gắn vết của bệnh nhân khác'); }
{ const d = clone(); const other = d.wounds.find((w) => w.patientId !== d.plans[0].patientId); d.plans[0] = { ...d.plans[0], woundId: other.id }; assert.ok(codes(d).includes('cross_patient:plan')); }
{ const d = clone(); d.patients.push({ ...d.patients[0] }); assert.ok(codes(d).includes('duplicate_id:patient')); }
{ const d = clone(); d.sessions.push({ ...d.sessions[0], sessionId: 'S-x', deviceId: 'd-khong-co' }); assert.ok(codes(d).includes('orphan:session')); }
{ const d = clone(); const p = d.patients.find((x) => x.deviceId); const dev = d.devices.find((x) => x.id === p.deviceId); dev.patientId = undefined; assert.ok(codes(d).includes('mismatch:patient'), 'hồ sơ và thiết bị trỏ lệch'); }
{ const d = clone(); d.reports.push({ id: 'r-x', patientId: 'p-khong-co', date: '2026-11-15', kind: 'symptom', content: 'x', handled: false }); assert.ok(codes(d).includes('orphan:report')); }
{ const d = clone(); const e = d.evaluations.find((x) => x.imageId); if (e) { const im = d.images.find((x) => x.woundId !== e.woundId); e.imageId = im.id; assert.ok(codes(d).includes('cross_wound:evaluation')); } }

console.log('integrity.test: đạt');
