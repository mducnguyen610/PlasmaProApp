# Plasma Pro: kế hoạch kiểm thử giao diện theo tác vụ

Ngày: 13/11/2026. Áp dụng cho PR-TB-1 đến PR-TB-9 trong `PLASMA_PRO_SCROLL_REDUCTION_BACKLOG.md`.

## 1. Môi trường

- Bản web: `npx expo export -p web`, phục vụ `dist` có SPA fallback (`docs/task-based-ui/cong-cu/serve.cjs`, cổng 8600).
- Trình duyệt: Chromium qua Playwright có sẵn trong môi trường.
- Tài khoản mẫu: `bacsi`, `benhnhan`, `quantri`, mật khẩu `Demo@123`; dữ liệu mẫu `p-1`, `w-1`, `IMG0003` (đã đo), `IMG0004` (chưa đo), `d-1`.
- Khổ: 320×640, 360×740, 390×844, 768×1024.
- Thiết bị: giả lập. Mọi kiểm thử với máy Plasma Pro thật ghi **BLOCKED** (chưa có APK SDK 58, chưa có thiết bị).

## 2. Kiểm tra bắt buộc sau mỗi PR

| Mã | Kiểm tra | Lệnh hoặc cách | Đạt khi |
|---|---|---|---|
| G-01 | TypeScript | `npx tsc --noEmit` | Không lỗi |
| G-02 | Lint | `npx expo lint` | Không lỗi mới |
| G-03 | Kiểm thử đơn vị | `npm test` | Tất cả đạt |
| G-04 | Giao diện cũ | `scripts/kiem-thu-giao-dien.cjs` | 41/41 như trước |
| G-05 | Hồi quy các đợt | `kiem-thu-dot-8..12.cjs`, `kiem-thu-p0.cjs`, `kiem-thu-p1*.cjs` | Số đạt không giảm so với `master` |
| G-06 | Đo cuộn | `cong-cu/do-cuon.cjs` (sẽ thành `scripts/kiem-thu-tb.cjs`) | Màn trong PR đạt mục 3; màn ngoài PR không tăng quá 5% |
| G-07 | Ảnh | Chụp màn trong PR ở 4 khổ, trước và sau | Lưu ở `/mnt/project-files/datn/task-based-ui/pr-tb-n/` |
| G-08 | Tràn ngang | `scrollWidth > innerWidth + 1` | Không màn nào |
| G-09 | Chữ nhỏ nhất | Như `kiem-thu-giao-dien.cjs` TC02 | Không dưới 12 px |

## 3. Tiêu chí theo màn

| Mã | Màn | Kiểm tra | Đạt khi |
|---|---|---|---|
| TB-T01 | Mọi màn có footer | Đáy nút chính khi mở màn | Nằm trong cửa sổ ở 4 khổ |
| TB-T02 | Mọi màn có footer | Cuộn tới cuối | Phần tử cuối nội dung nằm trên footer, không bị che |
| TB-T03 | Mọi màn có footer | Tab qua mọi phần tử (web) | Không phần tử nào bị footer che kín (WCAG 2.4.11 [1]) |
| TB-T04 | T01 bệnh nhân, bác sĩ | Qua các trạng thái chưa kết nối, đã kết nối, máy đã nhận, lỗi | Nút đúng của trạng thái luôn thấy; điều kiện tắt nút như cũ |
| TB-T05 | T01 | P0 TP-DV-03, TP-DV-06a | Đạt như trước |
| TB-T06 | T02 | P0 TP-DV-08a | "Dừng điều trị" trong màn đầu ở 320, 360, 390 |
| TB-T07 | T01, T02 | Trạng thái kết nối USB/UART | Hiện ở đầu màn mọi trạng thái; không nằm trong mục thu gọn hay sheet |
| TB-T08 | T01 | Không tự chuyển màn | Sau ACK vẫn ở T01 tới khi bấm nút (QĐ-6) |
| TB-T09 | B13, N07 | Nút tác vụ | Trong màn đầu; quản trị thấy đúng như trước |
| TB-T10 | B03 | Nhập rồi Back | Hỏi "Bỏ dữ liệu chưa lưu?"; "Ở lại" giữ dữ liệu |
| TB-T11 | B03 | Bấm Lưu hai lần nhanh | Một hồ sơ |
| TB-T12 | B10 | Chọn ảnh, sang bước 3, gõ số, "Quay lại" về bước 2, rồi "Tiếp" | Ảnh và số đã gõ còn nguyên |
| TB-T13 | B10 | Back hệ thống ở bước 2, 3 | Hỏi bỏ ảnh |
| TB-T14 | B10 | Ô diện tích bước 3 | Trống, không điền số AR (QĐ-1); không chọn sẵn phương pháp AR (QĐ-P0-1) |
| TB-T15 | B10 | Lưu không tích "Đã xem ảnh" | Vẫn lưu được như hiện nay; `visualReview` ghi `false` |
| TB-T16 | B11 | Vào chế độ đo, Hủy | Số cũ giữ; không ghi lịch sử nhãn |
| TB-T17 | B11 | Lưu ở chế độ đo | Về chế độ xem; nút "Ảnh chưa đo tiếp theo" hiện; cảnh báo đổi bệnh nhân giữ (QĐ-P0-2) |
| TB-T18 | B11 | Đang nhập, Back hệ thống | Hỏi bỏ dữ liệu |
| TB-T19 | B07 | Bấm Lưu khi thiếu mục bắt buộc | Mở nhóm thiếu, cuộn tới câu thiếu, không lưu |
| TB-T20 | B07 | Lưu đủ | Một bản ghi; màn đánh dấu báo cáo hiện như cũ (QĐ-5 không tự đóng) |
| TB-T21 | B07 | Công tắc công bố | Mặc định như hiện nay (QĐ-2); nhãn nút đổi theo công tắc |
| TB-T22 | B06 | Đổi liều sau khi xác nhận | Dấu xác nhận reset (UX-02) |
| TB-T23 | B06 | "Quay lại" giữa các bước | Giữ mọi giá trị |
| TB-T24 | B06 | "Các phiên bản" | Thu gọn, tóm tắt nêu phiên bản đang áp dụng |
| TB-T25 | B05 | Mọi lối vào tác vụ | Mở đúng màn kèm `patientId`, `woundId` (kiểm URL) |
| TB-T26 | B05 | Thông tin mục 5.5 Audit | Còn hiện ở màn tóm tắt, không trong mục thu gọn |
| TB-T27 | Lịch sử vết thương | Quyền | Bệnh nhân khác, bác sĩ khác: `NoAccess` như B05 |
| TB-T28 | Sheet | Đóng bằng nút, nền, Back | Đóng; không mở được lớp thứ hai |
| TB-T29 | N03 → N06 | Lối vào và Back | Mở N06, Back về N03 |

## 4. Bàn phím và máy thật

- Web không mô phỏng bàn phím ảo. Trên máy Android, iOS thật: mở ô nhập ở B03, B06, B07, B11, kiểm footer không che ô đang nhập và vẫn bấm được nút Lưu. Trạng thái hiện tại: **BLOCKED** (chưa có APK SDK 58).
- Cỡ chữ hệ thống lớn (200%): kiểm footer không tràn, nút không bị cắt. **BLOCKED** trên máy thật; trên web thử bằng phóng to 200%.

## 5. Chỉ số so sánh

Ghi cho mỗi màn trong PR, trước và sau, ở 4 khổ:

1. Cao nội dung (px) và số màn.
2. Đáy nút chính khi mở màn.
3. Số lần cuộn tối thiểu để hoàn tất tác vụ chuẩn (đếm theo bội số chiều cao vùng nhìn thấy).
4. Số phần tử tương tác thấy được trên màn (chỉ số tải nhận thức thô).

Thời gian hoàn tất với bác sĩ, bệnh nhân thật: **NOT TESTED** trong kế hoạch này; cần buổi thử riêng.

## 6. Kết quả nền (trước thay đổi)

Lấy từ `cong-cu/ket-qua-do-cuon.json` (13/11/2026, `master` `13b68bf`). Bảng tóm tắt ở mục 4 của Audit.

## Tài liệu tham khảo

1. W3C (2023). *Understanding SC 2.4.11: Focus Not Obscured (Minimum)*. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured
