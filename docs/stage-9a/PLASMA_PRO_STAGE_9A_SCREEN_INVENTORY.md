# Plasma Pro, Stage 9A: kiểm kê màn hình

Trạng thái: **COMPLETE** (bố cục riêng của màn đã làm lại, đã đo 6 bề rộng, đã chạy hồi quy), **IN PROGRESS** (chỉ nhận hệ thống thị giác chung qua token và thành phần dùng chung; bố cục riêng chưa làm lại), **BLOCKED** (cần thiết bị thật hoặc bản dựng gốc), **NOT STARTED**.

Cột "Đo" là kết quả `resp.cjs` ở 320, 360, 390, 768, 1024, 1440 px trên bản dựng web tĩnh (không phải máy thật). "—" là màn không có trong bộ đo 33 màn; các màn đó vẫn có ảnh chụp trước/sau ở 390 px.

| Mã | Màn | Kiểm | Thiết kế lại | Đo | Hồi quy | Trạng thái | Ghi chú |
|---|---|---|---|---|---|---|---|
| C01 | Đăng nhập | Có | Dải navy (điện thoại), bố cục hai cột từ 900 px | — | giao-diện 41/41 | COMPLETE | |
| C02 | Tạo tài khoản | Có | Chỉ hệ thống chung | — | p1 | IN PROGRESS | |
| C03 | Kích hoạt | Có | Chỉ hệ thống chung | — | p1 | IN PROGRESS | |
| C04 | Điều khoản | Có | Chỉ hệ thống chung | — | — | IN PROGRESS | |
| C05 | Căn cứ pháp lý | Có | Chỉ hệ thống chung | — | — | IN PROGRESS | |
| B01 | Trang chủ bác sĩ | Có | Tiêu đề nhóm có chú thích, ô số mới, khối "Vừa xử lý" trong thẻ | 6/6 đạt | đạt | COMPLETE | |
| B02 | Danh sách bệnh nhân | Có | Ô tìm kiếm trong thanh navy, khối lọc gom nhóm, tiêu đề kết quả | 6/6 đạt | đạt | COMPLETE | |
| B03 | Thêm bệnh nhân | Có | Năm sinh và giới một hàng, tiêu đề nhóm, ô đồng ý vai trò checkbox, nút Lưu vẫn trong màn đầu | 6/6 đạt | đạt | COMPLETE | |
| B04 | Hồ sơ bệnh nhân | Có | Thẻ định danh có chữ cái đầu, liên kết 44 px | 6/6 đạt | đạt | COMPLETE | |
| B04a | Sửa hồ sơ | Có | Chỉ hệ thống chung | — | quan-ly-ho-so 55/0 | IN PROGRESS | |
| B05 | Chi tiết vết thương | Có | Tách định danh và "Hiện trạng", số 34 navy, giá trị tham chiếu | 6/6 (chip 40 px có hitSlop) | đạt | COMPLETE | Xem ghi chú chip ở báo cáo responsive |
| B05a | Sửa vị trí vết | Có | Chỉ hệ thống chung | — | quan-ly-ho-so | IN PROGRESS | |
| B06 | Đợt điều trị | Có | Chỉ hệ thống chung | 6/6 đạt | tb-2, p1 | IN PROGRESS | |
| B07 | Đánh giá tình trạng | Có | Chỉ hệ thống chung | 6/6 đạt | tb-2 | IN PROGRESS | |
| B08 | So sánh | Có | Chỉ hệ thống chung | 6/6 đạt | tb-4 | IN PROGRESS | |
| B08b..d | Lịch sử vết thương | Có | Chỉ hệ thống chung | 6/6 đạt (B08b) | tb-4 | IN PROGRESS | |
| B09 | Chọn hồ sơ để chụp | Có | Chỉ hệ thống chung | 6/6 đạt | tb-3 | IN PROGRESS | |
| B10 | Chụp có hướng dẫn | Có | Chỉ hệ thống chung | 6/6 đạt | tb-3 | IN PROGRESS | Camera thật: BLOCKED |
| B11 | Chi tiết ảnh | Có | Chỉ hệ thống chung | 6/6 đạt | tb-3 | IN PROGRESS | |
| B12 | Ảnh vết thương | Có | Chỉ hệ thống chung | 6/6 đạt | đạt | IN PROGRESS | Trước: chữ bị cắt 320 px, nay hết |
| B13 | Thiết bị và nhật ký | Có | Chỉ hệ thống chung | 6/6 đạt | tb-7 | IN PROGRESS | |
| B14 | Cá nhân bác sĩ | Có | Thẻ định danh có chữ cái đầu | 6/6 đạt | đạt | COMPLETE | |
| B15 | Không tìm thấy | Có | Màn mới `+not-found.tsx`, chặn `_sitemap` | 6/6 đạt | đạt | COMPLETE | Trước: tràn ngang 320, 360 và lỗi JS |
| N01 | Hướng dẫn lần đầu | Có | Chỉ hệ thống chung | — | p2 | IN PROGRESS | |
| N02 | Trang chủ bệnh nhân | Có | Khối lịch hẹn tách riêng, tiêu đề trạng thái navy | 6/6 đạt | p2, tb-5 | COMPLETE | |
| N03 | Lịch trình | Có | Chỉ hệ thống chung | 6/6 (ô lịch dưới 44 px) | p2 | IN PROGRESS | Ô lịch không đổi kích thước |
| N04 | Lịch sử và hồ sơ | Có | Chỉ hệ thống chung | 6/6 đạt | p2 | IN PROGRESS | |
| N05 | Vết thương phía bệnh nhân | Có | Chỉ hệ thống chung | 6/6 đạt | n05 | IN PROGRESS | Dải ảnh cuộn ngang có chủ đích |
| N06 | Đợt điều trị (xem) | Có | Chỉ hệ thống chung | 6/6 đạt | p2 | IN PROGRESS | |
| N07 | Thiết bị của tôi | Có | Chỉ hệ thống chung | 6/6 đạt | tb-7 | IN PROGRESS | |
| N08 | Báo triệu chứng | Có | Chỉ hệ thống chung | 6/6 đạt | p2 | IN PROGRESS | |
| N09 | Cá nhân bệnh nhân | Có | Thẻ định danh có chữ cái đầu | 6/6 (một điều khiển chưa có nhãn dưới 44 px) | p2 | COMPLETE | |
| Q01 | Quản lý tài khoản | Có | Chỉ hệ thống chung (ô số mới) | 6/6 đạt | tb-6 | IN PROGRESS | |
| Q01b | Chi tiết tài khoản | Có | Chỉ hệ thống chung | — | tb-6 | IN PROGRESS | |
| Q02 | Kho dữ liệu kỹ thuật | Có | Chỉ hệ thống chung | 6/6 (tên tệp cắt bằng dấu ba chấm, có chủ đích) | tb-6 | IN PROGRESS | |
| Q03 | Thiết bị | Có | Chỉ hệ thống chung | 6/6 đạt | tb-6 | IN PROGRESS | |
| Q04 | Lỗi hệ thống | Có | Chỉ hệ thống chung | 6/6 đạt | tb-6 | IN PROGRESS | |
| Q04b | Chi tiết lỗi | Có | Chỉ hệ thống chung | — | tb-6 | IN PROGRESS | |
| Q05 | Chẩn đoán kết nối | Có | Chỉ hệ thống chung | 6/6 đạt | tb-6 | IN PROGRESS | |
| Q06 | Thiết bị (kỹ thuật) | Có | Chỉ hệ thống chung | 6/6 đạt | tb-6 | IN PROGRESS | |
| Q07 | Cá nhân quản trị | Có | Thẻ định danh có chữ cái đầu | 6/6 đạt | tb-6 | COMPLETE | |
| T01 | Nạp liệu trình | Có | Sơ đồ điện thoại nối máy ở bước kết nối | 6/6 đạt | tb-7, dot-8 | COMPLETE | USB thật: BLOCKED |
| T02 | Theo dõi phiên | Có | Bảng điều khiển navy, đồng hồ 56 trắng; nút Dừng giữ nguyên ở chân màn | 6/6 đạt | tb-7, tb-8, p0 | COMPLETE | Dừng trên máy thật: BLOCKED (giao thức không có lệnh dừng, Stage 7) |
| Chung | Header, thanh tab, thanh bên, Button, Card, NumberTile, Notice, Segmented, Field, Sheet... | Có | Làm lại trong `ui.tsx`, `RoleTabs.tsx` | — | toàn bộ | COMPLETE | |

## Tổng

- Kiểm: 45 mục (44 màn và nhóm thành phần chung), gồm cả B08b..d gộp một dòng.
- COMPLETE: 13 màn có bố cục riêng làm lại (C01, B01, B02, B03, B04, B05, B14, B15, N02, N09, Q07, T01, T02) và nhóm thành phần chung.
- IN PROGRESS: 30 dòng (B08b..d tính một dòng), đã nhận hệ thống thị giác chung, chưa làm bố cục riêng.
- BLOCKED (ngoài giao diện web): kiểm trên Android/iOS thật, USB thật, camera thật, dừng khẩn cấp trên máy thật.
- NOT STARTED: không.
