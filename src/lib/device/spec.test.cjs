/* global __dirname */
// Chạy: node src/lib/device/spec.test.cjs
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
const { PROTOCOL, PROTOCOL_BINARY_EXAMPLE } = load('protocol.config');
const { checkSpec } = load('spec-check');

assert.deepEqual(checkSpec(PROTOCOL), []);
assert.deepEqual(checkSpec(PROTOCOL_BINARY_EXAMPLE), []);

const clone = (s) => JSON.parse(JSON.stringify(s));
function withConfig(fn) {
  const s = clone(PROTOCOL);
  fn(s, s.messages.config.fields);
  return checkSpec(s);
}
function fails(errs, label) {
  assert.ok(errs.length > 0, 'checkSpec phải báo lỗi: ' + label);
}
fails(withConfig((s, f) => s.messages.config.fields.splice(f.findIndex((x) => x.name === 'energy_level'), 1)), 'thiếu energy_level');
fails(withConfig((s, f) => f.push({ name: 'session_count', field: { type: 'uint', bytes: 1 } })), 'trường lạ');
fails(withConfig((s, f) => { f.find((x) => x.name === 'treatment_mode').field.map = { cold: 0, hybrid: 0, thermal: 2 }; }), 'mã enum trùng');
fails(withConfig((s, f) => { f.find((x) => x.name === 'patient_id').field.charset = 'A-Z,'; }), 'charset chứa dấu phẩy');
fails(withConfig((s) => { s.messages.status.token = 'ACK'; }), 'token trùng');
fails(withConfig((s) => { delete s.messages.info; }), 'thiếu info');
fails(withConfig((s, f) => { const t = f.find((x) => x.name === 'min_treatment_time'); t.field.bytes = 1; t.max = 1800; }), 'max không vừa độ rộng');
console.log('spec.test: ok');
