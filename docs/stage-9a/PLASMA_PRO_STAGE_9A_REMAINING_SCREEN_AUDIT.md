# Plasma Pro, Stage 9A: rà soát 30 màn còn lại

Nhánh `ui/stage-9a-bo-cuc-con-lai`, tách từ master `6f21314` (đã có Stage 8, 9A vòng 1, 9B, 9C). Rà soát làm trên mã nguồn và ảnh chụp bản dựng web tĩnh của master (390 × 844 và 320 px). Với mỗi màn: mục đích, việc chính, thông tin thiết yếu và thứ yếu, chữ thừa, vấn đề bố cục trước khi sửa. Thứ bậc nút và điều hướng xét chung ở cột "Vấn đề".

Chiều cao "trước" là chiều cao trang đầy đủ ở 390 × 844 chia cho 844 (số màn phải cuộn), đo bằng `chup30.cjs` trên master.

## Nhóm A: tài khoản và pháp lý

| Mã | Mục đích | Việc chính | Thiết yếu | Thứ yếu | Chữ thừa hoặc đặt sai chỗ | Vấn đề bố cục trước (cao) |
|---|---|---|---|---|---|---|
| C02 Tạo tài khoản | Đăng ký tài khoản demo | Điền và gửi biểu mẫu | Vai trò, họ tên, đăng nhập, mật khẩu, đồng ý | Năm sinh, giới | Phụ đề lặp tiêu đề; ghi chú demo nằm giữa biểu mẫu | Một cột dài không chia nhóm; nút Đăng ký ở cuối trang, lỗi hiện xa nút (1,48) |
| C03 Kích hoạt | Bệnh nhân đặt mật khẩu bằng mã bác sĩ đưa | Nhập mã, đặt mật khẩu | Mã hồ sơ, mã 6 số, mật khẩu | Đồng ý điều khoản | Đoạn giới thiệu tách khỏi các ô mà nó giải thích | Không chia bước; nút ở cuối (1,00) |
| C04 Điều khoản | Đọc điều khoản | Đọc và biết phiên bản | Nội dung các mục, phiên bản | Ngày cập nhật | Không | Nhiều thẻ rời, không có tóm tắt đầu trang (1,42) |
| C05 Căn cứ pháp lý | Tra văn bản pháp lý | Tìm văn bản, mở nguồn | Mã, tên đầy đủ, trạng thái đối chiếu | Áp dụng, trong ứng dụng | Câu miễn trừ dài ở đầu | Mỗi văn bản một thẻ mở sẵn, trang 5,70 màn |

## Nhóm B: bác sĩ

| Mã | Mục đích | Việc chính | Thiết yếu | Thứ yếu | Chữ thừa hoặc đặt sai chỗ | Vấn đề bố cục trước (cao) |
|---|---|---|---|---|---|---|
| B04a Sửa hồ sơ | Sửa trường hành chính | Sửa, Lưu | Bệnh nhân đang sửa, các ô sửa được | Trường không đổi | Phụ đề tên và mã (đã có ở ngữ cảnh) | Lỗi lưu nằm xa nút (1,00) |
| B05a Sửa vị trí vết | Sửa vị trí, nhóm tổn thương | Nhập vị trí mới, Lưu | Vị trí đang lưu, vị trí mới | Nhóm tổn thương | Phụ đề lặp ngữ cảnh | Thông báo lỗi xa nút (1,00) |
| B06 Đợt điều trị | Lập phiên bản đợt mới | Ba bước Lịch, Liều, Xác nhận rồi Lưu | Đợt đang áp dụng, biểu mẫu bước, câu hậu quả trạng thái | Lịch sử phiên bản, người sửa | Đoạn giới thiệu đứng trước biểu mẫu | Đợt đang áp dụng chiếm cả trang trước biểu mẫu; nút Tiếp, Lưu cuộn mất (2,28) |
| B07 Đánh giá | Ghi nhận định lâm sàng 4 bước | Chọn mức độ, diễn biến, lưu | Ảnh tham chiếu và diện tích bác sĩ đo ở mọi bước | Đánh giá trước | Câu "ứng dụng chỉ lưu nhận định" lặp mỗi lần mở (nhóm D) | Ảnh tham chiếu chỉ ở bước 1 (2,06) |
| B08 So sánh | So hai ảnh và chênh lệch diện tích | Đọc kết quả, đổi ảnh | Chênh lệch, số ngày, cảnh báo phương pháp | Người nhập, nguồn | Phụ đề | Kết quả nằm dưới hai ảnh (1,08) |
| B08b Lịch sử | Dòng thời gian vết thương | Lọc, mở bản ghi | Bản ghi theo thời gian | Bộ lọc | Phụ đề | Danh sách dài không có mốc tháng (1,07) |
| B08c Bản ghi | Xem một đánh giá | Đọc diện tích, tái đánh giá, hướng dẫn | Hai giá trị và hướng dẫn | Ảnh liên kết | Phụ đề | Hướng dẫn lẫn trong đoạn văn; ảnh lớn đẩy nội dung (1,07) |
| B08d Ảnh | Xem một ảnh | Xem, chuyển ảnh | Ảnh, số đo | Vị trí trong chuỗi | Không | Không biết đang ở ảnh thứ mấy (1,00) |
| B09 Chụp | Chọn hồ sơ và vết để chụp | Chọn, Chụp có hướng dẫn | Bệnh nhân, vết, ảnh gần nhất | Lý do nút khóa | Câu "camera hoặc thư viện" ở cuối (nhóm D) | Không đánh số bước; nút ở cuối nội dung (1,00) |
| B10 Chụp có hướng dẫn | Chụp, khoanh, lưu ảnh | Chụp, kiểm tra, lưu | Thanh bước, chip "Ảnh chưa lưu" | Giải thích chế độ AR | Giải thích chế độ dài ở cuối | Thanh bước nằm dưới khối giải thích (1,02) |
| B11 Chi tiết ảnh | Nhập hoặc xem diện tích | Nhập diện tích | Diện tích bác sĩ đo, đơn vị | Lần đo trước | Không | Giá trị diện tích nhỏ như chữ thường; chọn đơn vị cách xa ô nhập (1,88) |
| B12 Ảnh vết thương | Hàng đợi ghi diện tích | Lọc, mở ảnh | Nhóm chưa đo, ảnh theo bệnh nhân | Bộ lọc ngày | Câu xuất bộ dữ liệu (nhóm D) | Ba hàng nút lọc luôn mở; lưới ảnh không theo bệnh nhân (1,00) |
| B13 Thiết bị (bác sĩ) | Xem tuân thủ của bệnh nhân | Đọc tiến độ đợt | Tiến độ, 7 ngày, phiên | Thông tin máy | Hai ô số trùng với tổng dưới danh sách | Thông tin máy đứng đầu, tiến độ ở cuối (2,05) |

## Nhóm C: bệnh nhân

| Mã | Mục đích | Việc chính | Thiết yếu | Thứ yếu | Chữ thừa hoặc đặt sai chỗ | Vấn đề bố cục trước (cao) |
|---|---|---|---|---|---|---|
| N01 Hướng dẫn lần đầu | Năm bước làm quen | Đọc, Tiếp | Trình tự nạp liệu trình, gọi 115 | Bác sĩ phụ trách | Không | Biểu tượng lớn đẩy nội dung xuống; các bước 1, 2, 3 trông như dấu tích thường; nút 115 ở cuối thẻ (1,07) |
| N03 Lịch trình | Xem lịch, ghi cảm giác | Xem hôm nay, mốc sắp tới | Tiến độ, mốc gần nhất | Mốc đã qua | Câu nhắc xác nhận là đoạn rời | Mốc sắp tới chỉ thấy sau lịch tháng (1,81) |
| N04 Lịch sử và hồ sơ | Xem vết, buổi điều trị | Ghi cảm giác buổi chưa ghi | Buổi gần đây và trạng thái ghi | Thông tin cá nhân | Câu "Chưa ghi cảm giác, chạm để ghi" lặp mỗi dòng | Không có tổng số (1,22) |
| N05 Vết thương | Tổng quan vết của bệnh nhân | Đọc lần đo gần nhất | Diện tích, nhận xét bác sĩ | Đợt điều trị | Không | Nhận xét bác sĩ ở cuối; dòng đợt điều trị tách thẻ (1,75) |
| N06 Đợt điều trị của tôi | Biết liều và lịch | Đọc liều khóa trên máy | Liều, lịch giai đoạn, ghi chú bác sĩ | Người sửa, lý do | Câu "không cần chỉnh gì trên thiết bị" ở cuối màn, xa liều | Thẻ dạng bảng quản lý phiên bản (1,00) |
| N07 Thiết bị của tôi | Nạp liệu trình, báo sự cố | Nạp liệu trình | Trạng thái hôm nay, nút nạp | Thông tin máy, 7 ngày | Không | Ba nút xếp dọc ngang hàng, trạng thái hôm nay tách khỏi nút (1,19) |
| N08 Báo triệu chứng | Gửi triệu chứng hoặc sự cố | Chọn mức đau, Gửi | Cảnh báo khẩn cấp, thang đau | Đã gửi | Không | Chọn loại, thang đau và mô tả trong một thẻ (1,00) |

## Nhóm D: quản trị

| Mã | Mục đích | Việc chính | Thiết yếu | Thứ yếu | Chữ thừa hoặc đặt sai chỗ | Vấn đề bố cục trước (cao) |
|---|---|---|---|---|---|---|
| Q01 Quản lý tài khoản | Duyệt, tìm, phân công | Tìm tài khoản; đổi bác sĩ | Ba ô cần chú ý, danh sách | Số liệu khác, quyền vai trò | Câu "Đổi bác sĩ phụ trách..." lặp với câu trong bảng chọn | Danh sách phẳng không nhóm; phân công không thấy ai giữ bao nhiêu hồ sơ (1,38) |
| Q01b Chi tiết tài khoản | Thao tác trên một tài khoản | Duyệt, cấp quyền, khóa | Trạng thái, quyền | Quyền của vai trò | Phụ đề vai trò lặp dòng "Vai trò" | Nút Duyệt, cấp quyền, khóa chung một thẻ cuối màn, xa trạng thái mà chúng đổi (1,00) |
| Q02 Kho dữ liệu | Xuất bộ dữ liệu nghiên cứu | Lọc, Tải | Số ảnh, quyền, nút tải | Xem trước CSV | Hai câu bảo vệ dữ liệu trong thẻ số liệu | Bộ lọc tách khỏi nút tải (1,54) |
| Q03 Thiết bị | Đăng ký, xem máy | Đăng ký, chẩn đoán | Danh sách, trạng thái kết nối | Firmware | Câu "Bác sĩ phụ trách giao và thu hồi" lặp trong mỗi máy; phụ đề | Hai nút dọc chiếm màn đầu (1,00) |
| Q04 Lỗi hệ thống | Xử lý lỗi đồng bộ | Lọc, đánh dấu đã xử lý | Lỗi chưa xử lý | Lỗi đã xử lý | Không | Tiêu đề ngày không cho biết ngày nào còn việc (1,00) |
| Q04b Chi tiết lỗi | Đọc và đóng một lỗi | Đánh dấu đã xử lý | Nội dung lỗi, trạng thái | Mã bản ghi | Phụ đề thời điểm lặp dòng "Thời điểm" | Nút ở cuối nội dung (1,00) |
| Q05 Chẩn đoán kết nối | Kết nối và hỏi máy | Kết nối, hỏi thông tin | Đường truyền, kết quả hỏi, byte | Đặc tả | Không | Đặc tả (tham chiếu) đứng đầu, nút Kết nối ở giữa trang (1,14) |
| Q06 Thiết bị (kỹ thuật) | Bảo trì, nhật ký | Xem vận hành, phần cứng | Đồng bộ, nguồn, firmware | Tiến độ đợt (chỉ số lâm sàng) | Không | Dòng thông tin không nhóm; tiến độ đợt (không phải việc kỹ thuật) trong thẻ máy (1,17) |

## Giới hạn rà soát

- Rà soát trên trình duyệt máy tính giả lập bề rộng, không phải Android hay iOS thật (BLOCKED như các stage trước).
- Không đo cỡ chữ hệ thống lớn trên máy thật; chỉ dựa vào `maxFontSizeMultiplier` sẵn có và chữ không cắt cứng.
