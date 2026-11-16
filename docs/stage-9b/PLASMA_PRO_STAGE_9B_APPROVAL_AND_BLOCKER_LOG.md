# Plasma Pro, Stage 9B: nhật ký duyệt và vướng mắc

## 1. Duyệt đã có

| Mục | Nguồn duyệt | Phạm vi được duyệt | Ghi chú |
|---|---|---|---|
| S8-B04 | Đặc tả Stage 9B do người dùng gửi ngày 15/11/2026 ("Approved correction direction") | Một vết đủ điều kiện thì truyền `woundId`; nhiều vết thì mở T01 bắt chọn; không gán tùy tiện, không lấy phần tử đầu, không gán lại phiên cũ | Làm đúng phạm vi; trường hợp không có vết nào giữ hành vi cũ (đặc tả không nêu) |
| S8-B05 | Đặc tả Stage 9B | Thêm kiểm tra phía ứng dụng, không đổi vai trò dự kiến, ghi rõ giới hạn máy chủ | Vai trò lấy từ nơi gọi hiện có |
| S8-B06 | Đặc tả Stage 9B | Hàng đợi Promise tuần tự hoặc cơ chế tương đương | |
| S8-B07 | Đặc tả Stage 9B | Chỉ lớp giả lập: ẩn nút Bắt đầu khi chưa có liệu trình, giải thích | |
| S8-B10 | Đặc tả Stage 9B | Thống nhất chữ, không đổi nghĩa, đơn vị rõ | |

Không có review lâm sàng hay review kỹ thuật thiết bị nào trong Stage 9B.

## 2. Vướng mắc

### S8-B08: BLOCKED, chờ review an toàn

- Cần: người chịu trách nhiệm lâm sàng và kỹ thuật thiết bị xác nhận cách xử lý vị trí "Kết nối" và "Dừng điều trị" ở T02.
- Không làm: không làm chậm nút Dừng; không thêm hiệu ứng; không đổi hành vi kết nối lại; không tự quyết rằng dừng ngoài ý muốn là chấp nhận được.
- Phương án đề xuất để review (chưa cài):
  - A. Đưa "Kết nối" ra khỏi chân màn khi phiên đang chạy (đặt trong thân màn, cạnh thông báo mất kết nối); chân màn chỉ dành cho Dừng. Nút Dừng không đổi gì.
  - B. Giữ "Kết nối" ở chân màn nhưng đặt trên (không dưới) vùng của nút Dừng, để vùng đáy luôn là Dừng hoặc trống.
  - C. Giữ nguyên, ghi nhận rủi ro được chấp nhận.
  - Không đề xuất khóa tạm nút Dừng sau khi hiện (cách S8-B01 dùng cho nút Nạp), vì làm chậm lệnh dừng.
- Kèm theo: giao thức chưa có lệnh dừng qua cáp cho máy thật (Stage 7), nên nút Dừng hiện chỉ có tác dụng với giả lập.

### S8-B09: BLOCKED, chờ nhóm phần cứng

- Cần nhóm firmware trả lời: máy có tự giữ lịch điều trị (ngày nghỉ, số buổi mỗi tuần) và từ chối phát vào ngày nghỉ không; nếu có, lịch lấy từ đâu (bản tin `CFG` hiện không mang lịch).
- Ghi nhận hiện trạng:

| Lớp | Có chặn ngày nghỉ không | Bằng chứng |
|---|---|---|
| Giao diện ứng dụng | N02: ẩn nút nạp. N07: nút nạp thành nút phụ, kèm câu "Không cần nạp liệu trình hôm nay". T01: không chặn | `patient/index.tsx` dòng 126; `patient/device.tsx`; `connect-device.tsx` dòng 67 |
| Máy chủ ứng dụng | Không có máy chủ | `docs/thiet-ke/de-xuat-backend.md` (đề xuất) |
| Firmware | **Chưa xác nhận.** `CFG` không có trường lịch nên máy không nhận được lịch từ ứng dụng | `protocol.config.ts` dòng 14 đến 23; ICD mục 10 chưa có trả lời |
| Mô phỏng | `simulateSession` từ chối vào ngày nghỉ | Giả định demo, không phải bằng chứng thiết bị |

- Không làm: không thêm giới hạn mới ở T01 dựa trên giả định; không đổi lịch, lệnh, thông số.
- Trả lời của nhóm phần cứng: **chưa có** (chưa gửi được câu hỏi trong phạm vi luồng này; cần người dùng chuyển).

## 3. Bằng chứng theo loại

| Loại | Có trong Stage 9B |
|---|---|
| Kiểm thử phần mềm tự động | Có: 4 tệp kiểm thử đơn vị mới, kịch bản giao diện `kiem-thu-9b.cjs`, hồi quy |
| Kiểm tra giao diện thủ công | Không (chỉ kịch bản tự động trên trình duyệt) |
| Kiểm chứng trên phần cứng thật | Không |
| Review lâm sàng | Không |
