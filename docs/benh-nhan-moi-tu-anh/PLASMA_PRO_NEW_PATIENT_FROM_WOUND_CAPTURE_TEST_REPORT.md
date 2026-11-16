# Plasma Pro: tạo bệnh nhân mới từ ảnh vết thương vừa chụp. Báo cáo kiểm thử

Ngày: 16/11/2026. Môi trường: bản dựng web tĩnh (`npx expo export -p web`), Chromium qua Playwright, dữ liệu mô phỏng. Bản "trước" là PR 64 (`64fe6b1`); bản "sau" là nhánh `feat/benh-nhan-moi-tu-anh`. Không thay cho thử trên máy thật hay thử với bác sĩ.

## 1. Tổng hợp

| Hạng mục (mục 10 của yêu cầu) | Kết quả |
|---|---|
| TypeScript (`npx tsc --noEmit`) | Sạch |
| Lint (`npx expo lint`) | Sạch |
| `npm test` (52 tệp, thêm `pendingCapture.test.ts`, ca 9 của `persistence.test.ts`, `architecture.test.cjs` 171 tệp) | Đạt |
| Kịch bản mới `scripts/kiem-thu-benh-nhan-moi-tu-anh.cjs` | **67/67 đạt** (bản phương án 2) |
| Hồi quy 25 kịch bản cũ, trước và sau | **Sau giống hệt trước**, không ca nào lỗi sau khi sửa môi trường dựng dot-9 và kịch bản tb-8 (mục 4) |

## 2. Kịch bản mới (67 ca)

| Nhóm | Ca | Nội dung |
|---|---|---|
| A. B09 hai lối vào | NP-01 đến NP-04 | Mặc định "Chọn bệnh nhân hiện có", nội dung lối cũ còn đủ; lối mới; B10 ở luồng mới không có thanh bệnh nhân |
| B. Thành công và quan hệ dữ liệu | NP-05 đến NP-16 | Ảnh chờ hiện ở biểu mẫu; ảnh chờ không có id và không nằm trong dữ liệu chính; kiểm biểu mẫu; đúng 1 hồ sơ, 1 tài khoản, 1 vết VT01, 1 ảnh; `wound.patientId`, `image.woundId`, `image.patientId`, tên tệp; siêu dữ liệu chụp giữ nguyên; số đo ghi sau; không tạo đánh giá, đợt, thiết bị; ảnh chờ đã xóa; không lỗi quan hệ; mở thẳng B05 đúng vết, không còn màn trung gian; quay lại B10 về bước 1 |
| C. Quay lại, giữ nháp, mở lại, hủy | NP-17 đến NP-25 | Quay lại B10 giữ ảnh và số đo; biểu mẫu giữ họ tên; "Để sau"; nút luồng mới khóa khi có ảnh chờ; store từ chối ảnh chờ thứ hai; tải lại trang vẫn còn ảnh chờ và họ tên; Hủy hỏi trước, xác nhận thì bỏ ảnh và không tạo gì |
| D. Bấm lặp, lỗi ghi, lỗi một phần, ghi lặp | NP-26 đến NP-34, NP-33b, NP-33c | 5 lần chạm liền; hai lời gọi store chồng nhau; lỗi ghi bộ nhớ máy (QuotaExceeded) không để lại bản ghi, ảnh và họ tên giữ, lưu lại tạo đúng 1; ghi số đo lỗi sau khi tạo hồ sơ: mở B11 của ảnh, báo rõ, điền sẵn; ảnh chờ còn sót sau khi đã ghi không tạo hồ sơ thứ hai; ảnh đã có nhưng liên kết sai thì giữ ảnh chờ, không ghi thêm, sửa xong lưu lại được |
| E. Hồ sơ có thể trùng | NP-35 đến NP-40 | Trùng hồ sơ của mình: hiện mã, họ tên, năm sinh; không tạo; không tự gắn; xác nhận mới gắn đúng vết đã chọn; trùng hồ sơ bác sĩ khác: chỉ mã, không cho gắn; sửa số thì hết cảnh báo |
| F. Phân quyền | NP-41 đến NP-48 | Bác sĩ khác không thấy, không dùng được ảnh chờ, không gắn được vào hồ sơ không phụ trách; bệnh nhân, quản trị: màn "Không có quyền" và store từ chối; bác sĩ một đăng nhập lại vẫn còn ảnh chờ |
| G. Bộ lọc B09 | FL-01 đến FL-10 | Mở, đóng; đóng không đổi kết quả; tóm tắt và số bộ lọc khi đóng; bệnh nhân đã chọn giữ; mở lại còn giá trị; tìm theo mã; không có kết quả; lối bệnh nhân mới vẫn thấy; chuyển lối vào vẫn giữ; `aria-expanded` |
| Co giãn | RS-320, RS-360, RS-390, RS-768 | B09 (mở, đóng bộ lọc, lối mới) và B09b không tràn ngang, nút chính trong khung |

Kết quả từng ca: `ket-qua/ket-qua-benh-nhan-moi-tu-anh.json`. Ảnh: `anh/`.

## 3. Tình huống lỗi và phục hồi (mục 8)

| # | Tình huống | Ca | Kết quả |
|---|---|---|---|
| 1 | Chụp rồi tạo hồ sơ thành công | NP-08 đến NP-14 | Đạt |
| 2 | Tạo hồ sơ lỗi sau khi chụp | NP-07, NP-28 | Đạt |
| 3 | Bác sĩ hủy tạo hồ sơ | NP-24, NP-25 | Đạt |
| 4 | Quay lại rồi trở lại biểu mẫu | NP-17, NP-18 | Đạt |
| 5 | Bấm "Tạo hồ sơ" nhiều lần | NP-26, NP-27 | Đạt |
| 6 | Lỗi mạng hoặc bộ nhớ khi tạo hồ sơ | NP-28 đến NP-30 | Đạt với lỗi bộ nhớ máy; không có mạng để thử (chưa có backend) |
| 7 | Tạo vết xong nhưng gắn ảnh lỗi | NP-28 (cùng một lần ghi), NP-31, NP-32 (số đo) | Vết và ảnh không tách được trong kiến trúc mới; phần tách duy nhất là số đo, đã kiểm |
| 8 | Tải ảnh xong nhưng tạo hồ sơ lỗi | NP-28, NP-29 | Đạt trên web; xóa tệp đã chép trên máy thật chưa thử |
| 9 | Có thể trùng hồ sơ | NP-35 đến NP-40 | Đạt |
| 10 | Thoát giữa chừng rồi mở lại | NP-22, NP-23, NP-33, NP-33b, NP-33c, NP-48 | Đạt (tải lại trang thay cho mở lại ứng dụng) |

## 4. Hồi quy

25 kịch bản cũ chạy trên cả hai bản. Không ca nào đổi kết quả.

| Kịch bản | Trước | Sau |
|---|---|---|
| kiem-thu-9b | 18/0 | 18/0 |
| kiem-thu-9c-bcd | 21/0 | 21/0 |
| kiem-thu-dot-8, dot-10, dot-11, dot-12 | 33, 24, 34, 53 đạt | giống |
| kiem-thu-dot-9 | 13/0 (bản dựng có tiêm AR) | 13/0 |
| kiem-thu-giao-dien | 41/0 | 41/0 |
| kiem-thu-n05 | 20/0 | 20/0 |
| kiem-thu-p0 | 47/0 | 47/0 |
| kiem-thu-p1, p1-01d, p1-02, p1-03, p1-04, p1-05-06 | 16, 3, 15, 12, 10, 20 đạt | giống |
| kiem-thu-p2 | 238/0 | 238/0 |
| kiem-thu-quan-ly-ho-so (tạo, sửa hồ sơ) | 55/0 | 55/0 |
| kiem-thu-tb-2 đến tb-7 (tb-3 là B10) | 22, 20, 31, 14, 21, 30 đạt | giống |
| kiem-thu-tb-8 (kịch bản đã sửa) | 60/0 | 60/0 |

Hai điểm lần đầu báo là lỗi, sau khi điều tra không phải lỗi ứng dụng:
- `kiem-thu-dot-9` (AR ở B10): 4 ca lỗi do môi trường kiểm thử. Bản dựng từ thư mục làm việc phụ không mang dữ liệu AR tiêm vào (`scripts/tiem-ar-kiem-thu.cjs`), nên các ca hiển thị ước lượng AR không có gì để kiểm. Dựng lại đúng cách (tiêm ở thư mục chính, xuất bản web, trả lại mã): 13/13 ở cả hai bản.
- `kiem-thu-tb-8`: kịch bản cũ hơn Stage 9B. Stage 9B (S8-B07) cố ý ẩn nút "Bắt đầu điều trị" của máy giả lập khi chưa có liệu trình, và (S8-B10) đổi nhãn ô ở B11 thành "Diện tích bác sĩ đo (cm²)". Kịch bản đã sửa hai bước này (ca S8-T-01b kiểm nút bị ẩn; ô B11 tìm theo nhãn mới); mã ứng dụng không đổi. Kết quả 60/0 ở cả hai bản.

Bản phương án 2 (mở thẳng B05, kiểm liên kết trước khi xóa ảnh chờ) chạy lại `npm test`, `kiem-thu-quan-ly-ho-so` 55/55, `kiem-thu-tb-3` 20/20, `kiem-thu-p0` 47/0, `kiem-thu-p1-05-06` 20/0, `kiem-thu-dot-12` 53/53, `kiem-thu-giao-dien` 41/41 (đều đạt).

Hồi quy luồng tạo hồ sơ cũ (B03): `kiem-thu-quan-ly-ho-so` 55/55 và `kiem-thu-giao-dien` 41/41 không đổi. Hồi quy chụp cho hồ sơ có sẵn: `kiem-thu-tb-3`, `p0`, `p1-05-06`, `dot-12` không đổi. Giao diện bệnh nhân, quản trị: `tb-5`, `tb-6`, `n05`, `p2` không đổi.

## 5. Chưa kiểm

- Máy thật Android, iOS: chụp bằng camera, chép và xóa tệp ảnh trong thư mục ứng dụng, tệp chiều sâu AR, hộp thoại xác nhận gốc, chuyển động, trình đọc màn hình.
- Lỗi mạng thật, tải ảnh lên máy chủ (chưa có backend).
- Cảnh báo "Ảnh chỉ giữ trong lần mở ứng dụng này" khi ghi ảnh chờ lỗi.
- Thử với bác sĩ (thời gian thao tác, mức dễ hiểu).

## 6. Cách chạy lại

```
npx expo export -p web --output-dir <thư mục>
node <máy chủ tĩnh có SPA fallback> <thư mục> 8720
node scripts/kiem-thu-benh-nhan-moi-tu-anh.cjs http://localhost:8720 <thư mục kết quả>
```
