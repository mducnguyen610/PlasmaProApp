# Plasma Pro, Stage 8: báo cáo kiểm thử hồi quy toàn hệ thống

Ngày 14/11/2026 (chạy kiểm thử tới 00:30 ngày 15/11 giờ Việt Nam). Nền master `dbad553`, nhánh `ui/tb-8-hoi-quy`. Bản web (Expo export), thiết bị giả lập, dữ liệu mô phỏng. Không dùng dữ liệu bệnh nhân thật.

## 0. Kết luận

| Kết quả | Trạng thái |
|---|---|
| **Software regression** | **Đạt có điều kiện**: tsc, lint, npm test đạt; 21 kịch bản cũ đạt hoặc giống hệt mốc master; kịch bản Stage 8 59 đạt, 1 lỗi (S8-B04, P2, để backlog chờ duyệt), 5 ghi nhận. Không còn P0; P1 duy nhất (S8-B01) đã sửa, chờ duyệt PR và review chuyên môn |
| Hardware verification | **Chưa thực hiện (BLOCKED)**: không có máy, giao thức không có lệnh dừng |
| Clinical validation | **Chưa thực hiện** |
| User acceptance testing | **Chưa thực hiện** |

Kết quả giao diện không chứng minh hệ thống an toàn cho sử dụng lâm sàng. Stage 8 chưa nên coi là hoàn thành khi PR sửa lỗi chưa được duyệt và S8-B01 chưa qua review chuyên môn (mục 13 đặc tả).

## 1. Điều kiện bắt đầu

| Mục | Kết quả | Cách kiểm |
|---|---|---|
| Stage 1 đến 7 đã review và merge | Có: PR 49, 50, 51, 52, 53, 54, 55, 56, 57 đều `merged` | GitHub REST API |
| Nhánh cập nhật | Bắt đầu từ master `dbad553` (merge PR 57) | `git log` |
| PR đang mở | Chỉ PR 41 (tài liệu audit và kế hoạch Task-based UI, không có mã) | GitHub REST API |
| Tài liệu đã đọc | Báo cáo Stage 6, 7; `PLASMA_PRO_UX_AUDIT.md` mục QĐ-1..6; `PLASMA_PRO_UX_PRIORITY_BACKLOG.md`; ICD USB/UART | |
| T01, T02 đã kiểm phần mềm | Có (Stage 7: `kiem-thu-tb-7.cjs` 30 đạt, 4 ghi nhận; chạy lại trong Stage 8, giống hệt) | |
| Kiểm thử thiết bị thật | Không có. **Phần cứng BLOCKED** | Báo cáo Stage 7 mục 6 |
| QĐ đã chốt | QĐ-1 chọn A (13/11/2026). QĐ-2 đến QĐ-6 chưa có quyết định mới: kiểm là giữ nguyên hiện trạng | |

Ghi chú: báo cáo Stage 7 cho rằng p0, dot-8 dừng sớm vì "từ Stage 5 N02 không còn nút nạp". Stage 8 xác định nguyên nhân thật là **thứ trong tuần** (S8-K01 trong backlog).

## 2. Kiểm thử tự động

| Lệnh | Master | Nhánh Stage 8 |
|---|---|---|
| `npx tsc --noEmit` | Đạt | Đạt |
| `npm run lint` | 0 lỗi, 0 cảnh báo | 0 lỗi, 0 cảnh báo |
| `npm test` (38 tệp kiểm thử, mọi tệp `*.test.*` trong `src` đều có trong lệnh) | Đạt | Đạt (`areaProgress.test.ts` thêm 3 ca) |
| `scripts/kiem-thu-giao-dien.cjs` | 41/41 | 41/41 |
| `scripts/kiem-tra-kotlin.sh` | Không chạy được: tải `android-all` trả 404 | Không chạy được (mô-đun Kotlin không đổi) |
| Lỗi console, yêu cầu mạng hỏng | | `S8-CE-01` đạt; mọi kịch bản kiểm "Không lỗi JS" đều đạt |
| Ca bị bỏ qua, flaky | Không có ca `skip`. Ca phụ thuộc ngày (S8-K01) đã sửa. Ca DV-03b (chữ "Đang gửi" trong lúc chờ ACK) ghi nhận vì giả lập trả ACK quá nhanh | |

Không sửa ca kiểm nào chỉ để có kết quả xanh. Mọi ca kiểm đã sửa đều có nguyên nhân ghi ở backlog mục 2 (S8-K01 đến K05).

### 2.1 Hồi quy 21 kịch bản cũ: mốc master và nhánh Stage 8

Mốc: kịch bản ở master chạy trên bản dựng master. Sau: kịch bản ở nhánh chạy trên bản dựng nhánh. "Giống hệt mốc" là đã so từng mã ca và kết quả (ĐẠT, LỖI, GHI NHẬN), không chỉ so số đếm.

| Kịch bản | Mốc master | Nhánh Stage 8 | Ghi chú |
|---|---|---|---|
| dot-10 | 24 đạt, 0 lỗi, 0 ghi nhận | 24 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| dot-11 | 16 đạt, 0 lỗi, 0 ghi nhận (dừng sớm) | 34 đạt, 0 lỗi, 0 ghi nhận | Trước: dừng ở N02. Sau: chạy hết |
| dot-12 | 53 đạt, 0 lỗi, 0 ghi nhận | 53 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| dot-8 | 8 đạt, 0 lỗi, 0 ghi nhận (dừng sớm) | 33 đạt, 0 lỗi, 0 ghi nhận | Trước: dừng ở N02. Sau: chạy hết; D8-03d,e,h, D8-04, D8-05 cập nhật theo Stage 6, 7 và quyết định 14/11 |
| dot-9 | 9 đạt, 4 lỗi, 0 ghi nhận | 9 đạt, 4 lỗi, 0 ghi nhận | Bản dựng thường: 4 lỗi có sẵn (cần tiêm AR). Bản tiêm AR: 13/13 |
| giao-dien | 41 đạt, 0 lỗi, 0 ghi nhận | 41 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| n05 | 20 đạt, 0 lỗi, 0 ghi nhận | 20 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| p0 | 32 đạt, 0 lỗi, 0 ghi nhận (dừng sớm) | 47 đạt, 0 lỗi, 2 ghi nhận | Trước: dừng ở N02 (thứ 7). Sau: chạy hết nhờ ngay-co-lich.cjs |
| p1 | 16 đạt, 0 lỗi, 4 ghi nhận | 16 đạt, 0 lỗi, 4 ghi nhận | Giống hệt mốc |
| p1-01d | 3 đạt, 0 lỗi, 0 ghi nhận | 3 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| p1-02 | 15 đạt, 0 lỗi, 0 ghi nhận | 15 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| p1-03 | 12 đạt, 0 lỗi, 0 ghi nhận | 12 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| p1-04 | 10 đạt, 0 lỗi, 0 ghi nhận | 10 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| p1-05-06 | 20 đạt, 0 lỗi, 1 ghi nhận | 20 đạt, 0 lỗi, 1 ghi nhận | Giống hệt mốc |
| p2 | 237 đạt, 0 lỗi, 2 ghi nhận | 237 đạt, 0 lỗi, 2 ghi nhận | Giống hệt mốc |
| tb-2 | 22 đạt, 0 lỗi, 0 ghi nhận | 22 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| tb-3 | 20 đạt, 0 lỗi, 0 ghi nhận | 20 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| tb-4 | 31 đạt, 0 lỗi, 0 ghi nhận | 31 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| tb-5 | 13 đạt, 1 lỗi, 0 ghi nhận | 14 đạt, 0 lỗi, 0 ghi nhận | TB5-07 cập nhật theo PR 55 |
| tb-6 | 21 đạt, 0 lỗi, 0 ghi nhận | 21 đạt, 0 lỗi, 0 ghi nhận | Giống hệt mốc |
| tb-7 | 30 đạt, 0 lỗi, 4 ghi nhận | 30 đạt, 0 lỗi, 4 ghi nhận | Giống hệt mốc |
| tb-8 | không có | 59 đạt, 1 lỗi, 5 ghi nhận | Kịch bản mới Stage 8; 1 lỗi là S8-B04 (P2, backlog) |

`dot-9` chạy riêng trên bản dựng tiêm AR (`tiem-ar-kiem-thu.cjs` ở bản sao riêng, không commit): 13/13 đạt, gồm D9-01 (số AR hiện, có nhãn tham khảo, ô diện tích trống), D9-08 đến D9-10 (AR giữ riêng, không thành số đo bác sĩ).

## 3. Kịch bản Stage 8 (`scripts/kiem-thu-tb-8.cjs`): danh sách ca và kết quả

65 ca trên bản dựng nhánh: 59 đạt, 1 lỗi, 5 ghi nhận. Chạy: `node scripts/kiem-thu-tb-8.cjs <baseURL> <thư mục>`.

Cùng kịch bản trên bản dựng master: S8-W3-04 LỖI (S8-B03), S8-B01 LỖI (chạm đúp "Kết nối" ghi thêm 1 lần nạp), rồi kịch bản dừng vì liệu trình đã bị gửi ngoài ý muốn. Đây là bằng chứng lỗi có trên master trước khi sửa.

| Mã | Nhóm | Ca | Kết quả | Chi tiết |
|---|---|---|---|---|
| S8-00 | Môi trường | Đồng hồ trình duyệt tiến 1 ngày tới ngày có lịch điều trị (thứ 2, 4, 6) để luồng N02 không phụ thuộc thứ trong tuần | GHI NHẬN | ngày theo giờ Việt Nam 2026-11-15 |
| S8-W1-01 | Workflow 1 | Tạo bệnh nhân (bấm lưu 3 lần liền): đúng 1 hồ sơ, 1 tài khoản, 1 vết thương VT01; bác sĩ phụ trách là người tạo | ĐẠT | hồ sơ +1, tài khoản +1, vết thương +1, mã BN004 |
| S8-W1-02 | Workflow 1 | Mở hồ sơ vừa tạo: đúng URL và đúng họ tên, mã hồ sơ | ĐẠT | /patients/p-1794763534716 |
| S8-W1-03 | Workflow 1 | Thêm vết thương (bấm đúp): đúng 1 vết thương mới VT02, mã vết thương và id không trùng | ĐẠT | vết thương của hồ sơ: VT01/w-1794763534716, VT02/w-1794763538357 |
| S8-W1-04 | Workflow 1 | Sau khi thêm mở chi tiết vết thương mới, hiện đúng bệnh nhân và mã vết thương | ĐẠT | /wounds/w-1794763538357 |
| S8-W1-z | Workflow 1 | Không lỗi JS | ĐẠT |  |
| S8-W2-01 | Workflow 2 | Đánh giá đủ 4 bước, bấm lưu 3 lần: đúng 1 đánh giá, đúng vết thương, có bác sĩ thực hiện, ngày đánh giá là hôm nay | ĐẠT | Lưu và công bố cho bệnh nhân; {"woundId":"w-1794763534716","date":"2026-11-16","areaCm2":null,"characteristics":"","symptoms":"","symptomSource":"Bác sĩ hỏi trự |
| S8-W2-02 | Workflow 2 | Lịch sử vết thương, thẻ Đánh giá: thấy đúng 1 đánh giá vừa lưu, ngày và bác sĩ thực hiện | ĐẠT | 16/11/2026 |
| S8-W2-03 | Workflow 2 | Vết thương VT02 cùng hồ sơ không nhận đánh giá của VT01 | ĐẠT | 0 |
| S8-QD1-01 | QĐ-1 | B10 bước nhập số đo: ô diện tích trống, không có nút "Dùng số này" | ĐẠT |  |
| S8-W3-01 | Workflow 3 | Lưu ảnh và số đo (bấm 3 lần): đúng 1 ảnh, đúng hồ sơ và vết thương, diện tích 5,5 cm² do bác sĩ nhập, người tải là bác sĩ | ĐẠT | 1 ảnh; IMG0007 w-1794763534716 5.5 |
| S8-W3-02 | Workflow 3 | Ảnh mới: tên tệp chứa mã hồ sơ, mã vết thương, mã ảnh; có ngày chụp và ngày tải riêng | ĐẠT | BN004_VT01_IMG0007_area_5.5_cm2.png |
| S8-W3-03 | Workflow 3 | Sau khi lưu mở B11 của đúng ảnh vừa lưu | ĐẠT | /images/IMG0007 |
| S8-W3-04 | Workflow 3 | Lịch sử diện tích: ảnh thư viện có số đo nhưng không rõ ngày, không báo "Chưa có lần đo diện tích", nêu rõ lý do không vẽ | ĐẠT |  Lịch sử vết thương  Vết thương VT01  Kiểm Thử Tám BN004 · sinh 1970 · Nam  VT01 · Cẳng tay phải Lịch sử Ảnh (1) Số đo Biểu đồ Kết quả đã lưu Tiến triển diệ |
| S8-W3-05 | Workflow 3 | Vết thương VT02 không nhận lần đo của VT01 | ĐẠT |  |
| S8-W3-z | Workflow 3 | Không lỗi JS ở luồng 2, 3 | ĐẠT |  |
| S8-W4-01 | Workflow 4 | B05 w-1: có tên và mã bệnh nhân, mã vết thương, vị trí | ĐẠT |  |
| S8-W4-02 | Workflow 4 | B05 không tự kết luận cải thiện từ diện tích: chữ "Cải thiện" chỉ xuất hiện như xu hướng do bác sĩ đánh giá | ĐẠT | …ước 10,2 cm² · chụp 24/10/2026 Xu hướng (bác sĩ đánh giá)  Cải thiện 31/10/2026 // …dừng đợt Đánh giá gần nhất 31/10/2026 · BS. Trần Minh An  Cải thiện Chuyể |
| S8-W4-03 | Workflow 4 | Lịch sử thẻ Ảnh: ảnh IMG0001 hiện ngày chụp đúng với dữ liệu | ĐẠT | 17/10/2026 |
| S8-W4-04 | Workflow 4 | Lịch sử diện tích: 3 lần đo (12,5 và 8,4 cm² ở đầu, cuối), ảnh chưa đo tách riêng, "Lần đo gần nhất … chụp <ngày>" ghi ngày chụp | ĐẠT |  |
| S8-W4-05 | Workflow 4 | Dữ liệu mô phỏng có nhãn mô phỏng hoặc dữ liệu mẫu ở B05 hoặc lịch sử | ĐẠT |  |
| S8-W4-06 | Workflow 4 | So sánh ảnh w-1 mở được, không có ảnh của vết thương khác (IMG0005, IMG0006 thuộc w-2) | ĐẠT |  |
| S8-W4-07 | Workflow 4 | Lịch sử thẻ Buổi điều trị mở được | ĐẠT |  |
| S8-W4-z | Workflow 4 | Không lỗi JS | ĐẠT |  |
| S8-W5-01 | Workflow 5 | N02 ngày có lịch: có nút "Nạp liệu trình vào máy" (lối vào T01) | ĐẠT |  |
| S8-B01 | Thiết bị (an toàn) | Chạm đúp "Kết nối" (cách 300 ms): chỉ kết nối, không gửi liệu trình xuống máy | ĐẠT | số lần nạp ghi thêm: 0 |
| S8-W5-02 | Workflow 5 | Bấm nạp 3 lần liền: đúng 1 lần nạp được ghi (không gửi lặp) | ĐẠT | 1 bản ghi; ["acked"] |
| S8-B02 | Thiết bị (an toàn) | Chạm nhiều lần vào nút nạp: sau ACK vẫn ở T01, không mở T02 ngoài ý muốn (nút "Theo dõi" hiện đúng chỗ cũ) | ĐẠT | /connect-device |
| S8-W5-03 | QĐ-6 | Sau khi máy nhận, chờ 5 giây vẫn ở T01 (không tự chuyển T02) | ĐẠT | /connect-device |
| S8-W5-04 | Workflow 5 | Mở T02 không tự bắt đầu phiên | ĐẠT |  |
| S8-W5-05 | Workflow 5 | Đang điều trị: nút "Dừng điều trị" ở chân màn | ĐẠT | Trạng thái thiết bị: Máy đang bận. Máy TB-001. Cáp USB: Đã kết nối. Phiên: Đang điều trị. Cập nhật lúc 00:26:34. Thiết bị giả lập. |
| S8-NV-01 | Điều hướng, trạng thái | Tải lại trang T02 giữa phiên: không tự kết nối, không tự bắt đầu, không nạp lại; thanh trạng thái không báo "Đang điều trị" hay "Máy đang bận" | ĐẠT | nạp 1→1; thanh: Trạng thái thiết bị: Chưa kết nối. Máy TB-001. Cáp USB: Chưa kết nối. Phiên: Chưa nhận trạng thái. Thiết bị giả lập. |
| S8-NV-02 | Điều hướng, trạng thái | Tải lại giữa phiên không ghi phiên giả (phiên dở bị bỏ, không ghi hoàn tất) | ĐẠT | 30→30 |
| S8-NV-01b | Điều hướng, trạng thái | Tải lại T02: URL giữ patient_id và wound_id | ĐẠT | /session-monitor?patientId=p-1&woundId=w-1 |
| S8-T-01 | Thiết bị | Kết nối lại sau khi tải trang: thanh trạng thái theo bản tin máy, không báo "Máy đang bận" khi máy (giả lập) đã rảnh | ĐẠT | Trạng thái thiết bị: Đã kết nối. Máy TB-001. Cáp USB: Đã kết nối. Phiên: Chưa nhận trạng thái. Thiết bị giả lập. |
| S8-T-01b | Thiết bị | Sau tải lại, máy giả lập chưa có liệu trình: "Bắt đầu" không chạy phiên (giả lập không tự nạp lại) | GHI NHẬN | Nút "Bắt đầu" (chỉ có ở giả lập) bấm không có phản hồi; ghi nhận P3 cho giả lập |
| S8-T-02 | Dừng khẩn cấp (giả lập) | Dừng: chỉ báo "Máy đã xác nhận: Đã dừng" sau bản tin máy, trước đó báo đang chờ | ĐẠT |  |
| S8-T-03 | Dừng khẩn cấp (giả lập) | Dừng ghi đúng một bản ghi phiên | ĐẠT | 30→31 |
| S8-W5-06 | Workflow 5 | Bản ghi phiên: thiết bị của bệnh nhân (d-1), vết thương w-1, nguồn "device", đơn vị phút | ĐẠT | {"sessionId":"TB-001-1794763608713","deviceId":"d-1","start":"2026-11-15T17:26:48.713Z","durationMin":0,"energyWh":null,"status":"interrupted","source":"device" |
| S8-W5-07 | Workflow 5 | Lịch sử bệnh nhân mở được sau phiên | ĐẠT |  |
| S8-W5-z | Workflow 5 | Không lỗi JS | ĐẠT |  |
| S8-DI-01 | Toàn vẹn dữ liệu | Phiên mở từ N07 "Theo dõi phiên điều trị" có gắn vết thương và hiện trong lịch sử N05 | LỖI | T02 "Chưa chọn vết thương": true; woundId undefined; N05 Lịch sử 24→24 |
| S8-T-04 | Thiết bị thật | Kết nối USB, UART, dừng khẩn cấp với máy thật | GHI NHẬN | BLOCKED: không có máy; giao thức không có lệnh dừng ứng dụng → máy |
| S8-W6-01 | Workflow 6 | Quản trị đăng nhập vào khu quản trị, Q01 có danh sách tài khoản | ĐẠT | /admin |
| S8-W6-02 | Workflow 6 | Quản trị mở URL màn bác sĩ (hồ sơ, vết thương, đánh giá, chụp, đợt): không thao tác lâm sàng được | ĐẠT | /patients/p-1:chặn, /wounds/w-1:chặn, /evaluate/w-1:chặn, /guided-capture?woundId=w-1:chặn, /plan/p-1:chặn |
| S8-W6-02b | Workflow 6 | Đăng xuất từ trang Cá nhân của quản trị về màn đăng nhập | ĐẠT | / |
| S8-W6-03 | Workflow 6 | Đăng xuất, đăng nhập bác sĩ: vào trang bác sĩ | ĐẠT | /doctor |
| S8-W6-04 | Phân quyền | Bác sĩ mở URL quản trị: không vào được chức năng quản trị | ĐẠT | /admin:chặn, /admin/devices:chặn, /admin/logs:chặn, /admin-account/u-bn1:chặn, /admin/dataset:chặn |
| S8-W6-z | Workflow 6 | Không lỗi JS | ĐẠT |  |
| S8-PQ-01 | Phân quyền | Bệnh nhân BN001 mở URL hồ sơ, vết thương, ảnh của BN002 và màn bác sĩ, quản trị: không thấy dữ liệu, không có nút thao tác | ĐẠT | /patients/p-2:chặn, /wounds/w-2:chặn, /images/IMG0005:chặn, /wound-history/w-2:chặn, /evaluate/w-1:chặn, /guided-capture?woundId=w-1:chặn, /plan/p-1:chặn, /doct |
| S8-PQ-02 | Phân quyền | Bác sĩ khác (bacsi2) mở URL của bệnh nhân không phụ trách: không có nút thao tác lâm sàng | ĐẠT | /patients/p-1:chặn, /evaluate/w-1:chặn, /guided-capture?woundId=w-1:chặn, /plan/p-1:chặn, /images/IMG0004:chặn |
| S8-NV-03 | Điều hướng, trạng thái | B02 tìm "pham" → mở hồ sơ → quay lại: giữ từ khóa | ĐẠT | /doctor/patients; ô tìm "pham" |
| S8-NV-04 | Điều hướng, trạng thái | Tải lại trang lịch sử ở thẻ Ảnh: vẫn đăng nhập, vẫn đúng vết thương và thẻ (tham số trên URL) | ĐẠT | /wound-history/w-1?tab=anh |
| S8-NV-05 | Điều hướng, trạng thái | B11 đang nhập số đo, bấm quay lại: hỏi; chọn ở lại giữ số đã gõ | ĐẠT |  |
| S8-NV-06 | Điều hướng, trạng thái | Tải lại trang khi đang nhập: số chưa lưu không bị ghi thành kết quả | ĐẠT | null |
| S8-NV-z | Điều hướng, trạng thái | Không lỗi JS | ĐẠT |  |
| S8-QD2-01 | QĐ-2 | B07: mặc định công bố như hiện trạng (nút "Lưu và công bố cho bệnh nhân"), không tự đổi | ĐẠT | Lưu và công bố cho bệnh nhân |
| S8-QD5-01 | QĐ-5 | B07: lưu đánh giá không tự đánh dấu báo cáo đã xử lý | ĐẠT | 2→2 |
| S8-QD4-01 | QĐ-4 | B06: trạng thái khi lập phiên bản mới giữ như hiện trạng (không tự đổi sang Nháp) | GHI NHẬN | Không thấy chữ Nháp |
| S8-QD3-01 | QĐ-3 | Ghi chú phiên (đau ≥ 7, đỏ da, sưng) chưa vào điểm chú ý | GHI NHẬN | QĐ-3 chưa có quyết định; mã attention.ts không đổi trong Stage 8 (kiểm bằng git diff) |
| S8-RS-01 | Responsive | Không tràn ngang ở 204 lượt (màn × khổ 320, 360, 390, 768, 1024, 1280) | ĐẠT |  |
| S8-RS-02 | Responsive | Không lỗi JS khi đổi khổ và mở mọi màn | ĐẠT |  |
| S8-RS-03 | Responsive | Vùng chạm dưới 24 px ở 360 px (WCAG 2.2 SC 2.5.8 mức tối thiểu) | ĐẠT |  |
| S8-RS-04 | Responsive | Nút "Dừng điều trị" thấy ngay, không bị che ở 1024 và 1280 px | ĐẠT | 1024x768:thấy, 1280x800:thấy |
| S8-CE-01 | Lỗi console, mạng | Không có lỗi console hay yêu cầu mạng hỏng ở các trang còn mở | ĐẠT |  |
## 4. Kết quả theo vai trò

| Vai trò | Màn đã kiểm | Kết quả | Ghi chú |
|---|---|---|---|
| Bệnh nhân (N01 đến N09, T01, T02) | tb-5 14/14, n05 20/20, tb-7 30/30, p0 phần T01/T02, dot-11 34/34, tb-8 W5, PQ-01 | Đạt sau sửa S8-B01, B02 | S8-B04 (phiên mở từ N07 không gắn vết thương) để backlog. Danh sách, tìm, tạo, sửa bệnh nhân là màn bác sĩ B02 đến B04, không thuộc N01..N09 (người dùng chốt ở Stage 5) |
| Bác sĩ (B01 đến B13) | p1, p1-xx, p2, tb-2, tb-3, tb-4, dot-10, dot-12, tb-8 W1 đến W4, PQ-02 | Đạt | "Sửa bệnh nhân" chưa có trong mã (`updatePatient` chỉ cho đổi đồng ý nghiên cứu): **không áp dụng**, ghi từ Stage 5 |
| Quản trị (Q01 đến Q07) | tb-6 21/21, dot-8 D8-04, D8-05, tb-8 W6 | Đạt | Tạo, sửa tài khoản bởi quản trị; quản lý vai trò; cấu hình hệ thống; nhật ký hoạt động; phân quyền phía backend: **không áp dụng** (không có trong mã, chưa có backend) |

Phân quyền ở mức giao diện và kho dữ liệu cục bộ: bệnh nhân không mở được hồ sơ, vết thương, ảnh của bệnh nhân khác hay màn bác sĩ, quản trị (S8-PQ-01); bác sĩ không phụ trách không có nút thao tác lâm sàng (S8-PQ-02); quản trị không thao tác lâm sàng (S8-W6-02); bác sĩ không vào được chức năng quản trị (S8-W6-04). Ba hàm của kho dữ liệu không kiểm vai trò (S8-B05, không khai thác được qua giao diện). Phân quyền backend: không áp dụng.

Thay đổi Admin UX không làm đổi Doctor UX: các kịch bản bác sĩ giống hệt mốc (mục 2.1).

## 5. Luồng đầu cuối

| Luồng | Ca | Kết quả |
|---|---|---|
| W1 Bệnh nhân mới: tạo → mở hồ sơ → tạo vết thương → chi tiết | S8-W1-01 đến 04 | Đạt. Bấm lưu 3 lần chỉ tạo 1 hồ sơ; bấm đúp "Thêm vết thương" chỉ tạo 1 vết, mã không trùng |
| W2 Đánh giá: mở → chọn vết → đánh giá → lưu → lịch sử | S8-W2-01 đến 03 | Đạt. Đúng vết, có bác sĩ thực hiện, vết khác cùng hồ sơ không nhận |
| W3 Chụp và đo: chụp → xem → đo → lưu → lịch sử | S8-QD1-01, S8-W3-01 đến 05 | Đạt sau sửa S8-B03 (lịch sử từng báo "Chưa có lần đo" với ảnh thư viện) |
| W4 Theo dõi tiến triển | S8-W4-01 đến 07 | Đạt. "Cải thiện" chỉ xuất hiện là xu hướng do bác sĩ đánh giá; "Lần đo gần nhất … chụp <ngày>" ghi ngày chụp |
| W5 Điều trị: N02 → T01 → nạp → T02 → dừng → lịch sử | S8-W5-01 đến 07, S8-B01, B02, S8-T-01 đến 03 | Đạt (giả lập) sau sửa S8-B01, B02. Máy thật BLOCKED |
| W6 Quản trị → đăng xuất → bác sĩ | S8-W6-01 đến 04 | Đạt |

## 6. Điều hướng và trạng thái

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| Back, giữ từ khóa tìm kiếm | Đạt | S8-NV-03, TB6-05 |
| Mở, đóng tác vụ toàn màn (B07, B10, B11, T02) và hỏi khi nhập dở | Đạt | S8-NV-05, TB2-12, TB3-10, TB3-15, TB7-13 |
| Bảng trượt (Q03) | Đạt | TB6-13 |
| Chuyển thẻ (Lịch sử vết thương, N05) | Đạt | tb-4, n05 |
| Tải lại trang: giữ phiên đăng nhập, `wound_id`, thẻ đang mở | Đạt | S8-NV-04 |
| Tải lại T02: giữ `patient_id`, `wound_id`; không tự kết nối, không tự bắt đầu, không nạp lại, không ghi phiên giả | Đạt | S8-NV-01, 01b, 02 |
| Tải lại khi đang nhập số đo: số chưa lưu không thành kết quả | Đạt | S8-NV-06 |
| Không mất `record_id`, `device_id`, `session_id` | Đạt trong phạm vi kiểm: bản ghi phiên có `deviceId`, `sessionId` ghép mã máy và mốc bắt đầu; mở bản ghi theo `recordId` trên URL | S8-W5-06, tb-4 |
| Chuyển nền (AppState) | Không kiểm được trên web; T02 tính lại độ cũ bản tin khi trở lại (mã `session-monitor.tsx`, Stage 7) | Ghi nhận |
| Mất kết nối | Kiểm bằng kiểm thử đơn vị `sessionDisplay`, `deviceStatusView`; giao diện chỉ kiểm ngắt tay ở T01 | TB7-07 |

## 7. Toàn vẹn dữ liệu

| Mục | Kết quả | Bằng chứng |
|---|---|---|
| Không tạo bản ghi trùng (hồ sơ, vết thương, đánh giá, ảnh, nạp, phiên, phiên bản đợt) | Đạt | S8-W1-01, 03, S8-W2-01, S8-W3-01, S8-W5-02, S8-T-03, TB2-08, D10-06f |
| Không ghi đè lịch sử | Đạt (lưu số đo thêm dòng `history`; đợt lưu phiên bản mới) | p2, tb-3 TB3-17 |
| Không nhầm bệnh nhân, vết thương | Đạt | S8-W2-03, S8-W3-05, S8-W4-06, p0 TP-ID |
| Không gán nhầm ảnh và số đo | Đạt | S8-W3-01, 03, TB3-11, TB3-16 |
| Không đổi đơn vị đo (cm², phút) | Đạt | S8-W3-02 (tên tệp `_area_5.5_cm2`), S8-W5-06 |
| Không đổi thời điểm ghi nhận; ngày chụp tách ngày đo | Đạt | S8-W3-02, S8-W4-03, 04 |
| Không mất bác sĩ thực hiện | Đạt | S8-W2-01, S8-W3-01 |
| Dữ liệu mô phỏng có nhãn | Đạt | S8-W4-05 |
| Kết quả chưa xác nhận không hiện như đã lưu | Đạt | S8-NV-06, TB3-08, P0 DV-04 |
| Phiên gắn đúng vết thương | **Lỗi P2 (S8-B04)**: phiên mở từ N07 không gắn vết thương | S8-DI-01 |
| Rủi ro mất cập nhật khi hai lần ghi chồng nhau | Chưa tái hiện; backlog S8-B06 | Đọc mã |

### 7.1 QĐ-1 đến QĐ-6

| QĐ | Trạng thái quyết định | Kết quả kiểm | Bằng chứng |
|---|---|---|---|
| QĐ-1 | Đã chọn A (13/11/2026) | Đạt: B10 chỉ hiện số AR để tham khảo; ô diện tích trống; không tự điền; không tự lưu AR thành số đo; không có D-01; không có nút "Dùng số này" (kiểm cả bản dựng tiêm AR) | S8-QD1-01, TB3-08, TB3-13, dot-9 13/13 bản AR |
| QĐ-2 | Chưa có quyết định mới | Giữ hiện trạng: nút "Lưu và công bố cho bệnh nhân" | S8-QD2-01 |
| QĐ-3 | Chưa có quyết định | `attention.ts` không đổi | `git diff dbad553` |
| QĐ-4 | Chưa có quyết định mới | Trạng thái mặc định theo phiên bản trước (`plan/[patientId].tsx:119`), không đổi | S8-QD4-01 (ghi nhận), `git diff` |
| QĐ-5 | Theo R-02, R-05 đã có | Lưu đánh giá không tự đánh dấu báo cáo đã xử lý | S8-QD5-01 |
| QĐ-6 | Chưa có quyết định | Không tự chuyển T02 sau ACK; chạm đúp cũng không mở T02 sau sửa S8-B02 | S8-W5-03, S8-B02, TB7-06 |

## 8. Responsive

| Khổ | Phạm vi | Kết quả |
|---|---|---|
| 320, 360, 390, 768 px | Mọi kịch bản cũ có kiểm khổ (giao-dien, p2, tb-2 đến tb-7) | Đạt (giống mốc) |
| 320, 360, 390, 768, 1024, 1280 px | 34 màn của 3 vai trò, 204 lượt | Không tràn ngang, không lỗi JS (S8-RS-01, 02) |
| 360 px | Vùng chạm dưới 24 px | Không có (S8-RS-03) |
| 1024, 1280 px | Nút "Dừng điều trị" thấy ngay, không bị che | Đạt (S8-RS-04) |

Chưa kiểm bằng mắt từng màn ở 1024, 1280 px (chỉ đo tràn ngang và nút Dừng); bố cục khổ lớn là bố cục điện thoại kéo giãn. Bảng dữ liệu trên điện thoại, đọc biểu đồ, cắt ảnh: đã kiểm ở P2, Stage 1 đến 7, không đổi trong Stage 8.

## 9. Ảnh trước và sau khi sửa

Thư mục dự án `datn/task-based-ui/giai-doan-8/anh/` (360 × 740, tỉ lệ điểm ảnh 2):

- `s8-b01-truoc-2-sau-cham-dup.png`: bản master, chạm đúp "Kết nối" → "Máy đã nhận liệu trình" (đã gửi lệnh, bỏ qua bước xem liệu trình).
- `s8-b01-sau-2-sau-cham-dup.png`: bản sửa, cùng thao tác → vẫn ở bước 2, chưa gửi.
- `s8-b03-truoc-lich-su-dien-tich.png`, `s8-b03-sau-lich-su-dien-tich.png`: lịch sử diện tích với ảnh thư viện đã nhập 5,5 cm².

## 10. Thay đổi mã trong Stage 8

| Tệp | Thay đổi |
|---|---|
| `src/components/ui.tsx` | `Button` thêm prop tùy chọn `armAfterMs` (bỏ qua lần chạm trong khoảng đầu). Nút không truyền prop không đổi hành vi |
| `src/app/connect-device.tsx` | Nút "Nạp liệu trình vào máy", "Theo dõi phiên điều trị" ở chân màn dùng `armAfterMs={800}`; thêm `key` cho các nút chân màn |
| `src/lib/areaProgress.ts` (+ test) | Hàm `noPointsText` |
| `src/components/AreaProgress.tsx`, `PatientWoundDashboard.tsx` | Dùng `noPointsText` khi biểu đồ không có điểm |
| `scripts/ngay-co-lich.cjs` (mới), `kiem-thu-p0.cjs`, `kiem-thu-dot-8.cjs`, `kiem-thu-dot-11.cjs`, `kiem-thu-tb-5.cjs`, `kiem-thu-tb-8.cjs` (mới) | Kịch bản kiểm thử |

Không đổi: logic lâm sàng, AI, thuật toán đo, thông số và trình tự điều trị, giao thức USB/UART, firmware, lệnh thiết bị, cơ chế dừng, vai trò và phân quyền, API, lược đồ dữ liệu, QĐ-1 đến QĐ-6 (`git diff dbad553 -- src/lib/device src/lib/ai src/lib/capture modules src/lib/store.tsx src/lib/access.ts src/lib/types.ts` rỗng).

## 11. Rủi ro còn tồn tại

1. Toàn bộ kiểm thử thiết bị dùng giả lập; máy thật chưa kiểm. Dừng khẩn cấp qua ứng dụng không có với máy thật.
2. S8-B01 sửa bằng ngưỡng thời gian 800 ms (đề xuất, chưa thử người dùng); cần review chuyên môn.
3. S8-B04: phiên mở từ N07 không gắn vết thương, không hiện ở lịch sử N05.
4. Phân quyền chỉ ở thiết bị (chưa có backend); ba hàm kho dữ liệu không kiểm vai trò (S8-B05).
5. Lớp lưu dữ liệu có thể mất cập nhật khi hai lần ghi chồng nhau (S8-B06), chưa tái hiện.
6. Kịch bản giao diện chạy trên bản web; khác biệt của Android, iOS (bàn phím, vùng an toàn, camera, USB) chưa kiểm.

## 12. Hạng mục chưa thể xác nhận

| Hạng mục | Lý do |
|---|---|
| Kiểm thử thiết bị thật, UART, firmware | Không có máy, chưa có APK SDK 58 |
| Dừng khẩn cấp máy thật | Giao thức không có lệnh |
| Chuyển nền thật trên điện thoại | Bản web |
| Phân quyền backend, tạo, sửa tài khoản, vai trò, cấu hình, nhật ký hoạt động | Không có trong mã |
| Sửa thông tin bệnh nhân | Không có trong mã |
| UAT, đánh giá lâm sàng | Chưa có người dùng thử |
| `kiem-tra-kotlin.sh` | Thư viện tải về trả 404 trong môi trường kiểm thử |
