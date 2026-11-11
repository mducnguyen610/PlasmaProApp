# Bước 1. Initial Idea

Ý tưởng: **ứng dụng điện thoại giúp người bệnh dùng máy plasma lạnh tại nhà đúng y lệnh, trao đổi dữ liệu với máy qua USB/UART, nhận diện vết thương từ ảnh, và giúp bác sĩ theo dõi quá trình điều trị.** Ba câu hỏi theo slide 13 [1]:

| Câu hỏi | Trả lời cho phần mềm Plasma Pro | Nguồn |
|---|---|---|
| Cho ai? | Hai vai trò sử dụng ứng dụng: người bệnh có vết thương chậm liền (có người nhà hỗ trợ) và bác sĩ điều trị. Nhóm nghiên cứu lâm sàng ĐH Y Hà Nội hưởng lợi từ dữ liệu nhưng không dùng ứng dụng. Vai trò quản trị viên được giữ để quản lý tài khoản và thiết bị; không có điều dưỡng, kỹ thuật viên (chủ đồ án chốt ngày 11/11/2026) | [3, mục 4.4, 5.2], [4, mục 2.1] |
| Tác động lên gì? | Quá trình dùng thiết bị (liều, thời gian, tần suất, sự tuân thủ), qua dữ liệu gửi và nhận với firmware bằng USB/UART; dữ liệu diễn biến vết thương (ảnh, vùng tổn thương, diện tích, đau, biến cố). Không tác động trực tiếp lên mô | [3, mục 2, 4.2], [4, mục 3.1.3] |
| Để làm gì? | Điều trị tại nhà an toàn, đúng liều; bác sĩ điều chỉnh liệu trình dựa trên dữ liệu; tạo bộ dữ liệu liên kết thiết bị, ảnh, lâm sàng cho thử nghiệm 30 người bệnh và cho AI | [3, mục 1.2, 4.7] |

Phạm vi loại trừ (xem bảng phạm vi ở tệp 00):

- Công nghệ lõi tạo plasma, bản thân máy và firmware thuộc WCMD và đồ án phần cứng [3, mục 3].
- Backend và database chỉ được đề xuất, không lập trình.
- Mô-đun AI là mô-đun có sẵn, đề tài chỉ tích hợp. AI chỉ hỗ trợ, không thay quyết định của bác sĩ [3, mục 5.3].

Sản phẩm đầu ra: sơ đồ ý tưởng ba nhánh như slide 14, vẽ từ bảng trên.
