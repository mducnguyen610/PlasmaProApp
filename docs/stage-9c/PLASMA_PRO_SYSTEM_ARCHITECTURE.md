# Plasma Pro: Kiến trúc hệ thống

Phiên bản: Stage 9C, 15/11/2026. Phạm vi theo đề tài: ứng dụng điện thoại được thiết kế và lập trình; backend và cơ sở dữ liệu chỉ đề xuất; AI là mô-đun tích hợp sẵn; phần cứng và firmware từ đồ án phần cứng.

## 1. Tổng quan

```
┌───────────────────────── Điện thoại (Expo SDK 58, React Native 0.88) ─────────────────────────┐
│  Giao diện: src/app (Expo Router), src/components, src/theme                                  │
│     │ hook useStore()                     │ hook useDeviceLink()                              │
│  Trạng thái + lưu trữ: src/lib/store.tsx   Dịch vụ thiết bị: src/lib/device/{treatmentConfig,  │
│     │ (context, commitQueue, kiểm quyền)       stopRequest, session-tracker, labels}           │
│  Nghiệp vụ thuần: src/lib/*.ts             Giao thức: protocol, codec, checksum, sender        │
│     │                                       Transport: simulated | usb-android (plasma-usb)   │
│  AsyncStorage (khóa plasmapro.demo.v2)       │                                                 │
│  AI, chụp ảnh: src/lib/ai, src/lib/capture   │ USB OTG / UART                                  │
└──────────────────────────────────────────────┼─────────────────────────────────────────────────┘
                                               ▼
                                   Máy Plasma Pro (firmware, chưa chốt)
Backend, cơ sở dữ liệu: chưa có (KT1: dữ liệu một máy, chỉ đề xuất kiến trúc).
```

## 2. Tầng và trách nhiệm

| Tầng | Được làm | Không được làm |
|---|---|---|
| Giao diện | Hiển thị, nhận thao tác, gọi hook store và dịch vụ thiết bị | Đọc ghi AsyncStorage; gọi codec, checksum, `validateConfig`, `configToWire`; tính quy tắc lâm sàng inline |
| Trạng thái và lưu trữ | Giữ dữ liệu, ghi bền qua `commitQueue`, kiểm quyền phía ứng dụng, phát lỗi `PersistError`, `TermsRequiredError` | Import React component màn hình |
| Nghiệp vụ thuần | Hàm không phụ thuộc React, có kiểm thử đơn vị | Truy cập bộ nhớ, mạng, thiết bị |
| Dịch vụ thiết bị | Chuyển liệu trình thành cấu hình, kiểm cấu hình, diễn giải trạng thái và xác nhận dừng | Tự gửi lại lệnh khi NAK; báo đã dừng khi chưa có xác nhận |
| Giao thức và transport | Mã hóa, giải mã khung theo đặc tả khai báo, gửi chờ ACK, ghi vết | Biết về bệnh nhân, vết thương, giao diện |

## 3. Ranh giới mô-đun và quy tắc phụ thuộc

1. Phụ thuộc chỉ đi xuống: giao diện → store và dịch vụ → nghiệp vụ thuần, giao thức → transport.
2. `src/lib/**` không import `src/app/**`.
3. Chỉ `store.tsx` dùng AsyncStorage (kiểm 9C: đúng).
4. Màn hình chỉ dùng `@/lib/device` qua `index.ts`, `labels`, `capabilities`, dịch vụ thiết bị và `useDeviceLink`. Ngoại lệ có chủ đích: `device-diagnostics.tsx` (công cụ quản trị).
5. Kiểu (type-only import) được phép đi ngang tầng.
6. Các điểm lệch còn lại liệt kê ở báo cáo rà soát kiến trúc 9C, mục 5.

## 4. Luồng dữ liệu

- **Ghi**: màn hình gọi hàm store (ví dụ `labelImage`) → `commit(fn)` xếp hàng → tính dữ liệu mới, kiểm quyền → ghi AsyncStorage → thành công thì cập nhật trạng thái React; lỗi ghi ném `PersistError`, trạng thái giữ nguyên. Từ 9C, hiệu ứng nền không ghi lại bản vừa commit.
- **Đọc**: khởi động đọc khóa dữ liệu và khóa phiên, bổ sung trường mặc định, rồi dùng chung qua context.
- **Liệu trình đến máy**: bác sĩ lập liệu trình (B07) → bệnh nhân mở T01 → `planToConfig` → `checkTreatmentConfig` (kiểm giới hạn theo năng lực máy) → `sender` gửi CFG, chờ ACK/NAK → T02 theo dõi trạng thái.
- **Ảnh**: chụp → kiểm chất lượng (`capture`) → `addImage` lưu tệp (native) hoặc data URL (web) → bác sĩ đo, ghi diện tích ở B11. Giá trị AR ở B10 chỉ để tham khảo, không tự điền, không tự lưu.

## 5. Kiến trúc giao tiếp thiết bị

- Đặc tả khai báo `protocol.config.ts`: khung, checksum, bản tin, trường. Khi firmware chốt chỉ sửa dữ liệu, không sửa mã.
- Hai kiểu khung cắm thay: văn bản `$TOKEN,...*hh\r\n` và nhị phân `AA 55 code len payload CRC16`.
- Hỏi máy `INF` (phiên bản) và `CAP` (năng lực); không trả lời thì kết quả `unidentified`, dùng bảng dự phòng.
- `SendResult`: `acked`, `nacked`, `timeout`, `corrupted`, `disconnected`, `incompatible`, `unidentified`, `invalid`.
- Transport giả lập cho demo; transport USB Android qua mô-đun native `modules/plasma-usb`. iOS chưa có transport.
- Mọi giá trị giao thức là giả định (`confirmed: false`) chờ nhóm firmware trả lời ICD.

## 6. Ranh giới backend, AI, bảo mật

| Thành phần | Hiện trạng | Ranh giới |
|---|---|---|
| Backend | Chưa có | Tầng store là điểm thay thế: khi có backend, `commit` gọi API thay vì AsyncStorage |
| Cơ sở dữ liệu | Chưa có | Mô hình dữ liệu ở `src/lib/types.ts` là đề xuất |
| AI | Mô-đun nhận diện tích hợp, kết quả chỉ để tham khảo | Không đổi ở 9C; không có xác nhận lâm sàng |
| Bảo mật | Kiểm quyền phía ứng dụng | Không phải bảo mật thật; xem rà soát bảo mật 9C |

## 7. Xử lý lỗi

| Lỗi | Nguồn | Cách xử lý |
|---|---|---|
| `PersistError` | Ghi AsyncStorage thất bại trong commit | Trạng thái không đổi, màn hình báo lưu không được |
| `TermsRequiredError` | Chưa đồng ý điều khoản | Chuyển sang màn điều khoản |
| Lỗi quyền (`requireDoctor`, `requireAdmin`) | Sai vai trò | Ném lỗi, thao tác không chạy |
| `nacked` + mã NAK | Máy từ chối | Gợi ý theo `NAK_HINT`; người dùng tự bấm gửi lại (ICD mục 7) |
| `timeout`, `corrupted` | Hết lượt gửi lại | Báo người dùng kiểm cáp |
| `disconnected` | Mất kết nối | Báo mất kết nối, không tự gửi lại |
| `incompatible`, `unidentified` | Phiên bản giao thức | Chặn gửi hoặc dùng bảng dự phòng |
| Dừng chưa xác nhận | Chưa có bản tin kết thúc sau lúc bấm | Hiện thời gian chờ, không báo đã dừng |

## 8. Chiến lược kiểm thử

| Mức | Công cụ | Lệnh |
|---|---|---|
| Kiểu | TypeScript | `npx tsc --noEmit` |
| Quy ước mã | ESLint (expo lint) | `npm run lint` |
| Đơn vị | Node (type stripping hoặc transpile `.cjs`) | `npm test` (46 tệp) |
| Hồi quy giao diện | Playwright trên bản web tĩnh | `scripts/kiem-thu-*.cjs <baseURL> <thư mục>` |
| Hiệu năng | Playwright | `scripts/do-hieu-nang-9c.cjs` |
| Phần cứng | Chưa có | Chờ thiết bị và firmware; giả lập không thay xác minh phần cứng |
