# Plasma Pro, Stage 9A: hệ thống thiết kế

Nguồn sự thật: `src/theme.ts` (token), `src/components/ui.tsx` (thành phần), `src/components/RoleTabs.tsx` (điều hướng).
Tài liệu `DESIGN_SYSTEM.md` ở gốc repo (PR 17) vẫn đúng về vai trò ngữ nghĩa và quy tắc trạng thái (`src/theme.status.ts`); bảng giá trị dưới đây thay các giá trị màu, bo góc, bóng, cỡ chữ của tài liệu đó.

## 1. Màu (`C`, `bar`)

Mọi màu nằm trong `src/theme.ts`. Sau Stage 9A còn 3 chỗ màu viết cứng ngoài theme, đều có từ trước và có chủ đích: nền đen `#000` của ảnh phóng to (B11, lịch sử ảnh) và lớp mờ trắng trên ảnh B11, cùng vòng trang trí của `GradientCard` (thành phần không còn màn nào dùng).

| Token | Giá trị | Vai trò |
|---|---|---|
| `navy`, `primaryDark` | `#17324D` | Bản sắc: thanh nhận diện, thanh bên, chữ tiêu đề (`text`), nút giữa thanh tab, bảng điều khiển T02 |
| `primary` | `#1F67A3` | Hành động, trạng thái chọn, liên kết |
| `primarySoft` | `#EAF3FA` | Nền nhạt của thành phần chọn, ký hiệu bệnh nhân, nút trong thanh tiêu đề trắng |
| `periwinkle` | `#2878B8` | Xanh y tế gốc của đặc tả, chỉ cho đồ họa |
| `accent` / `accentSoft` | `#087F7B` / `#E3F3F2` | Mòng két: vòng tiến độ đợt (mặc định của `Ring`), chỉ báo lâm sàng phụ |
| `brandMint` | `#8FD3CF` | Dấu thương hiệu và vạch mục chọn trên nền navy |
| `bg` | `#F5F8FB` | Nền trang |
| `card` | `#FFFFFF` | Bề mặt chính |
| `surfaceMuted` | `#F1F5F9` | Bề mặt phụ: ô giá trị tham chiếu, dải vết thương trong thanh ngữ cảnh, khối demo ở đăng nhập |
| `neutralSoft` | `#EDF1F5` | Rãnh thanh chọn, chip xám, nền trạng thái rỗng |
| `border` | `#E2E8F0` | Viền khối, viền thanh tiêu đề, thanh tab |
| `divider` | `#E8EDF3` | Đường kẻ giữa các dòng trong một nhóm |
| `cardBorder` | `#D6DEE8` | Viền nút lựa chọn, nút phụ, vạch bước chưa tới |
| `text` | `#17324D` | Tiêu đề, giá trị |
| `textBody` | `#243447` | Thân bài, nhãn ô nhập |
| `textSoft` | `#526173` | Chữ phụ, nhãn dòng |
| `textFaint` | `#5B6B7E` | Gợi ý, biểu tượng mũi tên |
| `green`/`greenSoft` | `#1F7A50` / `#E6F4EC` | Thành công |
| `amber`/`amberSoft` | `#9A5A12` / `#FBF0E2` | Cảnh báo |
| `red`/`redSoft`/`redBorder` | `#B8323F` / `#FBE9EB` / `#F0C4C9` | Nguy hiểm, Dừng điều trị |
| `teal`/`tealSoft` | `#2470AD` / `#E8F1F9` | Thông tin (tên khóa giữ từ trước để không đổi mã) |
| `violet`/`violetSoft` | `#5A4FC4` / `#EFEEFC` | Đợt điều trị (biểu tượng) |
| `onPrimary`, `onPrimarySoft` | `#FFFFFF`, `#C9D8E8` | Chữ trên nền navy, primary |
| `onNavyWarn`, `onNavyDanger` | `#F5C77E`, `#FF9AA5` | Cảnh báo, lỗi trên nền navy (T02) |
| `onNavyTint`, `onNavyHairline` | trắng 12%, trắng 7% | Nút, mục chọn, viền trên nền navy |
| `scrimSheet` | navy 45% | Lớp phủ sau bảng trượt |
| `primaryPressed` | `#2E6DA6` | Nút primary đang nhấn trên nền navy |

Vạch biểu đồ và vạch nhấn (`bar`, cần 3:1): `blue #2878B8`, `green #25845A`, `amber #C77B27`, `red #C83D4D`, `teal #087F7B`, `violet #8A80E0`, `gray #A9B6C5`. Đây chính là các giá trị gợi ý của đặc tả.

Vai trò ngữ nghĩa (`semantic`): success, warning, danger, info, neutral; mỗi vai trò có `fg`, `bg`, `solid`, `bar`, `tone`. Disabled: nền `neutralSoft`, chữ `textSoft` (không dùng độ mờ), luôn kèm lý do (`Button reason`).

## 2. Chữ (`T`, `typeScale`, `numeric`)

Họ chữ: Google Sans Flex (Regular 400, Medium 500 và 600, Bold 700), đã ghép bộ tiếng Việt. Hệ số vai trò `ROLE_SCALE` giữ nguyên: bệnh nhân x17/16.

| Bậc | Cỡ / dòng | Độ đậm | Dùng cho |
|---|---|---|---|
| `screenTitle` | 24 / 30 | 700 | Tiêu đề thanh nhận diện (màn chính) |
| `titleL` | 20 / 26 | 700 | Tiêu đề thanh trắng (màn chi tiết), họ tên ở khối định danh |
| `sectionTitle` | 18 / 24 | 700 | Tiêu đề nhóm (`SectionTitle`) |
| `titleM` | 18 | 700 | Tên vị trí vết thương, tên ở màn Cá nhân |
| `cardTitle` | 16 / 22 | 700 | Tiêu đề khối, tên dòng |
| `body` | 16 / 24 | 400 | Thân bài |
| `label` | 15 / 20 | 500 đến 600 | Giá trị trong dòng nhãn và giá trị |
| `small` | 14 / 21 | 400 | Nhãn dòng, chữ phụ, nhãn ô nhập (600) |
| `caption` | 13 / 18 | 600 | Chip, chú thích dưới tiêu đề, nhãn nhóm |
| `min` | 12 | | Chặn dưới (Text tự chặn) |
| `clinical` | 34 / 40 | 700 | Số đo lâm sàng chính (diện tích gần nhất B05) |
| `stat` / `statCompact` | 28 / 24 | 700 | Số trong ô số, lưới số |
| `timerLarge` | 56 / 64 | 700 | Đồng hồ phiên T02 |

`numeric = { fontVariant: ['tabular-nums'] }`: áp cho giá trị `InfoRow`, ô số, số trong vòng tiến độ, số đo, giờ, mã hồ sơ.
Không chữ in hoa cho tiêu đề; không giãn chữ (bỏ `letterSpacing` 0,2 đến 0,3 của bản trước).

So với đặc tả: thân bài giữ 16 (đặc tả gợi ý 14 đến 15) vì quyết định cỡ chữ 03/11/2026 (thân bài 16, bệnh nhân 17) đã được duyệt và kịch bản TC01 kiểm giá trị này.

## 3. Khoảng cách và bố cục (`space`, `layout`, `size`)

- Thang: 2, 4, 8, 12, 16, 24, 32 (`space.xxs` đến `xxl`) và 40 cho khoảng lớn.
- Lề ngang theo bậc (`layout.gutter`): điện thoại 16, máy tính bảng 24, máy tính 32. `useLayoutTier()` trả `phone` dưới 768, `tablet` 768 đến 1023, `desktop` từ 1024.
- Cột nội dung: 600 (`size.maxContent`) ở điện thoại và máy tính bảng; 760 (`layout.maxContentWide`) ở máy tính.
- Khoảng giữa khối trong màn: 16; tiêu đề nhóm cách khối trên 8 thêm.
- Đệm khối: 16 (khối định danh, đăng nhập 20).
- Thanh bên máy tính: 232 (`size.sidebar`).
- Vùng chạm: 44 tối thiểu (`size.touch`); nút 48 (`size.button`); nút Dừng 56 (`size.buttonDanger`, giữ nguyên).

## 4. Bề mặt và độ nổi (`radius`, `shadow`, `elevation`)

| Bậc | Cách vẽ | Dùng cho |
|---|---|---|
| Nền trang | `bg` | Mọi màn |
| Khối phẳng | `card`, viền 1 `border`, bo 12 | Mọi `Card` |
| Khối chính | như trên cộng bóng navy 7%, bán kính 8 | Định danh B04, Hiện trạng B05, Hôm nay N02, bảng điều khiển T02, đăng nhập, Cá nhân |
| Bề mặt phụ | `surfaceMuted`, không viền, bo 8 | Ô tham chiếu, dải vết thương, lưới số |
| Thanh tiêu đề chi tiết | trắng, viền dưới 1, không bo, không bóng | Màn có nút quay lại |
| Thanh nhận diện | navy, không bo | Màn chính của vai trò |
| Chân màn cố định, thanh tab | trắng, viền trên 1, bóng hướng lên 6% | |
| Menu, nút nổi | `elevation[2]` | Nút giữa thanh tab |
| Bảng trượt, hộp thoại | `elevation[3]`, lớp phủ `scrimSheet` | `Sheet` |

Bo góc: `radius.s 6` (chip), `radius.m 10` (ô nhập, nút, ô số, biểu tượng), `radius.card 12`, `radius.sheet 16` (bảng trượt). Nút không còn dạng viên thuốc (bo 24 cũ).

## 5. Thành phần đã chuẩn hóa

| Thành phần | Biến thể, quy tắc |
|---|---|
| `Header` | `back` vắng: thanh nhận diện navy, dòng "Plasma Pro · vai trò" (ẩn ở máy tính vì thanh bên đã có), ký hiệu vai trò ô vuông bo 10. `back` có: thanh trắng phẳng. `HeaderToneContext` cho phần tử con biết nền tối hay sáng (`HeaderButton`, `DateBadge`, `RoleAvatar` tự đổi màu). Tự đặt màu thanh trạng thái (`expo-status-bar`). `children` trong thanh nhận diện (ô tìm kiếm B02) dùng tông sáng. |
| `Screen` | Lề và cột theo bậc; máy tính có thanh bên thì chừa 232 bên trái, bỏ khoảng đáy của thanh tab. `footer` (chân màn cố định) giữ hành vi, thêm lề theo bậc. |
| `Card` | Phẳng viền mảnh; `hero` thêm bóng nhẹ; thêm `testID`. |
| `SectionTitle` | 18 đậm; liên kết hành động nhỏ có mũi tên; mới: `caption` (một dòng chú thích dưới tiêu đề). |
| `Button` | `primary` nền đặc `primary`; `secondary` trắng viền `cardBorder`; `danger` nền `redSoft` viền `redBorder`; `dangerSolid` đỏ đặc 56 (giữ); `ghost`. Bo 10, cao tối thiểu 48, chữ 600. Không gradient, không bóng. `reason` và `armAfterMs` (nếu có) không đổi. |
| `Chip`, `StatusChip` | Bo 6 (khác hình dạng nút lựa chọn), luôn kèm chữ, biểu tượng theo bảng trạng thái. |
| `Choices` | Ô bo 8 viền `cardBorder`; mục chọn nền `primary` chữ trắng đậm (không chỉ màu: độ đậm và nền). |
| `Segmented` | Kiểu rãnh: nền `neutralSoft`, mục chọn nền trắng nổi nhẹ, chữ navy đậm. |
| `Field`, `SearchField` | Nền trắng, viền `#B4C1D0` (`interaction.inputBorder.rest`), focus viền 2 `primary`, lỗi viền đỏ và dòng lỗi `accessibilityLiveRegion`. Nhãn 14 đậm `textBody`. |
| `NumberTile` | Nền trắng viền mảnh, vạch 3 px theo tông ở cạnh trái, số đậm theo tông, biểu tượng bên phải. |
| `StatGrid`, `Stat` | Vạch tông 3 px, số `numeric`. |
| `InfoRow` | Nhãn 14 `textSoft`, giá trị 15 đậm `text`, `numeric`. |
| `Notice` | Nền nhạt theo tông và vạch nhấn trái 3 px; `accessibilityRole="alert"` giữ. |
| `Empty` | Biểu tượng trong ô 48 bo 14, chữ 14, rộng tối đa 320. |
| `IconBadge` | Ô vuông bo (28% cạnh) thay vòng tròn: biểu tượng chức năng khác hình với ký hiệu người. |
| `PatientAvatar` (mới) | Ký hiệu chữ cái đầu tròn; `muted` cho hồ sơ lưu trữ; ẩn với trình đọc màn hình. |
| `ListCard`, `Divider` | Đường kẻ `divider`. |
| `StepRow` | Vạch 3 px; bước thiếu dùng `bar.amber`. |
| `Disclosure` | Biểu tượng `textSoft` (bớt xanh rải rác). |
| `Ring` | Rãnh `neutralSoft`, vòng mặc định `accent`, số `text` đậm `numeric`. |
| `DateTile` | Nền trắng viền mảnh, hôm nay nền đỏ nhạt. |
| `ClinicalContext` | Hàng định danh có ký hiệu chữ cái đầu; dải vết thương nền `surfaceMuted` ngăn bằng đường kẻ. Nội dung và nhãn trợ năng giữ nguyên. |
| `DeviceStatusBar` | Vạch tông 4 px bên trái, bo 10. |
| `LinkDiagram` (mới) | Sơ đồ điện thoại nối máy cho T01, chỉ hiển thị. |
| `RoleTabs` | Điện thoại, máy tính bảng: thanh trắng phẳng, vạch chỉ báo trên mục chọn, nút giữa navy đặc. Máy tính: `SideBar` navy, nút giữa thành nút đầu, các mục dọc có vạch `brandMint`. Cùng `tabPress`, cùng kiểm vai trò. |
| `Sheet` | Bóng `elevation[3]`, lớp phủ `scrimSheet`. |
| `+not-found` (mới) | Màn không tìm thấy tiếng Việt. |

Thành phần đặc tả nêu nhưng ứng dụng chưa có (không tạo mới vì không màn nào cần, tránh thêm mã không dùng): toast (ứng dụng dùng `notify` của hệ thống), bảng dữ liệu dạng lưới (danh sách dùng `ListCard`), date picker (ngày nhập bằng ô chữ có kiểm định dạng), checkbox và radio riêng (dùng `SwitchRow`, `Choices`, ô tích B03 đã thêm vai trò checkbox), loading skeleton (dữ liệu cục bộ, không có thời gian chờ mạng). Ghi ở mục còn lại của báo cáo triển khai.

## 6. An toàn khi đổi thành phần dùng chung

| Thành phần | Màn dùng | Vai trò ảnh hưởng | Cách giữ hành vi |
|---|---|---|---|
| `Header` | 43 tệp màn và thành phần | cả ba | Giữ props cũ; nút quay lại và nhãn vai trò giữ nhãn trợ năng; chỉ đổi kiểu theo `back` |
| `Screen` | mọi màn | cả ba | `footer`, `scrollRef`, `padded` giữ; khoảng đáy thanh tab giữ ở điện thoại (TC16 kiểm) |
| `Button` | 131 chỗ dùng | cả ba | Props, `accessibilityState`, `reason`, `disabled` giữ; chỉ đổi kiểu vẽ |
| `RoleTabs` | 3 bố cục vai trò | cả ba | Kiểm vai trò (`Redirect`) giữ; thanh bên phát cùng sự kiện `tabPress`; lề tab TC13 giữ |
| `ClinicalContext` | B05..B11, T01, T02 | bác sĩ, bệnh nhân | `testID`, nhãn trợ năng, cảnh báo đổi bệnh nhân giữ |
| `Card`, `Chip`, `Notice`, `InfoRow` | mọi màn | cả ba | Chỉ đổi kiểu |

Kiểm chứng: 22 kịch bản hồi quy chạy trên master và trên nhánh, so từng ca (`PLASMA_PRO_STAGE_9A_VISUAL_REGRESSION_REPORT.md`).
