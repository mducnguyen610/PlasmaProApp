// Hàm dùng chung cho các bộ mã hóa khung: độ rộng trường, kiểm giá trị, tra bản tin.

import { messagesOf } from './spec';
import type { Direction, FieldSpec, MessageKey, MessageSpec, ProtocolSpec, WireValue } from './spec';

export function fieldWidth(f: FieldSpec): number {
  switch (f.field.type) {
    case 'uint':
    case 'enum':
      return f.field.bytes;
    case 'ascii':
      return f.field.maxLength;
    case 'msg_ref':
      return 1;
  }
}

export function payloadWidth(m: MessageSpec): number {
  let n = 0;
  for (const f of m.fields) n += fieldWidth(f);
  return n;
}

export function maxUint(bytes: number): number {
  return Math.pow(2, 8 * bytes) - 1;
}

export function charsetRegex(charset: string): RegExp {
  return new RegExp('^[' + charset + ']*$');
}

/** Kiểm một giá trị trên dây của một trường số (uint, enum); trả câu lỗi hoặc null. */
export function checkNumber(f: FieldSpec, v: WireValue | undefined, bytes: number): string | null {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > maxUint(bytes)) return `Trường ${f.name}: giá trị ${String(v)} không vừa ${bytes} byte`;
  return null;
}

export function checkAscii(f: FieldSpec, v: WireValue | undefined, maxLength: number, charset: string): string | null {
  if (typeof v !== 'string') return `Trường ${f.name}: cần chuỗi`;
  if (v.length > maxLength) return `Trường ${f.name}: dài hơn ${maxLength} ký tự`;
  if (!charsetRegex(charset).test(v)) return `Trường ${f.name}: có ký tự ngoài [${charset}]`;
  return null;
}

export function findByToken(spec: ProtocolSpec, token: string, direction: Direction): [MessageKey, MessageSpec] | null {
  for (const [k, m] of messagesOf(spec)) if (m.token === token && m.direction === direction) return [k, m];
  return null;
}

export function findByCode(spec: ProtocolSpec, code: number, direction: Direction): [MessageKey, MessageSpec] | null {
  for (const [k, m] of messagesOf(spec)) if (m.code === code && m.direction === direction) return [k, m];
  return null;
}

export function opposite(d: Direction): Direction {
  return d === 'app_to_device' ? 'device_to_app' : 'app_to_device';
}

/** Giá trị của trường msg_ref khi không khớp bản tin nào. */
export const UNKNOWN_REF = '?';
