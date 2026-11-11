// Bọc một đường truyền, ghi mọi byte gửi và nhận để xem dạng hex ở màn chẩn đoán.

import { printable, toHex } from './bytes';
import type { DeviceTransport } from './transport';

export interface TraceEntry { at: string; dir: 'tx' | 'rx'; hex: string; ascii: string }

export type TracedTransport = DeviceTransport & { trace(): TraceEntry[]; clearTrace(): void; onTrace(cb: (e: TraceEntry) => void): () => void };

export function withTrace<T extends DeviceTransport>(t: T, limit = 200): T & TracedTransport {
  let entries: TraceEntry[] = [];
  const listeners: ((e: TraceEntry) => void)[] = [];
  const record = (dir: 'tx' | 'rx', b: Uint8Array) => {
    const e: TraceEntry = { at: new Date().toISOString(), dir, hex: toHex(b), ascii: printable(b) };
    entries.push(e);
    if (entries.length > limit) entries = entries.slice(entries.length - limit);
    for (const l of [...listeners]) l(e);
  };
  t.onData((b) => record('rx', b));
  const wrapped = Object.create(t) as T & TracedTransport;
  wrapped.write = (data: Uint8Array) => {
    record('tx', data);
    return t.write(data);
  };
  wrapped.trace = () => [...entries];
  wrapped.clearTrace = () => {
    entries = [];
  };
  wrapped.onTrace = (cb) => {
    listeners.push(cb);
    return () => {
      const i = listeners.indexOf(cb);
      if (i >= 0) listeners.splice(i, 1);
    };
  };
  return wrapped;
}
