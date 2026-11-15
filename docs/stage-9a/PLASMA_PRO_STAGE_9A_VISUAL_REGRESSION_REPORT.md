# Plasma Pro, Stage 9A: báo cáo hồi quy thị giác và chức năng

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
