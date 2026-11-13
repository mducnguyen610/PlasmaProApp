# Design System Plasma Pro

Bản 1, ngày 12/11/2026. Dựa trên báo cáo đánh giá UI/UX cùng ngày (32 vấn đề, mã V01 đến V32) và mã nguồn nhánh `ui/sua-theo-luong-demo`.

Tài liệu này là chuẩn cho mọi màn của ứng dụng (Expo SDK 58, React Native 0.88, Expo Router, không dùng thư viện UI ngoài). Token nằm trong mã:

| Tệp | Nội dung |
| --- | --- |
| `src/theme.ts` | Màu gốc `C`, `bar`, `G`; bán kính `radius`; bóng `shadow`; font `F`; cỡ chữ `T`, `ROLE_SCALE`. Phần mới (chỉ thêm): `Tone`, `Semantic`, `semantic`, `space`, `radiusExtra`, `typeScale`, `size`, `elevation`, `interaction`. |
| `src/theme.status.ts` | Quy tắc màu và biểu tượng cho trạng thái thiết bị, điều trị, kết quả AI, nhãn ảnh. |
| `src/theme.contrast.test.ts`, `src/theme.status.test.ts` | Kiểm tra tương phản WCAG 2.2, tên biểu tượng, các quy tắc nghĩa màu. Chạy trong `npm test`. |
| `src/components/ui.tsx` | Component dùng chung. Design system không thêm component mới; mục 4 nói component nào đảm nhận vai trò nào. |

Giai đoạn này chưa đổi giao diện màn nào: các giá trị cũ giữ nguyên, ảnh chụp 43 màn trước và sau khi thêm token trùng khớp từng điểm ảnh (trừ đồng hồ thời gian thực ở T02). Việc chuyển màn theo mục 7.

## 1. Nguyên tắc

1. **An toàn trước, đẹp sau.** Màn có thiết bị đang phát plasma (T02) hoặc đang nạp liệu trình (T01) luôn có đúng một hành động chính, và hành động dừng luôn dễ thấy nhất khi máy đang chạy (V01, V04).
2. **Một màu, một nghĩa.** Năm vai trò ngữ nghĩa (mục 2.2). Không dùng màu trạng thái để trang trí (V07).
3. **Màu không đứng một mình.** Mỗi trạng thái có biểu tượng và chữ đi kèm (WCAG 2.2 SC 1.4.1).
4. **Đọc nhanh.** Số quan trọng to, nhãn ngắn, cặp nhãn và giá trị thẳng hàng; thuật ngữ tiếng Việt, mã kỹ thuật vào "Chi tiết kỹ thuật" (V16, V29, V30).
5. **Hai kênh thiết bị, hai từ.** Cáp USB/UART dùng "kết nối"; đồng bộ máy chủ qua Wi-Fi dùng "trực tuyến/ngoại tuyến" (V02).
6. **Dùng lại trước khi thêm.** Thêm giá trị mới vào `theme.ts` một lần rồi gọi theo tên; không viết mã màu, cỡ chữ trực tiếp trong màn.

## 2. Màu sắc

### 2.1 Màu gốc (giữ nguyên)

Màu chính mòng két hợp bối cảnh y tế: lạnh, yên, không trùng màu cảnh báo. Mọi cặp chữ/nền dưới đây đạt tối thiểu 4,5:1 (kiểm trong `theme.contrast.test.ts`).

| Token | Mã | Dùng cho | Tương phản |
| --- | --- | --- | --- |
| `C.primary` | #0B6B6F | Nút chính, mục đang chọn, liên kết | Chữ trắng 6,27:1; trên nền `bg` 5,73:1 |
| `C.primaryDark` | #06454A | Gradient nút giữa thanh tab | |
| `C.primarySoft` | #DFF1EF | Nền nhấn nhẹ, nút ở thanh tiêu đề | `primary` trên nó 5,37:1 |
| `C.bg` | #F3F5F4 | Nền màn | |
| `C.card` | #FFFFFF | Nền thẻ, ô chọn | |
| `C.surfaceMuted` | #F5F8F7 | Nền ô nhập, khối mã | |
| `C.text` | #15232A | Tiêu đề, giá trị | |
| `C.textBody` | #253840 | Thân bài (mặc định của `Text`) | |
| `C.textSoft` | #3F5764 | Nhãn, mô tả | ≥ 6,4:1 trên mọi nền sáng |
| `C.textFaint` | #52626E | Gợi ý, placeholder | ≥ 5,3:1 |
| `C.border` | #E1E7E6 | Vạch chia trong thẻ | Trang trí, không mang thông tin |
| `C.cardBorder` | #BFCAC8 | Viền thẻ phẳng, viền ô nhập | 1,53:1 trên `bg`: chấp nhận vì viền không mang thông tin |

### 2.2 Vai trò ngữ nghĩa (`semantic`)

| Vai trò | `fg` trên `bg` | `solid` (chữ trắng) | Nghĩa duy nhất | Ví dụ |
| --- | --- | --- | --- | --- |
| `success` | #2E7031 trên #E8F4E5, 5,32:1 | #2E7031 | Hoàn thành, đạt | Máy đã nhận cấu hình, buổi chiếu xong, đã có diện tích |
| `warning` | #A5590F trên #FDEFE0, 4,61:1 | không có | Cần chú ý, chưa nguy hiểm | Bỏ lỡ, buổi gián đoạn, ngoại tuyến, chưa đo, độ tin cậy AI thấp |
| `danger` | #CD203A trên #FDE7EB, 4,61:1 | #CD203A, 5,44:1 | Lỗi, nguy hiểm, không thể hoàn tác | NAK, lỗi trên máy, mức Nặng, nút Dừng chiếu, Xóa |
| `info` | #1E5FA8 trên #E4EEF9, 5,49:1 | #1E5FA8 | Đang diễn ra, thông tin có nhấn | Đang chiếu, đợt đang áp dụng, lịch hẹn, gợi ý của AI |
| `neutral` | #3F5764 trên #ECEFEE, 6,58:1 | không có | Không hoạt động, không mang trạng thái | Chưa kết nối, nháp, kết thúc, mức Nhẹ, nút bị khóa, ô số liệu |

Mỗi vai trò có thêm `bar` (vạch biểu đồ) và `tone` (tên tông để truyền vào `Chip`, `Notice`, `IconBadge`, `NumberTile`).

Quy tắc:

- `violet` và `blue` (tông `primary`) không dùng cho trạng thái. `violet` chỉ còn cho chuỗi thứ hai trong biểu đồ nếu cần.
- Ô số liệu (`NumberTile`, `Stat`, `StatGrid`) mặc định `neutral`; chỉ đổi vai trò khi chính con số cần xử lý (bỏ lỡ > 0 thành `warning`, lỗi chưa xử lý > 0 thành `danger`).
- Một thẻ chỉ có một thông báo cho một sự kiện. Không đặt thông báo `success` và `warning` liền nhau cho cùng một việc (V03).
- `Dữ liệu mô phỏng` (`SimBadge`) giữ tông `warning`: đây là lời nhắc thật cho người dùng.

## 3. Typography, spacing, radius, shadow, kích thước

### 3.1 Typography (`typeScale`)

Một họ chữ: Google Sans Flex (Regular, Medium, Bold; `src/components/Text.tsx` tự chọn tệp theo độ đậm). Chữ đơn cách `MONO` chỉ cho mã giao thức (Q05). Cỡ chữ dưới đây trước hệ số vai trò: bệnh nhân nhân 17/16 (`ROLE_SCALE`), không chữ nào nhỏ hơn 12 (`T.min`).

| Bậc | Cỡ / dòng | Đậm | Dùng cho | Hiện tại |
| --- | --- | --- | --- | --- |
| `display` | 40 / 48 | 700 | Một số chính của màn: diện tích B05, N05 | Nhiều cỡ khác nhau |
| `timer` | 44 / (không đặt) | 700 | Đồng hồ đếm ngược T02 (PP-17, giữ cỡ đang hiển thị) | Đúng |
| `screenTitle` | 22 / 28 | 700 | Tiêu đề thanh trên | Đúng |
| `sectionTitle` | 20 / 26 | 700 | Tiêu đề mục (`SectionTitle`) | 18, trùng tiêu đề thẻ (V23) |
| `cardTitle` | 18 / 24 | 700 | Tiêu đề thẻ (bằng `T.cardTitle`) | Đúng |
| `stat` | 28 / 34 | 700 | Số trong ô số liệu (`NumberTile`) | Đúng |
| `statCompact` | 24 / 30 | 700 | Số trong vòng tiến độ (`Ring`) và `StatGrid` (bằng `T.stat`) | Đúng |
| `body` | 16 / 24 | 400 | Thân bài | Đúng |
| `bodyStrong` | 16 / 24 | 500 | Giá trị thông số điều trị | Đúng ở `InfoRow` |
| `label` | 15 / 20 | 500 | Nhãn ô nhập, nhãn thông số, chữ lựa chọn | Đúng |
| `small` | 14 / 21 | 400 | Mô tả, ghi chú, chú giải biểu đồ | Một số chú giải 12 đến 13 (V17) |
| `caption` | 13 / 18 | 600 | Chữ trong Badge; không dùng cho nội dung cần đọc kỹ | Đúng |

Số đếm thời gian dùng `fontVariant: ['tabular-nums']` để không nhảy. Tiêu đề không cắt chữ ở 360 px: rút gọn chữ hoặc cho xuống 2 dòng (V22).

### 3.2 Spacing (`space`)

Thang 4 pt: `xxs` 2, `xs` 4, `s` 8, `m` 12, `l` 16, `xl` 24, `xxl` 32.

| Chỗ dùng | Giá trị |
| --- | --- |
| Lề trái phải của màn | `l` 16 |
| Đệm trong thẻ | `l` 16 |
| Giữa các phần tử trong thẻ | `m` 12 (thẻ hiện dùng 10, chấp nhận khi chuyển dần) |
| Giữa hai thẻ | `m` 12 |
| Giữa tiêu đề mục và thẻ đầu tiên | `s` 8 |
| Giữa hai mục | `xl` 24 |
| Giữa nhãn và ô nhập | 6 (ngoại lệ duy nhất, giữ như `Field`) |
| Lề nhãn tab ở 320 px | ≥ 12, `BAR_SIDE` giữ 12 theo TC13 |

### 3.3 Bán kính

`radius.s` 8 (ô tích, khối nhỏ), `radius.m` 12 (ô nhập, ảnh, khối trong thẻ), `radius.card` 16 (mọi thẻ), `radius.sheet` 24 (thanh tiêu đề, thanh tab), `radiusExtra.button` 24 (nút), `radiusExtra.pill` 999 (Badge, lựa chọn dạng viên).

### 3.4 Bóng (`elevation`)

| Bậc | Dùng cho |
| --- | --- |
| 0 | Thẻ phẳng: không bóng, viền 1 pt `cardBorder` |
| 1 (`shadow`) | Thẻ `hero` (tối đa một thẻ đầu màn), `Segmented` |
| 2 | Nút chính |
| 3 | Thanh tiêu đề, thanh tab |

Không dùng bóng để phân biệt trạng thái. Nút bị khóa không có bóng.

### 3.5 Kích thước (`size`)

| Token | Giá trị | Ghi chú |
| --- | --- | --- |
| `size.touch` | 44 | Vùng chạm tối thiểu mọi phần tử bấm được (Apple HIG). `TextLink`, `HeaderButton`, `Choices` đã đạt |
| `size.input` | 48 | Chiều cao ô nhập |
| `size.button` | 52 | Nút chính |
| `size.buttonDanger` | 56 | Nút Dừng chiếu ở T02 |
| `size.icon` | 16 / 20 / 24 | Trong Badge / trong nút và dòng / thanh tiêu đề, thanh tab |
| `size.avatar` | 40 | `IconBadge`, `RoleAvatar` |
| `size.tabBar` | 62 | Bằng `TAB_BAR_HEIGHT` |
| `size.maxContent` | 560 | Bề rộng nội dung tối đa trên máy tính bảng và web |

## 4. Component dùng chung

Mỗi vai trò dưới đây đã có component; không tạo component trùng. Cột "Cần bổ sung" là việc làm khi chuyển màn, không làm trong giai đoạn này.

### Button (`Button`, `TextLink`, `HeaderButton`)

| Biến thể | Hình thức | Khi nào |
| --- | --- | --- |
| `primary` | Gradient `G.fab`, chữ trắng, bóng bậc 2 | Đúng một nút mỗi màn hoặc mỗi bước |
| `secondary` | Nền trắng, viền `primarySoft`, chữ `primary` | Hành động thay thế |
| `danger` | Nền `redSoft`, chữ `red` | Đăng xuất, Xóa có xác nhận |
| `ghost` | Không nền, chữ `primary` | Quay lại trong bước |
| `TextLink` | Chữ, vùng chạm 44 × 44 | Sửa, Xóa trong danh sách, Gửi lại |

Nhãn: động từ + đối tượng, một dòng ở 360 px, không chứa chú thích kỹ thuật như "(giả lập)".

Cần bổ sung: biến thể `danger` đặc (nền `semantic.danger.solid`, cao `size.buttonDanger`) cho Dừng chiếu; trạng thái khóa dùng `interaction.disabled` thay cho `opacity 0.45` (chữ trắng trên nền mờ chỉ 2,2:1, V20); thuộc tính `reason` hiện một dòng lý do dưới nút khi khóa.

### Input (`Field`, `TextInput` trong `Text.tsx`)

Nhãn trên ô (`label`), ô cao ≥ 48, nền `surfaceMuted`, bo `radius.m`. Viền theo `interaction.inputBorder`: nghỉ `cardBorder`, đang nhập `primary` 2 pt, lỗi `red`. Lỗi hiện ngay dưới ô, `accessibilityLiveRegion="polite"` (đã có), giữ nội dung đã nhập. Ô tùy chọn ghi "(không bắt buộc)" sau nhãn; không dùng dấu * và không dùng placeholder "Bắt buộc" (V13). Placeholder chỉ là ví dụ, bắt đầu bằng "Ví dụ:" (V14). Bàn phím theo dữ liệu: `number-pad` cho năm sinh, giây, mã kích hoạt; `phone-pad` cho số điện thoại. Ngày dùng bộ chọn ngày của hệ điều hành (V11).

Cần bổ sung: viền `cardBorder` và viền khi focus (hiện viền `border` 1,25:1).

### Select (`Segmented`, `Choices`, `SwitchRow`)

| Tình huống | Component |
| --- | --- |
| 2 đến 4 lựa chọn ngắn, loại trừ nhau (giới tính, Triệu chứng/Sự cố) | `Segmented` |
| 2 đến 8 lựa chọn, nhãn có độ dài khác nhau (mức năng lượng, chế độ, phân loại vết thương) | `Choices` (xuống dòng) |
| Bật hoặc tắt một quyền có hiệu lực ngay | `SwitchRow` |
| Xác nhận có hậu quả (bác sĩ xác nhận liều) | Ô tích có câu đầy đủ, không dùng công tắc (V12) |
| Danh sách dài (chọn bệnh nhân) | Màn danh sách có ô tìm, không dùng danh sách thả xuống |

Ứng dụng không có danh sách thả xuống và không cần thêm.

### Card (`Card`, `ListCard`, `GradientCard`, `Notice`, `Disclosure`)

| Loại | Hình thức | Dùng cho |
| --- | --- | --- |
| `Card hero` | Trắng, bóng bậc 1, bo 16 | Một thẻ chính đầu màn |
| `Card` | Trắng, viền `cardBorder`, bo 16 | Mọi thẻ còn lại |
| `ListCard` | Thẻ chứa các dòng cách nhau bằng `Divider` | Danh sách bệnh nhân, ảnh, thiết bị |
| `GradientCard` | Gradient `G`, chữ trắng | Chỉ thẻ tóm tắt trang chủ, tối đa một mỗi màn |
| `Notice` | Nền nhạt của vai trò, biểu tượng + chữ | Thông báo thành công, cảnh báo, lỗi |
| `Disclosure` | Thu gọn, tóm tắt 2 dòng | Chi tiết kỹ thuật, phần phụ |

Thẻ thông số điều trị: cặp nhãn trái, giá trị phải, thứ tự cố định Mức năng lượng → Chế độ → Thời gian chiếu → Số lần mỗi buổi, dùng chung ở T01, N03, N06, B05 (V29).

### Table (`InfoRow`, `StatGrid`, `ListCard`)

React Native không có bảng; ứng dụng dùng ba dạng:

- Cặp khóa và giá trị: `InfoRow` (nhãn `textSoft` trái, giá trị `text` phải; `stack` khi giá trị dài; `mono` cho mã giao thức).
- Lưới số liệu 2 cột: `StatGrid`, `NumberTile`.
- Danh sách nhiều thuộc tính: `ListCard` mỗi dòng một bản ghi, tối đa hai Badge mỗi dòng (V08).

Không dựng bảng nhiều cột trên điện thoại; báo cáo PDF (`src/lib/report.ts`) mới dùng bảng thật.

### Dialog (`confirm`, `notify` trong `src/lib/dialog.ts`)

Dùng hộp thoại hệ điều hành (`Alert` trên máy, `window.confirm`/`alert` trên web). Tiêu đề là câu hỏi hoặc kết quả; nút xác nhận là động từ của việc sắp làm ("Xóa giai đoạn", "Khôi phục"), không dùng "OK". Bắt buộc xác nhận trước việc không hoàn tác: xóa, khôi phục dữ liệu mô phỏng, ngắt cáp khi đang chiếu. Thành công thông thường hiện bằng `Notice` ngay trên màn thay vì hộp thoại.

Cần bổ sung: tham số `destructive` cho `confirm` để nút xác nhận dùng kiểu `destructive` của `Alert`.

### Badge (`Chip`, `SimBadge`, `RoleBadge`, `IconBadge`)

Viên tròn `radiusExtra.pill`, chữ `caption`, biểu tượng 12 đến 16. Tông lấy từ `semantic[role].tone` hoặc từ bảng trong `theme.status.ts`, không chọn tông theo cảm tính. Tối đa hai Badge trạng thái mỗi dòng danh sách. Badge không bấm được; cần bấm thì dùng `Choices` hoặc `TextLink`.

### Navigation (`Header`, `HeaderButton`, `RoleTabs`)

- `Header`: tiêu đề `screenTitle`, dòng phụ `small` (chỉ vẽ biểu tượng dòng phụ khi có chữ, V21), nút quay lại 44 × 44.
- `RoleTabs`: 5 mục mỗi vai trò, mục giữa nổi là hành động thường gặp nhất (Chụp ảnh với bác sĩ, Lịch trình với bệnh nhân); mục cuối luôn "Cá nhân". Nhãn ≥ 12 pt, lề ≥ 12 px ở 320 px (TC13).
- Bước trong một luồng: một kiểu duy nhất là thanh 3 bước `StepRow` của T01; B06 chuyển sang dùng chung (V10).

## 5. Trạng thái giao diện

| Trạng thái | Quy tắc | Token |
| --- | --- | --- |
| Default | Như mục 4 | |
| Hover (chỉ web) | Nút và dòng bấm được: nền đậm thêm một bậc (`primarySoft` cho nút phụ). Không dùng hover để hiện thông tin | |
| Focus | Viền `interaction.focusRing` (2 pt `primary`, cách 2 pt) trên web và bàn phím; trên máy dựa vào khung của TalkBack, VoiceOver, nên mọi phần tử bấm được phải có `accessibilityLabel` | `interaction.focusRing` |
| Active (đang nhấn) | `opacity` `interaction.pressedOpacity` 0,8 (đã dùng ở `Button`, `Card`) | `interaction.pressedOpacity` |
| Selected | Nền `primary`, chữ trắng (`Choices`, `Segmented`) | `interaction.selected` |
| Disabled | Nền `neutralSoft`, chữ `textSoft` 6,58:1, không bóng, kèm một dòng lý do. `accessibilityState.disabled` | `interaction.disabled` |
| Loading | Nút giữ nhãn, thay biểu tượng bằng `ActivityIndicator`, `busy: true` (đã có). Danh sách và thẻ: khối giữ chỗ cùng kích thước nội dung, không dùng vòng quay toàn màn | |
| Success | `Notice` vai trò `success` một dòng: việc đã xong + bước tiếp theo nếu có ("Máy đã nhận cấu hình. Bấm Theo dõi phiên để bắt đầu.") | `semantic.success` |
| Error | Lỗi ô nhập: dưới ô. Lỗi thao tác: `Notice` `danger` gồm nguyên nhân bằng lời thường + việc người dùng làm được + mã gốc trong ngoặc (mẫu `sendResultLabel`, `nakHint`) | `semantic.danger` |
| Warning | `Notice` `warning`, như Error nhưng việc vẫn tiếp tục được | `semantic.warning` |
| Empty | `Empty`: biểu tượng + một câu nói vì sao trống + hành động kế tiếp nếu có ("Chưa có ảnh. Chụp ảnh có hướng dẫn") | `neutral` |
| Offline | Dải `warning` ở đầu màn: "Ngoại tuyến, dữ liệu lúc …". Hành động cần máy chủ bị khóa kèm lý do | `CLOUD_LINK.offline` |

## 6. Màu cho trạng thái thiết bị, điều trị và kết quả AI

Bảng đầy đủ nằm trong `src/theme.status.ts`; mỗi mục trả về `{ role, icon }`, màu lấy từ `semantic[role]`.

### 6.1 Thiết bị

| Kênh | Trạng thái | Vai trò | Biểu tượng | Chữ |
| --- | --- | --- | --- | --- |
| USB/UART (`USB_LINK`) | Chưa kết nối | neutral | unlink | Chưa kết nối |
| | Đang kết nối | info | sync | Đang kết nối |
| | Đã kết nối | success | link | Đã kết nối |
| | Lỗi kết nối | danger | alert-circle | Lỗi kết nối |
| Wi-Fi tới máy chủ (`CLOUD_LINK`) | Đồng bộ gần đây | success | cloud-done | Trực tuyến |
| | Quá `CLOUD_STALE_HOURS` (48 giờ, đề xuất chưa có nguồn) | warning | cloud | Lâu chưa đồng bộ |
| | Mất kết nối | warning | cloud-offline | Ngoại tuyến |
| | Chưa đồng bộ lần nào | neutral | cloud | Chưa đồng bộ lần nào |
| Gửi cấu hình (`SEND_RESULT`) | Máy nhận (ACK) | success | checkmark-circle | `sendResultLabel` |
| | NAK, không tương thích, không hợp lệ | danger | close-circle, alert-circle | |
| | Hết thời gian, dữ liệu hỏng, mất cáp, chưa nhận diện máy | warning | time, warning, unlink, help-circle | |

Thẻ thiết bị luôn hiện hai kênh tách biệt khi cả hai có nghĩa ở màn đó; "Ngoại tuyến" không dùng tông xám (V24).

### 6.2 Điều trị

| Đối tượng | Trạng thái → vai trò |
| --- | --- |
| Phiên chiếu (`SESSION`) | Chờ → neutral; Đang chiếu → info; Đã xong → success; Đã dừng giữa chừng → warning; Lỗi trên máy → danger |
| Ngày trong lịch (`ADHERENCE_DAY`) | Đủ → success; Thiếu, bỏ lỡ, thừa → warning; Chưa đồng bộ, nghỉ, có lịch → neutral; Hôm nay → info |
| Đợt điều trị (`PLAN`) | Nháp → neutral; Đang áp dụng → info; Tạm dừng → warning; Kết thúc → neutral |
| Vết thương (`WOUND`) | Đang điều trị, chờ xác nhận liền → info; Tạm dừng → warning; Đã liền, đang theo dõi → success; Kết thúc → neutral |
| Mức độ (`SEVERITY_ROLE`) | Nhẹ → neutral; Trung bình → warning; Nặng → danger |
| Xu hướng diện tích (`TREND_ROLE`) | Cải thiện → success; Ổn định, chưa đủ dữ liệu → neutral; Xấu đi → danger |

Ở T02, khi `SESSION` là `running`: chỉ một nút, "Dừng chiếu", biến thể danger đặc, cao 56 (V01).

### 6.3 Kết quả AI và nhãn ảnh

| Đối tượng | Trạng thái → vai trò |
| --- | --- |
| Nguồn số liệu (`SOURCE`) | Gợi ý của AI → info (sparkles); Bác sĩ nhập → neutral (person). Luôn hiện cạnh số diện tích |
| Độ tin cậy (`AI_CONFIDENCE`, `aiConfidenceLevel`) | Cao, trung bình → info; Thấp → warning, kèm "cần bác sĩ kiểm"; Không có → neutral, ghi "Mô-đun không cung cấp độ tin cậy" |
| Nhãn diện tích (`LABEL`) | Đã có → success; Chưa có → warning; Loại khỏi bộ dữ liệu → neutral |

Kết quả AI không bao giờ dùng `success`, kể cả độ tin cậy cao: chưa có bác sĩ xác nhận thì vẫn là gợi ý. Khi bác sĩ bấm dùng số của AI, nguồn chuyển thành "Bác sĩ xác nhận từ gợi ý AI". Ngưỡng `AI_CONFIDENCE_THRESHOLDS` (0,8 và 0,5) là giá trị tạm, chờ nhóm AI cung cấp theo mô hình thật; `RecognitionResult.confidence` hiện là `null` với bộ dò màu nên mọi kết quả hiện "Mô-đun không cung cấp độ tin cậy".

## 7. Lộ trình áp dụng cho màn hình

Chuyển theo đợt ưu tiên của báo cáo đánh giá. Mỗi đợt một PR, chụp lại các màn liên quan và chạy `scripts/kiem-thu-giao-dien.cjs`.

| Đợt | Màn | Dùng token nào | Vấn đề giải quyết |
| --- | --- | --- | --- |
| 1 | T02, T01, N07 | `SESSION`, `SEND_RESULT`, nút danger đặc `size.buttonDanger`, một nút `primary` mỗi màn | V01, V03, V04, V05 |
| 2 | N07, B04, B13, Q01, Q03, `DeviceView` | `CLOUD_LINK`, `USB_LINK`, `semantic`; ô số liệu `neutral` | V02, V07, V24 |
| 3 | `ui.tsx`: `Button`, `Field`, `Header`, `SectionTitle`, `NumberTile`, `StatGrid` | `interaction.disabled`, `interaction.inputBorder`, `typeScale` | V20, V21, V23, V13, V14 |
| 4 | B06, B01, B02 | `StepRow`, `space`, `SEVERITY_ROLE` | V08, V09, V10, V11, V12 |
| 5 | N03, N08, N01 | `ADHERENCE_DAY`, `typeScale.small` | V17, V18, V19 |
| 6 | B11, B12, B08, Q02 | `SOURCE`, `AI_CONFIDENCE`, `LABEL` | V06, V25, V30, V31 |

Các bảng tông hiện có sẽ được thay khi chuyển màn: `SEVERITY` (`src/lib/access.ts`, Nhẹ đang green), `WOUND_STATUS`, `PLAN_STATUS` (Đang áp dụng green, Kết thúc red), `LABEL_STATUS`, `TREND` (`src/lib/format.ts`). Nhãn chữ trong các bảng đó giữ nguyên; chỉ phần `tone` chuyển sang đọc từ `theme.status.ts`.

## 8. Kiểm tra

- `npm test`: `theme.contrast.test.ts` (mọi cặp chữ/nền ≥ 4,5:1, chữ trắng trên mọi điểm dừng gradient) và `theme.status.test.ts` (vai trò ngữ nghĩa ≥ 4,5:1, nút khóa đọc được, biểu tượng có trong Ionicons, các quy tắc 6.2 và 6.3).
- `scripts/kiem-thu-giao-dien.cjs`: 41 trường hợp, gồm TC13 lề tab ở 320 px.
- Chưa kiểm được trên bản web: cỡ chữ lớn nhất của hệ điều hành, TalkBack, VoiceOver, chế độ tối (`app.json` khóa giao diện sáng).

## Nguồn

- W3C, 2023. Web Content Accessibility Guidelines (WCAG) 2.2: SC 1.4.1 Use of Color, SC 1.4.3 Contrast (Minimum), SC 1.4.11 Non-text Contrast. https://www.w3.org/TR/WCAG22/
- Apple. Human Interface Guidelines, Accessibility: vùng chạm tối thiểu 44 × 44 pt. https://developer.apple.com/design/human-interface-guidelines/accessibility
- Google. Material Design 3, Accessibility: vùng chạm 48 × 48 dp. https://m3.material.io/foundations/designing/structure
- Báo cáo "Đánh giá UI/UX ứng dụng Plasma Pro", 12/11/2026 (mã vấn đề V01 đến V32).
