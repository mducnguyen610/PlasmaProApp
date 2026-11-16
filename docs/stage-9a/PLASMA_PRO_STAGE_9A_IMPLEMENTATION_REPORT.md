# Plasma Pro, Stage 9A: báo cáo triển khai

# Vòng 2: bố cục riêng 30 màn còn lại (nhánh `ui/stage-9a-bo-cuc-con-lai`)

Tách từ master `6f21314`. Trạng thái Stage 9A sau vòng này: **COMPLETE** ở mức bố cục giao diện web cho cả 43 màn (xem kiểm kê). Kiểm trên Android/iOS thật, camera thật, USB thật, dừng khẩn cấp trên máy thật vẫn **BLOCKED** như các stage trước; đó là giới hạn kiểm chứng, không phải việc giao diện còn dở.

## Commit

| Commit | Nội dung |
|---|---|
| `4cd10d8` | Gói 1: C02, C03, C04, C05 |
| `af40435` | Gói 2: B04a, B05a, B06, B07, B08, B08b, B08c, B08d |
| `35fdeef` | Gói 3: B09, B10, B11, B12, B13 |
| `bc1542f` | B05a giữ "Vị trí đang lưu" (WD-02), B06 câu hậu quả sát nút Lưu (D10-06h), N05, N06 |
| `e7ea7cf` | Gói 4: N01, N03, N04, N07, N08 |
| `b0db5fd` | Gói 5: Q01, Q01b, Q02, Q03, Q04, Q04b, Q05, Q06 |
| `719fa41` | Trang Hướng dẫn và giải thích (`/help`), lối vào ở tab Cá nhân |

## Tệp đổi (32 tệp trong `src`, 930 dòng thêm, 432 dòng bớt)

Chỉ tệp màn và ba thành phần dùng ở cấp màn. Không đổi `src/lib/**` (quy tắc lâm sàng, tính diện tích, AI, giao thức USB/UART, lệnh CFG, kho dữ liệu, quyền), `src/theme.ts`, `src/components/ui.tsx` (hệ thống chung). Kiểm bằng `git diff --stat 6f21314..HEAD -- src/lib src/theme.ts src/components/ui.tsx`: 0 dòng.

## Thành phần dùng chung đã đổi và kiểm theo vai trò

| Thành phần | Dùng ở | Cách đổi | Kiểm |
|---|---|---|---|
| `DeviceView` | B13 (bác sĩ), N07 (bệnh nhân), Q06 (kỹ thuật) | Nhánh theo `level`: bác sĩ đổi thứ tự thẻ; kỹ thuật nhóm dòng và thu gọn tiến độ; mức bệnh nhân giữ nguyên | tb-6 (Q06 không có nút nạp), tb-7, tb-5, 9b |
| `PatientWoundDashboard` | N05 (chỉ bệnh nhân) | Đổi thứ tự mục, dòng đợt điều trị vào thẻ tóm tắt | n05 20/20 (gồm N05-12 ở nhiều bề rộng) |
| `AccountScreen` | B14, N09, Q07 (COMPLETE) | Thêm một dòng "Hướng dẫn và giải thích" cho bác sĩ, quản trị; bệnh nhân không đổi | tb-6 TB6-18, p2, ảnh B14/Q07 |

## Điều không đổi

Quy tắc lâm sàng, cách tính diện tích, suy luận AI, tham số điều trị, giao thức firmware, lệnh USB/UART, hợp đồng API, lược đồ dữ liệu, quan hệ bệnh nhân và vết thương, quyền theo vai trò, QĐ-1 đến QĐ-6. Giữ: kiểm tra biểu mẫu, điều hướng, bản nháp, tìm và lọc, chụp ảnh, so sánh ảnh, lịch sử, luồng thiết bị, nút Dừng, xử lý lỗi. Mọi nhãn mà kịch bản kiểm thử đọc được giữ nguyên chữ (ví dụ "Bước 1 trên 4", "Diện tích bác sĩ đo", "Lưu phiên bản N cho VTxx", "Mức đau (0 là không đau, 10 là đau nhất)").

## Kiểm tra

- `npx tsc --noEmit`: đạt. `npx eslint src --quiet`: đạt. `npm test`: 16 bộ đạt (gồm `architecture.test` 169 tệp, `configCommand.test` 4224 tổ hợp).
- 24 kịch bản Playwright trên bản dựng web của nhánh: 832 ca đạt, 0 lỗi (chi tiết ở báo cáo hồi quy thị giác).

---

# Vòng 1 (PR 60, 13 màn và hệ thống chung)

Nhánh `ui/stage-9a-thiet-ke-lai`, tách từ master `457ee0c`. Không gộp PR 58 (Stage 8). Ứng dụng chỉ có giao diện và dữ liệu mô phỏng; mọi kiểm thử chạy trên bản dựng web tĩnh.

## Trạng thái chung: IN PROGRESS

- Hệ thống thị giác chung (token, thành phần dùng chung, thanh tiêu đề, thanh tab, thanh bên máy tính, màn không tìm thấy): xong.
- 13 màn có bố cục riêng làm lại; 30 màn còn lại chỉ nhận hệ thống chung (xem `PLASMA_PRO_STAGE_9A_SCREEN_INVENTORY.md`).
- Kiểm trên máy thật: BLOCKED.

## Tệp thay đổi (24 tệp mã và tài liệu, cộng ảnh)

| Tệp | Thay đổi |
|---|---|
| `src/theme.ts` | Bảng màu Clinical Precision (navy `#17324D`, xanh y tế `#1F67A3`, mòng két `#087F7B`, cặp trạng thái đạt AA), `bar` theo hex gợi ý của đặc tả cho đồ họa, `G` thành màu phẳng, bán kính 6/10/12/16, bóng navy opacity 0,07, thang chữ mới (`titleL`, `titleM`, `clinical` 34, `timerLarge` 56), `layout` (lề theo tầng, điểm dừng 768/1024, cột 760), `numeric` (`tabular-nums`). |
| `src/theme.contrast.test.ts` | Thêm 10 cặp kiểm tương phản trên nền navy, mòng két, nền nhạt. |
| `src/components/ui.tsx` | `Header` hai kiểu (màn chính navy kèm dòng "Plasma Pro · vai trò"; màn chi tiết trắng phẳng), `HeaderToneContext`, `useLayoutTier`, `PatientAvatar`; `Screen` lề theo tầng và chừa chỗ thanh bên; làm lại `Card`, `Button`, `Segmented`, `Field`, `NumberTile`, `Notice`, `StatGrid`, `StepRow`, `Empty`, `Ring`, `SectionTitle` (thêm `caption`), `Chip`, `IconBadge`. |
| `src/components/RoleTabs.tsx` | Thanh tab phẳng có vạch chỉ báo, nút giữa navy; `SideBar` navy cho máy tính, giữ `Redirect` kiểm vai trò và sự kiện `tabPress`. |
| `src/app/+not-found.tsx` | Mới: màn không tìm thấy tiếng Việt, nút về trang chủ theo vai trò. |
| `src/app/_sitemap.tsx` | Mới: chuyển hướng về `/`, không lộ danh sách route. |
| `src/app/index.tsx` | C01: dải navy, hai cột từ 900 px. |
| `src/app/doctor/index.tsx` | B01: chú thích tiêu đề nhóm, khối "Vừa xử lý" trong thẻ. |
| `src/app/doctor/patients.tsx` | B02: ô tìm kiếm trong thanh tiêu đề, khối lọc gom nhóm, tiêu đề kết quả. |
| `src/app/patients/new.tsx` | B03: năm sinh và giới một hàng, tiêu đề nhóm, vai trò checkbox cho ô đồng ý. |
| `src/app/patients/[id].tsx` | B04: thẻ định danh, liên kết đánh dấu đã xử lý 44 px. |
| `src/app/wounds/[id].tsx` | B05: thẻ "Hiện trạng", số diện tích 34, `RefValue`. |
| `src/app/patient/index.tsx` | N02: tách khối lịch hẹn. |
| `src/app/session-monitor.tsx` | T02: bảng điều khiển navy, đồng hồ 56. Logic phiên và chân màn (nút Dừng) không đổi. |
| `src/app/connect-device.tsx` | T01: `LinkDiagram` ở bước 1. |
| `src/components/DeviceStatus.tsx` | Vạch nhấn trạng thái; `LinkDiagram` chỉ hiển thị, đọc `linkState` có sẵn. |
| `src/components/ClinicalContext.tsx` | Hàng định danh có chữ cái đầu, dải vết thương; nhãn trợ năng và `testID` giữ nguyên. |
| `src/components/items.tsx` | `PatientCard` có chữ cái đầu, `DateTile` trắng có viền. |
| `src/components/AccountScreen.tsx` | B14, N09, Q07: thẻ định danh. |
| `src/components/DateBadge.tsx` | Màu theo nền thanh tiêu đề. |
| `src/components/Sheet.tsx` | Bóng và lớp phủ navy. |
| `docs/stage-9a/*.md` | 7 báo cáo. |
| `docs/stage-9a/anh/*.jpg` | 10 ảnh ghép trước/sau. |

## Không đổi (đối chiếu yêu cầu STRICT)

QĐ-1 đến QĐ-6; định danh và quan hệ dữ liệu bệnh nhân; phân công; phân quyền vai trò; logic quyết định lâm sàng; AI và thuật toán đo; thông số, thứ tự điều trị; hợp đồng API; mô hình dữ liệu; giao thức USB/UART; firmware; lệnh thiết bị. Không có tệp nào trong `src/lib/` bị sửa (`git diff --stat master -- src/lib` rỗng). Không xóa chức năng; không thêm dữ liệu mẫu cứng.

Dừng điều trị (T02): nút vẫn ở chân màn cố định, kiểu `dangerSolid`, cùng nhãn, cùng hành vi; không vào menu hay hộp thoại, không trễ, không tự khởi động lại, không báo thành công giả. Kịch bản tb-7, tb-8, p0 chạy lại trên bản mới (xem báo cáo hồi quy).

Chữ trên giao diện: chỉ thêm tiêu đề nhóm và chú thích cần cho bố cục; giữ "Diện tích" ở B05 (kịch bản TC08a dựa vào), giữ chuỗi `x cm² · chụp dd/mm/yyyy` (TP1-06).

## Thành phần chưa tạo

Toast, lưới dữ liệu, bộ chọn ngày, checkbox và radio riêng, skeleton: chưa có nơi dùng đủ để tạo mà không đổi hành vi (lý do chi tiết ở `PLASMA_PRO_STAGE_9A_DESIGN_SYSTEM.md`).

## Việc còn lại

1. Bố cục riêng cho 30 màn IN PROGRESS, ưu tiên B06, B07, B11, B13, N03, Q01.
2. N09: điều khiển chưa có nhãn dưới 44 px; N03: ô lịch dưới 44 px.
3. Kiểm trên Android và iOS thật, cỡ chữ hệ thống lớn, trình đọc màn hình gốc (TalkBack, VoiceOver).
4. Chế độ tối: ứng dụng khóa giao diện sáng (`app.json`, `userInterfaceStyle: "light"`), không thuộc phạm vi đợt này.

## Kiểm thử đã chạy

`npx tsc --noEmit`, `npm run lint`, `npm test`, `scripts/kiem-thu-giao-dien.cjs` và 22 kịch bản hồi quy; kết quả ở `PLASMA_PRO_STAGE_9A_VISUAL_REGRESSION_REPORT.md`.
