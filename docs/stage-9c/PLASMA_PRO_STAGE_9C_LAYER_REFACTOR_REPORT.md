# Plasma Pro Stage 9C: Báo cáo tách lớp (gói B)

## 1. Thay đổi

| Commit | Tệp | Nội dung |
|---|---|---|
| d96070d | `src/lib/device/treatmentConfig.ts` (mới) | `checkTreatmentConfig(prepared, caps, spec)` trả `{ cfg, missing, errors, wire }`, bọc `validateConfig` và `configToWire` |
| d96070d | `src/app/connect-device.tsx` | Bỏ import trực tiếp `@/lib/device/protocol`; ba dòng tính `cfg`, `errors`, `wire` thay bằng một lời gọi `checkTreatmentConfig` |
| d96070d | `src/lib/device/treatmentConfig.test.cjs` (mới) | So sánh kết quả hàm mới với logic cũ (sao nguyên văn) trên 7 trường hợp: thiếu dữ liệu, hợp lệ, vượt giới hạn, năng lực máy null, không có cấu hình |

## 2. Điều không đổi

- Giá trị gửi xuống máy (`wire`) và danh sách lỗi giống hệt logic cũ trên 7 trường hợp kiểm.
- Không đổi đặc tả giao thức, lệnh firmware, tham số điều trị, lịch điều trị.
- Giao diện T01 không đổi chữ, không đổi bố cục.

## 3. Ranh giới sau thay đổi

Màn T01 chỉ còn dùng: `planToConfig`, `PROTOCOL` (từ `@/lib/device`), nhãn (`labels`), kiểu `SendResult`, hook `useDeviceLink`, và dịch vụ `checkTreatmentConfig`. Lớp giao thức (codec, kiểm khung) chỉ được gọi bên trong `src/lib/device/`.

## 4. Mục để lại

L-03 đến L-09 trong báo cáo rà soát kiến trúc, mục 5, trạng thái DEFERRED.

## 5. Hoàn tác

`git revert d96070d`. Không có thay đổi dữ liệu nên hoàn tác không cần di chuyển dữ liệu.
