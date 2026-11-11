// Đổi qua lại giữa chuỗi ASCII, byte và chuỗi hex. Chỉ ASCII, không dùng TextEncoder.

export function asciiToBytes(s: string): Uint8Array {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (!((c >= 0x20 && c <= 0x7e) || c === 0x0d || c === 0x0a)) throw new Error(`Ký tự ngoài ASCII in được tại vị trí ${i}`);
    out[i] = c;
  }
  return out;
}

export function bytesToAscii(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return s;
}

export function toHex(b: Uint8Array): string {
  const parts: string[] = [];
  for (let i = 0; i < b.length; i++) parts.push(b[i].toString(16).toUpperCase().padStart(2, '0'));
  return parts.join(' ');
}

export function fromHex(s: string): Uint8Array {
  const clean = s.replace(/\s+/g, '');
  if (clean.length % 2 !== 0 || /[^0-9a-fA-F]/.test(clean)) throw new Error('Chuỗi hex không hợp lệ');
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export function concat(...parts: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** Ký tự in được giữ nguyên, byte khác thành '.'; dùng cho bản ghi hex. */
export function printable(b: Uint8Array): string {
  let s = '';
  for (let i = 0; i < b.length; i++) s += b[i] >= 0x20 && b[i] <= 0x7e ? String.fromCharCode(b[i]) : '.';
  return s;
}
