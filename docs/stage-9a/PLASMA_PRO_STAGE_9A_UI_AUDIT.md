# Plasma Pro, Stage 9A: rà soát giao diện toàn ứng dụng

Ngày: 15/11/2026. Nền rà soát: master `457ee0c` (PR 59 đã gộp). PR 58 (Stage 8) chưa gộp nên không nằm trong nền.
Phạm vi: mã nguồn `src/app` (route Expo Router), `src/components`, `src/theme.ts`, và 49 ảnh chụp bản web ở 390 px.
Ứng dụng chỉ có frontend, dữ liệu mô phỏng trong `src/lib/seed.ts`.

Ảnh "trước" (49 màn, cả trang, 390 px, deviceScaleFactor 2): `/mnt/project-files/datn/stage-9a/anh/truoc/`.
Ảnh ghép đại diện trong repo: `docs/stage-9a/anh/`.

## 1. Danh mục màn hình (đối chiếu route và tệp thật)

| Mã | Màn | Route | Tệp |
|---|---|---|---|
| C01 | Đăng nhập | `/` | `src/app/index.tsx` |
| C02 | Tạo tài khoản | `/register` | `src/app/register.tsx` |
| C03 | Kích hoạt | `/activate` | `src/app/activate.tsx` |
| C04 | Điều khoản | `/terms` | `src/app/terms.tsx` |
| C05 | Căn cứ pháp lý | `/compliance` | `src/app/compliance.tsx` |
| B01 | Trang chủ bác sĩ | `/doctor` | `src/app/doctor/index.tsx` |
| B02 | Danh sách bệnh nhân (và hồ sơ lưu trữ) | `/doctor/patients` | `src/app/doctor/patients.tsx` |
| B03 | Thêm bệnh nhân | `/patients/new` | `src/app/patients/new.tsx` |
| B04 | Hồ sơ bệnh nhân | `/patients/[id]` | `src/app/patients/[id].tsx` |
| B04a | Sửa hồ sơ | `/patient-edit/[id]` | `src/app/patient-edit/[id].tsx` |
| B05 | Chi tiết vết thương | `/wounds/[id]` | `src/app/wounds/[id].tsx` |
| B05a | Sửa vị trí vết | `/wound-edit/[id]` | `src/app/wound-edit/[id].tsx` |
| B06 | Đợt điều trị (3 bước) | `/plan/[patientId]` | `src/app/plan/[patientId].tsx` |
| B07 | Đánh giá tình trạng (4 bước) | `/evaluate/[woundId]` | `src/app/evaluate/[woundId].tsx` |
| B08 | So sánh trước/sau | `/compare/[woundId]` | `src/app/compare/[woundId].tsx` |
| B08b | Lịch sử vết thương (4 thẻ) | `/wound-history/[woundId]` | `src/app/wound-history/[woundId]/index.tsx` |
| B08c | Lịch sử đợt điều trị | `/wound-history/[woundId]/dot-dieu-tri` | `.../dot-dieu-tri.tsx` |
| B08d | Bản ghi, ảnh trong lịch sử | `/wound-history/[woundId]/ban-ghi/[recordId]`, `/anh/[imageId]` | `.../ban-ghi/[recordId].tsx`, `.../anh/[imageId].tsx` |
| B09 | Chọn hồ sơ để chụp | `/capture` | `src/app/capture.tsx` |
| B10 | Chụp có hướng dẫn | `/guided-capture` | `src/app/guided-capture.tsx` |
| B11 | Chi tiết ảnh, nhập diện tích | `/images/[id]` | `src/app/images/[id].tsx` |
| B12 | Ảnh vết thương (tab) | `/doctor/dataset` | `src/app/doctor/dataset.tsx` |
| B13 | Thiết bị và nhật ký | `/devices/[id]` | `src/app/devices/[id].tsx`, `src/components/DeviceView.tsx` |
| B14 | Cá nhân bác sĩ | `/doctor/account` | `src/components/AccountScreen.tsx` |
| B15 | Không tìm thấy | mọi route không khớp | (trước: không có tệp) |
| N01 | Hướng dẫn lần đầu | `/onboarding` | `src/app/onboarding.tsx` |
| N02 | Trang chủ bệnh nhân | `/patient` | `src/app/patient/index.tsx` |
| N03 | Lịch trình | `/schedule` | `src/app/schedule.tsx` |
| N04 | Lịch sử và hồ sơ | `/patient/history` | `src/app/patient/history.tsx` |
| N05 | Vết thương (phía bệnh nhân) | `/wounds/[id]` | `src/components/PatientWoundDashboard.tsx` |
| N06 | Đợt điều trị (chỉ xem) | `/plan/[patientId]` | `src/app/plan/[patientId].tsx` |
| N07 | Thiết bị của tôi | `/patient/device` | `src/app/patient/device.tsx` |
| N08 | Báo triệu chứng, sự cố | `/report` | `src/app/report.tsx` |
| N09 | Cá nhân bệnh nhân | `/patient/account` | `src/components/AccountScreen.tsx` |
| Q01 | Quản lý tài khoản | `/admin` | `src/app/admin/index.tsx` |
| Q01b | Chi tiết tài khoản | `/admin-account/[id]` | `src/app/admin-account/[id].tsx` |
| Q02 | Kho dữ liệu kỹ thuật | `/admin/dataset` | `src/app/admin/dataset.tsx` |
| Q03 | Thiết bị | `/admin/devices` | `src/app/admin/devices.tsx` |
| Q04 | Lỗi hệ thống | `/admin/logs` | `src/app/admin/logs.tsx` |
| Q04b | Chi tiết lỗi | `/admin-log/[id]` | `src/app/admin-log/[id].tsx` |
| Q05 | Chẩn đoán kết nối | `/device-diagnostics` | `src/app/device-diagnostics.tsx` |
| Q06 | Thiết bị (kỹ thuật) | `/devices/[id]` | `src/components/DeviceView.tsx` |
| Q07 | Cá nhân quản trị | `/admin/account` | `src/components/AccountScreen.tsx` |
| T01 | Nạp liệu trình | `/connect-device` | `src/app/connect-device.tsx` |
| T02 | Theo dõi phiên điều trị | `/session-monitor` | `src/app/session-monitor.tsx` |

Bố cục dùng chung: `src/app/_layout.tsx` (Stack), `src/app/{doctor,patient,admin}/_layout.tsx` dùng `RoleTabs` (thanh tab đáy có nút giữa).
`src/app/patient/send.tsx` chỉ chuyển hướng. Tổng: 5 màn chung, 15 nhóm màn bác sĩ (B01 đến B15, kèm màn con), 9 bệnh nhân, 7 quản trị (kèm 2 màn con), 2 thiết bị.

## 2. Vấn đề thị giác theo nhóm màn (bản trước)

Mức: Cao (ảnh hưởng toàn ứng dụng hoặc an toàn đọc), Vừa, Thấp.

### 2.1 Toàn ứng dụng

| Mã | Vấn đề | Mức | Bằng chứng |
|---|---|---|---|
| A-01 | Bản sắc lấy theo mẫu "Fitness App" (comment đầu `theme.ts`, `ui.tsx`): mòng két `#0B6B6F` làm màu chủ đạo cho mọi thứ (nút, tab, vòng, liên kết, ô số), không có màu nhận diện riêng của sản phẩm y tế. | Cao | `src/theme.ts` dòng 1 đến 3, `C.primary` |
| A-02 | Thanh tiêu đề trắng bo góc dưới 24 và bóng đậm (elevation 3) ở mọi màn, màn chính và màn chi tiết trông như nhau; không phân biệt "nơi làm việc" và "đang xem một mục". | Cao | `s.header` trong `ui.tsx` |
| A-03 | Thẻ trắng bo 16 có viền `#BFCAC8` đậm cho mọi khối, kể cả tiêu đề nhóm nằm trong thẻ; màn dài là chuỗi thẻ giống nhau (B05 có 4 thẻ, mỗi thẻ có `SectionTitle` bên trong). | Cao | ảnh b05, b04, b13 |
| A-04 | Nút chính gradient kèm bóng màu (elevation 2, opacity 0,35), bo 24 kiểu viên thuốc; nút phụ viền `primarySoft` gần như không thấy trên nền trắng. | Vừa | `Button` |
| A-05 | Ô số "Việc cần làm" nền màu kẹo (hồng, cam, xanh nhạt), màu chiếm diện tích lớn, làm loãng nghĩa trạng thái. | Vừa | ảnh b01, q01 |
| A-06 | Thang chữ: tiêu đề màn 22, tiêu đề thẻ 18 bằng tiêu đề nhóm 20 (chênh nhỏ), số lâm sàng 36 weight 800 trong khi các số khác 24 weight 500: thứ bậc số liệu không nhất quán. Không dùng chữ số đều bề rộng cho cột số. | Vừa | `T`, `typeScale`, `wounds/[id].tsx` |
| A-07 | Biểu tượng vai trò, biểu tượng mục đều trong vòng tròn màu nhạt, giống biểu tượng bệnh nhân; danh sách bệnh nhân dùng cùng biểu tượng người chung cho mọi người, khó nhận diện nhanh. | Vừa | `PatientCard`, `IconBadge` |
| A-08 | Thanh tab bo trên 24, bóng lan, nút giữa gradient; chấm 5 px dưới nhãn là chỉ báo duy nhất ngoài màu. | Thấp | `RoleTabs.tsx` |
| A-09 | Màn rộng (1024, 1440): khung 1080 căn giữa, vẫn thanh tab ở đáy, nội dung 560 px giữa khoảng trắng lớn: giao diện điện thoại phóng to, không có bố cục máy tính. | Cao | ảnh rộng 1440 trong báo cáo responsive |

### 2.2 Bác sĩ (B01 đến B15)

- B01: đoạn chữ giải thích tiêu chí xếp nằm rời giữa tiêu đề và danh sách; ô việc cần làm màu kẹo; mục "Vừa xử lý" thu gọn không có khung, nổi lơ lửng.
- B02: tìm kiếm và hai hàng bộ lọc là các phần tử rời, không có nhãn nhóm thống nhất ("Hôm nay" có nhãn, hàng trên không); không có số kết quả.
- B03: một thẻ chứa mọi trường, không chia nhóm định danh, vết thương, đồng ý; ô tích đồng ý không có vai trò checkbox cho trình đọc màn hình.
- B04: thẻ định danh dùng biểu tượng người chung cỡ 48; tên 18 chỉ hơn thân bài 2 pt; nút "Đánh dấu đã xử lý" là chữ trần không có vùng chạm 44.
- B05: số diện tích nằm cuối thẻ tổng quan sau đường kẻ, cùng thẻ với vị trí và trạng thái; giá trị tham chiếu (ngày đo, lần đo trước) cùng kiểu dòng với người nhập, phương pháp: số đo chính và giá trị tham chiếu khó tách bằng mắt.
- B06, B07: thanh bước 4 px màu mòng két; nhiều thẻ lồng tiêu đề; bảng so sánh B06c dày.
- B08, B08b: thẻ chọn ảnh và danh sách dòng thời gian dùng biểu tượng tròn đủ màu (tím, xanh, cam) cho từng loại mục.
- B10: vùng camera nền tối riêng, ổn; các nút dưới camera cùng kiểu với nút chung.
- B11: ảnh lớn, khối diện tích dài; nhãn "Đang nhập, chưa lưu" và nhãn nguồn là chip cùng kiểu với chip trạng thái.
- B13: ô số tiến độ nền màu; khung "Dữ liệu mô phỏng" đặt trên đầu.
- B15: xem mục 4.

### 2.3 Bệnh nhân (N01 đến N09)

- N02: khối "Hôm nay" gom vòng tiến độ, câu chính màu thông tin, chip đồng bộ, các bước trước điều trị, nút nạp và lịch hẹn trong một thẻ (khối dày nhất ứng dụng).
- N03: vòng tiến độ, ghi chú bác sĩ nền cam, lịch tháng: ổn về nội dung; ô lịch dùng nền xanh lá nhạt.
- N05: tiến triển diện tích có chữ màu mòng két; dòng ảnh cuộn ngang ở 320 đến 390 px (có chủ đích).
- N07, N08, N09: dùng thành phần chung, cùng vấn đề A-01 đến A-04.

### 2.4 Quản trị (Q01 đến Q07)

- Q01: ô số nền màu, thanh chọn "Tài khoản/Phân công" kiểu viên thuốc nền trắng có bóng; danh sách tài khoản dùng biểu tượng tròn.
- Q02: tên tệp dài bị cắt ba chấm ở mọi bề rộng (có chủ đích, tên tệp đầy đủ xem ở chi tiết).
- Q03 đến Q06: khối thu gọn và dòng nhãn, giá trị dùng chung; không có vấn đề riêng ngoài A-01 đến A-04.

### 2.5 Thiết bị (T01, T02)

- T01: tổng quan thiết bị chỉ là danh sách dòng nhãn và giá trị, không có hình ảnh trạng thái kết nối; dễ trông như một thẻ dữ liệu thường.
- T02: đồng hồ đếm ngược 44 pt màu mòng két trong thẻ trắng giống mọi thẻ khác, không có cảm giác "bảng điều khiển"; nút Dừng điều trị ở chân màn (đỏ đặc, 56 pt) đúng yêu cầu an toàn và giữ nguyên.

## 3. Vấn đề thành phần dùng chung

| Thành phần | Vấn đề |
|---|---|
| `Header` | Một kiểu cho mọi màn, bo góc và bóng đậm (A-02). |
| `Screen` | Lề ngang 20 cố định mọi bề rộng; khung 1080 căn giữa; không có bố cục máy tính (A-09). |
| `Card` | Viền đậm và bo 16 cho mọi khối; khối chính dùng bóng đậm (A-03). |
| `Button` | Gradient, bóng màu, bo 24 (A-04). |
| `Chip` | Bo tròn hoàn toàn, trùng hình dạng với nút lựa chọn `Choices` nên chip trạng thái trông như nút bấm được. |
| `Segmented` | Nền trắng có bóng, mục chọn tô kín màu chủ đạo, giống nút chính. |
| `Field`, `SearchField` | Nền xám nhạt, viền `#BFCAC8` 1,68:1, nhãn màu xám nhạt. |
| `NumberTile` | Nền màu kẹo (A-05). |
| `IconBadge` | Vòng tròn cho mọi loại biểu tượng (A-07). |
| `Notice` | Nền nhạt không có vạch nhấn, khó phân biệt với khối thông tin. |
| `Empty` | Biểu tượng 30 trần và một dòng chữ. |
| `RoleTabs` | Xem A-08, A-09. |
| `Sheet` | Lớp phủ màu viết cứng `rgba(15, 23, 42, 0.45)` ngoài theme. |
| `StepRow` | Vạch 4 px màu chủ đạo. |

Màu viết cứng ngoài theme trước Stage 9A: 5 chỗ (`Sheet`, `GradientCard`, 3 chỗ nền đen của ảnh phóng to trong B11 và lịch sử ảnh). Cỡ chữ viết cứng: 11 chỗ (Đợt 12 đã ghi).

## 4. Định tuyến: "Unmatched Route" (B15)

- Hiện tượng: mở một đường dẫn không tồn tại (ví dụ `/khong-ton-tai`, hoặc liên kết cũ tới hồ sơ đã xóa dạng route không có) hiện trang mặc định tiếng Anh "Unmatched Route / Page could not be found" kèm liên kết "Sitemap".
- Nguyên nhân: `src/app` không có tệp `+not-found.tsx`. Expo Router khi đó dùng màn không khớp mặc định của thư viện. Không phải lỗi đăng ký route: các route kịch bản chụp đi qua (49 ảnh, gồm mọi màn chính B, N, Q, T, C) đều mở đúng màn, không lỗi JavaScript; màn con B04a, B05a, B08d có tệp route và được kịch bản hồi quy `kiem-thu-quan-ly-ho-so.cjs` (B04a, B05a) và `kiem-thu-n05.cjs` (B08d) mở.
- Rủi ro kèm theo: liên kết "Sitemap" mở `/_sitemap`, liệt kê toàn bộ route kể cả màn quản trị cho người chưa đăng nhập (chỉ lộ tên route, các màn vẫn có kiểm vai trò).
- Ở bản web dựng tĩnh, màn mặc định còn gây lỗi React #418 (lệch nội dung khi hydrate) ở cả 6 bề rộng và tràn ngang ở 320, 360 px (kết quả responsive bản trước).
- Hồ sơ không tồn tại trong route hợp lệ (ví dụ `/patients/p-999`) đã có màn riêng `NoAccess notFound` từ trước, không thuộc lỗi này.

## 5. Vấn đề responsive (bản trước)

Kết quả đo tự động 198 lượt (33 màn x 6 bề rộng), chi tiết ở `PLASMA_PRO_STAGE_9A_RESPONSIVE_REPORT.md`:
- Tràn ngang: B15 ở 320, 360 px.
- Lỗi JavaScript: B15 ở mọi bề rộng (React #418).
- Chữ bị cắt: nhãn tab "Trang chủ", "Bệnh nhân" ở 320 px (8 màn có thanh tab); tiêu đề T02 ở 320 px; tên tệp Q02 (có chủ đích).
- Phần tử vượt mép phải: dòng ảnh cuộn ngang ở N05 (có chủ đích, cuộn được).
- Màn rộng: không có bố cục riêng (A-09).

## 6. Kế hoạch cải thiện theo ưu tiên

| Ưu tiên | Việc | Gói |
|---|---|---|
| 1 | Hướng thị giác và token: navy, xanh y tế, mòng két chọn lọc; thang chữ; bề mặt phẳng viền mảnh | A |
| 2 | Thanh tiêu đề hai kiểu (nhận diện navy cho màn chính, trắng phẳng cho màn chi tiết); thanh tab phẳng; thanh bên ở màn rộng | A |
| 3 | Thành phần: nút đặc, chip bo 6, thanh chọn kiểu rãnh, ô nhập trắng, ô số viền mảnh có vạch, khối lưu ý có vạch nhấn, trạng thái rỗng | A |
| 4 | B15 màn không tìm thấy tiếng Việt, chặn Sitemap | A |
| 5 | B01, B02, B03, B04, B05: thứ bậc số liệu, định danh bệnh nhân bằng chữ cái đầu, tách khối Hiện trạng, nhóm biểu mẫu | B |
| 6 | T01 sơ đồ kết nối; T02 bảng điều khiển phiên | F |
| 7 | N02 tách khối Hôm nay và lịch hẹn | D |
| 8 | B06 đến B13, N03 đến N08, Q01 đến Q06: bố cục riêng từng màn (sau khi hệ thống chung ổn) | C, D, E |
| 9 | Kiểm responsive, trợ năng, hồi quy | G |
