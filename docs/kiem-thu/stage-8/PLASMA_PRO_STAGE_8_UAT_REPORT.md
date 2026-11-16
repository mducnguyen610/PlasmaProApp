# Plasma Pro, Stage 8: báo cáo khả năng sử dụng và nghiệm thu người dùng (UAT)

Ngày 14/11/2026. Nền master `dbad553`, nhánh `ui/tb-8-hoi-quy`.

## 0. Kết luận

**User acceptance testing: chưa thực hiện.** Stage 8 không có bác sĩ hay bệnh nhân tham gia thử. Mọi số liệu dưới đây là đo tự động trên bản web với dữ liệu mô phỏng, hoặc đánh giá theo tiêu chí của người kiểm thử, không phải kết quả UAT. Không tuyên bố cải thiện khả năng sử dụng (mục 7 đặc tả).

| Kết quả | Trạng thái |
|---|---|
| Software regression | Xem `PLASMA_PRO_STAGE_8_REGRESSION_REPORT.md` |
| Hardware verification | Chưa thực hiện (BLOCKED) |
| Clinical validation | Chưa thực hiện |
| User acceptance testing | **Chưa thực hiện** |

## 1. Đo tự động theo tác vụ chính

Số thao tác đếm theo đúng chuỗi bấm trong `scripts/kiem-thu-tb-8.cjs` (bản web 390 × 844, dữ liệu mô phỏng, không tính gõ chữ). Đây là số tối thiểu khi đã biết đường; người dùng thật có thể cần nhiều hơn.

| Tác vụ | Vai trò | Đường đi | Số chạm (tối thiểu) | Ghi chú |
|---|---|---|---|---|
| W1 Tạo bệnh nhân có vết thương đầu | Bác sĩ | B02 → B03 → lưu → Mở hồ sơ | 3 (+ chọn giới tính nếu khác mặc định) | Ô "Vị trí vết thương đầu tiên" tạo luôn VT01 |
| W1b Thêm vết thương | Bác sĩ | B04 → mở "Thêm vết thương" → nhập → Thêm | 2 | Tự mở B05 vết mới |
| W2 Đánh giá | Bác sĩ | B05 → B07 bốn bước → Lưu | 3 lựa chọn bước 1, 1 lựa chọn bước 2, 3 "Tiếp", 1 Lưu = 8 | Bước 3 có thể bỏ trống |
| W3 Chụp và đo | Bác sĩ | B10 chọn ảnh → "Đã xem ảnh" → Tiếp → nhập số → chọn phương pháp → Lưu | 5 | QĐ-1: phải gõ số, không có nút dùng số AR |
| W5 Nạp và theo dõi phiên | Bệnh nhân | N02 → Nạp liệu trình → Kết nối → Nạp → Theo dõi → (bắt đầu trên máy) | 4 | Sau sửa S8-B01, lần chạm thứ hai trong 800 ms sau khi nút đổi bị bỏ qua |
| W6 Quản trị kiểm tài khoản | Quản trị | Q01 → chi tiết tài khoản | 1 | |

Số lần cuộn: đã đo ở các giai đoạn 1 đến 7 bằng `cong-cu/do-cuon.cjs` (chiều cao màn tính theo số màn hình ở 360 × 740), xem báo cáo từng giai đoạn trong `datn/task-based-ui/`. Stage 8 không đổi bố cục màn nên không đo lại.

## 2. Đánh giá theo tiêu chí (người kiểm thử, không phải người dùng)

| Tiêu chí | Nhận xét | Bằng chứng |
|---|---|---|
| Khả năng tìm thấy chức năng | Lối vào T01 có ở N02 (chỉ ngày có lịch), N07, B13. Phiên mở từ N07 không gắn vết thương (S8-B04) | S8-W5-01, S8-DI-01 |
| Khả năng nhận biết trạng thái | Thanh trạng thái thiết bị cố định ở T01, T02; "Dữ liệu mô phỏng" có nhãn ở B05, lịch sử, N05; trước sửa S8-B03, lịch sử báo "Chưa có lần đo" dù đã nhập số | S8-W4-05, S8-W3-04 |
| Khả năng phục hồi khi thao tác sai | Rời màn khi nhập dở có hỏi (B07, B10, B11); chạm đúp ở T01 từng gửi lệnh ngoài ý muốn (đã sửa) | S8-NV-05, S8-B01 |
| Nhất quán giữa các màn | Ngày chụp và ngày đo ghi riêng ("Lần đo gần nhất 8,4 cm², chụp 31/10/2026"); "Cải thiện" chỉ xuất hiện như xu hướng bác sĩ đánh giá | S8-W4-02, S8-W4-04 |
| Vùng chạm | Có phần tử dưới 24 px ở 360 px, xem S8-RS-03 | Báo cáo hồi quy |

## 3. Kế hoạch UAT đề xuất (chưa chạy)

1. Người tham gia: ít nhất 2 bác sĩ của nhóm ĐH Y, 3 đến 5 bệnh nhân hoặc người đóng vai bệnh nhân (dữ liệu mô phỏng, không dùng dữ liệu bệnh nhân thật khi chưa được phê duyệt).
2. Tác vụ: W1 đến W6 như trên; với bệnh nhân là W5 trên điện thoại thật có cắm máy.
3. Đo: tỉ lệ hoàn thành, thời gian, số lỗi, số lần hỏi trợ giúp, SUS (System Usability Scale, Brooke 1996) sau buổi thử.
4. Tiêu chí nghiệm thu do người hướng dẫn và nhóm ĐH Y chốt trước buổi thử.

## Tài liệu tham khảo

- Brooke, J. (1996). SUS: A "quick and dirty" usability scale. Trong P. W. Jordan và cộng sự (biên tập), *Usability Evaluation in Industry*, tr. 189 đến 194. Taylor & Francis.
