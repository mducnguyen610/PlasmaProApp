# Plasma Pro: bản đồ tái cấu trúc màn

Ngày: 13/11/2026. Trạng thái: đề xuất, chưa sửa mã. Số đo "trước" lấy từ `PLASMA_PRO_TASK_BASED_UI_AUDIT.md` mục 4 (360×740 nếu không ghi khác). Số "sau" là **ước lượng** từ ảnh toàn trang hiện tại trừ phần chuyển đi, sai số khoảng ±15%; sẽ đo lại bằng `cong-cu/do-cuon.cjs` sau mỗi PR.

Mẫu tương tác: **A** màn tác vụ toàn màn, **B** bottom sheet, **C** mục thu gọn, **F** vùng nút cố định (thuộc mẫu A).

## Tổng hợp

| Mã | Màn | Mẫu | Trước (360) | Sau, ước lượng | Nút chính sau | Chồng tệp P2 |
|---|---|---|---|---|---|---|
| S-01 | Nền: `Screen.footer`, `Sheet` | F, B | | | | Không |
| S-02 | B03 Thêm bệnh nhân | A, F | 742 px, nút ở 781 | Như cũ | Luôn thấy | Không |
| S-03 | B13 Thiết bị và nhật ký | F | 1655 px, nút ở 1628 | Như cũ | Luôn thấy | Không |
| S-04 | N07 Thiết bị của tôi | Sắp lại | 884 px, nút ở cuối | Như cũ | Màn đầu | Không |
| S-05 | T01 Nạp liệu trình | F | Nút nạp ở 861, nút sang T02 ở 957 | Như cũ | Luôn thấy | Không |
| S-06 | T02 Theo dõi phiên | Giữ | 1 màn, Dừng ở 516 | Giữ | Giữ | Không |
| S-07 | B10 Chụp, kiểm tra, nhập số đo | A, F | 1374 px, nút ở 1347 | Bước 2 khoảng 950, bước 3 khoảng 800 | Luôn thấy | Không |
| S-08 | B11 Nhập, sửa diện tích | A (chế độ), F | 2022 px, nút ở 1654 | Khoảng 1350 khi đang nhập | Luôn thấy | Không |
| S-09 | B07 Đánh giá | A, F (+ bước nếu QĐ-TB-1 = B) | 2204 px, nút ở 2243 | A: 2204 nhưng nút luôn thấy; B: mỗi bước 700 đến 1200 | Luôn thấy | Không |
| S-10 | B06 Đợt điều trị | A, F, C | 1836 px, nút ở 1166 | Khoảng 1250 | Luôn thấy | Cùng tệp với P2-05a |
| S-11 | B05 Vết thương (bác sĩ) | Tóm tắt, F, màn đọc mới | 2675 px, nút ở 1009 | Khoảng 1750 | Luôn thấy | Có: PR-P2-2, P2-3 |
| S-12 | N03 lối vào N06 | Lối vào | N06 không có lối vào | +1 dòng ở N03 | | Có: PR-P2-5 |
| S-13 | Giải thích, danh sách ngắn ở B05 | B | Hộp thoại `notify` | Sheet | | Có (cùng tệp B05) |
| Giữ | B01, B02, B04, B08, B09, B12, N08, N09 | | Dưới 2 màn, nút trong màn đầu | Không đổi | | |
| Để P2 | N02, N04, N05, N08 | | | Do P2 | | Có |

---

## S-01. Nền: vùng nút cố định và bottom sheet

- **Vấn đề hiện tại:** `Screen` (`ui.tsx:97`) chỉ có `ScrollView`; mọi nút hoàn tất nằm trong luồng cuộn. Không có thành phần sheet.
- **Mẫu đề xuất:** thêm `footer?: ReactNode` cho `Screen`, vẽ ngoài `ScrollView`, trên vùng an toàn; `paddingBottom` của nội dung cộng chiều cao footer. Thêm `src/components/Sheet.tsx` dựng trên `Modal` (`transparent`, `onRequestClose` đóng sheet), có tiêu đề, nút Đóng 44×44, tối đa 60% chiều cao màn, nội dung cuộn trong sheet.
- **Lối vào hiện tại / mới:** không áp dụng.
- **Giữ:** mọi màn không truyền `footer` hiển thị như cũ.
- **Chuyển:** không.
- **Giảm cuộn kỳ vọng:** không tự giảm; là điều kiện cho S-02 đến S-11.
- **Rủi ro:** footer che phần tử nhận tiêu điểm (WCAG 2.4.11); bàn phím che footer hoặc footer che ô nhập trên Android; khác biệt `KeyboardAvoidingView` giữa web và máy thật.
- **Tiêu chí chấp nhận:** (1) 41 kiểm thử giao diện cũ đạt không đổi; (2) màn có footer: phần tử cuối nội dung cuộn được tới trên footer ở 4 khổ; (3) Tab qua mọi phần tử trên web, không phần tử nào bị footer che kín; (4) Sheet đóng bằng nút Đóng, chạm nền, Back hệ thống; không mở được sheet thứ hai.

## S-02. B03 Thêm bệnh nhân

- **Vấn đề:** nút "Lưu hồ sơ và tạo tài khoản" ở đáy 781 px trên màn 740 (cần cuộn); không hỏi khi rời màn đã nhập (không có `useDiscardGuard`).
- **Mẫu:** A + F.
- **Lối vào hiện tại:** B02 nút "Thêm mới" ở thanh tiêu đề. **Mới:** giữ nguyên.
- **Giữ:** 4 ô, ghi chú "Mã hồ sơ được cấp tự động", màn "Đã tạo hồ sơ".
- **Chuyển:** nút Lưu sang footer.
- **Giảm cuộn:** chiều cao không đổi; số lần cuộn để lưu từ 1 xuống 0 ở 320 và 360 px.
- **Rủi ro:** thấp. Hỏi khi rời có thể làm phiền nếu chỉ gõ nhầm một ký tự; chấp nhận vì cùng hành vi B06, B07.
- **Tiêu chí:** nút Lưu thấy ở 4 khổ khi mở màn; nhập họ tên rồi Back thì hiện "Bỏ dữ liệu chưa lưu?"; bấm Lưu hai lần nhanh chỉ tạo một hồ sơ (kiểm `busy`).

## S-03. B13 Thiết bị và nhật ký

- **Vấn đề:** hai nút "Kết nối máy và nạp liệu trình", "Theo dõi phiên điều trị" ở 1628 px (2,47 màn).
- **Mẫu:** F (hai nút một hàng hoặc hai hàng ở 320 px).
- **Lối vào hiện tại:** B04 dòng "Thiết bị"; Q03. **Mới:** giữ.
- **Giữ:** toàn bộ `DeviceView` (thông tin máy, tiến độ, 7 ngày, phiên sử dụng). Không thu gọn tiến độ vì là dữ liệu tuân thủ.
- **Chuyển:** hai nút sang footer; chỉ hiện khi vai trò được phép như hiện nay (`devices/[id].tsx:25`).
- **Giảm cuộn:** để bắt đầu nạp: từ khoảng 900 px cuộn xuống 0.
- **Rủi ro:** quản trị (Q06) dùng cùng tệp; điều kiện hiện nút phải giữ nguyên theo vai trò.
- **Tiêu chí:** bác sĩ thấy hai nút ngay khi mở ở 4 khổ; quản trị thấy đúng như trước; nhấn mở đúng T01/T02 với `patientId` của máy.

## S-04. N07 Thiết bị của tôi

- **Vấn đề:** ba nút "Nạp liệu trình vào máy", "Theo dõi phiên điều trị", "Báo sự cố thiết bị" nằm sau `DeviceView` (884 px, có thanh tab).
- **Mẫu:** sắp lại, không dùng footer vì màn có thanh tab.
- **Lối vào:** tab Thiết bị. **Mới:** giữ.
- **Giữ:** thông báo "Không cần nạp liệu trình hôm nay", biến thể primary/secondary theo `treatToday` (V05).
- **Chuyển:** Notice và ba nút lên trên `DeviceView`.
- **Giảm cuộn:** nút chính từ dưới màn đầu (320, 360 px) vào màn đầu.
- **Rủi ro:** bệnh nhân quen vị trí cũ; thấp.
- **Tiêu chí:** ở 320×640 nút nạp nằm trong vùng thấy được trên thanh tab; nội dung `DeviceView` không đổi.

## S-05. T01 Nạp liệu trình

- **Vấn đề:** sau kết nối, "Nạp liệu trình vào máy" ở 861 px (bệnh nhân 360×740); sau khi máy nhận, "Theo dõi phiên điều trị" ở 957 px. Bước kế nằm dưới màn đầu, trong khi phiên chỉ ghi khi T02 mở (UX-03).
- **Mẫu:** F với một nút chính đổi theo trạng thái liên kết: "Kết nối" → "Nạp liệu trình vào máy" → "Theo dõi phiên điều trị". Nút phụ khi lỗi ("Gửi lại", "Kết nối lại", "Báo sự cố cho bác sĩ") giữ trong nội dung, cạnh thông báo lỗi.
- **Lối vào hiện tại:** N02, N07, B13. **Mới:** giữ.
- **Giữ:** `UsbLinkStatus` ở đầu màn; thẻ thông tin máy; tóm tắt liệu trình sẽ nạp (mức năng lượng, chế độ, thời gian, đợt); các chặn gửi hiện có (chưa giao máy, chưa có `INF`); câu hướng dẫn mở T02.
- **Chuyển:** chỉ vị trí nút chính.
- **Giảm cuộn:** từ 1 đến 2 lần cuộn xuống 0 cho cả luồng.
- **Rủi ro:** cao nếu làm sai, vì đụng màn thiết bị. Không đổi điều kiện bật/tắt nút, không đổi hàm gọi (`link.connect`, hàm nạp, `router.push('/session-monitor', …)`). Không tự chuyển sang T02 (QĐ-6 chưa trả lời).
- **Tiêu chí:** (1) ở 3 khổ điện thoại, mỗi trạng thái (chưa kết nối, đã kết nối, đang gửi, máy đã nhận, lỗi) nút đúng thấy ngay; (2) kịch bản P0 TP-DV-03, 06a, 08a đạt như trước; (3) nút nạp bị tắt đúng các trường hợp cũ, có lý do.

```
TRƯỚC (bệnh nhân, 360×740, đã kết nối)        SAU
┌──────────────────────────┐                ┌──────────────────────────┐
│← Nạp liệu trình          │                │← Nạp liệu trình          │
│ Đã kết nối · Cáp USB     │                │ Đã kết nối · Cáp USB     │
│ Thông tin máy (4 dòng)   │                │ Thông tin máy (4 dòng)   │
│ Đợt điều trị             │                │ Đợt điều trị             │
│  Vết, mức, chế độ, t/g   │                │  Vết, mức, chế độ, t/g   │
│ ...                      │                │ ...                      │
├ nếp gấp 740 ─────────────┤                ├──────────────────────────┤
│ [Nạp liệu trình vào máy] │ 861            │ [Nạp liệu trình vào máy] │ cố định
└──────────────────────────┘                └──────────────────────────┘
```

## S-06. T02 Theo dõi phiên điều trị

- **Vấn đề:** không có. Một màn ở mọi khổ; "Dừng điều trị" đáy 516 px (360×740), trạng thái kết nối và đồng hồ ở trên.
- **Mẫu:** giữ nguyên. Không chuyển nút Dừng vào footer, vì đổi vị trí nút an toàn không đem lại lợi ích đo được.
- **Tiêu chí:** sau mọi PR, TP-DV-08a vẫn đạt; trạng thái kết nối và đồng hồ vẫn ở màn đầu.

## S-07. B10 Chụp, kiểm tra ảnh, nhập số đo

- **Vấn đề:** bước 2 "Kiểm tra ảnh" và bước 3 "Nhập số đo" cùng một trang (1374 px), "Lưu ảnh" ở 1347 px. Camera ở bước 1 nằm trong khung trang có tiêu đề, thanh ngữ cảnh, nhiều nút phụ.
- **Mẫu:** A, ba bước trong cùng một màn (state giữ nguyên khi lùi), F.
  - Bước 1 Chụp: khung camera lớn nhất có thể dưới `ClinicalContext` thu gọn một dòng; footer: "Chụp ảnh" (chính), "Chọn ảnh có sẵn" (phụ). "Dùng camera AR/thường", "Vẫn chụp (bỏ qua kiểm tra)" giữ trong nội dung.
  - Bước 2 Kiểm tra ảnh: ảnh, viền vùng khoanh thử nghiệm, thẻ "Kiểm tra ảnh", ô "Đã xem ảnh"; footer: "Tiếp: nhập số đo" (chính, luôn bật như hiện nay: lưu không phụ thuộc ô "Đã xem ảnh"), "Chụp lại" (phụ).
  - Bước 3 Nhập số đo: ảnh thu nhỏ, ô diện tích, phương pháp; footer: "Lưu ảnh và số đo" hoặc "Lưu ảnh (chưa có số đo)" (chính), "Quay lại" (phụ).
- **Lối vào hiện tại:** B05 nút chính, B09, nút giữa tab bác sĩ. **Mới:** giữ.
- **Giữ:** QĐ-1 (ô diện tích trống, không điền số AR), QĐ-P0-1 B (không chọn sẵn phương pháp AR), câu "Gợi ý chất lượng đang thử nghiệm…", `useDiscardGuard(photo !== null)`.
- **Chuyển:** khối nhập số đo sang bước 3.
- **Giảm cuộn:** bước 2 khoảng 950 px, bước 3 khoảng 800 px ở 360 px; nút chính luôn thấy.
- **Rủi ro:** thêm một chạm ("Tiếp") so với hiện nay; nếu bác sĩ đo nhanh có thể thấy chậm. Ô "Đã xem ảnh" hiện được ghi vào `visualReview` khi lưu (`guided-capture.tsx:243`) và không chặn lưu; nếu bắt tích ô mới cho "Tiếp" thì mọi ảnh sẽ có `visualReview` đúng, tức đổi dữ liệu. Vì vậy không đặt điều kiện mới.
- **Tiêu chí:** (1) Back hệ thống ở bước 2, 3 hỏi bỏ ảnh; "Quay lại" ở bước 3 về bước 2 giữ ảnh và số đã gõ; (2) không có giá trị nào điền sẵn từ AR; (3) kịch bản `kiem-thu-p1-05-06.cjs`, `kiem-thu-p0.cjs` phần B10 đạt.

## S-08. B11 Nhập hoặc sửa diện tích

- **Vấn đề:** ảnh chưa đo 2022 px, "Lưu diện tích" ở 1654 px. Khi đang nhập, trang vẫn hiện liên kết hàng đợi, "Mở VT01", "So sánh", 5 mục thu gọn.
- **Mẫu:** A dạng chế độ trong màn (QĐ-TB-2 = A khuyến nghị): bấm "Nhập diện tích bác sĩ đã đo" hoặc "Sửa số đo" chuyển màn sang chế độ đo: ảnh (giữ nút Phóng to), thẻ diện tích, gợi ý AI (chỉ đọc), phương pháp, xem trước tên; ẩn liên kết điều hướng và các mục phụ; footer "Hủy" và "Lưu diện tích".
- **Lối vào hiện tại:** B05 album, B12, hàng đợi B11, liên kết "Nhập số đo cho IMG…" ở B05. **Mới:** giữ; thêm lối vào từ S-11 "Nhập số đo".
- **Giữ:** `ClinicalContext` kèm `patientChanged`, nút "Ảnh chưa đo tiếp theo" sau khi lưu, lần đo trước của vết, `useDiscardGuard(dirty)`, khóa `saving`.
- **Chuyển:** ẩn tạm (không xóa) điều hướng phụ và 5 mục thu gọn khi đang nhập.
- **Giảm cuộn:** khoảng 1350 px khi đang nhập (360 px); nút Lưu luôn thấy.
- **Rủi ro:** người dùng tìm "Chia sẻ", "Yêu cầu chụp lại" khi đang nhập: phải Hủy trước. Back hệ thống khi đang nhập: rời màn (có hỏi), không chỉ thoát chế độ; cần ghi rõ để tránh hiểu nhầm (xem QĐ-TB-2).
- **Tiêu chí:** (1) vào chế độ đo, footer thấy ở 4 khổ; (2) Hủy giữ số cũ, không lưu; (3) lưu xong quay về chế độ xem, hiện "Ảnh chưa đo tiếp theo"; (4) kịch bản Đợt 12, P1-05-06 đạt.

```
TRƯỚC (IMG0004, 360)                 SAU, chế độ đo
┌───────────────────────┐            ┌───────────────────────┐
│← Ảnh IMG0004          │            │← Nhập diện tích       │
│ Ngữ cảnh BN · VT      │            │ Ngữ cảnh BN · VT      │
│ [Ảnh]                 │            │ [Ảnh]   Phóng to      │
│ ← Ảnh trước · Mở VT01 │            │ Diện tích bác sĩ đo   │
│ So sánh               │            │ [______] cm² | mm²    │
│ Diện tích             │            │ Lần đo trước: 8,4 cm² │
│  Nhập diện tích ...   │            │ Gợi ý AI (chỉ đọc)    │
│  [ô] [đơn vị]         │            │ Cách đo: chip         │
│  Gợi ý AI             │            │ Xem trước tên         │
│  Cách đo, phương pháp │            ├───────────────────────┤
│  [Hủy] [Lưu] 1654     │            │ [Hủy]  [Lưu diện tích]│ cố định
│ 5 mục thu gọn         │            └───────────────────────┘
└───────────────────────┘
```

## S-09. B07 Đánh giá tình trạng

- **Vấn đề:** 2204 px, nút Lưu ở 2243 px; nhóm 1 mở sẵn dài khoảng 1050 px.
- **Mẫu:**
  - Phương án A (khuyến nghị): giữ 3 nhóm thu gọn, mỗi lúc mở một nhóm (hành vi hiện có); thêm footer: nút Lưu (nhãn giữ theo công tắc công bố) và dòng "Còn n mục bắt buộc" bấm được để mở nhóm thiếu. Khối "Sẽ lưu" giữ ở cuối nội dung.
  - Phương án B: 4 bước "Phân loại", "Mức độ", "Diễn biến", "Xem lại và lưu" bằng `StepRow`; khối "Sẽ lưu" là bước 4; footer "Quay lại"/"Tiếp" hoặc "Lưu".
- **Lối vào hiện tại:** B05 "Ghi đánh giá", "+ Ghi đánh giá"; B11 "Ghi đánh giá với ảnh này" (kèm `imageId`). **Mới:** giữ.
- **Giữ:** ảnh tham chiếu và diện tích, cảnh báo ảnh không thuộc vết (`imageMismatch`), "Lần đánh giá trước" thu gọn, công tắc công bố và câu "bệnh nhân sẽ thấy" (QĐ-2 giữ mặc định), màn "đánh dấu báo cáo đã xử lý" sau lưu (QĐ-5 giữ, không tự đóng), cuộn tới câu thiếu khi bấm Lưu.
- **Chuyển:** nút Lưu sang footer.
- **Giảm cuộn:** A: để lưu từ khoảng 1500 px cuộn xuống 0; chiều cao không đổi. B: mỗi bước khoảng 700 đến 1200 px.
- **Rủi ro:** A: người dùng bấm Lưu khi chưa xem khối "Sẽ lưu" (khối ở cuối). Giảm bằng cách: thiếu mục bắt buộc thì Lưu vẫn cuộn tới mục thiếu như hiện nay. B: thêm chạm, khó sửa chéo nhóm (nhược điểm của trình hướng dẫn theo Nielsen [1]).
- **Tiêu chí:** kịch bản Đợt 10, P1-03 đạt; footer không che câu hỏi đang nhận tiêu điểm; bấm Lưu khi thiếu thì cuộn tới câu thiếu và mở nhóm.

## S-10. B06 Đợt điều trị (bác sĩ)

- **Vấn đề:** bước Lịch 1836 px, "Tiếp" ở 1166 px; "Các phiên bản" khoảng 650 px luôn hiện bên dưới.
- **Mẫu:** A + F + C. Footer: "Quay lại" (từ bước 2), "Tiếp" hoặc "Lưu phiên bản n cho VTxx". "Các phiên bản" thành `Disclosure` có tóm tắt "Phiên bản 2 đang áp dụng, sửa 28/10/2026 bởi …".
- **Lối vào:** B01 (bản nháp), B04, B05. **Mới:** giữ.
- **Giữ:** ba bước, xác nhận liều (UX-02, reset khi đổi liều), bảng so sánh trước/sau ở bước Xác nhận, `useDiscardGuard`, khóa `saving`, "Công cụ gợi ý thời gian" thu gọn. Nhánh bệnh nhân (N06) không đổi.
- **Chuyển:** lịch sử phiên bản vào mục thu gọn.
- **Giảm cuộn:** khoảng 1250 px ở bước Lịch; nút bước luôn thấy.
- **Rủi ro:** bác sĩ cần đối chiếu phiên bản cũ khi lập mới; bước Xác nhận đã có cột "trước" nên không mất thông tin. Cùng tệp với P2-05a (nhánh bệnh nhân): xung đột merge.
- **Tiêu chí:** kịch bản Đợt 8 (UX-02), Đợt 10, P0 (lưu, ghi đè) đạt; footer không che ô ngày khi bàn phím mở.

## S-11. B05 Thông tin vết thương (bác sĩ)

- **Vấn đề:** 2675 px (3,99 màn), 4 nơi đặt nút tác vụ; album và đánh giá cũ chiếm khoảng 900 px.
- **Mẫu:** màn tóm tắt + F + màn đọc mới "Lịch sử vết thương".
  - Giữ thẻ tổng quan và "Hiện trạng" như hiện nay (P1-02b), biểu đồ (sẽ thành biểu đồ đường của P2, QĐ-P2-5), thẻ đợt điều trị thu gọn, đóng vết.
  - Đánh giá gần nhất: giữ 3 dòng và "Xem đầy đủ"; "Xem đánh giá cũ" và album chuyển sang "Lịch sử vết thương" (`/wounds/[id]/history`, dùng chung bố cục với mục "Lịch sử vết thương" của P2-07a nếu có).
  - Footer: "Chụp ảnh có hướng dẫn" (chính), "Ghi đánh giá" (phụ). "Đợt điều trị", "Nhập số đo (n ảnh chưa đo)", "So sánh", "Lịch sử vết thương" là một hàng lối vào dạng dòng có mũi tên ngay dưới "Hiện trạng".
- **Lối vào hiện tại:** B04 dòng vết; B01. **Mới:** giữ.
- **Giữ:** mọi thông tin mục 5.5 của Audit; cảnh báo "ảnh mới hơn chưa đo"; chip "chưa tới 50%"; đóng vết (`ClosureActions`).
- **Chuyển:** album, đánh giá cũ sang màn đọc; giải thích chip "chưa tới 50%" và danh sách chụp lại sang Sheet (S-13).
- **Giảm cuộn:** khoảng 1750 px; nút chính luôn thấy.
- **Rủi ro:** cao về xung đột: P2-02d sửa biểu đồ cùng tệp, P2-03a nối ảnh với điểm biểu đồ (cần album ở gần biểu đồ). Nếu album rời B05 thì P2-03a phải đặt ở màn lịch sử hoặc giữ dải ảnh ngắn ở B05. Cần QĐ-TB-3.
- **Tiêu chí:** kịch bản P1-02, P0 (B05), Đợt 11, 12 đạt; mọi `router.push` từ B05 mang `woundId`, `patientId`; màn lịch sử kiểm quyền như B05.

```
TRƯỚC (360, 2675 px)                  SAU (khoảng 1750 px)
┌─────────────────────────┐           ┌─────────────────────────┐
│← Vết thương VT01        │           │← Vết thương VT01        │
│ Ngữ cảnh                │           │ Ngữ cảnh                │
│ Tổng quan + Hiện trạng  │           │ Tổng quan + Hiện trạng  │
│  [Chụp ảnh] 1009        │           │ ▸ Đợt điều trị          │
│  [Ghi đánh giá][Đợt]    │           │ ▸ Nhập số đo (1 ảnh)    │
│ Biểu đồ                 │           │ ▸ So sánh  ▸ Lịch sử    │
│ Đợt điều trị            │           │ Biểu đồ (P2)            │
│ Đánh giá gần nhất       │           │ Đợt điều trị (thu gọn)  │
│ Album 2 ngày            │           │ Đánh giá gần nhất 3 dòng│
│ Xem tất cả              │           ├─────────────────────────┤
└─────────────────────────┘           │ [Ghi đánh giá][Chụp ảnh]│ cố định
                                      └─────────────────────────┘
```

## S-12. N03 lối vào N06

- **Vấn đề:** bệnh nhân không có đường tới N06 (Audit TB-A13); N03 chỉ có liều và "Các giai đoạn".
- **Mẫu:** lối vào dạng dòng "Xem đợt điều trị" trong thẻ đợt ở N03, mở `/plan/[patientId]` với `woundId`.
- **Giữ:** mọi nội dung N03.
- **Giảm cuộn:** không; giảm "không tìm thấy".
- **Rủi ro:** P2-04a sửa N03, P2-05a sửa nhánh bệnh nhân của N06: làm sau PR-P2-5, hoặc gộp vào PR P2 nếu người dùng muốn.
- **Tiêu chí:** bệnh nhân mở được N06 từ N03 và Back về N03; N06 chỉ hiện đợt đã xác nhận như hiện nay.

## S-13. Sheet cho giải thích và danh sách ngắn ở B05

- **Vấn đề:** `notify()` cho "Giảm chậm sau mốc xem lại" và "Đã yêu cầu chụp lại n ảnh" (`wounds/[id].tsx:90, 126`): hộp thoại không cho chạm vào từng ảnh.
- **Mẫu:** B.
- **Giữ:** nguyên văn câu giải thích và trích dẫn Sheehan 2003.
- **Chuyển:** từ hộp thoại sang sheet; danh sách chụp lại có dòng mở B11.
- **Rủi ro:** thấp; cùng tệp B05 nên làm cùng S-11.
- **Tiêu chí:** sheet đóng bằng nút, nền, Back; từ dòng ảnh mở đúng B11 và sheet đã đóng.

## Màn giữ nguyên và lý do

| Màn | Lý do | Kiểm lại |
|---|---|---|
| B01 | 1,65 màn ở 360; đã lọc theo việc cần làm (P1-01) | Đo lại sau S-01 |
| B02 | 1,86 màn; tìm kiếm và "Thêm mới" ở đầu | |
| B04 | 1,63 màn; P1-02a đã sắp theo việc lâm sàng | |
| B08 | 1,16 màn | |
| B09 | 1 màn, nút chính trong màn đầu | |
| B12 | 1,36 màn | |
| N08 | 1,02 màn; P2-06a làm phần còn lại | |
| N09 | 1,15 màn | |
| N02, N04, N05 | Thuộc P2; đề xuất nguyên tắc (mục 1 của NAVIGATION_PROPOSAL) để P2 dùng | |

## Tài liệu tham khảo

1. Nielsen, J. (2006). *Progressive Disclosure*. Nielsen Norman Group. https://www.nngroup.com/articles/progressive-disclosure/
2. W3C (2023). *Understanding SC 2.4.11: Focus Not Obscured (Minimum)*. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured
