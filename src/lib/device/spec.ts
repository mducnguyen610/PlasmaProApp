// Kiểu của đặc tả giao thức USB/UART khai báo. Giá trị cụ thể nằm ở protocol.config.ts.

export interface UartSettings { baudRate: number; dataBits: 7 | 8; parity: 'none' | 'even' | 'odd'; stopBits: 1 | 2 }

export type ConfigFieldName = 'patient_id' | 'min_treatment_time' | 'energy_level' | 'treatment_mode' | 'day' | 'month' | 'year' | 'hour' | 'minute' | 'second';

export const CONFIG_FIELD_NAMES: readonly ConfigFieldName[] = ['patient_id', 'min_treatment_time', 'energy_level', 'treatment_mode', 'day', 'month', 'year', 'hour', 'minute', 'second'];

export type FieldType =
  /** Khung văn bản: số thập phân. Khung nhị phân: số nguyên không dấu `bytes` byte theo `framing.endian`. */
  | { type: 'uint'; bytes: 1 | 2 | 4 }
  /** `charset` là nội dung một lớp ký tự, ví dụ 'A-Za-z0-9_-'. Khung nhị phân đệm 0x00 đến đủ `maxLength`. */
  | { type: 'ascii'; maxLength: number; charset: string }
  /** Giá trị ứng dụng sang số trên dây, ví dụ { cold: 0, hybrid: 1, thermal: 2 }. */
  | { type: 'enum'; bytes: 1 | 2; map: Record<string, number> }
  /** Tham chiếu bản tin khác: khung văn bản ghi token, khung nhị phân ghi code 1 byte. */
  | { type: 'msg_ref' };

/** Giá trị trên dây = round(giá trị ứng dụng / (divisor ?? 1)) + (offset ?? 0). `min`, `max` tính trên giá trị trên dây. */
export interface FieldSpec { name: string; field: FieldType; divisor?: number; round?: 'ceil' | 'floor' | 'round'; offset?: number; min?: number; max?: number; unit?: string; note?: string }

export type Direction = 'app_to_device' | 'device_to_app';
export interface MessageSpec { token: string; code: number; direction: Direction; fields: FieldSpec[] }
export type MessageKey = 'config' | 'ack' | 'nak' | 'status' | 'query_info' | 'info' | 'query_caps' | 'caps';

export interface TextFraming { kind: 'text'; start: string; end: string; separator: string; checksumMark: string }
export interface BinaryFraming { kind: 'binary'; header: number[]; length: 'u8' | 'u16'; endian: 'le' | 'be' }
export type ChecksumKind = 'xor8' | 'sum8' | 'crc16_ccitt_false' | 'crc16_modbus' | 'none';

export type SessionState = 'idle' | 'running' | 'done' | 'stopped' | 'error';

export interface ProtocolSpec {
  /** Tăng khi định dạng đổi không tương thích; so với giá trị máy trả trong INF. */
  protocolVersion: number;
  /** false cho đến khi nhóm firmware ký xác nhận ICD. */
  confirmed: boolean;
  source: string;
  uart: UartSettings;
  framing: TextFraming | BinaryFraming;
  /** Văn bản: tính trên các ký tự giữa start và checksumMark, ghi hex hoa. Nhị phân: tính trên code, độ dài, phần tải. */
  checksum: ChecksumKind;
  messages: Record<'config' | 'ack' | 'nak' | 'status', MessageSpec> & Partial<Record<'query_info' | 'info' | 'query_caps' | 'caps', MessageSpec>>;
  statusStates: Record<SessionState, number>;
  /** Múi giờ của đồng hồ thiết bị, 420 = UTC+7. */
  timeZoneOffsetMin: number;
  ackTimeoutMs: number;
  maxRetries: number;
  maxFrameBytes: number;
}

export type WireValue = number | string;
export type WireValues = Record<string, WireValue>;

export const MESSAGE_KEYS: readonly MessageKey[] = ['config', 'ack', 'nak', 'status', 'query_info', 'info', 'query_caps', 'caps'];

export function messagesOf(spec: ProtocolSpec): [MessageKey, MessageSpec][] {
  const out: [MessageKey, MessageSpec][] = [];
  for (const k of MESSAGE_KEYS) {
    const m = spec.messages[k];
    if (m) out.push([k, m]);
  }
  return out;
}
