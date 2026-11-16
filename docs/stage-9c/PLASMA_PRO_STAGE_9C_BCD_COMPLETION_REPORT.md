# Plasma Pro Stage 9C: Báo cáo hoàn tất gói B, C, D

Ngày 16/11/2026. Nhánh `refactor/stage-9c-bcd`, tách từ `refactor/stage-9c-on-dinh` (PR 62, 71c1375). Không merge. Stage 10 chưa bắt đầu.

## 1. Yêu cầu chưa xong (theo báo cáo kiểm định cuối 15/11/2026, đối chiếu lại mã)

| Gói | Mục chưa xong | Bằng chứng trong mã trước khi sửa |
|---|---|---|
| B | Tầng hạ tầng chưa tách: `store.tsx` gọi AsyncStorage trực tiếp ở 6 chỗ | grep `AsyncStorage` |
| B | L-07: quy tắc chọn đợt viết trong `patient/index.tsx` | dòng 46 |
| B | L-08: `addImage` ghi ngoài hàng commit | `store.tsx` dòng 460 |
| B | Chưa có cách kiểm quy tắc phụ thuộc tự động | |
| C | T01 tự tính điều kiện gửi, bước, `noRetry`, `nakBusy` và tự ghi nhật ký sau khi gửi | `connect-device.tsx` dòng 59 đến 92 |
| C | Chưa có mô hình tách "máy nhận" (ACK) với "máy chạy" (STA) | |
| C | Không chặn hai lệnh CFG đồng thời ở tầng dịch vụ (chỉ dựa vào khóa nút) | `useDeviceLink.send` |
| C | Lỗi ghi nhật ký nạp bị bỏ qua (promise không được chờ) | |
| D | D-R3: 21/31 hàm ghi dùng `update()`, lỗi ghi bị nuốt | `.catch(() => {})` ở hiệu ứng ghi nền |
| D | Ghi nền và ghi của commit có thể chạy chồng nhau | Hai đường `setItem` độc lập |
| D | JSON hỏng lúc mở: dữ liệu mẫu ghi đè dữ liệu cũ | `catch {}` khi đọc, rồi hiệu ứng ghi |
| D | Kho không đọc được: cũng ghi đè | như trên |
| D | Chưa chặn gắn chéo lúc ghi (ảnh của đánh giá, vết của đợt và phiên) | `addEvaluation`, `savePlan`, `recordDeviceSession` |
| D | Bộ kiểm toàn vẹn chưa gắn vào ứng dụng; coi bệnh nhân tự đăng ký (chưa phân công) là mồ côi | `integrity.ts` |

Phụ thuộc: D1 (hạ tầng lưu trữ) là nền của B (tầng Infrastructure) và D2, D3; C dùng `recordDeviceLink` nên đi sau D2 (hàm này đổi sang trả Promise).

## 2. Thay đổi đã làm

| Commit | Gói | Nội dung |
|---|---|---|
| b51122c | B, D | `src/lib/persistence.ts`: kho khóa-giá trị, hàng ghi tuần tự, đọc lỗi và JSON hỏng được báo, bản hỏng chép sang khóa sao lưu; kho không đọc được thì không ghi; `PersistBanner` báo lỗi ghi nền kèm "Thử lưu lại" |
| 3b41faf | D | 20 hàm ghi chuyển sang commit (ghi bền rồi mới đổi màn hình, lỗi ném `PersistError`); `addImage` qua hàng commit; mã và giờ bản ghi sinh ngoài hàm commit; 14 nơi gọi chờ kết quả và báo lỗi; màn báo cáo giữ nội dung khi lưu lỗi |
| 4ca3ebb | D | `src/lib/writePath.ts` (đường ghi tách khỏi React); trước mỗi commit chạy `newIntegrityIssues`, lần ghi làm phát sinh lỗi quan hệ mới bị từ chối (`IntegrityError`); kiểm tại chỗ ở `addEvaluation`, `savePlan`, `recordDeviceSession` |
| 5d20e88 | C | `src/lib/device/configCommand.ts`: điều kiện gửi, bước, vòng đời lệnh (sending, accepted, executing, rejected, failed); `sendTreatmentConfig`; `useDeviceLink` một lệnh CFG trên dây |
| 6de5c40 | B | `src/lib/patientHome.ts` (L-07); `src/lib/architecture.test.cjs` kiểm tĩnh quy tắc phụ thuộc |
| 85d9ded | C, D | `sendTreatmentConfigOnce` (bấm nạp hai lần chỉ gửi, ghi một lần); `AccountScreen` báo lỗi lưu đồng ý nghiên cứu; kịch bản `scripts/kiem-thu-9c-bcd.cjs` |

## 3. Tệp thay đổi

Mã mới: `src/lib/persistence.ts`, `src/lib/writePath.ts`, `src/lib/patientHome.ts`, `src/lib/device/configCommand.ts`, `src/components/PersistBanner.tsx`.
Mã sửa: `src/lib/store.tsx`, `src/lib/integrity.ts`, `src/lib/device/useDeviceLink.ts`, `src/app/_layout.tsx`, `src/app/connect-device.tsx`, `src/app/patient/index.tsx`, `src/app/patients/[id].tsx`, `src/app/report.tsx`, `src/app/evaluate/[woundId].tsx`, `src/app/onboarding.tsx`, `src/app/admin/devices.tsx`, `src/app/admin/logs.tsx`, `src/app/admin-log/[id].tsx`, `src/app/admin-account/[id].tsx`, `src/components/AccountScreen.tsx`, `src/components/AdherenceCalendar.tsx`, `src/components/ClosureActions.tsx`, `src/components/DeviceView.tsx`, `package.json`.
Kiểm thử mới: `src/lib/persistence.test.ts`, `src/lib/writePath.test.cjs`, `src/lib/device/configCommand.test.cjs`, `src/lib/patientHome.test.ts`, `src/lib/architecture.test.cjs`, `scripts/kiem-thu-9c-bcd.cjs`.
Kiểm thử cũ: không sửa.

Không chạm: `protocol.config.ts`, `protocol.ts`, `codec*.ts`, `checksum.ts`, `sender.ts`, `simulated.ts`, `usb-android*.ts`, `planToConfig`, `course.ts`, `assessment.ts`, `capture/**`, `ai/**`, `access.ts`, `auth.ts`, `types.ts`, `seed.ts`.

## 4. Kiểm thử đã chạy (16/11/2026)

| Kiểm | Lệnh | Kết quả | Số | Đạt | Lỗi | Bỏ qua |
|---|---|---|---|---|---|---|
| Kiểu | `npx tsc --noEmit -p .` | Đạt | | | 0 | |
| Lint | `npm run lint` | Đạt, 0 cảnh báo | | | 0 | |
| Đơn vị | `npm test` | Đạt | 51 tệp (trước 46) | 51 | 0 | 0 |
| Kiểm tĩnh ranh giới | `node src/lib/architecture.test.cjs` | Đạt | 166 tệp | | 0 vi phạm | |
| Đường ghi | `node src/lib/writePath.test.cjs` | Đạt | 9 trường hợp | 9 | 0 | 0 |
| Hạ tầng lưu trữ | `node src/lib/persistence.test.ts` | Đạt | 8 trường hợp | 8 | 0 | 0 |
| Lệnh nạp | `node src/lib/device/configCommand.test.cjs` | Đạt | 4 224 tổ hợp so logic cũ + vòng đời + một lệnh | | 0 | |
| Giao diện | `node scripts/kiem-thu-giao-dien.cjs` | Đạt | 41 | 41 | 0 | 0 |
| Hồi quy Stage 8 (22 kịch bản) | `scripts/kiem-thu-*.cjs` | Giống 9B | 784 | 782 | 2 | 0 |
| Stage 9B | `scripts/kiem-thu-9b.cjs` | Đạt | 18 | 18 | 0 | 0 |
| Stage 9C hiệu năng | `scripts/do-hieu-nang-9c.cjs` 5 lần | Đạt | 5 | 5 | 0 | 0 |
| Stage 9C toàn vẹn trình duyệt | Playwright + `checkIntegrity` | 0 lỗi | 1 | 1 | 0 | 0 |
| Stage 9C-BCD tích hợp | `scripts/kiem-thu-9c-bcd.cjs` | Đạt | 21 | 21 | 0 | 0 |
| Stage 9A gộp với BCD | 22 kịch bản + giao diện + 9B + 9C-BCD trên bản gộp thử PR 60 + nhánh này | Giống BCD | 784 + 18 + 21 | 782 + 18 + 21 | 2 (tb-8, có sẵn) | 0 |

Bản gộp thử Stage 9A: gộp PR 60 (1322ebf) vào nhánh này trong cây làm việc tạm, xung đột duy nhất ở phần import của `AccountScreen.tsx` (giữ import của 9A, thêm `notify`). Bản gộp không được commit và đã xóa sau khi chạy; giao diện 41/41, 22 kịch bản 782 đạt 2 lỗi (cùng S8-W3-04, S8-B01), 9B 18/18, 9C-BCD 21/21.

Hồi quy Stage 8: p2 có 238 kiểm (9B: 237) vì P21-06 chỉ chạy vào ngày có lịch (16/11 là thứ Hai); không phải thay đổi mã. Hai lỗi tb-8 (S8-W3-04, S8-B01) có sẵn, sửa ở PR 58.

Hiệu năng sau BCD: 1 lần ghi mỗi lần lưu B11, 14 281 byte (dữ liệu mẫu ngày 16/11 nhỏ hơn 15/11 do ngày tính lịch); mở trang chủ bác sĩ 125 ms (trong sai số).

Đối chứng trước khi sửa (bản dựng PR 62, cùng kịch bản 9C-BCD): 9C-D-07 LỖI, bệnh nhân gửi báo cáo khi bộ nhớ ghi lỗi vẫn được báo "Đã ghi nhận" dù báo cáo không được lưu; kịch bản dừng ở bước kế vì nút Gửi bị khóa.

## 5. Giới hạn còn lại

1. Không có phần cứng: toàn bộ kiểm thiết bị dùng giả lập. Lệnh dừng gửi xuống máy vẫn không có trong giao thức. **Hardware verification PENDING.**
2. Mốc "máy đang chạy" (`executing`) có ở dịch vụ, chưa có chữ trên T01; T02 vẫn hiện theo STA như trước.
3. `store.tsx` vẫn gom các hàm ghi theo miền (L-09 giảm, chưa hết).
4. Phiên điều trị không lưu `patientId`; không kiểm lại được phiên cũ khi thiết bị đổi chủ (cần duyệt đổi lược đồ).
5. D-R2 (ảnh web dạng data URL), D-R4 (không có phiên bản lược đồ) chưa đổi.
6. Giữ bản nháp khi lỗi chỉ kiểm ở B11 và N08.
7. Kiểm quyền vẫn chỉ phía ứng dụng; chưa có backend.
8. Chạy trên Chromium máy chạy kịch bản, chưa chạy trên điện thoại thật.
9. Chữ mới trên giao diện (chỉ hiện khi lỗi): thông báo ở đầu màn ("Chưa lưu được...", "Dữ liệu cũ trên máy không đọc được...", "Không đọc được bộ nhớ máy..."), nút "Thử lưu lại", "Đã hiểu", các hộp "Chưa ... được". Cần người dùng duyệt câu chữ theo TC13.

## 6. Cần duyệt

| Mục | Người duyệt |
|---|---|
| PR 58, 60, 61, 62 và PR mới của nhánh này (xếp chồng trên PR 62) | Người dùng |
| Câu chữ thông báo lưu trữ (mục 5.9) | Người dùng |
| Quy tắc chọn đợt khi có nhiều đợt active (L-07) | Bác sĩ |
| Thêm `patientId` vào phiên điều trị (đổi lược đồ) | Người dùng |
| D-R2 cách lưu ảnh trên web | Người dùng |
| S8-B08, S8-B09, lệnh dừng gửi xuống máy | Lâm sàng, phần cứng, firmware |

## 7. Trạng thái cuối

| Gói | Trạng thái | Lý do |
|---|---|---|
| B | **COMPLETE** | Bốn tầng có mã và trách nhiệm rõ; kiểm tĩnh 0 vi phạm; L-01, L-07, L-08 sửa; L-03 đến L-06 đóng theo quy tắc ghi rõ; L-09 giảm và có kế hoạch gắn với backend; luồng bác sĩ, bệnh nhân, quản trị, thiết bị qua hồi quy |
| C | **COMPLETE (phần mềm), xác minh phần cứng PENDING** | Bảy phần tách rõ; T01, T02 không cài giao thức; vòng đời lệnh tách ACK với máy chạy; một lệnh trên dây; hết thời gian, mất kết nối báo rõ; không tự gửi lại; nút Dừng thấy được; giả lập tách khỏi đường truyền thật |
| D | **COMPLETE** | Kiểm ghi đồng thời, ghi lỗi, dữ liệu hỏng, kho không đọc được, gắn chéo, mồ côi đều có kiểm thử đạt; không đổi lược đồ; giới hạn ở mục 5.4 đến 5.6 đã nêu |

Toàn Stage 9C: **PARTIALLY COMPLETE**, vì gói E (bảo mật) chỉ là rà soát và cần backend, và còn chờ xác minh phần cứng.

## 8. Hoàn tác

Từng commit theo thứ tự ngược: `git revert 85d9ded 6de5c40 5d20e88 4ca3ebb 3b41faf b51122c`. Không đổi dữ liệu nên không cần di chuyển dữ liệu.
