# Plasma Pro Stage 9C: Báo cáo kiến trúc thiết bị (gói C)

## 1. Cấu trúc tầng thiết bị (`src/lib/device/`)

```
Màn T01, T02 (src/app)
   │  useDeviceLink (hook, transport dùng chung, dọn listener)
   ▼
Dịch vụ thiết bị: treatmentConfig, stopRequest, session-tracker, labels, capabilities
   ▼
sender (gửi, chờ ACK/NAK, gửi lại khi hết thời gian, kiểm phiên bản INF/CAP)
   ▼
protocol + codec (codec-text kiểu NMEA, codec-binary AA 55 + CRC16) + checksum
   ▼                     ▲ đặc tả khai báo: protocol.config.ts, spec.ts, vectors.ts
transport (simulated.ts | usb-android.ts + modules/plasma-usb) ── trace.ts (ghi vết hex)
```

## 2. Thay đổi 9C

| Commit | Tệp | Nội dung |
|---|---|---|
| 530a0bb | `src/lib/device/stopRequest.ts` (mới) | `stopRequestView({ stopAt, state, statusAt, now })` trả `{ confirmed, waitSec }` |
| 530a0bb | `src/app/session-monitor.tsx` | Hai dòng inline thay bằng lời gọi `stopRequestView` |
| 530a0bb | `src/lib/device/stopRequest.test.cjs` (mới) | 9 trường hợp so với logic cũ sao nguyên văn |

Quy tắc giữ nguyên: chỉ coi là đã dừng khi máy gửi trạng thái kết thúc (`stopped`, `done`, `error`) với thời điểm nhận `statusAt >= stopAt`. Bản tin trạng thái cũ hơn lúc bấm dừng không được tính (P0 DV-01).

## 3. Kiểm tra ràng buộc Dừng khẩn cấp

| Ràng buộc | Kết quả | Căn cứ |
|---|---|---|
| Nút dừng luôn hiện, không nằm trong menu hay hộp thoại | Không đổi | `session-monitor.tsx` không đổi phần hiển thị |
| Không tự khởi động lại | Không đổi | 9C không thêm lời gọi `startSession` |
| Không tự gửi lại lệnh không an toàn | Không đổi | `NAK_HINT` vẫn yêu cầu người dùng bấm gửi lại (ICD mục 7) |
| Không báo đã dừng trước khi máy xác nhận | Không đổi, nay có kiểm thử | `stopRequest.test.cjs` |

## 4. Giới hạn

- Giao thức hiện không có lệnh dừng gửi xuống máy thật; nút dừng chỉ hoạt động với giả lập (ghi nhận từ Stage 7, vẫn BLOCKED).
- Bản tin CFG không có trường lịch (phát hiện ở 9B, S8-B09 chờ nhóm phần cứng).
- Mọi kiểm thử ở đây chạy với giả lập; không phải xác minh phần cứng.
- Mọi giá trị giao thức vẫn là giả định (`confirmed: false`), chờ nhóm firmware trả lời ICD.

## 5. Hoàn tác

`git revert 530a0bb`.

## 6. Hoàn tất gói C (16/11/2026, nhánh `refactor/stage-9c-bcd`)

### 6.1 Phân tách logic

| Phần | Mã | Trách nhiệm |
|---|---|---|
| Device Presentation | `connect-device.tsx` (T01), `session-monitor.tsx` (T02), `DeviceStatus`, `UsbLinkStatus` | Hiển thị; gọi dịch vụ; không tạo khung, không tính checksum, không tự quyết điều kiện gửi |
| Device Application Services | `configCommand.ts` (điều kiện gửi, bước, vòng đời lệnh, gửi rồi ghi nhật ký, một lệnh một lúc), `treatmentConfig.ts`, `stopRequest.ts`, `session-tracker.ts`, `labels.ts` | Quy tắc của luồng thiết bị, có kiểm thử đơn vị |
| Device State Management | `useDeviceLink.ts` | Một đường truyền dùng chung; trạng thái liên kết, danh tính máy, STA gần nhất; kết nối, hỏi máy, ngắt; dọn listener khi rời màn |
| Protocol Layer | `protocol.config.ts`, `protocol.ts`, `codec*.ts`, `checksum.ts`, `spec.ts`, `sender.ts` | Không đổi |
| Transport Layer | `transport.ts`, `trace.ts`, `index.ts` (chọn đường truyền) | Không đổi |
| Device Adapter | `usb-android.ts`, `usb-android-core.ts`, `modules/plasma-usb` | Không đổi; không import bộ giả lập (kiểm tĩnh) |
| Simulator | `simulated.ts` | Không đổi; `startSession`, `stopSession`, `lastConfig` chỉ lộ ra khi đường truyền là giả lập |

### 6.2 Vòng đời lệnh nạp (configCommand.ts)

| Mốc | Điều kiện | Ý nghĩa |
|---|---|---|
| `sending` | Đang gửi | Chưa có trả lời |
| `accepted` | ACK | Máy nhận liệu trình. **Không** có nghĩa máy đang điều trị |
| `executing` | ACK và STA `running` nhận được từ lúc ACK trở đi | Bằng chứng máy đang chạy |
| `rejected` | NAK, `incompatible`, `unidentified`, `invalid` | Máy từ chối hoặc ứng dụng chặn trước khi gửi |
| `failed` | `timeout`, `corrupted`, `disconnected` | Hết lượt chờ, khung lỗi, mất kết nối: báo rõ, không tự gửi lại |

T01 vẫn hiện như cũ ("máy đã nhận", bước 3 "Theo dõi phiên điều trị"); trạng thái chạy thật hiện ở T02 theo STA. Mốc `executing` có ở dịch vụ và kiểm thử, chưa có chữ mới trên T01 (không đổi giao diện).

### 6.3 Thay đổi

| Commit | Nội dung |
|---|---|
| 5d20e88 | `configCommand.ts`; T01 dùng `configCommandView` (giống hệt logic cũ trên 4 224 tổ hợp) và `sendTreatmentConfig`; `useDeviceLink` chỉ cho một lệnh CFG trên dây (`createSingleFlight`), bỏ khi đổi đường truyền |
| 85d9ded | `sendTreatmentConfigOnce`: bấm nạp hai lần liền chỉ gửi một khung và ghi một dòng nhật ký; lỗi ghi nhật ký báo riêng, không đổi kết quả máy trả lời |

### 6.4 Ràng buộc an toàn

| Ràng buộc | Kết quả | Căn cứ |
|---|---|---|
| T01, T02 không tự cài giao thức | Đạt | `architecture.test.cjs` |
| Không tự gửi lại lệnh | Đạt | `configCommand.test.cjs`: mọi kết quả (NAK, hết thời gian, mất kết nối) chỉ gửi một lần |
| Không tự bắt đầu lại sau khi kết nối lại | Đạt | Không có lời gọi `startSession` mới; tb-7 TB7-08, TB7-10 |
| Nút Dừng luôn thấy khi đang điều trị | Đạt | tb-7 TB7-11 (4 khổ); 9C-C-02 (có thông báo lưu trữ ở đầu màn, 3 khổ) |
| Không báo đã dừng trước khi máy xác nhận | Đạt | `stopRequest.test.cjs` |
| Không đổi giao thức, lệnh, tham số | Đạt | Diff không chạm `protocol.config.ts`, `codec*`, `sender.ts`, `planToConfig` |

### 6.5 Chờ xác minh phần cứng

Toàn bộ kiểm thử dùng bộ giả lập. Chưa có máy Plasma Pro, firmware chốt hay điện thoại Android cắm cáp thật. Lệnh dừng gửi xuống máy vẫn không có trong giao thức. **Hardware verification: PENDING.**

### 6.6 Hoàn tác

`git revert 85d9ded 5d20e88`.
