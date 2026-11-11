// Khung nhị phân: <header> <code 1 byte> <độ dài> <phần tải> <checksum>.
// Checksum tính trên code, độ dài và phần tải; số nhiều byte ghi theo framing.endian.

import { concat } from './bytes';
import { checksumBytes, checksumWidth } from './checksum';
import type { DecodedFrame, FrameCodec, FrameReader } from './codec';
import type { BinaryFraming, Direction, MessageKey, ProtocolSpec, WireValues } from './spec';
import { checkAscii, checkNumber, findByCode, opposite, payloadWidth, UNKNOWN_REF } from './wire';

export function createBinaryCodec(spec: ProtocolSpec, fr: BinaryFraming): FrameCodec {
  const width = checksumWidth(spec.checksum);
  const lenBytes = fr.length === 'u8' ? 1 : 2;
  const header = Uint8Array.from(fr.header);

  function writeUint(v: number, n: number): Uint8Array {
    const out = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const b = Math.floor(v / Math.pow(256, i)) & 0xff;
      out[fr.endian === 'le' ? i : n - 1 - i] = b;
    }
    return out;
  }

  function readUint(b: Uint8Array, at: number, n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) v += b[at + (fr.endian === 'le' ? i : n - 1 - i)] * Math.pow(256, i);
    return v;
  }

  function encode(message: MessageKey, values: WireValues): Uint8Array {
    const m = spec.messages[message];
    if (!m) throw new Error(`Đặc tả không có bản tin ${message}`);
    const parts: Uint8Array[] = [];
    for (const f of m.fields) {
      const v = values[f.name];
      if (v === undefined) throw new Error(`Thiếu trường ${f.name}`);
      const t = f.field;
      if (t.type === 'uint' || t.type === 'enum') {
        const err = checkNumber(f, v, t.bytes);
        if (err) throw new Error(err);
        parts.push(writeUint(v as number, t.bytes));
      } else if (t.type === 'ascii') {
        const err = checkAscii(f, v, t.maxLength, t.charset);
        if (err) throw new Error(err);
        const s = v as string;
        const b = new Uint8Array(t.maxLength);
        for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
        parts.push(b);
      } else {
        const ref = spec.messages[v as MessageKey];
        if (!ref) throw new Error(`Trường ${f.name}: không có bản tin ${String(v)}`);
        parts.push(Uint8Array.of(ref.code));
      }
    }
    const payload = concat(...parts);
    if (payload.length > maxUintOf(lenBytes)) throw new Error('Phần tải quá dài');
    const body = concat(Uint8Array.of(m.code), writeUint(payload.length, lenBytes), payload);
    return concat(header, body, width === 0 ? new Uint8Array(0) : writeUint(checksumBytes(spec.checksum, body), width));
  }

  function decode(raw: Uint8Array, direction: Direction): DecodedFrame {
    const body = raw.subarray(header.length, raw.length - width);
    if (width > 0 && readUint(raw, raw.length - width, width) !== checksumBytes(spec.checksum, body)) return { kind: 'bad_checksum', raw };
    const found = findByCode(spec, body[0], direction);
    if (!found) return { kind: 'malformed', raw, reason: `Mã bản tin lạ 0x${body[0].toString(16)}` };
    const [key, m] = found;
    const payload = body.subarray(1 + lenBytes);
    if (payload.length !== payloadWidth(m)) return { kind: 'malformed', raw, reason: `Bản tin ${m.token} cần ${payloadWidth(m)} byte, nhận ${payload.length}` };
    const values: WireValues = {};
    let at = 0;
    for (const f of m.fields) {
      const t = f.field;
      if (t.type === 'uint' || t.type === 'enum') {
        values[f.name] = readUint(payload, at, t.bytes);
        at += t.bytes;
      } else if (t.type === 'ascii') {
        let s = '';
        for (let i = 0; i < t.maxLength && payload[at + i] !== 0; i++) s += String.fromCharCode(payload[at + i]);
        values[f.name] = s;
        at += t.maxLength;
      } else {
        const ref = findByCode(spec, payload[at], opposite(direction)) ?? findByCode(spec, payload[at], direction);
        values[f.name] = ref ? ref[0] : UNKNOWN_REF;
        at += 1;
      }
    }
    return { kind: 'frame', message: key, values, raw };
  }

  function indexOfHeader(b: number[]): number {
    for (let i = 0; i + header.length <= b.length; i++) {
      let ok = true;
      for (let j = 0; j < header.length && ok; j++) ok = b[i + j] === header[j];
      if (ok) return i;
    }
    return -1;
  }

  function createReader(direction: Direction): FrameReader {
    let buf: number[] = [];
    return {
      get buffered() {
        return buf.length;
      },
      push(chunk: Uint8Array): DecodedFrame[] {
        for (let i = 0; i < chunk.length; i++) buf.push(chunk[i]);
        const out: DecodedFrame[] = [];
        for (;;) {
          const s = indexOfHeader(buf);
          if (s < 0) {
            // Giữ lại vài byte cuối phòng khi header bị cắt đôi giữa hai lần đọc.
            buf = buf.slice(Math.max(0, buf.length - (header.length - 1)));
            break;
          }
          buf = buf.slice(s);
          const headLen = header.length + 1 + lenBytes;
          if (buf.length < headLen) break;
          const len = readUint(Uint8Array.from(buf.slice(header.length + 1, headLen)), 0, lenBytes);
          const total = headLen + len + width;
          if (total > spec.maxFrameBytes) {
            // Độ dài vô lý: bỏ header này, tìm header kế tiếp.
            buf = buf.slice(1);
            continue;
          }
          if (buf.length < total) break;
          const raw = Uint8Array.from(buf.slice(0, total));
          buf = buf.slice(total);
          out.push(decode(raw, direction));
        }
        if (buf.length > spec.maxFrameBytes) buf = [];
        return out;
      },
    };
  }

  return { encode, createReader };
}

function maxUintOf(bytes: number): number {
  return Math.pow(2, 8 * bytes) - 1;
}
