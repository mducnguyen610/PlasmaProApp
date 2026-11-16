# Plasma Pro: tạo bệnh nhân mới từ ảnh vết thương vừa chụp. Báo cáo khảo sát (audit)

Ngày: 16/11/2026. Nhánh: `feat/benh-nhan-moi-tu-anh`, tách từ `ui/stage-9a-bo-cuc-con-lai` (PR 64, commit `64fe6b1`), vì PR 64 vừa làm lại bố cục B09 (`src/app/capture.tsx`) và chưa merge.
Phạm vi: khảo sát trước khi lập trình theo mục 9 của yêu cầu. Mọi kết luận dưới đây lấy từ mã nguồn của nhánh gốc; tên tệp và hàm ghi kèm để đối chiếu.

## 1. Màn hiện có

| Màn | Tệp | Hành vi liên quan |
|---|---|---|
| B09 Chụp ảnh vết thương (lối vào) | `src/app/capture.tsx` | Chỉ bác sĩ. Bước 1 chọn bệnh nhân (hồ sơ đang theo dõi của bác sĩ, không chọn sẵn khi có từ 2 hồ sơ), bước 2 chọn vết thương (bỏ vết `closed`, không chọn sẵn khi có từ 2 vết), nút "Chụp có hướng dẫn" mở B10 với `woundId`. |
| B10 Chụp có hướng dẫn | `src/app/guided-capture.tsx` | Bắt buộc có `woundId`; không có thì màn "Không tìm thấy". Ba bước: chụp, kiểm tra ảnh, nhập số đo. Ảnh chỉ nằm trong state của màn; bấm lưu thì `addImage` (chép tệp, ghi dữ liệu) rồi `labelImage` (số đo). Ghi số đo lỗi thì mở B11 với `nhapLai` để nhập lại (P0 SV-02). Rời màn khi có ảnh chưa lưu thì hỏi (`useDiscardGuard`). |
| B11 Chi tiết ảnh | `src/app/images/[id].tsx` | Nhận `nhapLai`, `phuongPhap`, `loi` để điền lại số đo khi B10 lưu ảnh xong mà số đo chưa lưu. |
| B03 Thêm bệnh nhân | `src/app/patients/new.tsx` | Họ tên, năm sinh (1900 đến năm nay), giới, số điện thoại (không kiểm định dạng), vị trí vết đầu tiên (không bắt buộc), đồng ý nghiên cứu. Gọi `addPatient`, xong thì hiện mã kích hoạt (chỉ hiện một lần) rồi "Mở hồ sơ". |
| B05 Chi tiết vết thương | `src/app/wounds/[id].tsx` | Đích cuối của luồng mới. |

## 2. Tầng dữ liệu

- Toàn bộ dữ liệu nằm trên máy (AsyncStorage, khóa `plasmapro.demo.v2`), một đối tượng `AppData`. Chưa có backend; API và cơ sở dữ liệu mới là đề xuất (`/mnt/project-files/datn/de-xuat-backend.md`, `de-xuat-co-so-du-lieu.md`).
- Đường ghi (`src/lib/writePath.ts`, Stage 9C): mọi `commit` xếp hàng, tính trên bản mới nhất, kiểm quan hệ (`src/lib/integrity.ts`: mồ côi, gắn chéo bệnh nhân, trùng mã), ghi bền rồi mới đổi màn hình. Một `commit` là một lần ghi nguyên tử của toàn bộ `AppData`.
- `addPatient(p, woundLocation?)`: một commit gồm hồ sơ, tài khoản bệnh nhân (mã kích hoạt), vết VT01 nếu có vị trí. Kiểm trùng duy nhất: cùng số điện thoại sau khi bỏ khoảng trắng; trùng thì ném lỗi chữ, không có cách xem hay chọn hồ sơ trùng.
- `addWound`, `addImage`, `labelImage`: mỗi hàm một commit riêng. Không có hàm nào ghi ảnh cùng hồ sơ hay vết mới trong một lần.
- `addImage` chép tệp ảnh (và tệp chiều sâu AR) sang `Documents/wound-images/<image_id>.<ext>` trước, rồi commit. Commit lỗi thì tệp đã chép còn lại (tệp mồ côi, không có bản ghi trỏ tới). Trên web ảnh là data URL nằm trong dữ liệu nên không có tệp riêng.

## 3. Định danh và quan hệ

| Định danh trong yêu cầu | Trong mã |
|---|---|
| patient_id | `Patient.id` (`p-<thời điểm>`), mã hiển thị `Patient.code` (BNxxx) |
| wound_id | `Wound.id` (`w-<thời điểm>`), `Wound.patientId`, mã VTxx trong hồ sơ |
| image_id | `WoundImage.id` (IMGxxxx), `WoundImage.woundId`, `WoundImage.patientId` |
| record_id | Không phải trường lưu: cặp (loại, id) dựng ở `src/lib/woundHistory.ts` từ id của ảnh, đánh giá, đợt, phiên |
| measurement_id | Không có thực thể số đo riêng: số đo bác sĩ nằm trên ảnh (`areaCm2`, `measureMethod`, `capture.manualReference`, `history`) |

## 4. Điều hướng và giữ trạng thái

- Expo Router, một Stack gốc (`src/app/_layout.tsx`). Màn được đẩy chồng nên quay lại B10 từ màn sau vẫn giữ state của B10.
- Không có cơ chế lưu nháp bền cho biểu mẫu hay ảnh chưa lưu. Ảnh camera trên máy thật nằm ở thư mục tạm của camera; đóng ứng dụng là mất.
- Không có kho tùy chọn giao diện bền (không có chỗ lưu trạng thái mở, đóng bộ lọc), nên mục 13.3 chỉ giữ trạng thái trong phiên màn.
- Quy tắc kiến trúc (`src/lib/architecture.test.cjs`): chỉ `store.tsx` và `persistence.ts` được dùng AsyncStorage.

## 5. Phân quyền

- Màn: `useCanView` và `NoAccess` (`src/components/Guard.tsx`); B09, B10 kiểm `me.role === 'doctor'`.
- Store: `requireDoctor(patientId)` dùng `canManagePatient` (bác sĩ phụ trách, tài khoản không khóa) và chặn ghi trên hồ sơ đã lưu trữ; `addPatient` kiểm vai trò bác sĩ và `doctorId` là chính bác sĩ.

## 6. Bộ lọc ở B09

B09 chỉ có một điều khiển lọc: ô "Tìm bệnh nhân" (tên hoặc mã, bỏ dấu), chỉ hiện khi bác sĩ có từ 2 hồ sơ. Không có lọc theo mức độ, trạng thái hôm nay hay phân trang, sắp xếp (các bộ lọc đó ở B02, `src/app/doctor/patients.tsx`). Vì vậy các mục 13.2, 13.4 về "nhiều bộ lọc cùng lúc", phân trang, sắp xếp không có đối tượng ở B09. Không thêm bộ lọc mới vì yêu cầu cấm đổi logic lọc.

## 7. Kết luận về trạng thái chờ và ghi nguyên tử

| Câu hỏi của mục 9 | Kết luận |
|---|---|
| Có trạng thái ảnh tạm, chờ gắn hồ sơ an toàn không? | Không. Ảnh chưa lưu chỉ ở state của B10; không bền, không qua được việc rời màn hay đóng ứng dụng. |
| Có ghi nguyên tử hồ sơ, vết, ảnh không? | Có sẵn cơ chế (một `commit` ghi cả `AppData`, có kiểm quan hệ) nhưng không có hàm nào dùng nó cho ảnh cùng hồ sơ mới. Gọi lần lượt `addPatient` rồi `addImage` sẽ để lại hồ sơ không có ảnh nếu bước sau lỗi. |
| Có cần đổi API hoặc lược đồ dữ liệu không? | Không cần đổi cấu trúc `AppData` hay hàm cũ. Cần thêm: (1) một khóa lưu riêng cho ảnh chờ, (2) một hàm store mới ghi cả nhóm trong một commit. Cả hai là thay đổi cục bộ trên máy, không phải hợp đồng API máy chủ. Chi tiết và đề xuất cho backend sau này ở báo cáo toàn vẹn dữ liệu. |

## 8. Thay đổi cần làm (đã làm ở nhánh này)

1. `src/lib/pendingCapture.ts` (mới, hàm thuần): kiểu `PendingCapture`, so trùng theo số điện thoại (đúng quy tắc của `addPatient`), kiểm biểu mẫu, khóa chống ghi lặp theo `captureId`, đếm bộ lọc.
2. `src/lib/persistence.ts`: khóa `plasmapro.anh-cho-ho-so.v1` và ba hàm đọc, ghi, xóa ảnh chờ.
3. `src/lib/store.tsx`: `pendingCapture`, `holdPendingCapture`, `updatePendingForm`, `discardPendingCapture`, `commitPendingCapture`; lớp lỗi `DuplicatePatientError` (cùng câu báo cũ); `addPatient` dùng chung hàm so trùng.
4. `src/app/guided-capture.tsx`: chế độ `moi=1`; bước 3 có "Tiếp: tạo hồ sơ bệnh nhân" thay cho nút lưu; chụp, kiểm ảnh, nhập số đo giữ nguyên.
5. `src/app/capture-new-patient.tsx` (mới, B09b): biểu mẫu tạo hồ sơ có ảnh chờ, xử lý trùng hồ sơ, màn kết quả.
6. `src/app/capture.tsx`: hai lối vào, thẻ ảnh chờ, bộ lọc thu gọn.

Không đụng: đánh giá lâm sàng, AI, đo diện tích, phác đồ, thuật toán chụp và xử lý ảnh, USB/UART, cấu trúc `AppData`.
