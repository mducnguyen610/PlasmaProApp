# Bước 14. Tests

Trạng thái: **bản nháp**. Bước 14 của bài giảng là thử sản phẩm trong điều kiện dùng thật. Trong đề tài chỉ làm được thử trên dữ liệu giả lập; thử nghiệm lâm sàng 30 người bệnh năm 2027 thuộc đề cương của ĐH Y [1, mục 4.7], nằm ngoài đề tài.

## 14.1. Kịch bản thử trên dữ liệu giả lập

| Mã | Kịch bản | Bước | Kết quả mong đợi |
|---|---|---|---|
| T1 | Đợt điều trị trọn vẹn | Bác sĩ tạo người bệnh, vết thương, liệu trình 14 ngày; người bệnh nạp máy, chạy phiên mỗi ngày | Tổng quan bác sĩ hiện đủ 14 ngày "đã chiếu" |
| T2 | Bỏ lỡ phiên | Như T1, bỏ 2 ngày | 2 ngày "bỏ lỡ", người bệnh lên đầu danh sách cần chú ý |
| T3 | Đổi liệu trình giữa đợt | Bác sĩ lưu phiên bản 2 | Màn kết nối báo cần nạp lại; nhật ký gửi ghi phiên bản 2 |
| T4 | Máy từ chối | Giả lập trả NAK | Ứng dụng báo lỗi, không ghi "đã nạp" |
| T5 | Rút cáp giữa phiên | Ngắt giả lập hoặc rút cáp thật | Màn theo dõi báo mất kết nối, không ghi phiên hoàn tất |
| T6 | Báo đau cao | Người bệnh ghi VAS 8 | Bác sĩ thấy cảnh báo trên tổng quan |
| T7 | Xuất bộ dữ liệu | Có ảnh có và không có đồng ý | Bản xuất chỉ chứa ảnh có đồng ý, không có họ tên, không có EXIF |

## 14.2. Tiêu chí

Mọi kịch bản T1 đến T7 đạt trên bản P1 và T3 đến T5 đạt trên bản P3 với mạch thật. Nếu không đạt, theo slide 27 quay lại bước 9 (Design requirements) hoặc xa hơn nếu lỗi nằm ở nhu cầu.

[1] Đề cương nghiên cứu Plasma Pro (bản chốt), mục 4.7 (tài liệu nội bộ người dùng gửi).
