# Phạm vi và giả định

Tài liệu này đi lại 15 bước ở slide 12 của bài giảng [1] cho **phần mềm** Plasma Pro (ứng dụng, hệ thống IoMT, mô-đun AI). Bước 1 đến 8 viết đầy đủ đến mức có thể đem đi hỏi người dùng. Bước 9 đến 15 phụ thuộc vào kết quả validation ở bước 8, nên chỉ ghi kế hoạch.

Cách đọc: mỗi bước ghi đầu vào lấy từ vòng cũ [5], phần làm mới, và sản phẩm đầu ra. Kết quả vòng cũ là giả thuyết, chưa phải quyết định.

**Giả định phần cứng (GA)**, cần WCMD xác nhận trước bước 6:

- GA-1: Thiết bị theo mô hình HFP: liệu trình đặt sẵn, khóa theo y lệnh, người bệnh không đổi thông số [2, slide 24].
- GA-2: Mạch IoT là mô-đun gắn ngoài, cấu hình qua USB-C (UART, CP2102N), chạy độc lập và tự ngắt khi hết thời gian, như báo cáo giữa kỳ [4, mục 3.1.3, 4.2].
- GA-3: Thiết bị có 5 mức năng lượng và 3 chế độ (Cold, Hybrid, Thermal) [4, bảng mục 3.2.1.1].
- GA-4: Liều tính theo J/cm² = mật độ công suất × thời gian [2, slide 20, 28]. Mật độ công suất của đầu phát Plasma Pro chưa biết.

GA-2 vênh với đề cương: đề cương cần IoMT tự ghi nhận và đồng bộ dữ liệu từng phiên [3, mục 4.2, 4.7], còn mạch giữa kỳ không gửi dữ liệu gì sau khi rút cáp. Mâu thuẫn này được xử lý ở bước 4 và 6.
