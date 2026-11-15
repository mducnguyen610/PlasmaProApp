/* global __dirname */
// Chạy: node src/lib/device/configCommand.test.cjs
// Stage 9C (gói C): điều kiện gửi và bước của T01 giống hệt logic cũ trong màn; vòng đời lệnh tách gửi, ACK, máy chạy;
// gửi một lần, không tự gửi lại; lỗi ghi nhật ký không đổi kết quả.
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
  new Function('require', 'module', 'exports', code)((name) => load(path.relative(__dirname, path.resolve(path.dirname(full), name))), mod, mod.exports);
  cache[full] = mod.exports;
  return mod.exports;
}
const { configCommandView, sendTreatmentConfig, sendTreatmentConfigOnce, createSingleFlight } = load('configCommand');
const { nakHint } = load('labels');

// Logic cũ trong connect-device.tsx (trước Stage 9C gói C), chép nguyên văn để so.
function oldLogic({ linkState, identity, hasQueryInfo, appProtocolVersion, configReady, hasDevice, sending, result }) {
  const idInfo = identity?.kind === 'known' ? identity.info : null;
  const versionMismatch = !!idInfo && idInfo.protocolVersion !== appProtocolVersion;
  const noDevice = !hasDevice;
  const unidentified = linkState === 'connected' && !!hasQueryInfo && identity?.kind !== 'known';
  const canSend = linkState === 'connected' && configReady && !versionMismatch && !unidentified && !noDevice && !sending;
  const step = result?.kind === 'acked' ? 3 : linkState === 'connected' ? 2 : 1;
  const noRetry = result?.kind === 'nacked' && !nakHint(result.code).retry;
  const readyToSend = linkState === 'connected' && configReady && !versionMismatch && !unidentified && !noDevice;
  const nakBusy = result?.kind === 'nacked' && result.code === 'BUSY';
  return { versionMismatch, unidentified, canSend, step, noRetry, readyToSend, nakBusy };
}

const links = ['disconnected', 'connecting', 'connected', 'error'];
const identities = [null, { kind: 'no_reply' }, { kind: 'disconnected' }, { kind: 'known', info: null, caps: null }, { kind: 'known', info: { kind: 'info', protocolVersion: 1 }, caps: null }, { kind: 'known', info: { kind: 'info', protocolVersion: 2 }, caps: null }];
const results = [null, { kind: 'acked', attempts: 1 }, { kind: 'nacked', code: 'BUSY', attempts: 1 }, { kind: 'nacked', code: 'BAD_FIELDS', attempts: 1 }, { kind: 'nacked', code: 'XYZ', attempts: 1 }, { kind: 'timeout', attempts: 3 }, { kind: 'corrupted', attempts: 3 }, { kind: 'disconnected', attempts: 1 }, { kind: 'incompatible', deviceVersion: 2, appVersion: 1 }, { kind: 'unidentified' }, { kind: 'invalid', errors: [] }];
let n = 0;
for (const linkState of links) for (const identity of identities) for (const hasQueryInfo of [true, false]) for (const configReady of [true, false])
  for (const hasDevice of [true, false]) for (const sending of [true, false]) for (const result of results) {
    const input = { linkState, identity, hasQueryInfo, appProtocolVersion: 1, configReady, hasDevice, sending, result, resultAt: null, sessionState: null, statusAt: null };
    const v = configCommandView(input);
    const o = oldLogic(input);
    for (const k of Object.keys(o)) assert.equal(v[k], o[k], `${k} lệch ở ${JSON.stringify(input)}`);
    n++;
  }

// Vòng đời: ACK chưa phải máy chạy; chỉ STA running nhận từ lúc ACK mới là máy chạy.
const base = { linkState: 'connected', identity: { kind: 'known', info: null, caps: null }, hasQueryInfo: true, appProtocolVersion: 1, configReady: true, hasDevice: true, sending: false };
const ack = { kind: 'acked', attempts: 1 };
const at = '2026-11-16T01:00:10.000Z';
assert.equal(configCommandView({ ...base, result: null, resultAt: null, sessionState: null, statusAt: null }).phase, 'idle');
assert.equal(configCommandView({ ...base, sending: true, result: null, resultAt: null, sessionState: null, statusAt: null }).phase, 'sending');
assert.equal(configCommandView({ ...base, result: ack, resultAt: at, sessionState: 'idle', statusAt: at }).phase, 'accepted', 'ACK + máy rảnh: mới nhận');
assert.equal(configCommandView({ ...base, result: ack, resultAt: at, sessionState: 'running', statusAt: '2026-11-16T01:00:05.000Z' }).phase, 'accepted', 'STA running cũ hơn ACK không tính');
const ex = configCommandView({ ...base, result: ack, resultAt: at, sessionState: 'running', statusAt: '2026-11-16T01:00:12.000Z' });
assert.equal(ex.phase, 'executing'); assert.equal(ex.executionConfirmed, true);
assert.equal(configCommandView({ ...base, result: { kind: 'nacked', code: 'BUSY', attempts: 1 }, resultAt: at, sessionState: 'running', statusAt: '2026-11-16T01:00:12.000Z' }).executionConfirmed, false, 'NAK không bao giờ là máy chạy');
for (const k of ['timeout', 'corrupted', 'disconnected']) assert.equal(configCommandView({ ...base, result: { kind: k, attempts: 3 }, resultAt: at, sessionState: null, statusAt: null }).phase, 'failed');
for (const r of [{ kind: 'nacked', code: 'BUSY', attempts: 1 }, { kind: 'incompatible', deviceVersion: 2, appVersion: 1 }, { kind: 'unidentified' }, { kind: 'invalid', errors: [] }]) assert.equal(configCommandView({ ...base, result: r, resultAt: at, sessionState: null, statusAt: null }).phase, 'rejected');

(async () => {
  const meta = { deviceId: 'd-1', patientId: 'p-1', planId: 'pl-1', planVersion: 2, transport: 'simulated', protocolVersion: 1, capsSource: 'table' };
  // Gửi đúng một lần với mọi kết quả (không tự gửi lại khi NAK hay hết thời gian), ghi nhật ký đúng kết quả.
  for (const r of results.filter(Boolean)) {
    let sends = 0; const logs = [];
    const out = await sendTreatmentConfig({ send: async () => { sends++; return r; }, record: async (l) => { logs.push(l); }, now: () => new Date(at) }, { cfg: 1 }, meta);
    assert.equal(sends, 1, `chỉ gửi một lần (${r.kind})`);
    assert.equal(out.result, r); assert.equal(out.at, at); assert.equal(out.logError, null);
    assert.equal(logs.length, 1); assert.equal(logs[0].result, r.kind);
    assert.equal(logs[0].attempts, 'attempts' in r ? r.attempts : 0);
    assert.equal(logs[0].code, r.kind === 'nacked' ? r.code : undefined);
  }
  // Ghi nhật ký lỗi: kết quả gửi giữ nguyên, lỗi trả riêng.
  const out = await sendTreatmentConfig({ send: async () => ack, record: async () => { throw new Error('quota'); } }, {}, meta);
  assert.equal(out.result, ack); assert.match(String(out.logError), /quota/);
  // Gửi ném lỗi (đường truyền hỏng): không ghi nhật ký giả.
  let logged = 0;
  await assert.rejects(sendTreatmentConfig({ send: async () => { throw new Error('io'); }, record: async () => { logged++; } }, {}, meta), /io/);
  assert.equal(logged, 0);
  // Một lệnh trên dây: chạm đúp khi lệnh đầu chưa xong không gửi khung thứ hai; xong rồi thì gửi được.
  {
    const f = createSingleFlight(); let starts = 0; let release;
    const start = () => { starts++; return new Promise((r) => { release = r; }); };
    const a = f.run(start); const b = f.run(start);
    assert.equal(a, b); assert.equal(starts, 1);
    release(ack); assert.equal(await a, ack);
    await f.run(async () => { starts++; return ack; }); assert.equal(starts, 2);
    // Lệnh lỗi không kẹt hàng.
    await assert.rejects(f.run(async () => { throw new Error('io'); }));
    await f.run(async () => { starts++; return ack; }); assert.equal(starts, 3);
  }
  // Bấm nạp hai lần liền: một khung CFG, một dòng nhật ký, hai lần bấm nhận cùng kết quả.
  {
    let sends = 0; let logs = 0; let release;
    const deps = { send: () => { sends++; return new Promise((r) => { release = r; }); }, record: async () => { logs++; } };
    const a = sendTreatmentConfigOnce(deps, {}, meta); const b2 = sendTreatmentConfigOnce(deps, {}, meta);
    release(ack);
    const [x, y] = await Promise.all([a, b2]);
    assert.equal(sends, 1); assert.equal(logs, 1); assert.equal(x, y);
    // Lần trước xong thì lần bấm sau gửi bình thường.
    const c = sendTreatmentConfigOnce(deps, {}, meta); release(ack); await c;
    assert.equal(sends, 2); assert.equal(logs, 2);
  }
  console.log(`configCommand.test: đạt (${n} tổ hợp so với logic cũ)`);
})().catch((e) => { console.error(e); process.exit(1); });
