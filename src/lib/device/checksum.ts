// Các kiểu checksum mà đặc tả giao thức có thể chọn.
// CRC-16/CCITT-FALSE (IBM-3740): đa thức 0x1021, đầu 0xFFFF, không đảo bit, không XOR cuối; kiểm chuẩn "123456789" = 0x29B1.
// CRC-16/MODBUS: đa thức 0x8005 (dạng đảo 0xA001), đầu 0xFFFF, đảo bit vào ra, không XOR cuối; kiểm chuẩn = 0x4B37.
// Nguồn: danh mục CRC RevEng, https://reveng.sourceforge.io/crc-catalogue/16.htm

import type { ChecksumKind } from './spec';

export function checksumWidth(kind: ChecksumKind): 0 | 1 | 2 {
  if (kind === 'none') return 0;
  if (kind === 'xor8' || kind === 'sum8') return 1;
  return 2;
}

export function checksumBytes(kind: ChecksumKind, data: Uint8Array): number {
  switch (kind) {
    case 'none':
      return 0;
    case 'xor8': {
      let c = 0;
      for (let i = 0; i < data.length; i++) c ^= data[i];
      return c;
    }
    case 'sum8': {
      let c = 0;
      for (let i = 0; i < data.length; i++) c = (c + data[i]) & 0xff;
      return c;
    }
    case 'crc16_ccitt_false': {
      let c = 0xffff;
      for (let i = 0; i < data.length; i++) {
        c ^= data[i] << 8;
        for (let b = 0; b < 8; b++) c = c & 0x8000 ? ((c << 1) ^ 0x1021) & 0xffff : (c << 1) & 0xffff;
      }
      return c;
    }
    case 'crc16_modbus': {
      let c = 0xffff;
      for (let i = 0; i < data.length; i++) {
        c ^= data[i];
        for (let b = 0; b < 8; b++) c = c & 1 ? (c >>> 1) ^ 0xa001 : c >>> 1;
      }
      return c;
    }
  }
}
