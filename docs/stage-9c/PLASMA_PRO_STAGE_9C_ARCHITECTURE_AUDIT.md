# Plasma Pro Stage 9C: Rà soát kiến trúc (gói A)

Ngày: 15/11/2026. Nhánh: `refactor/stage-9c-on-dinh`, tách từ `fix/stage-9b-backlog` (PR 61, head 724439b).

## 1. Phụ thuộc vào các giai đoạn trước

| Giai đoạn | PR | Trạng thái review | Hệ quả cho 9C |
|---|---|---|---|
| Stage 8 hồi quy | 58 | Mở, chưa review | Bộ hồi quy 9C dùng bản sao 5 kịch bản của PR 58 (p0, dot-8, dot-11, tb-5, tb-8) |
| Stage 9A thiết kế lại giao diện | 60 | Mở, chưa review | 9C không xếp chồng lên 9A. Kịch bản hồi quy hình ảnh của 9A nằm ở nhánh PR 60, không chạy ở đây |
| Stage 9B backlog lỗi Stage 8 | 61 | Mở, BLOCKED (S8-B08, S8-B09) | 9C xếp chồng trên 9B (commitQueue, access.ts, simStartGate là nền của 9C). Nếu 9B bị đổi hoặc từ chối, 9C phải rebase |

## 2. Phương pháp

- Đếm import giữa các tầng bằng kịch bản phân tích tĩnh (đọc mọi câu `import ... from` trong `src/`).
- Đọc tay các tệp màn hình có import tầng thiết bị và tầng lưu trữ.
- Tìm truy cập bộ nhớ (`AsyncStorage`), `console.log`, logic nghiệp vụ trong màn hình.

Kết quả là quan sát mã tĩnh, độ tin cậy cao cho số đếm; phân loại "vi phạm" là đánh giá của rà soát, độ tin cậy trung bình.

## 3. Tầng hiện có

| Tầng | Thư mục | Vai trò |
|---|---|---|
| Giao diện | `src/app/**`, `src/components/**` | Màn hình Expo Router, thành phần dùng chung |
| Trạng thái và lưu trữ | `src/lib/store.tsx` | React context, AsyncStorage, kiểm quyền phía ứng dụng, hàng đợi commit |
| Nghiệp vụ (hàm thuần) | `src/lib/*.ts` (course, assessment, attention, areaProgress, access, integrity...) | Không phụ thuộc React, có kiểm thử đơn vị |
| Thiết bị | `src/lib/device/**`, `modules/plasma-usb` | Đặc tả giao thức khai báo, codec, sender, transport (giả lập, USB Android) |
| AI, chụp ảnh | `src/lib/ai/**`, `src/lib/capture/**` | Mô-đun nhận diện tích hợp sẵn, chất lượng ảnh, AR |

## 4. Số đếm import giữa tầng

| Từ | Đến | Số import |
|---|---|---|
| app | lib nghiệp vụ | 119 |
| app | lib/store | 41 |
| app | lib/device | 17 |

- AsyncStorage chỉ xuất hiện trong `store.tsx`. Không màn hình nào đọc ghi bộ nhớ trực tiếp.
- Không có `console.log` trong mã nguồn ngoài kiểm thử.

## 5. Điểm lệch ranh giới

| Mã | Vị trí | Mô tả | Mức | Xử lý 9C |
|---|---|---|---|---|
| L-01 | `src/app/connect-device.tsx` | Màn T01 gọi trực tiếp `validateConfig`, `configToWire` của lớp giao thức | Trung bình | Đã sửa (gói B, `treatmentConfig.ts`) |
| L-02 | `src/app/session-monitor.tsx` | Quyết định "máy đã xác nhận dừng" viết inline trong màn T02, không kiểm thử được | Cao (an toàn) | Đã tách (gói C, `stopRequest.ts`), logic giữ nguyên |
| L-03 | `src/app/device-diagnostics.tsx` | Màn chẩn đoán hex dùng lớp thấp | Thấp | Giữ nguyên: công cụ quản trị, chủ đích thấp tầng |
| L-04 | `src/app/plan/[patientId].tsx`, `CourseCard` | Đọc năng lực máy (capabilities) | Thấp | Để lại (DEFERRED) |
| L-05 | `DeviceStatus`, `UsbLinkStatus`, `theme.status.ts` | Import kiểu và nhãn của tầng thiết bị vào tầng giao diện và theme | Thấp | Để lại (DEFERRED) |
| L-06 | `src/lib/types.ts` | Kiểu miền import kiểu thiết bị | Thấp | Để lại: chỉ kiểu, không có mã chạy |
| L-07 | `src/app/patient/index.tsx` dòng 46 | `courses.find(... 'active')` chọn đợt đầu tiên: quy tắc nghiệp vụ trong màn | Thấp | Để lại: đổi có thể đổi hành vi khi có nhiều đợt active |
| L-08 | `src/lib/store.tsx` `addImage` | Ghi bộ nhớ trực tiếp ngoài hàng đợi commit | Trung bình | Để lại, ghi rủi ro (xem báo cáo toàn vẹn dữ liệu) |
| L-09 | `src/lib/store.tsx` | Tệp lớn gom trạng thái, quyền, lưu trữ, nghiệp vụ ghi | Trung bình | Để lại: tách cần thay đổi kiến trúc, ngoài phạm vi "không viết lại" |

## 6. Kế hoạch tái cấu trúc theo ưu tiên

1. (Đã làm) L-02, L-01.
2. Đưa `addImage` vào hàng đợi commit (L-08). Cần review vì chạm luồng lưu ảnh và lỗi hết dung lượng.
3. Đưa `activeCourse` (L-07) vào `src/lib/course.ts` kèm kiểm thử, sau khi bác sĩ chốt quy tắc khi có nhiều đợt active.
4. Gom nhãn và kiểu thiết bị dùng ở giao diện vào một mô-đun trình bày (L-04, L-05).
5. Tách `store.tsx` theo miền (bệnh nhân, ảnh, đợt điều trị, thiết bị) khi có backend, vì khi đó lớp lưu trữ đổi sang gọi API.
