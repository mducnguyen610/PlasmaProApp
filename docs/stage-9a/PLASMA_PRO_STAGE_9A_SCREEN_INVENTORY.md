# Plasma Pro, Stage 9A: kiểm kê màn hình

Trạng thái: **COMPLETE** (bố cục riêng của màn đã làm lại, đã đo 6 bề rộng, đã chạy hồi quy), **IN PROGRESS** (chỉ nhận hệ thống thị giác chung qua token và thành phần dùng chung; bố cục riêng chưa làm lại), **BLOCKED** (cần thiết bị thật hoặc bản dựng gốc), **NOT STARTED**.

Cột "Đo" là kết quả `resp.cjs` ở 320, 360, 390, 768, 1024, 1440 px trên bản dựng web tĩnh (không phải máy thật). Vòng 2 đo bằng `resp2.cjs` (46 mục); "—" là màn không có trong bộ đo; các màn đó vẫn có ảnh chụp trước/sau ở 390 px.

| Mã | Màn | Kiểm | Thiết kế lại | Đo | Hồi quy | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|---|
| C01 | Đăng nhập | Có | Dải navy (điện thoại), bố cục hai cột từ 900 px | — | giao-diện 41/41 | COMPLETE | |
| C02 | Tạo tài khoản | Có | Bốn nhóm đánh số, nút ở chân màn | 6/6 đạt | p1 | COMPLETE |  |
| C03 | Kích hoạt | Có | Hai bước, gợi ý dưới ô, nút ở chân màn | 6/6 đạt | p1 | COMPLETE |  |
| C04 | Điều khoản | Có | Một thẻ văn bản, tóm tắt đầu trang | 6/6 đạt | giao-dien | COMPLETE |  |
| C05 | Căn cứ pháp lý | Có | Danh sách theo nhóm, dòng gọn mở rộng | 6/6 đạt | giao-dien | COMPLETE |  |
| B01 | Trang chủ bác sĩ | Có | Tiêu đề nhóm có chú thích, ô số mới, khối "Vừa xử lý" trong thẻ | 6/6 đạt | đạt | COMPLETE | |
| B02 | Danh sách bệnh nhân | Có | Ô tìm kiếm trong thanh navy, khối lọc gom nhóm, tiêu đề kết quả | 6/6 đạt | đạt | COMPLETE | |
| B03 | Thêm bệnh nhân | Có | Năm sinh và giới một hàng, tiêu đề nhóm, ô đồng ý vai trò checkbox, nút Lưu vẫn trong màn đầu | 6/6 đạt | đạt | COMPLETE | |
| B04 | Hồ sơ bệnh nhân | Có | Thẻ định danh có chữ cái đầu, liên kết 44 px | 6/6 đạt | đạt | COMPLETE | |
| B04a | Sửa hồ sơ | Có | Ngữ cảnh lâm sàng, hai nhóm, lỗi sát nút | 6/6 đạt | quan-ly-ho-so 55/55 | COMPLETE |  |
| B05 | Chi tiết vết thương | Có | Tách định danh và "Hiện trạng", số 34 navy, giá trị tham chiếu | 6/6 (chip 40 px có hitSlop) | đạt | COMPLETE | Xem ghi chú chip ở báo cáo responsive |
| B05a | Sửa vị trí vết | Có | Một nhóm, vị trí đang lưu, lỗi sát nút | 6/6 đạt | quan-ly-ho-so 55/55 | COMPLETE |  |
| B06 | Đợt điều trị | Có | Tóm tắt đợt đang áp dụng, ba bước, nút và câu hậu quả ở chân màn | 6/6 đạt | tb-2, dot-10, p1 | COMPLETE |  |
| B07 | Đánh giá tình trạng | Có | Dải ảnh tham chiếu ở mọi bước | 6/6 đạt | tb-2, dot-10 | COMPLETE |  |
| B08 | So sánh | Có | Thẻ kết quả trên hai ảnh | 6/6 đạt | tb-4 | COMPLETE |  |
| B08b..d | Lịch sử vết thương | Có | Mốc tháng (B08b), ô số và khối hướng dẫn (B08c), "Ảnh n trên N" (B08d) | 6/6 đạt | tb-4 | COMPLETE |  |
| B09 | Chọn hồ sơ để chụp | Có | Ba bước đánh số, nút ở chân màn | 6/6 đạt | tb-3, p0 | COMPLETE |  |
| B10 | Chụp có hướng dẫn | Có | Thanh bước lên đầu, chế độ AR thu gọn | 6/6 đạt | tb-3, 9b | COMPLETE | Camera thật: BLOCKED (ngoài giao diện) |
| B11 | Chi tiết ảnh | Có | Diện tích cỡ lớn, đơn vị sát ô nhập | 6/6 đạt | tb-3, 9b | COMPLETE |  |
| B12 | Ảnh vết thương | Có | Bộ lọc thu gọn, nhóm theo bệnh nhân | 6/6 đạt | p1-01d, dot-12 | COMPLETE | Trước: chữ bị cắt 320 px, nay hết |
| B13 | Thiết bị và nhật ký | Có | Tiến độ đợt lên đầu (mức bác sĩ) | 6/6 đạt | tb-7 | COMPLETE |  |
| B14 | Cá nhân bác sĩ | Có | Thẻ định danh có chữ cái đầu | 6/6 đạt | đạt | COMPLETE | |
| B15 | Không tìm thấy | Có | Màn mới `+not-found.tsx`, chặn `_sitemap` | 6/6 đạt | đạt | COMPLETE | Trước: tràn ngang 320, 360 và lỗi JS |
| N01 | Hướng dẫn lần đầu | Có | Tiêu đề một hàng, số bước, nút 115 dưới tiêu đề | 320, 390 đạt (chup30) | p2 | COMPLETE |  |
| N02 | Trang chủ bệnh nhân | Có | Khối lịch hẹn tách riêng, tiêu đề trạng thái navy | 6/6 đạt | p2, tb-5 | COMPLETE | |
| N03 | Lịch trình | Có | Mốc tiếp theo trong thẻ đầu | 6/6 đạt | p2, dot-11 | COMPLETE | Ô lịch không đổi kích thước |
| N04 | Lịch sử và hồ sơ | Có | Đếm ở tiêu đề, nhãn "Ghi cảm giác" | 6/6 đạt | dot-11, p2 | COMPLETE |  |
| N05 | Vết thương phía bệnh nhân | Có | Nhận xét bác sĩ lên trên, đợt vào thẻ tóm tắt | 6/6 đạt | n05 20/20 | COMPLETE | Dải ảnh cuộn ngang có chủ đích |
| N06 | Đợt điều trị (xem) | Có | Thẻ liều khóa, lịch, mốc, ghi chú | 6/6 đạt | tb-5, p2 | COMPLETE |  |
| N07 | Thiết bị của tôi | Có | Thẻ hôm nay có nút nạp, hai việc phụ cạnh nhau | 6/6 đạt | tb-5, 9b | COMPLETE | USB thật: BLOCKED (ngoài giao diện) |
| N08 | Báo triệu chứng | Có | Khẩn cấp đầu màn, hai thẻ đau và mô tả | 6/6 đạt | p2 | COMPLETE |  |
| N09 | Cá nhân bệnh nhân | Có | Thẻ định danh có chữ cái đầu | 6/6 (một điều khiển chưa có nhãn dưới 44 px) | p2 | COMPLETE | |
| Q01 | Quản lý tài khoản | Có | Nhóm theo vai trò; phân công theo bác sĩ | 6/6 đạt | tb-6 | COMPLETE |  |
| Q01b | Chi tiết tài khoản | Có | Thẻ nhận diện, thao tác cạnh trạng thái | 6/6 đạt | tb-6 | COMPLETE |  |
| Q02 | Kho dữ liệu kỹ thuật | Có | Một thẻ xuất, khung bảo vệ dữ liệu | 6/6 đạt | tb-6 | COMPLETE |  |
| Q03 | Thiết bị | Có | Hai nút cạnh nhau, tiêu đề đếm máy | 6/6 đạt | tb-6 | COMPLETE |  |
| Q04 | Lỗi hệ thống | Có | Đếm lỗi theo ngày | 6/6 đạt | tb-6 | COMPLETE |  |
| Q04b | Chi tiết lỗi | Có | Lỗi là tiêu đề, nút ở chân màn | 6/6 đạt | tb-6 | COMPLETE |  |
| Q05 | Chẩn đoán kết nối | Có | Đường truyền lên đầu, đặc tả thu gọn | 6/6 đạt | tb-6 | COMPLETE |  |
| Q06 | Thiết bị (kỹ thuật) | Có | Nhóm Vận hành, Phần cứng; tiến độ thu gọn | 6/6 đạt | tb-6 | COMPLETE |  |
| Q07 | Cá nhân quản trị | Có | Thẻ định danh có chữ cái đầu | 6/6 đạt | tb-6 | COMPLETE | |
| T01 | Nạp liệu trình | Có | Sơ đồ điện thoại nối máy ở bước kết nối | 6/6 đạt | tb-7, dot-8 | COMPLETE | USB thật: BLOCKED |
| T02 | Theo dõi phiên | Có | Bảng điều khiển navy, đồng hồ 56 trắng; nút Dừng giữ nguyên ở chân màn | 6/6 đạt | tb-7, tb-8, p0 | COMPLETE | Dừng trên máy thật: BLOCKED (giao thức không có lệnh dừng, Stage 7) |
| Chung | Header, thanh tab, thanh bên, Button, Card, NumberTile, Notice, Segmented, Field, Sheet... | Có | Làm lại trong `ui.tsx`, `RoleTabs.tsx` | — | toàn bộ | COMPLETE | |

## Tổng (sau vòng 2, nhánh `ui/stage-9a-bo-cuc-con-lai`)

- COMPLETE: toàn bộ 43 dòng màn của kiểm kê (B08b, B08c, B08d gộp một dòng) và nhóm thành phần chung. 13 màn từ vòng 1 (PR 60), 30 màn từ vòng 2. Bằng chứng: ảnh trước/sau (`anh/con-lai/`), đo 6 bề rộng (`PLASMA_PRO_STAGE_9A_RESPONSIVE_REPORT.md`), 24 kịch bản 832/832 đạt (`PLASMA_PRO_STAGE_9A_VISUAL_REGRESSION_REPORT.md`).
- IN PROGRESS: không.
- BLOCKED (ngoài giao diện web, không tính vào trạng thái bố cục): kiểm trên Android/iOS thật, USB thật, camera thật, dừng khẩn cấp trên máy thật.
- NOT STARTED: không.
- Thêm: trang `/help` "Hướng dẫn và giải thích" (bác sĩ, quản trị).
