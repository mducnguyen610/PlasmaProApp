# Bước 4. Analyse

Có 5 mâu thuẫn cần thỏa hiệp trước khi viết FR; mâu thuẫn A1 là lớn nhất vì nó quyết định kiến trúc. Theo bài giảng, thiết kế là “lựa chọn, ưu tiên và thỏa hiệp giữa các yêu cầu thường khá mâu thuẫn” [1, slide 15].

| Mã | Mâu thuẫn | Phương án thỏa hiệp (đề xuất) |
|---|---|---|
| A1 | UR14 cần dữ liệu từng phiên tự động; GA-2 không có kết nối sau khi rút cáp | Mạch ghi nhật ký phiên vào bộ nhớ; ứng dụng đọc lại mỗi lần cắm cáp. Hoặc bổ sung BLE. Cần WCMD trả lời |
| A2 | UR7 đổi liệu trình từ xa; GA-2 chỉ nạp liệu trình qua cáp | Liệu trình mới về điện thoại qua máy chủ; ứng dụng nhắc người bệnh cắm cáp để nạp trước phiên kế |
| A3 | UR1, UR3 cần đơn giản cho người cao tuổi; UR10, UR14 cần nhiều dữ liệu | Lấy tự động từ máy mọi thứ có thể; người bệnh chỉ làm 3 việc: chiếu, chụp ảnh, báo đau |
| A4 | UR9 cần AI xử lý ảnh; UR13 hạn chế đưa ảnh ra ngoài | AI chạy trên máy chủ trong nước hoặc trên điện thoại; chờ bệnh viện xác nhận |
| A5 | UR6 dùng khi mất mạng; UR8 bác sĩ cần dữ liệu mới | Ứng dụng lưu trước, đồng bộ sau; màn bác sĩ ghi rõ thời điểm đồng bộ cuối, phân biệt “chưa có dữ liệu” |

Phân loại ưu tiên dựa trên đầu ra bắt buộc của đề cương [3, mục 5.2, 5.3, 4.7]: UR có trong chỉ tiêu nghiệm thu (quản lý thiết bị, ghi nhận thông số, ảnh, đồng bộ, phân quyền, AI đo diện tích) là must have. UR chỉ phục vụ thương mại hóa hoặc tiện lợi là nice to have.

Chỉ tiêu cần giảng viên chốt để FR đo được (SMART): tỉ lệ phiên được ghi nhận đầy đủ, độ trễ đồng bộ, sai số đo diện tích của AI so với bác sĩ. Đề cương nêu các chỉ tiêu này nhưng không cho ngưỡng số [3, mục 3.2].
