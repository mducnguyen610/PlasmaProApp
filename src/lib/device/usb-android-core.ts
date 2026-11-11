// Đường truyền USB thật trên Android, viết thuần trên một giao diện mô-đun gốc tiêm vào,
// để kiểm thử bằng node với mô-đun giả. Bản nối mô-đun gốc thật nằm ở usb-android.ts.

import type { ProtocolSpec, UartSettings, UsbChip, UsbSpec } from './spec';
import type { DeviceTransport, LinkState } from './transport';

export interface UsbDeviceInfo { deviceId: number; vendorId: number; productId: number; name: string; hasPermission: boolean }

export interface Subscription { remove(): void }

/** Hàm của mô-đun gốc `PlasmaUsb` (modules/plasma-usb). */
export interface UsbNative {
  listDevices(): Promise<UsbDeviceInfo[]>;
  requestPermission(deviceId: number): Promise<boolean>;
  open(deviceId: number, baudRate: number, dataBits: number, parity: UartSettings['parity'], stopBits: number): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  close(): Promise<void>;
  addListener(event: 'onData', cb: (e: { bytes: number[] }) => void): Subscription;
  addListener(event: 'onDetached', cb: (e: { deviceId: number }) => void): Subscription;
  addListener(event: 'onError', cb: (e: { message: string }) => void): Subscription;
}

export type UsbMatch = { kind: 'found'; device: UsbDeviceInfo; chip: UsbChip } | { kind: 'none' } | { kind: 'unknown'; seen: UsbDeviceInfo[] };

const hex4 = (n: number) => n.toString(16).toUpperCase().padStart(4, '0');

/** Chọn thiết bị Plasma Pro trong danh sách USB theo VID, PID khai báo trong đặc tả. */
export function matchUsbDevice(devices: UsbDeviceInfo[], usb: UsbSpec | undefined): UsbMatch {
  if (devices.length === 0) return { kind: 'none' };
  for (const want of usb?.devices ?? []) {
    const d = devices.find((x) => x.vendorId === want.vendorId && x.productId === want.productId);
    if (d) return { kind: 'found', device: d, chip: want.chip };
  }
  return { kind: 'unknown', seen: devices };
}

export function describeUnknown(seen: UsbDeviceInfo[]): string {
  return `Không thấy máy Plasma Pro. Thiết bị USB đang cắm: ${seen.map((d) => `${d.name} (${hex4(d.vendorId)}:${hex4(d.productId)})`).join(', ')}.`;
}

export function createUsbAndroidTransport(native: UsbNative, spec: ProtocolSpec, model: string): DeviceTransport {
  const dataCbs: ((b: Uint8Array) => void)[] = [];
  const stateCbs: ((s: LinkState, d?: string) => void)[] = [];
  let state: LinkState = 'disconnected';
  let deviceId: number | null = null;
  let subs: Subscription[] = [];
  // Lần mở đang chạy: gọi open() lần nữa trong lúc chờ thì dùng chung, tránh đăng ký listener hai lần.
  let opening: Promise<void> | null = null;

  const setState = (s: LinkState, detail?: string) => {
    state = s;
    for (const cb of [...stateCbs]) cb(s, detail);
  };
  const unsubscribe = () => {
    for (const s of subs) s.remove();
    subs = [];
  };
  const fail = (detail: string): never => {
    unsubscribe();
    deviceId = null;
    setState('error', detail);
    throw new Error(detail);
  };

  async function doOpen() {
    setState('connecting');
    const m = matchUsbDevice(await native.listDevices(), spec.usb);
    if (m.kind === 'none') return fail('Chưa thấy thiết bị USB nào. Hãy cắm cáp OTG vào máy Plasma Pro.');
    if (m.kind === 'unknown') return fail(describeUnknown(m.seen));
    if (!m.device.hasPermission) {
      setState('connecting', 'Chờ cho phép truy cập USB');
      const ok = await native.requestPermission(m.device.deviceId);
      if (!ok) return fail('Chưa được cho phép truy cập USB. Hãy cắm lại cáp và chọn Cho phép.');
    }
    unsubscribe();
    subs = [
      native.addListener('onData', (e) => {
        const b = Uint8Array.from(e.bytes);
        for (const cb of [...dataCbs]) cb(b);
      }),
      native.addListener('onDetached', (e) => {
        if (e.deviceId !== deviceId) return;
        unsubscribe();
        deviceId = null;
        setState('disconnected', 'Đã rút cáp USB');
      }),
      native.addListener('onError', (e) => {
        if (deviceId === null) return;
        setState('error', e.message);
      }),
    ];
    const u = spec.uart;
    try {
      await native.open(m.device.deviceId, u.baudRate, u.dataBits, u.parity, u.stopBits);
    } catch (e) {
      return fail(e instanceof Error ? e.message : 'Không mở được cổng USB');
    }
    deviceId = m.device.deviceId;
    setState('connected');
  }

  return {
    kind: 'usb-android',
    model,
    open() {
      if (state === 'connected') return Promise.resolve();
      if (!opening) opening = doOpen().finally(() => {
        opening = null;
      });
      return opening;
    },
    async close() {
      unsubscribe();
      deviceId = null;
      try {
        await native.close();
      } finally {
        setState('disconnected');
      }
    },
    async write(data: Uint8Array) {
      if (state !== 'connected') throw new Error('Chưa kết nối');
      await native.write(data);
    },
    onData(cb) {
      dataCbs.push(cb);
      return () => {
        const i = dataCbs.indexOf(cb);
        if (i >= 0) dataCbs.splice(i, 1);
      };
    },
    onState(cb) {
      stateCbs.push(cb);
      return () => {
        const i = stateCbs.indexOf(cb);
        if (i >= 0) stateCbs.splice(i, 1);
      };
    },
  };
}
