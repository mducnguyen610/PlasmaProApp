# Plasma Pro: kế hoạch triển khai giao diện theo tác vụ

Ngày: 13/11/2026 (22:45 giờ Việt Nam). Trạng thái: **chờ duyệt**, chưa sửa mã ứng dụng, chưa mở PR triển khai. Tài liệu đi kèm: `PLASMA_PRO_TASK_BASED_UI_DEPENDENCY_MAP.md`, `PLASMA_PRO_TASK_BASED_UI_ACCEPTANCE_CRITERIA.md`.

## 1. Trạng thái dự án lúc lập kế hoạch

| Mục | Kết quả kiểm tra | Cách kiểm |
|---|---|---|
| Nhánh, commit | `master` = `13b68bf` (merge PR 36). Nhánh tài liệu `docs/task-based-ui-audit` (PR 41) chỉ thêm `docs/task-based-ui/` | `git log origin/master`, REST `pulls?state=open` |
| P0 | PR 32, 33, 34 đã merge | REST `pulls?state=closed` |
| P1 | PR 35 đến 40 đã merge ngày 13/11/2026 (15:06 đến 15:09 UTC) | Như trên |
| Các đợt UX trước | PR 19 đến 31 đã merge (bộ nhớ dự án, master `e1f9675` rồi `e2dec65`) | Bộ nhớ dự án, lịch sử git |
| P2 | Giai đoạn A xong, QĐ-P2-1..5 đã chốt; **chưa có nhánh, chưa có PR** (danh sách nhánh trên GitHub không có nhánh P2) | REST `branches` |
| PR đang mở | Chỉ PR 41 (tài liệu) | REST `pulls?state=open` |
| Thay đổi chưa commit | Không (`git status` sạch ngoài `dist/` bị bỏ qua) | `git status` |
| Kiểm tra nền trên `master` | `npx tsc --noEmit` đạt; `npx expo lint` đạt; `npm test` (34 tệp) đạt; `scripts/kiem-thu-giao-dien.cjs` 41/41 đạt | Chạy ngày 13/11/2026 |
| Thiết bị thật | Chưa có APK SDK 58, chưa có máy: mọi kiểm thử phần cứng **BLOCKED** | Bộ nhớ dự án P0 |

Kết luận điều kiện tiên quyết:

- **Không BLOCKED** cho giai đoạn nền và các màn không chung tệp với P2: B03, B06 (nhánh bác sĩ, có điều kiện), B07, B10, B11, B13, N07, Q01, Q02, T01.
- **BLOCKED theo thứ tự** (không phải lỗi, mà là chờ P2 để không hai luồng sửa cùng một tệp): B05 (`wounds/[id].tsx`, chờ PR-P2-2, PR-P2-3), lối vào N06 từ N03 (`schedule.tsx`, chờ PR-P2-5). N02, N04, N05, N08 không có giai đoạn riêng ở đây, để P2 làm.
- Kiểm thử trên máy thật (bàn phím ảo, cỡ chữ hệ thống, USB thật): **BLOCKED**.

## 2. Đối chiếu tài liệu audit với mã nguồn

Mỗi đề xuất trong `PLASMA_PRO_SCREEN_RESTRUCTURE_MAP.md` đã được đọc lại với mã trên `13b68bf`. Kết quả:

| Đề xuất | Khớp mã? | Đính chính |
|---|---|---|
| S-01 `Screen.footer` | Khớp: `Screen` (`src/components/ui.tsx:97`) chỉ có `ScrollView`, 32 tệp dùng `Screen` | **Bổ sung:** dự án không có `KeyboardAvoidingView` ở đâu. Tài liệu Expo nói ứng dụng Expo là edge-to-edge nên cửa sổ Android không còn tự thu nhỏ khi bàn phím mở, cần đặt `behavior` cho cả hai nền tảng [1]. `app.json` không đặt `softwareKeyboardLayoutMode` (mặc định `resize` theo tài liệu cấu hình SDK 58 [2]). Footer phải nằm trong `KeyboardAvoidingView`, nếu không sẽ bị bàn phím che |
| S-01 `Sheet` | Khớp: chỉ có một `Modal` ở `images/[id].tsx:454` | Không |
| S-02 B03 | Khớp: `patients/new.tsx` không có `useDiscardGuard`, có `busy` | Không |
| S-03 B13 | Khớp: hai nút ở `devices/[id].tsx:25-26`, sau `DeviceView`; cùng tệp phục vụ Q06 | Không |
| S-04 N07 | Khớp: `patient/device.tsx:24-29`, nút sau `DeviceView` | Không |
| S-05 T01 | Khớp vị trí nút (`connect-device.tsx`, nút nạp ở dòng khoảng 170, nút sang T02 ở khoảng 196) | **Bổ sung:** thông báo "Đang gửi…", kết quả gửi, "Đã mất kết nối sau khi máy nhận" hiện ngay dưới nút nạp. Nếu nút sang footer mà thông báo ở lại cuối nội dung, người dùng bấm nạp sẽ không thấy phản hồi. Thông báo trạng thái gửi phải đi cùng nút (hiện ngay trên nút trong footer) |
| S-06 T02 | Khớp: "Dừng điều trị" đáy 516 px ở 360×740 (đo lại 13/11/2026) | Không |
| S-07 B10 | Khớp: ảnh, "Kiểm tra ảnh", ô "Đã xem ảnh", khối diện tích cùng render khi `photo` có giá trị; `reviewed` chỉ đổi `StepRow` và được ghi vào `visualReview` (`guided-capture.tsx:243`), không chặn lưu | Đã ghi trong bản đồ: nút "Tiếp" luôn bật |
| S-08 B11 | Khớp phần lớn: **đã có** trạng thái `editing` (mặc định bật khi ảnh chưa có số đo), thẻ diện tích có viền khi đang sửa | **Đính chính:** không cần tạo "chế độ" mới; chỉ dùng `editing` sẵn có để ẩn liên kết điều hướng và các mục thu gọn, và đưa Hủy/Lưu xuống footer. Nhỏ hơn ước lượng (M thành S đến M) |
| S-09 B07 | Khớp: 3 `Disclosure`, khối "Sẽ lưu", `scrollRef` để cuộn tới câu thiếu, khóa `saving` | **Bổ sung:** giải thích (i) đã mở tại chỗ, không cần sheet (đã sửa trong Audit 5.7) |
| S-10 B06 | Khớp: hàng "Quay lại"/"Tiếp" và nút Lưu nằm trong thẻ (`plan/[patientId].tsx:399-404`), "Các phiên bản" dòng 408 | Không |
| S-11 B05 | Khớp hiện trạng | **Đính chính:** route mới đặt là `src/app/wound-history/[woundId].tsx` (cùng kiểu `compare/[woundId].tsx`), không phải `/wounds/[id]/history`, để không phải đổi `wounds/[id].tsx` thành thư mục. Chưa thử `wounds/[id].tsx` và `wounds/[id]/history.tsx` cùng tồn tại trên Expo Router 58, nên chọn cách đã có tiền lệ trong dự án |
| S-12 N03 → N06 | Khớp: không có `router.push` tới `/plan` từ màn bệnh nhân | Không |
| S-13 Sheet ở B05 | Khớp: `notify()` ở `wounds/[id].tsx:90, 126` | Không |
| Q01 đến Q07 | Chưa có trong audit | Đo bổ sung, xem mục 3 |
| `Header back` | `router.canGoBack() ? router.back() : router.replace('/')` (`ui.tsx`, trong `Header`) | Ghi vào quy tắc điều hướng: mở màn tác vụ từ liên kết sâu thì Back về trang đầu |

## 3. Số đo bổ sung: quản trị

Đo trên bản web `master` `13b68bf`, tài khoản `quantri`, cao nội dung (px) / số màn (trừ thanh tab 66 px).

| Mã | Màn | 320×640 | 360×740 | 390×844 | 768×1024 | Nhận định |
|---|---|---|---|---|---|---|
| Q01 | Quản lý tài khoản | 1168 / 2,30 | 1065 / 1,75 | 1023 / 1,44 | 1003 / 1,12 | Hai việc khác nhau (tài khoản, phân công) trên một trang; dài theo số tài khoản |
| Q02 | Kho dữ liệu kỹ thuật | 1292 / 2,65 | 1311 / 2,17 | 1268 / 1,79 | 1415 / 1,59 | Nút "Tải bộ dữ liệu" ở cuối, sau lưới ảnh |
| Q03 | Thiết bị | 571 / 1,13 | 671 / 1,11 | 775 / 1,09 | 955 / 1,07 | Gọn |
| Q04 | Lỗi đồng bộ | 571 / 1,13 | 671 / 1,11 | 775 / 1,09 | 955 / 1,07 | Gọn |
| Q05 | Chẩn đoán USB/UART | 901 / 1,58 | 880 / 1,31 | 860 / 1,11 | 955 / 1,00 | Gọn; công cụ kỹ thuật, không đổi |
| Q06 | Thiết bị (mức kỹ thuật) | 1028 / 1,80 | 937 / 1,40 | 919 / 1,19 | 955 / 1,00 | Cùng tệp B13 |
| Q07 | Cá nhân | 613 / 1,21 | 674 / 1,11 | 778 / 1,09 | 958 / 1,07 | Gọn |

Không màn quản trị nào tràn ngang. N01 (hướng dẫn 4 trang) là màn phân trang, mỗi trang một nút "Tiếp", giữ nguyên.

## 4. Hành vi điều hướng

| Tình huống | Hành vi | Cài đặt |
|---|---|---|
| Mở màn tác vụ | `router.push` với đủ tham số ngữ cảnh: `patientId`, `woundId`, và `imageId` khi tác vụ gắn ảnh. Màn tác vụ đọc ngữ cảnh từ tham số, hiện `ClinicalContext` ở đầu | Giữ cách gọi hiện có ở B04, B05, B11 |
| Quay lại | Nút Back trên `Header` và Back hệ thống cùng một đường (`router.back()`); không có ngữ cảnh lịch sử thì `router.replace('/')` như hiện nay | Không đổi `Header` |
| Giữ `patient_id`, `wound_id` | Không suy ngữ cảnh từ "bệnh nhân gần nhất". Màn mới `wound-history/[woundId]` lấy bệnh nhân từ vết. Khi B11 đi tiếp hàng đợi sang bệnh nhân khác, giữ `tuBenhNhan` và cảnh báo `patientChanged` (QĐ-P0-2) | Kiểm bằng URL trong kịch bản |
| Giữ dữ liệu chưa lưu | Dữ liệu của tác vụ nằm trong state của màn tác vụ, không trong từng bước. Lùi bước ("Quay lại" trong footer) giữ dữ liệu. Không tự lưu nháp (P0 SV-05) | B06, B07 đang làm vậy; B10 áp dụng khi tách bước |
| Hủy tác vụ | Nút "Hủy" (phụ) trong footer hoặc Back. Có dữ liệu chưa lưu thì `useDiscardGuard` hỏi "Bỏ dữ liệu chưa lưu?" với "Bỏ dữ liệu" / "Ở lại". Ở B11 "Hủy" chỉ thoát chế độ sửa, giữ số cũ | Thêm `useDiscardGuard` cho B03 |
| Xác nhận thao tác phá hủy | Dùng `confirm()` hiện có, nêu đối tượng cụ thể (mã máy, mã hồ sơ, phiên bản). Giữ mọi xác nhận đang có: giao, thu hồi máy (B04), khóa tài khoản, cấp quyền xuất, đổi bác sĩ (Q01), loại ảnh, ngừng chia sẻ (B11), cấp lại mã kích hoạt | Không thêm, không bỏ |
| Chặn gửi trùng | Giữ khóa `saving` (B06, B07, B11) và `busy` (B03, B10). Nút trong footer dùng `loading` để tắt trong lúc lưu. Không chuyển khóa vào `Button` dùng chung | Kiểm bằng bấm hai lần trong 100 ms |
| Lỗi | Lỗi kiểm tra hiện cạnh trường (đã có ở B06, B07, B11) và nút chính bị tắt kèm `reason`. Lỗi lưu: `notify` với nội dung lỗi, giữ dữ liệu đã nhập. Lỗi thiết bị (NAK, mất kết nối) hiện trong footer T01 cạnh nút | |
| Hoàn tất | Giữ `notify` "Đã lưu…" hiện nay rồi quay về màn gọi; B07 giữ màn đánh dấu báo cáo (QĐ-5 không tự đóng); B11 giữ thông báo xanh và nút "Ảnh chưa đo tiếp theo"; T01 giữ "Máy đã nhận liệu trình… (lúc hh:mm:ss)" | |
| Lớp modal | Tối đa một lớp: sheet, hộp thoại `confirm`/`notify`, hoặc `Modal` phóng ảnh. Thao tác trong sheet cần xác nhận thì đóng sheet trước rồi mới `confirm` | Thành phần `Sheet` không cho mở sheet thứ hai |
| Không tự chuyển T01 sang T02 | QĐ-6 chưa trả lời | |

## 5. Các giai đoạn triển khai

Thứ tự theo ưu tiên của người dùng: bác sĩ, bệnh nhân, quản trị, thiết bị. Giai đoạn 0 là nền bắt buộc. Mỗi giai đoạn là một PR nhỏ, base `master` sau khi PR nền merge (hoặc base nhánh nền nếu chưa merge). Tiêu chí và ca kiểm thử chi tiết ở `ACCEPTANCE_CRITERIA` (mã AC-, TC-).

### GĐ-0. Nền: vùng nút cố định, bàn phím, sheet, công cụ đo

- **Màn:** không đổi màn nào.
- **Thành phần:** `Screen` (thêm `footer?: ReactNode`), `Sheet` (mới), `scripts/kiem-thu-tb.cjs` (mới, từ `cong-cu/do-cuon.cjs`).
- **Điều hướng hiện tại / đề xuất:** không đổi.
- **Tệp:** `src/components/ui.tsx`, `src/components/Sheet.tsx`, `scripts/kiem-thu-tb.cjs`.
- **Phụ thuộc:** không.
- **Rủi ro:** `Screen` dùng ở 32 tệp; bọc `KeyboardAvoidingView` có thể đổi bố cục khi bàn phím mở ở mọi màn. Giảm rủi ro: chỉ bọc khi có `footer`. `paddingBottom` hiện tính cho thanh tab; footer chỉ dùng ở màn không có thanh tab.
- **Tiêu chí:** AC-G01..G09, AC-0.1..0.5.
- **Ca kiểm thử:** TC-0.1..0.6.

### GĐ-1. B07 Đánh giá (QĐ-TB-1 = A)

- **Màn:** B07.
- **Thành phần:** `Screen.footer`, `Button`, `Disclosure` (giữ), `SummaryRow` (giữ).
- **Điều hướng hiện tại:** B05 "Ghi đánh giá"/"+ Ghi đánh giá", B11 "Ghi đánh giá với ảnh này" (kèm `imageId`) → B07 → lưu → màn đánh dấu báo cáo hoặc `router.back()`.
- **Đề xuất:** giữ lối vào, giữ 3 nhóm. Footer: nút Lưu (nhãn theo công tắc công bố) và dòng "Còn n mục bắt buộc" bấm được (mở nhóm thiếu, cuộn tới câu thiếu bằng `scrollRef` hiện có). Khối "Sẽ lưu" ở cuối nội dung.
- **Tệp:** `src/app/evaluate/[woundId].tsx`.
- **Phụ thuộc:** GĐ-0; QĐ-TB-1.
- **Rủi ro:** lưu khi chưa đọc "Sẽ lưu"; tính lại "Còn n mục" phải dùng đúng hàm kiểm tra hiện có (`evaluationProblems` trong `src/lib/evaluationCheck.ts`), không viết hàm mới.
- **Tiêu chí:** AC-1.1..1.6. **Ca kiểm thử:** TC-1.1..1.7, hồi quy `kiem-thu-dot-10.cjs`, `kiem-thu-p1-03.cjs`.

### GĐ-2. B10 Chụp, kiểm tra, nhập số đo

- **Màn:** B10 (B09 chỉ là lối vào, không đổi).
- **Thành phần:** `StepRow` (giữ), `ClinicalContext` (có thể thêm biến thể một dòng; nếu thêm thì là thuộc tính tùy chọn), `Screen.footer`.
- **Điều hướng hiện tại:** B05, B09, nút giữa → B10; một trang cho bước 2 và 3; lưu → `router.back()` hoặc B11 theo hành vi hiện có.
- **Đề xuất:** ba bước trong cùng route, state `step` cục bộ; footer theo bước (mục S-07). Back hệ thống ở bước 2, 3: `useDiscardGuard(photo !== null)` như hiện nay. "Quay lại" về bước trước, giữ ảnh và số đã gõ.
- **Tệp:** `src/app/guided-capture.tsx`.
- **Phụ thuộc:** GĐ-0.
- **Rủi ro:** camera/AR là phần nhạy; không đổi `take`, `fromLibrary`, `start`, phân tích AI, `capabilities`. Không điền sẵn số AR (QĐ-1), không chọn sẵn phương pháp AR (QĐ-P0-1). "Tiếp" luôn bật (không đổi dữ liệu `visualReview`).
- **Tiêu chí:** AC-2.1..2.6. **Ca kiểm thử:** TC-2.1..2.8, hồi quy `kiem-thu-p1-05-06.cjs`, `kiem-thu-p0.cjs` (B10), `kiem-thu-dot-9.cjs`.

### GĐ-3. B11 Nhập hoặc sửa diện tích

- **Màn:** B11.
- **Thành phần:** trạng thái `editing` sẵn có, `Screen.footer`.
- **Điều hướng hiện tại:** B05 album, B12, hàng đợi (`router.replace` sang ảnh kế), B08 → B11.
- **Đề xuất:** khi `editing`: ẩn liên kết "Ảnh trước/sau", "Mở VTxx", "So sánh", và khối mục thu gọn bên dưới; footer "Hủy" / "Lưu diện tích". Khi không `editing`: như hiện nay. Không thêm route (QĐ-TB-2 = A).
- **Tệp:** `src/app/images/[id].tsx`.
- **Phụ thuộc:** GĐ-0; QĐ-TB-2.
- **Rủi ro:** ảnh chưa đo mở sẵn `editing`, nên người dùng mở B11 để chia sẻ hoặc yêu cầu chụp lại phải bấm "Hủy" trước. Cần giữ một lối ra rõ: "Hủy" đổi nhãn thành "Xem thông tin ảnh" khi chưa nhập gì? Đây là đổi câu chữ, đưa vào QĐ-TB-2.
- **Tiêu chí:** AC-3.1..3.6. **Ca kiểm thử:** TC-3.1..3.7, hồi quy `kiem-thu-dot-12.cjs`, `kiem-thu-p1-05-06.cjs`, `kiem-thu-p0.cjs` (B11).

### GĐ-4. B06 Đợt điều trị (nhánh bác sĩ) và B03 Thêm bệnh nhân

- **Màn:** B06 bác sĩ, B03. N06 (nhánh bệnh nhân cùng tệp) không đổi.
- **Thành phần:** `Screen.footer`, `Disclosure`, `useDiscardGuard`.
- **Điều hướng hiện tại:** B01 (bản nháp), B04, B05 → B06; B02 "Thêm mới" → B03 → "Đã tạo hồ sơ" → "Mở hồ sơ".
- **Đề xuất:** B06 footer "Quay lại" / "Tiếp" hoặc "Lưu phiên bản n cho VTxx"; Notice "sẽ chuyển sang Kết thúc" và tác dụng trạng thái ở bước 3 vẫn ngay trên footer; "Các phiên bản" thành `Disclosure` có tóm tắt phiên bản đang áp dụng. B03 footer "Lưu hồ sơ và tạo tài khoản", thêm `useDiscardGuard`.
- **Tệp:** `src/app/plan/[patientId].tsx` (chỉ nhánh bác sĩ), `src/app/patients/new.tsx`.
- **Phụ thuộc:** GĐ-0. Chồng tệp mềm với P2-05a (nhánh bệnh nhân của `plan/[patientId].tsx`): PR nào merge sau thì gộp `master` vào.
- **Rủi ro:** xác nhận liều (UX-02) và bảng trước/sau ở bước 3 phải giữ nguyên vị trí trên nút Lưu.
- **Tiêu chí:** AC-4.1..4.7. **Ca kiểm thử:** TC-4.1..4.8, hồi quy `kiem-thu-dot-8.cjs`, `kiem-thu-dot-10.cjs`, `kiem-thu-p0.cjs`, `kiem-thu-p1-03.cjs`.

### GĐ-5. B04 Hồ sơ bệnh nhân: chỉ kiểm hồi quy

- **Màn:** B04. 1,63 màn ở 360×740; P1-02a đã sắp lại; lối vào theo dòng đã mang `woundId` (PX-01).
- **Đề xuất:** không đổi bố cục. Thêm vào kịch bản `kiem-thu-tb.cjs` kiểm mọi lối vào từ B04 mang đúng `patientId`, `woundId`.
- **Tệp:** chỉ kịch bản kiểm thử.
- **Tiêu chí:** AC-5.1. **Ca kiểm thử:** TC-5.1.

### GĐ-6. B05 Vết thương (bác sĩ): BLOCKED tới khi PR-P2-2, PR-P2-3 merge

- **Màn:** B05, màn mới "Lịch sử vết thương".
- **Thành phần:** `Screen.footer`, `Sheet`, `AreaLineChart` (của P2), `ClosureActions` (giữ), `CourseCard` (giữ).
- **Điều hướng hiện tại:** B04/B01 → B05 → B07, B10, B06, B08, B11, B13; album và đánh giá cũ trong trang.
- **Đề xuất:** mục S-11 và S-13; route mới `src/app/wound-history/[woundId].tsx` (chỉ đọc, cùng kiểm quyền `useCanView`). Footer "Ghi đánh giá" / "Chụp ảnh có hướng dẫn".
- **Tệp:** `src/app/wounds/[id].tsx` (nhánh bác sĩ), `src/app/wound-history/[woundId].tsx` (mới).
- **Phụ thuộc:** GĐ-0, PR-P2-2, PR-P2-3, QĐ-TB-3.
- **Rủi ro:** cao (tệp P2 sửa nhiều; P2-03a nối ảnh với điểm biểu đồ cần ảnh gần biểu đồ). Nhánh bệnh nhân (N05) không đổi trong giai đoạn này.
- **Tiêu chí:** AC-6.1..6.7. **Ca kiểm thử:** TC-6.1..6.8.

### GĐ-7. Bệnh nhân

- **N07 (không chờ):** Notice và ba nút lên trên `DeviceView`. Tệp `src/app/patient/device.tsx`. Không footer (màn có thanh tab).
- **N03 → N06 (chờ PR-P2-5):** dòng "Xem đợt điều trị" trong thẻ đợt ở N03, mở `/plan/[patientId]` với `woundId`. Tệp `src/app/schedule.tsx`.
- **N01, N09:** giữ. **N02, N04, N05, N08:** do P2; GĐ-7 chỉ kiểm hồi quy sau P2 bằng `kiem-thu-tb.cjs`.
- **Điều hướng hiện tại:** tab Thiết bị → N07 → T01/T02/N08; nút giữa → N03; N06 không có lối vào.
- **Rủi ro:** thấp; bệnh nhân lớn tuổi quen vị trí cũ (chưa thử).
- **Tiêu chí:** AC-7.1..7.4. **Ca kiểm thử:** TC-7.1..7.5, hồi quy `kiem-thu-dot-11.cjs`.

### GĐ-8. Quản trị

- **Q01:** thanh `Segmented` "Tài khoản" / "Phân công" ở đầu trang, mỗi lúc hiện một phần; xác nhận đổi bác sĩ và "Hoàn tác" giữ nguyên; bộ chọn bác sĩ giữ tại chỗ (không dùng sheet, vì sau khi chọn có `confirm`, dùng sheet sẽ thành hai lớp).
- **Q02:** thẻ tải bộ dữ liệu và bộ lọc lên trên lưới ảnh.
- **Q03 đến Q07:** giữ.
- **Tệp:** `src/app/admin/index.tsx`, `src/app/admin/dataset.tsx`.
- **Phụ thuộc:** GĐ-0 (không cần footer vì có thanh tab).
- **Rủi ro:** quyền xuất dữ liệu: nút tải vẫn tắt khi `!me.researchAccess` như hiện nay.
- **Tiêu chí:** AC-8.1..8.4. **Ca kiểm thử:** TC-8.1..8.5.

### GĐ-9. Thiết bị (chỉ thay đổi điều hướng an toàn)

- **Màn:** T01, B13 (Q06 cùng tệp). T02 không đổi.
- **Thành phần:** `Screen.footer`, `UsbLinkStatus` (giữ ở đầu màn).
- **Điều hướng hiện tại:** N02/N07/B13 → T01 → (sau ACK, bấm nút) → T02.
- **Đề xuất:** T01 footer chứa: thông báo trạng thái gửi đang có (đang gửi, đã nhận, lỗi, mất kết nối) và một nút chính theo trạng thái ("Kết nối" → "Nạp liệu trình vào máy" → "Theo dõi phiên điều trị"). Nút phụ khi lỗi giữ trong footer dưới dạng `secondary`. Điều kiện bật/tắt (`canSend`, `noDevice`, `unidentified`, `versionMismatch`) giữ nguyên. B13: hai nút vào footer, điều kiện vai trò giữ nguyên.
- **Tệp:** `src/app/connect-device.tsx`, `src/app/devices/[id].tsx`.
- **Phụ thuộc:** GĐ-0. Không đụng `src/lib/device/**`.
- **Rủi ro:** cao nhất về an toàn quy trình: hiển thị sai nút theo trạng thái; footer che thông báo đỏ (chưa giao máy, sai phiên bản giao thức). Giảm rủi ro: thông báo đỏ chặn gửi giữ ở đầu nội dung, ngay dưới thẻ kết nối.
- **Tiêu chí:** AC-9.1..9.8. **Ca kiểm thử:** TC-9.1..9.9, hồi quy toàn bộ phần thiết bị của `kiem-thu-p0.cjs`. Máy thật: BLOCKED.
- **Ghi chú ưu tiên:** người dùng xếp thiết bị cuối. Audit đề xuất làm sớm (QĐ-TB-4) vì nút nạp và nút sang T02 nằm dưới màn đầu. Kế hoạch theo thứ tự của người dùng; nếu người dùng chọn QĐ-TB-4 = Có thì GĐ-9 lên ngay sau GĐ-0.

## 6. Danh sách PR triển khai theo ưu tiên

| Ưu tiên | PR | Giai đoạn | Tệp chính | Base | Trạng thái |
|---|---|---|---|---|---|
| 1 | PR-TB-1 Nền | GĐ-0 | `ui.tsx`, `Sheet.tsx`, `scripts/kiem-thu-tb.cjs` | `master` | Sẵn sàng khi duyệt |
| 2 | PR-TB-2 B07 | GĐ-1 | `evaluate/[woundId].tsx` | PR-TB-1 | Sẵn sàng khi duyệt + QĐ-TB-1 |
| 3 | PR-TB-3 B10 | GĐ-2 | `guided-capture.tsx` | PR-TB-1 | Sẵn sàng khi duyệt |
| 4 | PR-TB-4 B11 | GĐ-3 | `images/[id].tsx` | PR-TB-1 | Sẵn sàng khi duyệt + QĐ-TB-2 |
| 5 | PR-TB-5 B06, B03 | GĐ-4 | `plan/[patientId].tsx`, `patients/new.tsx` | PR-TB-1 | Sẵn sàng; gộp master nếu P2-05a merge trước |
| 6 | PR-TB-6 B04 kiểm thử | GĐ-5 | `scripts/kiem-thu-tb.cjs` | PR-TB-1 | Có thể gộp vào PR-TB-1 |
| 7 | PR-TB-7 B05 | GĐ-6 | `wounds/[id].tsx`, `wound-history/[woundId].tsx` | `master` sau PR-P2-2, P2-3 | BLOCKED (P2) |
| 8 | PR-TB-8 N07 | GĐ-7 | `patient/device.tsx` | `master` | Sẵn sàng khi duyệt |
| 9 | PR-TB-9 N03 → N06 | GĐ-7 | `schedule.tsx` | `master` sau PR-P2-5 | BLOCKED (P2) |
| 10 | PR-TB-10 Q01, Q02 | GĐ-8 | `admin/index.tsx`, `admin/dataset.tsx` | `master` | Sẵn sàng khi duyệt |
| 11 | PR-TB-11 T01, B13 | GĐ-9 | `connect-device.tsx`, `devices/[id].tsx` | PR-TB-1 | Sẵn sàng khi duyệt (lên thứ 2 nếu QĐ-TB-4 = Có) |

PR-TB-2, 3, 4, 5, 11 không chung tệp với nhau nên làm song song được trên nhánh nền. Không merge PR nào khi chưa có duyệt.

Sau mỗi PR: `npx tsc --noEmit`, `npx expo lint`, `npm test`, `scripts/kiem-thu-giao-dien.cjs` và các kịch bản hồi quy liên quan, `scripts/kiem-thu-tb.cjs`, ảnh 320/360/390/768 px trước và sau (lưu `/mnt/project-files/datn/task-based-ui/pr-tb-n/`), kiểm Back và dữ liệu chưa lưu, tràn ngang, nút chính, điều khiển an toàn thiết bị.

## 7. Quyết định chờ người dùng

| Mã | Câu hỏi | Khuyến nghị |
|---|---|---|
| QĐ-TB-1 | B07: nhóm thu gọn + footer (A) hay 4 bước (B) | A |
| QĐ-TB-2 | B11: dùng `editing` sẵn có (A) hay route riêng (B) | A |
| QĐ-TB-3 | B05: album, đánh giá cũ sang màn "Lịch sử vết thương" (A) hay thu gọn tại chỗ (B) | A |
| QĐ-TB-4 | Đưa GĐ-9 (T01, B13) lên ngay sau GĐ-0 | Có |
| QĐ-TB-5 | Thứ tự với P2 ở tệp dùng chung `plan/[patientId].tsx`: PR nào xong trước merge trước, PR sau gộp `master` (A), hay chờ P2 xong hết (B) | A |

## 8. Ràng buộc giữ nguyên

Không đổi: phép tính lâm sàng, thuật toán đánh giá, AI, thuật toán đo, API, schema, store và logic nghiệp vụ (`src/lib/**`), giao thức USB/UART (`src/lib/device/**`), firmware, thông số và logic điều trị, phân quyền (`useCanView`, `RoleTabs`), QĐ-1 đến QĐ-6, QĐ-P0-1, QĐ-P0-2, QĐ-P2-1..5. Không thay chức năng thật bằng bản giả lập. Mỗi PR liệt kê tệp đã sửa; nếu có tệp trong `src/lib/` thì phải dừng và hỏi.

## Tài liệu tham khảo

1. Expo (truy cập 13/11/2026). *Keyboard handling*. https://docs.expo.dev/guides/keyboard-handling.md
2. Expo (truy cập 13/11/2026). *app.json / app.config.js*, SDK 58, mục `android.softwareKeyboardLayoutMode`. https://docs.expo.dev/versions/v58.0.0/config/app.md
3. Laubheimer, P. (2023). *Bottom Sheets: Definition and UX Guidelines*. Nielsen Norman Group. https://www.nngroup.com/articles/bottom-sheet/
4. W3C (2023). *Understanding SC 2.4.11: Focus Not Obscured (Minimum)*. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured
