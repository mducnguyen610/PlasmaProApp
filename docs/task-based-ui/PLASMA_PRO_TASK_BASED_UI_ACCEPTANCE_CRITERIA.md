# Plasma Pro: tiêu chí nghiệm thu giao diện theo tác vụ

Ngày: 13/11/2026. Áp dụng cho các giai đoạn GĐ-0 đến GĐ-9 trong `PLASMA_PRO_TASK_BASED_UI_IMPLEMENTATION_PLAN.md`. Môi trường và chỉ số đo theo `PLASMA_PRO_TASK_BASED_UI_TEST_PLAN.md`.

Khổ: 320×640, 360×740, 390×844, 768×1024. Dữ liệu mẫu: `p-1`, `w-1`, `IMG0003` (đã đo), `IMG0004` (chưa đo), `d-1`. Kết quả ghi **ĐẠT**, **LỖI**, **BLOCKED** (thiếu điều kiện ngoài) hoặc **NOT TESTED**.

## 1. Tiêu chí chung cho mọi PR (AC-G)

| Mã | Tiêu chí | Cách kiểm |
|---|---|---|
| AC-G01 | `npx tsc --noEmit` không lỗi | Lệnh |
| AC-G02 | `npx expo lint` không lỗi mới | Lệnh |
| AC-G03 | `npm test` đạt toàn bộ (34 tệp trên `13b68bf`) | Lệnh |
| AC-G04 | `scripts/kiem-thu-giao-dien.cjs` 41/41 | Kịch bản |
| AC-G05 | Kịch bản hồi quy liên quan (Đợt 8 đến 12, P0, P1) không giảm số đạt so với `master` | Kịch bản |
| AC-G06 | Không tràn ngang ở 4 khổ trên các màn trong PR | `scrollWidth <= innerWidth + 1` |
| AC-G07 | Ảnh trước và sau ở 4 khổ lưu tại `/mnt/project-files/datn/task-based-ui/pr-tb-n/` | Kiểm thư mục |
| AC-G08 | Diff không chạm `src/lib/**`, `modules/**`, `app.json` (trừ khi người dùng duyệt riêng) | `git diff --stat` |
| AC-G09 | Màn ngoài phạm vi PR: cao nội dung không tăng quá 5% và nút chính không đổi vị trí quá 8 px | `kiem-thu-tb.cjs` |

## 2. Tiêu chí riêng cho màn có vùng nút cố định (AC-F)

| Mã | Tiêu chí |
|---|---|
| AC-F1 | Nút chính thấy được ngay khi mở màn ở 4 khổ |
| AC-F2 | Cuộn tới cuối: phần tử cuối nội dung nằm trọn trên footer |
| AC-F3 | Tab bàn phím (web) qua mọi phần tử: không phần tử nào bị footer che kín (WCAG 2.2, 2.4.11) |
| AC-F4 | Footer cao không quá 2 hàng nút; ở 320 px chữ nút không bị cắt |
| AC-F5 | Nút bị tắt vẫn hiện, có `reason` |
| AC-F6 | Bàn phím mở trên máy thật không che ô đang nhập và không che footer (BLOCKED tới khi có APK) |

## 3. Tiêu chí và ca kiểm thử theo giai đoạn

### GĐ-0 Nền

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-0.1 | `Screen` không có `footer` hiển thị giống hệt trước (so ảnh 41 kiểm thử giao diện) | TC-0.1 So ảnh B01, B04, N02 trước và sau, sai khác 0 px |
| AC-0.2 | `Screen` có `footer`: footer nằm trên vùng an toàn, nội dung chừa đáy | TC-0.2 Màn thử trong kịch bản (không phải route thật) hoặc B03 ở GĐ-4 |
| AC-0.3 | `Sheet` đóng bằng nút Đóng, chạm nền, Back hệ thống | TC-0.3 Ba cách đóng |
| AC-0.4 | `Sheet` không mở được lớp thứ hai | TC-0.4 Gọi mở sheet thứ hai khi đang mở: bị bỏ qua |
| AC-0.5 | `kiem-thu-tb.cjs` cho cùng số với `cong-cu/do-cuon.cjs` trên `master` (sai khác dưới 2%) | TC-0.5 Chạy hai công cụ |
| | | TC-0.6 Nút Đóng của sheet có nhãn trợ năng và vùng chạm 44×44 |

### GĐ-1 B07

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-1.1 | Nút Lưu ở footer, thấy ngay ở 4 khổ | TC-1.1 Mở `/evaluate/w-1`, đo đáy nút |
| AC-1.2 | Dòng "Còn n mục bắt buộc" khớp `evaluationProblems` | TC-1.2 Chọn lần lượt từng mục bắt buộc, n giảm đúng |
| AC-1.3 | Bấm Lưu khi thiếu: mở nhóm thiếu, cuộn tới câu thiếu, không lưu | TC-1.3 |
| AC-1.4 | Lưu đủ tạo đúng một bản ghi | TC-1.4 Bấm Lưu hai lần trong 100 ms |
| AC-1.5 | Công tắc công bố mặc định như hiện nay (QĐ-2); nhãn nút đổi theo công tắc | TC-1.5 |
| AC-1.6 | Sau lưu có báo cáo mở: màn "Đánh dấu n báo cáo đã xử lý" như cũ (QĐ-5) | TC-1.6 |
| | Mở từ B11 kèm `imageId`: ảnh tham chiếu đúng, cảnh báo `imageMismatch` như cũ | TC-1.7 `/evaluate/w-1?imageId=IMG0005` |

### GĐ-2 B10

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-2.1 | Ba bước Chụp, Kiểm tra ảnh, Nhập số đo hiển thị lần lượt; `StepRow` đúng bước | TC-2.1 Chọn ảnh có sẵn, qua từng bước |
| AC-2.2 | Footer đúng nút theo bước; nút chính thấy ở 4 khổ | TC-2.2 |
| AC-2.3 | "Quay lại" giữ ảnh và số đã gõ | TC-2.3 Gõ 12,5 ở bước 3, Quay lại, Tiếp: còn 12,5 |
| AC-2.4 | Back hệ thống ở bước 2, 3 hỏi bỏ ảnh; "Ở lại" giữ nguyên | TC-2.4 |
| AC-2.5 | Ô diện tích trống, không có số AR; không chọn sẵn phương pháp AR | TC-2.5 (QĐ-1, QĐ-P0-1) |
| AC-2.6 | Lưu không tích "Đã xem ảnh" vẫn được; `visualReview` lưu `false` như trước | TC-2.6 Đọc bản ghi ảnh mới trong store |
| | Lưu có số: ảnh có `areaCm2`, nguồn bác sĩ; lưu không số: ảnh "Chưa đo" | TC-2.7 |
| | Camera AR và camera thường: nút đổi vẫn có, không đổi hành vi | TC-2.8 (web: chỉ kiểm nút; máy thật BLOCKED) |

### GĐ-3 B11

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-3.1 | Khi `editing`: ẩn liên kết điều hướng và các mục thu gọn; footer Hủy/Lưu thấy ở 4 khổ | TC-3.1 `/images/IMG0004` |
| AC-3.2 | Khi không `editing`: bố cục như trước | TC-3.2 `/images/IMG0003`, so ảnh |
| AC-3.3 | Hủy giữ số cũ, không thêm dòng lịch sử nhãn | TC-3.3 |
| AC-3.4 | Lưu: thông báo xanh, nút "Ảnh chưa đo tiếp theo" hoặc "Không còn ảnh chưa đo" | TC-3.4 |
| AC-3.5 | Ảnh kế tiếp khác bệnh nhân: nhãn "bệnh nhân khác" và cảnh báo `patientChanged` (QĐ-P0-2) | TC-3.5 |
| AC-3.6 | Đang nhập, Back hệ thống: hỏi bỏ dữ liệu | TC-3.6 |
| | Lưu hai lần nhanh: một bản ghi | TC-3.7 |

### GĐ-4 B06, B03

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-4.1 | B06 footer: "Tiếp" (bước 1, 2), "Quay lại" (bước 2, 3), "Lưu phiên bản n cho VTxx" (bước 3) | TC-4.1 |
| AC-4.2 | Chuyển bước giữ mọi giá trị | TC-4.2 Đổi ngày, mức, quay lại, kiểm |
| AC-4.3 | Đổi liều sau khi xác nhận: dấu xác nhận reset (UX-02) | TC-4.3 |
| AC-4.4 | "Các phiên bản" thu gọn; tóm tắt nêu phiên bản đang áp dụng; mở ra đủ như trước | TC-4.4 |
| AC-4.5 | N06 (bệnh nhân) không đổi | TC-4.5 So ảnh `/plan/p-1` vai trò bệnh nhân |
| AC-4.6 | B03 Lưu ở footer; nhập rồi Back hỏi bỏ dữ liệu | TC-4.6 |
| AC-4.7 | B03 Lưu hai lần nhanh: một hồ sơ | TC-4.7 |
| | Lưu B06 hai lần nhanh: một phiên bản | TC-4.8 |

### GĐ-5 B04

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-5.1 | Mọi lối vào từ B04 mang đúng `patientId`, `woundId` | TC-5.1 Chạm từng dòng vết, dòng đợt, thiết bị; kiểm URL |

### GĐ-6 B05 (sau P2)

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-6.1 | Thông tin tóm tắt (mục 5.5 Audit) còn hiện, không trong mục thu gọn | TC-6.1 |
| AC-6.2 | Footer "Ghi đánh giá", "Chụp ảnh có hướng dẫn" thấy ở 4 khổ | TC-6.2 |
| AC-6.3 | Lối vào Đợt, Nhập số đo, So sánh, Lịch sử mở đúng màn kèm ngữ cảnh | TC-6.3 |
| AC-6.4 | "Lịch sử vết thương" có album đủ ngày và đánh giá cũ; mở ảnh ra B11 | TC-6.4 |
| AC-6.5 | Quyền màn lịch sử như B05: bác sĩ khác, bệnh nhân khác bị chặn | TC-6.5 |
| AC-6.6 | Sheet "Giảm chậm" giữ nguyên câu và trích dẫn; sheet "Chụp lại" mở đúng B11 và tự đóng | TC-6.6, TC-6.7 |
| AC-6.7 | Cao nội dung ở 360 px giảm ít nhất 25% so với bản P2 trước GĐ-6 | TC-6.8 `kiem-thu-tb.cjs` |

### GĐ-7 Bệnh nhân

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-7.1 | N07: nút nạp và Notice ở trên `DeviceView`, trong màn đầu trên thanh tab ở 320×640 | TC-7.1 |
| AC-7.2 | N07: biến thể nút theo `treatToday` như cũ | TC-7.2 Ngày có buổi và ngày nghỉ |
| AC-7.3 | N03 có lối vào N06; Back về N03 | TC-7.3 |
| AC-7.4 | N02, N04, N05, N08 sau P2: không màn nào quá 2,5 màn ở 360 px, nút chính trong màn đầu | TC-7.4 (đo, chỉ báo cáo cho P2) |
| | N01 hướng dẫn: 4 trang, "Bỏ qua", "Gọi 115" như cũ | TC-7.5 |

### GĐ-8 Quản trị

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-8.1 | Q01 thanh chọn "Tài khoản"/"Phân công"; mỗi phần đủ nội dung cũ | TC-8.1 |
| AC-8.2 | Đổi bác sĩ: vẫn hỏi xác nhận, có "Hoàn tác"; không có hai lớp hộp thoại | TC-8.2 |
| AC-8.3 | Khóa tài khoản, cấp quyền xuất: vẫn hỏi xác nhận | TC-8.3 |
| AC-8.4 | Q02 thẻ tải và bộ lọc ở đầu; nút tắt khi không có quyền xuất | TC-8.4, TC-8.5 (tài khoản có và không có `researchAccess`) |

### GĐ-9 Thiết bị

| Mã | Tiêu chí | Ca kiểm thử |
|---|---|---|
| AC-9.1 | T01 trạng thái kết nối (`UsbLinkStatus`) ở đầu màn mọi trạng thái | TC-9.1 |
| AC-9.2 | Footer T01 hiện đúng nút: chưa kết nối "Kết nối"; đã kết nối "Nạp liệu trình vào máy"; đã nhận "Theo dõi phiên điều trị" | TC-9.2 Theo luồng `kiem-thu-p0.cjs` phần DV |
| AC-9.3 | Thông báo "Đang gửi…", kết quả, mất kết nối hiện ngay trên nút trong footer | TC-9.3 |
| AC-9.4 | Điều kiện tắt nút nạp như cũ: chưa giao máy, chưa `INF`, sai phiên bản giao thức | TC-9.4 Hồ sơ `p-3` (chưa giao máy) và các ca P0 |
| AC-9.5 | Thông báo đỏ chặn gửi ở đầu nội dung, không bị footer che | TC-9.5 |
| AC-9.6 | Không tự chuyển sang T02 sau ACK (QĐ-6) | TC-9.6 Chờ 5 giây sau ACK, vẫn ở T01 |
| AC-9.7 | T02 không đổi: "Dừng điều trị" trong màn đầu ở 320, 360, 390 (TP-DV-08a) | TC-9.7 |
| AC-9.8 | B13 hai nút ở footer với bác sĩ; quản trị thấy như trước | TC-9.8, TC-9.9 |
| | Máy thật: ACK, NAK, rút cáp | BLOCKED |

## 4. Tiêu chí hoàn tất toàn bộ

1. Mọi PR TB đã merge sau khi người dùng duyệt từng PR.
2. Ở 360×740, không màn tác vụ nào (B03, B06, B07, B10, B11, T01) cần cuộn để thấy nút hoàn tất.
3. Không màn tóm tắt nào (B01, B04, B05, N02) vượt 2,5 màn ở 360×740, trừ khi bỏ bớt sẽ mất thông tin lâm sàng (ghi rõ lý do).
4. Hồi quy toàn bộ (AC-G04, AC-G05) đạt trên `master` sau PR cuối.
5. Danh sách BLOCKED và NOT TESTED được ghi vào báo cáo cuối, không bỏ trống.
