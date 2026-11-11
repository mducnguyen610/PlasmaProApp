/* global __dirname */
// Chạy: node src/lib/device/vectors.test.cjs
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
const { encodeConfig, encodeQuery, toDeviceMessage } = load('protocol');
const { createCodec } = load('codec');
const { toHex, fromHex } = load('bytes');
const { CONFIG_VECTORS, REPLY_VECTORS, QUERY_VECTORS } = load('vectors');

const specOf = (k) => (k === 'text' ? PROTOCOL : PROTOCOL_BINARY_EXAMPLE);
const norm = (h) => toHex(fromHex(h));

for (const v of CONFIG_VECTORS) {
  const cfg = { ...v.config, at: new Date(v.config.atIso) };
  assert.equal(toHex(encodeConfig(cfg, specOf(v.spec))), norm(v.hex), `${v.name} (nguồn ${v.source})`);
}
for (const v of REPLY_VECTORS) {
  const spec = specOf(v.spec);
  const frames = createCodec(spec).createReader('device_to_app').push(fromHex(v.hex));
  assert.equal(frames.length, 1, `${v.name} (nguồn ${v.source}): cần đúng 1 khung`);
  const f = frames[0];
  if (v.expect.kind === 'bad_checksum' || v.expect.kind === 'malformed') assert.equal(f.kind, v.expect.kind, `${v.name} (nguồn ${v.source})`);
  else {
    assert.equal(f.kind, 'frame', `${v.name} (nguồn ${v.source})`);
    assert.deepEqual(toDeviceMessage(f, spec), v.expect, `${v.name} (nguồn ${v.source})`);
  }
}
for (const v of QUERY_VECTORS) assert.equal(toHex(encodeQuery(v.which, PROTOCOL)), norm(v.hex), v.name);
console.log('vectors.test: ok');
