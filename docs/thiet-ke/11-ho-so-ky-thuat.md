# Bước 11. Product technical documents

Trạng thái: **bản nháp chờ validation**. Đề tài là phần mềm đi kèm thiết bị y tế, nên hồ sơ kỹ thuật theo khung IEC 62304 (vòng đời phần mềm) và ISO 14971 (quản lý rủi ro), như NFR2 [1, 2]. Đề tài chỉ làm phần thuộc ứng dụng; hồ sơ thiết bị và firmware thuộc đồ án phần cứng.

## 11.1. Danh mục hồ sơ

| Hồ sơ | Nội dung | Nơi đặt | Trạng thái |
|---|---|---|---|
| Kế hoạch phát triển phần mềm | Quy trình 15 bước, kế hoạch giai đoạn | `docs/thiet-ke/README.md`, `plans/` | Có |
| Yêu cầu phần mềm | UR, FR, NFR, TR, DR | Tệp 03, 05, 07, 09 | Bản nháp |
| Kiến trúc và thiết kế chi tiết | Tầng, mô-đun, máy trạng thái, ICD, mô hình dữ liệu | Tệp 10, ICD, đề xuất database | Bản nháp |
| Kiểm chứng | Ma trận truy vết, kết quả kiểm thử | [12-kiem-chung-san-pham.md](12-kiem-chung-san-pham.md) | Bản nháp |
| Quản lý rủi ro | Bảng mối nguy mục 11.3 | Tệp này | Bản nháp |
| Hướng dẫn sử dụng | Mục 11.4 | Tệp này | Dàn ý |
| Quản lý cấu hình | Git, nhánh, pull request; phiên bản giao thức trong `PROTOCOL.protocolVersion` | Kho mã | Có |

## 11.2. Phân loại an toàn phần mềm

Đề xuất **lớp B** theo IEC 62304 [1]: lỗi phần mềm có thể gây tổn thương không nghiêm trọng (ví dụ nạp sai thời gian chiếu), vì máy có giới hạn cứng và tự ngắt theo GA-2. Nếu firmware không có giới hạn cứng độc lập với ứng dụng, phải xét lại lên lớp C. Đây là nhận định của người thiết kế, cần giảng viên xác nhận.

## 11.3. Bảng mối nguy phía ứng dụng (theo ISO 14971 [2])

Mức nghiêm trọng là ước lượng; khả năng xảy ra chưa có dữ liệu nên chưa tính mức rủi ro.

| Mã | Mối nguy | Chuỗi sự kiện | Hậu quả | Biện pháp trong ứng dụng | Kiểm chứng |
|---|---|---|---|---|---|
| RK1 | Nạp sai thời gian hoặc mức | Đổi đơn vị sai, giá trị ngoài miền | Quá liều hoặc thiếu liều | Đơn vị và miền khai báo trong đặc tả; chặn trước khi gửi; ví dụ đối chiếu byte | `vectors.test.cjs`, `protocol.test.cjs` |
| RK2 | Gói hỏng trên đường truyền | Nhiễu, rút cáp giữa chừng | Máy nhận cấu hình sai | Checksum; máy trả NAK; ứng dụng chỉ báo "đã nạp" khi có ACK | `sender.test.cjs`; TR1 phía firmware |
| RK3 | Ứng dụng và firmware lệch phiên bản giao thức | Cập nhật một bên | Hiểu sai trường | Hỏi `INF`, từ chối gửi khi lệch hoặc khi máy chưa trả lời `INF` | `sender.test.cjs` |
| RK4 | Ứng dụng tự đặt giá trị điều trị | Giá trị mặc định | Liều không do bác sĩ quyết | Không có mặc định; trường trống thì không gửi (KT5) | `planToConfig` trả `missing` |
| RK5 | Nạp liệu trình của người khác | Dùng chung điện thoại | Sai người bệnh | `patient_id` trong gói; kiểm vai trò ở màn kết nối; chỉ nạp khi hồ sơ đã được giao máy | Thử tay T01 (chưa có kiểm thử tự động cho màn kết nối) |
| RK6 | Sai ngày giờ trên máy | Múi giờ điện thoại khác UTC+7 | Lịch sai | Đồng hồ gửi máy tính theo UTC+7, lấy lại ở mỗi lần gửi | `vectors.test.cjs`, `sender.test.cjs` |
| RK7 | Đo sai diện tích | Ảnh kém, mô-đun AI sai | Đánh giá diễn biến sai | Kiểm chất lượng ảnh; bác sĩ xác nhận; cảnh báo số đo bất thường | `quality.test.cjs`, `plausibility.test.ts` |
| RK8 | Lộ dữ liệu cá nhân trong bộ dữ liệu | Xuất ảnh có metadata | Vi phạm Luật 91/2025/QH15 | Chỉ xuất ảnh có đồng ý, bỏ metadata, mã nghiên cứu | `workflow.test.cjs` |
| RK9 | Bác sĩ hiểu nhầm người bệnh bỏ điều trị | Chưa đồng bộ | Can thiệp sai | Trạng thái "chưa có dữ liệu" riêng | `adherence.test.ts` |

Rủi ro còn lại sau biện pháp phải được bác sĩ và giảng viên chấp nhận; chưa làm.

## 11.4. Dàn ý hướng dẫn sử dụng

1. Người bệnh: đăng nhập lần đầu bằng mã kích hoạt; xem việc hôm nay; cắm máy và nạp liệu trình; theo dõi phiên; báo đau; xử lý thông báo lỗi (không thấy máy, chưa cho phép USB, máy từ chối cấu hình).
2. Bác sĩ: tạo hồ sơ, soạn liệu trình, giao máy, chụp ảnh, đọc tổng quan, xuất bộ dữ liệu.
3. Quản trị: tài khoản, thiết bị, màn chẩn đoán hex.
4. Cảnh báo an toàn: ứng dụng không thay chỉ định của bác sĩ; máy chỉ phát theo liệu trình đã nạp.

## Tài liệu tham khảo

[1] IEC 62304:2006+AMD1:2015, *Medical device software: Software life cycle processes*.

[2] ISO 14971:2019, *Medical devices: Application of risk management to medical devices*.
