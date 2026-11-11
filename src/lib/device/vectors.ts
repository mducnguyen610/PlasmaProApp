// Ví dụ đối chiếu: hợp đồng giữa ứng dụng và firmware. Cùng một cấu hình phải ra cùng một chuỗi byte ở hai phía.
// Các ví dụ `source: 'app'` do ứng dụng tính bằng một chương trình Python độc lập ngày 11/11/2026 (chép ở ICD mục 8).
// Khi nhóm firmware gửi ví dụ chụp từ mạch thật, thêm với `source: 'firmware'`.
// Nếu mã cho kết quả khác, không sửa ví dụ cho khớp mã: tìm lỗi ở mã hoặc ở đặc tả.

import type { DeviceMessage } from './protocol';

export interface ConfigVector {
  name: string;
  spec: 'text' | 'binary';
  source: 'app' | 'firmware';
  config: { patientId: string; minTreatmentTimeSec: number; energyLevel: number; treatmentMode: string; atIso: string };
  hex: string;
}

export interface ReplyVector {
  name: string;
  spec: 'text' | 'binary';
  source: 'app' | 'firmware';
  hex: string;
  expect: DeviceMessage | { kind: 'bad_checksum' } | { kind: 'malformed' };
}

/** Đổi chuỗi ASCII của ví dụ văn bản sang hex để mọi ví dụ cùng một dạng. */
function a(s: string): string {
  const parts: string[] = [];
  for (let i = 0; i < s.length; i++) parts.push(s.charCodeAt(i).toString(16).toUpperCase().padStart(2, '0'));
  return parts.join(' ');
}

const SAMPLE = { patientId: 'BN001', minTreatmentTimeSec: 120, energyLevel: 3, treatmentMode: 'cold', atIso: '2026-11-10T23:30:05Z' };

export const CONFIG_VECTORS: ConfigVector[] = [
  { name: 'V1 cấu hình mẫu, khung văn bản', spec: 'text', source: 'app', config: SAMPLE, hex: a('$CFG,BN001,120,3,0,11,11,2026,6,30,5*49\r\n') },
  { name: 'V10 cấu hình mẫu, khung nhị phân', spec: 'binary', source: 'app', config: SAMPLE, hex: 'AA 55 01 1A 42 4E 30 30 31 00 00 00 00 00 00 00 00 00 00 00 78 00 03 00 0B 0B 1A 06 1E 05 58 BA' },
];

export const REPLY_VECTORS: ReplyVector[] = [
  { name: 'V2 ACK', spec: 'text', source: 'app', hex: a('$ACK,CFG*27\r\n'), expect: { kind: 'ack', command: 'config' } },
  { name: 'V3 NAK BUSY', spec: 'text', source: 'app', hex: a('$NAK,CFG,BUSY*1B\r\n'), expect: { kind: 'nak', command: 'config', code: 'BUSY' } },
  { name: 'V4 STA running 42', spec: 'text', source: 'app', hex: a('$STA,1,42*71\r\n'), expect: { kind: 'status', state: 'running', remainingSec: 42 } },
  { name: 'V6 INF', spec: 'text', source: 'app', hex: a('$INF,1,0.1.0,SIM-PLASMA*15\r\n'), expect: { kind: 'info', protocolVersion: 1, firmwareVersion: '0.1.0', model: 'SIM-PLASMA' } },
  { name: 'V8 CAP', spec: 'text', source: 'app', hex: a('$CAP,1,5,7,60,1800*42\r\n'), expect: { kind: 'caps', values: { energy_min: 1, energy_max: 5, mode_mask: 7, time_min_s: 60, time_max_s: 1800 } } },
  { name: 'V9 ACK sai checksum', spec: 'text', source: 'app', hex: a('$ACK,CFG*28\r\n'), expect: { kind: 'bad_checksum' } },
  { name: 'V11 ACK nhị phân', spec: 'binary', source: 'app', hex: 'AA 55 81 01 01 E1 B8', expect: { kind: 'ack', command: 'config' } },
];

/** Hai bản tin hỏi máy (V5, V7), so với encodeQuery. */
export const QUERY_VECTORS: { name: string; which: 'query_info' | 'query_caps'; hex: string }[] = [
  { name: 'V5 hỏi INF', which: 'query_info', hex: a('$INF*41\r\n') },
  { name: 'V7 hỏi CAP', which: 'query_caps', hex: a('$CAP*52\r\n') },
];
