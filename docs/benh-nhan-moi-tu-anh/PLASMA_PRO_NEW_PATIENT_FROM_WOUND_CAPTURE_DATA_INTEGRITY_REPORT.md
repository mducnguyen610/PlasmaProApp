# Plasma Pro: tạo bệnh nhân mới từ ảnh vết thương vừa chụp. Báo cáo toàn vẹn dữ liệu

Ngày: 16/11/2026. Áp dụng cho dữ liệu cục bộ trên một máy (demo một máy, chưa có backend).

## 1. Trạng thái của ảnh

| Trạng thái | Ở đâu | Có quan hệ không |
|---|---|---|
| Chưa chụp | | |
| Ảnh trong B10 (chưa chuyển) | state của màn B10 | Không. Như luồng cũ: rời màn thì hỏi. |
| **Ảnh chờ** (`PendingCapture`) | Khóa riêng `plasmapro.anh-cho-ho-so.v1`, ngoài `AppData`; tệp sao chép `Documents/wound-images/cho-<id>.<ext>` (máy thật) hoặc data URL (web) | Không. Không có `image_id`, `patient_id`, `wound_id`; không xuất hiện trong danh sách, lịch sử, xuất dữ liệu hay bộ dữ liệu nghiên cứu vì không nằm trong `AppData`. Gắn với tài khoản bác sĩ đã chụp (`doctorId`). |
| Ảnh đã gắn (`WoundImage`) | `AppData.images`, tệp `wound-images/<image_id>.<ext>` | Có: `woundId`, `patientId`, được kiểm quan hệ trước khi ghi. |

Ảnh chờ giữ: tệp ảnh, kích thước, `captureDate`, `sourceDateKnown`, toàn bộ `CaptureMetadata` dựng như B10 dựng khi lưu (`captureId`, `capturedAt`, `recordedAt`, chất lượng, khoanh vùng, kiểm tra trực quan, khoảng cách và ước lượng AR nếu có, tệp chiều sâu AR), số đo đang nhập (văn bản và phương pháp, chưa ghi), thông tin biểu mẫu.

## 2. Ghi nguyên tử

`commitPendingCapture(target)` (`src/lib/store.tsx`):

1. Kiểm vai trò bác sĩ (tài khoản không khóa) và có ảnh chờ của chính bác sĩ.
2. Nếu dữ liệu đã có ảnh mang cùng `captureId` (lần trước ghi xong mà chưa kịp xóa ảnh chờ): không ghi gì. Kiểm liên kết bằng `verifyLinked` (vết tồn tại, vết cùng hồ sơ với ảnh, hồ sơ tồn tại). Đúng thì trả lại hồ sơ, vết, ảnh đã có rồi xóa ảnh chờ; sai thì báo lỗi, giữ ảnh chờ, không ghi thêm.
3. Hồ sơ mới: kiểm biểu mẫu, so trùng số điện thoại (ném `DuplicatePatientError`), cấp mã hồ sơ, tài khoản và mã kích hoạt như `addPatient`, vết VT01 như `addPatient`. Hồ sơ có sẵn (sau xác nhận): `requireDoctor` (bác sĩ phụ trách, không lưu trữ), vết phải thuộc hồ sơ và chưa kết thúc theo dõi, hoặc vết mới theo vị trí bác sĩ nhập.
4. Chép tệp ảnh chờ (và tệp chiều sâu) sang tên theo `image_id`, như `addImage`.
5. **Một `commit`**: thêm hồ sơ, tài khoản, vết, ảnh và tăng bộ đếm trong cùng một bản `AppData`. Trong hàm commit kiểm lại trùng số điện thoại, quyền, vết còn hợp lệ, mã ảnh và mã hồ sơ chưa dùng, `captureId` chưa có. Đường ghi Stage 9C kiểm quan hệ (mồ côi, gắn chéo, trùng mã) rồi ghi bền, chỉ khi ghi xong mới đổi màn hình.
6. Sau commit: `verifyLinked` trên dữ liệu vừa ghi, so đúng `patientId`, `woundId` mong đợi. **Chỉ khi xác nhận được mới xóa ảnh chờ và tệp tạm** (yêu cầu người dùng 16/11/2026). Chưa xác nhận được: báo lỗi, giữ ảnh chờ; lần bấm lại đi theo bước 2, không tạo bản thứ hai. Sau đó màn mở thẳng B05. Lỗi ở bất kỳ bước nào: không có bản ghi nào được thêm; tệp vừa chép ở bước 4 bị xóa; ảnh chờ và thông tin biểu mẫu giữ nguyên.

Số đo (diện tích, phương pháp) **không** nằm trong lần ghi trên: sau khi ảnh có `image_id`, màn gọi `labelImage` như B10. Đây là cách B10 vẫn làm (ảnh trước, số đo sau) và giữ nguyên hàm ghi số đo, lịch sử nhãn. Ghi số đo lỗi: hồ sơ, vết, ảnh đã đúng và đủ; ảnh chưa có số đo; màn mở B11 của ảnh, nói rõ số đo chưa lưu, điền sẵn số đo để lưu lại (không tạo ảnh thứ hai).

## 3. Đối chiếu với mục 4 của yêu cầu

| Yêu cầu | Kết quả | Bằng chứng |
|---|---|---|
| Ảnh ở trạng thái tạm cho tới khi có hồ sơ và vết hợp lệ | Có (ảnh chờ ngoài `AppData`) | NP-06 |
| Hồ sơ chỉ tạo một lần | Có: khóa nút, khóa store, khóa `captureId`, kiểm trùng trong commit | NP-26, NP-27, NP-30, NP-33 |
| Vết thuộc hồ sơ mới | Có | NP-09 |
| Ảnh thuộc đúng vết và hồ sơ | Có | NP-09, NP-38 |
| Giữ siêu dữ liệu và thời điểm chụp | Có: `captureId`, `captureDate`, `capturedAt`, nguồn ảnh, khoanh vùng giống ảnh chờ | NP-10 |
| Không gắn vào vết không liên quan | Có: hồ sơ mới luôn có vết mới; hồ sơ có sẵn chỉ khi bác sĩ chọn vết của chính hồ sơ đó và xác nhận | NP-36 đến NP-38, NP-43 |
| Không bịa thông tin | Không tạo đánh giá, đợt điều trị, thiết bị, số đo; ước lượng AR giữ nguyên trạng thái lúc chụp; họ tên, năm sinh, vị trí do bác sĩ nhập | NP-07, NP-12 |
| patient_id, wound_id, image_id, record_id, measurement_id | Giữ nguyên cách đặt và quan hệ hiện có; record_id và số đo vẫn suy ra từ ảnh như trước | Báo cáo audit mục 3 |

## 4. Lỗi một phần và cách phục hồi

| Tình huống (mục 8) | Trong kiến trúc này | Hành vi | Ca |
|---|---|---|---|
| 2. Tạo hồ sơ lỗi sau khi chụp | Kiểm biểu mẫu lỗi, hoặc lỗi ghi | Không ghi gì; ảnh và thông tin giữ; báo lỗi; bấm lưu lại được | NP-07, NP-28 đến NP-30 |
| 6. Lỗi mạng hoặc bộ nhớ khi tạo hồ sơ | Không có mạng (dữ liệu cục bộ); thử bằng lỗi ghi bộ nhớ máy (QuotaExceeded) | Như trên; không có hồ sơ, vết, ảnh nào trong store lẫn bộ nhớ máy | NP-28 |
| 7. Vết tạo xong nhưng gắn ảnh lỗi | Không xảy ra được: vết và ảnh ghi trong cùng một commit. Phần ghi tách riêng duy nhất là số đo | Ghi số đo lỗi: báo "Số đo chưa lưu", mở B11 nhập lại; không ảnh trùng | NP-31, NP-32 |
| 8. Tải ảnh lên xong nhưng tạo hồ sơ lỗi | Tương ứng: tệp ảnh đã chép (ảnh chờ, và tệp theo `image_id` ở bước 4) rồi commit lỗi | Tệp theo `image_id` bị xóa; tệp ảnh chờ giữ để thử lại; không có bản ghi mồ côi | NP-28, NP-29 (web); máy thật chưa thử |
| 10. Thoát giữa chừng rồi mở lại | Ảnh chờ và biểu mẫu được ghi bền | B09 hiện thẻ ảnh chờ có họ tên đã nhập; "Tiếp tục tạo hồ sơ" khôi phục biểu mẫu | NP-22, NP-23 |
| Ghi xong nhưng ứng dụng tắt trước khi xóa ảnh chờ | Ảnh chờ còn sót | Nhận ra theo `captureId`, kiểm liên kết, không tạo lần hai | NP-33 |
| Ảnh đã có theo `captureId` nhưng liên kết sai (vết không tồn tại) | Dữ liệu bị sửa ngoài ứng dụng hoặc ghi dở | Báo lỗi, giữ ảnh chờ, không ghi thêm; sửa xong bấm lại thì nhận ảnh đã có và xóa ảnh chờ | NP-33b, NP-33c |
| Ghi ảnh chờ vào bộ nhớ máy lỗi | Ảnh chờ chỉ ở bộ nhớ của phiên | Biểu mẫu hiện cảnh báo "Ảnh chỉ giữ trong lần mở ứng dụng này" | Chưa có ca tự động |

## 5. Đã duyệt (người dùng, 16/11/2026)

Người dùng đồng ý DI-1 và DI-2, kèm điều kiện chỉ xóa ảnh chờ sau khi xác nhận liên kết (đã làm, mục 2 bước 2 và 6).

- **DI-1. Khóa lưu mới `plasmapro.anh-cho-ho-so.v1`** (bảng ảnh chờ theo tài khoản bác sĩ). Ngoài `AppData`, không đổi cấu trúc dữ liệu chính, nhưng là một chỗ lưu mới trên máy. Yêu cầu nói "đề xuất trước khi đổi API hoặc lược đồ"; thay đổi này không chạm lược đồ `AppData`.
- **DI-2. Hàm store mới `commitPendingCapture`** (và ba hàm ảnh chờ). Thêm vào giao diện store, không đổi hàm cũ. `addPatient` đổi lớp lỗi trùng sang `DuplicatePatientError` (kế thừa `Error`, cùng câu báo), B03 hiển thị không đổi.

## 6. Đề xuất cho backend (chưa làm, phạm vi đề xuất)

Khi có máy chủ, cùng tính chất trên cần được bảo đảm ở máy chủ, không chỉ trên máy:

- Tải ảnh lên vùng chờ: `POST /uploads` trả `upload_id` (hết hạn sau một thời gian, gắn với bác sĩ tải lên), chưa có `image_id` lâm sàng.
- Tạo trong một giao dịch: `POST /patients/with-capture` nhận thông tin hồ sơ, vị trí vết, `upload_id`, `capture_id` và khóa chống lặp (`Idempotency-Key` = `capture_id`); trong một giao dịch cơ sở dữ liệu tạo `patients`, `accounts`, `wounds`, `images`, chuyển tệp từ vùng chờ. Trùng số điện thoại trả 409 kèm thông tin hồ sơ theo quyền xem.
- Gắn vào hồ sơ có sẵn: `POST /wounds/{wound_id}/images` với `upload_id`, kiểm bác sĩ phụ trách.
- Dọn vùng chờ hết hạn bằng tác vụ định kỳ.
- Ràng buộc: khóa ngoại `images.wound_id`, kiểm `images.patient_id = wounds.patient_id`, chỉ mục duy nhất trên `images.capture_id`.

Các điểm này nên được thêm vào `de-xuat-backend.md` và `de-xuat-co-so-du-lieu.md` khi người dùng đồng ý.

## 7. Hạn chế

- Tệp mồ côi: nếu xóa tệp tạm lỗi (sau khi đã ghi thành công), tệp `cho-<id>` còn lại trong thư mục ứng dụng, không có bản ghi trỏ tới và không lộ ra giao diện. Chưa có bước dọn tệp mồ côi khi mở ứng dụng (DEFERRED).
- Máy demo dùng chung: ảnh chờ của bác sĩ A không hiện với bác sĩ B, bệnh nhân hay quản trị, nhưng vẫn nằm trong bộ nhớ của máy (như mọi dữ liệu cục bộ khác).
- Trên web, ảnh chờ là data URL trong localStorage; ảnh lớn có thể vượt hạn mức, khi đó ảnh chờ chỉ giữ trong phiên và màn báo rõ.
