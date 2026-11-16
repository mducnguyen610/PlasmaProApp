# Plasma Pro, Stage 9A: báo cáo bố cục riêng 30 màn còn lại

Mỗi màn có bố cục theo việc của chính nó (không áp một khuôn chung). Cột "Cao" là số màn phải cuộn ở 390 × 844, trước (master `6f21314`) và sau (nhánh này). Cao tăng ở một số màn là có chủ đích: nút chính chuyển xuống chân màn cố định (luôn thấy), hoặc nội dung trước đây cắt cụt nay hiện đủ.

Ảnh ghép trước/sau: `anh/con-lai/truoc-sau-con-lai-1-c.jpg` (gói 1), `-2-b.jpg`, `-3-b.jpg`, `-4-n.jpg`, `-5-q.jpg`. Bộ đầy đủ: `/mnt/project-files/datn/stage-9a/bo-cuc-con-lai/anh/` (`truoc/`, `sau/`, `cap/` từng cặp).

## Gói 1: C02 đến C05 (commit `4cd10d8`)

| Mã | Bố cục mới | Cao trước, sau |
|---|---|---|
| C02 | Ghi chú demo thành khung xám ở đầu; bốn nhóm đánh số (Vai trò, Thông tin cá nhân với năm sinh và giới một hàng, Thông tin đăng nhập với hai ô mật khẩu cạnh nhau từ 440 px, Đồng ý); lỗi và nút Đăng ký ở chân màn; thành công là thẻ chính | 1,48, 1,68 (chân màn cố định) |
| C03 | Hai bước "1. Mã từ bác sĩ", "2. Đặt mật khẩu"; câu giới thiệu thành gợi ý dưới từng ô; đồng ý điều khoản thẻ riêng; nút ở chân màn; điều kiện bật nút giữ nguyên | 1,00, 1,09 |
| C04 | Một thẻ văn bản liền, mục cách nhau bằng đường kẻ; khung tóm tắt ở đầu; phiên bản ở phụ đề và cuối văn bản; câu chữ không đổi | 1,42, 1,76 |
| C05 | Mỗi nhóm một danh sách; mỗi văn bản là dòng gọn (mã, tên đầy đủ, dòng phụ, biểu tượng đã đối chiếu), chạm mở Áp dụng, Trong ứng dụng, Mở nguồn; ghi chú màu hổ phách luôn hiện | 5,70, 2,73 |

## Gói 2: B04a đến B08d (commit `af40435`, sửa `bc1542f`)

| Mã | Bố cục mới | Cao trước, sau |
|---|---|---|
| B04a | Ngữ cảnh bệnh nhân thay phụ đề; "Thông tin sửa được" (năm sinh và điện thoại một hàng) rồi "Không đổi ở màn này"; lỗi lưu ở chân màn ngay trên Hủy/Lưu | 1,00, 1,01 |
| B05a | Bỏ phụ đề; một nhóm "Vị trí và nhóm tổn thương" có dòng "Vị trí đang lưu" (giữ cho kiểm thử WD-02 và để so với vị trí mới); lỗi ở chân màn | 1,00, 1,00 |
| B06 | Thứ tự theo việc: ngữ cảnh, chọn vết, thẻ tóm tắt "Đang áp dụng" (phiên bản, trạng thái, giai đoạn, liều, mốc xem lại) kèm mục "Chi tiết phiên bản", rồi "Lập phiên bản N" có chú thích, biểu mẫu ba bước; Quay lại, Tiếp, Lưu và câu hậu quả của trạng thái ở chân màn; lịch sử phiên bản thu gọn | 2,28, 1,88 |
| B07 | Dải ảnh tham chiếu (ảnh nhỏ, mã, ngày, diện tích bác sĩ đo cỡ lớn) hiện ở cả 4 bước; đánh giá trước chỉ ở bước 1; câu nhóm D chuyển sang trang Hướng dẫn | 2,06, 1,94 |
| B08 | Thẻ kết quả (chênh lệch, số ngày, lưu ý) lên trên hai ảnh; mỗi cột ghi Trước/Sau và ngày một hàng, dưới ảnh là diện tích đậm, mã, nguồn, phương pháp, người nhập | 1,08, 1,03 |
| B08b | Bộ lọc ra ngoài thẻ; dòng thời gian chia theo tháng ("Tháng mm/yyyy", "Ngày chưa rõ") | 1,07, 1,13 |
| B08c | Hai ô số "Diện tích ghi trong đánh giá", "Tái đánh giá"; hướng dẫn là khối nổi có nhãn "HƯỚNG DẪN"; ảnh liên kết thành dòng gọn có ảnh nhỏ | 1,07, 1,00 |
| B08d | Thêm "Ảnh n trên N" (cùng thứ tự với nút chuyển ảnh) | 1,00, 1,00 |

## Gói 3: B09 đến B13 (commit `35fdeef`)

| Mã | Bố cục mới | Cao trước, sau |
|---|---|---|
| B09 | Ba bước đánh số theo thứ tự thao tác, mã đã chọn ở cuối dòng tiêu đề mỗi bước; ảnh đại diện chữ cái trong danh sách; nút "Chụp có hướng dẫn" ở chân màn kèm lý do khi khóa; câu "đây sẽ là ảnh đầu tiên" khi vết chưa có ảnh | 1,00, 1,00 |
| B10 | Thanh bước ngay dưới ngữ cảnh; hàng chip "Ảnh chưa lưu" và mục thu gọn "Chế độ: ARCore/ARKit/Không có AR" chứa phần giải thích trước ở cuối màn; lỗi ở chân màn | 1,02, 1,00 |
| B11 | Chế độ xem: diện tích cỡ 34 navy với nhãn "Diện tích bác sĩ đo" và chip nguồn; chế độ sửa: chọn đơn vị ngay dưới ô nhập, trước "Lần đo trước" | 1,88, 1,88 |
| B12 | Bộ lọc gom vào mục thu gọn có tóm tắt lựa chọn; kết quả chia theo bệnh nhân (mã, tên, số ảnh); ô ảnh 2, 3 hoặc 4 cột theo bề rộng | 1,00, 1,00 |
| B13 | Chỉ mức bác sĩ: thẻ "Tiến độ đợt điều trị" lên đầu, rồi 7 ngày và phiên (tổng phiên, phút ở cuối dòng tiêu đề thay hai ô số), "Thông tin thiết bị" xuống cuối | 2,05, 2,01 |

## Gói 4: N01, N03 đến N08 (commit `bc1542f`, `e7ea7cf`)

| Mã | Bố cục mới | Cao trước, sau |
|---|---|---|
| N01 | Biểu tượng và tiêu đề một hàng; câu có số thứ tự ở bước nạp liệu trình hiện số trong vòng tròn; nút "Gọi 115" ngay dưới tiêu đề ở bước khẩn cấp (bản điện thoại); câu chữ không đổi | 1,07, 1,00 |
| N03 | Mốc dự kiến gần nhất hiện trong thẻ đầu ("Mốc tiếp theo (dự kiến)"); mục "Mốc dự kiến" có số mốc và câu nhắc xác nhận với bác sĩ làm chú thích tiêu đề | 1,81, 1,87 |
| N04 | Số vết ở cuối tiêu đề; chú thích "n trên N buổi chưa ghi cảm giác"; buổi chưa ghi có nhãn "Ghi cảm giác" thay câu lặp; nhãn đọc màn hình giữ nguyên | 1,22, 1,30 |
| N05 | Dòng "Đợt điều trị" vào trong thẻ tóm tắt; "Nhận xét của bác sĩ" lên trước "Ảnh và lịch sử"; mục diện tích giữ thứ hai (N05-12 cần "Lần đo gần nhất" trong 740 px đầu) | 1,75, 1,72 |
| N06 | Thẻ riêng cho bệnh nhân: "LIỀU TRÊN MÁY" kèm khung khóa "Thiết bị đã được khóa..." ngay cạnh liều, "LỊCH THEO GIAI ĐOẠN" đánh dấu giai đoạn hiện tại, "MỐC XEM LẠI", "GHI CHÚ CỦA BÁC SĨ", mục thu gọn "Thông tin phiên bản" | 1,00, 1,13 |
| N07 | Thẻ chính gom trạng thái lịch hôm nay và nút "Nạp liệu trình vào máy"; "Theo dõi phiên điều trị" và "Báo sự cố thiết bị" cạnh nhau ngay dưới; điều kiện hiện nút giữ nguyên | 1,19, 1,21 |
| N08 | Cảnh báo khẩn cấp giữ đầu màn, một hàng có biểu tượng; chọn loại đứng riêng; mức đau và mô tả hai thẻ tách nhau; thang, ngưỡng 7/10 và câu cảnh báo không đổi | 1,00, 1,00 |

## Gói 5: Q01 đến Q06 (commit `b0db5fd`)

| Mã | Bố cục mới | Cao trước, sau |
|---|---|---|
| Q01 | Danh sách tài khoản chia theo vai trò, số tài khoản ở cuối tiêu đề nhóm, dòng phụ chỉ còn @tên đăng nhập; phần Phân công chia theo bác sĩ phụ trách kèm số hồ sơ; câu lặp bị bỏ (câu tương tự vẫn hiện khi mở bảng chọn bác sĩ) | 1,38, 1,57 |
| Q01b | Thẻ nhận diện (chữ cái đầu, tên, vai trò, trạng thái); tài khoản chờ duyệt có nút Duyệt trong thẻ; cấp/thu quyền xuất dữ liệu ngay dưới trạng thái quyền; khóa/mở khóa ở mục "Đăng nhập" riêng có chú thích "Mọi thao tác ở đây đều hỏi xác nhận..." | 1,00, 1,00 |
| Q02 | Một thẻ chính: số ảnh sẵn sàng, chip quyền, chọn mã nghiên cứu, nút tải, nội dung ZIP, xem trước CSV; hai câu bảo vệ dữ liệu gom vào khung có biểu tượng khiên; lưới có chú thích số ảnh | 1,54, 1,53 |
| Q03 | Hai nút Đăng ký và Chẩn đoán cạnh nhau; tiêu đề danh sách "N thiết bị" với "m/N trực tuyến" và chú thích giao/thu hồi (nêu một lần); trong máy là dòng "Đang giao cho", "Firmware" | 1,00, 1,00 |
| Q04 | Tiêu đề ngày có số lỗi và số chưa xử lý (màu đỏ khi còn) | 1,00, 1,00 |
| Q04b | Nội dung lỗi là tiêu đề thẻ, biểu tượng và trạng thái cạnh; bỏ phụ đề trùng thời điểm; "Đánh dấu đã xử lý" ở chân màn | 1,00, 1,00 |
| Q05 | Thẻ "Đường truyền" (trạng thái, Kết nối/Ngắt, chọn USB thật hay giả lập) lên đầu; "Máy đang kết nối" ngay dưới; bản ghi byte; "Đặc tả đang dùng" thu gọn có tóm tắt; đặc tả lỗi thì báo đỏ ở đầu màn | 1,14, 1,00 |
| Q06 | Mức kỹ thuật: dòng thông tin chia "VẬN HÀNH" và "PHẦN CỨNG"; tiến độ đợt (chỉ số tuân thủ, với kỹ thuật chỉ tham khảo) thu gọn sau hai ô số | 1,17, 1,00 |

## Trang mới: Hướng dẫn và giải thích (`/help`, commit `719fa41`)

Mở từ tab Cá nhân của bác sĩ và quản trị (dòng "Hướng dẫn và giải thích"). Chứa nguyên văn các câu nhóm D đã chuyển khỏi B07, B09, B12, Q01. Bệnh nhân vẫn dùng "Hướng dẫn sử dụng" (N01) như trước; mở `/help` bằng tài khoản bệnh nhân chỉ thấy lối vào N01. Biểu tượng thông tin theo ngữ cảnh: đã xét, chưa thêm, vì các câu còn lại trên màn đều là nhóm A, B, C (xem báo cáo phụ đề).
