# Đối chiếu quy trình 8 bước của chủ đồ án với quy trình 15 bước của bài giảng

Tệp "Quy trình thiết kế hệ thống phần mềm Plasma Pro" (chủ đồ án gửi ngày 11/11/2026) nêu 8 bước theo lối kỹ thuật phần mềm. Bài giảng [1, slide 12] nêu 15 bước. Bảng dưới xếp 8 bước vào khung 15 bước, để báo cáo dùng được cả hai.

| Bài giảng (slide 12) | Quy trình 8 bước | Tệp trong hồ sơ | Chương báo cáo |
|---|---|---|---|
| 1. Initial Idea | Một phần bước 1 (đối tượng, mục đích) | 01 | 3 |
| 2. Research | Bước 1 (tìm hiểu thiết bị, firmware, mô-đun AI) | 02 | 2, 3 |
| 3. User requirements | Bước 1 (các yêu cầu cần xác định) | 03 | 3 |
| 4. Analyse | Bước 2 | 04 | 3 |
| 5. Functional requirements | Bước 2 (đặc tả chức năng) | 05 | 3 |
| 6. Solutions generation | Bước 3 | 06 | 3 |
| 7. Conceptual design | Bước 3, 4 | 07 | 3 |
| 8. Verif/validation thiết kế cấu trúc | Không có | 08 | 3 |
| 9. Design requirements | Bước 4, 6 (giao thức USB/UART) | chưa có | 3 |
| 10. Detailed design | Bước 4, 5, 6 | chưa có | 3 |
| 11. Product technical docs | Không có | chưa có | Phụ lục |
| 12. Product verif/validation | Bước 8 | chưa có | 5 |
| 13. Prototypes | Bước 7 | mã nguồn | 4 |
| 14. Tests | Bước 8 | chưa có | 5 |
| 15. Industrialisation | Không có, ngoài phạm vi | 09-15 | 5 (hướng phát triển) |

## Chỗ khớp

- Phân định phạm vi trùng hoàn toàn với bảng phạm vi ở tệp 00.
- Các thực thể dữ liệu (User, Patient, Wound, Treatment, Device, TreatmentSession, AIResult) khớp với TR8 ở tệp 07.
- Giao thức USB/UART tương ứng TR3; các trường gửi xuống firmware là nội dung cụ thể đầu tiên của TR3.

## Chỗ lệch cần chốt

1. **Người dùng chính.** 8 màn hình của quy trình 8 bước (danh sách bệnh nhân, thêm, sửa bệnh nhân, thiết lập điều trị, kết nối thiết bị) là màn của nhân viên y tế. Bộ UR ở tệp 03 lại đặt người bệnh tự dùng tại nhà làm trung tâm (UR1 đến UR6).
2. **Bước 8 của bài giảng (verification và validation thiết kế cấu trúc) không có trong quy trình 8 bước.** Theo slide 27, thiếu bước này thì không có điểm quay lại UR, FR trước khi lập trình.
3. **UR và FR bị gộp.** Quy trình 8 bước đi thẳng từ "yêu cầu cần xác định" sang "chức năng". Bài giảng tách UR (góc nhìn người dùng, slide 16) với FR (góc nhìn người thiết kế, có SMART, slide 20, 21) và nối chúng bằng bảng tham chiếu (slide 26).
4. **Dữ liệu gửi xuống firmware chưa có mức năng lượng và chế độ (GA-3).** Nếu firmware không nhận hai trường này, FR3 (liều J/cm²) nằm ngoài khả năng của hệ thống.
5. **`min_treatment_time` là thời gian tối thiểu.** UR2 cần máy dừng đúng thời gian bác sĩ đặt, tức một giới hạn trên. Cần hỏi người viết firmware trường này nghĩa là gì.
6. **Thực thể còn thiếu so với FR:** ảnh vết thương tách khỏi kết quả AI, phiên bản và lý do sửa liệu trình (FR9), báo đau và biến cố (FR6), đồng ý của người bệnh (UR13).
7. **Màn hình còn thiếu trong mã hiện tại:** kết nối thiết bị qua USB, theo dõi phiên điều trị. Mã có thêm nhiều màn không nằm trong 8 màn (quản trị, bộ dữ liệu, đánh giá, so sánh, đăng ký, kích hoạt).
8. **Tên đề tài:** quy trình 8 bước ghi "phần mềm quản lý điều trị", tên đã chốt ghi "ứng dụng điện thoại hỗ trợ quản lý quá trình điều trị".

## Bản cập nhật 9 giai đoạn (11/11/2026)

Bản cập nhật thêm giai đoạn 7 "Thiết kế quy trình thu thập và gán nhãn hình ảnh". Giai đoạn này ứng với bước 9, 10 của bài giảng (Design requirements, Detailed design); giai đoạn 8 ứng với bước 13, giai đoạn 9 ứng với bước 12 và 14.

| Chỗ lệch ở bản 8 bước | Trạng thái ở bản 9 giai đoạn |
|---|---|
| 1. Người dùng chính | Đã rõ: bác sĩ là người dùng chính. Còn hỏi người bệnh dùng ứng dụng để làm gì (câu hỏi 11) |
| 2. Thiếu bước 8 của bài giảng | Vẫn thiếu |
| 3. UR và FR bị gộp | Vẫn gộp; giai đoạn 1 có nhắc "yêu cầu chức năng và phi chức năng" nhưng chưa có bảng tham chiếu UR, FR |
| 4. Thiếu mức năng lượng, chế độ | Đã thêm energy_level, treatment_mode |
| 5. Nghĩa của min_treatment_time | Vẫn mở (câu hỏi 12) |
| 6. Thực thể còn thiếu | Đã thêm Image, Annotation. Còn thiếu: phiên bản liệu trình, báo cáo triệu chứng, đồng ý của người bệnh (đã ghi vào TR8) |
| 7. Màn hình còn thiếu trong mã | Vẫn thiếu màn kết nối USB và màn theo dõi phiên |
| 8. Tên đề tài | Đã thống nhất, giữ tên đã chốt |

Chỗ còn lệch với bài giảng, nên bổ sung vào chương 3 của báo cáo:

- Ba câu hỏi Initial Idea và sơ đồ bạch tuộc (slide 13, 17): bản 9 giai đoạn bắt đầu thẳng từ khảo sát.
- Tiêu chí SMART cho từng FR (slide 21): bản 9 giai đoạn chưa có chỉ tiêu đo.
- Bảng tham chiếu UR, FR, validation (slide 26).
- Kiểm chứng thiết kế cấu trúc trước khi lập trình (bước 8, slide 21, 27), gồm FMEA sơ bộ.
