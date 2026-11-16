# Plasma Pro, Stage 9A: rà soát phụ đề và chữ giải thích (43 màn)

Nhóm: **A** vận hành (cho biết đang thao tác trên ai, cái gì, bao nhiêu), **B** an toàn, **C** quyết định lâm sàng, **D** giải thích chung (chuyển sang trang Hướng dẫn), **E** hướng dẫn chi tiết (chuyển vào trợ giúp theo ngữ cảnh: gợi ý dưới ô, chú thích tiêu đề, mục thu gọn), **F** thừa (bỏ).

Quy tắc đã giữ: không chuyển cảnh báo an toàn, thông tin quyết định lâm sàng, trạng thái thiết bị, hướng dẫn thao tác quan trọng ra khỏi màn của chúng; không bỏ phụ đề hàng loạt. Câu chuyển đi giữ nguyên văn. Nguồn: `grep subtitle` trên 43 tệp màn và đọc mã từng màn.

## 1. Phụ đề thanh tiêu đề

| Mã | Phụ đề (trước) | Nhóm | Quyết định |
|---|---|---|---|
| C01 | Không có | | |
| C02 | Có (lặp tiêu đề) | F | Bỏ |
| C03 | "Dùng mã bác sĩ đưa khi tạo hồ sơ" | A | Giữ |
| C04 | "Phiên bản …" | A | Giữ |
| C05 | "N văn bản, M đã đối chiếu nguồn" (mới ở vòng này) | A | Giữ |
| B01 | "Xin chào, tên" | A (tài khoản đang đăng nhập) | Giữ (màn COMPLETE) |
| B02 | "N hồ sơ đang theo dõi" | A | Giữ |
| B03 | "Mã hồ sơ được cấp tự động" | A | Giữ |
| B04 | "Tên · mã" | A (đúng bệnh nhân) | Giữ |
| B04a | "Tên · mã" | F (trùng thẻ ngữ cảnh lâm sàng mới) | Bỏ, thay bằng `ClinicalContext`; nhánh hồ sơ đã lưu trữ giữ |
| B05 | Không có | | |
| B05a | "Mã vết · tên" | F (trùng ngữ cảnh) | Bỏ ở nhánh chính |
| B06 | Không có | | |
| B07 | Không có | | |
| B08 | Có (giải thích so sánh) | F | Bỏ; kết quả và lưu ý đã lên thẻ đầu |
| B08 (chọn ảnh) | "Vết thương X, mới trước" | A | Giữ |
| B08b | Có (mô tả dòng thời gian) | F | Bỏ |
| B08c | Có (loại bản ghi) | F (trùng tiêu đề) | Bỏ |
| B08d | "Mã vết · ngày" | A | Giữ |
| B09 | "Ảnh vào đúng hồ sơ, rồi ghi diện tích" | B (nhắc đúng hồ sơ) | Giữ |
| B10 | Không có | | |
| B11 | Không có | | |
| B12 | "Ghi diện tích cho ảnh đã chụp" | A | Giữ |
| B13 | "TB-xxx" | A | Giữ |
| B14 | Không có | | |
| B15 | Không có | | |
| N01 | "Bước i/5" | A | Giữ |
| N02 | "Tên · mã" | A | Giữ |
| N03 | Không có | | |
| N04 | "Tên · mã" | A (máy demo dùng chung nhiều tài khoản) | Giữ |
| N05 | Không có | | |
| N06 | "Mã vết: vị trí" | A | Giữ |
| N07 | "TB-xxx" | A | Giữ |
| N08 | Không có | | |
| N09 | Không có | | |
| Q01 | Không có | | |
| Q01b | "Vai trò" | F (đã có trong thẻ nhận diện) | Bỏ |
| Q02 | "Ảnh và diện tích do bác sĩ cung cấp" | C (nguồn gốc số liệu nghiên cứu) | Giữ |
| Q03 | "Đăng ký và theo dõi thiết bị" | F | Bỏ |
| Q04 | "Lỗi đồng bộ thiết bị và máy chủ" | A (phạm vi danh sách) | Giữ |
| Q04b | "Thời điểm" | F (trùng dòng "Thời điểm") | Bỏ |
| Q05 | Trạng thái đường truyền | A, B (trạng thái thiết bị) | Giữ |
| Q06 | "TB-xxx" | A | Giữ |
| Q07 | Không có | | |
| T01 | Không có | | |
| T02 | Không có | | |

Tổng: 9 phụ đề bỏ (nhóm F), 26 giữ, các màn còn lại không có phụ đề.

## 2. Chữ giải thích trong thân màn (đã đổi chỗ)

| Màn | Câu | Nhóm | Nơi mới |
|---|---|---|---|
| B07 | "Ứng dụng chỉ lưu nhận định của bác sĩ; không tự suy luận tình trạng hay đề xuất liệu trình." | D | Trang Hướng dẫn, mục "Đánh giá vết thương" |
| B09 | "Mở bước chụp để dùng camera hoặc chọn ảnh từ thư viện, rồi kiểm tra trước khi lưu." | D | Trang Hướng dẫn, "Chụp ảnh vết thương" |
| B12 | "Ảnh đã có diện tích và được xác nhận chia sẻ sẽ do quản trị kỹ thuật xuất thành bộ dữ liệu nghiên cứu." | D | Trang Hướng dẫn, "Ảnh vết thương và bộ dữ liệu nghiên cứu" |
| Q01 | "Đổi bác sĩ phụ trách cho từng hồ sơ. Hồ sơ chỉ đổi sau khi xác nhận." | D (câu gần giống vẫn hiện khi mở bảng chọn) | Trang Hướng dẫn, "Phân công bác sĩ phụ trách" |
| C03 | Đoạn giới thiệu mã và mật khẩu | E | Gợi ý dưới ô "Mã hồ sơ", "Mã kích hoạt" |
| B06 | "Mỗi vết thương một đợt. Giá trị điều trị cụ thể do nhóm chuyên môn đặt…" | C | Chú thích của tiêu đề "Lập phiên bản N" (vẫn ở màn) |
| B10 | Giải thích chế độ AR ở cuối màn | E | Mục thu gọn "Chế độ: …" cạnh chip "Ảnh chưa lưu" |
| N03 | "Ngày do ứng dụng tính từ lịch bác sĩ đặt. Hãy xác nhận với bác sĩ." | B | Chú thích tiêu đề "Mốc dự kiến" (vẫn ở màn) |
| Q03 | "Bác sĩ phụ trách giao và thu hồi máy trên hồ sơ bệnh nhân." lặp ở mỗi máy | A | Nêu một lần ở chú thích tiêu đề danh sách |
| Q01b | "Mọi thao tác ở đây đều hỏi xác nhận trước khi đổi." | A | Chú thích tiêu đề mục "Đăng nhập" |
| N04 | "Chưa ghi cảm giác, chạm để ghi" ở mỗi dòng | F (lặp) | Nhãn "Ghi cảm giác"; nhãn đọc màn hình giữ đủ câu |

## 3. Chữ an toàn và lâm sàng: giữ tại chỗ hoặc đưa gần hơn

| Màn | Câu | Nhóm | Thay đổi |
|---|---|---|---|
| N08 | "Khi khẩn cấp, hãy gọi 115…", "Ứng dụng không thay thế cấp cứu…", cảnh báo mức đau từ 7/10 | B | Giữ đầu màn, thêm biểu tượng; cảnh báo đau ngay dưới thang |
| N01 | Bước khẩn cấp, nút "Gọi 115" | B | Nút lên ngay dưới tiêu đề bước |
| N06 | "Thiết bị đã được khóa theo mức năng lượng và thời gian bác sĩ đặt. Bạn không cần chỉnh gì trên thiết bị." | B | Từ cuối màn lên ngay dưới liều |
| B06 | Câu hậu quả của trạng thái (ví dụ "Đang áp dụng: cần mức năng lượng…") | C | Ở chân màn, ngay trên nút Lưu (D10-06h) |
| B08 | Lưu ý phương pháp khác nhau, ảnh đảo thứ tự, chưa đủ số đo | C | Giữ, lên trước kết quả |
| B13, Q06 | "Chỉ số tuân thủ, không phải đánh giá vết thương…" | C | Giữ cùng thẻ tiến độ |
| Q02 | Hai câu bảo vệ dữ liệu | B | Gom vào khung khiên ngay dưới thẻ xuất |
| Q05 | Lỗi đặc tả | B | Lên đầu màn, màu đỏ |
| T02 | Nút Dừng | B | Không đổi (màn COMPLETE) |

## 4. Trang Hướng dẫn và biểu tượng ngữ cảnh

- Trang `/help` ("Hướng dẫn và giải thích"), lối vào ở tab Cá nhân của bác sĩ (B14) và quản trị (Q07). Thay đổi trên `AccountScreen` chỉ là thêm một dòng cài đặt, không đổi bố cục ba màn COMPLETE.
- Biểu tượng "i" theo ngữ cảnh: chưa thêm, vì sau khi phân loại không còn câu nhóm D nào trên màn làm việc ngoài bốn câu đã chuyển; các câu còn lại thuộc A, B, C nên phải hiện sẵn.
