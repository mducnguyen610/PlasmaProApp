# Kế hoạch triển khai giai đoạn 1: lớp thiết bị, giao thức USB/UART, lớp AI, tổng quan bác sĩ

Ngày lập: 11/11/2026. Nhánh gốc: `thiet-ke/quy-trinh-buoc-1-8` (pull request 10). Hồ sơ thiết kế: `docs/thiet-ke/`.

## Bối cảnh

Đề tài: "Nghiên cứu, thiết kế và phát triển ứng dụng điện thoại hỗ trợ quản lý quá trình điều trị vết thương bằng thiết bị Plasma Pro, tích hợp mô-đun nhận diện vết thương và giao tiếp USB/UART." Phạm vi từng thành phần nằm ở `docs/thiet-ke/00-pham-vi-va-gia-dinh.md`.

Mã hiện tại (Expo SDK 58, React Native, TypeScript, Expo Router, dữ liệu lưu cục bộ bằng AsyncStorage) là prototype vòng cũ. Bảng `docs/thiet-ke/doi-chieu-ma-nguon.md` cho thấy các chỗ thiếu chính: chưa có giao tiếp với firmware (FR2, FR4, TR3), phần mô phỏng thiết bị nằm thẳng trong `src/lib/store.tsx` (trái NFR3, TR4), chưa có lớp tích hợp mô-đun AI có sẵn (TR10), màn tổng quan bác sĩ chưa xếp người bệnh theo mức cần chú ý (FR10), liệu trình chưa có chế độ điều trị, thiếu màn kết nối thiết bị và màn theo dõi phiên.

Kế hoạch này chỉ gồm những việc không phải làm lại dù các câu hỏi mở (đặc tả firmware, dạng mô-đun AI, bộ chuyển USB cho iOS, phương pháp gán nhãn) được trả lời thế nào. Firmware chưa chốt, nên mọi phần phụ thuộc định dạng firmware được viết thành dữ liệu khai báo trong một tệp `src/lib/device/protocol.config.ts`, đối chiếu một một với tài liệu giao tiếp `docs/thiet-ke/icd-usb-uart.md`; khi firmware chốt chỉ sửa tệp đó và bộ ví dụ đối chiếu, chạy `npm test`, không sửa mã.

Quyết định đã chốt với chủ đồ án trong thảo luận:

- Giữ cả ba vai trò `doctor`, `patient`, `admin`. Không gỡ màn `src/app/admin/*`.
- Điện thoại **người bệnh** cắm USB vào máy tại nhà để nạp cấu hình bác sĩ đặt và nhận phản hồi; bác sĩ cũng dùng được màn này khi giao máy. Cần chạy trên cả Android và iOS.
- Dữ liệu gửi xuống firmware gồm 10 trường: `patient_id`, `min_treatment_time`, `energy_level`, `treatment_mode`, `day`, `month`, `year`, `hour`, `minute`, `second`.
- Giá trị điều trị do bác sĩ quyết định; ứng dụng không tự đặt mức năng lượng hay chế độ khi chưa có đặc tả được xác nhận.

## Cách tiếp cận

1. Tạo thư mục `src/lib/device/` gồm các mô-đun thuần TypeScript (không import `react-native`, `expo-*` hay `@/`): đặc tả giao thức khai báo, checksum, bộ mã hóa khung cắm thay được, tầng bản tin, ví dụ đối chiếu, máy trạng thái gửi có xác nhận, hỏi máy, bản ghi hex, thiết bị giả lập nói theo cùng đặc tả. Các mô-đun này import giá trị lẫn nhau, nên import không đuôi như `src/lib/research.ts` import `./naming`, và bài kiểm thử viết dạng `.test.cjs` với hàm `load` dịch bằng `ts.transpileModule` như `src/lib/workflow.test.cjs` (Node chạy thẳng `.ts` không phân giải được import không đuôi; thêm đuôi `.ts` thì `tsc` báo lỗi vì `tsconfig.json` không bật `allowImportingTsExtensions`). Không dùng `enum`, `class` hay thuộc tính tham số trong hàm dựng.
2. Một giao diện truyền dẫn `DeviceTransport` chỉ chuyển byte, đứng giữa ứng dụng và đường truyền. Giai đoạn 1 chỉ có bản cài giả lập; bản USB Android và USB iOS là giai đoạn sau, cắm vào cùng giao diện mà không sửa màn hình hay đặc tả.
3. Ba màn mới: `src/app/connect-device.tsx` và `src/app/session-monitor.tsx` cho người bệnh và bác sĩ, `src/app/device-diagnostics.tsx` cho quản trị viên.
4. Thêm `treatmentMode` vào liệu trình; dùng lại `doseLevel` làm `energy_level`; danh sách giá trị hợp lệ lấy từ bảng năng lực theo mẫu thiết bị.
5. Tạo `src/lib/ai/` với giao diện `WoundRecognizer`; bộ dò ngưỡng màu hiện có làm bản cài tạm. Màn chụp ảnh gọi qua giao diện thay vì gọi thẳng `detectInPhoto`.
6. Tạo `src/lib/attention.ts` (thuần) xếp người bệnh của bác sĩ theo mức cần chú ý và phân trạng thái hôm nay; màn `src/app/doctor/index.tsx` dùng kết quả này.

## Tệp mới

### Nguyên tắc: firmware chốt thì chỉ sửa dữ liệu, không sửa mã

Firmware Plasma Pro chưa chốt. Để khi chốt chỉ phải sửa dữ liệu, lớp giao thức chia ba tầng, mỗi tầng chỉ đọc đặc tả khai báo:

1. **Đặc tả** (`protocol.config.ts`): một đối tượng dữ liệu thuần, dạng tương thích JSON (không hàm, không biểu thức chính quy dạng literal), mô tả khung, checksum, danh sách bản tin và từng trường (kiểu, độ rộng, đơn vị, khoảng, bảng mã). Đây là tệp duy nhất phải sửa khi firmware đổi định dạng. Nội dung tệp này trùng một một với tài liệu giao tiếp `docs/thiet-ke/icd-usb-uart.md` gửi nhóm firmware.
2. **Bộ mã hóa khung** (`codec-text.ts`, `codec-binary.ts`) và **checksum** (`checksum.ts`): chọn theo `framing.kind` và `checksum.kind` của đặc tả. Giai đoạn 1 cài sẵn hai kiểu khung (văn bản có ký tự phân tách, nhị phân có header và độ dài) và năm kiểu checksum (`xor8`, `sum8`, `crc16_ccitt_false`, `crc16_modbus`, `none`), đủ để đổi qua lại bằng một dòng trong đặc tả.
3. **Bản tin** (`protocol.ts`): đổi `TreatmentConfig` thành giá trị trên dây theo từng `FieldSpec` (chia đơn vị, cộng bù, tra bảng mã), và ngược lại đổi khung nhận được thành `DeviceMessage`.

Thêm ba cơ chế để phát hiện sai lệch sớm: `checkSpec(spec)` kiểm tính nhất quán của đặc tả ngay trong `npm test`; bộ ví dụ đối chiếu `vectors.ts` (cấu hình mẫu cùng chuỗi byte mong đợi, sau này thay bằng ví dụ do nhóm firmware cung cấp) chạy như kiểm thử hợp đồng; bản tin hỏi máy `INF` (phiên bản giao thức, phiên bản firmware, mã mẫu) và `CAP` (năng lực) để ứng dụng lấy năng lực từ chính thiết bị, chỉ dùng bảng `CAPABILITIES` khi máy không trả lời. Màn chẩn đoán chỉ quản trị viên thấy hiện byte gửi và nhận dạng hex.

Thêm một trường điều trị mới (ngoài 10 trường đã chốt) là trường hợp duy nhất cần sửa mã: thêm tên vào `ConfigFieldName`, thêm giá trị vào `TreatmentConfig` và `planToConfig`. Đổi thứ tự, độ rộng, đơn vị, bảng mã, kiểu khung, checksum, tốc độ baud, tên lệnh, thời gian chờ chỉ là sửa dữ liệu.

### `src/lib/device/spec.ts` (chỉ kiểu)

```ts
export interface UartSettings { baudRate: number; dataBits: 7 | 8; parity: 'none' | 'even' | 'odd'; stopBits: 1 | 2 }
export type ConfigFieldName = 'patient_id' | 'min_treatment_time' | 'energy_level' | 'treatment_mode' | 'day' | 'month' | 'year' | 'hour' | 'minute' | 'second';
export type FieldType =
  | { type: 'uint'; bytes: 1 | 2 | 4 }                          // khung văn bản: số thập phân; khung nhị phân: số nguyên không dấu `bytes` byte theo `binary.endian`
  | { type: 'ascii'; maxLength: number; charset: string }       // charset là chuỗi ký tự cho phép, ví dụ 'A-Za-z0-9_-' dịch thành lớp ký tự; khung nhị phân đệm 0x00 đến đủ maxLength
  | { type: 'enum'; bytes: 1 | 2; map: Record<string, number> } // giá trị ứng dụng sang số trên dây, ví dụ { cold: 0, hybrid: 1, thermal: 2 }
  | { type: 'msg_ref' };                                         // tham chiếu bản tin khác: khung văn bản ghi token, khung nhị phân ghi code 1 byte
export interface FieldSpec { name: string; field: FieldType; divisor?: number; round?: 'ceil' | 'floor' | 'round'; offset?: number; min?: number; max?: number; unit?: string; note?: string }
// Giá trị trên dây = round(giá trị ứng dụng / (divisor ?? 1)) + (offset ?? 0); ví dụ phút: divisor 60, round 'ceil'; năm 2 chữ số: offset -2000.
export interface MessageSpec { token: string; code: number; direction: 'app_to_device' | 'device_to_app'; fields: FieldSpec[] }
export type MessageKey = 'config' | 'ack' | 'nak' | 'status' | 'query_info' | 'info' | 'query_caps' | 'caps';
export interface TextFraming { kind: 'text'; start: string; end: string; separator: string; checksumMark: string }
export interface BinaryFraming { kind: 'binary'; header: number[]; length: 'u8' | 'u16'; endian: 'le' | 'be' }
export type ChecksumKind = 'xor8' | 'sum8' | 'crc16_ccitt_false' | 'crc16_modbus' | 'none';
export interface ProtocolSpec {
  protocolVersion: number;       // số nguyên, tăng khi định dạng đổi không tương thích; so với giá trị máy trả trong INF
  confirmed: boolean;            // false cho đến khi nhóm firmware ký xác nhận ICD
  source: string;
  uart: UartSettings;
  framing: TextFraming | BinaryFraming;
  checksum: ChecksumKind;        // khung văn bản: tính trên các ký tự giữa start và checksumMark, ghi hex hoa (2 ký tự cho 8 bit, 4 cho 16 bit); khung nhị phân: tính trên code, độ dài và phần tải, ghi theo endian
  messages: Record<'config' | 'ack' | 'nak' | 'status', MessageSpec> & Partial<Record<'query_info' | 'info' | 'query_caps' | 'caps', MessageSpec>>;
  statusStates: Record<'idle' | 'running' | 'done' | 'stopped' | 'error', number>; // mã trạng thái trên dây trong bản tin status
  timeZoneOffsetMin: number;     // múi giờ của đồng hồ thiết bị, 420 = UTC+7
  ackTimeoutMs: number;
  maxRetries: number;
  maxFrameBytes: number;         // giới hạn bộ đệm nhận
}
export type WireValue = number | string;
export type WireValues = Record<string, WireValue>;
```

### `src/lib/device/protocol.config.ts`

Chỉ chứa `export const PROTOCOL: ProtocolSpec = { … }` (dùng `import type`), dạng dữ liệu tương thích JSON, có chú thích đầu tệp: "Mọi giá trị là giả định của ứng dụng cho đến khi nhóm firmware xác nhận ICD `docs/thiet-ke/icd-usb-uart.md`. Firmware chốt thì sửa tệp này và `vectors.ts`, rồi chạy `npm test`." Kèm `export const PROTOCOL_BINARY_EXAMPLE: ProtocolSpec` là phương án B của ICD (khung nhị phân), chỉ dùng trong kiểm thử để chứng minh đổi kiểu khung không phải sửa mã.

Giá trị tạm của `PROTOCOL` (phương án A của ICD):

- `protocolVersion: 1`, `confirmed: false`, `source: 'Giả định của ứng dụng, chưa thống nhất với firmware (ICD bản nháp 11/11/2026)'`, UART 9600 8N1.
- Khung văn bản `$<token>,<trường 1>,…*<checksum>\r\n`: `start: '$'`, `end: '\r\n'`, `separator: ','`, `checksumMark: '*'`, `checksum: 'xor8'` (kiểu NMEA).
- `config` (token `CFG`, code `0x01`): `patient_id` ascii tối đa 16 ký tự `A-Za-z0-9_-`; `min_treatment_time` uint 2 byte, đơn vị giây; `energy_level` uint 1 byte; `treatment_mode` enum 1 byte `{ cold: 0, hybrid: 1, thermal: 2 }`; `day`, `month` uint 1 byte; `year` uint 2 byte (4 chữ số); `hour`, `minute`, `second` uint 1 byte; đúng thứ tự 10 trường đã chốt.
- `ack` (token `ACK`, code `0x81`): `command` msg_ref. `nak` (`NAK`, `0x82`): `command` msg_ref, `code` ascii tối đa 16 ký tự. `status` (`STA`, `0x83`): `state` uint 1 byte theo `statusStates` `{ idle: 0, running: 1, done: 2, stopped: 3, error: 4 }`, `remaining_s` uint 2 byte.
- `query_info` (`INF`, `0x10`, không trường) và `info` (`INF`, `0x90`): `protocol_version` uint 1 byte, `firmware_version` ascii 16, `model` ascii 16.
- `query_caps` (`CAP`, `0x11`, không trường) và `caps` (`CAP`, `0x91`): `energy_min`, `energy_max` uint 1 byte, `mode_mask` uint 1 byte (bit thứ n bật nghĩa là chế độ có mã n trong `treatment_mode.map` dùng được), `time_min_s`, `time_max_s` uint 2 byte.
- `timeZoneOffsetMin: 420`, `ackTimeoutMs: 2000`, `maxRetries: 2`, `maxFrameBytes: 1024`.

Trong khung văn bản, bản tin hỏi và trả lời trùng token (`INF`, `CAP`) được phân biệt bằng hướng: bộ giải mã phía ứng dụng chỉ xét bản tin `device_to_app`, phía thiết bị giả lập chỉ xét `app_to_device`. Trong khung nhị phân, mỗi bản tin có code riêng.

`PROTOCOL_BINARY_EXAMPLE` (phương án B của ICD): giống trên về bản tin và trường, khác ở `framing: { kind: 'binary', header: [0xAA, 0x55], length: 'u8', endian: 'le' }`, `checksum: 'crc16_modbus'`, `year` có `offset: -2000` và `bytes: 1`, `nak.code` là enum 1 byte `{ BAD_CHECKSUM: 1, BAD_FIELDS: 2, BUSY: 3 }`. Khung nhị phân: `header`, `code` (1 byte), `length` (độ dài phần tải), phần tải (các trường nối liền theo độ rộng), checksum.

### `src/lib/device/spec-check.ts` (thuần)

```ts
export function checkSpec(spec: ProtocolSpec): string[]; // rỗng là hợp lệ; mỗi phần tử là một câu mô tả lỗi
```

Kiểm: `config` có đúng mỗi tên trong `ConfigFieldName` một lần và không có tên lạ (ứng dụng không có giá trị cho tên lạ); token và code không trùng trong cùng hướng; mỗi enum không có hai giá trị trùng số trên dây và số vừa `bytes`; `min`, `max` (nếu có) của trường uint vừa độ rộng sau khi chia và cộng bù; với khung văn bản, `charset` của trường ascii không chứa `start`, `separator`, `checksumMark` hoặc ký tự của `end`; `statusStates` không trùng số; `ackTimeoutMs > 0`, `maxRetries >= 0`, `maxFrameBytes >= 64`. Bản tin `query_info`/`info` và `query_caps`/`caps` phải đi theo cặp.

### `src/lib/device/bytes.ts` và `src/lib/device/checksum.ts` (thuần, không import)

```ts
// bytes.ts
export function asciiToBytes(s: string): Uint8Array;  // ném lỗi nếu có ký tự ngoài 0x20..0x7E, \r, \n
export function bytesToAscii(b: Uint8Array): string;
export function toHex(b: Uint8Array): string;          // 'AA 55 01'
export function fromHex(s: string): Uint8Array;        // bỏ khoảng trắng; dùng cho ví dụ đối chiếu
export function concat(...parts: Uint8Array[]): Uint8Array;
// checksum.ts
export function checksumBytes(kind: ChecksumKind, data: Uint8Array): number;
export function checksumWidth(kind: ChecksumKind): 0 | 1 | 2;
```

`xor8` là XOR các byte; `sum8` là tổng các byte modulo 256; `crc16_ccitt_false` có đa thức 0x1021, giá trị đầu 0xFFFF, không đảo bit, không XOR cuối; `crc16_modbus` có đa thức 0x8005 (dạng đảo 0xA001), giá trị đầu 0xFFFF, đảo bit vào và ra, không XOR cuối. `checksum.ts` chỉ `import type { ChecksumKind }`. Không dùng `TextEncoder` để không phụ thuộc môi trường chạy; chỉ ASCII.

### `src/lib/device/codec.ts`, `codec-text.ts`, `codec-binary.ts` (thuần)

```ts
export type DecodedFrame =
  | { kind: 'frame'; message: MessageKey; values: WireValues; raw: Uint8Array }
  | { kind: 'bad_checksum'; raw: Uint8Array }
  | { kind: 'malformed'; raw: Uint8Array; reason: string };
export interface FrameCodec {
  encode(message: MessageKey, values: WireValues): Uint8Array;  // ném lỗi nếu thiếu trường hoặc giá trị không vừa độ rộng
  createReader(direction: 'app_to_device' | 'device_to_app'): FrameReader;
}
export interface FrameReader { push(chunk: Uint8Array): DecodedFrame[]; readonly buffered: number }
export function createCodec(spec: ProtocolSpec): FrameCodec; // codec.ts: chọn theo spec.framing.kind
```

Bộ đọc văn bản: bỏ byte trước `start`, gom đến `end`, tách `<thân>` và checksum tại `checksumMark` cuối, kiểm checksum, tách thân theo `separator`, token đầu tra bản tin cùng hướng, số trường phải bằng `fields.length` (khác thì `malformed`), uint đọc bằng `/^\d+$/`, enum giữ số trên dây. Bộ đọc nhị phân: tìm `header`, đọc code và độ dài, chờ đủ phần tải và checksum, kiểm checksum, đọc các trường theo độ rộng (ascii bỏ 0x00 đệm cuối), độ dài khác tổng độ rộng thì `malformed`, code lạ thì `malformed`. Cả hai: bộ đệm vượt `maxFrameBytes` mà chưa đủ khung thì xóa bộ đệm và bỏ mọi byte đến `start` hoặc `header` kế tiếp, để phần đuôi khung bị cắt không tạo khung. Không dùng `enum` hay thuộc tính tham số trong hàm dựng; dùng hàm trả đối tượng thay cho `class`.

### `src/lib/device/capabilities.ts`

```ts
export interface DeviceCapabilities { model: string; confirmed: boolean; source: 'device' | 'table'; note: string; energyLevels: number[]; treatmentModes: { value: string; label: string }[]; minTreatmentTimeSec: { min: number; max: number } | null }
export const SIM_MODEL: string;
export const CAPABILITIES: Record<string, DeviceCapabilities>;
export function capabilitiesFor(model: string | undefined): DeviceCapabilities | null;
export function capabilitiesFromDevice(values: WireValues, spec: ProtocolSpec, model: string): DeviceCapabilities;
export const MODE_LABELS: Record<string, string>; // cold: 'Cold', hybrid: 'Hybrid', thermal: 'Thermal'; mã lạ hiện chính nó
```

`CAPABILITIES` là bảng dự phòng, có đúng một mục khóa `SIM_MODEL = 'Plasma Pro + mô-đun IoMT ESP32'`, trùng chuỗi `model` của ba thiết bị trong `src/lib/seed.ts` và của `registerDevice` trong `store.tsx` (khóa khác thì `capabilitiesFor(device?.model)` luôn trả `null` với dữ liệu demo). Mục này có `confirmed: false`, `source: 'table'`, `note: 'Báo cáo giữa kỳ đồ án nhúng, bảng mục 3.2.1.1 (GA-3), chưa xác nhận với firmware'`, `energyLevels: [1, 2, 3, 4, 5]`, chế độ `cold`, `hybrid`, `thermal`, `minTreatmentTimeSec: null`. `capabilitiesFromDevice` dựng từ bản tin `caps`: `energyLevels` từ `energy_min` đến `energy_max`, `treatmentModes` là các khóa của `treatment_mode.map` có bit bật trong `mode_mask`, `minTreatmentTimeSec` từ `time_min_s`, `time_max_s`, `source: 'device'`, `confirmed` bằng `spec.confirmed`. Bảng dự phòng vẫn dùng ở màn soạn liệu trình (lúc đó điện thoại bác sĩ thường không cắm máy).

### `src/lib/device/protocol.ts` (thuần)

```ts
export interface TreatmentConfig { patientId: string; minTreatmentTimeSec: number; energyLevel: number; treatmentMode: string; at: Date }
export type ConfigError = 'patient_id_empty' | 'patient_id_too_long' | 'patient_id_charset' | 'time_invalid' | 'time_out_of_range' | 'energy_not_allowed' | 'mode_not_allowed' | 'mode_not_in_spec' | 'value_out_of_wire_range' | 'capabilities_unknown';
export function validateConfig(cfg: TreatmentConfig, caps: DeviceCapabilities | null, spec: ProtocolSpec): ConfigError[];
export function deviceClock(at: Date, offsetMin: number): { day: number; month: number; year: number; hour: number; minute: number; second: number };
export function configToWire(cfg: TreatmentConfig, spec: ProtocolSpec): WireValues; // 10 trường sau khi chia đơn vị, cộng bù, tra bảng mã
export function encodeConfig(cfg: TreatmentConfig, spec: ProtocolSpec): Uint8Array; // ném lỗi nếu validateConfig(cfg, null, spec) còn mã không phụ thuộc năng lực
export function encodeQuery(which: 'query_info' | 'query_caps', spec: ProtocolSpec): Uint8Array | null; // null nếu đặc tả không có bản tin này
export type DeviceMessage =
  | { kind: 'ack'; command: MessageKey | null }
  | { kind: 'nak'; command: MessageKey | null; code: string }
  | { kind: 'status'; state: 'idle' | 'running' | 'done' | 'stopped' | 'error'; remainingSec: number | null }
  | { kind: 'info'; protocolVersion: number; firmwareVersion: string; model: string }
  | { kind: 'caps'; values: WireValues }
  | { kind: 'unknown'; message: MessageKey; values: WireValues };
export function toDeviceMessage(frame: Extract<DecodedFrame, { kind: 'frame' }>, spec: ProtocolSpec): DeviceMessage;
```

Quy tắc `validateConfig`: luật của `patient_id` (độ dài, bộ ký tự) đọc từ `FieldSpec` của đặc tả, không viết cứng; `patientId` sau `trim` không rỗng; thời gian là số nguyên dương, nằm trong `caps.minTreatmentTimeSec` nếu có; `energyLevel` thuộc `caps.energyLevels`; `treatmentMode` thuộc `caps.treatmentModes` (`mode_not_allowed`) và là khóa của `treatment_mode.map` (`mode_not_in_spec`); mọi giá trị sau `configToWire` vừa độ rộng và `min`, `max` của trường (`value_out_of_wire_range`); `caps === null` trả `capabilities_unknown`. `deviceClock` cộng `offsetMin` vào thời điểm UTC rồi đọc bằng các hàm `getUTC*`, không phụ thuộc múi giờ của điện thoại. `encodeConfig` gọi `validateConfig(cfg, null, spec)`, bỏ các mã phụ thuộc năng lực (`capabilities_unknown`, `energy_not_allowed`, `mode_not_allowed`, `time_out_of_range`), còn mã nào thì ném `Error`, rồi gọi `createCodec(spec).encode('config', configToWire(cfg, spec))`. `msg_ref` giải về khóa bản tin (`'config'`…) hoặc `null` nếu không khớp. Mã `nak.code` kiểu enum đổi ngược về tên khóa; số không có trong bảng thành `'#<số>'`.

### `src/lib/device/vectors.ts` (thuần)

```ts
export interface ConfigVector { name: string; spec: 'text' | 'binary'; source: 'app' | 'firmware'; config: { patientId: string; minTreatmentTimeSec: number; energyLevel: number; treatmentMode: string; atIso: string }; hex: string }
export interface ReplyVector { name: string; spec: 'text' | 'binary'; source: 'app' | 'firmware'; hex: string; expect: DeviceMessage | { kind: 'bad_checksum' } | { kind: 'malformed' } }
export const CONFIG_VECTORS: ConfigVector[];
export const REPLY_VECTORS: ReplyVector[];
```

Ví dụ đối chiếu là hợp đồng giữa ứng dụng và firmware: cùng một cấu hình phải ra cùng một chuỗi byte ở cả hai phía. Giai đoạn 1 các ví dụ có `source: 'app'` (do ứng dụng tính, chép sang ICD mục 8); khi nhóm firmware gửi ví dụ chạy trên mạch thật thì thêm với `source: 'firmware'` và giữ nguyên ví dụ cũ nếu vẫn đúng. Ví dụ tối thiểu (giá trị đã tính bằng một chương trình Python độc lập ngày 11/11/2026, chép trong ICD):

- Văn bản, cấu hình `BN001`, 120 giây, mức 3, `cold`, `2026-11-10T23:30:05Z`: chuỗi `$CFG,BN001,120,3,0,11,11,2026,6,30,5*49\r\n`.
- Văn bản, trả lời: `$ACK,CFG*27\r\n` là `ack` của `config`; `$NAK,CFG,BUSY*1B\r\n` là `nak` mã `BUSY`; `$STA,1,42*71\r\n` là `status` `running` 42 giây; `$INF,1,0.1.0,SIM-PLASMA*15\r\n` là `info`; `$CAP,1,5,7,60,1800*42\r\n` là `caps`; `$ACK,CFG*28\r\n` là `bad_checksum`.
- Nhị phân (`PROTOCOL_BINARY_EXAMPLE`), cùng cấu hình: `AA 55 01 1A 42 4E 30 30 31 00 00 00 00 00 00 00 00 00 00 00 78 00 03 00 0B 0B 1A 06 1E 05 58 BA`; trả lời `AA 55 81 01 01 E1 B8` là `ack` của `config`.

### `src/lib/device/transport.ts` (chỉ kiểu)

```ts
export type TransportKind = 'simulated' | 'usb-android' | 'usb-ios';
export type LinkState = 'disconnected' | 'connecting' | 'connected' | 'error';
export interface DeviceTransport {
  kind: TransportKind;
  model: string;
  open(): Promise<void>;
  close(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  onData(cb: (chunk: Uint8Array) => void): () => void;
  onState(cb: (s: LinkState, detail?: string) => void): () => void;
}
```

Đường truyền chỉ chuyển byte, không biết gì về khung; nhờ vậy bản USB Android, USB iOS sau này không phụ thuộc đặc tả.

### `src/lib/device/trace.ts` (thuần)

```ts
export interface TraceEntry { at: string; dir: 'tx' | 'rx'; hex: string; ascii: string }
export function withTrace(t: DeviceTransport, limit?: number): DeviceTransport & { trace(): TraceEntry[]; clearTrace(): void; onTrace(cb: (e: TraceEntry) => void): () => void };
```

Bọc một đường truyền, ghi mọi lần `write` (`tx`) và mọi khối `onData` (`rx`) vào vòng đệm `limit` mục (mặc định 200), `ascii` thay byte ngoài 0x20..0x7E bằng `.`. Dùng cho màn chẩn đoán.

### `src/lib/device/sender.ts` (thuần)

```ts
export type SendResult =
  | { kind: 'acked'; attempts: number }
  | { kind: 'nacked'; code: string; attempts: number }
  | { kind: 'timeout'; attempts: number }
  | { kind: 'disconnected'; attempts: number }
  | { kind: 'incompatible'; deviceVersion: number; appVersion: number }
  | { kind: 'invalid'; errors: ConfigError[] };
export interface Timer { set(fn: () => void, ms: number): unknown; clear(handle: unknown): void }
export function request(t: DeviceTransport, frame: Uint8Array, accept: (m: DeviceMessage) => boolean, spec: ProtocolSpec, timer?: Timer): Promise<{ kind: 'reply'; message: DeviceMessage; attempts: number } | { kind: 'timeout' | 'disconnected'; attempts: number }>;
export type DeviceIdentity = { kind: 'known'; info: Extract<DeviceMessage, { kind: 'info' }> | null; caps: DeviceCapabilities | null } | { kind: 'no_reply' } | { kind: 'disconnected' };
export function identifyDevice(t: DeviceTransport, spec: ProtocolSpec, timer?: Timer): Promise<DeviceIdentity>;
export function sendConfig(t: DeviceTransport, cfg: TreatmentConfig, caps: DeviceCapabilities | null, spec: ProtocolSpec, opts?: { timer?: Timer; deviceVersion?: number | null }): Promise<SendResult>;
```

`request` là máy trạng thái chung: đăng ký `onData` (qua `createCodec(spec).createReader('device_to_app')` riêng của lần gửi, rồi `toDeviceMessage`) và `onState` trước khi ghi, vì thiết bị giả lập có thể phản hồi ngay trong lúc `write`; ghi khung (`write` bị từ chối thì `disconnected`); chờ bản tin mà `accept` nhận trong `ackTimeoutMs`; hết giờ thì gửi lại, tối đa `maxRetries` lần gửi lại (tổng `maxRetries + 1` lần); trạng thái `disconnected` hay `error` giữa chừng trả `disconnected`; `bad_checksum`, `malformed` và bản tin không được `accept` bị bỏ qua; một hàm `finish` duy nhất gỡ `onData`, `onState`, xóa hẹn giờ và chặn kết thúc hai lần.

`identifyDevice`: nếu đặc tả có `query_info` thì `request` với `accept` là `info`, rồi nếu có `query_caps` thì `request` với `accept` là `caps` và dựng `capabilitiesFromDevice`; đặc tả không có hai bản tin này thì trả `{ kind: 'known', info: null, caps: null }`; hết giờ ở bản tin đầu trả `no_reply` (firmware chưa cài lệnh hỏi, ứng dụng dùng bảng dự phòng).

`sendConfig`: `validateConfig` lỗi thì trả `invalid`, không ghi gì; `deviceVersion` khác `null`, khác `undefined` và khác `spec.protocolVersion` thì trả `incompatible`, không ghi gì; còn lại `request(t, encodeConfig(cfg, spec), m => (m.kind === 'ack' || m.kind === 'nak') && m.command === 'config', spec, timer)`; `ack` là `acked`, `nak` là `nacked` (không gửi lại). `timer` mặc định dùng `setTimeout`/`clearTimeout`, kiểm thử truyền bộ hẹn giờ giả.

### `src/lib/device/simulated.ts` (thuần)

```ts
export interface SimOptions { model?: string; dropFirst?: number; corruptFirst?: number; nakCode?: string | null; failOpen?: boolean; tickMs?: number; timer?: Timer; answersQueries?: boolean; protocolVersion?: number; caps?: { energyMin: number; energyMax: number; modes: string[]; timeMinSec: number; timeMaxSec: number } }
export function createSimulatedTransport(spec: ProtocolSpec, opts?: SimOptions): DeviceTransport & { lastConfig(): WireValues | null; received(): number; startSession(): void; stopSession(): void };
```

Thiết bị giả lập được dựng từ chính đặc tả: dùng `createCodec(spec).createReader('app_to_device')` để đọc và `encode` để trả lời, nên khi đổi đặc tả (kể cả sang khung nhị phân) giả lập tự nói theo. Khi nhận khung: tăng bộ đếm `received()`; còn trong `dropFirst` thì bỏ qua; `bad_checksum` trả `nak` mã `BAD_CHECKSUM`; `malformed` trả `nak` mã `BAD_FIELDS` (với `command` là `config` khi không xác định được); `query_info` trả `info` (`protocolVersion` mặc định `spec.protocolVersion`, `firmware_version` `'sim'`, `model` `'SIM-PLASMA'`) và `query_caps` trả `caps` từ `opts.caps` (mặc định mức 1 đến 5, ba chế độ, 60 đến 1800 giây, ghi rõ là giá trị giả lập) trừ khi `answersQueries === false` (để kiểm nhánh dùng bảng dự phòng); `config` có `nakCode` thì trả `nak` mã đó; còn trong `corruptFirst` thì trả `ack` rồi đảo một bit của byte checksum; còn lại lưu giá trị trên dây cho `lastConfig()` và trả `ack`. Phản hồi phát đồng bộ trong `write`. `startSession` chỉ chạy khi có cấu hình hợp lệ, lấy `min_treatment_time` (nhân `divisor` nếu có) làm số giây, phát `status` `running` ngay rồi mỗi `tickMs` (mặc định 1000) giảm 1, đến 0 phát `done`; `stopSession` hủy hẹn giờ và phát `stopped`. `model` mặc định là `SIM_MODEL`. `open()` phát `connecting` rồi `connected` (hoặc `error` và từ chối khi `failOpen`); `close()` hủy phiên và phát `disconnected`; `write` khi chưa `connected` thì từ chối. Mã nak kiểu enum mà tên không có trong bảng thì giả lập dùng số đầu tiên của bảng.

### `src/lib/device/index.ts`

```ts
export function getTransport(): ReturnType<typeof withTrace>; // giai đoạn 1 luôn là withTrace(createSimulatedTransport(PROTOCOL)), một thể hiện dùng chung trong phiên chạy ứng dụng
export function planToConfig(plan: TreatmentPlan, patient: Patient, at: Date): TreatmentConfig | { missing: ('duration' | 'energy' | 'mode')[] };
export { PROTOCOL } from './protocol.config';
```

`planToConfig` lấy `patient.code` làm `patientId` (không dùng họ tên), `plan.durationSec` làm `minTreatmentTimeSec`, `plan.doseLevel` làm `energyLevel`, `plan.treatmentMode` làm `treatmentMode`; thiếu trường nào thì trả danh sách thiếu.

### `src/lib/device/useDeviceLink.ts`

Hook React bọc `getTransport()`: trả `{ kind, model, state, detail, identity, caps, capsSource, connect(), disconnect(), send(cfg), lastStatus, lastStatusAt, startSession(), stopSession() }`. Sau khi `open()` thành công, `connect` gọi `identifyDevice(transport, PROTOCOL)` và lưu `identity`; `caps` là `identity.caps` nếu có, ngược lại `capabilitiesFor(model)`; `capsSource` là `'device' | 'table' | 'none'`. `send(cfg)` gọi `sendConfig(transport, cfg, caps, PROTOCOL, { deviceVersion: identity?.info?.protocolVersion ?? null })`. Đăng ký `onState`, `onData` (qua bộ đọc `device_to_app` để lấy bản tin `status` gần nhất) khi mount, gỡ khi unmount. `startSession`, `stopSession` chỉ có với bản giả lập.

### `src/lib/ai/recognizer.ts`, `src/lib/ai/result.ts`, `src/lib/ai/index.ts`

```ts
// result.ts (thuần)
export interface RecognitionResult { found: boolean; box: { x: number; y: number; width: number; height: number } | null; hull: [number, number][]; center: { x: number; y: number } | null; areaFraction: number | null; contrast: number | null; confidence: number | null; modelId: string; modelVersion: string }
export function fromColorDetection(d: WoundDetection | null, modelId: string, modelVersion: string): RecognitionResult;
// recognizer.ts (chỉ kiểu)
export interface WoundRecognizer { id: string; version: string; kind: 'on_device' | 'remote'; recognize(uri: string): Promise<RecognitionResult> }
// index.ts
export function getRecognizer(): WoundRecognizer; // giai đoạn 1: bản bọc detectInPhoto (import từ '@/lib/capture/analyzeImage' để Metro chọn đúng analyzeImage.ts hay analyzeImage.web.ts), id = DETECTOR_ID, version '1', kind 'on_device'
```

`result.ts` chỉ `import type { WoundDetection } from '../capture/woundDetect'`. `fromColorDetection(null)` và `fromColorDetection(d)` với `d.found === false` đều trả `found: false`, `box: null`, `hull: []`, `center: null`, `areaFraction: null`, `contrast: null`, `confidence: null`. Khi `found`, chép `box`, `hull`, `center`, `areaFraction`, `contrast` từ `WoundDetection`. `center` cần cho `estimateFor` trong `guided-capture.tsx`, `contrast` cần cho `capture.wound`. Bộ dò màu không có độ tin cậy nên `confidence` luôn `null`, không bịa số.

### `src/lib/attention.ts` (thuần)

```ts
export type TodayState = 'treated' | 'due' | 'no_data' | 'rest' | 'no_plan';
export interface AttentionInput { patientId: string; hasActivePlan: boolean; scheduledToday: boolean; completedToday: number; targetPerDay: number; lastSyncDay: string | null; today: string; missedLast7: number; openReports: number; severity: 'mild' | 'moderate' | 'severe' | undefined }
export interface Attention { patientId: string; state: TodayState; score: number; reasons: string[] }
export function classifyToday(i: AttentionInput): TodayState;
export function rankPatients(inputs: AttentionInput[]): Attention[]; // điểm giảm dần, hòa thì giữ thứ tự vào
```

Liệu trình gắn theo vết thương (`coursePlan(woundId)` trong `useLookups`), một người bệnh có thể có nhiều đợt. Cách dựng `AttentionInput` cho một người bệnh (làm ở `doctor/index.tsx`, `today = localDay()`): các đợt xét là `coursePlan(w.id)` của từng vết có `status === 'active'`; `hasActivePlan` là có ít nhất một đợt như vậy; `scheduledToday` là có đợt mà `isScheduled(plan, today)`; `targetPerDay` là tổng `sessionsPerDay ?? 1` của các đợt có lịch hôm nay; `completedToday` là số phiên `status === 'completed'` trong `sessionsOf(patient.deviceId)` có `localDay(start) === today` (không có thiết bị thì 0); `lastSyncDay` là `localDay(device.lastSync)` hoặc `null`; `missedLast7` là số ngày trong 7 ngày trước hôm nay có lịch theo ít nhất một đợt, không có phiên hoàn tất, và không sau `lastSyncDay` (cùng quy tắc với `missed` trong `courseProgress`); `openReports` là số `data.reports` của người bệnh có `handled === false`; `severity` là `patientSeverity(data, patient.id)`.

`classifyToday`: không có đợt đang áp dụng là `no_plan`; không có lịch hôm nay là `rest`; `completedToday >= targetPerDay` là `treated`; `lastSyncDay` khác `today` (hoặc `null`) là `no_data`; còn lại là `due`. Điểm: mỗi báo cáo chưa xử lý +100, mức Nặng +50, Trung bình +20, mỗi ngày bỏ lỡ trong 7 ngày +10, `no_data` +5. `reasons` là các câu tiếng Việt ngắn tương ứng (ví dụ "2 báo cáo chưa xử lý", "Bỏ lỡ 3 buổi trong 7 ngày", "Chưa có dữ liệu hôm nay").

### Màn hình mới

- `src/app/connect-device.tsx`, tham số `patientId` (người bệnh mở không cần tham số, dùng `me.patientId`) và `woundId` tùy chọn. Quyền: dùng `useCanView` như các màn lâm sàng khác, tức người bệnh của hồ sơ đó và bác sĩ phụ trách; quản trị viên thấy `NoAccess` vì màn này hiện mã hồ sơ, mức và chế độ điều trị (đặc tả mục 9, ghi chú trong `src/components/Guard.tsx`: quản trị không mặc định xem dữ liệu lâm sàng). Đợt được gửi: các vết của người bệnh có `coursePlan(w.id)` với `status === 'active'` và `confirmed`; có hơn một đợt như vậy thì hiện `Choices` chọn vết (như `plan/[patientId].tsx`), lấy `woundId` từ tham số nếu có; một máy chỉ nạp một cấu hình mỗi lần. Nội dung: trạng thái kết nối và loại đường truyền (nhãn "Thiết bị giả lập" khi `kind === 'simulated'`); nút Kết nối, Ngắt; bảng xem trước 10 trường sẽ gửi (đọc từ `planToConfig` của đợt đã chọn, kiểm bằng `validateConfig` với `caps` của `useDeviceLink`); nếu thiếu trường hoặc `validateConfig` báo lỗi thì hiện lỗi tiếng Việt và khóa nút Gửi; nút "Gửi cấu hình xuống máy"; kết quả (đã nhận, máy từ chối kèm mã, hết giờ sau N lần, mất kết nối) và nút Gửi lại; ghi nhật ký gửi vào store. Sau khi kết nối, hiện thông tin máy đọc bằng `INF` và nguồn năng lực (đọc từ máy hay bảng dự phòng); phiên bản giao thức không khớp thì khóa Gửi. Hiện cảnh báo khi `PROTOCOL.confirmed` là `false`: "Giao thức chưa được firmware xác nhận."
- `src/app/session-monitor.tsx`, cùng tham số và quyền. Hiện trạng thái kết nối, trạng thái phiên từ khung `status` cuối cùng, giây còn lại, thời điểm nhận khung cuối; báo khi mất kết nối. Với bản giả lập có nút "Bắt đầu phiên (giả lập)", "Dừng phiên (giả lập)".
- `src/app/device-diagnostics.tsx`, chỉ quản trị viên. Hiện đặc tả đang dùng (kiểu khung, checksum, phiên bản, `confirmed`, kết quả `checkSpec`), hỏi thông tin máy, gửi một cấu hình thử với mã `TEST01`, và bảng byte gửi, nhận dạng hex kèm ASCII từ `withTrace`. Bản ghi bị xóa khi mở màn, nên không hiện khung của phiên lâm sàng. Dùng khi nối mạch thật lần đầu: so byte trên màn với byte firmware in ra cổng gỡ lỗi. Lối vào là một nút ở `src/app/admin/devices.tsx`.

### Kiểm thử mới

`src/lib/device/checksum.test.cjs`, `spec.test.cjs`, `protocol.test.cjs`, `vectors.test.cjs`, `simulated.test.cjs`, `sender.test.cjs`, `trace.test.cjs`, `src/lib/ai/result.test.ts`, `src/lib/attention.test.ts`. Mỗi tệp mở đầu bằng `// Chạy: node <đường dẫn>` và dùng `node:assert/strict`. Hai tệp `.test.ts` import tệp nguồn có đuôi `.ts` như `src/lib/devices.test.ts` (nguồn của chúng chỉ có `import type`). Bảy tệp `.test.cjs` của `device/` dùng hàm `load` có bộ nhớ đệm và `require` lồng như `src/lib/workflow.test.cjs` (có `/* global __dirname */` cho ESLint), vì các mô-đun trong `device/` import giá trị từ tệp cùng thư mục.

## Tệp sửa

- `src/lib/types.ts`: thêm `import type { TransportKind } from './device/transport'` và `import type { SendResult } from './device/sender'`; thêm `treatmentMode?: string | null` vào `TreatmentPlan` (ghi chú: `doseLevel` là `energy_level` gửi firmware); thêm kiểu `DeviceLinkLog { id: string; deviceId: string | null; patientId: string; planId: string; planVersion: number; at: string; by: string; transport: TransportKind; result: SendResult['kind']; attempts: number; code?: string }` và trường `deviceLinks?: DeviceLinkLog[]` trong `AppData` (tùy chọn để dữ liệu cũ đọc được).
- `src/lib/store.tsx`: khi đọc dữ liệu đã lưu thì `saved.deviceLinks ??= []` như `sessionNotes`; thêm `recordDeviceLink(entry: Omit<DeviceLinkLog, 'id' | 'at' | 'by'>)` vào interface `Store` và vào giá trị của provider, kiểm người gọi là người bệnh của hồ sơ hoặc bác sĩ phụ trách (dùng `requireDoctor` cho bác sĩ). `createSeed` trong `src/lib/seed.ts` thêm `deviceLinks: []`.
- `src/app/plan/[patientId].tsx`: thêm ô chọn chế độ (`Choices`) và đổi ô mức năng lượng thành ô chọn, cả hai lấy từ `capabilitiesFor(device?.model)` của thiết bị gán cho người bệnh; nếu `null` thì hiện "Chưa có danh sách mức và chế độ cho mẫu thiết bị này" và giữ ô nhập số cũ cho mức, không có ô chế độ. Đợt "Đang áp dụng" cần thêm `treatmentMode` khi bảng năng lực có chế độ (báo lỗi ở bước 1 "Liều" bằng `fail(1, …)` như kiểm tra mức, thời gian hiện có). Nếu `latest.doseLevel` hoặc `latest.treatmentMode` không thuộc danh sách (ví dụ đợt mẫu `pl-1` có `doseLevel: 8` trong khi danh sách là 1 đến 5) thì ô chọn để trống, buộc bác sĩ chọn lại. Thêm `treatmentMode` vào đối tượng truyền cho `savePlan` (hàm `save` đang liệt kê từng trường, không trải `latest`).
- `src/components/CourseCard.tsx`, `src/app/schedule.tsx`, `src/app/wounds/[id].tsx`: hiện nhãn chế độ cạnh mức năng lượng khi có.
- `src/app/patient/device.tsx`: thêm hai nút "Kết nối máy và nạp liệu trình" (mở `/connect-device`) và "Theo dõi phiên điều trị" (mở `/session-monitor`).
- `src/app/devices/[id].tsx`: với bác sĩ phụ trách, thêm hai nút tương tự, truyền `patientId` của người giữ máy.
- `src/app/guided-capture.tsx`: thay `detectInPhoto(photo.uri)` bằng `getRecognizer().recognize(photo.uri)` và bỏ `detectInPhoto` khỏi dòng import `@/lib/capture/analyzeImage` (giữ `analyzeImage`). Đổi `photoWound` sang `RecognitionResult | null`, đổi `roiFrom` và `estimateFor` sang nhận `RecognitionResult | null` (`roiFrom` dùng `found`, `box`; `estimateFor` dùng `found`, `center`, `areaFraction` và trả `null` khi `areaFraction === null`). Phần lưu `capture.wound` chỉ ghi khi `found`, có `box` và `areaFraction !== null`, lấy `detector` từ `modelId`, `contrast` chỉ ghi khi khác `null`. Bỏ import `DETECTOR_ID` nếu không còn dùng; giữ `coverMap`, `WoundDetection` cho luồng xem trước trực tiếp.
- `src/lib/capture/types.ts`: đổi `contrast: number` thành `contrast?: number` trong `CaptureMetadata.wound`, vì mô-đun AI khác không có trường này. Chỉ `guided-capture.tsx` ghi trường này; `research.ts` và `images/[id].tsx` không đọc nó.
- `src/app/doctor/index.tsx`: dựng `AttentionInput` cho từng người bệnh theo quy tắc ở mục `attention.ts` (dùng `coursePlan`, `woundsOf`, `device`, `sessionsOf` từ `useLookups`, `isScheduled`, `localDay` từ `@/lib/course`, `patientSeverity` từ `@/lib/access`), gọi `rankPatients`, hiện danh sách theo thứ tự đó; mỗi thẻ có chip trạng thái hôm nay và dòng lý do đầu tiên.
- `src/components/items.tsx`: `PatientCard` nhận thêm prop tùy chọn `attention?: Attention` để hiện chip và lý do; không truyền thì hiện như cũ.
- `package.json`: nối 9 lệnh kiểm thử mới vào script `test` (`checksum`, `spec`, `protocol`, `vectors`, `simulated`, `sender`, `trace` trong `src/lib/device/*.test.cjs`, `node src/lib/ai/result.test.ts`, `node src/lib/attention.test.ts`).
- `docs/thiet-ke/doi-chieu-ma-nguon.md`: cập nhật dòng FR2, FR4, FR10, FR11, NFR3 theo mã mới.

## Không thay đổi

- Vai trò `admin` và các màn hiện có trong `src/app/admin/*`; chỉ thêm một nút mở màn chẩn đoán vào `src/app/admin/devices.tsx`.
- `setDevicePower`, `simulateSession` trong `store.tsx` và phần mô phỏng ở `DeviceView` (mức `tech`): giữ cho đến khi có quyết định riêng về lệnh bật tắt từ xa.
- `useWoundTracker`, `woundDetect.ts` và luồng xem trước trực tiếp trên camera; mô-đun AR `modules/plasma-ar`.
- Quy tắc đặt tên ảnh, xuất bộ dữ liệu, gán nhãn diện tích (`naming.ts`, `export.ts`, `research.ts`).
- Không thêm thư viện mới, không thêm mã gốc Android, iOS; không tạo thư mục `ios/`, `android/`.
- Không dựng backend hay database.

## Trường hợp biên

- Chưa có đợt đang áp dụng, hoặc đợt chưa được bác sĩ xác nhận: màn kết nối không cho gửi, hiện "Chưa có đợt điều trị được bác sĩ xác nhận".
- Đợt thiếu thời gian, mức hoặc chế độ: liệt kê trường thiếu, khóa nút Gửi.
- Mã hồ sơ có ký tự ngoài `[A-Za-z0-9_-]` hoặc dài hơn giới hạn: `validateConfig` báo lỗi, không ghi xuống đường truyền.
- Thiết bị không phản hồi: gửi lại đúng `maxRetries` lần rồi báo hết giờ; không treo màn hình.
- Phản hồi sai checksum: bỏ qua, tiếp tục chờ đến hết giờ.
- Rút cáp giữa lúc chờ xác nhận: trả `disconnected`, màn hình báo "Mất kết nối, hãy cắm lại cáp và gửi lại".
- Nhận nhiều khung trong một lần đọc, hoặc một khung bị chia thành nhiều lần đọc: `FrameReader` tách đúng.
- Bộ đệm nhận vượt 1024 ký tự mà không có khung đủ: xóa bộ đệm để không tràn bộ nhớ.
- Điện thoại đặt múi giờ khác UTC+7: ngày giờ gửi xuống vẫn theo `timeZoneOffsetMin`.
- Máy trả `info` với phiên bản giao thức khác `PROTOCOL.protocolVersion`: `sendConfig` trả `incompatible`, không ghi khung cấu hình; màn kết nối nói rõ hai phiên bản.
- Máy không trả lời `INF`, `CAP` (firmware chưa cài lệnh hỏi): `identifyDevice` trả `no_reply` sau `maxRetries + 1` lần, dùng bảng dự phòng `CAPABILITIES`, màn kết nối ghi nguồn năng lực.
- Năng lực máy báo khác bảng dự phòng (ví dụ máy chỉ có 3 mức): kiểm theo năng lực máy; đợt có mức ngoài danh sách của máy bị `energy_not_allowed`.
- Sửa `protocol.config.ts` sai (thiếu trường, mã enum trùng, ký tự khung lọt vào bộ ký tự): `checkSpec` trong `npm test` báo lỗi trước khi chạy ứng dụng.
- Đổi `framing.kind` từ văn bản sang nhị phân: không sửa mã; giả lập, bộ gửi và màn chẩn đoán tự theo đặc tả.
- Đọc dữ liệu cũ không có `deviceLinks` và liệu trình cũ không có `treatmentMode`: không lỗi.
- Người bệnh không còn liên kết hồ sơ (`me.patientId` rỗng): màn mới hiện `NoAccess`.
- Quản trị kỹ thuật mở `/connect-device` hoặc `/session-monitor`: `NoAccess`.
- Người bệnh có nhiều vết, mỗi vết một đợt đang áp dụng: phải chọn vết trước khi xem trước và gửi.
- Đợt cũ có mức năng lượng ngoài danh sách của mẫu (đợt mẫu `pl-1` có `doseLevel: 8`): `validateConfig` trả `energy_not_allowed`, màn kết nối hiện "Mức năng lượng của đợt không có trong danh sách của mẫu thiết bị, bác sĩ cần lưu phiên bản mới" và khóa nút Gửi.
- Người bệnh chưa được gán thiết bị: vẫn gửi được qua đường truyền đang nối, nhật ký ghi `deviceId: null`.

## Kịch bản kiểm thử

`checksum.test.cjs`:
- Giá trị kiểm chuẩn trên chuỗi ASCII `123456789`: `crc16_ccitt_false` bằng `0x29B1`, `crc16_modbus` bằng `0x4B37` (danh mục CRC RevEng); `xor8` và `sum8` của `CFG,BN001` bằng giá trị tính tay ghi trong chú thích; `none` có độ rộng 0.
- `toHex(fromHex('aa 55 01'))` bằng `'AA 55 01'`; `asciiToBytes` ném lỗi với ký tự `ơ`.

`spec.test.cjs`:
- `checkSpec(PROTOCOL)` và `checkSpec(PROTOCOL_BINARY_EXAMPLE)` trả `[]`.
- Mỗi lỗi sau làm `checkSpec` trả ít nhất một câu: bỏ trường `energy_level` khỏi `config`; thêm trường `session_count` vào `config`; hai chế độ cùng mã 0; `charset` của `patient_id` chứa `,` với khung văn bản; hai bản tin cùng hướng trùng token; có `query_info` mà thiếu `info`; `min_treatment_time` uint 1 byte với `max: 1800`.

`protocol.test.cjs`:
- `deviceClock(new Date('2026-11-10T23:30:05Z'), 420)` trả `{ day: 11, month: 11, year: 2026, hour: 6, minute: 30, second: 5 }`.
- `validateConfig` trả đúng mã cho: mã rỗng (`patient_id_empty`), mã 17 ký tự (`patient_id_too_long`), mã có dấu phẩy (`patient_id_charset`), thời gian 0 và 12,5 (`time_invalid`), thời gian 30 khi `caps` cho 60 đến 1800 (`time_out_of_range`), mức 7 (`energy_not_allowed`), chế độ `laser` (`mode_not_allowed`, `mode_not_in_spec`), `caps = null` (`capabilities_unknown`), thời gian 70000 với uint 2 byte (`value_out_of_wire_range`); cấu hình hợp lệ trả `[]`. Đổi `maxLength` của `patient_id` trong một bản sao đặc tả thành 4 thì `BN001` bị `patient_id_too_long` (luật đọc từ đặc tả).
- Bản sao đặc tả với `min_treatment_time` có `divisor: 60`, `round: 'ceil'`: 90 giây thành giá trị trên dây `2`.
- Cùng một cấu hình mã hóa bằng `PROTOCOL` rồi bằng `PROTOCOL_BINARY_EXAMPLE`, mỗi lần đọc lại bằng bộ đọc `app_to_device` của chính đặc tả đó, đều ra lại đúng 10 giá trị (đổi kiểu khung không đổi kết quả).
- Bộ đọc văn bản: hai khung trong một lần đẩy trả 2; khung chia ba lần đẩy chỉ trả 1 ở lần cuối; rác trước `$` bị bỏ; `$` cộng 1100 ký tự không có `\r\n` làm `buffered === 0` và đẩy tiếp `abc*00\r\n` trả `[]`; thiếu `*` là `malformed`; sai số trường là `malformed`.
- Bộ đọc nhị phân: khung chia từng byte vẫn ra 1 khung; rác trước `AA 55` bị bỏ; độ dài khai báo khác tổng độ rộng là `malformed`; code lạ là `malformed`.
- `encodeQuery('query_info', spec)` trả `null` khi bản sao đặc tả bỏ `query_info`.

`vectors.test.cjs`:
- Với mỗi `CONFIG_VECTORS`: `toHex(encodeConfig(config, đặc tả tương ứng))` bằng `hex` của ví dụ (so chuỗi hex đã chuẩn hóa).
- Với mỗi `REPLY_VECTORS`: đẩy `fromHex(hex)` vào bộ đọc `device_to_app`, kết quả (`toDeviceMessage` nếu là `frame`) bằng `expect` (`deepEqual`; với `bad_checksum`, `malformed` chỉ so `kind`).
- Thông báo lỗi của mỗi phép so ghi `name` và `source` của ví dụ, để khi ví dụ của nhóm firmware không khớp thì biết ngay ví dụ nào.

`simulated.test.cjs` (chạy cùng kịch bản cho `PROTOCOL` và `PROTOCOL_BINARY_EXAMPLE`):
- `failOpen: true`: `open()` bị từ chối và hàm nghe `onState` nhận `error` cuối cùng; `write` khi chưa `open()` bị từ chối.
- `startSession` trước khi có cấu hình hợp lệ không phát khung nào; sau cấu hình 3 giây và `advance(tickMs)` lặp lại thì nhận `running` với 3, 2, 1 rồi `done`; `stopSession` khi đang chạy phát `stopped`.
- `query_info` nhận `info` với `protocolVersion` bằng `spec.protocolVersion`; `answersQueries: false` thì không phát gì.

`sender.test.cjs` (thiết bị giả lập đã `open()` trừ khi ghi khác; một bộ hẹn giờ giả dùng chung):
- ACK ngay: `{ kind: 'acked', attempts: 1 }`; `dropFirst: 1`: `acked`, `attempts: 2`; `dropFirst: 5` với `maxRetries: 2`: `timeout`, `attempts: 3`; `nakCode: 'BUSY'`: `nacked`, `code: 'BUSY'`, `attempts: 1`, `received() === 1`; `corruptFirst: 1`: `acked`, `attempts: 2`.
- `dropFirst: 5` rồi `close()` trước khi hết giờ: `disconnected`; gửi khi chưa `open()`: `disconnected` và `Promise` kết thúc.
- Cấu hình sai: `invalid` và `lastConfig()` là `null`; `deviceVersion: 2` với `protocolVersion: 1`: `incompatible` và `received() === 0`.
- Sau khi có kết quả, ghi thêm dữ liệu từ phía thiết bị (ví dụ `startSession`) thì số lời gọi mới tới hàm nghe của `sendConfig` bằng 0.
- `identifyDevice`: giả lập trả lời đủ thì `known` với `caps.source === 'device'`, `energyLevels` `[1, 2, 3, 4, 5]`; `caps: { modes: ['cold'] … }` thì `treatmentModes` chỉ có `cold`; `answersQueries: false` thì `no_reply` sau `maxRetries + 1` lần gửi; bản sao đặc tả không có `query_info`, `query_caps` thì `known` với `info: null`, `caps: null` và `received() === 0`.
- Cả nhóm kịch bản `sendConfig` chạy lại với `PROTOCOL_BINARY_EXAMPLE` và cho cùng kết quả.

`trace.test.cjs`:
- Bọc giả lập bằng `withTrace`, gửi một cấu hình: có một mục `tx` và một mục `rx`, `hex` của `tx` bằng `toHex(encodeConfig(…))`; vượt `limit` thì mục cũ nhất bị bỏ; `clearTrace()` làm `trace()` rỗng.


`result.test.ts`:
- `fromColorDetection(null, …)` trả `found: false`, `confidence: null`.
- `WoundDetection` có `found: false`: cũng trả `found: false`, `box: null`, `areaFraction: null`.
- Phát hiện có hộp và đường bao: giữ nguyên `box`, `hull`, `center`, `areaFraction`, `contrast`; `modelId`, `modelVersion` đúng tham số.

`attention.test.ts`:
- `classifyToday` cho từng trường hợp: không đợt, ngày nghỉ, đã đủ buổi, chưa đồng bộ hôm nay, đã đồng bộ nhưng chưa chiếu.
- Đủ buổi hôm nay nhưng `lastSyncDay` cũ vẫn là `treated` (dữ liệu đã có).
- `rankPatients`: người có 1 báo cáo chưa xử lý đứng trước người Nặng không báo cáo; người Nặng đứng trước người bỏ lỡ 3 buổi; hai người cùng điểm giữ thứ tự vào; `reasons` chứa câu về báo cáo.

## Kiểm tra sau khi làm

```bash
npm install
npm test
npx tsc --noEmit
npx expo lint
```

Chạy web để xem ba màn mới với thiết bị giả lập: `npm run web`. Đợt mẫu `pl-1` của BN001 chưa có chế độ và có mức 8 ngoài danh sách 1 đến 5, nên trước hết đăng nhập `bacsi`, mở đợt điều trị của BN001, chọn mức và chế độ, xác nhận và lưu phiên bản "Đang áp dụng" mới (không sửa dữ liệu mẫu để ứng dụng không tự đặt giá trị điều trị). Sau đó đăng nhập `benhnhan` / `Demo@123`, mở Thiết bị, Kết nối máy và nạp liệu trình, Gửi cấu hình, rồi Theo dõi phiên. Đăng nhập lại `bacsi` để xem danh sách người bệnh đã xếp theo mức cần chú ý. Đăng nhập `quantri` và mở `/connect-device?patientId=p-1` phải thấy `NoAccess`; mở Thiết bị, Chẩn đoán kết nối, gửi cấu hình thử và so dòng gửi với ví dụ đối chiếu.

## Ngoài phạm vi giai đoạn 1 (giai đoạn sau)

- Bản cài `usb-android` (mô-đun gốc dùng USB Host API, cần development build) và `usb-ios` (phụ thuộc bộ chuyển đổi đồ án phần cứng chọn; CP2102N không có trình điều khiển cho iOS).
- Thay `PROTOCOL` và `CAPABILITIES` bằng đặc tả firmware đã xác nhận (sửa `protocol.config.ts`, thêm ví dụ của nhóm firmware vào `vectors.ts`, chạy `npm test`; không sửa mã nếu không có trường điều trị mới).
- Sinh tệp `.h` cho firmware từ cùng đặc tả (ví dụ xuất `PROTOCOL` ra JSON rồi sinh hằng số C), nếu nhóm firmware muốn dùng chung một nguồn.
- Đọc nhật ký phiên từ máy (FR4) khi firmware có lệnh tương ứng.
- Thay bộ dò màu bằng mô-đun AI có sẵn khi biết dạng của mô-đun.
- Màn gán nhãn kiểu phân loại, khung hoặc phân vùng (FR15) khi bác sĩ chốt phương pháp.
- Đề xuất backend, database (viết trong hồ sơ thiết kế, không lập trình).

## Due diligence record

Mục này ghi kết luận của lượt thẩm định (due diligence) ngày 11/11/2026 về các sự kiện bên ngoài mà kế hoạch nêu hoặc để lại cho lúc triển khai; lượt kiểm tra sự kiện ở giai đoạn triển khai sẽ đọc mục này. Không lượt nào được coi một dòng ở đây là lý do để bỏ qua việc kiểm chứng: mục này ghi điều đã kết luận một lần, không khẳng định điều đó còn đúng ở thời điểm đọc. Ai sửa tay sự kiện tương ứng trong kế hoạch thì **xóa** dòng đó, không cập nhật nó, để mục này không trôi thành những khẳng định chưa ai kiểm.

- SETTLED: checksum kiểu NMEA là XOR mã ASCII của mọi ký tự nằm giữa `$` và `*` (không tính hai ký tự này), viết thành 2 chữ số hex ngay sau `*` (đã kiểm với Wikipedia, mục NMEA 0183; nguồn không quy định chữ hoa hay thường, ví dụ dùng chữ hoa, nên chọn hex hoa là quy ước của ứng dụng).
- SETTLED: Node chạy thẳng `.ts` bằng type stripping bắt buộc ghi đuôi tệp trong `import` và `require`, và không hỗ trợ `enum` cùng thuộc tính tham số trong hàm dựng; type stripping bật mặc định từ v22.18.0, máy hiện có Node v22.23.4 (đã kiểm với nodejs.org/api/typescript.html).
- SETTLED: `expo/tsconfig.base.json` của `expo@58.0.22` (bản trong `package-lock.json`) không bật `allowImportingTsExtensions`, và `tsconfig.json` của repo cũng không bật, nên import có đuôi `.ts` trong mã nguồn bị `tsc` từ chối (đã kiểm với cdn.jsdelivr.net/npm/expo@58.0.22/tsconfig.base.json và typescriptlang.org/tsconfig/allowImportingTsExtensions).
- SETTLED: import không đuôi `'@/lib/capture/analyzeImage'` để Metro tự chọn `analyzeImage.ts` hay `analyzeImage.web.ts` theo nền tảng (đã kiểm với docs.expo.dev/router/advanced/platform-specific-modules).
- SETTLED: CP2102N không có trình điều khiển cho iOS; Silicon Labs chỉ phát hành trình điều khiển VCP cho Windows, macOS, Linux và Android (đã kiểm với silabs.com/developers/usb-to-uart-bridge-vcp-drivers).
- SETTLED: giá trị kiểm chuẩn trên chuỗi ASCII `123456789` là `0x29B1` cho CRC-16/IBM-3740 (bí danh CRC-16/CCITT-FALSE: đa thức 0x1021, giá trị đầu 0xFFFF, không đảo bit, không XOR cuối) và `0x4B37` cho CRC-16/MODBUS (đa thức 0x8005, giá trị đầu 0xFFFF, đảo bit vào ra, không XOR cuối) (đã kiểm với danh mục CRC RevEng, reveng.sourceforge.io/crc-catalogue/16.htm; một cài đặt Python độc lập cho cùng hai giá trị).
- OPEN (deferred): toàn bộ giá trị trong `PROTOCOL` và `PROTOCOL_BINARY_EXAMPLE` (kiểu khung, checksum, UART 9600 8N1, token và code bản tin, độ rộng và bảng mã của từng trường, `statusStates`, `timeZoneOffsetMin: 420`, `ackTimeoutMs: 2000`, `maxRetries: 2`) là giả định của ứng dụng với `confirmed: false`, chờ nhóm firmware trả lời ICD `docs/thiet-ke/icd-usb-uart.md`. Kế hoạch cố ý không chờ: mọi giá trị nằm trong một tệp dữ liệu, có `checkSpec` và ví dụ đối chiếu để phát hiện sai lệch khi thay.
- OPEN (deferred): các chuỗi trong `vectors.ts` hiện do ứng dụng tính (`source: 'app'`), chưa có ví dụ chạy trên mạch thật; cần nhóm firmware gửi ví dụ `source: 'firmware'`.
- OPEN (unverified): `CAPABILITIES` với `energyLevels: [1, 2, 3, 4, 5]` và chế độ `cold`, `hybrid`, `thermal`, lấy từ báo cáo giữa kỳ đồ án nhúng (tài liệu nội bộ, không có nguồn sống để kiểm, và chính mục 3.2.1.1 của báo cáo đã được ghi nhận có lỗi trong `docs/thiet-ke/cau-hoi-mo-va-tai-lieu.md`).
- OPEN (unverified): bản `usb-android` cần development build vì Expo Go chỉ có mô-đun gốc đóng sẵn; điều này dựa theo `AGENTS.md` của repo, chưa tra tài liệu Expo SDK 58, và thuộc giai đoạn sau.

## Implementation steps

Lệnh kiểm tra dùng chung cho mọi bước (repo không có `CLAUDE.md`, lệnh lấy từ `AGENTS.md` và `package.json`): `npm test` (chạy chuỗi lệnh `node ...` trong script `test`), `npx tsc --noEmit`, `npx expo lint`. Mỗi bước nối lệnh kiểm thử mới của mình vào cuối script `test` trong `package.json` bằng ` && node <đường dẫn>`, giữ nguyên các lệnh cũ. Mỗi bước là một commit riêng.

### Bước 1: Đặc tả khai báo, checksum, bộ mã hóa khung, bản tin và ví dụ đối chiếu

**Files**: tạo `src/lib/device/checksum.test.cjs`, `src/lib/device/spec.test.cjs`, `src/lib/device/protocol.test.cjs`, `src/lib/device/vectors.test.cjs`, `src/lib/device/spec.ts`, `src/lib/device/protocol.config.ts`, `src/lib/device/spec-check.ts`, `src/lib/device/bytes.ts`, `src/lib/device/checksum.ts`, `src/lib/device/codec.ts`, `src/lib/device/codec-text.ts`, `src/lib/device/codec-binary.ts`, `src/lib/device/capabilities.ts`, `src/lib/device/protocol.ts`, `src/lib/device/vectors.ts`; sửa `package.json`.

**Do**:

- Viết trước bốn tệp kiểm thử `.test.cjs`, mở đầu bằng `/* global __dirname */` và `// Chạy: node src/lib/device/<tên>.test.cjs`, dùng `node:assert/strict` và hàm `load` có bộ nhớ đệm, `require` lồng, dịch bằng `ts.transpileModule` sang CommonJS ES2022, chép đúng mẫu ở đầu `src/lib/workflow.test.cjs`. Kịch bản theo mục "Kịch bản kiểm thử".
- `spec.ts`: chỉ kiểu, đúng như mục `spec.ts`.
- `protocol.config.ts`: `PROTOCOL` và `PROTOCOL_BINARY_EXAMPLE` theo mục `protocol.config.ts`, chỉ `import type` từ `./spec`, dạng dữ liệu tương thích JSON. Chú thích đầu tệp như kế hoạch.
- `bytes.ts`, `checksum.ts`: theo mục cùng tên; không import giá trị.
- `codec-text.ts`, `codec-binary.ts`: mỗi tệp xuất một hàm `createTextCodec(spec)`, `createBinaryCodec(spec)` trả `FrameCodec`; `codec.ts` xuất `DecodedFrame`, `FrameCodec`, `FrameReader` và `createCodec(spec)` chọn theo `spec.framing.kind`. Import giá trị không đuôi từ `./bytes`, `./checksum`. Luật đọc ghi theo mục `codec.ts`. Với khung văn bản, checksum 8 bit ghi 2 ký tự hex hoa, 16 bit ghi 4 ký tự; khi đọc chấp nhận hex thường. Với khung nhị phân, checksum 16 bit ghi theo `framing.endian`.
- `spec-check.ts`: `checkSpec` theo mục cùng tên, câu lỗi tiếng Việt có tên bản tin và tên trường.
- `capabilities.ts`: `SIM_MODEL`, `DeviceCapabilities`, `CAPABILITIES`, `capabilitiesFor`, `capabilitiesFromDevice`, `MODE_LABELS` theo mục cùng tên. Kiểm bằng `grep` rằng `SIM_MODEL` trùng `model` trong `src/lib/seed.ts` và `registerDevice` trong `src/lib/store.tsx`.
- `protocol.ts`: `TreatmentConfig`, `ConfigError`, `validateConfig`, `deviceClock`, `configToWire`, `encodeConfig`, `encodeQuery`, `DeviceMessage`, `toDeviceMessage` theo mục `protocol.ts`. Bộ ký tự `charset` dịch thành `new RegExp('^[' + charset + ']*$')` tại chỗ dùng.
- `vectors.ts`: `CONFIG_VECTORS`, `REPLY_VECTORS` với các ví dụ ở mục `vectors.ts`, `source: 'app'`. Nếu kết quả mã hóa của mã mới khác các chuỗi đã ghi trong kế hoạch và ICD, không sửa ví dụ cho khớp mã: tìm lỗi ở mã hoặc ở đặc tả, vì các chuỗi này được tính độc lập.
- Không dùng `enum`, `class` hay thuộc tính tham số trong hàm dựng.
- `package.json`: nối bốn lệnh `node src/lib/device/checksum.test.cjs`, `spec.test.cjs`, `protocol.test.cjs`, `vectors.test.cjs`.

**Test**: `checksum.test.cjs`, `spec.test.cjs`, `protocol.test.cjs`, `vectors.test.cjs` theo mục "Kịch bản kiểm thử".

**Verify**: `npm test` qua toàn bộ; `npx tsc --noEmit` không lỗi; `npx expo lint` không lỗi mới.

### Bước 2: Đường truyền, thiết bị giả lập, máy trạng thái gửi, hỏi máy và bản ghi hex

**Files**: tạo `src/lib/device/simulated.test.cjs`, `src/lib/device/sender.test.cjs`, `src/lib/device/trace.test.cjs`, `src/lib/device/transport.ts`, `src/lib/device/simulated.ts`, `src/lib/device/sender.ts`, `src/lib/device/trace.ts`; sửa `package.json`.

**Do**:

- Viết trước ba tệp kiểm thử theo mẫu `load` của bước 1. Dùng một bộ hẹn giờ giả tự viết (hàng đợi `{ fn, at }`, hàm `advance(ms)` gọi các hàm đến hạn), dùng chung cho giả lập và `sendConfig`; vì `sendConfig` trả `Promise`, sau mỗi `advance` cần `await` vài vòng microtask (ví dụ `await new Promise(r => setImmediate(r))`). Mỗi nhóm kịch bản chạy trong vòng lặp qua `[PROTOCOL, PROTOCOL_BINARY_EXAMPLE]`.
- `transport.ts`: chỉ kiểu, đường truyền chuyển `Uint8Array`.
- `simulated.ts`, `sender.ts`, `trace.ts`: theo mục cùng tên. `sender.ts` khai báo `Timer`, `simulated.ts` dùng `import type { Timer } from './sender'`. Hàm nghe lưu trong mảng, hàm gỡ trả về xóa khỏi mảng. `write` của giả lập khi chưa `connected` thì `Promise.reject`.
- `package.json`: nối `node src/lib/device/simulated.test.cjs`, `sender.test.cjs`, `trace.test.cjs`.

**Test**: `simulated.test.cjs`, `sender.test.cjs`, `trace.test.cjs` theo mục "Kịch bản kiểm thử".

**Verify**: `npm test` qua; `npx tsc --noEmit` không lỗi; `npx expo lint` không lỗi mới.

### Bước 3: Kiểu dữ liệu, nhật ký gửi trong store, điểm vào lớp thiết bị và hook liên kết

**Files**: tạo `src/lib/device/index.ts`, `src/lib/device/useDeviceLink.ts`; sửa `src/lib/types.ts`, `src/lib/store.tsx`, `src/lib/seed.ts`.

**Do**:

- `src/lib/types.ts`: thêm `import type { TransportKind } from './device/transport'`, `import type { SendResult } from './device/sender'`; thêm `treatmentMode?: string | null` vào `TreatmentPlan` với chú thích `doseLevel` là `energy_level` gửi firmware; thêm `DeviceLinkLog` đúng trường như kế hoạch (thêm `protocolVersion: number` và `capsSource: 'device' | 'table' | 'none'` để biết lần gửi dùng đặc tả nào); thêm `deviceLinks?: DeviceLinkLog[]` vào `AppData`.
- `src/lib/seed.ts`: `createSeed` thêm `deviceLinks: []`; không đổi `doseLevel` hay thêm `treatmentMode` cho đợt mẫu.
- `src/lib/store.tsx`: cạnh `saved.sessionNotes ??= []` (dòng khoảng 119) thêm `saved.deviceLinks ??= []`; thêm `recordDeviceLink(entry: Omit<DeviceLinkLog, 'id' | 'at' | 'by'>)` vào interface `Store` và giá trị provider: lấy người dùng hiện tại, nếu là người bệnh thì phải có `me.patientId === entry.patientId`, nếu là bác sĩ thì gọi `requireDoctor(entry.patientId)`, vai trò khác ném lỗi như các hàm cùng loại; ghi bản ghi có `id` sinh theo cách các hàm khác trong store đang dùng, `at` là `new Date().toISOString()`, `by` là id tài khoản; nối vào `deviceLinks`. Không đụng `setDevicePower`, `simulateSession`.
- `src/lib/device/index.ts`: `getTransport()` tạo một lần và giữ `withTrace(createSimulatedTransport(PROTOCOL))` ở biến mô-đun; `planToConfig` theo mục `index.ts`, trả `{ missing }` khi thiếu `durationSec`, `doseLevel` hoặc `treatmentMode` (giá trị `null`, `undefined` hay chuỗi rỗng đều là thiếu). Được phép import `@/lib/types`.
- `src/lib/device/useDeviceLink.ts`: hook theo mục `useDeviceLink.ts`; giữ `state`, `detail`, `identity`, `lastStatus`, `lastStatusAt` bằng `useState`; `connect`/`disconnect` gọi `open`/`close` và bắt lỗi (lỗi thể hiện qua `state`); `startSession`, `stopSession` chỉ có giá trị khi `kind === 'simulated'`, ngược lại là `undefined`.

**Test**: không có kiểm thử tự động mới (các phần thuần đã kiểm ở bước 1, 2; `planToConfig` được kiểm tay ở bước 4).

**Verify**: `npm test` vẫn qua; `npx tsc --noEmit` không lỗi (kiểm cả việc thêm trường tùy chọn không làm hỏng chỗ dùng `TreatmentPlan`, `AppData`); `npx expo lint` không lỗi mới.

### Bước 4: Màn kết nối thiết bị, màn theo dõi phiên, màn chẩn đoán và lối vào

**Files**: tạo `src/app/connect-device.tsx`, `src/app/session-monitor.tsx`, `src/app/device-diagnostics.tsx`; sửa `src/app/patient/device.tsx`, `src/app/devices/[id].tsx`, `src/app/admin/devices.tsx`.

**Do**:

- Đọc trước `src/components/Guard.tsx` (`useCanView`, `NoAccess`), `src/components/ui.tsx` (`Choices` và các thành phần dùng chung), `src/app/plan/[patientId].tsx` (cách chọn vết bằng `Choices`, cách lấy `coursePlan`, `woundsOf`, `device` từ `useLookups`), `src/app/patient/device.tsx`, `src/app/devices/[id].tsx`, `src/app/admin/devices.tsx`.
- `connect-device.tsx`: đọc `patientId`, `woundId` bằng `useLocalSearchParams`; người bệnh không truyền thì dùng `me.patientId`; không có người bệnh tương ứng hoặc `useCanView` sai (gồm quản trị viên, người bệnh mất liên kết hồ sơ) thì trả `NoAccess`. Danh sách đợt gửi được: các vết có `coursePlan(w.id)` với `status === 'active'` và `confirmed`; rỗng thì hiện "Chưa có đợt điều trị được bác sĩ xác nhận" và không có nút Gửi; nhiều hơn một thì `Choices` chọn vết, khởi tạo từ `woundId` nếu hợp lệ, ngược lại để trống và chưa xem trước. Hiện trạng thái kết nối, nhãn đường truyền ("Thiết bị giả lập" khi `kind === 'simulated'`), nút Kết nối và Ngắt. Sau khi kết nối hiện thông tin máy từ `identity` (phiên bản giao thức, phiên bản firmware, mã mẫu) và nguồn năng lực: "Năng lực đọc từ máy", "Máy không trả lời lệnh hỏi, dùng bảng dự phòng" hoặc "Chưa có năng lực cho mẫu này". Phiên bản giao thức của máy khác `PROTOCOL.protocolVersion` thì hiện "Máy dùng giao thức phiên bản X, ứng dụng dùng phiên bản Y, cần cập nhật ứng dụng hoặc firmware" và khóa Gửi. Gọi `planToConfig(plan, patient, new Date())`: có `missing` thì liệt kê tên trường tiếng Việt (thời gian, mức năng lượng, chế độ) và khóa Gửi; ngược lại bảng xem trước 10 trường lấy từ `configToWire(cfg, PROTOCOL)` (đúng giá trị sẽ ra dây), kèm lỗi `validateConfig(cfg, caps, PROTOCOL)` dịch sang tiếng Việt, riêng `energy_not_allowed` là "Mức năng lượng của đợt không có trong danh sách của máy, bác sĩ cần lưu phiên bản mới"; có lỗi hoặc chưa `connected` thì khóa Gửi. Nút "Gửi cấu hình xuống máy" gọi `send`, hiện kết quả (đã nhận; máy từ chối kèm mã; hết giờ sau N lần; "Mất kết nối, hãy cắm lại cáp và gửi lại"; không tương thích phiên bản; cấu hình không hợp lệ), có nút Gửi lại, và gọi `recordDeviceLink({ deviceId: patient.deviceId ?? null, patientId, planId, planVersion, transport: kind, result: r.kind, attempts, code, protocolVersion: PROTOCOL.protocolVersion, capsSource })` (với `invalid`, `incompatible` thì `attempts: 0`). Hiện cảnh báo "Giao thức chưa được firmware xác nhận." khi `PROTOCOL.confirmed` là `false`. Nút trong lúc gửi bị khóa để không gửi chồng.
- `session-monitor.tsx`: cùng tham số và cùng kiểm quyền; hiện trạng thái kết nối, trạng thái phiên từ `lastStatus` (nhãn tiếng Việt cho `idle`, `running`, `done`, `stopped`, `error`), giây còn lại, thời điểm `lastStatusAt`; báo khi `state` là `disconnected` hoặc `error`; khi có `startSession`, `stopSession` thì hiện nút "Bắt đầu phiên (giả lập)", "Dừng phiên (giả lập)".
- `device-diagnostics.tsx`: chỉ `me.role === 'admin'` xem được, vai trò khác trả `NoAccess`. Mở màn thì gọi `clearTrace()` để không hiện khung của phiên lâm sàng trước đó. Hiện kiểu khung, checksum, `protocolVersion`, `confirmed`, `source` của `PROTOCOL` và kết quả `checkSpec(PROTOCOL)` (rỗng thì "Đặc tả hợp lệ"); nút Kết nối, Ngắt; nút "Hỏi thông tin máy" (`identifyDevice`) hiện `info` và năng lực; nút "Gửi cấu hình thử" gửi cấu hình cố định `TEST01`, 60 giây, mức 1, `cold`, thời điểm hiện tại (mã thử, không lấy dữ liệu người bệnh); danh sách bản ghi từ `onTrace` theo thời gian, mỗi dòng có hướng (gửi, nhận), giờ, `hex` và `ascii` bằng chữ đơn cách; nút "Xóa bản ghi". Không hiện mã hồ sơ, liệu trình hay tên người bệnh.
- `patient/device.tsx`: thêm nút "Kết nối máy và nạp liệu trình" mở `/connect-device` và "Theo dõi phiên điều trị" mở `/session-monitor`, theo kiểu nút đang dùng trong màn.
- `devices/[id].tsx`: khi người xem là bác sĩ phụ trách người giữ máy (dùng hàm kiểm quyền sẵn có, ví dụ `canManagePatient`), thêm hai nút tương tự truyền `patientId` của người giữ máy; quản trị viên không thấy hai nút này.
- `admin/devices.tsx`: thêm một nút "Chẩn đoán kết nối" mở `/device-diagnostics`. Không sửa phần còn lại của `src/app/admin/*`.
- Không sửa `DeviceView`, `setDevicePower`, `simulateSession`. Nếu `_layout.tsx` gốc cần khai báo màn mới để có tiêu đề thì thêm theo mẫu các màn cùng cấp.

**Test**: không có kiểm thử tự động mới (màn hình). Kiểm tay bằng `npm run web`: `bacsi` lưu phiên bản "Đang áp dụng" mới cho BN001 sau bước 5 thì mới gửi được; trước đó, với đợt mẫu `pl-1`, màn kết nối phải liệt kê thiếu chế độ và khóa Gửi; `quantri` mở `/connect-device?patientId=p-1` và `/session-monitor?patientId=p-1` thấy `NoAccess`; `quantri` mở Thiết bị, Chẩn đoán kết nối, Kết nối, Hỏi thông tin máy, Gửi cấu hình thử thấy dòng gửi `24 43 46 47 2C …` và dòng nhận `$ACK,CFG*27`; `bacsi` mở `/device-diagnostics` thấy `NoAccess`.

**Verify**: `npm test` vẫn qua; `npx tsc --noEmit` không lỗi; `npx expo lint` không lỗi mới.

### Bước 5: Chế độ điều trị trong liệu trình và ô chọn mức theo bảng năng lực

**Files**: sửa `src/app/plan/[patientId].tsx`, `src/components/CourseCard.tsx`, `src/app/schedule.tsx`, `src/app/wounds/[id].tsx`.

**Do**:

- `plan/[patientId].tsx`: lấy `caps = capabilitiesFor(device?.model)` của thiết bị gán cho người bệnh. Khi `caps` khác `null`: ô mức năng lượng thành `Choices` với các giá trị `caps.energyLevels` (nhãn là số), thêm ô `Choices` chế độ từ `caps.treatmentModes`; giá trị khởi tạo lấy từ `latest.doseLevel`, `latest.treatmentMode` chỉ khi thuộc danh sách, ngược lại để trống (đợt mẫu `pl-1` có `doseLevel: 8` phải hiện ô trống). `Choices` hiện có kiểu `value: T` với `T extends string`, nên giữ giá trị chọn dưới dạng chuỗi (chuỗi rỗng là chưa chọn) và đổi sang số khi lưu; nếu `Choices` không hiện được trạng thái chưa chọn thì xử lý ở màn này, không đổi chữ ký `Choices`. Khi `caps` là `null`: hiện "Chưa có danh sách mức và chế độ cho mẫu thiết bị này", giữ ô nhập số cũ cho mức, không có ô chế độ, `treatmentMode` lưu `null`. Khi lưu đợt "Đang áp dụng" mà `caps` có chế độ và chưa chọn thì `fail(1, …)` với thông báo tiếng Việt như kiểm tra mức và thời gian hiện có; mức không thuộc danh sách cũng `fail(1, …)`. Thêm `treatmentMode` vào đối tượng truyền cho `savePlan` trong hàm `save`.
- `CourseCard.tsx`, `schedule.tsx`, `wounds/[id].tsx`: chỗ đang hiện mức năng lượng thì thêm nhãn chế độ khi `treatmentMode` có giá trị, nhãn lấy từ `capabilitiesFor(model)?.treatmentModes` nếu có, ngược lại hiện chính giá trị; liệu trình cũ không có `treatmentMode` hiện như cũ. Dùng hàm nhỏ dùng chung nếu cần (ví dụ `modeLabel(mode, model)` xuất thêm từ `src/lib/device/capabilities.ts`); nếu thêm hàm này vào tệp thuần thì không cần kiểm thử riêng, nhưng không được import `react-native` vào đó.

**Test**: không có kiểm thử tự động mới. Kiểm tay bằng `npm run web`: đăng nhập `bacsi`, mở đợt của BN001, thấy ô mức trống và ô chế độ trống; lưu "Đang áp dụng" khi chưa chọn chế độ báo lỗi ở bước 1; chọn mức 3, chế độ Cold, xác nhận và lưu thì thẻ đợt, lịch và màn vết hiện "Cold" cạnh mức; sau đó đăng nhập `benhnhan` / `Demo@123`, mở Thiết bị, Kết nối máy và nạp liệu trình, Kết nối, Gửi cấu hình thấy "đã nhận", rồi Theo dõi phiên, Bắt đầu phiên (giả lập) thấy giây còn lại giảm.

**Verify**: `npm test` vẫn qua; `npx tsc --noEmit` không lỗi; `npx expo lint` không lỗi mới.

### Bước 6: Lớp nhận diện vết thương `src/lib/ai/` và màn chụp ảnh dùng giao diện

**Files**: tạo `src/lib/ai/result.test.ts`, `src/lib/ai/result.ts`, `src/lib/ai/recognizer.ts`, `src/lib/ai/index.ts`; sửa `src/lib/capture/types.ts`, `src/app/guided-capture.tsx`, `package.json`.

**Do**:

- Viết trước `result.test.ts` mở đầu `// Chạy: node src/lib/ai/result.test.ts`, `import assert from 'node:assert/strict'`, `import { fromColorDetection } from './result.ts'` như `src/lib/devices.test.ts`; dựng đối tượng `WoundDetection` mẫu theo kiểu trong `src/lib/capture/woundDetect.ts`.
- `result.ts`: chỉ `import type { WoundDetection } from '../capture/woundDetect'`; `RecognitionResult` và `fromColorDetection(d, modelId, modelVersion)` theo mục `result.ts`; `confidence` luôn `null`.
- `recognizer.ts`: chỉ kiểu `WoundRecognizer`.
- `index.ts`: `getRecognizer()` trả một đối tượng `{ id: DETECTOR_ID, version: '1', kind: 'on_device', recognize: async uri => fromColorDetection(await detectInPhoto(uri), DETECTOR_ID, '1') }`, import `detectInPhoto` từ `'@/lib/capture/analyzeImage'` (không đuôi) và `DETECTOR_ID` từ `'@/lib/capture/woundDetect'`.
- `capture/types.ts`: `contrast: number` thành `contrast?: number` trong `CaptureMetadata.wound`.
- `guided-capture.tsx`: thay `detectInPhoto(photo.uri)` (dòng khoảng 147) bằng `getRecognizer().recognize(photo.uri)`; dòng import `@/lib/capture/analyzeImage` chỉ còn `analyzeImage`; `photoWound` thành `RecognitionResult | null`; `roiFrom` nhận `RecognitionResult | null` dùng `found`, `box`; `estimateFor` nhận `RecognitionResult | null` dùng `found`, `center`, `areaFraction`, trả `null` khi `areaFraction === null` hoặc `center === null`; phần ghi `capture.wound` (dòng khoảng 232) chỉ ghi khi `found`, có `box` và `areaFraction !== null`, `detector: photoWound.modelId`, `contrast` chỉ thêm khi khác `null`; bỏ `DETECTOR_ID` khỏi import nếu không còn dùng, giữ `coverMap` và `type WoundDetection` cho luồng xem trước trực tiếp. Không sửa `useWoundTracker`, `woundDetect.ts`, `analyzeImage*.ts`.
- `package.json`: nối `node src/lib/ai/result.test.ts`.

**Test** (`result.test.ts`): `fromColorDetection(null, 'm', '1')` trả `found: false`, `box: null`, `hull: []`, `center: null`, `areaFraction: null`, `contrast: null`, `confidence: null`, `modelId: 'm'`; `WoundDetection` có `found: false` cũng trả `found: false`, `box: null`, `areaFraction: null`; phát hiện có hộp và đường bao giữ nguyên `box`, `hull`, `center`, `areaFraction`, `contrast` (so `deepEqual`), `modelId`, `modelVersion` đúng tham số, `confidence: null`.

**Verify**: `npm test` qua; `npx tsc --noEmit` không lỗi (bắt các chỗ còn dùng `WoundDetection` cho `photoWound`); `npx expo lint` không lỗi mới.

### Bước 7: Xếp người bệnh theo mức cần chú ý trên tổng quan bác sĩ và cập nhật bảng đối chiếu

**Files**: tạo `src/lib/attention.test.ts`, `src/lib/attention.ts`; sửa `src/app/doctor/index.tsx`, `src/components/items.tsx`, `package.json`, `docs/thiet-ke/doi-chieu-ma-nguon.md`.

**Do**:

- Viết trước `attention.test.ts` mở đầu `// Chạy: node src/lib/attention.test.ts`, import `./attention.ts`, dùng hàm dựng `AttentionInput` mặc định rồi ghi đè từng trường.
- `attention.ts` (thuần, không import gì ngoài kiểu nếu cần): `TodayState`, `AttentionInput`, `Attention`, `classifyToday`, `rankPatients` theo quy tắc ở mục `attention.ts`: thứ tự xét `no_plan`, `rest`, `treated`, `no_data`, `due`; điểm +100 mỗi báo cáo chưa xử lý, +50 Nặng, +20 Trung bình, +10 mỗi ngày bỏ lỡ, +5 khi `no_data`; `reasons` theo thứ tự báo cáo, mức độ, bỏ lỡ, chưa có dữ liệu, với câu như "2 báo cáo chưa xử lý", "Mức độ Nặng", "Bỏ lỡ 3 buổi trong 7 ngày", "Chưa có dữ liệu hôm nay"; sắp xếp ổn định theo điểm giảm dần (sắp theo cặp điểm và chỉ số vào).
- `items.tsx`: `PatientCard` nhận thêm `attention?: Attention`; có thì hiện chip trạng thái hôm nay (nhãn tiếng Việt: Đã chiếu, Cần chiếu, Chưa có dữ liệu, Ngày nghỉ, Chưa có đợt) bằng thành phần chip sẵn có trong `src/components/ui.tsx` nếu có, và `reasons[0]` nếu có; không truyền thì hiện như cũ.
- `doctor/index.tsx`: với `today = localDay()`, dựng `AttentionInput` cho từng người bệnh của bác sĩ theo đúng quy tắc ở mục `attention.ts` (dùng `woundsOf`, `coursePlan`, `device`, `sessionsOf` từ `useLookups`, `isScheduled`, `localDay` từ `@/lib/course`, `patientSeverity` từ `@/lib/access`, `data.reports` với `handled === false`); `missedLast7` tính 7 ngày trước hôm nay giống `missed` trong `courseProgress` của `src/lib/course.ts` (đọc hàm này trước để dùng lại cách cộng ngày và so sánh với `lastSyncDay`); gọi `rankPatients` trong `useMemo`, hiện danh sách theo thứ tự đó và truyền `attention` cho `PatientCard`.
- `package.json`: nối `node src/lib/attention.test.ts`.
- `docs/thiet-ke/doi-chieu-ma-nguon.md`: cập nhật các dòng FR2, FR4, FR10, FR11, NFR3 theo mã mới (lớp `src/lib/device/`, màn `connect-device`, `session-monitor`, thiết bị giả lập tách khỏi `store.tsx`, `src/lib/ai/`, `attention.ts`), ghi rõ phần còn lại của giai đoạn sau (USB thật, đặc tả firmware, đọc nhật ký phiên từ máy). Giữ văn phong và định dạng bảng hiện có.

**Test** (`attention.test.ts`): `classifyToday` trả `no_plan` khi không có đợt, `rest` khi không có lịch hôm nay, `treated` khi `completedToday >= targetPerDay`, `no_data` khi `lastSyncDay` là `null` hoặc ngày cũ, `due` khi đã đồng bộ hôm nay nhưng chưa đủ buổi; đủ buổi nhưng `lastSyncDay` cũ vẫn `treated`; `rankPatients`: người có 1 báo cáo chưa xử lý đứng trước người Nặng không báo cáo, người Nặng đứng trước người bỏ lỡ 3 buổi, hai người cùng điểm giữ thứ tự vào, `reasons` của người có báo cáo chứa câu về báo cáo, điểm tính đúng cho một ví dụ cộng nhiều thành phần.

**Verify**: `npm test` qua toàn bộ (đủ 9 tệp kiểm thử mới của kế hoạch); `npx tsc --noEmit` không lỗi; `npx expo lint` không lỗi mới; `npm run web`, đăng nhập `bacsi` thấy danh sách người bệnh xếp theo mức cần chú ý, mỗi thẻ có chip và lý do.
