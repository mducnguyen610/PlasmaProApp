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

1. Tạo thư mục `src/lib/device/` gồm các mô-đun thuần TypeScript (chỉ `import type` từ tệp khác, để chạy được bằng `node` như các bài kiểm thử hiện có): cấu hình giao thức, đóng gói và giải mã khung, máy trạng thái gửi có xác nhận, thiết bị giả lập nói cùng giao thức.
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

`CAPABILITIES` có đúng một mục cho mẫu thiết bị giả lập, `confirmed: false`, `source: 'Báo cáo giữa kỳ đồ án nhúng, bảng mục 3.2.1.1 (GA-3), chưa xác nhận với firmware'`, `energyLevels: [1, 2, 3, 4, 5]`, chế độ `cold`, `hybrid`, `thermal` với nhãn "Cold", "Hybrid", "Thermal", `minTreatmentTimeSec: null`. Mẫu thật chưa có mục nào; `capabilitiesFor` trả `null` khi không biết mẫu.

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
export class FrameReader { constructor(spec: ProtocolSpec); push(chunk: string): string[]; } // gom chuỗi nhận được, trả các khung đủ, bỏ rác trước frameStart, giới hạn bộ đệm 1024 ký tự
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

Luồng: kiểm `validateConfig` (lỗi thì trả `invalid`, không ghi gì xuống đường truyền); ghi khung; chờ khung `ack` hoặc `nak` của lệnh `configCommand` trong `ackTimeoutMs`; hết giờ thì gửi lại, tối đa `maxRetries` lần gửi lại (tổng `maxRetries + 1` lần); `nak` không gửi lại; trạng thái `disconnected` hay `error` giữa chừng trả `disconnected`; khung `bad_checksum` bị bỏ qua như chưa nhận; luôn gỡ `onData`, `onState` và hẹn giờ khi kết thúc. `timer` mặc định dùng `setTimeout`/`clearTimeout`, kiểm thử truyền bộ hẹn giờ giả để không phải chờ thật.

### `src/lib/device/simulated.ts` (thuần)

```ts
export interface SimOptions { model?: string; dropFirst?: number; corruptFirst?: number; nakCode?: string | null; failOpen?: boolean; tickMs?: number; timer?: Timer }
export function createSimulatedTransport(spec: ProtocolSpec, opts?: SimOptions): DeviceTransport & { lastConfig(): Record<FieldName, string> | null; startSession(): void; stopSession(): void };
```

Thiết bị giả lập dùng `FrameReader` và `decodeFrame` để đọc khung ứng dụng gửi, kiểm checksum và số trường, trả `$ACK,CFG` hoặc `$NAK,CFG,<mã>` (`BAD_CHECKSUM`, `BAD_FIELDS`, hoặc `nakCode` cấu hình). `dropFirst` bỏ qua N khung đầu (để kiểm gửi lại), `corruptFirst` trả N phản hồi sai checksum. `startSession` chỉ chạy khi đã nhận cấu hình hợp lệ, phát `$STA,running,<giây còn lại>` mỗi `tickMs` (mặc định 1000) đến `done`; `stopSession` phát `stopped`. `model` mặc định là khóa giả lập trong `CAPABILITIES`.

### `src/lib/device/index.ts`

```ts
export function getTransport(): DeviceTransport; // giai đoạn 1 luôn trả bản giả lập (một thể hiện dùng chung trong phiên chạy ứng dụng)
export function planToConfig(plan: TreatmentPlan, patient: Patient, at: Date): TreatmentConfig | { missing: ('duration' | 'energy' | 'mode')[] };
```

`planToConfig` lấy `patient.code` làm `patientId` (không dùng họ tên), `plan.durationSec` làm `minTreatmentTimeSec`, `plan.doseLevel` làm `energyLevel`, `plan.treatmentMode` làm `treatmentMode`; thiếu trường nào thì trả danh sách thiếu.

### `src/lib/device/useDeviceLink.ts`

Hook React bọc `getTransport()`: trả `{ kind, model, state, detail, connect(), disconnect(), send(cfg), lastStatus, startSession(), stopSession() }`. Đăng ký `onState`, `onData` (qua `FrameReader`) khi mount, gỡ khi unmount. `startSession`, `stopSession` chỉ có với bản giả lập (để demo màn theo dõi phiên); với bản thật sau này, phiên do người bệnh bấm trên máy.

### `src/lib/ai/recognizer.ts`, `src/lib/ai/result.ts`, `src/lib/ai/index.ts`

```ts
// result.ts (thuần)
export interface RecognitionResult { found: boolean; box: { x: number; y: number; width: number; height: number } | null; hull: [number, number][]; areaFraction: number | null; confidence: number | null; modelId: string; modelVersion: string }
export function fromColorDetection(d: WoundDetection | null, modelId: string, modelVersion: string): RecognitionResult;
// recognizer.ts (chỉ kiểu)
export interface WoundRecognizer { id: string; version: string; kind: 'on_device' | 'remote'; recognize(uri: string): Promise<RecognitionResult> }
// index.ts
export function getRecognizer(): WoundRecognizer; // giai đoạn 1: bản bọc detectInPhoto, id = DETECTOR_ID, version '1', kind 'on_device'
```

`fromColorDetection(null)` trả `found: false`, `box: null`, `hull: []`, `areaFraction: null`, `confidence: null`. Bộ dò màu không có độ tin cậy nên `confidence` luôn `null`, không bịa số.

### `src/lib/attention.ts` (thuần)

```ts
export type TodayState = 'treated' | 'due' | 'no_data' | 'rest' | 'no_plan';
export interface AttentionInput { patientId: string; hasActivePlan: boolean; scheduledToday: boolean; completedToday: number; targetPerDay: number; lastSyncDay: string | null; today: string; missedLast7: number; openReports: number; severity: 'mild' | 'moderate' | 'severe' | undefined }
export interface Attention { patientId: string; state: TodayState; score: number; reasons: string[] }
export function classifyToday(i: AttentionInput): TodayState;
export function rankPatients(inputs: AttentionInput[]): Attention[]; // điểm giảm dần, hòa thì giữ thứ tự vào
```

`classifyToday`: không có đợt đang áp dụng là `no_plan`; không có lịch hôm nay là `rest`; `completedToday >= targetPerDay` là `treated`; `lastSyncDay` khác `today` (hoặc `null`) là `no_data`; còn lại là `due`. Điểm: mỗi báo cáo chưa xử lý +100, mức Nặng +50, Trung bình +20, mỗi ngày bỏ lỡ trong 7 ngày +10, `no_data` +5. `reasons` là các câu tiếng Việt ngắn tương ứng (ví dụ "2 báo cáo chưa xử lý", "Bỏ lỡ 3 buổi trong 7 ngày", "Chưa có dữ liệu hôm nay").

### Màn hình mới

- `src/app/connect-device.tsx`, tham số `patientId` (người bệnh mở không cần tham số, dùng `me.patientId`). Quyền: người bệnh của hồ sơ đó, bác sĩ phụ trách, quản trị (chỉ xem, không gửi). Nội dung: trạng thái kết nối và loại đường truyền (nhãn "Thiết bị giả lập" khi `kind === 'simulated'`); nút Kết nối, Ngắt; bảng xem trước 10 trường sẽ gửi (đọc từ `planToConfig` của đợt đang áp dụng đã được bác sĩ xác nhận); nếu thiếu trường hoặc `validateConfig` báo lỗi thì hiện lỗi tiếng Việt và khóa nút Gửi; nút "Gửi cấu hình xuống máy"; kết quả (đã nhận, máy từ chối kèm mã, hết giờ sau N lần, mất kết nối) và nút Gửi lại; ghi nhật ký gửi vào store. Hiện cảnh báo khi `PROTOCOL.confirmed` hoặc bảng năng lực `confirmed` là `false`: "Giao thức và danh sách mức, chế độ chưa được firmware xác nhận."
- `src/app/session-monitor.tsx`, cùng tham số và quyền. Hiện trạng thái kết nối, trạng thái phiên từ khung `status` cuối cùng, giây còn lại, thời điểm nhận khung cuối; báo khi mất kết nối. Với bản giả lập có nút "Bắt đầu phiên (giả lập)", "Dừng phiên (giả lập)".

### Kiểm thử mới

`src/lib/device/protocol.test.ts`, `src/lib/device/sender.test.ts`, `src/lib/device/simulated.test.ts`, `src/lib/ai/result.test.ts`, `src/lib/attention.test.ts`. Mỗi tệp mở đầu bằng `// Chạy: node <đường dẫn>`, dùng `node:assert/strict`, import tệp nguồn có đuôi `.ts`, như `src/lib/devices.test.ts`.

## Tệp sửa

- `src/lib/types.ts`: thêm `treatmentMode?: string | null` vào `TreatmentPlan` (ghi chú: `doseLevel` là `energy_level` gửi firmware); thêm kiểu `DeviceLinkLog { id: string; deviceId: string | null; patientId: string; planId: string; planVersion: number; at: string; by: string; transport: TransportKind; result: SendResult['kind']; attempts: number; code?: string }` và trường `deviceLinks?: DeviceLinkLog[]` trong `AppData` (tùy chọn để dữ liệu cũ đọc được).
- `src/lib/store.tsx`: khi đọc dữ liệu đã lưu thì `saved.deviceLinks ??= []` như `sessionNotes`; thêm `recordDeviceLink(entry: Omit<DeviceLinkLog, 'id' | 'at' | 'by'>)`, kiểm người gọi là người bệnh của hồ sơ hoặc bác sĩ phụ trách (dùng `requireDoctor` cho bác sĩ). `createSeed` trong `src/lib/seed.ts` thêm `deviceLinks: []`.
- `src/app/plan/[patientId].tsx`: thêm ô chọn chế độ (`Choices`) và đổi ô mức năng lượng thành ô chọn, cả hai lấy từ `capabilitiesFor(device?.model)` của thiết bị gán cho người bệnh; nếu `null` thì hiện "Chưa có danh sách mức và chế độ cho mẫu thiết bị này" và giữ ô nhập số cũ cho mức, không có ô chế độ. Đợt "Đang áp dụng" cần thêm `treatmentMode` khi bảng năng lực có chế độ. Lưu `treatmentMode` qua `savePlan`.
- `src/components/CourseCard.tsx`, `src/app/schedule.tsx`, `src/app/wounds/[id].tsx`: hiện nhãn chế độ cạnh mức năng lượng khi có.
- `src/app/patient/device.tsx`: thêm hai nút "Kết nối máy và nạp liệu trình" (mở `/connect-device`) và "Theo dõi phiên điều trị" (mở `/session-monitor`).
- `src/app/devices/[id].tsx`: với bác sĩ phụ trách, thêm hai nút tương tự, truyền `patientId` của người giữ máy.
- `src/app/guided-capture.tsx`: thay `detectInPhoto(photo.uri)` bằng `getRecognizer().recognize(photo.uri)`; phần lưu `capture.wound` lấy `detector` từ `modelId` và giữ nguyên các trường khác. Vì `estimateFor` và `roiFrom` đang nhận `WoundDetection`, giữ `photoWound` là `WoundDetection` bằng cách để bản cài màu trả thêm đối tượng gốc qua hàm nội bộ, hoặc đổi hai hàm sang nhận `RecognitionResult` (chọn cách đổi hai hàm nếu chỉ dùng `box`, `hull`, `areaFraction`, `found`; kiểm khi triển khai).
- `src/app/doctor/index.tsx`: dựng `AttentionInput` cho từng người bệnh (dùng `coursePlan`, `isScheduled`, `localDay`, `sessionsOf`, `patientSeverity`, báo cáo chưa xử lý), gọi `rankPatients`, hiện danh sách theo thứ tự đó; mỗi thẻ có chip trạng thái hôm nay và dòng lý do đầu tiên.
- `src/components/items.tsx`: `PatientCard` nhận thêm prop tùy chọn `attention?: Attention` để hiện chip và lý do; không truyền thì hiện như cũ.
- `package.json`: nối 5 lệnh kiểm thử mới vào script `test`.
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

## Kịch bản kiểm thử

`protocol.test.ts`:
- `checksum('CFG,BN001')` bằng giá trị XOR tính tay trong bài kiểm thử.
- `deviceClock(new Date('2026-11-10T23:30:05Z'), 420)` trả ngày 11, tháng 11, năm 2026, 6 giờ 30 phút 5 giây.
- `encodeConfig` với cấu hình hợp lệ trả chuỗi bắt đầu `$CFG,BN001,`, có đủ 10 trường theo `fieldOrder`, kết thúc `*hh\r\n`, và `decodeFrame` của thiết bị giả lập đọc lại đủ trường.
- `validateConfig` trả đúng mã lỗi cho: mã rỗng, mã 17 ký tự, mã có dấu phẩy, thời gian 0, thời gian 12,5, mức 7 khi danh sách là 1 đến 5, chế độ `laser`, `caps = null`.
- `minTreatmentTimeUnit: 'min'` với 90 giây gửi `2`.
- `FrameReader`: một lần đẩy hai khung trả 2 khung; khung chia ba lần đẩy trả 1 khung ở lần cuối; rác trước `$` bị bỏ; 1100 ký tự không có khung làm rỗng bộ đệm.
- `decodeFrame`: `$ACK,CFG*hh` đúng checksum là `ack`; sai checksum là `bad_checksum`; `$STA,running,42*hh` là `status` với `remainingSec: 42`; thiếu `*` là `malformed`.

`sender.test.ts` (dùng thiết bị giả lập và bộ hẹn giờ giả):
- Thiết bị trả ACK ngay: `acked`, `attempts: 1`.
- `dropFirst: 1`: `acked`, `attempts: 2`.
- `dropFirst: 5`, `maxRetries: 2`: `timeout`, `attempts: 3`.
- `nakCode: 'BUSY'`: `nacked`, `code: 'BUSY'`, `attempts: 1`, không gửi lại.
- `corruptFirst: 1`: phản hồi sai bị bỏ, lần gửi lại được `acked`, `attempts: 2`.
- Đóng đường truyền giữa lúc chờ: `disconnected`.
- Cấu hình sai: `invalid`, thiết bị giả lập không nhận khung nào (`lastConfig()` là `null`).
- Sau khi kết thúc, không còn hàm nghe `onData` nào được gọi (đếm số lần gọi sau khi trả kết quả bằng 0).

`simulated.test.ts`:
- `failOpen: true`: `open()` bị từ chối và trạng thái là `error`.
- `startSession` trước khi có cấu hình hợp lệ: không phát khung trạng thái.
- Sau cấu hình 3 giây và `tickMs` giả: phát `running` với giây còn lại 3, 2, 1, rồi `done`.
- `stopSession` khi đang chạy: phát `stopped`.

`result.test.ts`:
- `fromColorDetection(null, …)` trả `found: false`, `confidence: null`.
- Phát hiện có hộp và đường bao: giữ nguyên `box`, `hull`, `areaFraction`; `modelId`, `modelVersion` đúng tham số.

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

Chạy web để xem hai màn mới với thiết bị giả lập: `npm run web`, đăng nhập `benhnhan` / `Demo@123`, mở Thiết bị, Kết nối máy và nạp liệu trình, Gửi cấu hình, rồi Theo dõi phiên. Đăng nhập `bacsi` để xem danh sách người bệnh đã xếp theo mức cần chú ý.

## Ngoài phạm vi giai đoạn 1 (giai đoạn sau)

- Bản cài `usb-android` (mô-đun gốc dùng USB Host API, cần development build) và `usb-ios` (phụ thuộc bộ chuyển đổi đồ án phần cứng chọn; CP2102N không có trình điều khiển cho iOS).
- Thay `PROTOCOL` và `CAPABILITIES` bằng đặc tả firmware đã xác nhận.
- Đọc nhật ký phiên từ máy (FR4) khi firmware có lệnh tương ứng.
- Thay bộ dò màu bằng mô-đun AI có sẵn khi biết dạng của mô-đun.
- Màn gán nhãn kiểu phân loại, khung hoặc phân vùng (FR15) khi bác sĩ chốt phương pháp.
- Đề xuất backend, database (viết trong hồ sơ thiết kế, không lập trình).
