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
| UR17 | FR15, FR16, FR17 | Bác sĩ gán nhãn 20 ảnh mẫu theo bộ quy tắc | Chưa |
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

## 8.3. Kế hoạch validation với người dùng (bổ sung 11/11/2026)

Validation cần bác sĩ và người bệnh thật nên đề tài chỉ chuẩn bị kịch bản và phiếu; kết quả để trống đến khi thử. Thử trên bản demo một máy (KT1), dữ liệu giả lập, thiết bị giả lập hoặc mạch thật nếu có.

| Phiên | Người tham gia | Tác vụ | UR được kiểm | Tiêu chí đạt | Kết quả |
|---|---|---|---|---|---|
| V1 | 1 đến 2 bác sĩ | Tạo hồ sơ người bệnh, soạn liệu trình (mức, chế độ, thời gian), lưu bản "Đang áp dụng" | UR7, UR11 | Hoàn thành không cần hỗ trợ; bác sĩ đồng ý các trường đủ để ra y lệnh | |
| V2 | 1 đến 2 bác sĩ | Mở tổng quan, tìm người bệnh cần chú ý nhất trên 30 hồ sơ giả lập | UR8 | ≤ 30 giây (đx) | |
| V3 | 1 đến 2 bác sĩ | Chụp 10 ảnh mẫu bằng khung hướng dẫn, chấm ảnh đủ dùng | UR3, UR9 | ≥ 8 trên 10 ảnh đạt (đx) | |
| V4 | 3 đến 5 người bệnh mẫu (có ít nhất 1 người trên 60 tuổi) | Nhìn màn chính 10 giây rồi nói việc hôm nay | UR1 | Nói đúng vị trí, thời gian | |
| V5 | Như V4 | Cắm máy, nạp liệu trình, theo dõi phiên đến khi xong | UR2, UR11 | Hoàn thành; hiểu thông báo lỗi khi rút cáp | |
| V6 | Như V4 | Báo đau sau phiên | UR4 | Hoàn thành ≤ 3 thao tác (đx) | |
| V7 | Nhóm nghiên cứu | Từ một ảnh, truy về phiên và liệu trình | UR14 | Truy được trên bản demo | |

Tài liệu [1] đến [7] ở `cau-hoi-mo-va-tai-lieu.md`; [8], [9] liệt kê cuối mục này.

Phiếu sau mỗi phiên: thang SUS 10 câu [8] và 3 câu mở ("chỗ nào khó", "thiếu gì", "thừa gì"). Số người tham gia nhỏ phù hợp mục tiêu tìm lỗi khả dụng, không phải đo thống kê; Nielsen và Landauer (1993) cho thấy khoảng 5 người phát hiện phần lớn lỗi khả dụng [9]. Đây là căn cứ cho cỡ mẫu, không phải tiêu chí nghiệm thu.

Điều kiện chuyển sang bước 9 chính thức: V1, V4, V5 đạt. Nếu không đạt, quay lại UR hoặc FR theo slide 27 [1]. Các tệp bước 9 đến 15 hiện là **bản nháp chờ validation**.

[8] J. Brooke, "SUS: A 'quick and dirty' usability scale", trong *Usability Evaluation in Industry*, Taylor & Francis, 1996, tr. 189 đến 194.

[9] J. Nielsen, T. K. Landauer, "A mathematical model of the finding of usability problems", *Proc. INTERACT '93 and CHI '93*, ACM, 1993, tr. 206 đến 213. https://doi.org/10.1145/169059.169166
