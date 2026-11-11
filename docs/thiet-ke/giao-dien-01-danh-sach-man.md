# Giai đoạn 5.1. Danh sách màn hình theo vai trò

Trạng thái: **bản nháp** (11/11/2026). Lập từ mã nhánh `trien-khai/giai-doan-2` (commit `a2719c8`), đọc mã, chưa chạy ứng dụng trên điện thoại. Hai tệp đi kèm: [giao-dien-02-luong-man.md](giao-dien-02-luong-man.md) (sơ đồ luồng) và [giao-dien-03-wireframe.md](giao-dien-03-wireframe.md) (wireframe, trạng thái lỗi).

## Căn cứ

- Danh sách 12 nhóm màn dự kiến ở giai đoạn 5 trong tệp quy trình 9 giai đoạn chủ đồ án gửi ngày 11/11/2026 (tệp không nằm trong kho mã).
- FR1 đến FR17 và NFR4 ở [05-nhu-cau-tinh-nang.md](05-nhu-cau-tinh-nang.md); bảng đối chiếu mã ở [doi-chieu-ma-nguon.md](doi-chieu-ma-nguon.md).
- Vai trò: bác sĩ, người bệnh, quản trị viên; không có điều dưỡng ([10-kien-truc-tong-the.md](10-kien-truc-tong-the.md), KT7). Kiểm quyền mỗi màn bằng `RoleTabs`, `useCanView` (`src/components/RoleTabs.tsx`, `src/components/Guard.tsx`).
- Mỗi tệp trong `src/app/` là một màn (Expo Router).

## Quy ước

- Mã màn: `C` chung, `N` người bệnh, `B` bác sĩ, `Q` quản trị viên, `T` màn thiết bị dùng chung. Mã này dùng trong sơ đồ luồng và wireframe.
- Cột "Hiện trạng": **Có** là màn đã có trong mã; **Một phần** là màn có nhưng chưa đủ FR; **Đề xuất** là màn hoặc trạng thái chưa có trong mã.
- Cột FR chỉ ghi FR mà màn trực tiếp phục vụ. Màn không gắn FR nào ghi "Không có FR", theo quy tắc bảng tham chiếu không thừa, không thiếu ở slide 26 [1].

## Bảng màn hình

### Màn chung (mọi vai trò)

| Mã | Màn | Tệp | Vai trò | FR, NFR | Hiện trạng |
|---|---|---|---|---|---|
| C01 | Đăng nhập (kèm chọn nhanh tài khoản demo) | `index.tsx` | Cả ba | NFR1 | Có. Đăng nhập cục bộ, chưa qua máy chủ |
| C02 | Đăng ký tài khoản | `register.tsx` | Người bệnh, bác sĩ (bác sĩ chờ quản trị duyệt) | NFR1 | Có |
| C03 | Kích hoạt bằng mã 6 số bác sĩ cấp | `activate.tsx` | Người bệnh | NFR1 | Có |
| C04 | Điều khoản và quyền riêng tư | `terms.tsx` | Cả ba | NFR1 | Có |
| C05 | Căn cứ pháp lý | `compliance.tsx` | Cả ba | NFR2 | Có |
| C06 | Tài khoản cá nhân (đăng xuất, xem lại hướng dẫn, điều khoản) | `*/account.tsx` dùng `AccountScreen.tsx` | Cả ba | NFR1 | Có |

### Người bệnh

| Mã | Màn | Tệp | FR | Hiện trạng |
|---|---|---|---|---|
| N01 | Hướng dẫn lần đầu (4 trang, có nút gọi 115) | `onboarding.tsx` | Không có FR (gợi ý gắn UR1) | Có |
| N02 | Trang chủ: việc điều trị hôm nay, vòng tiến độ, lịch hẹn gần nhất, việc trước và sau khi chiếu | `patient/index.tsx` | FR1, FR7 | Một phần: chưa hiện chế độ điều trị (FR1) |
| N03 | Lịch trình: lịch tuân thủ, ghi cảm giác sau mỗi lần chiếu | `schedule.tsx`, `AdherenceCalendar.tsx` | FR1, FR6 | Một phần: chưa có ngưỡng đau do bác sĩ đặt (FR6) |
| N04 | Hồ sơ và lịch sử: thông tin cá nhân, các vết thương | `patient/history.tsx` | FR7 | Có |
| N05 | Chi tiết vết thương (chế độ xem của người bệnh): biểu đồ diện tích, đánh giá đã công bố | `wounds/[id].tsx` | FR7 | Có |
| N06 | Đợt điều trị của tôi (chỉ xem) | `plan/[patientId].tsx` | FR1, FR9 | Có, nhưng chưa màn nào của người bệnh dẫn tới (xem sơ đồ luồng mục 2) |
| N07 | Thiết bị của tôi: tiến độ, phiên sử dụng, chăm sóc thiết bị, lối vào T01, T02 | `patient/device.tsx`, `DeviceView.tsx` | FR4, FR13 | Có |
| N08 | Báo triệu chứng hoặc sự cố | `report.tsx` | FR6 | Một phần: chưa có thang VAS 0 đến 10 trong màn này |

`patient/send.tsx` chỉ chuyển hướng sang N04 (luồng người bệnh tự gửi ảnh đã bỏ, vì FR5 giao việc chụp cho bác sĩ). Không tính là màn.

### Bác sĩ

| Mã | Màn | Tệp | FR | Hiện trạng |
|---|---|---|---|---|
| B01 | Trang chủ: ô việc cần làm, danh sách người bệnh xếp theo mức cần chú ý, 3 trạng thái hôm nay | `doctor/index.tsx` | FR10 | Có |
| B02 | Danh sách người bệnh, tìm kiếm | `doctor/patients.tsx` | Không có FR (xem mục Thiếu sót) | Có |
| B03 | Thêm người bệnh, cấp mã hồ sơ, mã kích hoạt | `patients/new.tsx` | Không có FR (xem mục Thiếu sót) | Có |
| B04 | Hồ sơ người bệnh: thông tin, vết thương, thiết bị, báo cáo người bệnh gửi | `patients/[id].tsx` | FR6, FR13 | Có |
| B05 | Thông tin vết thương: diện tích theo thời gian, album ảnh, đợt điều trị, đánh giá | `wounds/[id].tsx` | FR7, FR17 | Có |
| B06 | Thiết lập thông tin điều trị (đợt điều trị có phiên bản, lý do thay đổi) | `plan/[patientId].tsx` | FR9, FR2 (nguồn cấu hình), FR3 | Một phần: chưa giới hạn an toàn theo năng lực máy (FR9), chưa tính J/cm² (FR3) |
| B07 | Đánh giá tình trạng vết thương | `evaluate/[woundId].tsx` | Không có FR (mục "thừa" ở doi-chieu-ma-nguon) | Có |
| B08 | So sánh trước và sau | `compare/[woundId].tsx` | FR7 (gợi ý gộp) | Có |
| B09 | Chọn người bệnh và vết thương trước khi chụp | `capture.tsx` | FR5 | Có |
| B10 | Chụp có hướng dẫn hoặc tải ảnh, kiểm chất lượng, kết quả AI (vùng khoanh, diện tích ước lượng) | `guided-capture.tsx` | FR5, FR11 | Một phần: AI là bộ dò màu tạm, bác sĩ chưa sửa được vùng (FR11) |
| B11 | Chi tiết ảnh: nhãn diện tích, lịch sử sửa nhãn, yêu cầu chụp lại, xác nhận chia sẻ nghiên cứu | `images/[id].tsx` | FR11, FR15, FR16, FR12 | Một phần: nhãn chỉ có diện tích (FR15, xem mục Chồng lấn với giai đoạn 7) |
| B12 | Danh sách ảnh theo trạng thái nhãn | `doctor/dataset.tsx` | FR17, FR12 | Một phần: chưa tìm theo người bệnh trên toàn bộ ảnh (FR17) |
| B13 | Thiết bị và nhật ký của một người bệnh | `devices/[id].tsx` | FR4, FR14 | Có |

### Màn thiết bị dùng chung (người bệnh, bác sĩ)

| Mã | Màn | Tệp | Vai trò | FR | Hiện trạng |
|---|---|---|---|---|---|
| T01 | Kết nối thiết bị Plasma Pro và nạp liệu trình | `connect-device.tsx` | Người bệnh (tại nhà), bác sĩ (tại phòng khám) | FR2 | Một phần: chưa thử với mạch; mã NAK hiện dạng thô; khung sai checksum từ máy không được báo riêng (xem wireframe) |
| T02 | Theo dõi phiên điều trị và trạng thái kết nối | `session-monitor.tsx` | Người bệnh, bác sĩ | FR2, FR4 | Một phần: chưa đọc nhật ký phiên từ máy (FR4, chờ F11 của ICD); không báo khi bản tin trạng thái ngừng đến |

### Quản trị viên

| Mã | Màn | Tệp | FR, TR | Hiện trạng |
|---|---|---|---|---|
| Q01 | Quản lý tài khoản: duyệt, khóa, quyền xuất dữ liệu, phân công bác sĩ | `admin/index.tsx` | NFR1 | Có |
| Q02 | Kho dữ liệu kỹ thuật, xuất ZIP ảnh có nhãn | `admin/dataset.tsx` | FR12 | Một phần: chưa có số phiên bản bộ dữ liệu |
| Q03 | Thiết bị: đăng ký, gán cho người bệnh, lối vào Q05 | `admin/devices.tsx` | FR13, FR14 | Một phần: chưa gán bằng quét mã (FR13) |
| Q04 | Lỗi đồng bộ thiết bị và máy chủ | `admin/logs.tsx` | FR8 | Có (dữ liệu mẫu, chưa có máy chủ) |
| Q05 | Chẩn đoán kết nối USB/UART: đặc tả, hỏi máy, gửi cấu hình thử, byte gửi và nhận | `device-diagnostics.tsx` | FR2, TR3 | Có |
| Q06 | Thiết bị và nhật ký (mức kỹ thuật) | `devices/[id].tsx` | FR14 | Có, dùng chung tệp với B13 |

Tổng cộng 33 màn: 6 chung, 8 người bệnh, 13 bác sĩ, 2 thiết bị dùng chung, 6 quản trị (Q06 và B13 cùng một tệp, khác mức hiển thị).

## Đối chiếu với 12 nhóm màn của giai đoạn 5

| Nhóm màn dự kiến | Màn đáp ứng | Đủ chưa |
|---|---|---|
| Đăng nhập và quản lý tài khoản | C01 đến C06, Q01 | Đủ ở mức cục bộ |
| Danh sách và hồ sơ chi tiết bệnh nhân | B02, B03, B04 | Đủ |
| Thông tin vết thương | B05, N05 | Đủ |
| Thiết lập thông tin điều trị | B06 | Một phần (FR3, FR9) |
| Kết nối thiết bị Plasma Pro | T01, Q05 | Một phần (chưa thử mạch) |
| Theo dõi phiên điều trị và trạng thái kết nối | T02, N07, B13 | Một phần (FR4) |
| Chụp ảnh hoặc tải hình ảnh vết thương | B09, B10 | Đủ |
| Danh sách và chi tiết hình ảnh | B12, B11, album trong B05 | Một phần (FR17) |
| Giao diện gán nhãn hình ảnh | B11 (chỉ nhãn diện tích) | Chưa đủ, thuộc giai đoạn 7 |
| Quản lý bộ dữ liệu và xuất dữ liệu | B12, Q02 | Một phần (phiên bản bộ dữ liệu) |
| Hiển thị kết quả từ mô-đun AI | B10 (khung kiểm tra, ước lượng diện tích), B11 | Một phần (FR11) |
| Lịch sử điều trị và lịch sử hình ảnh | N03, N04, B05, B13 | Đủ |

## Thiếu sót và chồng lấn

1. **Quản lý hồ sơ người bệnh chưa có FR.** B02, B03 và phần thông tin của B04 phục vụ nhóm chức năng "Quản lý hồ sơ bệnh nhân và mã định danh bệnh nhân" ở giai đoạn 2 của quy trình 9 giai đoạn, nhưng bộ FR1 đến FR17 không có dòng nào cho việc thêm, sửa, tra cứu người bệnh. Đề xuất (chưa chốt): bổ sung một FR quản lý hồ sơ người bệnh vào [05-nhu-cau-tinh-nang.md](05-nhu-cau-tinh-nang.md). Độ tin cậy cao: đã đọc đủ bảng FR.
2. **Chồng lấn với giai đoạn 7 (gán nhãn).** B11 hiện chỉ cho bác sĩ nhập diện tích (cm²) làm nhãn và lưu vết sửa nhãn (FR16). Phương pháp gán nhãn của FR15 (phân loại cả ảnh, khung chữ nhật hay phân vùng) chờ bác sĩ chốt và thuộc tài liệu giai đoạn 7. Tài liệu này giữ chỗ cho màn gán nhãn trong sơ đồ luồng (nút "Gán nhãn" trên B11) nhưng không thiết kế cách gán nhãn.
3. **Duyệt nhãn nằm ngoài phạm vi.** Không có màn duyệt nhãn; trường `researchReviewedBy` chỉ là bác sĩ xác nhận ảnh không lộ danh tính.
4. **iOS chưa có USB thật.** Người bệnh dùng cả Android và iOS, nhưng `usbAndroidAvailable()` chỉ có trên bản dựng Android; trên iOS, T01 rơi về thiết bị giả lập. Wireframe T01 thêm một trạng thái đề xuất cho trường hợp này.
5. **Màn không gắn FR:** N01, B07. Giữ lại theo đề xuất ở [doi-chieu-ma-nguon.md](doi-chieu-ma-nguon.md), chờ quyết định ở bước validation.

## Tài liệu tham khảo

1. Lương Thị Hồng Liên (2026). *Phương pháp luận thiết kế*, phần 1. Bài giảng, ĐHBK Hà Nội, slide 26 (bảng tham chiếu UR, FR, validation).
2. Mã nguồn `mducnguyen610/PlasmaProApp`, nhánh `trien-khai/giai-doan-2`, commit `a2719c8`, thư mục `src/app/`.
