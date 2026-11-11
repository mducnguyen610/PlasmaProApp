# Bước 8. Verification và validation của thiết kế cấu trúc

Verification trên giấy đạt: 16 UR đều có FR, và mọi FR đều phục vụ ít nhất một UR. Validation chưa làm: cần người dùng thật. Theo slide 21 [1], verification hỏi “làm đúng cách chưa”, validation hỏi “làm đúng thứ người dùng cần chưa”.

**8.1. Bảng tham chiếu UR, FR, validation** (theo slide 26)

| UR | FR, NFR | Cách validation | Trạng thái |
|---|---|---|---|
| UR1 | FR1, NFR4, NFR5 | Người bệnh mẫu trên 60 tuổi nói đúng việc hôm nay sau 10 giây nhìn màn | Chưa |
| UR2 | FR2, FR3, NFR2 | Thử phát khi không có liệu trình, khi hết phiên, khi gói lỗi | Chưa |
| UR3 | FR5 | Bác sĩ chụp 10 ảnh mẫu, chấm ảnh đủ để đo và gán nhãn | Chưa |
| UR4 | FR6 | Bác sĩ duyệt nội dung hướng dẫn và ngưỡng | Chưa |
| UR5 | FR7 | Hỏi người bệnh mẫu | Chưa |
| UR6 | FR8 | Thử tắt mạng 7 ngày rồi bật lại | Chưa |
| UR7 | FR3, FR9 | Bác sĩ lập một liệu trình thật trên bản mẫu | Chưa |
| UR8 | FR10, NFR5 | Thử tác vụ với bác sĩ trên dữ liệu 30 người giả lập | Chưa |
| UR9 | FR5, FR11 | So diện tích AI với bác sĩ trên bộ ảnh thử | Chưa |
| UR10 | FR12 | Kiểm bản xuất: không còn trường định danh, nhãn khớp ảnh | Chưa |
| UR11 | FR2, FR13 | Bác sĩ giao, nạp liệu trình qua USB và thu hồi một máy | Chưa |
| UR12 | FR14 | Ngoài phạm vi ứng dụng | Không làm |
| UR13 | NFR1, NFR2, NFR6 | Pháp chế bệnh viện rà soát | Chưa |
| UR14 | FR4, FR11 | Nhóm nghiên cứu truy một phiên từ ảnh về liệu trình | Chưa |
| UR15 | NFR3 | Chạy ứng dụng với thiết bị giả lập và mạch thật | Chưa |
| UR17 | FR15, FR16, FR17 | Bác sĩ gán nhãn và duyệt 20 ảnh mẫu theo bộ quy tắc | Chưa |
| UR16 | NFR7 | Giảng viên, WCMD đánh giá | Chưa |

**8.2. FMEA sơ bộ cho thiết kế cấu trúc.** Mức nghiêm trọng là ước lượng của hệ thống; khả năng xảy ra và khả năng phát hiện cần dữ liệu thử, nên chưa tính RPN.

| Khối | Chế độ lỗi | Hậu quả | Nghiêm trọng | Biện pháp |
|---|---|---|---|---|
| Mạch IoT | Nhiễu EMI làm sai bộ đếm thời gian | Quá liều | Cao | Watchdog, lọc nhiễu, giới hạn cứng thời gian mỗi phiên [4, mục 2.2.2] |
| Mạch IoT | Máy còn liệu trình cũ sau khi bác sĩ đã đổi | Sai liều | Cao | Liệu trình có hạn dùng; ứng dụng chặn phiên khi có liệu trình mới chưa nạp (A2) |
| Mạch IoT | Nhật ký đầy bộ nhớ | Mất dữ liệu phiên | Trung bình | Nhắc cắm cáp trước khi đầy; không ghi đè khi chưa đọc |
| Ứng dụng người bệnh | Gán ảnh cho nhầm vết thương | Bác sĩ hiểu sai diễn biến | Trung bình | Chọn vết thương trước khi mở camera; ảnh trước để so |
| Ứng dụng người bệnh | Dùng chung điện thoại, không đăng xuất | Lộ dữ liệu; người khác nạp liệu trình | Trung bình | Tự đăng xuất; mã PIN trước khi nạp (R9 vòng cũ còn mở [5]) |
| Máy chủ | Báo “không dùng” khi thực ra chưa đồng bộ | Bác sĩ hiểu nhầm bệnh nhân bỏ điều trị | Trung bình | Trạng thái “chưa có dữ liệu” riêng (FR10) |
| Mô-đun AI | Đo sai diện tích | Quyết định điều trị sai | Trung bình | Bác sĩ xác nhận mọi kết quả; hiện độ tin cậy |

Nếu validation không đạt, sơ đồ slide 27 cho quay lại UR hoặc FR, không đi tiếp sang Design requirements.
