# Bước 7. Conceptual design

Mỗi khối cấp 1 nhận các nhu cầu kỹ thuật TR, ghi tương tác vào ra và chỉ tiêu kiểm chứng được, theo slide 28 [1]. Khối mạch IoT có 3 TR mới (TR1 đến TR3) cần nhóm đồ án nhúng đồng ý, vì mạch giữa kỳ chưa ghi nhật ký phiên [4, mục 4.2].

Mức thực hiện theo phạm vi đề tài (tệp 00):

- **Lập trình:** TR4, TR5 (phía ứng dụng), TR6, TR11, TR12, và phía ứng dụng của TR3 (gửi lệnh, nhận và kiểm dữ liệu).
- **Yêu cầu gửi đồ án phần cứng:** TR1, TR2 và phía firmware của TR3. Nếu firmware không đáp ứng, FR liên quan giảm phạm vi thay vì đề tài tự sửa firmware.
- **Chỉ đề xuất:** TR7, TR8, TR9 (backend, database), và phía máy chủ của TR5.
- **Tích hợp:** TR10. Chỉ tiêu đo sai số dùng để nghiệm thu việc tích hợp, không dùng để đánh giá việc huấn luyện mô hình.

| Mã | Khối | Nhu cầu kỹ thuật | Vào, ra | Chỉ tiêu | Từ FR |
|---|---|---|---|---|---|
| TR1 | Mạch IoT | Lưu liệu trình có mã kiểm tra; từ chối gói sai | Vào: gói liệu trình qua USB | 100% gói sai bị từ chối | FR2 |
| TR2 | Mạch IoT | Ghi nhật ký phiên: giờ bắt đầu, mức, chế độ, giây phát thực; giữ khi mất pin | Ra: nhật ký qua USB | Số phiên lưu được: cần tính theo bộ nhớ của PIC và có cần đồng hồ thời gian thực không | FR4 |
| TR3 | Mạch IoT | Bộ lệnh USB: ghi liệu trình, đọc nhật ký, đọc mã thiết bị, đọc phiên bản firmware | Hai chiều với ứng dụng | Mô tả trong hợp đồng thiết bị | FR2, FR4, FR13 |
| TR4 | Ứng dụng người bệnh | Lớp hợp đồng thiết bị với 2 bản cài: USB thật và giả lập | Giữa giao diện và TR3 | Kiểm thử chạy được không cần máy thật | NFR3 |
| TR5 | Ứng dụng người bệnh | Kho cục bộ và hàng đợi đồng bộ; mỗi bản ghi có mã duy nhất để gửi lại không bị nhân đôi | Ra: máy chủ | 0 bản ghi mất hoặc trùng khi mất mạng giữa chừng | FR8 |
| TR6 | Ứng dụng người bệnh | Màn chính một việc; chụp ảnh có khung và vật tham chiếu | Vào: camera | NFR4 | FR1, FR5, FR6 |
| TR7 | Máy chủ IoMT | Xác thực; phân quyền theo vai trò và theo quan hệ bác sĩ, người bệnh, kiểm ở máy chủ | Hai ứng dụng | 0 truy cập chéo trong kiểm thử | NFR1 |
| TR8 | Máy chủ IoMT | Mô hình dữ liệu: người bệnh, vết thương, đợt, liệu trình có phiên bản, phiên, ảnh, kết quả đo | Nội bộ | Mọi phiên truy ngược được về liệu trình đã dùng | FR4, FR9, UR14 |
| TR9 | Máy chủ IoMT | Nhật ký kiểm toán; tính trạng thái theo giờ Việt Nam | Nội bộ | NFR5 | FR9, FR10 |
| TR10 | Lớp tích hợp mô-đun AI | Gói mô-đun có sẵn sau một giao diện chung: vào ảnh, ra vùng tổn thương, diện tích cm², độ tin cậy, phiên bản mô hình | Với ứng dụng (C2) hoặc máy chủ (C1) | Sai số chờ giảng viên chốt; chạy được với mô-đun giả khi chưa có mô-đun thật | FR11 |
| TR11 | Ứng dụng bác sĩ, ĐD | Soạn liệu trình trong giới hạn của bảng năng lực thiết bị; hiện liều J/cm² | Với máy chủ | Không lưu được liệu trình vượt giới hạn | FR3, FR9 |
| TR12 | Ứng dụng bác sĩ, ĐD | Màn tổng quan xếp hạng; quét mã để gán máy | Với máy chủ | FR10 | FR10, FR13 |

Bước này cũng là lúc lập cây chức năng và cây kết cấu (FAST) như slide 29, 30 [1]: FR ở gốc, TR ở tầng 2, mô-đun mã nguồn ở lá. Việc này nên làm sau khi bước 8 xác nhận TR.
