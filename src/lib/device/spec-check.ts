// Kiểm tính nhất quán của đặc tả giao thức. Chạy trong npm test để phát hiện lỗi khi sửa protocol.config.ts.

import { CONFIG_FIELD_NAMES, messagesOf } from './spec';
import type { ProtocolSpec } from './spec';
import { maxUint } from './wire';

export function checkSpec(spec: ProtocolSpec): string[] {
  const errs: string[] = [];
  const config = spec.messages.config;
  const names = config.fields.map((f) => f.name);
  for (const n of CONFIG_FIELD_NAMES) {
    const c = names.filter((x) => x === n).length;
    if (c !== 1) errs.push(`Bản tin config: trường ${n} xuất hiện ${c} lần, cần đúng 1`);
  }
  for (const n of names) if (!(CONFIG_FIELD_NAMES as readonly string[]).includes(n)) errs.push(`Bản tin config: ứng dụng không có giá trị cho trường lạ ${n}`);

  const all = messagesOf(spec);
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) {
      const [ka, a] = all[i];
      const [kb, b] = all[j];
      if (a.direction !== b.direction) continue;
      if (a.token === b.token) errs.push(`Bản tin ${ka} và ${kb} cùng hướng trùng token ${a.token}`);
      if (a.code === b.code) errs.push(`Bản tin ${ka} và ${kb} cùng hướng trùng code ${a.code}`);
    }
  }
  if (spec.messages.config.direction !== 'app_to_device') errs.push('Bản tin config phải theo hướng app_to_device');
  for (const k of ['ack', 'nak', 'status'] as const) if (spec.messages[k].direction !== 'device_to_app') errs.push(`Bản tin ${k} phải theo hướng device_to_app`);
  for (const [q, r] of [['query_info', 'info'], ['query_caps', 'caps']] as const) {
    if (!!spec.messages[q] !== !!spec.messages[r]) errs.push(`Bản tin ${q} và ${r} phải đi theo cặp`);
  }

  const text = spec.framing.kind === 'text' ? spec.framing : null;
  for (const [key, m] of all) {
    if (!Number.isInteger(m.code) || m.code < 0 || m.code > 255) errs.push(`Bản tin ${key}: code ${m.code} không vừa 1 byte`);
    if (text && (m.token.includes(text.separator) || m.token.includes(text.start) || m.token.includes(text.checksumMark))) errs.push(`Bản tin ${key}: token chứa ký tự khung`);
    for (const f of m.fields) {
      const t = f.field;
      if (t.type === 'enum') {
        const vals = Object.values(t.map);
        if (new Set(vals).size !== vals.length) errs.push(`Bản tin ${key}, trường ${f.name}: bảng mã có hai giá trị trùng số`);
        for (const v of vals) if (!Number.isInteger(v) || v < 0 || v > maxUint(t.bytes)) errs.push(`Bản tin ${key}, trường ${f.name}: mã ${v} không vừa ${t.bytes} byte`);
      }
      if (t.type === 'uint') {
        const lim = maxUint(t.bytes);
        for (const [label, raw] of [['min', f.min], ['max', f.max]] as const) {
          if (raw === undefined) continue;
          if (raw < 0 || raw > lim) errs.push(`Bản tin ${key}, trường ${f.name}: ${label} ${raw} không vừa ${t.bytes} byte`);
        }
      }
      if (t.type === 'ascii') {
        if (!(t.maxLength > 0)) errs.push(`Bản tin ${key}, trường ${f.name}: maxLength phải lớn hơn 0`);
        if (text) {
          let re: RegExp | null = null;
          try {
            re = new RegExp('^[' + t.charset + ']$');
          } catch {
            errs.push(`Bản tin ${key}, trường ${f.name}: charset không hợp lệ`);
          }
          if (re) for (const ch of [text.start, text.separator, text.checksumMark, ...text.end.split('')]) if (re.test(ch)) errs.push(`Bản tin ${key}, trường ${f.name}: charset chứa ký tự khung ${JSON.stringify(ch)}`);
        }
      }
    }
  }

  const sv = Object.values(spec.statusStates);
  if (new Set(sv).size !== sv.length) errs.push('statusStates có hai trạng thái trùng số');
  if (!(spec.ackTimeoutMs > 0)) errs.push('ackTimeoutMs phải lớn hơn 0');
  if (!(spec.maxRetries >= 0)) errs.push('maxRetries không được âm');
  if (!(spec.maxFrameBytes >= 64)) errs.push('maxFrameBytes phải từ 64 trở lên');
  if (spec.usb) {
    if (spec.usb.devices.length === 0) errs.push('usb.devices trống');
    for (const d of spec.usb.devices) {
      for (const [k, v] of [['vendorId', d.vendorId], ['productId', d.productId]] as const) {
        if (!Number.isInteger(v) || v < 0 || v > 0xffff) errs.push(`usb: ${k} ${v} không vừa 16 bit`);
      }
    }
  }
  return errs;
}
