# Plasma Pro: đề xuất kiến trúc tương tác và điều hướng theo tác vụ

Ngày: 13/11/2026. Trạng thái: đề xuất, chờ duyệt. Căn cứ số đo: `PLASMA_PRO_TASK_BASED_UI_AUDIT.md`.

## 1. Nguyên tắc

1. Mỗi chức năng mở ra một màn hoặc một chế độ chỉ chứa thứ cần để hoàn tất chức năng đó, có một nút chính.
2. Màn tóm tắt (B01, B04, B05, N02) trả lời "đang thế nào, cần làm gì" và có lối vào rõ cho từng tác vụ; không chứa biểu mẫu dài.
3. Không bỏ thông tin lâm sàng cần thiết để giảm chiều cao. Thông tin an toàn (kết nối USB/UART, trạng thái phiên, nút dừng, cảnh báo đổi bệnh nhân, khối "Sẽ lưu") luôn hiện.
4. Không đổi logic: chỉ đổi vị trí, nhóm, cách mở. Mọi hàm store, phép tính, giao thức giữ nguyên lời gọi.

## 2. Ba mẫu tương tác

### A. Màn tác vụ toàn màn

Dùng cho: đánh giá vết thương (B07), nhập hoặc sửa diện tích (B11), chụp ảnh (B10), xem lại ảnh (B10 bước 2, B11), lập đợt điều trị (B06), nạp liệu trình và theo dõi phiên (T01, T02), báo triệu chứng (N08), thêm bệnh nhân (B03).

Cấu trúc bắt buộc:

```
┌───────────────────────────────┐
│ ←  Tiêu đề tác vụ             │  Header back: tên động từ + đối tượng
├───────────────────────────────┤
│ Bệnh nhân · Vết thương        │  ClinicalContext (bắt buộc khi tác vụ gắn vết)
│ [Thanh bước nếu có bước]      │  StepRow
│                               │
│  Nội dung chỉ của tác vụ      │  vùng cuộn
│  Thông tin phụ: mục thu gọn   │
│                               │
├───────────────────────────────┤
│ [Phụ]          [ Nút chính ]  │  Vùng nút cố định (mới: Screen footer)
└───────────────────────────────┘
```

Quy tắc:

- Một nút chính ở vùng cố định. Nút phụ (Hủy, Quay lại bước, Chụp lại) đặt cạnh, kiểu `secondary` hoặc `ghost`.
- Nút chính bị tắt thì vẫn hiện, kèm lý do (thuộc tính `reason` của `Button` đang có).
- Back trên thanh tiêu đề và nút Back hệ thống: nếu có dữ liệu chưa lưu thì `useDiscardGuard` hỏi "Bỏ dữ liệu chưa lưu?"; trong tác vụ nhiều bước, Back hệ thống vẫn rời tác vụ (có hỏi), còn "Quay lại" ở vùng nút cố định lùi một bước và giữ dữ liệu.
- Dữ liệu giữ khi lùi bước: mọi giá trị nằm trong state của màn tác vụ (như B06, B07 hiện nay), không nằm trong từng bước con, nên chuyển bước không mất dữ liệu.
- Sau khi lưu xong: thông báo hoàn tất (hiện dùng `notify`) và quay về màn gọi; với hàng đợi B11 giữ nút "Ảnh chưa đo tiếp theo".

### B. Bottom sheet

Dùng cho: giải thích ngắn (cảnh báo giảm chậm ở B05), danh sách ngắn có liên kết (ảnh yêu cầu chụp lại ở B05), chọn lựa đơn giản khi số lựa chọn quá 4, bộ lọc khi danh sách cần nhiều tiêu chí.

Không dùng cho: biểu mẫu lâm sàng, nhập số đo, xác nhận liều, luồng thiết bị.

Quy tắc, theo hướng dẫn của Nielsen Norman Group về bottom sheet [1]:

- Có nút Đóng nhìn thấy được, không chỉ dựa vào vuốt xuống.
- Nút Back hệ thống đóng sheet trước khi rời màn.
- Không chồng sheet lên sheet, không mở hộp thoại xác nhận khi sheet đang mở (đóng sheet rồi mới hỏi).
- Không thay luồng chuyển màn bằng sheet.

Cách làm kỹ thuật đề xuất: thành phần `Sheet` riêng dựng trên `Modal` của React Native (dự án đã dùng `Modal` ở `images/[id].tsx:454`), vì `presentation: 'formSheet'` của Expo Router được mô tả cho iOS và Android, còn trên web tài liệu chỉ nói modal là một route riêng và phải tự xử lý đóng [2]. Ứng dụng đang kiểm thử giao diện chủ yếu trên bản web, nên một thành phần chạy giống nhau trên cả ba nền tảng ít rủi ro hơn. Đây là suy luận, độ tin cậy trung bình; chưa thử `formSheet` trên SDK 58 của dự án.

### C. Mục thu gọn

Dùng cho: lịch sử chi tiết, thông tin kỹ thuật, giải thích, metadata tùy chọn, lần đánh giá trước. Thành phần: `Disclosure` có dòng tóm tắt.

Quy tắc:

- Dòng tóm tắt phải nói đủ để quyết định có cần mở hay không (ví dụ "19 buổi, gần nhất 15:00 11/11/2026").
- Không thu gọn: cảnh báo lâm sàng, mục bắt buộc còn thiếu, điều khiển an toàn, trạng thái thiết bị.
- Tối đa hai mức lồng (Nielsen [3]); hiện B04 có "Giao máy" lồng trong "Thiết bị và tài khoản", giữ nguyên, không lồng thêm.

## 3. Vùng nút cố định và trợ năng

- Thêm thuộc tính tùy chọn `footer` cho `Screen`. Màn không truyền `footer` giữ nguyên hiển thị, nên thay đổi không lan sang màn khác.
- Vùng cố định nằm trên vùng an toàn đáy; với màn có thanh tab (B01, B02, B12, N02, N04, N07, N09) không dùng vùng cố định, vì thanh tab và nút giữa đã chiếm đáy.
- Nội dung cuộn phải chừa đáy bằng chiều cao vùng cố định, để phần tử nhận tiêu điểm không bị che hoàn toàn. WCAG 2.2 tiêu chí 2.4.11 nêu chân trang dính là nguồn che tiêu điểm điển hình và lỗi F110 là chân trang che kín phần tử nhận tiêu điểm [4].
- Bàn phím mở: vùng cố định không được che ô đang nhập (kiểm thử ở `TEST_PLAN`, mục 4).
- Chiều cao vùng cố định tối đa hai nút một hàng (khoảng 76 px gồm lề) để không ăn quá 12% chiều cao màn 640 px.

## 4. Quy tắc điều hướng

| Quy tắc | Cách áp dụng |
|---|---|
| Mẫu nhất quán | Mọi màn tác vụ dùng `Header back`, `ClinicalContext`, vùng nút cố định. Mọi màn tóm tắt dùng thẻ tóm tắt và "lối vào tác vụ" dạng nút hoặc dòng có mũi tên. |
| Tránh lồng sâu | Tối đa 3 mức từ tab: tab, tóm tắt, tác vụ. Ví dụ: Bệnh nhân (tab) → B04 → B05 → B07 là 3 mức sau tab hiện có; không thêm màn trung gian. Màn mới "Lịch sử vết thương" là màn đọc, mở từ B05, không mở tác vụ khác từ đó ngoài mở ảnh B11. |
| Giữ `patient_id`, `wound_id` | Mọi `router.push` sang màn tác vụ truyền đủ `patientId` và `woundId` (và `imageId` khi có), như các lời gọi hiện có ở B04, B05 (`params: { patientId: p.id, woundId: w.id }`). Màn tác vụ đọc ngữ cảnh từ tham số, không từ "bệnh nhân gần nhất". |
| Giữ dữ liệu khi lùi | Lùi bước trong tác vụ không xóa state. Rời tác vụ thì hỏi (`useDiscardGuard`). Không tự lưu nháp (giữ quyết định P0 SV-05: "Không tự lưu"). |
| Cảnh báo trước khi bỏ | Thêm `useDiscardGuard` cho B03. N08 do P2-06a làm. |
| Chặn gửi trùng | Giữ khóa `saving`/`busy` hiện có; nút ở vùng cố định dùng `loading` để tắt trong lúc lưu. |
| Phản hồi hoàn tất và lỗi | Giữ `notify` khi lưu xong như hiện nay; lỗi lưu hiện tại chỗ và giữ dữ liệu đã nhập. Không thêm thông báo tự đóng (toast) vì người bệnh lớn tuổi dễ bỏ lỡ; đây là suy luận, chưa thử. |
| Không chồng nhiều lớp modal | Tối đa một lớp: hoặc sheet, hoặc hộp thoại xác nhận, hoặc `Modal` phóng ảnh. |
| Không tự chuyển T01 sang T02 | QĐ-6 chưa trả lời; chỉ đưa nút "Theo dõi phiên điều trị" vào vùng cố định. |

## 5. Bản đồ điều hướng sau đề xuất

```
Bác sĩ
 Tab Trang chủ (B01) ──► B04 Hồ sơ ──► B05 Vết thương (tóm tắt + 4 lối vào)
 Tab Bệnh nhân (B02) ──┘                │
                                        ├─► B07 Đánh giá (tác vụ, vùng nút cố định)
                                        ├─► B10 Chụp → Kiểm tra → Nhập số đo (tác vụ 3 bước, một màn)
                                        ├─► B11 Ảnh → [Nhập/Sửa diện tích] (chế độ tác vụ trong màn)
                                        ├─► B06 Đợt điều trị (tác vụ 3 bước; "Các phiên bản" thu gọn)
                                        ├─► Lịch sử vết thương (MỚI, chỉ đọc: album, đánh giá cũ)
                                        └─► B08 So sánh
                              B04 ──► B13 Thiết bị ──► T01 ──► T02
 Nút giữa Chụp ảnh ──► B09 ──► B10
 Tab Ảnh (B12) ──► B11

Bệnh nhân
 Tab Trang chủ (N02) ──► T01 Nạp liệu trình ──► T02 Theo dõi phiên
                    ├──► N05 Vết thương (P2)
                    └──► N08 Báo triệu chứng
 Nút giữa Lịch trình (N03) ──► N06 Đợt điều trị (MỚI: lối vào)
 Tab Lịch sử (N04), Tab Thiết bị (N07: nút tác vụ lên đầu) ──► T01, T02, N08
```

## 6. Điều không đổi

- Tên route hiện có giữ nguyên; chỉ thêm một route đọc `/wounds/[id]/history` (nếu QĐ-TB-3 chọn A). Không đổi tham số các route cũ.
- Thanh tab và nút giữa của `RoleTabs` giữ nguyên.
- Phân quyền theo `useCanView`, `NoAccess` giữ nguyên; route mới dùng cùng kiểm tra quyền với B05.

## Tài liệu tham khảo

1. Laubheimer, P. (2023, 11/6). *Bottom Sheets: Definition and UX Guidelines*. Nielsen Norman Group. https://www.nngroup.com/articles/bottom-sheet/
2. Expo (truy cập 13/11/2026). *Modals* (Expo Router). https://docs.expo.dev/router/advanced/modals.md
3. Nielsen, J. (2006). *Progressive Disclosure*. Nielsen Norman Group. https://www.nngroup.com/articles/progressive-disclosure/
4. W3C (2023). *Understanding SC 2.4.11: Focus Not Obscured (Minimum)*, WCAG 2.2. https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured
