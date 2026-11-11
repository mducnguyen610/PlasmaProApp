// Đặc tả giao thức USB/UART giữa ứng dụng và firmware Plasma Pro.
//
// Mọi giá trị là giả định của ứng dụng cho đến khi nhóm firmware xác nhận ICD
// `docs/thiet-ke/icd-usb-uart.md`. Firmware chốt thì sửa tệp này và `vectors.ts`,
// rồi chạy `npm test`. Không cần sửa mã khác, trừ khi có trường điều trị mới.
// Tệp chỉ chứa dữ liệu dạng tương thích JSON.

import type { FieldSpec, MessageSpec, ProtocolSpec } from './spec';

const ID_CHARSET = 'A-Za-z0-9_-';
const VERSION_CHARSET = 'A-Za-z0-9._-';

const CONFIG_FIELDS: FieldSpec[] = [
  { name: 'patient_id', field: { type: 'ascii', maxLength: 16, charset: ID_CHARSET }, note: 'Mã hồ sơ, không phải họ tên' },
  { name: 'min_treatment_time', field: { type: 'uint', bytes: 2 }, unit: 's' },
  { name: 'energy_level', field: { type: 'uint', bytes: 1 } },
  { name: 'treatment_mode', field: { type: 'enum', bytes: 1, map: { cold: 0, hybrid: 1, thermal: 2 } } },
  { name: 'day', field: { type: 'uint', bytes: 1 }, min: 1, max: 31 },
  { name: 'month', field: { type: 'uint', bytes: 1 }, min: 1, max: 12 },
  { name: 'year', field: { type: 'uint', bytes: 2 } },
  { name: 'hour', field: { type: 'uint', bytes: 1 }, min: 0, max: 23 },
  { name: 'minute', field: { type: 'uint', bytes: 1 }, min: 0, max: 59 },
  { name: 'second', field: { type: 'uint', bytes: 1 }, min: 0, max: 59 },
];

const INFO_FIELDS: FieldSpec[] = [
  { name: 'protocol_version', field: { type: 'uint', bytes: 1 } },
  { name: 'firmware_version', field: { type: 'ascii', maxLength: 16, charset: VERSION_CHARSET } },
  { name: 'model', field: { type: 'ascii', maxLength: 16, charset: VERSION_CHARSET } },
];

const CAPS_FIELDS: FieldSpec[] = [
  { name: 'energy_min', field: { type: 'uint', bytes: 1 } },
  { name: 'energy_max', field: { type: 'uint', bytes: 1 } },
  { name: 'mode_mask', field: { type: 'uint', bytes: 1 } },
  { name: 'time_min_s', field: { type: 'uint', bytes: 2 }, unit: 's' },
  { name: 'time_max_s', field: { type: 'uint', bytes: 2 }, unit: 's' },
];

const STATUS_FIELDS: FieldSpec[] = [
  { name: 'state', field: { type: 'uint', bytes: 1 } },
  { name: 'remaining_s', field: { type: 'uint', bytes: 2 }, unit: 's' },
];

function msg(token: string, code: number, direction: MessageSpec['direction'], fields: FieldSpec[]): MessageSpec {
  return { token, code, direction, fields };
}

/** Phương án A của ICD: khung văn bản ASCII, checksum XOR kiểu NMEA. */
export const PROTOCOL: ProtocolSpec = {
  protocolVersion: 1,
  confirmed: false,
  source: 'Giả định của ứng dụng, chưa thống nhất với firmware (ICD bản nháp 11/11/2026)',
  uart: { baudRate: 9600, dataBits: 8, parity: 'none', stopBits: 1 },
  framing: { kind: 'text', start: '$', end: '\r\n', separator: ',', checksumMark: '*' },
  checksum: 'xor8',
  messages: {
    config: msg('CFG', 0x01, 'app_to_device', CONFIG_FIELDS),
    ack: msg('ACK', 0x81, 'device_to_app', [{ name: 'command', field: { type: 'msg_ref' } }]),
    nak: msg('NAK', 0x82, 'device_to_app', [{ name: 'command', field: { type: 'msg_ref' } }, { name: 'code', field: { type: 'ascii', maxLength: 16, charset: ID_CHARSET } }]),
    status: msg('STA', 0x83, 'device_to_app', STATUS_FIELDS),
    query_info: msg('INF', 0x10, 'app_to_device', []),
    info: msg('INF', 0x90, 'device_to_app', INFO_FIELDS),
    query_caps: msg('CAP', 0x11, 'app_to_device', []),
    caps: msg('CAP', 0x91, 'device_to_app', CAPS_FIELDS),
  },
  statusStates: { idle: 0, running: 1, done: 2, stopped: 3, error: 4 },
  timeZoneOffsetMin: 420,
  ackTimeoutMs: 2000,
  maxRetries: 2,
  maxFrameBytes: 1024,
};

/** Phương án B của ICD: khung nhị phân, CRC-16/MODBUS. Chỉ dùng trong kiểm thử để chứng minh đổi kiểu khung không phải sửa mã. */
export const PROTOCOL_BINARY_EXAMPLE: ProtocolSpec = {
  ...PROTOCOL,
  source: 'Phương án B của ICD bản nháp 11/11/2026, chỉ dùng trong kiểm thử',
  framing: { kind: 'binary', header: [0xaa, 0x55], length: 'u8', endian: 'le' },
  checksum: 'crc16_modbus',
  messages: {
    ...PROTOCOL.messages,
    config: msg('CFG', 0x01, 'app_to_device', CONFIG_FIELDS.map((f) => (f.name === 'year' ? { ...f, field: { type: 'uint', bytes: 1 }, offset: -2000 } : f))),
    nak: msg('NAK', 0x82, 'device_to_app', [{ name: 'command', field: { type: 'msg_ref' } }, { name: 'code', field: { type: 'enum', bytes: 1, map: { BAD_CHECKSUM: 1, BAD_FIELDS: 2, BUSY: 3 } } }]),
  },
};
