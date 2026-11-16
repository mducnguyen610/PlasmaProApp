# Plasma Pro: tạo bệnh nhân mới từ ảnh vết thương vừa chụp. Báo cáo triển khai

Ngày: 16/11/2026. Nhánh `feat/benh-nhan-moi-tu-anh`, gốc là PR 64 (`ui/stage-9a-bo-cuc-con-lai`, `64fe6b1`). PR này cần merge sau PR 64.

## 1. Tệp thay đổi

| Tệp | Loại | Nội dung |
|---|---|---|
| `src/lib/pendingCapture.ts` | mới | Kiểu `PendingCapture`, `PendingPatientForm`; `findPhoneDuplicate` (quy tắc trùng của `addPatient`); `duplicateView` (thông tin hiện theo quyền); `validateNewPatientForm`; `committedImageOf` (khóa `captureId`); `isPendingCapture`; `activeFilterCount`. Hàm thuần. |
| `src/lib/pendingCapture.test.ts` | mới | Kiểm thử đơn vị các hàm trên; thêm vào `npm test`. |
| `src/lib/persistence.ts` | sửa | `PENDING_CAPTURE_KEY`, `loadPending`, `savePending`, `clearPending` (cùng hàng ghi với dữ liệu chính). |
| `src/lib/persistence.test.ts` | sửa | Ca 9: ảnh chờ ghi ở khóa riêng, lỗi ghi được báo, JSON hỏng trả null. |
| `src/lib/store.tsx` | sửa | Trạng thái ảnh chờ theo bác sĩ (đọc lúc mở ứng dụng); `holdPendingCapture`, `updatePendingForm`, `discardPendingCapture`, `commitPendingCapture`; `DuplicatePatientError`; `removeImageFile`; `addPatient` dùng `findPhoneDuplicate` (cùng quy tắc, cùng câu báo); `resetDemo` bỏ cả ảnh chờ. |
| `src/app/guided-capture.tsx` | sửa | Tham số `moi=1`: không cần `woundId`; thông báo "Chụp cho bệnh nhân mới" thay thanh bệnh nhân; bước 3 có "Tiếp: tạo hồ sơ bệnh nhân" (giữ ảnh chờ, mở B09b). Phần dựng siêu dữ liệu tách thành `metadataFor` dùng chung, nội dung không đổi. Ảnh đã chuyển sang chờ thì rời màn không hỏi; ảnh chờ được gắn hoặc bỏ thì màn về bước 1. |
| `src/app/capture-new-patient.tsx` | mới | B09b: ảnh chờ, biểu mẫu (trường như B03, vị trí vết bắt buộc), thẻ trùng hồ sơ, Hủy, Để sau, màn kết quả (mã kích hoạt, mở vết thương, nhập lại số đo). Ghi biểu mẫu vào ảnh chờ sau 400 ms không gõ. |
| `src/app/capture.tsx` | sửa | Thanh hai lối vào; thẻ ảnh chờ (Tiếp tục, Bỏ ảnh); lối mới khóa khi đang có ảnh chờ; bộ lọc thu gọn (mặc định mở). |
| `scripts/kiem-thu-benh-nhan-moi-tu-anh.cjs` | mới | 65 ca Playwright trên bản web. |
| `package.json` | sửa | Thêm `pendingCapture.test.ts` vào `npm test`. |

Không đổi: `addImage`, `labelImage`, `addWound`, `updatePatient`, các màn bệnh nhân, quản trị, B02, B03 (giao diện), B05, B11, `src/lib/capture/*`, `src/lib/ai/*`, `src/lib/device/*`, `types.ts`, `integrity.ts`, `writePath.ts`.

## 2. Phân quyền (không chỉ ẩn giao diện)

| Lớp | Kiểm |
|---|---|
| B09, B10 (`moi=1`), B09b | `me.role !== 'doctor'` thì màn "Không có quyền" |
| `holdPendingCapture`, `updatePendingForm`, `discardPendingCapture`, `commitPendingCapture` | `requireDoctorRole`: tài khoản tồn tại, không khóa, vai trò bác sĩ |
| Ảnh chờ | Theo `doctorId`; `pendingCapture` chỉ trả ảnh chờ của chính bác sĩ; vai trò khác nhận null |
| Hồ sơ mới | `doctorId` luôn là bác sĩ đang đăng nhập (không nhận từ màn) |
| Hồ sơ có sẵn | `requireDoctor` như các thao tác lâm sàng (bác sĩ phụ trách, hồ sơ không lưu trữ), kiểm lại trong commit |

Quyền tạo hồ sơ ở B03 (`addPatient`) giữ nguyên.

## 3. Trạng thái theo yêu cầu

### Đã làm và đã kiểm (bản web)

- Lối "Chụp cho bệnh nhân mới" từ B09; chụp (chọn ảnh thư viện trên web), kiểm tra ảnh, nhập số đo trước khi có hồ sơ.
- Ảnh chờ ngoài dữ liệu chính, qua được quay lại, rời màn, tải lại trang (mở lại ứng dụng).
- Biểu mẫu có ảnh; tạo hồ sơ, tài khoản, vết, ảnh trong một lần ghi; mở vết thương.
- Quan hệ patient, wound, image đúng; siêu dữ liệu chụp giữ nguyên; số đo ghi sau bằng `labelImage`.
- Chống bấm lặp (màn, store, `captureId`); lỗi ghi không để lại bản ghi; ghi số đo lỗi có cách nhập lại.
- Trùng số điện thoại: xem hồ sơ trùng theo quyền, gắn vào hồ sơ có sẵn chỉ sau khi chọn vết và xác nhận.
- Phân quyền ở màn và store; bác sĩ khác, bệnh nhân, quản trị không thấy, không dùng được ảnh chờ.
- Bộ lọc thu gọn ở B09, giữ giá trị và kết quả; 320 đến 768 px không tràn.
- tsc, lint, `npm test` sạch.

### Đã làm, chưa kiểm đủ

- Máy thật Android, iOS: chép tệp ảnh chờ và tệp theo `image_id` bằng `expo-file-system`, xóa tệp tạm, tệp chiều sâu AR; chụp bằng camera (web chỉ thử ảnh thư viện); chuyển động reanimated; hộp thoại xác nhận gốc (web dùng `window.confirm`).
- Cảnh báo "Ảnh chỉ giữ trong lần mở ứng dụng này" khi ghi ảnh chờ lỗi: có mã, chưa có ca tự động.
- Trình đọc màn hình trên máy thật.

### Cần duyệt API hoặc lược đồ

- DI-1 khóa lưu ảnh chờ mới (ngoài `AppData`), DI-2 hàm store mới. Xem báo cáo toàn vẹn dữ liệu mục 5. Không đổi lược đồ `AppData`.
- Đề xuất endpoint và ràng buộc cho backend (báo cáo toàn vẹn dữ liệu mục 6): chưa đưa vào tài liệu đề xuất backend, chờ đồng ý.

### Bị chặn bởi kiến trúc hiện có

- Lỗi mạng, tải ảnh lên máy chủ, giao dịch phía máy chủ: chưa có backend (đề tài chỉ đề xuất backend). Đã thay bằng lỗi ghi bộ nhớ máy.
- Ghi nguyên tử cả số đo cùng ảnh: số đo đi qua `labelImage` (lịch sử nhãn, tên tệp theo diện tích); gộp vào một lần ghi cần sửa `labelImage`, chưa làm để không đụng hàm số đo.

### Để sau

- Dọn tệp ảnh chờ mồ côi khi mở ứng dụng.
- Ghi nhật ký ai tạo hồ sơ từ ảnh (chưa có nhật ký thao tác chung).
- Mở thẳng B05 sau khi tạo (UX-1, chờ người dùng chọn chỗ hiện mã kích hoạt).

## 4. Kết luận

Theo mục 12, tính năng đạt các tiêu chí nghiệm thu trên bản web (quan hệ dữ liệu và phục hồi lỗi được kiểm trên dữ liệu thật của store và bộ nhớ trình duyệt, không chỉ giao diện). Chưa ghi COMPLETE vì còn các mục "chưa kiểm đủ" trên máy thật và hai mục cần duyệt (DI-1, DI-2). Trạng thái: **IMPLEMENTED, VERIFIED ON WEB, PENDING DEVICE TEST AND APPROVAL**.
