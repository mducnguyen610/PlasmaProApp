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
