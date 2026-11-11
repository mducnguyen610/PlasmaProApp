/* global __dirname */
// Chạy: node src/lib/device/simulated.test.cjs
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
const { PROTOCOL, PROTOCOL_BINARY_EXAMPLE } = load('protocol.config');
const { createSimulatedTransport } = load('simulated');
const { createCodec } = load('codec');
const { encodeConfig, encodeQuery, toDeviceMessage } = load('protocol');

(async () => {
  for (const spec of [PROTOCOL, PROTOCOL_BINARY_EXAMPLE]) {
    const label = spec.framing.kind;
    const listen = (t) => {
      const reader = createCodec(spec).createReader('device_to_app');
      const got = [];
      t.onData((b) => { for (const f of reader.push(b)) if (f.kind === 'frame') got.push(toDeviceMessage(f, spec)); });
      return got;
    };

    const bad = createSimulatedTransport(spec, { failOpen: true });
    const states = [];
    bad.onState((s) => states.push(s));
    await assert.rejects(bad.open());
    assert.equal(states[states.length - 1], 'error', label);
    await assert.rejects(createSimulatedTransport(spec).write(new Uint8Array([1])));

    const timer = fakeTimer();
    const sim = createSimulatedTransport(spec, { timer, tickMs: 1000 });
    const got = listen(sim);
    await sim.open();
    sim.startSession();
    assert.equal(got.length, 0, label + ': chưa có cấu hình thì không phát');
    await sim.write(encodeConfig({ patientId: 'BN001', minTreatmentTimeSec: 3, energyLevel: 3, treatmentMode: 'cold', at: new Date() }, spec));
    assert.deepEqual(got.pop(), { kind: 'ack', command: 'config' });
    sim.startSession();
    for (let i = 0; i < 3; i++) timer.advance(1000);
    assert.deepEqual(got.map((m) => [m.state, m.remainingSec]), [['running', 3], ['running', 2], ['running', 1], ['done', 0]], label);
    got.length = 0;
    sim.startSession();
    timer.advance(1000);
    sim.stopSession();
    assert.deepEqual(got.map((m) => m.state), ['running', 'running', 'stopped'], label);
    assert.equal(timer.pending(), 0);

    got.length = 0;
    await sim.write(encodeQuery('query_info', spec));
    assert.deepEqual(got.pop(), { kind: 'info', protocolVersion: spec.protocolVersion, firmwareVersion: 'sim', model: 'SIM-PLASMA' });
    const quiet = createSimulatedTransport(spec, { answersQueries: false });
    const g2 = listen(quiet);
    await quiet.open();
    await quiet.write(encodeQuery('query_info', spec));
    assert.equal(g2.length, 0);
  }
  console.log('simulated.test: ok');
})().catch((e) => { console.error(e); process.exit(1); });
