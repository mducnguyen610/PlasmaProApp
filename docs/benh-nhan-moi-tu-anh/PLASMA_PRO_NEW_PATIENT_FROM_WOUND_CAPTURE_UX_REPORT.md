# Plasma Pro: tạo bệnh nhân mới từ ảnh vết thương vừa chụp. Báo cáo trải nghiệm (UX)

Ngày: 16/11/2026. Ảnh chụp màn (bản web, 390 × 844 trừ khi ghi khác) ở `anh/` cạnh báo cáo này.

## 1. Luồng

```
B09 ─ [Chọn bệnh nhân hiện có] ─ (luồng cũ, không đổi) ─ B10 ─ lưu ─ B11
  └─ [Chụp cho bệnh nhân mới] ─ B10 (moi=1): Chụp → Kiểm tra ảnh → Nhập số đo
        └─ "Tiếp: tạo hồ sơ bệnh nhân" → ảnh vào trạng thái chờ → B09b Tạo hồ sơ từ ảnh
              ├─ "Tạo hồ sơ và gắn ảnh" → (một lần ghi, kiểm liên kết, xóa ảnh chờ) → B05 của VT01
              │     └─ ghi số đo lỗi → B11 của ảnh, số đo điền sẵn
              ├─ trùng số điện thoại → thẻ "Có thể trùng hồ sơ BNxxx" → xem / gắn vào hồ sơ đó (sau xác nhận) / sửa số
              ├─ Quay lại (tiêu đề) hoặc "Xem lại ảnh ở bước trước" → B10 bước 3, ảnh và số đo còn
              ├─ "Để sau, giữ ảnh chờ ở màn Chụp ảnh" → B09, thẻ ảnh chờ
              └─ "Hủy" → hỏi → bỏ ảnh, về B09
```

## 2. Theo từng yêu cầu ở mục 3

| Yêu cầu | Cách làm | Ảnh |
|---|---|---|
| Phân biệt "Chọn bệnh nhân hiện có" và "Chụp cho bệnh nhân mới" | Thanh hai lựa chọn (Segmented của hệ thống) ở đầu B09; mặc định "Chọn bệnh nhân hiện có". Lối mới có tiêu đề phụ "Chụp trước, tạo hồ sơ sau", ba bước đánh số và nút chân màn cùng tên. | `b09-hien-co-390`, `b09-benh-nhan-moi-390` |
| Giữ nguyên luồng chụp cho hồ sơ có sẵn | Nội dung lối mặc định như PR 64 (bước 1, 2, 3, nút "Chụp có hướng dẫn"); B10 khi có `woundId` không đổi hành vi. Thêm vào lối này chỉ có thanh hai lựa chọn, thẻ ảnh chờ (khi có) và nút đóng, mở bộ lọc. | `b09-hien-co-390` |
| Hiện ảnh khi tạo hồ sơ | Thẻ đầu B09b: ảnh thu nhỏ, chip "Ảnh chờ tạo hồ sơ", thời điểm chụp (hoặc "Ảnh thư viện" và ngày), số đo đang chờ. | `b09b-bieu-mau-390` |
| Quay lại, Hủy rõ ràng | Quay lại ở tiêu đề và liên kết "Xem lại ảnh ở bước trước" về B10; nút "Hủy" ở chân màn (hỏi trước khi bỏ ảnh); liên kết "Để sau" giữ ảnh chờ. | `b09b-bieu-mau-390` |
| Quay lại vẫn giữ ảnh | B10 vẫn ở bước "Nhập số đo" với ảnh, số đo; chip đổi thành "Ảnh chờ tạo hồ sơ"; rời B10 không hỏi bỏ dữ liệu vì ảnh đã an toàn ở trạng thái chờ. | kịch bản NP-17 đến NP-19 |
| Lỗi tạo hồ sơ vẫn giữ ảnh và thông tin | Câu lỗi ở chân màn kết thúc bằng "Ảnh và thông tin đã nhập vẫn giữ nguyên, có thể bấm lưu lại."; ô nhập không bị xóa. | `b09b-loi-ghi-390` |
| Chống tạo trùng do bấm lặp | Nút có trạng thái đang lưu, khóa bằng ref ở màn và khóa ở store; 5 lần chạm liền chỉ tạo 1 hồ sơ. | NP-26, NP-27 |
| Lỗi có ý nghĩa, có cách khắc phục | Lỗi từng ô (họ tên, năm sinh, vị trí); lỗi ghi; trùng hồ sơ có thẻ riêng với hành động; ghi số đo lỗi mở B11 của ảnh với câu "đã lưu nhưng số đo chưa lưu" và số đo điền sẵn. | `b09b-trung-ho-so-390`, `b09b-loi-so-do-390` |
| Không báo thành công sớm | Chỉ chuyển sang B05 sau khi lần ghi trả về thành công và liên kết ảnh đã được kiểm; ghi số đo lỗi thì B11 nói rõ số đo chưa lưu. | `b05-sau-tao-390` |
| Hệ thống Clinical Precision, bố cục co giãn | Chỉ dùng thành phần có sẵn (Card, Field, Segmented, Chip, Notice, Button, TextLink, InfoRow); nút chính ở chân màn; không tràn ngang ở 320, 360, 390, 768. | `b09-*`, `b09b-*` theo bề rộng |

## 3. Quyết định trải nghiệm cần người dùng xem

- **UX-1. Đã chốt (16/11/2026): mở thẳng B05** theo đặc tả gốc (phương án 2). Màn "Đã tạo hồ sơ" đã bỏ. Mã kích hoạt không hiện ở luồng này; bác sĩ cấp mã khi cần ở B04 ("Cấp lại mã kích hoạt", mã cũ hết hiệu lực). Luồng mã kích hoạt của B03, B04 không đổi.
- **UX-2. Vị trí vết thương bắt buộc ở B09b** (ở B03 không bắt buộc). Ảnh phải thuộc một vết, và ứng dụng không được tự đặt thông tin vết.
- **UX-3. Số đo nhập ở B10 được lưu sau khi tạo hồ sơ** bằng đúng hàm ghi số đo của B10. Biểu mẫu ghi "(lưu sau khi tạo hồ sơ)" cạnh số đo để không hiểu nhầm là đã lưu.
- **UX-4. Một ảnh chờ cho mỗi bác sĩ.** Khi đang có ảnh chờ, nút "Chụp cho bệnh nhân mới" khóa và nêu lý do; bác sĩ tiếp tục hoặc bỏ ảnh đó trước. Cách này tránh âm thầm thay ảnh chờ.
- **UX-5. Trùng hồ sơ của bác sĩ khác:** chỉ hiện mã hồ sơ (như câu báo B03 hiện có), không hiện họ tên, không cho gắn ảnh; hướng dẫn nhờ quản trị phân công như B03.

## 4. Bộ lọc thu gọn ở B09 (mục 13)

- Nút chữ có biểu tượng: "Đóng bộ lọc" (mũi tên lên) khi mở, "Mở bộ lọc" (biểu tượng bộ lọc) khi đóng; cao 44; `aria-expanded` và nhãn đọc màn hình có số bộ lọc đang dùng.
- Khi đóng mà đang lọc: chip "1 đang dùng", dòng "Đang lọc: tên hoặc mã có "…"" và số hồ sơ khớp trên tổng (ví dụ 1/3).
- Mặc định mở: ô tìm kiếm là cách chọn chính khi có nhiều hồ sơ và chỉ chiếm một dòng, nên mặc định đóng sẽ thêm một chạm cho thao tác thường gặp. Trạng thái giữ trong phiên màn, không ghi bộ nhớ máy (không có kho tùy chọn giao diện để dùng lại).
- Chuyển động: `LinearTransition` 180 ms cho khối, `FadeIn` 150 ms, `FadeOut` 120 ms cho ô tìm (react-native-reanimated có sẵn trong dự án). Lần đầu dùng chuyển động trong màn của ứng dụng; trên web chuyển động gần như không thấy.
- Chỉ ẩn, hiện ô; giá trị lọc, kết quả, bệnh nhân đã chọn giữ nguyên; logic lọc không đổi.
- Không áp dụng ở B09: nhiều bộ lọc cùng lúc, phân trang, sắp xếp (B09 không có).

Ảnh: `b09-bo-loc-dong-390`, `b09-320`, `b09-360`, `b09-390`, `b09-768`, `b09-moi-*`, `b09b-*`.

## 5. Hạn chế đã biết

- Thanh hai lựa chọn dùng `Segmented` có sẵn; trên web thành phần này không xuất `aria-selected` (thiếu sót có từ trước, ảnh hưởng mọi màn dùng Segmented). Không sửa ở đây để không đổi thành phần dùng chung.
- Thời gian thao tác, mức dễ hiểu với bác sĩ: chưa thử với bác sĩ.
