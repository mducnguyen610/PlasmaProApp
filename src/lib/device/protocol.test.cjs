/* global __dirname */
// Chạy: node src/lib/device/protocol.test.cjs
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
const { deviceClock, validateConfig, configToWire, encodeConfig, encodeQuery, toDeviceMessage } = load('protocol');
const { createCodec } = load('codec');
const { CAPABILITIES, SIM_MODEL, capabilitiesFromDevice } = load('capabilities');
const { asciiToBytes, bytesToAscii, fromHex } = load('bytes');

const clone = (s) => JSON.parse(JSON.stringify(s));
const at = new Date('2026-11-10T23:30:05Z');
const caps = CAPABILITIES[SIM_MODEL];
const good = { patientId: 'BN001', minTreatmentTimeSec: 120, energyLevel: 3, treatmentMode: 'cold', at };

assert.deepEqual(deviceClock(at, 420), { day: 11, month: 11, year: 2026, hour: 6, minute: 30, second: 5 });

// validateConfig
assert.deepEqual(validateConfig(good, caps, PROTOCOL), []);
const errs = (patch, c = caps, spec = PROTOCOL) => validateConfig({ ...good, ...patch }, c, spec);
assert.ok(errs({ patientId: '  ' }).includes('patient_id_empty'));
assert.ok(errs({ patientId: 'A'.repeat(17) }).includes('patient_id_too_long'));
assert.ok(errs({ patientId: 'BN,01' }).includes('patient_id_charset'));
assert.ok(errs({ minTreatmentTimeSec: 0 }).includes('time_invalid'));
assert.ok(errs({ minTreatmentTimeSec: 12.5 }).includes('time_invalid'));
assert.ok(errs({ minTreatmentTimeSec: 30 }, { ...caps, minTreatmentTimeSec: { min: 60, max: 1800 } }).includes('time_out_of_range'));
assert.ok(errs({ energyLevel: 7 }).includes('energy_not_allowed'));
assert.ok(errs({ treatmentMode: 'laser' }).includes('mode_not_allowed'));
assert.ok(errs({ treatmentMode: 'laser' }).includes('mode_not_in_spec'));
assert.ok(errs({}, null).includes('capabilities_unknown'));
assert.ok(errs({ minTreatmentTimeSec: 70000 }).includes('value_out_of_wire_range'));
// Luật mã hồ sơ đọc từ đặc tả, không viết cứng.
const short = clone(PROTOCOL);
short.messages.config.fields.find((f) => f.name === 'patient_id').field.maxLength = 4;
assert.ok(errs({}, caps, short).includes('patient_id_too_long'));

// Đơn vị phút: 90 giây thành 2.
const minutes = clone(PROTOCOL);
Object.assign(minutes.messages.config.fields.find((f) => f.name === 'min_treatment_time'), { divisor: 60, round: 'ceil' });
assert.equal(configToWire({ ...good, minTreatmentTimeSec: 90 }, minutes).min_treatment_time, 2);

// encodeConfig ném lỗi với mã hồ sơ sai, không ném với lỗi phụ thuộc năng lực.
assert.throws(() => encodeConfig({ ...good, patientId: '' }, PROTOCOL));
assert.doesNotThrow(() => encodeConfig({ ...good, energyLevel: 9 }, PROTOCOL));

// Đổi kiểu khung không đổi kết quả đọc lại.
for (const spec of [PROTOCOL, PROTOCOL_BINARY_EXAMPLE]) {
  const frames = createCodec(spec).createReader('app_to_device').push(encodeConfig(good, spec));
  assert.equal(frames.length, 1);
  assert.equal(frames[0].kind, 'frame');
  assert.equal(frames[0].message, 'config');
  assert.deepEqual(frames[0].values, configToWire(good, spec));
  assert.equal(Object.keys(frames[0].values).length, 10);
}
const text = bytesToAscii(encodeConfig(good, PROTOCOL));
assert.ok(text.startsWith('$CFG,BN001,'));
assert.match(text, /\*[0-9A-F]{2}\r\n$/);

// Bộ đọc văn bản
const tc = createCodec(PROTOCOL);
const ack = '$ACK,CFG*27\r\n';
let r = tc.createReader('device_to_app');
assert.equal(r.push(asciiToBytes(ack + ack)).length, 2);
r = tc.createReader('device_to_app');
assert.equal(r.push(asciiToBytes('$AC')).length, 0);
assert.equal(r.push(asciiToBytes('K,CF')).length, 0);
assert.equal(r.push(asciiToBytes('G*27\r\n')).length, 1);
r = tc.createReader('device_to_app');
const g = r.push(asciiToBytes('noise' + ack));
assert.equal(g.length, 1);
assert.equal(g[0].kind, 'frame');
r = tc.createReader('device_to_app');
r.push(asciiToBytes('$' + 'A'.repeat(1100)));
assert.equal(r.buffered, 0);
assert.deepEqual(r.push(asciiToBytes('abc*00\r\n')), []);
r = tc.createReader('device_to_app');
assert.equal(r.push(asciiToBytes('$ACK,CFG\r\n'))[0].kind, 'malformed');
r = tc.createReader('device_to_app');
// Sai số trường: ACK cần 1 trường.
const body = 'ACK,CFG,X';
let x = 0;
for (const c of body) x ^= c.charCodeAt(0);
assert.equal(r.push(asciiToBytes('$' + body + '*' + x.toString(16).toUpperCase().padStart(2, '0') + '\r\n'))[0].kind, 'malformed');
const st = tc.createReader('device_to_app').push(asciiToBytes('$STA,1,42*71\r\n'))[0];
assert.deepEqual(toDeviceMessage(st, PROTOCOL), { kind: 'status', state: 'running', remainingSec: 42 });

// Bộ đọc nhị phân
const bc = createCodec(PROTOCOL_BINARY_EXAMPLE);
const backBytes = fromHex('AA 55 81 01 01 E1 B8');
r = bc.createReader('device_to_app');
let got = [];
for (const b of backBytes) got = got.concat(r.push(Uint8Array.of(b)));
assert.equal(got.length, 1);
assert.deepEqual(toDeviceMessage(got[0], PROTOCOL_BINARY_EXAMPLE), { kind: 'ack', command: 'config' });
r = bc.createReader('device_to_app');
got = r.push(new Uint8Array([0x01, 0x02, 0xaa, ...backBytes]));
assert.equal(got.length, 1);
assert.equal(got[0].kind, 'frame');
// Độ dài khai báo khác tổng độ rộng: tính lại checksum cho đúng để chỉ còn lỗi độ dài.
const { checksumBytes } = load('checksum');
const wrongLen = new Uint8Array([0x81, 0x02, 0x01, 0x00]);
const c1 = checksumBytes('crc16_modbus', wrongLen);
assert.equal(bc.createReader('device_to_app').push(new Uint8Array([0xaa, 0x55, ...wrongLen, c1 & 0xff, c1 >> 8]))[0].kind, 'malformed');
const unknownCode = new Uint8Array([0x7f, 0x00]);
const c2 = checksumBytes('crc16_modbus', unknownCode);
assert.equal(bc.createReader('device_to_app').push(new Uint8Array([0xaa, 0x55, ...unknownCode, c2 & 0xff, c2 >> 8]))[0].kind, 'malformed');

// encodeQuery
const noQuery = clone(PROTOCOL);
delete noQuery.messages.query_info;
assert.equal(encodeQuery('query_info', noQuery), null);
assert.equal(bytesToAscii(encodeQuery('query_info', PROTOCOL)), '$INF*41\r\n');

// Năng lực đọc từ máy
const dc = capabilitiesFromDevice({ energy_min: 1, energy_max: 3, mode_mask: 1, time_min_s: 60, time_max_s: 1800 }, PROTOCOL, 'SIM-PLASMA');
assert.deepEqual(dc.energyLevels, [1, 2, 3]);
assert.deepEqual(dc.treatmentModes.map((m) => m.value), ['cold']);
assert.deepEqual(dc.minTreatmentTimeSec, { min: 60, max: 1800 });
assert.equal(dc.source, 'device');
console.log('protocol.test: ok');
