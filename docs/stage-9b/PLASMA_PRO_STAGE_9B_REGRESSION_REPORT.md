# Plasma Pro, Stage 9B: báo cáo hồi quy

Ngày 15/11/2026. Bản dựng web tĩnh (`npx expo export -p web`), Chromium qua Playwright, **thiết bị giả lập**, dữ liệu mô phỏng. "Trước" là master `457ee0c`; "sau" là nhánh `fix/stage-9b-backlog` (cùng mã với commit cuối, trừ tài liệu).

## 1. Kiểm thử phần mềm tự động

| Kiểm | Kết quả |
|---|---|
| `npx tsc --noEmit` | đạt |
| `npm run lint` | đạt, 0 vấn đề |
| `npm test` | đạt (gồm 4 tệp mới: `access.test.ts`, `commitQueue.test.ts`, `monitorTarget.test.ts`, `simStartGate.test.ts`) |
| `scripts/kiem-thu-giao-dien.cjs` | 41/41 |

## 2. Kịch bản mới `scripts/kiem-thu-9b.cjs`

| Ca | Master (tái hiện) | Sau |
|---|---|---|
| 9B-B04-01 N07 mở T02 kèm `woundId=w-1`, thanh ngữ cảnh ghi VT01 | LỖI (`/session-monitor`, "Chưa chọn vết thương") | ĐẠT |
| 9B-B07-01 Sau tải lại: không có "Bắt đầu điều trị", có câu giải thích | LỖI | ĐẠT |
| 9B-B07-02 Chưa chạy thì không có nút Dừng | ĐẠT | ĐẠT |
| 9B-B07-03 Đã nạp: nút Bắt đầu hiện lại | ĐẠT | ĐẠT |
| 9B-B04-02 Phiên mới giữ thiết bị d-1 và vết w-1 | LỖI (không có `woundId`) | ĐẠT |
| 9B-B04-03 Phiên hiện trong "Lịch sử" của VT01 | LỖI (23→23) | ĐẠT (23→24) |
| 9B-B04-04 Hai vết có đợt: mở T01, cho chọn VT01 hoặc VT09 | LỖI (mở T02) | ĐẠT |
| 9B-B04-05 Chưa chọn vết thì chưa nạp, không ghi phiên | ĐẠT | ĐẠT |
| 9B-B05-01 Bệnh nhân gửi báo cáo cho hồ sơ của mình | ĐẠT | ĐẠT |
| 9B-B05-02 Bác sĩ phụ trách đánh dấu báo cáo đã xử lý | ĐẠT | ĐẠT |
| 9B-B05-03 Quản trị xử lý lỗi đồng bộ | ĐẠT | ĐẠT |
| 9B-B10-01 B10 nhãn "Diện tích bác sĩ đo (cm²)" | ĐẠT | ĐẠT |
| 9B-B10-02 B11 cùng nhãn, không còn "đã đo" | LỖI | ĐẠT |
| 9B-B10-03 B11 chọn mm² thì nhãn ghi mm² | LỖI | ĐẠT |
| 4 ca "không có lỗi JS" | ĐẠT | ĐẠT |
| **Tổng** | **11 đạt, 7 lỗi** | **18 đạt, 0 lỗi** |

Ca 9B-B04-04, 05 và 9B-B05-03 thêm dữ liệu kiểm thử vào bộ nhớ trình duyệt (vết VT09 kèm đợt, một lỗi đồng bộ chưa xử lý); không đổi dữ liệu mẫu của ứng dụng.

## 3. Hồi quy Stage 8 (22 kịch bản)

| Kịch bản | Master | Sau | Luồng chính được phủ |
|---|---|---|---|
| giao-dien | 41/41 | 41/41 | Chung |
| dot-8 (bản PR 58) | 33/0 | 33/0 | Bác sĩ, thiết bị (T01, T02) |
| dot-10 | 24/0 | 24/0 | Bác sĩ |
| dot-11 (bản PR 58) | 34/0 | 34/0 | Bệnh nhân, thiết bị |
| dot-12 | 53/0 | 53/0 | Số đo B11 |
| n05 | 20/0 | 20/0 | Vết thương phía bệnh nhân |
| p0 (bản PR 58) | 47/0 | 47/0 | Định danh, đo, thiết bị, dừng (giả lập) |
| p1-01d, p1-02, p1-03, p1-04, p1-05-06, p1 | 3, 15, 12, 10, 20, 16 đạt, 0 lỗi | như master | Bác sĩ: hồ sơ, đánh giá, chụp, đo |
| p2 | 237/0 | 237/0 | Bệnh nhân, biểu đồ tiến triển |
| quan-ly-ho-so | 55/0 | 55/0 | Tạo, sửa, lưu trữ hồ sơ, sửa vết |
| tb-2, tb-3, tb-4 | 22, 20, 31 đạt, 0 lỗi | như master | Đánh giá, chụp và đo, lịch sử |
| tb-5 (bản PR 58) | 14/0 | 14/0 | Bệnh nhân N01 đến N09 |
| tb-6 | 21/0 | 21/0 | Quản trị: tài khoản, phân công, thiết bị, lỗi |
| tb-7 | 30/0 | 30/0 | Thiết bị: kết nối, nạp, theo dõi, mất kết nối, dừng (giả lập) |
| tb-8 (bản PR 58) | 23/2 | 23/2 | Toàn hệ thống |

- tb-8: hai lỗi giống nhau ở cả hai bản (S8-W3-04, S8-B01). Bản sửa của hai mục này nằm trong PR 58, chưa ở master; không phải hồi quy của 9B. tb-8 dừng sau S8-B01 trên cả hai bản nên phần S8-DI-01 (cùng nội dung S8-B04) không chạy tới; S8-B04 được phủ bằng `kiem-thu-9b.cjs`.
- Kịch bản "bản PR 58" lấy từ nhánh `ui/tb-8-hoi-quy` vì bản master phụ thuộc thứ trong tuần. Bản `p0` của PR 58 được áp cùng chỉnh bộ tìm nhãn diện tích như bản trong repo (S8-B10) trước khi chạy trên bản sau; trên master chạy bản gốc.
- `dot-12`, `p0`, `tb-3`, `p1-05-06` trên bản sau dùng bộ tìm nhãn mới; trên master dùng bản cũ. Số ca, ý kiểm không đổi.

## 4. Theo luồng đặc tả mục 6

| Nhóm | Luồng | Bằng chứng |
|---|---|---|
| Bác sĩ | Tạo, sửa, hồ sơ, vết thương, đánh giá, đo, chụp, lịch sử | quan-ly-ho-so, p1*, tb-2, tb-3, tb-4, dot-10, dot-12 |
| Bệnh nhân | Trang chủ, vết thương, tab Thiết bị, theo dõi, lịch sử | p2, n05, tb-5, dot-11, kiem-thu-9b |
| Quản trị | Tài khoản, phân công, thiết bị, báo cáo và đồng bộ | tb-6, kiem-thu-9b (9B-B05-03) |
| Thiết bị | Kết nối, nạp, theo dõi, mất kết nối, kết nối lại, dừng | tb-7, p0, dot-8, kiem-thu-9b. Mất kết nối giữa phiên rồi kết nối lại (S8-B08) chưa kiểm được trên web |

## 5. Ngoài phạm vi bằng chứng

- Kiểm tra giao diện thủ công: không.
- Phần cứng thật (USB, UART, dừng khẩn cấp): không; BLOCKED như Stage 7, 8.
- Review lâm sàng: không.
- Android, iOS thật: không.
