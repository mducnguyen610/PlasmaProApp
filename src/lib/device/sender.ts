// Máy trạng thái gửi có xác nhận, hết giờ và gửi lại; hỏi thông tin và năng lực của máy.

import { capabilitiesFromDevice } from './capabilities';
import type { DeviceCapabilities } from './capabilities';
import { createCodec } from './codec';
import { encodeConfig, encodeQuery, toDeviceMessage, validateConfig } from './protocol';
import type { ConfigError, DeviceMessage, TreatmentConfig } from './protocol';
import type { ProtocolSpec } from './spec';
import type { DeviceTransport } from './transport';

export type SendResult =
  | { kind: 'acked'; attempts: number }
  | { kind: 'nacked'; code: string; attempts: number }
  | { kind: 'timeout'; attempts: number }
  /** Hết lượt gửi lại, trong thời gian chờ có nhận khung sai checksum hoặc sai cấu trúc từ máy. */
  | { kind: 'corrupted'; attempts: number }
  | { kind: 'disconnected'; attempts: number }
  | { kind: 'incompatible'; deviceVersion: number; appVersion: number }
  /** Máy không trả lời lệnh hỏi thông tin nên chưa kiểm được phiên bản giao thức (RK3). */
  | { kind: 'unidentified' }
  | { kind: 'invalid'; errors: ConfigError[] };

export interface Timer {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export const realTimer: Timer = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

export type RequestResult = { kind: 'reply'; message: DeviceMessage; attempts: number } | { kind: 'timeout' | 'corrupted' | 'disconnected'; attempts: number };

/**
 * Gửi một khung, chờ bản tin mà `accept` nhận; hết giờ thì gửi lại tối đa spec.maxRetries lần.
 * `frame` là hàm thì được gọi lại ở mỗi lần gửi, để khung mang dữ liệu mới (ví dụ đồng hồ) ở từng lần.
 */
export function request(t: DeviceTransport, frame: Uint8Array | (() => Uint8Array), accept: (m: DeviceMessage) => boolean, spec: ProtocolSpec, timer: Timer = realTimer): Promise<RequestResult> {
  return new Promise((resolve) => {
    const reader = createCodec(spec).createReader('device_to_app');
    let attempts = 0;
    let corrupted = false;
    let done = false;
    let handle: unknown = null;
    const offs: (() => void)[] = [];
    const finish = (r: RequestResult) => {
      if (done) return;
      done = true;
      for (const off of offs) off();
      if (handle !== null) timer.clear(handle);
      handle = null;
      resolve(r);
    };
    offs.push(
      t.onData((chunk) => {
        if (done) return;
        for (const f of reader.push(chunk)) {
          if (f.kind !== 'frame') {
            // Khung hỏng không trả lời được lệnh, nhưng phải ghi nhận để không báo nhầm là máy im lặng.
            corrupted = true;
            continue;
          }
          const m = toDeviceMessage(f, spec);
          if (accept(m)) return finish({ kind: 'reply', message: m, attempts });
        }
      }),
    );
    offs.push(
      t.onState((s) => {
        if (s === 'disconnected' || s === 'error') finish({ kind: 'disconnected', attempts });
      }),
    );
    const onTimeout = () => {
      handle = null;
      if (done) return;
      if (attempts <= spec.maxRetries) send();
      else finish({ kind: corrupted ? 'corrupted' : 'timeout', attempts });
    };
    const send = () => {
      attempts++;
      handle = timer.set(onTimeout, spec.ackTimeoutMs);
      let bytes: Uint8Array;
      try {
        bytes = typeof frame === 'function' ? frame() : frame;
      } catch {
        return finish({ kind: 'disconnected', attempts });
      }
      t.write(bytes).catch(() => finish({ kind: 'disconnected', attempts }));
    };
    send();
  });
}

export type DeviceInfo = Extract<DeviceMessage, { kind: 'info' }>;
export type DeviceIdentity = { kind: 'known'; info: DeviceInfo | null; caps: DeviceCapabilities | null } | { kind: 'no_reply' } | { kind: 'disconnected' };

export async function identifyDevice(t: DeviceTransport, spec: ProtocolSpec, timer: Timer = realTimer): Promise<DeviceIdentity> {
  const q = encodeQuery('query_info', spec);
  if (!q) return { kind: 'known', info: null, caps: null };
  const r = await request(t, q, (m) => m.kind === 'info', spec, timer);
  if (r.kind === 'timeout' || r.kind === 'corrupted') return { kind: 'no_reply' };
  if (r.kind !== 'reply' || r.message.kind !== 'info') return { kind: 'disconnected' };
  const info = r.message;
  let caps: DeviceCapabilities | null = null;
  const qc = encodeQuery('query_caps', spec);
  if (qc) {
    const rc = await request(t, qc, (m) => m.kind === 'caps', spec, timer);
    if (rc.kind === 'disconnected') return { kind: 'disconnected' };
    if (rc.kind === 'reply' && rc.message.kind === 'caps') caps = capabilitiesFromDevice(rc.message.values, spec, info.model);
  }
  return { kind: 'known', info, caps };
}

export interface SendOptions {
  timer?: Timer;
  /**
   * Phiên bản giao thức máy báo qua INF. `null`: đặc tả có lệnh hỏi nhưng máy chưa trả lời, chặn gửi (RK3).
   * Bỏ trống: không kiểm, dùng khi đặc tả không có lệnh hỏi thông tin.
   */
  deviceVersion?: number | null;
  /** Đồng hồ điện thoại; gọi lại ở mỗi lần gửi để ngày giờ trong khung là lúc gửi thật (FR2). */
  now?: () => Date;
}

export async function sendConfig(t: DeviceTransport, cfg: TreatmentConfig, caps: DeviceCapabilities | null, spec: ProtocolSpec, opts: SendOptions = {}): Promise<SendResult> {
  const errors = validateConfig(cfg, caps, spec);
  if (errors.length) return { kind: 'invalid', errors };
  const dv = opts.deviceVersion;
  if (dv === null && spec.messages.query_info) return { kind: 'unidentified' };
  if (dv !== null && dv !== undefined && dv !== spec.protocolVersion) return { kind: 'incompatible', deviceVersion: dv, appVersion: spec.protocolVersion };
  const now = opts.now;
  const frame = now ? () => encodeConfig({ ...cfg, at: now() }, spec) : encodeConfig(cfg, spec);
  const r = await request(t, frame, (m) => (m.kind === 'ack' || m.kind === 'nak') && m.command === 'config', spec, opts.timer);
  if (r.kind !== 'reply') return { kind: r.kind, attempts: r.attempts };
  if (r.message.kind === 'nak') return { kind: 'nacked', code: r.message.code, attempts: r.attempts };
  return { kind: 'acked', attempts: r.attempts };
}
