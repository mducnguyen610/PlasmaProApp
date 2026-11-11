# Kế hoạch triển khai giai đoạn 1: lớp thiết bị, giao thức USB/UART, lớp AI, tổng quan bác sĩ

Ngày lập: 11/11/2026. Nhánh gốc: `thiet-ke/quy-trinh-buoc-1-8` (pull request 10). Hồ sơ thiết kế: `docs/thiet-ke/`.

## Bối cảnh

Đề tài: "Nghiên cứu, thiết kế và phát triển ứng dụng điện thoại hỗ trợ quản lý quá trình điều trị vết thương bằng thiết bị Plasma Pro, tích hợp mô-đun nhận diện vết thương và giao tiếp USB/UART." Phạm vi từng thành phần nằm ở `docs/thiet-ke/00-pham-vi-va-gia-dinh.md`.

Mã hiện tại (Expo SDK 58, React Native, TypeScript, Expo Router, dữ liệu lưu cục bộ bằng AsyncStorage) là prototype vòng cũ. Bảng `docs/thiet-ke/doi-chieu-ma-nguon.md` cho thấy các chỗ thiếu chính: chưa có giao tiếp với firmware (FR2, FR4, TR3), phần mô phỏng thiết bị nằm thẳng trong `src/lib/store.tsx` (trái NFR3, TR4), chưa có lớp tích hợp mô-đun AI có sẵn (TR10), màn tổng quan bác sĩ chưa xếp người bệnh theo mức cần chú ý (FR10), liệu trình chưa có chế độ điều trị, thiếu màn kết nối thiết bị và màn theo dõi phiên.

Kế hoạch này chỉ gồm những việc không phải làm lại dù các câu hỏi mở (đặc tả firmware, dạng mô-đun AI, bộ chuyển USB cho iOS, phương pháp gán nhãn) được trả lời thế nào. Mọi phần phụ thuộc đặc tả firmware được gom vào một tệp cấu hình duy nhất để sau này chỉ sửa tệp đó.

Quyết định đã chốt với chủ đồ án trong thảo luận:

- Giữ cả ba vai trò `doctor`, `patient`, `admin`. Không gỡ màn `src/app/admin/*`.
- Điện thoại **người bệnh** cắm USB vào máy tại nhà để nạp cấu hình bác sĩ đặt và nhận phản hồi; bác sĩ cũng dùng được màn này khi giao máy. Cần chạy trên cả Android và iOS.
- Dữ liệu gửi xuống firmware gồm 10 trường: `patient_id`, `min_treatment_time`, `energy_level`, `treatment_mode`, `day`, `month`, `year`, `hour`, `minute`, `second`.
- Giá trị điều trị do bác sĩ quyết định; ứng dụng không tự đặt mức năng lượng hay chế độ khi chưa có đặc tả được xác nhận.

## Cách tiếp cận

1. Tạo thư mục `src/lib/device/` gồm các mô-đun thuần TypeScript (không import `react-native`, `expo-*` hay `@/`): cấu hình giao thức, đóng gói và giải mã khung, máy trạng thái gửi có xác nhận, thiết bị giả lập nói cùng giao thức. `sender.ts` và `simulated.ts` cần import giá trị từ `protocol.ts`, `capabilities.ts` (không chỉ `import type`), nên import không đuôi như `src/lib/research.ts` import `./naming`, và bài kiểm thử của chúng viết dạng `.test.cjs` với hàm `load` dịch bằng `ts.transpileModule` như `src/lib/workflow.test.cjs` (Node chạy thẳng `.ts` không phân giải được import không đuôi; thêm đuôi `.ts` thì `tsc` báo lỗi vì `tsconfig.json` không bật `allowImportingTsExtensions`). Không dùng `enum` hay thuộc tính tham số trong hàm dựng.
2. Một giao diện truyền dẫn `DeviceTransport` đứng giữa ứng dụng và đường truyền. Giai đoạn 1 chỉ có bản cài giả lập; bản USB Android và USB iOS là giai đoạn sau, cắm vào cùng giao diện mà không sửa màn hình.
3. Hai màn mới `src/app/connect-device.tsx` và `src/app/session-monitor.tsx` dùng giao diện trên, cho cả người bệnh và bác sĩ.
4. Thêm `treatmentMode` vào liệu trình; dùng lại `doseLevel` làm `energy_level`; danh sách giá trị hợp lệ lấy từ bảng năng lực theo mẫu thiết bị.
5. Tạo `src/lib/ai/` với giao diện `WoundRecognizer`; bộ dò ngưỡng màu hiện có làm bản cài tạm. Màn chụp ảnh gọi qua giao diện thay vì gọi thẳng `detectInPhoto`.
6. Tạo `src/lib/attention.ts` (thuần) xếp người bệnh của bác sĩ theo mức cần chú ý và phân trạng thái hôm nay; màn `src/app/doctor/index.tsx` dùng kết quả này.

## Tệp mới

### `src/lib/device/protocol.config.ts`

Toàn bộ thông số chưa được firmware xác nhận nằm ở đây, có cờ `confirmed: false`.

```ts
export interface UartSettings { baudRate: number; dataBits: 7 | 8; parity: 'none' | 'even' | 'odd'; stopBits: 1 | 2 }
export type FieldName = 'patient_id' | 'min_treatment_time' | 'energy_level' | 'treatment_mode' | 'day' | 'month' | 'year' | 'hour' | 'minute' | 'second';
export interface ProtocolSpec {
  confirmed: boolean;            // false cho đến khi có tài liệu firmware
  source: string;                // ghi nguồn, ví dụ "giả định của ứng dụng, chưa thống nhất với firmware"
  uart: UartSettings;
  frameStart: string;            // ký tự mở khung
  frameEnd: string;              // ký tự đóng khung
  separator: string;             // ký tự phân tách trường
  configCommand: string;         // tên lệnh gửi cấu hình
  fieldOrder: FieldName[];       // thứ tự 10 trường
  minTreatmentTimeUnit: 's' | 'min';
  timeZoneOffsetMin: number;     // múi giờ của đồng hồ thiết bị, 420 = UTC+7
  patientIdMaxLength: number;
  ackTimeoutMs: number;
  maxRetries: number;
}
export const PROTOCOL: ProtocolSpec;
```

Giá trị tạm (đánh dấu rõ là giả định của ứng dụng): khung văn bản ASCII `$CFG,<10 trường theo fieldOrder>*<checksum>\r\n`, checksum là XOR các byte giữa `$` và `*` viết 2 ký tự hex hoa (kiểu NMEA), UART 9600 8N1, `minTreatmentTimeUnit: 's'`, `timeZoneOffsetMin: 420`, `patientIdMaxLength: 16`, `ackTimeoutMs: 2000`, `maxRetries: 2`. Phản hồi tạm: `$ACK,CFG*hh`, `$NAK,CFG,<mã lỗi>*hh`, `$STA,<trạng thái>,<giây còn lại>*hh` với trạng thái `idle | running | done | stopped | error`.

### `src/lib/device/capabilities.ts`

```ts
export interface DeviceCapabilities { model: string; confirmed: boolean; source: string; energyLevels: number[]; treatmentModes: { value: string; label: string }[]; minTreatmentTimeSec: { min: number; max: number } | null }
export const CAPABILITIES: Record<string, DeviceCapabilities>;
export function capabilitiesFor(model: string | undefined): DeviceCapabilities | null;
```

`CAPABILITIES` có đúng một mục, khóa là `SIM_MODEL = 'Plasma Pro + mô-đun IoMT ESP32'` (xuất kèm), trùng chuỗi `model` của ba thiết bị trong `src/lib/seed.ts` và của `registerDevice` trong `store.tsx`; nếu đặt khóa khác thì `capabilitiesFor(device?.model)` luôn trả `null` với dữ liệu demo và không gửi được cấu hình nào. Mục này có `confirmed: false`, `source: 'Báo cáo giữa kỳ đồ án nhúng, bảng mục 3.2.1.1 (GA-3), chưa xác nhận với firmware'`, `energyLevels: [1, 2, 3, 4, 5]`, chế độ `cold`, `hybrid`, `thermal` với nhãn "Cold", "Hybrid", "Thermal", `minTreatmentTimeSec: null`. Mẫu thật chưa có mục nào; `capabilitiesFor` trả `null` khi không biết mẫu.

### `src/lib/device/protocol.ts` (thuần)

```ts
export interface TreatmentConfig { patientId: string; minTreatmentTimeSec: number; energyLevel: number; treatmentMode: string; at: Date }
export type ConfigError = 'patient_id_empty' | 'patient_id_too_long' | 'patient_id_charset' | 'time_invalid' | 'time_out_of_range' | 'energy_not_allowed' | 'mode_not_allowed' | 'capabilities_unknown';
export function validateConfig(cfg: TreatmentConfig, caps: DeviceCapabilities | null, spec: ProtocolSpec): ConfigError[];
export function deviceClock(at: Date, offsetMin: number): { day: number; month: number; year: number; hour: number; minute: number; second: number };
export function checksum(body: string): string;               // 2 ký tự hex hoa
export function encodeConfig(cfg: TreatmentConfig, spec: ProtocolSpec): string; // khung hoàn chỉnh, ném lỗi nếu validateConfig không rỗng
export type DeviceMessage =
  | { kind: 'ack'; command: string }
  | { kind: 'nak'; command: string; code: string }
  | { kind: 'status'; state: 'idle' | 'running' | 'done' | 'stopped' | 'error'; remainingSec: number | null }
  | { kind: 'unknown'; raw: string };
export function decodeFrame(frame: string, spec: ProtocolSpec): DeviceMessage | { kind: 'bad_checksum'; raw: string } | { kind: 'malformed'; raw: string };
export class FrameReader { constructor(spec: ProtocolSpec); push(chunk: string): string[]; get buffered(): number } // gom chuỗi nhận được, trả các khung đủ (từ frameStart đến trước frameEnd, không kèm frameEnd), bỏ rác trước frameStart, giới hạn bộ đệm 1024 ký tự; buffered là số ký tự đang giữ, để kiểm thử
export function encodeFrame(body: string, spec: ProtocolSpec): string;
```

Quy tắc `validateConfig`: `patientId` sau `trim` không rỗng, dài tối đa `patientIdMaxLength`, chỉ gồm `[A-Za-z0-9_-]` (để không đụng ký tự khung); thời gian là số nguyên dương, nằm trong `minTreatmentTimeSec` nếu bảng năng lực có; `energyLevel` thuộc `energyLevels`; `treatmentMode` thuộc danh sách chế độ; `caps === null` trả `capabilities_unknown`. `deviceClock` cộng `offsetMin` vào thời điểm UTC rồi đọc bằng các hàm `getUTC*`, không phụ thuộc múi giờ của điện thoại. Khi `minTreatmentTimeUnit` là `'min'`, `encodeConfig` gửi `Math.ceil(sec / 60)`.

### `src/lib/device/transport.ts` (chỉ kiểu)

```ts
export type TransportKind = 'simulated' | 'usb-android' | 'usb-ios';
export type LinkState = 'disconnected' | 'connecting' | 'connected' | 'error';
export interface DeviceTransport {
  kind: TransportKind;
  model: string;
  open(): Promise<void>;
  close(): Promise<void>;
  write(data: string): Promise<void>;
  onData(cb: (chunk: string) => void): () => void;
  onState(cb: (s: LinkState, detail?: string) => void): () => void;
}
```

### `src/lib/device/sender.ts` (thuần)

```ts
export type SendResult =
  | { kind: 'acked'; attempts: number }
  | { kind: 'nacked'; code: string; attempts: number }
  | { kind: 'timeout'; attempts: number }
  | { kind: 'disconnected'; attempts: number }
  | { kind: 'invalid'; errors: ConfigError[] };
export interface Timer { set(fn: () => void, ms: number): unknown; clear(handle: unknown): void }
export function sendConfig(t: DeviceTransport, cfg: TreatmentConfig, caps: DeviceCapabilities | null, spec: ProtocolSpec, timer?: Timer): Promise<SendResult>;
```

Luồng: kiểm `validateConfig` (lỗi thì trả `invalid`, không ghi gì xuống đường truyền); đăng ký `onData` (qua một `FrameReader` riêng của lần gửi) và `onState` trước khi ghi, vì thiết bị giả lập có thể phản hồi ngay trong lúc `write`; ghi khung (`write` bị từ chối, ví dụ chưa `open`, thì trả `disconnected`); chờ khung `ack` hoặc `nak` của lệnh `configCommand` trong `ackTimeoutMs`; hết giờ thì gửi lại, tối đa `maxRetries` lần gửi lại (tổng `maxRetries + 1` lần); `nak` không gửi lại; trạng thái `disconnected` hay `error` giữa chừng trả `disconnected`; khung `bad_checksum` bị bỏ qua như chưa nhận; luôn gỡ `onData`, `onState` và hẹn giờ khi kết thúc. `timer` mặc định dùng `setTimeout`/`clearTimeout`, kiểm thử truyền bộ hẹn giờ giả để không phải chờ thật.

### `src/lib/device/simulated.ts` (thuần)

```ts
export interface SimOptions { model?: string; dropFirst?: number; corruptFirst?: number; nakCode?: string | null; failOpen?: boolean; tickMs?: number; timer?: Timer }
export function createSimulatedTransport(spec: ProtocolSpec, opts?: SimOptions): DeviceTransport & { lastConfig(): Record<FieldName, string> | null; startSession(): void; stopSession(): void };
```

Thiết bị giả lập dùng `FrameReader` và `decodeFrame` để đọc khung ứng dụng gửi, kiểm checksum và số trường, trả `$ACK,CFG` hoặc `$NAK,CFG,<mã>` (`BAD_CHECKSUM`, `BAD_FIELDS`, hoặc `nakCode` cấu hình). `dropFirst` bỏ qua N khung đầu (để kiểm gửi lại), `corruptFirst` trả N phản hồi sai checksum. `startSession` chỉ chạy khi đã nhận cấu hình hợp lệ, phát `$STA,running,<giây còn lại>` mỗi `tickMs` (mặc định 1000) đến `done`; `stopSession` phát `stopped`. `model` mặc định là `SIM_MODEL`. `open()` phát `connecting` rồi `connected` (hoặc `error` và từ chối khi `failOpen`); `close()` hủy phiên đang chạy và phát `disconnected`; `write` khi chưa `connected` thì từ chối.

### `src/lib/device/index.ts`

```ts
export function getTransport(): DeviceTransport; // giai đoạn 1 luôn trả bản giả lập (một thể hiện dùng chung trong phiên chạy ứng dụng)
export function planToConfig(plan: TreatmentPlan, patient: Patient, at: Date): TreatmentConfig | { missing: ('duration' | 'energy' | 'mode')[] };
```

`planToConfig` lấy `patient.code` làm `patientId` (không dùng họ tên), `plan.durationSec` làm `minTreatmentTimeSec`, `plan.doseLevel` làm `energyLevel`, `plan.treatmentMode` làm `treatmentMode`; thiếu trường nào thì trả danh sách thiếu.

### `src/lib/device/useDeviceLink.ts`

Hook React bọc `getTransport()`: trả `{ kind, model, caps, state, detail, connect(), disconnect(), send(cfg), lastStatus, lastStatusAt, startSession(), stopSession() }`, trong đó `caps = capabilitiesFor(model)` và `send(cfg)` gọi `sendConfig(transport, cfg, caps, PROTOCOL)`. Đăng ký `onState`, `onData` (qua `FrameReader`) khi mount, gỡ khi unmount. `startSession`, `stopSession` chỉ có với bản giả lập (để demo màn theo dõi phiên); với bản thật sau này, phiên do người bệnh bấm trên máy.

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

- `src/app/connect-device.tsx`, tham số `patientId` (người bệnh mở không cần tham số, dùng `me.patientId`) và `woundId` tùy chọn. Quyền: dùng `useCanView` như các màn lâm sàng khác, tức người bệnh của hồ sơ đó và bác sĩ phụ trách; quản trị kỹ thuật thấy `NoAccess` vì màn này hiện mã hồ sơ, mức và chế độ điều trị (đặc tả mục 9, ghi chú trong `src/components/Guard.tsx`: quản trị không mặc định xem dữ liệu lâm sàng). Đợt được gửi: các vết của người bệnh có `coursePlan(w.id)` với `status === 'active'` và `confirmed`; có hơn một đợt như vậy thì hiện `Choices` chọn vết (như `plan/[patientId].tsx`), lấy `woundId` từ tham số nếu có; một máy chỉ nạp một cấu hình mỗi lần. Nội dung: trạng thái kết nối và loại đường truyền (nhãn "Thiết bị giả lập" khi `kind === 'simulated'`); nút Kết nối, Ngắt; bảng xem trước 10 trường sẽ gửi (đọc từ `planToConfig` của đợt đã chọn, kiểm bằng `validateConfig` với `caps` của `useDeviceLink`); nếu thiếu trường hoặc `validateConfig` báo lỗi thì hiện lỗi tiếng Việt và khóa nút Gửi; nút "Gửi cấu hình xuống máy"; kết quả (đã nhận, máy từ chối kèm mã, hết giờ sau N lần, mất kết nối) và nút Gửi lại; ghi nhật ký gửi vào store. Hiện cảnh báo khi `PROTOCOL.confirmed` hoặc bảng năng lực `confirmed` là `false`: "Giao thức và danh sách mức, chế độ chưa được firmware xác nhận."
- `src/app/session-monitor.tsx`, cùng tham số và quyền. Hiện trạng thái kết nối, trạng thái phiên từ khung `status` cuối cùng, giây còn lại, thời điểm nhận khung cuối; báo khi mất kết nối. Với bản giả lập có nút "Bắt đầu phiên (giả lập)", "Dừng phiên (giả lập)".

### Kiểm thử mới

`src/lib/device/protocol.test.cjs`, `src/lib/device/sender.test.cjs`, `src/lib/device/simulated.test.cjs`, `src/lib/ai/result.test.ts`, `src/lib/attention.test.ts`. Mỗi tệp mở đầu bằng `// Chạy: node <đường dẫn>` và dùng `node:assert/strict`. Hai tệp `.test.ts` import tệp nguồn có đuôi `.ts` như `src/lib/devices.test.ts` (nguồn của chúng chỉ có `import type`). Ba tệp `.test.cjs` của `device/` dùng hàm `load` có bộ nhớ đệm và `require` lồng như `src/lib/workflow.test.cjs` (có `/* global __dirname */` cho ESLint), vì `sender.ts`, `simulated.ts` import giá trị từ tệp cùng thư mục; `protocol.test.cjs` cũng cần `simulated.ts` cho kịch bản đọc lại khung.

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
- `package.json`: nối 5 lệnh kiểm thử mới vào script `test` (`node src/lib/device/protocol.test.cjs`, `node src/lib/device/sender.test.cjs`, `node src/lib/device/simulated.test.cjs`, `node src/lib/ai/result.test.ts`, `node src/lib/attention.test.ts`).
- `docs/thiet-ke/doi-chieu-ma-nguon.md`: cập nhật dòng FR2, FR4, FR10, FR11, NFR3 theo mã mới.

## Không thay đổi

- Vai trò `admin` và toàn bộ `src/app/admin/*`.
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
- Đọc dữ liệu cũ không có `deviceLinks` và liệu trình cũ không có `treatmentMode`: không lỗi.
- Người bệnh không còn liên kết hồ sơ (`me.patientId` rỗng): màn mới hiện `NoAccess`.
- Quản trị kỹ thuật mở `/connect-device` hoặc `/session-monitor`: `NoAccess`.
- Người bệnh có nhiều vết, mỗi vết một đợt đang áp dụng: phải chọn vết trước khi xem trước và gửi.
- Đợt cũ có mức năng lượng ngoài danh sách của mẫu (đợt mẫu `pl-1` có `doseLevel: 8`): `validateConfig` trả `energy_not_allowed`, màn kết nối hiện "Mức năng lượng của đợt không có trong danh sách của mẫu thiết bị, bác sĩ cần lưu phiên bản mới" và khóa nút Gửi.
- Người bệnh chưa được gán thiết bị: vẫn gửi được qua đường truyền đang nối, nhật ký ghi `deviceId: null`.

## Kịch bản kiểm thử

`protocol.test.cjs`:
- `checksum('CFG,BN001')` bằng giá trị XOR tính tay trong bài kiểm thử.
- `deviceClock(new Date('2026-11-10T23:30:05Z'), 420)` trả ngày 11, tháng 11, năm 2026, 6 giờ 30 phút 5 giây.
- `encodeConfig` với cấu hình hợp lệ trả chuỗi bắt đầu `$CFG,BN001,`, có đủ 10 trường theo `fieldOrder`, kết thúc `*hh\r\n`, và `decodeFrame` của thiết bị giả lập đọc lại đủ trường.
- `validateConfig` trả đúng mã lỗi cho: mã rỗng, mã 17 ký tự, mã có dấu phẩy, thời gian 0, thời gian 12,5, mức 7 khi danh sách là 1 đến 5, chế độ `laser`, `caps = null`.
- `minTreatmentTimeUnit: 'min'` với 90 giây gửi `2`.
- `FrameReader`: một lần đẩy hai khung trả 2 khung; khung chia ba lần đẩy trả 1 khung ở lần cuối; rác trước `$` bị bỏ; `$` theo sau 1100 ký tự không có `frameEnd` làm `buffered` về 0, và phần đuôi khung đẩy tiếp sau đó không tạo ra khung nào.
- `decodeFrame`: `$ACK,CFG*hh` đúng checksum là `ack`; sai checksum là `bad_checksum`; `$STA,running,42*hh` là `status` với `remainingSec: 42`; thiếu `*` là `malformed`.

`sender.test.cjs` (dùng thiết bị giả lập đã `open()` và bộ hẹn giờ giả dùng chung cho cả hai):
- Thiết bị trả ACK ngay: `acked`, `attempts: 1`.
- `dropFirst: 1`: `acked`, `attempts: 2`.
- `dropFirst: 5`, `maxRetries: 2`: `timeout`, `attempts: 3`.
- `nakCode: 'BUSY'`: `nacked`, `code: 'BUSY'`, `attempts: 1`, không gửi lại.
- `corruptFirst: 1`: phản hồi sai bị bỏ, lần gửi lại được `acked`, `attempts: 2`.
- Đóng đường truyền giữa lúc chờ: `disconnected`.
- Gửi khi chưa `open()`: `disconnected`, không treo.
- Cấu hình sai: `invalid`, thiết bị giả lập không nhận khung nào (`lastConfig()` là `null`).
- Sau khi kết thúc, không còn hàm nghe `onData` nào được gọi (đếm số lần gọi sau khi trả kết quả bằng 0).

`simulated.test.cjs`:
- `failOpen: true`: `open()` bị từ chối và trạng thái là `error`.
- `startSession` trước khi có cấu hình hợp lệ: không phát khung trạng thái.
- Sau cấu hình 3 giây và `tickMs` giả: phát `running` với giây còn lại 3, 2, 1, rồi `done`.
- `stopSession` khi đang chạy: phát `stopped`.

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

Chạy web để xem hai màn mới với thiết bị giả lập: `npm run web`. Đợt mẫu `pl-1` của BN001 chưa có chế độ và có mức 8 ngoài danh sách 1 đến 5, nên trước hết đăng nhập `bacsi`, mở đợt điều trị của BN001, chọn mức và chế độ, xác nhận và lưu phiên bản "Đang áp dụng" mới (không sửa dữ liệu mẫu để ứng dụng không tự đặt giá trị điều trị). Sau đó đăng nhập `benhnhan` / `Demo@123`, mở Thiết bị, Kết nối máy và nạp liệu trình, Gửi cấu hình, rồi Theo dõi phiên. Đăng nhập lại `bacsi` để xem danh sách người bệnh đã xếp theo mức cần chú ý. Đăng nhập `quantri` và mở `/connect-device?patientId=p-1` phải thấy `NoAccess`.

## Ngoài phạm vi giai đoạn 1 (giai đoạn sau)

- Bản cài `usb-android` (mô-đun gốc dùng USB Host API, cần development build) và `usb-ios` (phụ thuộc bộ chuyển đổi đồ án phần cứng chọn; CP2102N không có trình điều khiển cho iOS).
- Thay `PROTOCOL` và `CAPABILITIES` bằng đặc tả firmware đã xác nhận.
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
- OPEN (deferred): toàn bộ giá trị trong `PROTOCOL` (khung `$CFG,<10 trường>*hh\r\n`, UART 9600 8N1, `fieldOrder`, `minTreatmentTimeUnit: 's'`, `timeZoneOffsetMin: 420`, `patientIdMaxLength: 16`, `ackTimeoutMs: 2000`, `maxRetries: 2`, dạng `$ACK`, `$NAK`, `$STA`), kế hoạch cố ý để lại cho đặc tả firmware, hiện là giả định của ứng dụng với `confirmed: false`.
- OPEN (unverified): `CAPABILITIES` với `energyLevels: [1, 2, 3, 4, 5]` và chế độ `cold`, `hybrid`, `thermal`, lấy từ báo cáo giữa kỳ đồ án nhúng (tài liệu nội bộ, không có nguồn sống để kiểm, và chính mục 3.2.1.1 của báo cáo đã được ghi nhận có lỗi trong `docs/thiet-ke/cau-hoi-mo-va-tai-lieu.md`).
- OPEN (unverified): bản `usb-android` cần development build vì Expo Go chỉ có mô-đun gốc đóng sẵn; điều này dựa theo `AGENTS.md` của repo, chưa tra tài liệu Expo SDK 58, và thuộc giai đoạn sau.

## Implementation steps

Lệnh kiểm tra dùng chung cho mọi bước (repo không có `CLAUDE.md`, lệnh lấy từ `AGENTS.md` và `package.json`): `npm test` (chạy chuỗi lệnh `node ...` trong script `test`), `npx tsc --noEmit`, `npx expo lint`. Mỗi bước nối lệnh kiểm thử mới của mình vào cuối script `test` trong `package.json` bằng ` && node <đường dẫn>`, giữ nguyên các lệnh cũ. Mỗi bước là một commit riêng.

### Bước 1: Cấu hình giao thức, bảng năng lực, đóng gói khung và thiết bị giả lập

**Files**: tạo `src/lib/device/protocol.test.cjs`, `src/lib/device/simulated.test.cjs`, `src/lib/device/protocol.config.ts`, `src/lib/device/capabilities.ts`, `src/lib/device/protocol.ts`, `src/lib/device/transport.ts`, `src/lib/device/simulated.ts`; sửa `package.json`.

**Do**:

- Viết trước hai tệp kiểm thử `.test.cjs`, mở đầu bằng `/* global __dirname */` và `// Chạy: node src/lib/device/<tên>.test.cjs`, dùng `node:assert/strict` và hàm `load` có bộ nhớ đệm, `require` lồng, dịch bằng `ts.transpileModule` sang CommonJS ES2022, chép đúng mẫu ở đầu `src/lib/workflow.test.cjs`. Dùng một bộ hẹn giờ giả tự viết trong tệp kiểm thử (hàng đợi `{ fn, at }`, hàm `advance(ms)` gọi các hàm đến hạn) và truyền vào `SimOptions.timer`.
- `protocol.config.ts`: xuất `UartSettings`, `FieldName`, `ProtocolSpec`, `PROTOCOL` đúng như mục "Tệp mới"; giá trị tạm `confirmed: false`, `source: 'Giả định của ứng dụng, chưa thống nhất với firmware'`, UART 9600 8N1, `frameStart: '$'`, `frameEnd: '\r\n'`, `separator: ','`, `configCommand: 'CFG'`, `fieldOrder` theo đúng thứ tự 10 trường đã chốt, `minTreatmentTimeUnit: 's'`, `timeZoneOffsetMin: 420`, `patientIdMaxLength: 16`, `ackTimeoutMs: 2000`, `maxRetries: 2`. Ghi chú đầu tệp rằng mọi giá trị là giả định, chỉ sửa tệp này khi có đặc tả firmware.
- `capabilities.ts`: xuất `SIM_MODEL = 'Plasma Pro + mô-đun IoMT ESP32'`, `DeviceCapabilities`, `CAPABILITIES` có đúng một mục khóa `SIM_MODEL` (`confirmed: false`, `source` như kế hoạch, `energyLevels: [1, 2, 3, 4, 5]`, chế độ `cold`/`hybrid`/`thermal` nhãn "Cold"/"Hybrid"/"Thermal", `minTreatmentTimeSec: null`), và `capabilitiesFor(model)` trả `null` khi `model` rỗng hoặc không có trong bảng. Kiểm bằng `grep` rằng chuỗi trùng với `model` trong `src/lib/seed.ts` và `registerDevice` trong `src/lib/store.tsx`.
- `transport.ts`: chỉ kiểu `TransportKind`, `LinkState`, `DeviceTransport` như kế hoạch.
- `protocol.ts`: cài `TreatmentConfig`, `ConfigError`, `validateConfig`, `deviceClock`, `checksum`, `encodeFrame`, `encodeConfig`, `DeviceMessage`, `decodeFrame`, `FrameReader` theo chữ ký và quy tắc ở mục `protocol.ts`. `checksum(body)` là XOR mã ASCII của mọi ký tự trong `body`, trả 2 ký tự hex hoa có đệm 0. `encodeFrame(body, spec)` trả `frameStart + body + '*' + checksum(body) + frameEnd`. Chữ ký `encodeConfig` không nhận `caps`, nên nó gọi `validateConfig(cfg, null, spec)`, bỏ các mã phụ thuộc bảng năng lực (`capabilities_unknown`, `energy_not_allowed`, `mode_not_allowed`, `time_out_of_range`) và ném `Error` nếu còn mã nào (mã hồ sơ, thời gian); kiểm năng lực đầy đủ là việc của `sendConfig` và màn hình. `encodeConfig` dựng giá trị 10 trường theo `fieldOrder` (thời gian theo `minTreatmentTimeUnit`, `Math.ceil(sec / 60)` khi `'min'`; ngày giờ từ `deviceClock(cfg.at, spec.timeZoneOffsetMin)`), nối bằng `separator` sau `configCommand`. `decodeFrame` nhận khung không kèm `frameEnd` (có hoặc không có `frameStart` đầu), thiếu `*` hoặc checksum không đủ 2 ký tự hex là `malformed`, checksum sai là `bad_checksum`; `ACK,<lệnh>` là `ack`, `NAK,<lệnh>,<mã>` là `nak`, `STA,<trạng thái>,<giây>` là `status` (giây không phải số nguyên thì `remainingSec: null`, trạng thái ngoài 5 giá trị thì `unknown`), lệnh khác là `unknown`. `FrameReader.push` bỏ ký tự trước `frameStart`, trả các khung từ `frameStart` đến trước `frameEnd`; khi bộ đệm vượt 1024 ký tự mà chưa có `frameEnd` thì xóa bộ đệm và bỏ qua mọi ký tự đến `frameStart` kế tiếp (để phần đuôi khung bị cắt không tạo khung). Không dùng `enum` hay thuộc tính tham số trong hàm dựng; chỉ `import type` từ `protocol.config` và `capabilities`.
- `simulated.ts`: `createSimulatedTransport(spec, opts)` theo mục `simulated.ts`, import giá trị không đuôi từ `./protocol` và `./capabilities`. Hàm nghe `onData`, `onState` lưu trong mảng, hàm gỡ trả về xóa khỏi mảng. `write` khi chưa `connected` thì `Promise.reject`. Khi nhận khung: tăng bộ đếm; còn trong `dropFirst` thì bỏ qua; checksum sai trả `NAK,CFG,BAD_CHECKSUM`; số trường khác `fieldOrder.length` trả `NAK,CFG,BAD_FIELDS`; có `nakCode` thì trả `NAK,CFG,<nakCode>`; còn trong `corruptFirst` thì trả khung ACK với checksum sai; còn lại lưu cấu hình (đọc lại thành `Record<FieldName, string>` cho `lastConfig()`) và trả `ACK,CFG`. Phản hồi phát đồng bộ trong `write`. `startSession` chỉ chạy khi có cấu hình hợp lệ, lấy `min_treatment_time` làm số giây, phát `STA,running,<n>` ngay rồi mỗi `tickMs` giảm 1, đến 0 phát `STA,done,0`; `stopSession` hủy hẹn giờ và phát `STA,stopped,<n>`; `close()` hủy phiên và phát `disconnected`. `timer` mặc định `setTimeout`/`clearTimeout`.
- `package.json`: nối `node src/lib/device/protocol.test.cjs` và `node src/lib/device/simulated.test.cjs`.

**Test**:

- `protocol.test.cjs`: `checksum('CFG,BN001')` bằng XOR tính tay (viết rõ phép tính trong chú thích); `deviceClock(new Date('2026-11-10T23:30:05Z'), 420)` trả `{ day: 11, month: 11, year: 2026, hour: 6, minute: 30, second: 5 }`; `encodeConfig` với `{ patientId: 'BN001', minTreatmentTimeSec: 120, energyLevel: 3, treatmentMode: 'cold', at }` bắt đầu `$CFG,BN001,`, có 10 trường sau `CFG`, khớp `/\*[0-9A-F]{2}\r\n$/`, và một thiết bị giả lập đã `open()` nhận khung đó qua `write` rồi `lastConfig()` trả đủ 10 trường đúng giá trị; `validateConfig` trả đúng mã cho mã rỗng (`patient_id_empty`), mã 17 ký tự (`patient_id_too_long`), mã có dấu phẩy (`patient_id_charset`), thời gian 0 và 12,5 (`time_invalid`), mức 7 (`energy_not_allowed`), chế độ `laser` (`mode_not_allowed`), `caps = null` (`capabilities_unknown`), và cấu hình hợp lệ trả `[]`; `{ ...PROTOCOL, minTreatmentTimeUnit: 'min' }` với 90 giây gửi trường thời gian `2`; `FrameReader`: hai khung trong một lần đẩy trả 2, khung chia ba lần đẩy chỉ trả 1 ở lần cuối, rác trước `$` bị bỏ, `$` cộng 1100 ký tự không có `\r\n` làm `buffered === 0` và đẩy tiếp `abc*00\r\n` trả `[]`; `decodeFrame`: `$ACK,CFG*hh` đúng checksum là `ack`, sai checksum là `bad_checksum`, `$STA,running,42*hh` là `status` với `remainingSec: 42`, thiếu `*` là `malformed`.
- `simulated.test.cjs`: `failOpen: true` thì `open()` bị từ chối và hàm nghe `onState` nhận `error` cuối cùng; `startSession` trước khi có cấu hình hợp lệ không phát khung nào; sau cấu hình 3 giây và `advance(tickMs)` lặp lại thì nhận `running` với 3, 2, 1 rồi `done`; `stopSession` khi đang chạy phát `stopped`; thêm một kịch bản `write` khi chưa `open()` bị từ chối.

**Verify**: `npm test` qua toàn bộ, gồm hai tệp mới; `npx tsc --noEmit` không lỗi; `npx expo lint` không lỗi mới.

### Bước 2: Máy trạng thái gửi có xác nhận, kiểu dữ liệu, nhật ký gửi trong store và hook liên kết thiết bị

**Files**: tạo `src/lib/device/sender.test.cjs`, `src/lib/device/sender.ts`, `src/lib/device/index.ts`, `src/lib/device/useDeviceLink.ts`; sửa `src/lib/types.ts`, `src/lib/store.tsx`, `src/lib/seed.ts`, `package.json`.

**Do**:

- Viết trước `sender.test.cjs` cùng mẫu `load` và bộ hẹn giờ giả của bước 1; một bộ hẹn giờ giả dùng chung cho thiết bị giả lập và `sendConfig`; vì `sendConfig` trả `Promise`, sau mỗi `advance` cần `await` vài vòng microtask (ví dụ `await new Promise(r => setImmediate(r))`) trước khi tiến tiếp.
- `sender.ts`: `SendResult`, `Timer`, `sendConfig(t, cfg, caps, spec, timer?)` theo luồng ở mục `sender.ts`: `validateConfig` lỗi thì trả `invalid` không ghi; đăng ký `onData` qua `FrameReader` riêng và `onState` trước khi ghi; mỗi lần gửi tăng `attempts`, `write` bị từ chối thì trả `disconnected`; đặt hẹn giờ `ackTimeoutMs`, hết giờ còn lượt thì gửi lại, hết lượt thì `timeout`; khung `ack`/`nak` có `command === spec.configCommand` thì kết thúc (`nak` không gửi lại); `bad_checksum`, `malformed`, `unknown`, `status` bị bỏ qua; `onState` nhận `disconnected` hoặc `error` thì trả `disconnected`; một hàm `finish` duy nhất gỡ `onData`, `onState`, xóa hẹn giờ và chặn kết thúc hai lần. Import giá trị không đuôi từ `./protocol`.
- `src/lib/types.ts`: thêm `import type { TransportKind } from './device/transport'`, `import type { SendResult } from './device/sender'`; thêm `treatmentMode?: string | null` vào `TreatmentPlan` với chú thích `doseLevel` là `energy_level` gửi firmware; thêm `DeviceLinkLog` đúng trường như kế hoạch; thêm `deviceLinks?: DeviceLinkLog[]` vào `AppData`.
- `src/lib/seed.ts`: `createSeed` thêm `deviceLinks: []`; không đổi `doseLevel` hay thêm `treatmentMode` cho đợt mẫu.
- `src/lib/store.tsx`: cạnh `saved.sessionNotes ??= []` (dòng khoảng 119) thêm `saved.deviceLinks ??= []`; thêm `recordDeviceLink(entry: Omit<DeviceLinkLog, 'id' | 'at' | 'by'>)` vào interface `Store` và giá trị provider: lấy người dùng hiện tại, nếu là người bệnh thì phải có `me.patientId === entry.patientId`, nếu là bác sĩ thì gọi `requireDoctor(entry.patientId)`, vai trò khác ném lỗi như các hàm cùng loại; ghi bản ghi có `id` sinh theo cách các hàm khác trong store đang dùng, `at` là `new Date().toISOString()`, `by` là id tài khoản; nối vào `deviceLinks`. Không đụng `setDevicePower`, `simulateSession`.
- `src/lib/device/index.ts`: `getTransport()` tạo một lần và giữ `createSimulatedTransport(PROTOCOL)` ở biến mô-đun; `planToConfig(plan, patient, at)` theo mục `index.ts`, trả `{ missing }` khi thiếu `durationSec`, `doseLevel` hoặc `treatmentMode` (giá trị `null`, `undefined` hay chuỗi rỗng đều là thiếu). Được phép import `@/lib/types` vì tệp này không phải mô-đun thuần.
- `src/lib/device/useDeviceLink.ts`: hook theo mục `useDeviceLink.ts`; giữ `state`, `detail`, `lastStatus`, `lastStatusAt` bằng `useState`; trong `useEffect` đăng ký `onState` và `onData` qua một `FrameReader`, lấy khung `status` gần nhất, gỡ khi unmount; `connect`/`disconnect` gọi `open`/`close` và bắt lỗi (lỗi thể hiện qua `state`); `send(cfg)` gọi `sendConfig(transport, cfg, caps, PROTOCOL)`; `startSession`, `stopSession` chỉ có giá trị khi `kind === 'simulated'`, ngược lại là `undefined`.
- `package.json`: nối `node src/lib/device/sender.test.cjs`.

**Test** (`sender.test.cjs`, thiết bị giả lập đã `open()` trừ khi ghi khác): ACK ngay trả `{ kind: 'acked', attempts: 1 }`; `dropFirst: 1` trả `acked`, `attempts: 2`; `dropFirst: 5` với `maxRetries: 2` trả `timeout`, `attempts: 3`; `nakCode: 'BUSY'` trả `nacked`, `code: 'BUSY'`, `attempts: 1` và thiết bị chỉ nhận 1 khung; `corruptFirst: 1` trả `acked`, `attempts: 2`; dùng `dropFirst: 5` rồi `close()` trước khi hết giờ thì trả `disconnected`; gửi khi chưa `open()` trả `disconnected` và `Promise` kết thúc; cấu hình sai trả `invalid` và `lastConfig()` là `null`; bọc `onData` của thiết bị để đếm lời gọi tới hàm nghe của `sendConfig`, sau khi có kết quả thì ghi thêm dữ liệu từ phía thiết bị (ví dụ `startSession`) và số lời gọi mới bằng 0.

**Verify**: `npm test` qua; `npx tsc --noEmit` không lỗi (kiểm cả việc thêm trường tùy chọn không làm hỏng chỗ dùng `TreatmentPlan`, `AppData`); `npx expo lint` không lỗi mới.

### Bước 3: Màn kết nối thiết bị, màn theo dõi phiên và lối vào từ màn thiết bị

**Files**: tạo `src/app/connect-device.tsx`, `src/app/session-monitor.tsx`; sửa `src/app/patient/device.tsx`, `src/app/devices/[id].tsx`.

**Do**:

- Đọc trước `src/components/Guard.tsx` (`useCanView`, `NoAccess`), `src/components/ui.tsx` (`Choices` và các thành phần dùng chung), `src/app/plan/[patientId].tsx` (cách chọn vết bằng `Choices`, cách lấy `coursePlan`, `woundsOf`, `device` từ `useLookups`), `src/app/patient/device.tsx`, `src/app/devices/[id].tsx`.
- `connect-device.tsx`: đọc `patientId`, `woundId` bằng `useLocalSearchParams`; người bệnh không truyền thì dùng `me.patientId`; không có người bệnh tương ứng hoặc `useCanView` sai (gồm quản trị kỹ thuật, người bệnh mất liên kết hồ sơ) thì trả `NoAccess`. Danh sách đợt gửi được: các vết có `coursePlan(w.id)` với `status === 'active'` và `confirmed`; rỗng thì hiện "Chưa có đợt điều trị được bác sĩ xác nhận" và không có nút Gửi; nhiều hơn một thì `Choices` chọn vết, khởi tạo từ `woundId` nếu hợp lệ, ngược lại để trống và chưa xem trước. Hiện trạng thái kết nối, nhãn đường truyền ("Thiết bị giả lập" khi `kind === 'simulated'`), nút Kết nối và Ngắt. Gọi `planToConfig(plan, patient, new Date())`: có `missing` thì liệt kê tên trường tiếng Việt (thời gian, mức năng lượng, chế độ) và khóa Gửi; ngược lại bảng xem trước 10 trường (giá trị đúng như sẽ gửi: thời gian theo `PROTOCOL.minTreatmentTimeUnit`, ngày giờ từ `deviceClock(at, PROTOCOL.timeZoneOffsetMin)`) và lỗi `validateConfig(cfg, caps, PROTOCOL)` dịch sang tiếng Việt, riêng `energy_not_allowed` là "Mức năng lượng của đợt không có trong danh sách của mẫu thiết bị, bác sĩ cần lưu phiên bản mới"; có lỗi hoặc chưa `connected` thì khóa Gửi. Nút "Gửi cấu hình xuống máy" gọi `send`, hiện kết quả (đã nhận; máy từ chối kèm mã; hết giờ sau N lần; "Mất kết nối, hãy cắm lại cáp và gửi lại"; cấu hình không hợp lệ), có nút Gửi lại, và gọi `recordDeviceLink({ deviceId: patient.deviceId ?? null, patientId, planId, planVersion, transport: kind, result: r.kind, attempts, code })` (với `invalid` thì `attempts: 0`). Hiện cảnh báo "Giao thức và danh sách mức, chế độ chưa được firmware xác nhận." khi `PROTOCOL.confirmed` hoặc `caps?.confirmed` là `false` hoặc `caps` là `null`. Nút trong lúc gửi bị khóa để không gửi chồng.
- `session-monitor.tsx`: cùng tham số và cùng kiểm quyền; hiện trạng thái kết nối, trạng thái phiên từ `lastStatus` (nhãn tiếng Việt cho `idle`, `running`, `done`, `stopped`, `error`), giây còn lại, thời điểm `lastStatusAt`; báo khi `state` là `disconnected` hoặc `error`; khi có `startSession`, `stopSession` thì hiện nút "Bắt đầu phiên (giả lập)", "Dừng phiên (giả lập)".
- `patient/device.tsx`: thêm nút "Kết nối máy và nạp liệu trình" mở `/connect-device` và "Theo dõi phiên điều trị" mở `/session-monitor`, theo kiểu nút đang dùng trong màn.
- `devices/[id].tsx`: khi người xem là bác sĩ phụ trách người giữ máy (dùng hàm kiểm quyền sẵn có, ví dụ `canManagePatient`), thêm hai nút tương tự truyền `patientId` của người giữ máy; quản trị kỹ thuật không thấy hai nút.
- Không sửa `src/app/admin/*`, `DeviceView`, `setDevicePower`, `simulateSession`. Nếu `_layout.tsx` gốc cần khai báo màn mới để có tiêu đề thì thêm theo mẫu các màn cùng cấp.

**Test**: không có kiểm thử tự động mới (màn hình). Kiểm tay bằng `npm run web`: `bacsi` lưu phiên bản "Đang áp dụng" mới cho BN001 sau bước 4 thì mới gửi được; trước đó, với đợt mẫu `pl-1`, màn kết nối phải liệt kê thiếu chế độ và khóa Gửi; `quantri` mở `/connect-device?patientId=p-1` và `/session-monitor?patientId=p-1` thấy `NoAccess`.

**Verify**: `npm test` vẫn qua; `npx tsc --noEmit` không lỗi; `npx expo lint` không lỗi mới.

### Bước 4: Chế độ điều trị trong liệu trình và ô chọn mức theo bảng năng lực

**Files**: sửa `src/app/plan/[patientId].tsx`, `src/components/CourseCard.tsx`, `src/app/schedule.tsx`, `src/app/wounds/[id].tsx`.

**Do**:

- `plan/[patientId].tsx`: lấy `caps = capabilitiesFor(device?.model)` của thiết bị gán cho người bệnh. Khi `caps` khác `null`: ô mức năng lượng thành `Choices` với các giá trị `caps.energyLevels` (nhãn là số), thêm ô `Choices` chế độ từ `caps.treatmentModes`; giá trị khởi tạo lấy từ `latest.doseLevel`, `latest.treatmentMode` chỉ khi thuộc danh sách, ngược lại để trống (đợt mẫu `pl-1` có `doseLevel: 8` phải hiện ô trống). `Choices` hiện có kiểu `value: T` với `T extends string`, nên giữ giá trị chọn dưới dạng chuỗi (chuỗi rỗng là chưa chọn) và đổi sang số khi lưu; nếu `Choices` không hiện được trạng thái chưa chọn thì xử lý ở màn này, không đổi chữ ký `Choices`. Khi `caps` là `null`: hiện "Chưa có danh sách mức và chế độ cho mẫu thiết bị này", giữ ô nhập số cũ cho mức, không có ô chế độ, `treatmentMode` lưu `null`. Khi lưu đợt "Đang áp dụng" mà `caps` có chế độ và chưa chọn thì `fail(1, …)` với thông báo tiếng Việt như kiểm tra mức và thời gian hiện có; mức không thuộc danh sách cũng `fail(1, …)`. Thêm `treatmentMode` vào đối tượng truyền cho `savePlan` trong hàm `save`.
- `CourseCard.tsx`, `schedule.tsx`, `wounds/[id].tsx`: chỗ đang hiện mức năng lượng thì thêm nhãn chế độ khi `treatmentMode` có giá trị, nhãn lấy từ `capabilitiesFor(model)?.treatmentModes` nếu có, ngược lại hiện chính giá trị; liệu trình cũ không có `treatmentMode` hiện như cũ. Dùng hàm nhỏ dùng chung nếu cần (ví dụ `modeLabel(mode, model)` xuất thêm từ `src/lib/device/capabilities.ts`); nếu thêm hàm này vào tệp thuần thì không cần kiểm thử riêng, nhưng không được import `react-native` vào đó.

**Test**: không có kiểm thử tự động mới. Kiểm tay bằng `npm run web`: đăng nhập `bacsi`, mở đợt của BN001, thấy ô mức trống và ô chế độ trống; lưu "Đang áp dụng" khi chưa chọn chế độ báo lỗi ở bước 1; chọn mức 3, chế độ Cold, xác nhận và lưu thì thẻ đợt, lịch và màn vết hiện "Cold" cạnh mức; sau đó đăng nhập `benhnhan` / `Demo@123`, mở Thiết bị, Kết nối máy và nạp liệu trình, Kết nối, Gửi cấu hình thấy "đã nhận", rồi Theo dõi phiên, Bắt đầu phiên (giả lập) thấy giây còn lại giảm.

**Verify**: `npm test` vẫn qua; `npx tsc --noEmit` không lỗi; `npx expo lint` không lỗi mới.

### Bước 5: Lớp nhận diện vết thương `src/lib/ai/` và màn chụp ảnh dùng giao diện

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

### Bước 6: Xếp người bệnh theo mức cần chú ý trên tổng quan bác sĩ và cập nhật bảng đối chiếu

**Files**: tạo `src/lib/attention.test.ts`, `src/lib/attention.ts`; sửa `src/app/doctor/index.tsx`, `src/components/items.tsx`, `package.json`, `docs/thiet-ke/doi-chieu-ma-nguon.md`.

**Do**:

- Viết trước `attention.test.ts` mở đầu `// Chạy: node src/lib/attention.test.ts`, import `./attention.ts`, dùng hàm dựng `AttentionInput` mặc định rồi ghi đè từng trường.
- `attention.ts` (thuần, không import gì ngoài kiểu nếu cần): `TodayState`, `AttentionInput`, `Attention`, `classifyToday`, `rankPatients` theo quy tắc ở mục `attention.ts`: thứ tự xét `no_plan`, `rest`, `treated`, `no_data`, `due`; điểm +100 mỗi báo cáo chưa xử lý, +50 Nặng, +20 Trung bình, +10 mỗi ngày bỏ lỡ, +5 khi `no_data`; `reasons` theo thứ tự báo cáo, mức độ, bỏ lỡ, chưa có dữ liệu, với câu như "2 báo cáo chưa xử lý", "Mức độ Nặng", "Bỏ lỡ 3 buổi trong 7 ngày", "Chưa có dữ liệu hôm nay"; sắp xếp ổn định theo điểm giảm dần (sắp theo cặp điểm và chỉ số vào).
- `items.tsx`: `PatientCard` nhận thêm `attention?: Attention`; có thì hiện chip trạng thái hôm nay (nhãn tiếng Việt: Đã chiếu, Cần chiếu, Chưa có dữ liệu, Ngày nghỉ, Chưa có đợt) bằng thành phần chip sẵn có trong `src/components/ui.tsx` nếu có, và `reasons[0]` nếu có; không truyền thì hiện như cũ.
- `doctor/index.tsx`: với `today = localDay()`, dựng `AttentionInput` cho từng người bệnh của bác sĩ theo đúng quy tắc ở mục `attention.ts` (dùng `woundsOf`, `coursePlan`, `device`, `sessionsOf` từ `useLookups`, `isScheduled`, `localDay` từ `@/lib/course`, `patientSeverity` từ `@/lib/access`, `data.reports` với `handled === false`); `missedLast7` tính 7 ngày trước hôm nay giống `missed` trong `courseProgress` của `src/lib/course.ts` (đọc hàm này trước để dùng lại cách cộng ngày và so sánh với `lastSyncDay`); gọi `rankPatients` trong `useMemo`, hiện danh sách theo thứ tự đó và truyền `attention` cho `PatientCard`.
- `package.json`: nối `node src/lib/attention.test.ts`.
- `docs/thiet-ke/doi-chieu-ma-nguon.md`: cập nhật các dòng FR2, FR4, FR10, FR11, NFR3 theo mã mới (lớp `src/lib/device/`, màn `connect-device`, `session-monitor`, thiết bị giả lập tách khỏi `store.tsx`, `src/lib/ai/`, `attention.ts`), ghi rõ phần còn lại của giai đoạn sau (USB thật, đặc tả firmware, đọc nhật ký phiên từ máy). Giữ văn phong và định dạng bảng hiện có.

**Test** (`attention.test.ts`): `classifyToday` trả `no_plan` khi không có đợt, `rest` khi không có lịch hôm nay, `treated` khi `completedToday >= targetPerDay`, `no_data` khi `lastSyncDay` là `null` hoặc ngày cũ, `due` khi đã đồng bộ hôm nay nhưng chưa đủ buổi; đủ buổi nhưng `lastSyncDay` cũ vẫn `treated`; `rankPatients`: người có 1 báo cáo chưa xử lý đứng trước người Nặng không báo cáo, người Nặng đứng trước người bỏ lỡ 3 buổi, hai người cùng điểm giữ thứ tự vào, `reasons` của người có báo cáo chứa câu về báo cáo, điểm tính đúng cho một ví dụ cộng nhiều thành phần.

**Verify**: `npm test` qua toàn bộ (đủ 5 tệp kiểm thử mới của kế hoạch); `npx tsc --noEmit` không lỗi; `npx expo lint` không lỗi mới; `npm run web`, đăng nhập `bacsi` thấy danh sách người bệnh xếp theo mức cần chú ý, mỗi thẻ có chip và lý do.
