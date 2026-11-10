# Bước 5. Functional requirements

Bản nháp có 14 FR chức năng và 7 NFR, viết từ trên cương vị người thiết kế theo SMART [1, slide 20, 21]; mỗi dòng ghi nó phục vụ UR nào. Các con số ghi “(đx)” là đề xuất của hệ thống, chưa có nguồn, cần giảng viên hoặc bác sĩ chốt.

**Nhu cầu chức năng**

| Mã | Phần mềm phải | Tiêu chí đo | UR |
|---|---|---|---|
| FR1 | Hiển thị việc điều trị hôm nay cho từng vết thương: vị trí, mức, chế độ, thời gian | Thấy ngay ở màn chính, 0 thao tác | UR1 |
| FR2 | Nạp liệu trình vào máy qua USB, kiểm tra toàn vẹn và xác nhận; máy chỉ phát khi có liệu trình hợp lệ và tự ngắt khi đủ thời gian | Sai lệch thời gian ≤ 1 s (đx); 100% gói lỗi bị từ chối | UR2, UR11 |
| FR3 | Tính và hiển thị liều J/cm² của mỗi phiên và lũy kế từng vết thương | Liều = mật độ công suất × thời gian [2, slide 20]; cần số liệu WCMD | UR2, UR7 |
| FR4 | Đọc nhật ký phiên từ máy (thời điểm, mức, chế độ, thời gian phát thực) và gắn vào người bệnh, vết thương | ≥ 95% phiên được ghi nhận (đx) | UR14 |
| FR5 | Chụp ảnh có khung hướng dẫn và vật tham chiếu kích thước, gắn mã vết thương, báo ảnh mờ | 0 ảnh không có mã vết thương | UR3, UR9 |
| FR6 | Ghi đau VAS 0 đến 10 và biến cố; vượt ngưỡng thì báo bác sĩ và hiện hướng dẫn liên hệ | Báo đến bác sĩ ≤ 15 phút khi có mạng (đx); ngưỡng do bác sĩ đặt | UR4 |
| FR7 | Vẽ diễn biến diện tích vết thương cho người bệnh | Cập nhật sau mỗi ảnh được duyệt | UR5 |
| FR8 | Lưu ngoại tuyến, đồng bộ khi có mạng | Giữ ≥ 30 ngày dữ liệu (đx); 0 bản ghi mất | UR6 |
| FR9 | Cho bác sĩ tạo, sửa liệu trình theo từng vết thương trong giới hạn an toàn của WCMD; ghi nhật ký thay đổi | 100% thay đổi có người, giờ, lý do | UR7 |
| FR10 | Xếp người bệnh theo mức cần chú ý; tách 3 trạng thái: đã điều trị, bỏ lỡ, chưa có dữ liệu (kèm lần đồng bộ cuối) | Bác sĩ tìm ra người cần chú ý trong ≤ 30 s (đx, đo bằng thử tác vụ) | UR8 |
| FR11 | AI khoanh vùng và tính diện tích (cm²); bác sĩ sửa vùng; lưu cả giá trị AI và giá trị bác sĩ | Sai số so với bác sĩ: chờ giảng viên chốt | UR9, UR14 |
| FR12 | Xuất dữ liệu theo phiếu nghiên cứu | CSV, đủ trường của phiếu | UR10 |
| FR13 | Gán máy và đầu phát cho người bệnh bằng quét mã; thu hồi khi kết thúc đợt | Một máy chỉ thuộc một người tại một thời điểm | UR11 |
| FR14 | Theo dõi vòng đời máy: số phiên, tổng thời gian phát, lịch bảo dưỡng | Chu kỳ bảo dưỡng do WCMD cung cấp | UR12 |

**Nhu cầu phi chức năng**

| Mã | Phần mềm phải | Tiêu chí hoặc chuẩn | UR |
|---|---|---|---|
| NFR1 | Mã hóa khi truyền và lưu; phân quyền kiểm ở máy chủ; tự đăng xuất; nhật ký truy cập | Luật 91/2025/QH15; ISO/IEC 27001 tham khảo [4, mục 2.2.3] | UR13 |
| NFR2 | Phát triển theo vòng đời phần mềm y tế, quản lý rủi ro và khả dụng | IEC 62304 lớp B, ISO 14971:2019, IEC 62366-1 [5] | UR2, UR13 |
| NFR3 | Tách phần cứng bằng hợp đồng thiết bị, bảng năng lực và thiết bị giả lập | Đổi bo mạch chỉ sửa lớp kết nối | UR15 |
| NFR4 | Giao diện người bệnh dễ đọc, tiếng Việt | Tương phản ≥ 4,5:1, vùng chạm ≥ 44 điểm, chữ ≥ 17 px [5] | UR1, UR3 |
| NFR5 | Tính mọi mốc “hôm nay” theo giờ Việt Nam (UTC+7) | Không sai ngày trong khoảng 0 đến 7 giờ sáng [5] | UR1, UR8 |
| NFR6 | Lưu dữ liệu và chạy AI trên hạ tầng pháp chế cho phép | Chờ bệnh viện xác nhận | UR13 |
| NFR7 | Triển khai thêm bệnh viện bằng cấu hình, không sửa mã | (đx) | UR16 |
