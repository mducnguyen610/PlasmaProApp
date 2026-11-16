/* global __dirname */
// Chạy: node src/lib/device/treatmentConfig.test.cjs
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
// Stage 9C (gói C): checkTreatmentConfig cho đúng kết quả như T01 tự gọi validateConfig, configToWire trước đây.
const { PROTOCOL } = load('protocol.config');
const { validateConfig, configToWire } = load('protocol');
const { CAPABILITIES, SIM_MODEL } = load('capabilities');
const { checkTreatmentConfig } = load('treatmentConfig');

const caps = CAPABILITIES[SIM_MODEL];
const at = new Date('2026-11-10T23:30:05Z');
const good = { patientId: 'BN001', minTreatmentTimeSec: 120, energyLevel: 3, treatmentMode: 'cold', at };
// Cách T01 tính trước Stage 9C (chép nguyên văn logic cũ).
const old = (prepared, c) => {
  const cfg = prepared && !('missing' in prepared) ? prepared : null;
  const errors = cfg ? validateConfig(cfg, c, PROTOCOL) : [];
  const wire = cfg && errors.length === 0 ? configToWire(cfg, PROTOCOL) : null;
  return { cfg, errors, wire };
};
const cases = [
  ['chưa có đợt', null, caps],
  ['đợt thiếu trường', { missing: ['energy', 'mode'] }, caps],
  ['hợp lệ', good, caps],
  ['mức ngoài năng lực', { ...good, energyLevel: 7 }, caps],
  ['chế độ lạ', { ...good, treatmentMode: 'laser' }, caps],
  ['chưa biết năng lực', good, null],
  ['mã hồ sơ sai ký tự', { ...good, patientId: 'BN,01' }, caps],
];
for (const [name, prepared, c] of cases) {
  const a = checkTreatmentConfig(prepared, c, PROTOCOL);
  const b = old(prepared, c);
  assert.deepEqual({ cfg: a.cfg, errors: a.errors, wire: a.wire }, b, name);
}
assert.deepEqual(checkTreatmentConfig({ missing: ['duration'] }, caps, PROTOCOL).missing, ['duration']);
assert.equal(checkTreatmentConfig(good, caps, PROTOCOL).missing, null);
assert.ok(checkTreatmentConfig(good, caps, PROTOCOL).wire, 'cấu hình hợp lệ có giá trị trên dây');
assert.equal(checkTreatmentConfig({ ...good, energyLevel: 7 }, caps, PROTOCOL).wire, null, 'còn lỗi thì không có giá trị trên dây');
console.log('treatmentConfig.test: đạt');
