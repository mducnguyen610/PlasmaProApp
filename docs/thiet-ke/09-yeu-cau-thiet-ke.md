# Bước 9. Design requirements

Trạng thái: **bản nháp chờ validation** (bước 8, mục 8.3). Theo slide 12 [1], bước này chuyển nhu cầu kỹ thuật TR ([07-thiet-ke-cau-truc.md](07-thiet-ke-cau-truc.md)) thành yêu cầu thiết kế cho từng mô-đun mã, đủ cụ thể để viết mã và kiểm thử. Ký hiệu `DR` (design requirement). Mô-đun lấy theo [10-kien-truc-tong-the.md](10-kien-truc-tong-the.md) mục 5.

Phạm vi theo tệp 00: DR của máy chủ và database chỉ là đề xuất, nằm ở [de-xuat-backend.md](de-xuat-backend.md) và [de-xuat-co-so-du-lieu.md](de-xuat-co-so-du-lieu.md); tệp này chỉ liệt kê DR của ứng dụng.

| DR | Mô-đun | Yêu cầu thiết kế | Kiểm chứng | Từ TR |
|---|---|---|---|---|
| DR1 | Lớp thiết bị | Mọi định dạng trên dây (khung, checksum, bản tin, trường, đơn vị, bảng mã, baud) nằm trong một đối tượng dữ liệu `PROTOCOL`; không mã nào khác chứa hằng số giao thức | `spec.test.cjs`, `checkSpec` rỗng | TR3 |
| DR2 | Lớp thiết bị | Gói cấu hình có đúng 10 trường theo thứ tự ICD; giá trị ngoài miền bị chặn trước khi gửi | `protocol.test.cjs`, `vectors.test.cjs` | TR3, TR11 |
| DR3 | Lớp thiết bị | Gửi có xác nhận: chờ ACK tối đa `ackTimeoutMs`, gửi lại tối đa `maxRetries` lần, phân biệt NAK, hết giờ, mất kết nối, lệch phiên bản | `sender.test.cjs` | TR3 |
| DR4 | Lớp thiết bị | Bộ đọc khung bỏ được byte rác, khung cắt đôi, khung sai checksum, không tràn quá `maxFrameBytes` | `protocol.test.cjs` | TR3 |
| DR5 | Lớp thiết bị | Màn hình chỉ chạm thiết bị qua `DeviceTransport` (open, close, write, onData, onState); có bản giả lập nói đúng đặc tả và bản USB Android | `simulated.test.cjs`; thử tay bản USB | TR4 |
| DR6 | Lớp thiết bị | Đồng hồ gửi máy tính theo UTC+7 bất kể múi giờ điện thoại | `vectors.test.cjs` | TR3, NFR5 |
| DR7 | Liệu trình | Liệu trình có phiên bản; mỗi lần sửa ghi người, giờ, lý do; mức và chế độ chỉ chọn trong năng lực máy, không có giá trị mặc định | `course.test.ts`; thử tay màn soạn | TR11 |
| DR8 | Màn người bệnh | Màn chính hiện việc hôm nay (vị trí, mức, chế độ, thời gian) không cần thao tác; chữ ≥ 17 px, tương phản ≥ 4,5:1, vùng chạm ≥ 44 điểm | `theme.contrast.test.ts`; V4 | TR6, NFR4 |
| DR9 | Lịch và tuân thủ | Mốc "hôm nay" tính theo UTC+7; trạng thái ngày tách đã chiếu, bỏ lỡ, chưa có dữ liệu | `localDay.test.ts`, `adherence.test.ts` | TR6, TR12 |
| DR10 | Tổng quan bác sĩ | Danh sách người bệnh xếp theo điểm cần chú ý, có lý do hiện cạnh tên | Chưa có (bước 7 giai đoạn 1) | TR12 |
| DR11 | Ảnh | Ảnh luôn có mã ảnh, mã người bệnh, mã vết thương, thời điểm chụp; tên tệp theo quy tắc `naming.ts`; kiểm chất lượng trước khi lưu | `naming.test.ts`, `quality.test.cjs`, `steady.test.cjs` | TR13 |
| DR12 | Nhận diện | Mô-đun AI chỉ được gọi qua `WoundRecognizer`: vào ảnh, ra vùng, diện tích cm², độ tin cậy, phiên bản mô hình; lưu cả giá trị AI và giá trị bác sĩ | Chưa có (bước 6 giai đoạn 1) | TR10 |
| DR13 | Bộ dữ liệu | Bản xuất chỉ gồm ảnh có đồng ý và đã gán nhãn; bỏ metadata; mã nghiên cứu thay mã người bệnh | `workflow.test.cjs` | TR13 |
| DR14 | Quyền | Mỗi màn kiểm vai trò; quản trị viên không thấy dữ liệu lâm sàng; bác sĩ chỉ thấy người bệnh của mình | `workflow.test.cjs` | TR7 (phía ứng dụng) |
| DR15 | Nhật ký gửi máy | Mỗi lần gửi cấu hình ghi kết quả, số lần, phiên bản giao thức, nguồn năng lực | Thử tay màn chẩn đoán | TR3, TR8 |

DR10 và DR12 phụ thuộc quyết định gộp bước 6, 7 vào giai đoạn 2.

## Tài liệu tham khảo

[1] Lương Thị Hồng Liên, "Phương pháp luận thiết kế, phần 1", bài giảng, 10/04/2026, slide 12.
