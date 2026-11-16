# Plasma Pro, Stage 9A: báo cáo triển khai

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
