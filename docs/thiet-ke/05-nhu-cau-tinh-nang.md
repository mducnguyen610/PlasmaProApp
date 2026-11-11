# Bước 5. Functional requirements

Bản nháp có 18 FR chức năng (14 FR ban đầu, FR15 đến FR17 thêm cho gán nhãn, FR18 thêm cho hồ sơ người bệnh) và 7 NFR, viết từ trên cương vị người thiết kế theo SMART [1, slide 20, 21]; mỗi dòng ghi nó phục vụ UR nào. Các con số ghi “(đx)” là đề xuất của hệ thống, chưa có nguồn, cần giảng viên hoặc bác sĩ chốt.

**Điều chỉnh theo phạm vi đề tài (11/11/2026):** FR14 (vòng đời máy) và NFR7 (triển khai nhiều bệnh viện) không thuộc dòng nào của bảng phạm vi ở tệp 00, nên hạ xuống nice to have hoặc hướng phát triển. FR8, NFR1 và NFR6 giữ nguyên yêu cầu, nhưng phần máy chủ chỉ được đề xuất. FR11 đổi từ "AI khoanh vùng" thành "tích hợp mô-đun AI có sẵn để khoanh vùng".

**Bổ sung FR18 (11/11/2026):** nhóm chức năng "Quản lý hồ sơ bệnh nhân và mã định danh bệnh nhân" ở giai đoạn 2 của quy trình 9 giai đoạn chưa có FR tương ứng; phát hiện khi lập danh sách màn giai đoạn 5 ([giao-dien-01-danh-sach-man.md](giao-dien-01-danh-sach-man.md)). Không có UR riêng cho việc này; FR18 là điều kiện cho UR14 (dữ liệu liên kết theo từng người), UR11 (mã người bệnh nạp xuống máy), UR13 (đồng ý) và UR7 (liệu trình gắn với người bệnh). Bộ FR nay là FR1 đến FR18.

**Nhu cầu chức năng**

| Mã | Phần mềm phải | Tiêu chí đo | UR |
|---|---|---|---|
| FR1 | Hiển thị việc điều trị hôm nay cho từng vết thương: vị trí, mức, chế độ, thời gian | Thấy ngay ở màn chính, 0 thao tác | UR1 |
| FR2 | Gửi gói cấu hình xuống firmware qua USB/UART gồm patient_id, min_treatment_time, energy_level, treatment_mode và ngày giờ (day, month, year, hour, minute, second); nhận xác nhận, xử lý timeout và gửi lại; máy chỉ phát khi có cấu hình hợp lệ. Giá trị điều trị do bác sĩ quyết định, ứng dụng không tự đặt | Sai lệch thời gian ≤ 1 s (đx); 100% gói lỗi bị từ chối | UR2, UR11 |
| FR3 | Tính và hiển thị liều J/cm² của mỗi phiên và lũy kế từng vết thương | Liều = mật độ công suất × thời gian [2, slide 20]; cần số liệu WCMD | UR2, UR7 |
| FR4 | Đọc nhật ký phiên từ máy (thời điểm, mức, chế độ, thời gian phát thực) và gắn vào người bệnh, vết thương | ≥ 95% phiên được ghi nhận (đx) | UR14 |
| FR5 | Bác sĩ chụp hoặc tải ảnh có khung hướng dẫn; ghi mã ảnh, bệnh nhân, vết thương, thời điểm thu thập; kiểm chất lượng, định dạng; chặn ảnh trùng hoặc thiếu nguồn gốc | 0 ảnh không có mã vết thương hoặc thời điểm thu thập | UR3, UR9, UR17 |
| FR6 | Ghi đau VAS 0 đến 10 và biến cố; vượt ngưỡng thì báo bác sĩ và hiện hướng dẫn liên hệ | Báo đến bác sĩ ≤ 15 phút khi có mạng (đx); ngưỡng do bác sĩ đặt | UR4 |
| FR7 | Vẽ diễn biến diện tích vết thương cho người bệnh | Cập nhật sau mỗi ảnh được duyệt | UR5 |
| FR8 | Lưu ngoại tuyến, đồng bộ khi có mạng | Giữ ≥ 30 ngày dữ liệu (đx); 0 bản ghi mất | UR6 |
| FR9 | Cho bác sĩ tạo, sửa liệu trình theo từng vết thương trong giới hạn an toàn của WCMD; ghi nhật ký thay đổi | 100% thay đổi có người, giờ, lý do | UR7 |
| FR10 | Xếp người bệnh theo mức cần chú ý; tách 3 trạng thái: đã điều trị, bỏ lỡ, chưa có dữ liệu (kèm lần đồng bộ cuối) | Bác sĩ tìm ra người cần chú ý trong ≤ 30 s (đx, đo bằng thử tác vụ) | UR8 |
| FR11 | AI khoanh vùng và tính diện tích (cm²); bác sĩ sửa vùng; lưu cả giá trị AI và giá trị bác sĩ | Sai số so với bác sĩ: chờ giảng viên chốt | UR9, UR14 |
| FR12 | Xuất bộ dữ liệu ảnh có nhãn: chỉ ảnh đã gán nhãn và có đồng ý; giả danh hóa (mã nghiên cứu, bỏ metadata); kèm tệp nhãn và số phiên bản bộ dữ liệu | 0 ảnh thiếu đồng ý hoặc chưa gán nhãn; 0 trường định danh trong bản xuất | UR10, UR13 |
| FR15 | Gán nhãn ảnh theo một phương pháp chọn cùng bác sĩ (phân loại cả ảnh, khung chữ nhật hoặc phân vùng) và bộ nhãn thống nhất | Phương pháp, bộ nhãn chờ bác sĩ chốt; không làm cả ba nếu không cần | UR17 |
| FR16 | Lưu vết nhãn: ghi người gán, thời gian; lưu mọi lần sửa nhãn. Quy trình duyệt nhãn nằm ngoài phạm vi đề tài | 100% thay đổi nhãn có người và giờ | UR14, UR17 |
| FR17 | Quản lý ảnh: danh sách, tìm kiếm, lọc theo bệnh nhân, vết thương, trạng thái nhãn | Tìm thấy một ảnh trong ≤ 3 thao tác (đx) | UR9, UR17 |
| FR18 | Bác sĩ thêm, sửa, tra cứu hồ sơ người bệnh trong phạm vi được phân công; cấp mã hồ sơ duy nhất không chứa họ tên (dùng làm `patient_id` gửi firmware ở FR2); ghi và rút đồng ý dùng ảnh nghiên cứu; tạo tài khoản và mã kích hoạt một lần cho người bệnh; thêm vết thương vào hồ sơ | Mã hồ sơ duy nhất và nằm trong giới hạn `patient_id` của ICD (≤ 16 ký tự `A-Za-z0-9_-`); chặn hồ sơ trùng số điện thoại; 100% lần sửa thông tin có người, giờ, giá trị cũ (đx); tìm thấy một người bệnh trong ≤ 3 thao tác (đx) | UR7, UR11, UR13, UR14 |
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
