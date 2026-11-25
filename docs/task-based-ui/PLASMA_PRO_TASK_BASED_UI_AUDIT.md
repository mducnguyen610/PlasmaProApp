# Plasma Pro: audit giao diện theo tác vụ và độ cuộn

Ngày: 13/11/2026. Giai đoạn: chỉ audit, không sửa mã. Mã nguồn: `master` commit `13b68bf` (đã gồm PR 32 đến 40 của P0, P1). Không còn PR mở lúc audit.

Bộ tài liệu gồm 5 tệp:

1. `PLASMA_PRO_TASK_BASED_UI_AUDIT.md` (tệp này): hiện trạng, số đo, phát hiện.
2. `PLASMA_PRO_NAVIGATION_PROPOSAL.md`: ba mẫu tương tác, quy tắc điều hướng.
3. `PLASMA_PRO_SCREEN_RESTRUCTURE_MAP.md`: từng thay đổi màn theo 9 mục bắt buộc, sơ đồ trước và sau.
4. `PLASMA_PRO_SCROLL_REDUCTION_BACKLOG.md`: hạng mục, PR dự kiến, phụ thuộc, quyết định chờ duyệt.
5. `PLASMA_PRO_TASK_BASED_UI_TEST_PLAN.md`: kiểm thử sau mỗi PR.

## 1. Kết luận ngắn

- 12 trên 27 trạng thái màn đo được cần cuộn quá 2 chiều cao màn ở 360×740 hoặc giấu nút chính dưới màn đầu. Nặng nhất: B05 (3,99 màn), B07 (3,28 màn, nút Lưu ở 2243 px), B11 ảnh chưa đo (3,01 màn), B06 (2,74 màn), B13 (2,47 màn, hai nút thao tác ở cuối).
- Phát hiện an toàn đáng chú ý nhất: ở T01 sau khi kết nối, nút "Nạp liệu trình vào máy" của bệnh nhân nằm ở 861 px trên màn 360×740, và sau khi máy nhận, nút "Theo dõi phiên điều trị" nằm ở 957 px. Bệnh nhân phải cuộn mới thấy bước tiếp theo, trong khi phiên chỉ được ghi khi T02 mở (UX-03, Đợt 7). Nút "Dừng điều trị" ở T02 vẫn trong màn đầu ở mọi khổ đo (đáy 516 px ở 360×740).
- Ứng dụng chưa có vùng nút cố định ở đáy (`Screen` trong `src/components/ui.tsx:97` chỉ có `ScrollView`, không có `footer`), chưa có bottom sheet (chỉ có một `Modal` phóng ảnh ở `images/[id].tsx:454`). Giải thích ngắn đang dùng hộp thoại `notify()`.
- Nhiều nền móng đã có từ P0, P1: `ClinicalContext` trên các màn tác vụ, `useDiscardGuard` ở B06, B07, B10, B11, `StepRow` ở B06, B10, chặn lưu trùng bằng `saving` ở B06, B07, B11. Đề xuất tận dụng các phần này, không thay.
- B01, B02, B04, B08, B09, B12, N08, N09, T02 đã đủ gọn (dưới 2 màn ở 360×740 và nút chính trong màn đầu hoặc ở thanh tiêu đề). Đề xuất giữ nguyên.
- N02, N03, N04, N05, N08 trùng tệp với 7 PR P2 sắp mở. Audit ghi vấn đề nhưng đề xuất để P2 xử lý hoặc làm sau P2, tránh hai luồng sửa cùng tệp.

Độ tin cậy: trung bình. Số đo lấy từ bản web (Expo export, Chromium), dữ liệu mẫu `p-1`, `w-1`. Chiều cao trên điện thoại thật khác do thanh trạng thái, phông hệ thống và cỡ chữ người dùng chọn. Chưa thử với bác sĩ hay bệnh nhân.

## 2. Phạm vi, căn cứ, giả định

- Mã màn theo `docs/thiet-ke/giao-dien-01-danh-sach-man.md`. Yêu cầu gọi trang chủ bệnh nhân là N01, trong mã N01 là hướng dẫn lần đầu (`onboarding.tsx`) và trang chủ là N02 (`patient/index.tsx`). Tài liệu này dùng mã trong mã nguồn và hiểu "N01 dashboard" của yêu cầu là N02. Tương tự, trong mã B06 là Đợt điều trị (`plan/[patientId].tsx`), B07 là Đánh giá (`evaluate/[woundId].tsx`).
- Ràng buộc giữ nguyên (mục 6 của yêu cầu): phép tính lâm sàng, thuật toán đánh giá và đo, AI, API, schema, store, giao thức USB/UART, firmware, thông số điều trị, phân quyền, QĐ-1 đến QĐ-6. Trạng thái các QĐ lấy từ `datn/ux-audit-dot-7/PLASMA_PRO_UX_PRIORITY_BACKLOG.md` và báo cáo Đợt 13: QĐ-1 chọn A (không điền sẵn số AR); QĐ-2, QĐ-4, QĐ-5 giữ mặc định; QĐ-3, QĐ-6 chưa có câu trả lời. Vì QĐ-6 (tự chuyển T01 sang T02) chưa trả lời, đề xuất T01 không tự chuyển màn.
- Quyết định P2 phải tôn trọng: QĐ-P2-1 = C, QĐ-P2-2 = A, QĐ-P2-3 (chip mức độ, xu hướng chuyển từ N02 sang N05), QĐ-P2-4 (PR biểu đồ sau 34, 37, 38, 39), QĐ-P2-5 (B05 dùng cùng biểu đồ đường). Nguồn: `datn/p2-patient-experience/PLASMA_PRO_P2_IMPLEMENTATION_BACKLOG.md`.
- Khổ đo: 320×640, 360×740, 390×844, 768×1024, cùng bộ khổ với kiểm thử P0 (`scripts/kiem-thu-p0.cjs`, TP-DV-08a).

## 3. Phương pháp đo

Công cụ: `docs/task-based-ui/cong-cu/do-cuon.cjs` và `do-t01-t02.cjs` (Playwright trên bản `npx expo export -p web`). Với mỗi màn:

- "Cao nội dung": `scrollHeight` của vùng cuộn chính, không gồm thanh tiêu đề.
- "Số màn": cao nội dung chia cho chiều cao vùng cuộn nhìn thấy; màn có thanh tab trừ thêm 96 px (thanh tab và nút giữa nhô lên, theo `TAB_BAR_HEIGHT + FAB_RISE + 4` trong `ui.tsx:91`).
- "Đáy nút chính": tọa độ đáy của nút hoàn tất tác vụ khi mới mở màn, so với chiều cao cửa sổ.
- Ảnh toàn trang ở 360 px: `/mnt/project-files/datn/task-based-ui/anh-truoc/`.

Cơ sở chọn ngưỡng 2 màn: nghiên cứu theo dõi mắt của Nielsen Norman Group cho thấy khoảng 57% thời gian xem nằm trên nếp gấp đầu tiên và 74% nằm trong hai màn đầu [1]. Đây là nghiên cứu trên trang web máy tính, dùng làm ngưỡng tham khảo, không phải chuẩn lâm sàng.

## 4. Số đo hiện trạng

Ô ghi "cao nội dung / số màn". "Màn đầu" nghĩa là nút chính thấy ngay khi mở.

| Mã | Màn | 320×640 | 360×740 | 390×844 | 768×1024 | Nút chính ở 360×740 |
|---|---|---|---|---|---|---|
| B01 | Trang chủ bác sĩ | 985 / 2,16 | 951 / 1,65 | 911 / 1,34 | 1024 / 1,10 | Không có nút đơn; danh sách việc |
| B02 | Danh sách bệnh nhân | 1180 / 2,47 | 1074 / 1,86 | 1046 / 1,53 | 1024 / 1,10 | "Thêm mới" ở thanh tiêu đề |
| B03 | Thêm bệnh nhân | 763 / 1,34 | 742 / 1,11 | 844 / 1,00 | 1024 / 1,00 | "Lưu hồ sơ" đáy 781, cần cuộn |
| B04 | Hồ sơ bệnh nhân | 1141 / 2,00 | 1092 / 1,63 | 1071 / 1,38 | 980 / 1,03 | Lối vào theo dòng |
| B05 | Thông tin vết thương | 2849 / 4,99 | 2675 / 3,99 | 2593 / 3,35 | 2507 / 2,63 | "Chụp ảnh có hướng dẫn" đáy 1009, cần cuộn |
| B06 | Đợt điều trị (bước Lịch) | 1957 / 3,43 | 1836 / 2,74 | 1836 / 2,37 | 1648 / 1,73 | "Tiếp" đáy 1166, cần cuộn |
| B07 | Đánh giá | 2368 / 4,15 | 2204 / 3,28 | 2204 / 2,84 | 1906 / 2,00 | "Lưu và công bố" đáy 2243, cần cuộn |
| B08 | So sánh | 832 / 1,46 | 779 / 1,16 | 778 / 1,00 | 1024 / 1,00 | Không có nút lưu |
| B09 | Chọn hồ sơ để chụp | 640 / 1,00 | 740 / 1,00 | 844 / 1,00 | 1024 / 1,00 | Đáy 510, màn đầu |
| B10 | Chụp (bước 1) | 720 / 1,26 | 731 / 1,09 | 783 / 1,01 | 1024 / 1,00 | "Mở camera" đáy 646, màn đầu |
| B10 | Kiểm tra ảnh và nhập số đo | 1421 / 2,49 | 1374 / 2,05 | 1364 / 1,76 | 1348 / 1,41 | "Lưu ảnh" đáy 1347, cần cuộn |
| B11 | Ảnh đã đo (IMG0003) | 1485 / 2,60 | 1404 / 2,09 | 1403 / 1,81 | 1444 / 1,51 | "Sửa số đo" đáy 1022, cần cuộn |
| B11 | Ảnh chưa đo (IMG0004) | 2117 / 3,71 | 2022 / 3,01 | 1952 / 2,52 | 1910 / 2,00 | "Lưu diện tích" đáy 1654, cần cuộn |
| B12 | Danh sách ảnh | 853 / 1,80 | 780 / 1,36 | 844 / 1,13 | 1024 / 1,10 | Danh sách |
| B13 | Thiết bị và nhật ký | 1754 / 3,07 | 1655 / 2,47 | 1637 / 2,11 | 1616 / 1,69 | "Kết nối máy" đáy 1628, cần cuộn |
| N02 | Trang chủ bệnh nhân | 1408 / 2,98 | 1311 / 2,29 | 1269 / 1,88 | 1243 / 1,45 | "Nạp liệu trình" trong màn đầu khi có buổi |
| N03 | Lịch trình | 1385 / 2,44 | 1381 / 2,07 | 1326 / 1,72 | 1300 / 1,37 | Không có nút đơn |
| N04 | Hồ sơ và lịch sử | 1266 / 2,68 | 1128 / 1,97 | 1105 / 1,63 | 1049 / 1,23 | Không có |
| N05 | Vết thương (bệnh nhân) | 1696 / 2,99 | 1613 / 2,41 | 1590 / 2,06 | 1530 / 1,61 | Không có |
| N06 | Đợt điều trị (bệnh nhân) | 885 / 1,56 | 804 / 1,20 | 844 / 1,00 | 1024 / 1,00 | Chỉ xem |
| N07 | Thiết bị của tôi | 932 / 1,97 | 884 / 1,55 | 884 / 1,31 | 1024 / 1,10 | Ba nút ở cuối |
| N08 | Báo triệu chứng | 702 / 1,30 | 679 / 1,02 | 844 / 1,00 | 1024 / 1,00 | "Gửi" đáy 697, màn đầu |
| N09 | Cá nhân | 645 / 1,35 | 740 / 1,15 | 844 / 1,13 | 1024 / 1,10 | Đáy 572, màn đầu |
| T01 | Nạp liệu trình, chưa kết nối (bệnh nhân) | 935 / 1,65 | 823 / 1,23 | 823 / 1,07 | 1024 / 1,00 | "Kết nối" đáy 346, màn đầu |
| T02 | Theo dõi phiên, đang chiếu | 1 màn | 1 màn | 1 màn | 1 màn | "Dừng điều trị" đáy 536 / 516 / 516 |

Đo riêng luồng T01 sang T02 (`do-t01-t02.cjs`, đáy nút tính bằng px):

| Vai trò, khổ | Cao T01 sau kết nối | "Nạp liệu trình vào máy" | "Theo dõi phiên điều trị" sau khi máy nhận | "Dừng điều trị" ở T02 |
|---|---|---|---|---|
| Bệnh nhân 320×640 | 913 | 955 (cần cuộn) | 917 (cần cuộn) | 536 (màn đầu) |
| Bệnh nhân 360×740 | 819 | 861 (cần cuộn) | 957 (cần cuộn) | 516 (màn đầu) |
| Bệnh nhân 390×844 | 801 | 843 (sát đáy) | 1087 (cần cuộn) | 516 (màn đầu) |
| Bác sĩ 360×740 | 999 | 1038 (cần cuộn) | 947 (cần cuộn) | 504 (màn đầu) |

Ghi chú: thiết bị là thiết bị giả lập (`Thiết bị giả lập` hiện trên thẻ kết nối). Nút "Dừng điều trị" chỉ có với thiết bị giả lập; máy thật dừng bằng thao tác trên máy (đã ghi ở P0, CR-04). Chưa thử máy thật.

## 5. Phát hiện theo bảy câu hỏi của yêu cầu

Mỗi phát hiện có mã TB-A. Mức: Cao (ảnh hưởng an toàn, dữ liệu hoặc hoàn tất tác vụ chính), Trung bình (tốn thao tác, dễ sót), Thấp.

### 5.1 Màn cuộn quá nhiều

| Mã | Màn | Bằng chứng | Mức |
|---|---|---|---|
| TB-A01 | B05 | 3,99 màn ở 360×740, 4,99 màn ở 320×640. Gồm 5 khối: tổng quan và hiện trạng (khoảng 1000 px), biểu đồ, đợt điều trị, đánh giá gần nhất, album 2 ngày chụp. | Cao |
| TB-A02 | B07 | 3,28 màn; nút Lưu ở 2243 px. Nhóm "Phân loại vết thương" mở sẵn chiếm khoảng 1050 px vì 7 lựa chọn loại vết, 3 thang dạng chip. | Cao |
| TB-A03 | B11 ảnh chưa đo | 3,01 màn; nút "Lưu diện tích" ở 1654 px. Biểu mẫu đo nằm giữa ảnh, điều hướng hàng đợi và 5 mục thu gọn. | Cao |
| TB-A04 | B06 | 2,74 màn ở bước Lịch; nút "Tiếp" ở 1166 px. Khối "Các phiên bản" (khoảng 650 px) luôn hiện dưới trình hướng dẫn. | Trung bình |
| TB-A05 | B10 bước kiểm tra | 2,05 màn; "Lưu ảnh" ở 1347 px. Bước 2 (kiểm tra ảnh) và bước 3 (nhập số đo) cùng hiện trên một trang dù `StepRow` báo đang ở bước 2. | Trung bình |
| TB-A06 | B13 | 2,47 màn; hai nút "Kết nối máy và nạp liệu trình", "Theo dõi phiên điều trị" ở cuối, sau danh sách phiên. | Trung bình |
| TB-A07 | N02, N03, N04, N05 | 2,0 đến 3,0 màn ở 320×640. Thuộc phạm vi 7 PR P2. | Trung bình (để P2) |

### 5.2 Màn gộp nhiều chức năng không liên quan

| Mã | Màn | Chức năng đang gộp | Mức |
|---|---|---|---|
| TB-A08 | B05 | Tóm tắt hiện trạng, chụp ảnh, ghi đánh giá, lập hoặc sửa đợt, đóng vết (`ClosureActions`), buổi điều trị gần đây, lịch sử đánh giá, album. Các nút tác vụ nằm rải ở 4 chỗ: nút chính trong thẻ 1, "Sửa đợt" ở thẻ 3, "+ Ghi đánh giá" ở thẻ 4, "So sánh" ở tiêu đề biểu đồ. | Cao |
| TB-A09 | B11 | Nhập hoặc sửa diện tích, đổi tên đầy đủ, chia sẻ cho bên kỹ thuật, yêu cầu chụp lại, loại khỏi bộ dữ liệu, xem thông tin kỹ thuật, lịch sử sửa nhãn, đi tiếp hàng đợi. | Trung bình |
| TB-A10 | B06 | Lập phiên bản mới và đọc lịch sử phiên bản trên cùng trang. | Trung bình |
| TB-A11 | N07 | Tiến độ đợt, chăm sóc thiết bị, 7 ngày gần nhất, phiên sử dụng, rồi mới tới ba nút tác vụ. | Thấp |

### 5.3 Thao tác khó tìm

| Mã | Màn | Bằng chứng | Mức |
|---|---|---|---|
| TB-A12 | T01 | Sau "Kết nối", nút nạp nằm dưới màn đầu ở 320 và 360 px; sau ACK, nút sang T02 dưới màn đầu ở mọi khổ điện thoại đo (mục 4). Bệnh nhân không thấy bước kế mà không cuộn. | Cao |
| TB-A13 | N06 | Không màn nào của bệnh nhân dẫn tới `/plan/[patientId]` (tìm `router.push` trong `src/app`, `src/components`: chỉ B01, B04, B05 mở màn này). Bệnh nhân chỉ thấy liều ở N03. | Trung bình |
| TB-A14 | B05 | "So sánh" là chữ nhỏ ở tiêu đề thẻ biểu đồ; "Nhập số đo cho IMG0004" là liên kết chữ trong khối hiện trạng. | Thấp |
| TB-A15 | B13, N07 | Nút tác vụ ở cuối trang (TB-A06, TB-A11). | Trung bình |

### 5.4 Biểu mẫu nên chia bước

| Mã | Màn | Nhận định | Mức |
|---|---|---|---|
| TB-A16 | B07 | Đã chia 3 nhóm thu gọn và có khối "Sẽ lưu". Có thể giữ dạng nhóm thu gọn kèm vùng nút cố định, hoặc chuyển thành 3 bước cộng bước xem lại. Nielsen Norman Group cho rằng chia bước hợp khi các bước ít phụ thuộc nhau, kém hợp khi người dùng phải qua lại giữa các bước [2]. B07 có "Sửa" nhảy về nhóm, nên cả hai cách đều khả thi. Cần quyết định (QĐ-TB-1). | Cao |
| TB-A17 | B10 | Bước 2 và 3 nên tách thật (kiểm tra ảnh xong mới sang nhập số đo), giữ trong cùng một màn để không mất ảnh khi quay lại. | Trung bình |
| TB-A18 | B03 | Biểu mẫu 4 ô, không cần chia bước; chỉ thiếu vùng nút cố định và chặn rời màn khi đã nhập (không có `useDiscardGuard` trong `patients/new.tsx`). | Trung bình |
| TB-A19 | B06 | Đã có 3 bước Lịch, Liều, Xác nhận; chỉ cần nút bước cố định và tách lịch sử phiên bản. | Thấp |

### 5.5 Thông tin nên giữ ở màn tóm tắt

- B05: định danh vết (vị trí, nhóm tổn thương, trạng thái, mức độ), diện tích mới nhất kèm nguồn và ngày đo, xu hướng do bác sĩ đánh giá, đợt đang áp dụng, cảnh báo "ảnh mới hơn chưa đo", cảnh báo "chưa tới 50% sau mốc xem lại", số ảnh yêu cầu chụp lại. Đây là thông tin quyết định lâm sàng; không thu gọn.
- B04: định danh, danh sách vết thương, báo cáo chưa xử lý, ghi chú cảnh báo sau buổi, đợt mỗi vết.
- B01: việc cần làm, bệnh nhân cần xem.
- N02: buổi hôm nay, nút nạp liệu trình, lịch hẹn gần nhất, lời dặn (nội dung sắp đổi theo P2).

### 5.6 Thông tin nên chuyển sang màn tác vụ riêng

- B05: album ảnh theo ngày và đánh giá cũ chuyển sang "Lịch sử vết thương" (P2-07a đã dự kiến mục này cho N05; đề xuất dùng chung cho B05). Buổi điều trị gần đây đã thu gọn, giữ.
- B11: biểu mẫu nhập diện tích thành chế độ tác vụ tập trung.
- B06: lịch sử phiên bản tách khỏi trình lập phiên bản.
- B10: camera chiếm phần lớn màn ở bước chụp.

### 5.7 Thao tác hợp với bottom sheet hoặc mục thu gọn

| Nội dung | Hiện tại | Đề xuất | Lý do |
|---|---|---|---|
| Giải thích "Giảm chậm sau mốc xem lại" (B05) | `notify()` hộp thoại | Bottom sheet giải thích | Đọc ngắn, cần thấy lại ngữ cảnh |
| Giải thích nhãn thang ở B07 (biểu tượng i) | Mở rộng tại chỗ một dòng chữ (`Q` trong `evaluate/[woundId].tsx:302`) | Giữ | Đã ngắn, không che ngữ cảnh |
| Danh sách ảnh yêu cầu chụp lại (B05) | `notify()` | Bottom sheet có liên kết tới từng ảnh | Hộp thoại không chạm được từng ảnh |
| Chọn phương pháp đo (B10, B11) | Chip trên trang | Giữ chip | Chỉ 2 đến 3 lựa chọn; sheet làm tăng một chạm |
| Lọc danh sách ảnh (B12) | Segmented trên trang | Giữ | Đã gọn (1,36 màn) |
| Chọn ngày ở B06 | Ô nhập ngày | Giữ trong P này | Đổi bộ chọn ngày có thể đổi định dạng nhập; ngoài phạm vi giảm cuộn |
| Lịch sử sửa nhãn, thông tin kỹ thuật (B11) | Mục thu gọn | Giữ thu gọn | Thông tin phụ |
| Lần đánh giá trước (B07) | Mục thu gọn | Giữ thu gọn | Tham khảo, không tự điền |

Không đặt vào sheet hay mục thu gọn: trạng thái kết nối USB/UART, trạng thái phiên đang chiếu, nút dừng, số đo đang nhập, khối "Sẽ lưu" của B07, xác nhận liều của B06, cảnh báo đổi bệnh nhân ở hàng đợi B11.

## 6. Nền móng đã có, cần giữ

| Thành phần | Tệp | Dùng ở | Ý nghĩa với đề xuất |
|---|---|---|---|
| `ClinicalContext` | `src/components/ClinicalContext.tsx` | B05, B06, B07, B10, B11, T02 | Thanh ngữ cảnh bệnh nhân và vết; yêu cầu "ngữ cảnh liên quan" đã đạt |
| `useDiscardGuard` | `src/components/useDiscardGuard.ts` | B06, B07, B10, B11 | Hỏi trước khi bỏ dữ liệu; cần thêm cho B03 (và N08 trong P2-06a) |
| `StepRow` | `ui.tsx:517` | B06, B10 | Thanh bước dùng lại cho B07 nếu chọn chia bước |
| `Disclosure` | `ui.tsx:476` | Nhiều màn | Mục thu gọn có tóm tắt |
| Khóa lưu trùng `saving` | B06, B07, B11; `busy` ở B03, B10 | | Giữ nguyên khi chuyển nút xuống vùng cố định |

## 7. Chồng tệp với P2

| Tệp | PR P2 | Màn trong audit này | Cách xử lý |
|---|---|---|---|
| `src/app/wounds/[id].tsx` | PR-P2-2, P2-3 | B05, N05 | Chỉ làm S-11 (B05) sau khi PR-P2-2 và PR-P2-3 merge |
| `src/app/patient/index.tsx` | PR-P2-1, P2-4 | N02 | Không đề xuất thay đổi riêng; P2 xử lý |
| `src/app/schedule.tsx` | PR-P2-5 | N03 | Lối vào N06 (S-12) làm sau PR-P2-5 |
| `src/app/patient/history.tsx` | PR-P2-3, P2-7 | N04 | Không đề xuất thay đổi riêng |
| `src/app/report.tsx` | PR-P2-6 | N08 | P2-06a đã gồm `useDiscardGuard`; không làm trùng |
| `src/app/plan/[patientId].tsx` | P2-05a (nhánh bệnh nhân) | B06, N06 | S-10 chỉ sửa nhánh bác sĩ; vẫn cùng tệp nên làm sau PR P2 chứa P2-05a, hoặc rebase |
| `src/components/AccountScreen.tsx` | PR-P2-7 | N09 | Không đề xuất thay đổi |
| `src/components/ui.tsx` | Không thấy trong backlog P2 | Mọi màn | S-01 thêm thành phần mới, không đổi chữ ký cũ |

## Tài liệu tham khảo

1. Fessenden, T. (2018). *Scrolling and Attention*. Nielsen Norman Group. https://www.nngroup.com/articles/scrolling-and-attention/
2. Nielsen, J. (2006). *Progressive Disclosure*. Nielsen Norman Group. https://www.nngroup.com/articles/progressive-disclosure/
3. Mã nguồn `mducnguyen610/PlasmaProApp`, `master` `13b68bf`: `src/components/ui.tsx`, `src/app/**`.
4. Báo cáo Đợt 7 và Đợt 13: `/mnt/project-files/datn/ux-audit-dot-7/`; P0: `/mnt/project-files/datn/p0-clinical-workflow/giai-doan-b/` (TP-DV-08a); P2: `/mnt/project-files/datn/p2-patient-experience/`.
