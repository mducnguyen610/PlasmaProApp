# Plasma Pro, Stage 9A: báo cáo hồi quy thị giác và chức năng

# Vòng 2: 30 màn còn lại

## Ảnh trước/sau

- 36 trạng thái màn ở 390 × 844, trang đầy đủ, và màn đầu ở 320 px (N01 có 5 bước). Trước: master `6f21314` (cổng 8580). Sau: nhánh này (cổng 8590). Công cụ `chup30.cjs`.
- Ảnh ghép trong repo: `anh/con-lai/truoc-sau-con-lai-1-c.jpg`, `-2-b.jpg`, `-3-b.jpg`, `-4-n.jpg`, `-5-q.jpg`. Từng cặp và bộ đầy đủ: `/mnt/project-files/datn/stage-9a/bo-cuc-con-lai/anh/`.
- Màn COMPLETE của vòng 1 (C01, B01 đến B05, B14, B15, N02, N09, Q07, T01, T02) không sửa bố cục; ảnh hồi quy của chúng nằm trong các kịch bản `giao-dien`, `tb-7`, `tb-8`, `p0` dưới đây và bộ đo responsive.

## Kiểm thử chạy trên bản cuối của nhánh

| Kịch bản | Kết quả |
|---|---|
| giao-dien | 41/41 |
| p0 | 47/47 |
| p1, p1-01d, p1-02, p1-03, p1-04, p1-05-06 | 16, 3, 15, 12, 10, 20 (đạt hết) |
| p2 | 238/238 |
| dot-8, dot-10, dot-11, dot-12 | 33, 24, 34, 53 (đạt hết) |
| n05 | 20/20 |
| tb-2, tb-3, tb-4, tb-5, tb-6, tb-7, tb-8 | 22, 20, 31, 14, 21, 30, 34 (đạt hết) |
| quan-ly-ho-so | 55/55 |
| 9b, 9c-bcd | 18, 21 (đạt hết) |
| Tổng | 832 ca, 0 lỗi |

## Lỗi hồi quy tìm thấy trong quá trình và đã sửa

| Mã ca | Hiện tượng | Sửa |
|---|---|---|
| WD-02 | B05a không còn hiện nguyên văn vị trí đang lưu | Khôi phục dòng "Vị trí đang lưu" (`bc1542f`) |
| D10-06h | B06: câu hậu quả trạng thái cách nút Lưu 854 px sau khi nút xuống chân màn | Câu chuyển vào chân màn, ngay trên nút Lưu ở bước 3 (`bc1542f`) |
| TB6-04 | Q01b: "@tên đăng nhập" gộp với vai trò thành một chuỗi | Trả lại dòng "Tên đăng nhập" riêng |
| TB6-12 | Q02: tiêu đề "Bộ ảnh đã gán diện tích" có số đếm cùng hàng làm kịch bản không tìm thấy tiêu đề | Số đếm chuyển xuống chú thích tiêu đề |

---

# Vòng 1 (PR 60, 13 màn và hệ thống chung)

## 1. Ảnh trước/sau

- 49 cặp ảnh ở 390 × 844 (49 trạng thái màn, gồm T01 ba trạng thái, T02 ba trạng thái, B06 ba bước), trước là master `457ee0c`, sau là nhánh này. Không có lỗi JS trên 49 màn sau.
- Ảnh ghép theo nhóm (trong repo): `anh/truoc-sau-1-bac-si.jpg`, `truoc-sau-2-lam-sang.jpg`, `truoc-sau-3-benh-nhan.jpg`, `truoc-sau-4-quan-tri.jpg`, `truoc-sau-5-thiet-bi.jpg`, `truoc-sau-6-chung.jpg`; theo bề rộng: `truoc-sau-B01-320.jpg`, `truoc-sau-N02-768.jpg`, `truoc-sau-B01-1440.jpg`, `truoc-sau-B05-1440.jpg`.
- Bộ đầy đủ (ngoài repo): `/mnt/project-files/datn/stage-9a/anh/truoc/`, `anh/sau/`, `anh/cap/` (49 cặp đặt cạnh nhau), `responsive/truoc/`, `responsive/sau/`.
- Ảnh của B03 và T01 sau lần sửa cuối (mục 3) được chụp lại riêng (`anh/sau/` ghi đè hai tệp).

## 2. Kiểm thử đã chạy

Tất cả chạy trên bản dựng web tĩnh (`npx expo export -p web`), Chromium qua Playwright. Bản "trước" là master `457ee0c`; bản "sau" là bản cuối của nhánh.

| Kiểm | Trước | Sau | Ghi chú |
|---|---|---|---|
| `npx tsc --noEmit` | đạt | đạt | |
| `npm run lint` | đạt | đạt (0 vấn đề) | |
| `npm test` | đạt | đạt | gồm `theme.contrast.test.ts` 34 cặp |
| `scripts/kiem-thu-giao-dien.cjs` | 41/41 | 41/41 | |
| dot-10 | 24/0 | 24/0 | |
| dot-11 (bản PR 58) | 34/0 | 34/0 | |
| dot-12 | 53/0 | 53/0 | |
| dot-8 (bản PR 58) | 33/0 | 33/0 | |
| n05 | 20/0 | 20/0 | |
| p0 (bản PR 58) | 47/0 | 47/0 | |
| p1-01d | 3/0 | 3/0 | |
| p1-02 | 15/0 | 15/0 | |
| p1-03 | 12/0 | 12/0 | |
| p1-04 | 10/0 | 10/0 | |
| p1-05-06 | 20/0 | 20/0 | |
| p1 | 16/0 | 16/0 | |
| p2 | 237/0 | 237/0 | sau khi cập nhật mã màu, xem mục 3 |
| quan-ly-ho-so | 55/0 | 55/0 | |
| tb-2 | 22/0 | 22/0 | sau khi cập nhật mã màu |
| tb-3 | 20/0 | 20/0 | sau khi cập nhật mã màu |
| tb-4 | 31/0 | 31/0 | |
| tb-5 (bản PR 58) | 14/0 | 14/0 | |
| tb-6 | 21/0 | 21/0 | |
| tb-7 | 30/0 | 30/0 | |
| tb-8 (bản PR 58) | 23/2 | 23/2 | Hai lỗi giống hệt nhau ở cả hai bản (S8-W3-04, S8-B01): bản sửa nằm trong PR 58, chưa có trên master, nên không phải hồi quy của Stage 9A |

Số dạng "đạt/lỗi". Kịch bản đánh dấu "bản PR 58" lấy từ nhánh Stage 8 (PR 58, chưa gộp) vì bản trên master cũ hơn; chạy với cùng bản dựng.

## 3. Hồi quy phát hiện và cách xử lý

Lần chạy đầu trên bản sau có 8 kiểm lỗi. Đã xử lý tất cả:

| Kiểm | Nguyên nhân | Xử lý |
|---|---|---|
| S8-W1-01 (tb-8) | B03 thêm ba tiêu đề nhóm, nút "Lưu hồ sơ và tạo tài khoản" bị đẩy xuống y = 838 trong màn cao 844: không thấy nút ở màn đầu. Hồi quy thật về bố cục. | Bỏ hai tiêu đề nhóm phụ và chú thích, gộp vị trí vết thương vào thẻ thông tin; giữ hàng năm sinh và giới. |
| D8-03b (dot-8) | T01 thêm sơ đồ nối máy ở mọi bước, đẩy "Bước tiếp theo" xuống dưới chân màn cố định ở 320 px. Hồi quy thật. | Sơ đồ chỉ hiện ở bước 1 (tác vụ kết nối). |
| TB2-04, TB2-12 (tb-2), TB3-09 (tb-3) | Kịch bản nhận biết lựa chọn đang chọn bằng màu nền `rgb(11, 107, 111)` (`C.primary` cũ). Ý kiểm không đổi: lựa chọn đang chọn dùng `C.primary`. | Cập nhật hằng màu trong kịch bản thành `rgb(31, 103, 163)` (`C.primary` mới) và ghi chú lý do. Hành vi giữ dữ liệu khi lùi bước không đổi; kịch bản chạy lại đạt. |
| P22-09, P22-30, P24-06 (p2) | Kịch bản kiểm dòng thay đổi diện tích dùng "màu nhấn của ứng dụng, không xanh lá" bằng hằng `#0B6B6F`. Mã vẫn dùng `C.primary`, không dùng màu thành công. | Cập nhật hằng thành màu `C.primary` mới, giữ điều kiện "không xanh lá". |

Hạn chế của cách sửa thứ ba và thứ tư: kịch bản vẫn so màu cứng; đổi bảng màu lần sau sẽ phải cập nhật lại. Cách bền hơn là đọc `aria-checked` (bản web chưa xuất thuộc tính này cho `Choices`, ghi chú sẵn trong kịch bản).

## 4. Điều hướng

- Route không khớp: trước hiện trang mặc định của Expo Router (tiếng Anh, có liên kết Sitemap lộ toàn bộ route, tràn ngang ở 320 và 360, lỗi React #418). Sau: `+not-found.tsx` tiếng Việt, nút về trang chủ theo vai trò; `/_sitemap` chuyển về `/`.
- Thanh bên máy tính dùng cùng `navigation.emit('tabPress')` và cùng kiểm vai trò như thanh tab đáy; kịch bản giao-dien, tb-6 (quản trị) chạy đạt ở 390 px. Thanh bên chỉ được kiểm bằng ảnh chụp và bộ đo responsive ở 1024, 1440 px, chưa có kịch bản bấm riêng.

## 5. Chưa kiểm

- Android, iOS thật; trình đọc màn hình gốc; cỡ chữ hệ thống lớn: NOT TESTED.
- Dừng điều trị trên máy thật: BLOCKED (giao thức chưa có lệnh dừng, ghi nhận từ Stage 7).
