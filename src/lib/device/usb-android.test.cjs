/* global __dirname */
// Chạy: node src/lib/device/usb-android.test.cjs
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

const { matchUsbDevice, createUsbAndroidTransport } = load('usb-android-core');
const { PROTOCOL } = load('protocol.config');
const { checkSpec } = load('spec-check');
const { createCodec } = load('codec');
const { sendConfig } = load('sender');
const { capabilitiesFor, SIM_MODEL } = load('capabilities');

const CP = { deviceId: 7, vendorId: 0x10c4, productId: 0xea60, name: 'CP2102N', hasPermission: true };
const OTHER = { deviceId: 3, vendorId: 0x046d, productId: 0xc52b, name: 'Receiver', hasPermission: true };

// Đặc tả có khối usb hợp lệ; mã sai bị bắt.
assert.deepEqual(checkSpec(PROTOCOL), []);
assert.ok(checkSpec({ ...PROTOCOL, usb: { devices: [{ vendorId: 0x1ffff, productId: 1, chip: 'cp210x' }], confirmed: false } }).some((e) => e.includes('vendorId')));
assert.ok(checkSpec({ ...PROTOCOL, usb: { devices: [], confirmed: false } }).some((e) => e.includes('trống')));

// Chọn thiết bị.
assert.equal(matchUsbDevice([], PROTOCOL.usb).kind, 'none');
assert.equal(matchUsbDevice([OTHER], PROTOCOL.usb).kind, 'unknown');
const m = matchUsbDevice([OTHER, CP], PROTOCOL.usb);
assert.equal(m.kind, 'found');
assert.equal(m.device.deviceId, 7);
assert.equal(m.chip, 'cp210x');
assert.equal(matchUsbDevice([CP], undefined).kind, 'unknown');

function fakeNative(devices, opts = {}) {
  const listeners = { onData: [], onDetached: [], onError: [] };
  const n = {
    written: [], opened: null, closed: 0, asked: 0,
    async listDevices() { return devices; },
    async requestPermission() { n.asked++; return opts.grant ?? true; },
    async open(id, baud, bits, parity, stop) {
      if (opts.failOpen) throw new Error('Không chiếm được giao diện USB');
      n.opened = { id, baud, bits, parity, stop };
    },
    async write(b) { n.written.push(Uint8Array.from(b)); if (opts.onWrite) opts.onWrite(b, n); },
    async close() { n.closed++; },
    addListener(ev, cb) { listeners[ev].push(cb); return { remove() { const i = listeners[ev].indexOf(cb); if (i >= 0) listeners[ev].splice(i, 1); } }; },
    emit(ev, payload) { for (const cb of [...listeners[ev]]) cb(payload); },
    count(ev) { return listeners[ev].length; },
  };
  return n;
}

(async () => {
  // Không có thiết bị: lỗi có câu tiếng Việt, trạng thái error.
  {
    const n = fakeNative([]);
    const t = createUsbAndroidTransport(n, PROTOCOL, SIM_MODEL);
    const states = [];
    t.onState((s, d) => states.push([s, d]));
    await assert.rejects(t.open());
    assert.equal(states.at(-1)[0], 'error');
    assert.match(states.at(-1)[1], /cắm cáp OTG/);
  }
  // Thiết bị lạ: báo VID:PID đang cắm.
  {
    const t = createUsbAndroidTransport(fakeNative([OTHER]), PROTOCOL, SIM_MODEL);
    const states = [];
    t.onState((s, d) => states.push([s, d]));
    await assert.rejects(t.open());
    assert.match(states.at(-1)[1], /046D:C52B/);
  }
  // Từ chối quyền.
  {
    const n = fakeNative([{ ...CP, hasPermission: false }], { grant: false });
    const t = createUsbAndroidTransport(n, PROTOCOL, SIM_MODEL);
    const states = [];
    t.onState((s, d) => states.push([s, d]));
    await assert.rejects(t.open());
    assert.equal(n.asked, 1);
    assert.equal(states.at(-1)[0], 'error');
    assert.equal(n.opened, null);
  }
  // Mở cổng lỗi: không giữ listener.
  {
    const n = fakeNative([CP], { failOpen: true });
    const t = createUsbAndroidTransport(n, PROTOCOL, SIM_MODEL);
    await assert.rejects(t.open());
    assert.equal(n.count('onData'), 0);
  }
  // Mở được: dùng thông số UART của đặc tả, xin quyền khi chưa có.
  {
    const n = fakeNative([{ ...CP, hasPermission: false }]);
    const t = createUsbAndroidTransport(n, PROTOCOL, SIM_MODEL);
    assert.equal(t.kind, 'usb-android');
    await assert.rejects(t.write(Uint8Array.of(1)));
    await t.open();
    assert.equal(n.asked, 1);
    assert.deepEqual(n.opened, { id: 7, baud: PROTOCOL.uart.baudRate, bits: PROTOCOL.uart.dataBits, parity: PROTOCOL.uart.parity, stop: PROTOCOL.uart.stopBits });
    // Byte nhận đi tới onData dạng Uint8Array.
    const got = [];
    t.onData((b) => got.push(b));
    n.emit('onData', { bytes: [0x24, 0x41] });
    assert.ok(got[0] instanceof Uint8Array);
    assert.deepEqual([...got[0]], [0x24, 0x41]);
    // Rút thiết bị khác không ảnh hưởng; rút đúng máy thì về disconnected và gỡ listener.
    const states = [];
    t.onState((s, d) => states.push([s, d]));
    n.emit('onDetached', { deviceId: 99 });
    assert.equal(states.length, 0);
    n.emit('onDetached', { deviceId: 7 });
    assert.deepEqual(states.at(-1), ['disconnected', 'Đã rút cáp USB']);
    assert.equal(n.count('onData'), 0);
    await assert.rejects(t.write(Uint8Array.of(1)));
  }
  // Gửi cấu hình đầu cuối qua bản USB với một "firmware" giả trả ACK cho khung CFG.
  {
    const codec = createCodec(PROTOCOL);
    const reader = codec.createReader('app_to_device');
    const n = fakeNative([CP], {
      onWrite(b, self) {
        for (const f of reader.push(b)) {
          if (f.kind === 'frame' && f.message === 'config') {
            const ack = codec.encode('ack', { command: 'config' });
            // Trả về chia hai mảnh như USB thật.
            self.emit('onData', { bytes: [...ack.slice(0, 3)] });
            self.emit('onData', { bytes: [...ack.slice(3)] });
          }
        }
      },
    });
    const t = createUsbAndroidTransport(n, PROTOCOL, SIM_MODEL);
    await t.open();
    const caps = capabilitiesFor(SIM_MODEL);
    const r = await sendConfig(t, { patientId: 'BN001', minTreatmentTimeSec: 120, energyLevel: 3, treatmentMode: 'cold', at: new Date('2026-11-11T02:00:00Z') }, caps, PROTOCOL, {});
    assert.equal(r.kind, 'acked');
    assert.equal(n.written.length, 1);
    await t.close();
    assert.equal(n.closed, 1);
  }
  // Gọi open() hai lần khi lần đầu chưa xong: chỉ một bộ listener, mỗi khối dữ liệu tới một lần, đóng thì gỡ hết.
  {
    const n = fakeNative([CP]);
    const t = createUsbAndroidTransport(n, PROTOCOL, SIM_MODEL);
    const got = [];
    t.onData((b) => got.push(b.length));
    await Promise.all([t.open(), t.open()]);
    assert.equal(n.count('onData'), 1);
    n.emit('onData', { bytes: [1, 2, 3] });
    assert.deepEqual(got, [3]);
    await t.close();
    assert.equal(n.count('onData'), 0);
    assert.equal(n.count('onDetached'), 0);
  }
  console.log('usb-android.test: ok');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
