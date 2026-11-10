# Câu hỏi mở và tài liệu tham khảo

Bốn câu hỏi đầu chặn bước 6; các câu còn lại chặn việc chốt chỉ tiêu FR.

| # | Hỏi ai | Câu hỏi | Chặn |
|---|---|---|---|
| 1 | WCMD | Plasma Pro theo mô hình HFP (khóa theo y lệnh) hay Plasma-gun? | GA-1 |
| 2 | Nhóm đồ án phần cứng | Đã trả lời một phần: phần cứng dùng USB/UART theo tên đề tài. Còn hỏi: firmware có ghi nhật ký phiên (TR2) không; bộ lệnh, khung dữ liệu, tốc độ baud là gì? | TR1 đến TR3, A1 |
| 3 | WCMD | Mật độ công suất (W/cm²) của từng mức và chế độ, để tính liều J/cm² | FR3 |
| 4 | Pháp chế bệnh viện | Được lưu ảnh và chạy AI ở đâu? | NFR6, A4 |
| 5 | Giảng viên | Ngưỡng tỉ lệ phiên ghi nhận, độ trễ đồng bộ, sai số AI; giữ React Native hay chuyển Kotlin | FR4, FR6, FR11, A1 |
| 6 | Bác sĩ | Phác đồ cho 3 nhóm tổn thương; ngưỡng đau cần cảnh báo; mốc chụp ảnh | FR6, FR9 |
| 7 | Bệnh viện | Bộ vai trò đúng (điều dưỡng, kỹ thuật viên, quản trị viên, nghiên cứu viên) | UR11, UR12 |
| 8 | Người giao mô-đun AI | Mô-đun nhận diện có sẵn ở dạng nào (mô hình chạy trên điện thoại hay dịch vụ máy chủ); đầu vào, đầu ra; đã đo sai số chưa? | C1 hay C2, TR10 |
| 9 | Chủ đồ án | Chức năng USB/UART chạy trên Android, hay cần cả iOS (iOS không hỗ trợ CP2102N) | A1, A2 |

Lỗi trong báo cáo giữa kỳ nên báo nhóm nhúng: mục 3.2.1.1 nói tới "hệ ESP32" trong khi đã chọn PIC16F18875; ngày bìa ghi "10/11/20226"; bảng 3.1 nêu relay gây nhiễu EMI nhưng không nói cách xử lý khi chọn relay [4].

## Tài liệu tham khảo

1. Lương Thị Hồng Liên (2026). *Phương pháp luận thiết kế*, phần 1. Bài giảng, Trường Điện, Điện tử, ĐHBK Hà Nội, 10/04/2026, 36 slide.
2. Planard-Luong Lien (2021). *Plasma Gun pour la cicatrisation et la régénération*. Wound Care Medical Devices SAS, 12/01/2021.
3. Trường ĐH Y Hà Nội, ĐHBK Hà Nội (2026). *Đề xuất nhiệm vụ: Nghiên cứu hoàn thiện công nghệ và thử nghiệm lâm sàng thiết bị plasma lạnh cầm tay tích hợp IoT và AI trong hỗ trợ điều trị liền thương*, bản chốt.
4. Hoàng Đình Việt, Lê Thanh Phương (2026). *Báo cáo giữa kỳ Đồ án thiết kế thiết bị nhúng*. Trường Điện, Điện tử, ĐHBK Hà Nội.
5. Tóm tắt vòng làm việc 10/10 đến 10/11/2026 (sản phẩm tham khảo). Các tài liệu con của vòng cũ chưa được kiểm lại từ bản gốc, nên số liệu trích [5] ở mức chưa xác minh.
6. Apple. *External Accessory*. Tài liệu nhà phát triển, https://developer.apple.com/documentation/externalaccessory (chưa kiểm lại).
7. Android Developers. *USB host overview*, https://developer.android.com/develop/connectivity/usb/host (chưa kiểm lại).

Bốn tài liệu [1] đến [4] là tệp do chủ đồ án cung cấp, không nằm trong kho mã.
