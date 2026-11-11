# Phạm vi và giả định

## Tên đề tài và phạm vi (chốt ngày 11/11/2026)

**Nghiên cứu, thiết kế và phát triển ứng dụng điện thoại hỗ trợ quản lý quá trình điều trị vết thương bằng thiết bị Plasma Pro, tích hợp mô-đun nhận diện vết thương và giao tiếp USB/UART.**

Đề tài là bước đầu trong đề cương triển khai của Trường ĐH Y Hà Nội [3]. Mức thực hiện từng thành phần:

| Thành phần | Phạm vi thực hiện | Mức trong hồ sơ này | Khối, TR liên quan |
|---|---|---|---|
| Ứng dụng điện thoại | Phân tích, thiết kế và lập trình | Làm đủ 15 bước | Ứng dụng người bệnh, ứng dụng bác sĩ; TR4 đến TR6, TR11 đến TR15 |
| Giao tiếp USB/UART | Phát triển chức năng gửi và nhận dữ liệu với firmware | Lập trình phía ứng dụng | TR3 (phía ứng dụng), TR4 |
| Backend | Đề xuất kiến trúc, chức năng và phương án kết nối | Chỉ đề xuất, không lập trình | Máy chủ IoMT; TR7, TR9 |
| Database | Đề xuất mô hình dữ liệu, bảng và quan hệ | Chỉ đề xuất, không lập trình | TR8 |
| Mô-đun AI nhận diện vết thương | Tích hợp mô-đun có sẵn | Tích hợp, không huấn luyện mô hình | TR10 |
| Thu thập và gán nhãn hình ảnh | Phát triển chức năng hỗ trợ bác sĩ tạo dữ liệu phục vụ huấn luyện AI về sau | Lập trình | Ứng dụng bác sĩ; TR8, TR13 |
| Phần cứng Plasma Pro | Sử dụng thiết bị và firmware từ đồ án phần cứng | Ngoài phạm vi; chỉ nêu yêu cầu với firmware | Mạch IoT; TR1, TR2, phía firmware của TR3 |

Dòng "Thu thập và gán nhãn hình ảnh" được thêm theo bản quy trình 9 giai đoạn của chủ đồ án (11/11/2026); tên đề tài giữ nguyên. Theo bản này, **bác sĩ là người dùng chính** của mọi màn hình. **Người bệnh** dùng ứng dụng để sử dụng Plasma Pro trị liệu tại nhà (chủ đồ án xác nhận 11/11/2026). Duyệt nhãn ảnh nằm ngoài phạm vi đề tài.

Mọi UR, FR, TR trong hồ sơ phải truy được về một dòng của bảng trên. Phần không thuộc dòng nào được hạ xuống nice to have hoặc chuyển sang hướng phát triển.

## Cách đọc

Tài liệu này đi lại 15 bước ở slide 12 của bài giảng [1] cho **ứng dụng điện thoại** Plasma Pro, cùng phần đề xuất backend, database và phần tích hợp mô-đun AI. Bước 1 đến 8 viết đầy đủ đến mức có thể đem đi hỏi người dùng. Bước 9 đến 15 có bản nháp ở các tệp 09 đến 15, chờ kết quả validation ở bước 8 (mục 8.3).

Cách đọc: mỗi bước ghi đầu vào lấy từ vòng cũ [5], phần làm mới, và sản phẩm đầu ra. Kết quả vòng cũ là giả thuyết, chưa phải quyết định.

## Ràng buộc và giả định phần cứng

**Ràng buộc từ phạm vi đề tài:** dùng thiết bị và firmware của đồ án phần cứng, giao tiếp với ứng dụng qua USB/UART. GA-2 dưới đây vì vậy là ràng buộc, không còn là giả định.

**Giả định (GA)**, cần nhóm phần cứng hoặc WCMD xác nhận:

- GA-1: Thiết bị theo mô hình HFP: liệu trình đặt sẵn, khóa theo y lệnh, người bệnh không đổi thông số [2, slide 24].
- GA-2 (ràng buộc): Mạch IoT là mô-đun gắn ngoài, cấu hình qua USB-C (UART, CP2102N), chạy độc lập và tự ngắt khi hết thời gian, như báo cáo giữa kỳ [4, mục 3.1.3, 4.2].
- GA-3: Thiết bị có 5 mức năng lượng và 3 chế độ (Cold, Hybrid, Thermal) [4, bảng mục 3.2.1.1].
- GA-4: Liều tính theo J/cm² = mật độ công suất × thời gian [2, slide 20, 28]. Mật độ công suất của đầu phát Plasma Pro chưa biết.

GA-2 vênh với đề cương: đề cương cần IoMT tự ghi nhận và đồng bộ dữ liệu từng phiên [3, mục 4.2, 4.7], còn mạch giữa kỳ không gửi dữ liệu gì sau khi rút cáp. Mâu thuẫn này được xử lý ở bước 4 và 6. Vì firmware thuộc đồ án phần cứng, phần ghi nhật ký phiên (TR2) là yêu cầu gửi nhóm phần cứng, không phải việc của đề tài này.

**Rủi ro nền tảng:** iOS chỉ cho ứng dụng kết nối phụ kiện có chứng nhận MFi qua External Accessory framework [6]; chip CP2102N không thuộc loại này. Android có USB Host API [7]. Chủ đồ án yêu cầu điện thoại người bệnh kết nối USB/UART với máy tại nhà trên **cả Android và iOS** (11/11/2026). Phần iOS phụ thuộc vào phần cứng: cần đồ án phần cứng xác nhận bộ chuyển đổi dùng được với iOS (phụ kiện MFi, hoặc chip có trình điều khiển cho iOS). Ứng dụng tách lớp truyền dẫn để thêm bản iOS khi phần cứng sẵn sàng.

