# Bước 9. Design requirements

Trạng thái: **bản nháp chờ validation** (bước 8, mục 8.3). Theo slide 12 [1], bước này chuyển nhu cầu kỹ thuật TR ([07-thiet-ke-cau-truc.md](07-thiet-ke-cau-truc.md)) thành yêu cầu thiết kế cho từng mô-đun mã, đủ cụ thể để viết mã và kiểm thử. Ký hiệu `DR` (design requirement). Mô-đun lấy theo [10-kien-truc-tong-the.md](10-kien-truc-tong-the.md) mục 5.

Phạm vi theo tệp 00: DR của máy chủ và database chỉ là đề xuất, nằm ở [de-xuat-backend.md](de-xuat-backend.md) và [de-xuat-co-so-du-lieu.md](de-xuat-co-so-du-lieu.md); tệp này chỉ liệt kê DR của ứng dụng.

| DR | Mô-đun | Yêu cầu thiết kế | Kiểm chứng | Từ TR |
|---|---|---|---|---|
| DR1 | Lớp thiết bị | Mọi định dạng trên dây (khung, checksum, bản tin, trường, đơn vị, bảng mã, baud) nằm trong một đối tượng dữ liệu `PROTOCOL`; không mã nào khác chứa hằng số giao thức | `spec.test.cjs`, `checkSpec` rỗng | TR3 |
| DR2 | Lớp thiết bị | Gói cấu hình có đúng 10 trường theo thứ tự ICD; giá trị ngoài miền bị chặn trước khi gửi | `protocol.test.cjs`, `vectors.test.cjs` | TR3, TR11 |
| DR3 | Lớp thiết bị | Gửi có xác nhận: chờ ACK tối đa `ackTimeoutMs`, gửi lại tối đa `maxRetries` lần, phân biệt NAK, hết giờ, khung hỏng, mất kết nối, lệch phiên bản, máy chưa trả `INF`; ngày giờ trong khung lấy lại ở mỗi lần gửi | `sender.test.cjs` | TR3 |
| DR4 | Lớp thiết bị | Bộ đọc khung bỏ được byte rác (kể cả header giả trong nhiễu), khung cắt đôi, khung sai checksum, không tràn quá `maxFrameBytes` | `protocol.test.cjs` | TR3 |
| DR5 | Lớp thiết bị | Màn hình chỉ chạm thiết bị qua `DeviceTransport` (open, close, write, onData, onState); có bản giả lập nói đúng đặc tả và bản USB Android | `simulated.test.cjs`, `usb-android.test.cjs` (mô-đun gốc giả); thử tay với mạch | TR4 |
| DR6 | Lớp thiết bị | Đồng hồ gửi máy tính theo UTC+7 bất kể múi giờ điện thoại | `vectors.test.cjs` | TR3, NFR5 |
| DR7 | Liệu trình | Liệu trình có phiên bản; mỗi lần sửa ghi người, giờ, lý do; mức và chế độ chỉ chọn trong năng lực máy, không có giá trị mặc định | Thử tay màn soạn; chưa có kiểm thử tự động cho phiên bản, lý do và năng lực máy | TR11 |
| DR8 | Màn người bệnh | Màn chính hiện việc hôm nay (vị trí, mức, chế độ, thời gian) không cần thao tác; chữ ≥ 17 px, tương phản ≥ 4,5:1, vùng chạm ≥ 44 điểm | `theme.contrast.test.ts`; V4 | TR6, NFR4 |
| DR9 | Lịch và tuân thủ | Mốc "hôm nay" và giờ hiển thị tính theo UTC+7 bất kể múi giờ điện thoại; trạng thái ngày tách đã chiếu, bỏ lỡ, chưa có dữ liệu (kèm lần đồng bộ cuối) | `localDay.test.ts`, `adherence.test.ts`, `attention.test.ts` | TR6, TR12 |
| DR10 | Tổng quan bác sĩ | Danh sách người bệnh xếp theo điểm cần chú ý, có lý do hiện cạnh tên | `attention.test.ts` | TR12 |
| DR11 | Ảnh | Ảnh luôn có mã ảnh, mã người bệnh, mã vết thương, thời điểm chụp; tên tệp theo quy tắc `naming.ts`; kiểm chất lượng trước khi lưu | `naming.test.ts`, `quality.test.cjs`, `steady.test.cjs` | TR13 |
| DR12 | Nhận diện | Mô-đun AI chỉ được gọi qua `WoundRecognizer` (cả ảnh chụp lẫn khung xem trực tiếp): vào ảnh, ra vùng, diện tích cm² (null khi không có thước đo), độ tin cậy, phiên bản mô hình; lưu cả giá trị AI và giá trị bác sĩ | `ai/result.test.ts` | TR10 |
| DR13 | Bộ dữ liệu | Bản xuất chỉ gồm ảnh có đồng ý và đã gán nhãn; bỏ metadata; mã nghiên cứu thay mã người bệnh | `workflow.test.cjs` | TR13 |
| DR14 | Quyền | Mỗi màn kiểm vai trò; quản trị viên không thấy dữ liệu lâm sàng; bác sĩ chỉ thấy người bệnh của mình | `workflow.test.cjs` | TR7 (phía ứng dụng) |
| DR15 | Nhật ký gửi máy | Mỗi lần gửi cấu hình xuống máy thật ghi kết quả, số lần, phiên bản giao thức, nguồn năng lực; màn chẩn đoán không nạp cấu hình xuống máy thật | Thử tay luồng nạp liệu trình (T01) | TR3, TR8 |
| DR16 | Phiên điều trị | Chuỗi `STA` running rồi done, stopped hoặc error sinh đúng một bản ghi phiên, gắn với máy đã giao cho hồ sơ; mất kết nối giữa phiên thì không ghi | `session-tracker.test.cjs`; thử tay T02 | TR2, TR8 |
| DR17 | Báo đau | Thang VAS 0 đến 10; từ ngưỡng (hiện là 7, chờ bác sĩ đặt) hiện hướng dẫn liên hệ | Thử tay N08 (V6) | TR6 |
| DR18 | Diễn biến diện tích | Biểu đồ chỉ dùng số đo đã được bác sĩ xác nhận | `plausibility.test.ts` (cảnh báo số đo bất thường); thử tay | TR14 |
| DR19 | Giao máy | Chỉ bác sĩ phụ trách giao và thu hồi máy; một máy một người; chỉ nạp liệu trình khi hồ sơ đã được giao máy | `devices.test.ts`; thử tay B04, T01 | TR12 |
| DR20 | Hồ sơ người bệnh | Mã hồ sơ duy nhất, không chứa họ tên, nằm trong giới hạn `patient_id` của ICD; chặn trùng số điện thoại; lưu người, giờ, giá trị cũ khi sửa | `workflow.test.cjs` (phần quyền); chưa có kiểm thử cho mã hồ sơ và lịch sử sửa | TR15 |

DR10 và DR12 được lập trình ở bước 6, 7 của giai đoạn 1 (PR 11).

## Tài liệu tham khảo

[1] Lương Thị Hồng Liên, "Phương pháp luận thiết kế, phần 1", bài giảng, 10/04/2026, slide 12.
