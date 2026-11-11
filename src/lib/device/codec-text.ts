// Khung văn bản: <start><token><sep><trường>...<mark><checksum hex><end>.

import { asciiToBytes, bytesToAscii } from './bytes';
import { checksumBytes, checksumWidth } from './checksum';
import type { DecodedFrame, FrameCodec, FrameReader } from './codec';
import type { Direction, MessageKey, ProtocolSpec, TextFraming, WireValues } from './spec';
import { checkAscii, checkNumber, findByToken, opposite, UNKNOWN_REF } from './wire';

export function createTextCodec(spec: ProtocolSpec, fr: TextFraming): FrameCodec {
  const width = checksumWidth(spec.checksum);

  function encode(message: MessageKey, values: WireValues): Uint8Array {
    const m = spec.messages[message];
    if (!m) throw new Error(`Đặc tả không có bản tin ${message}`);
    const parts = [m.token];
    for (const f of m.fields) {
      const v = values[f.name];
      if (v === undefined) throw new Error(`Thiếu trường ${f.name}`);
      const t = f.field;
      let err: string | null = null;
      let text = '';
      if (t.type === 'uint' || t.type === 'enum') {
        err = checkNumber(f, v, t.bytes);
        text = String(v);
      } else if (t.type === 'ascii') {
        err = checkAscii(f, v, t.maxLength, t.charset);
        text = String(v);
      } else {
        const ref = spec.messages[v as MessageKey];
        if (!ref) err = `Trường ${f.name}: không có bản tin ${String(v)}`;
        else text = ref.token;
      }
      if (err) throw new Error(err);
      parts.push(text);
    }
    const body = parts.join(fr.separator);
    const tail = width === 0 ? '' : fr.checksumMark + checksumBytes(spec.checksum, asciiToBytes(body)).toString(16).toUpperCase().padStart(width * 2, '0');
    return asciiToBytes(fr.start + body + tail + fr.end);
  }

  function decode(frame: string, direction: Direction): DecodedFrame {
    const raw = asciiToBytesLoose(fr.start + frame + fr.end);
    let body = frame;
    if (width > 0) {
      const k = frame.lastIndexOf(fr.checksumMark);
      if (k < 0) return { kind: 'malformed', raw, reason: 'Thiếu dấu checksum' };
      const hex = frame.slice(k + fr.checksumMark.length);
      if (!new RegExp('^[0-9A-Fa-f]{' + width * 2 + '}$').test(hex)) return { kind: 'malformed', raw, reason: 'Checksum không đúng độ dài' };
      body = frame.slice(0, k);
      if (parseInt(hex, 16) !== checksumBytes(spec.checksum, asciiToBytesLoose(body))) return { kind: 'bad_checksum', raw };
    }
    const tokens = body.split(fr.separator);
    const found = findByToken(spec, tokens[0], direction);
    if (!found) return { kind: 'malformed', raw, reason: `Bản tin lạ ${tokens[0]}` };
    const [key, m] = found;
    if (tokens.length - 1 !== m.fields.length) return { kind: 'malformed', raw, reason: `Bản tin ${m.token} cần ${m.fields.length} trường, nhận ${tokens.length - 1}` };
    const values: WireValues = {};
    for (let i = 0; i < m.fields.length; i++) {
      const f = m.fields[i];
      const s = tokens[i + 1];
      if (f.field.type === 'uint' || f.field.type === 'enum') {
        if (!/^\d+$/.test(s)) return { kind: 'malformed', raw, reason: `Trường ${f.name} không phải số` };
        values[f.name] = Number(s);
      } else if (f.field.type === 'ascii') {
        values[f.name] = s;
      } else {
        const ref = findByToken(spec, s, opposite(direction)) ?? findByToken(spec, s, direction);
        values[f.name] = ref ? ref[0] : UNKNOWN_REF;
      }
    }
    return { kind: 'frame', message: key, values, raw };
  }

  function createReader(direction: Direction): FrameReader {
    let buf = '';
    return {
      get buffered() {
        return buf.length;
      },
      push(chunk: Uint8Array): DecodedFrame[] {
        buf += bytesToAscii(chunk);
        const out: DecodedFrame[] = [];
        for (;;) {
          const s = buf.indexOf(fr.start);
          if (s < 0) {
            buf = '';
            break;
          }
          buf = buf.slice(s);
          const e = buf.indexOf(fr.end);
          if (e < 0) {
            // Quá giới hạn mà chưa đủ khung: xóa bộ đệm. Phần đuôi đến sau không có ký tự mở khung nên cũng bị bỏ.
            if (buf.length > spec.maxFrameBytes) buf = '';
            break;
          }
          // Có ký tự mở khung mới trước ký tự đóng: bỏ phần khung cũ bị cắt.
          const again = buf.lastIndexOf(fr.start, e);
          if (again > 0) {
            buf = buf.slice(again);
            continue;
          }
          const frame = buf.slice(fr.start.length, e);
          buf = buf.slice(e + fr.end.length);
          out.push(decode(frame, direction));
        }
        return out;
      },
    };
  }

  return { encode, createReader };
}

/** Như asciiToBytes nhưng không ném lỗi với byte lạ (dữ liệu nhận có thể bẩn). */
function asciiToBytesLoose(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}
