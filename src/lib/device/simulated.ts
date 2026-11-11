// Thiết bị giả lập dựng từ chính đặc tả giao thức: đổi đặc tả (kể cả sang khung nhị phân) thì giả lập tự nói theo.

import { SIM_MODEL } from './capabilities';
import { createCodec } from './codec';
import type { DecodedFrame } from './codec';
import { realTimer } from './sender';
import type { Timer } from './sender';
import type { ProtocolSpec, SessionState, WireValues } from './spec';
import type { DeviceTransport, LinkState } from './transport';

export interface SimCaps { energyMin: number; energyMax: number; modes: string[]; timeMinSec: number; timeMaxSec: number }

export interface SimOptions {
  model?: string;
  /** Bỏ qua N khung đầu, để kiểm gửi lại. */
  dropFirst?: number;
  /** N phản hồi cấu hình đầu có checksum sai. */
  corruptFirst?: number;
  nakCode?: string | null;
  failOpen?: boolean;
  tickMs?: number;
  timer?: Timer;
  /** false: không trả lời INF, CAP (như firmware chưa cài lệnh hỏi). */
  answersQueries?: boolean;
  protocolVersion?: number;
  /** Năng lực giả lập, không phải số liệu thật của Plasma Pro. */
  caps?: SimCaps;
}

export type SimulatedTransport = DeviceTransport & { lastConfig(): WireValues | null; received(): number; startSession(): void; stopSession(): void };

const DEFAULT_CAPS: SimCaps = { energyMin: 1, energyMax: 5, modes: ['cold', 'hybrid', 'thermal'], timeMinSec: 60, timeMaxSec: 1800 };

export function createSimulatedTransport(spec: ProtocolSpec, opts: SimOptions = {}): SimulatedTransport {
  const codec = createCodec(spec);
  const reader = codec.createReader('app_to_device');
  const timer = opts.timer ?? realTimer;
  const tickMs = opts.tickMs ?? 1000;
  const dataCbs: ((b: Uint8Array) => void)[] = [];
  const stateCbs: ((s: LinkState, d?: string) => void)[] = [];
  let state: LinkState = 'disconnected';
  let received = 0;
  let corrupted = 0;
  let config: WireValues | null = null;
  let session: { handle: unknown; left: number } | null = null;

  const setState = (s: LinkState, detail?: string) => {
    state = s;
    for (const cb of [...stateCbs]) cb(s, detail);
  };
  const emit = (b: Uint8Array) => {
    for (const cb of [...dataCbs]) cb(b);
  };
  const reply = (message: Parameters<typeof codec.encode>[0], values: WireValues) => emit(codec.encode(message, values));

  const nakValue = (code: string): string | number => {
    const f = spec.messages.nak.fields.find((x) => x.name === 'code');
    if (f && f.field.type === 'enum') {
      const map = f.field.map;
      return map[code] ?? Object.values(map)[0];
    }
    return code;
  };
  const nak = (code: string) => reply('nak', { command: 'config', code: nakValue(code) });

  const corrupt = (b: Uint8Array): Uint8Array => {
    const out = Uint8Array.from(b);
    if (spec.framing.kind === 'text') {
      // Đổi một chữ số hex của checksum để vẫn là hex nhưng sai giá trị.
      const i = out.length - spec.framing.end.length - 1;
      out[i] = out[i] === 0x30 ? 0x31 : 0x30;
    } else out[out.length - 1] ^= 0x01;
    return out;
  };

  const handle = (f: DecodedFrame) => {
    received++;
    if (received <= (opts.dropFirst ?? 0)) return;
    if (f.kind === 'bad_checksum') return nak('BAD_CHECKSUM');
    if (f.kind === 'malformed') return nak('BAD_FIELDS');
    if (f.message === 'query_info' || f.message === 'query_caps') {
      if (opts.answersQueries === false) return;
      if (f.message === 'query_info') return reply('info', { protocol_version: opts.protocolVersion ?? spec.protocolVersion, firmware_version: 'sim', model: 'SIM-PLASMA' });
      const c = opts.caps ?? DEFAULT_CAPS;
      const mf = spec.messages.config.fields.find((x) => x.name === 'treatment_mode');
      const map = mf && mf.field.type === 'enum' ? mf.field.map : {};
      let mask = 0;
      for (const m of c.modes) if (map[m] !== undefined) mask |= 1 << map[m];
      return reply('caps', { energy_min: c.energyMin, energy_max: c.energyMax, mode_mask: mask, time_min_s: c.timeMinSec, time_max_s: c.timeMaxSec });
    }
    if (f.message !== 'config') return;
    if (opts.nakCode) return nak(opts.nakCode);
    if (corrupted < (opts.corruptFirst ?? 0)) {
      corrupted++;
      return emit(corrupt(codec.encode('ack', { command: 'config' })));
    }
    config = { ...f.values };
    reply('ack', { command: 'config' });
  };

  const status = (s: SessionState, left: number) => reply('status', { state: spec.statusStates[s], remaining_s: left });
  const stopTimer = () => {
    if (session) timer.clear(session.handle);
    session = null;
  };

  return {
    kind: 'simulated',
    model: opts.model ?? SIM_MODEL,
    open() {
      setState('connecting');
      if (opts.failOpen) {
        setState('error', 'Không mở được cổng (giả lập)');
        return Promise.reject(new Error('Không mở được cổng (giả lập)'));
      }
      setState('connected');
      return Promise.resolve();
    },
    close() {
      stopTimer();
      setState('disconnected');
      return Promise.resolve();
    },
    write(data) {
      if (state !== 'connected') return Promise.reject(new Error('Chưa kết nối'));
      for (const f of reader.push(data)) handle(f);
      return Promise.resolve();
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
    lastConfig: () => config,
    received: () => received,
    startSession() {
      if (!config || state !== 'connected') return;
      stopTimer();
      const f = spec.messages.config.fields.find((x) => x.name === 'min_treatment_time');
      const left = Number(config.min_treatment_time) * (f?.divisor ?? 1);
      const current = { handle: null as unknown, left };
      session = current;
      status('running', left);
      // Timer là hẹn giờ một lần, nên mỗi nhịp tự hẹn nhịp kế tiếp.
      const tick = () => {
        if (session !== current) return;
        current.left--;
        if (current.left <= 0) {
          session = null;
          status('done', 0);
        } else {
          status('running', current.left);
          current.handle = timer.set(tick, tickMs);
        }
      };
      current.handle = timer.set(tick, tickMs);
    },
    stopSession() {
      if (!session) return;
      const left = session.left;
      stopTimer();
      status('stopped', left);
    },
  };
}
