# Bước 9 đến 15. Kế hoạch các bước còn lại

Các bước này chỉ bắt đầu khi bước 8 đạt validation. Prototype và 41 ca kiểm thử của vòng cũ [5] dùng lại được một phần ở bước 12 và 13.

| # | Bước | Việc chính | Sản phẩm đầu ra | Lấy từ vòng cũ |
|---|---|---|---|---|
| 9 | Design requirements | Chuyển TR thành yêu cầu thiết kế chi tiết cho từng mô-đun mã; viết hợp đồng thiết bị và đặc tả API | Đặc tả phần mềm (SRS) theo IEC 62304 | Đặc tả 39 FR, 11 NFR để đối chiếu, không chép |
| 10 | Detailed design | Thiết kế màn hình, cơ sở dữ liệu, máy trạng thái phiên, giao thức USB | Bản thiết kế chi tiết, sơ đồ ER | Máy trạng thái, ER vòng cũ |
| 11 | Product technical docs | Hồ sơ phần mềm, hồ sơ rủi ro, hướng dẫn sử dụng | Bộ hồ sơ kỹ thuật [3, mục 5.5] | Báo cáo quá trình |
| 12 | Product verif/validation | Kiểm thử đơn vị, tích hợp, giao diện; thử với người dùng theo bảng 8.1 | Báo cáo kiểm thử, ma trận truy vết | 15 tệp kiểm thử, 41 ca giao diện |
| 13 | Prototypes | Ứng dụng chạy với mạch IoT thật và máy chủ thật | Bản chạy được, video demo | Mã nguồn PlasmaProApp |
| 14 | Tests | Thử theo kịch bản lâm sàng trên dữ liệu giả lập, rồi thử nghiệm 30 người bệnh năm 2027 | Chỉ tiêu khả thi của đề cương [3, mục 4.7] | Không |
| 15 | Industrialisation | Chuyển giao, triển khai nhiều bệnh viện | Phương án chuyển giao | Ngoài phạm vi đồ án |

Theo sơ đồ slide 27, nếu bước 14 không đạt thì quay lại Design requirements, hoặc xa hơn nếu lỗi nằm ở nhu cầu.
