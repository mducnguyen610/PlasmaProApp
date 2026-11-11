/* global __dirname */
// Chạy: node src/lib/device/sender.test.cjs
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
const flush = async () => { for (let i = 0; i < 5; i++) await new Promise((r) => setImmediate(r)); };
const { PROTOCOL, PROTOCOL_BINARY_EXAMPLE } = load('protocol.config');
const { createSimulatedTransport } = load('simulated');
const { sendConfig, identifyDevice } = load('sender');
const { CAPABILITIES, SIM_MODEL } = load('capabilities');

const caps = CAPABILITIES[SIM_MODEL];
const cfg = { patientId: 'BN001', minTreatmentTimeSec: 120, energyLevel: 3, treatmentMode: 'cold', at: new Date('2026-11-10T23:30:05Z') };

async function run(spec, simOpts, { open = true, cfgPatch = {}, deviceVersion, during, now } = {}) {
  const timer = fakeTimer();
  const sim = createSimulatedTransport(spec, { timer, ...simOpts });
  if (open) await sim.open();
  let result;
  const p = sendConfig(sim, { ...cfg, ...cfgPatch }, caps, spec, { timer, deviceVersion, now }).then((r) => (result = r));
  for (let i = 0; i < 10 && result === undefined; i++) {
    await flush();
    if (result !== undefined) break;
    if (during && i === 0) await during(sim);
    timer.advance(spec.ackTimeoutMs);
  }
  await p;
  return { result, sim, timer };
}

(async () => {
  for (const spec of [PROTOCOL, PROTOCOL_BINARY_EXAMPLE]) {
    const L = spec.framing.kind;
    assert.deepEqual((await run(spec, {})).result, { kind: 'acked', attempts: 1 }, L);
    assert.deepEqual((await run(spec, { dropFirst: 1 })).result, { kind: 'acked', attempts: 2 }, L);
    assert.deepEqual((await run(spec, { dropFirst: 5 })).result, { kind: 'timeout', attempts: 3 }, L);
    const nak = await run(spec, { nakCode: 'BUSY' });
    assert.deepEqual(nak.result, { kind: 'nacked', code: 'BUSY', attempts: 1 }, L);
    assert.equal(nak.sim.received(), 1);
    assert.deepEqual((await run(spec, { corruptFirst: 1 })).result, { kind: 'acked', attempts: 2 }, L);
    assert.equal((await run(spec, { dropFirst: 5 }, { during: (sim) => sim.close() })).result.kind, 'disconnected', L);
    assert.equal((await run(spec, {}, { open: false })).result.kind, 'disconnected', L);
    const inv = await run(spec, {}, { cfgPatch: { patientId: '' } });
    assert.equal(inv.result.kind, 'invalid', L);
    assert.equal(inv.sim.lastConfig(), null);
    const inc = await run(spec, {}, { deviceVersion: 2 });
    assert.deepEqual(inc.result, { kind: 'incompatible', deviceVersion: 2, appVersion: 1 }, L);
    assert.equal(inc.sim.received(), 0);
    // Máy chưa trả lời INF (deviceVersion null): chặn gửi, không ghi khung nào xuống máy (RK3).
    const unid = await run(spec, {}, { deviceVersion: null });
    assert.deepEqual(unid.result, { kind: 'unidentified' }, L);
    assert.equal(unid.sim.received(), 0);
    // Mọi phản hồi đều sai checksum: báo dữ liệu hỏng, không báo nhầm là máy im lặng.
    assert.deepEqual((await run(spec, { corruptFirst: 5 })).result, { kind: 'corrupted', attempts: 3 }, L);
    // Ngày giờ trong khung lấy ở lúc gửi: lần gửi lại sau khi rơi khung đầu mang giây mới.
    let tick = 0;
    const clock = () => new Date(Date.UTC(2026, 10, 10, 23, 30, 5 + 2 * tick++));
    const fresh = await run(spec, { dropFirst: 1 }, { now: clock });
    assert.deepEqual(fresh.result, { kind: 'acked', attempts: 2 }, L);
    assert.equal(fresh.sim.lastConfig().second, 7, L);

    // Sau khi có kết quả, hàm nghe của sendConfig đã được gỡ.
    const timer = fakeTimer();
    const sim = createSimulatedTransport(spec, { timer });
    let calls = 0;
    const orig = sim.onData.bind(sim);
    sim.onData = (cb) => orig((b) => { calls++; cb(b); });
    await sim.open();
    await sendConfig(sim, cfg, caps, spec, { timer });
    calls = 0;
    sim.startSession();
    assert.equal(calls, 0, L);
    sim.stopSession();

    // identifyDevice
    const idOf = async (simOpts, s = spec) => {
      const tm = fakeTimer();
      const t = createSimulatedTransport(s, { timer: tm, ...simOpts });
      await t.open();
      let r;
      const p = identifyDevice(t, s, tm).then((x) => (r = x));
      for (let i = 0; i < 10 && r === undefined; i++) {
        await flush();
        if (r === undefined) tm.advance(s.ackTimeoutMs);
      }
      await p;
      return { r, t };
    };
    const known = (await idOf({})).r;
    assert.equal(known.kind, 'known', L);
    assert.equal(known.caps.source, 'device');
    assert.deepEqual(known.caps.energyLevels, [1, 2, 3, 4, 5]);
    assert.equal(known.info.protocolVersion, 1);
    const coldOnly = (await idOf({ caps: { energyMin: 1, energyMax: 5, modes: ['cold'], timeMinSec: 60, timeMaxSec: 1800 } })).r;
    assert.deepEqual(coldOnly.caps.treatmentModes.map((m) => m.value), ['cold']);
    const quiet = await idOf({ answersQueries: false });
    assert.equal(quiet.r.kind, 'no_reply');
    assert.equal(quiet.t.received(), spec.maxRetries + 1);
    const bare = JSON.parse(JSON.stringify(spec));
    delete bare.messages.query_info; delete bare.messages.info; delete bare.messages.query_caps; delete bare.messages.caps;
    const none = await idOf({}, bare);
    assert.deepEqual(none.r, { kind: 'known', info: null, caps: null });
    assert.equal(none.t.received(), 0);
  }
  console.log('sender.test: ok');
})().catch((e) => { console.error(e); process.exit(1); });
