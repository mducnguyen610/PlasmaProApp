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

## 6. Hoàn tất gói B (16/11/2026, nhánh `refactor/stage-9c-bcd`)

### 6.1 Trách nhiệm từng tầng (theo mã sau khi sửa)

| Tầng | Mã | Trách nhiệm | Không được làm |
|---|---|---|---|
| Presentation | `src/app/**`, `src/components/**` | Hiển thị, nhận thao tác, chờ kết quả hàm store và báo lỗi | Gọi AsyncStorage; gọi tầng giao thức, đường truyền; tự tính quy tắc nghiệp vụ |
| Application | `src/lib/store.tsx` (hàm ghi, kiểm quyền), `src/lib/writePath.ts` (đường ghi), dịch vụ thiết bị (`configCommand`, `treatmentConfig`, `stopRequest`, `useDeviceLink`) | Điều phối luồng: kiểm quyền, tính bản mới, kiểm quan hệ, ghi bền, rồi mới đổi màn hình | Biết khóa lưu, định dạng khung |
| Domain | `src/lib/*.ts` thuần (`course`, `patientHome`, `access`, `integrity`, `areaProgress`...), `types.ts` | Quy tắc, kiểu dữ liệu, hàm thuần có kiểm thử | Phụ thuộc giao diện hay hạ tầng |
| Infrastructure | `src/lib/persistence.ts` | Kho khóa-giá trị, khóa lưu, hàng ghi tuần tự, đọc và sao lưu khi hỏng | Phụ thuộc tầng nghiệp vụ |
| Device Communication | `src/lib/device/**`, `modules/plasma-usb` | Xem báo cáo kiến trúc thiết bị | Phụ thuộc store |

### 6.2 Thay đổi

| Commit | Nội dung |
|---|---|
| b51122c | `persistence.ts` (Infrastructure): `store.tsx` không gọi AsyncStorage trực tiếp nữa; interface `KeyValueStore` cho kiểm thử |
| 4ca3ebb | `writePath.ts`: đường ghi của store tách khỏi React (Application) |
| 6de5c40 | `patientHome.ts` (L-07): quy tắc chọn đợt, vết ở trang chủ bệnh nhân ra tầng nghiệp vụ, hành vi giữ nguyên; `architecture.test.cjs` kiểm tĩnh quy tắc phụ thuộc |

### 6.3 Kiểm tĩnh quy tắc phụ thuộc (`src/lib/architecture.test.cjs`, 166 tệp, đạt)

Đọc câu import thật (bỏ `import type`) và báo vi phạm khi:
1. AsyncStorage dùng ngoài `store.tsx`, `persistence.ts`.
2. Giao diện gọi `protocol`, `codec*`, `checksum`, `bytes`, `wire`, `spec`, `spec-check`, `sender`, `transport`, `simulated`, `usb-android*`, `trace` (trừ `device-diagnostics.tsx`, công cụ quản trị có chủ đích).
3. `src/lib/**` import `src/app/**` hoặc `src/components/**`.
4. `src/lib/device/**` import store.
5. `persistence.ts` import tầng nghiệp vụ.
6. Lõi giao thức và đường truyền import React (`usb-android.ts` là bộ chuyển đổi native, được dùng `Platform`).
7. Đường truyền thật import bộ giả lập.

Đã thử tắt ngoại lệ của màn chẩn đoán: kiểm thử báo đúng vi phạm, nên kiểm thử có tác dụng.

### 6.4 Điểm lệch sau hoàn tất

| Mã | Trạng thái | Ghi chú |
|---|---|---|
| L-01 | Đã sửa (d96070d) | |
| L-03 | Giữ, có chủ đích | Màn chẩn đoán hex của quản trị viên |
| L-04 | Đóng theo quy tắc | `capabilities.ts` là bảng giới hạn thuần của mẫu máy; giao diện đọc để hiện giới hạn, không gửi lệnh |
| L-05, L-06 | Đóng theo quy tắc | Chỉ `import type` và chuỗi nhãn, không có mã truyền thông |
| L-07 | Đã sửa (6de5c40) | Quy tắc "đợt active đầu tiên" chờ bác sĩ chốt khi có nhiều đợt, chưa đổi |
| L-08 | Đã sửa (3b41faf) | `addImage` ghi qua hàng commit |
| L-09 | Giảm, chưa hết | Hạ tầng và đường ghi đã tách; `store.tsx` vẫn gom các hàm ghi theo miền (khoảng 900 dòng). Tách tiếp theo miền nên làm khi có backend, vì khi đó hàm ghi đổi thành gọi API |

Không còn vi phạm phụ thuộc mức nghiêm trọng theo kiểm tĩnh.

### 6.5 Hoàn tác

`git revert 6de5c40 4ca3ebb b51122c` (theo thứ tự này; 4ca3ebb và b51122c phụ thuộc nhau qua `store.tsx`).
