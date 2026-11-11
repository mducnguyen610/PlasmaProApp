/* global __dirname */
// Chạy: node src/lib/device/trace.test.cjs
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
function fakeTimer() {
  let now = 0;
  let seq = 0;
  const q = [];
  return {
    set(fn, ms) { const id = ++seq; q.push({ id, fn, at: now + ms }); return id; },
    clear(id) { const i = q.findIndex((x) => x.id === id); if (i >= 0) q.splice(i, 1); },
    advance(ms) {
      const end = now + ms;
      for (;;) {
        q.sort((a, b) => a.at - b.at || a.id - b.id);
        if (!q.length || q[0].at > end) break;
        const t = q.shift();
        now = t.at;
        t.fn();
      }
      now = end;
    },
    pending: () => q.length,
  };
}
const { PROTOCOL } = load('protocol.config');
const { createSimulatedTransport } = load('simulated');
const { withTrace } = load('trace');
const { sendConfig } = load('sender');
const { encodeConfig } = load('protocol');
const { toHex } = load('bytes');
const { CAPABILITIES, SIM_MODEL } = load('capabilities');

(async () => {
  const timer = fakeTimer();
  const t = withTrace(createSimulatedTransport(PROTOCOL, { timer }), 3);
  const seen = [];
  t.onTrace((e) => seen.push(e.dir));
  await t.open();
  const cfg = { patientId: 'BN001', minTreatmentTimeSec: 120, energyLevel: 3, treatmentMode: 'cold', at: new Date('2026-11-10T23:30:05Z') };
  const r = await sendConfig(t, cfg, CAPABILITIES[SIM_MODEL], PROTOCOL, { timer });
  assert.equal(r.kind, 'acked');
  const tr = t.trace();
  assert.deepEqual(tr.map((e) => e.dir), ['tx', 'rx']);
  assert.equal(tr[0].hex, toHex(encodeConfig(cfg, PROTOCOL)));
  assert.equal(tr[1].ascii, '$ACK,CFG*27..');
  assert.deepEqual(seen, ['tx', 'rx']);
  await sendConfig(t, cfg, CAPABILITIES[SIM_MODEL], PROTOCOL, { timer });
  assert.equal(t.trace().length, 3);
  assert.equal(t.trace()[0].dir, 'rx');
  t.clearTrace();
  assert.equal(t.trace().length, 0);
  assert.equal(t.kind, 'simulated');
  console.log('trace.test: ok');
})().catch((e) => { console.error(e); process.exit(1); });
