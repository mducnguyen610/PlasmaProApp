# Plasma Pro Stage 9C: Báo cáo hồi quy (gói G)

Bản dựng: web tĩnh từ nhánh `refactor/stage-9c-on-dinh` (commit cb86f37), Chromium Playwright, khung 390×844, giờ Asia/Ho_Chi_Minh. Đối chiếu: bản dựng 9B (PR 61, 724439b) chạy cùng bộ kịch bản.

## 1. Cổng chất lượng

| Cổng | Lệnh | Trạng thái | Số kiểm thử | Đạt | Lỗi | Bỏ qua | Giới hạn |
|---|---|---|---|---|---|---|---|
| Kiểu | `npx tsc --noEmit -p .` | Đạt (mã thoát 0) | Không áp dụng | | 0 | | |
| Quy ước mã | `npm run lint` | Đạt (mã thoát 0) | Không áp dụng | | 0 | | |
| Đơn vị | `npm test` | Đạt | 46 tệp (9B: 43) | 46 | 0 | 0 | Chạy Node, không chạy trên điện thoại |
| Hồi quy Stage 8 | `scripts/kiem-thu-*.cjs` (17 kịch bản repo + 5 bản sao từ PR 58) | Giống hệt 9B | 22 kịch bản, 783 kiểm | 781 | 2 | 0 | 2 lỗi tb-8 có sẵn, xem mục 3 |
| Kiểm thử 9B | `scripts/kiem-thu-9b.cjs` | Đạt | 18 | 18 | 0 | 0 | Giả lập thiết bị |
| Toàn vẹn dữ liệu trình duyệt | Kịch bản Playwright + `checkIntegrity` | Đạt | 1 | 1 | 0 | 0 | Một luồng (lưu diện tích B11) |
| Hiệu năng | `scripts/do-hieu-nang-9c.cjs` 5 lần | Đạt (giá trị lưu đúng 5/5) | 5 | 5 | 0 | 0 | Chromium máy chạy kịch bản |

## 2. Chi tiết hồi quy theo kịch bản

| Kịch bản | Kết quả 9C |
|---|---|
| dot-10 | 24 đạt, 0 lỗi |
| dot-11 | 34 đạt, 0 lỗi |
| dot-12 | 53 đạt, 0 lỗi |
| dot-8 | 33 đạt, 0 lỗi |
| giao-dien | 41 đạt, 0 lỗi |
| n05 | 20 đạt, 0 lỗi |
| p0 | 47 đạt, 0 lỗi |
| p1-01d | 3 đạt, 0 lỗi |
| p1-02 | 15 đạt, 0 lỗi |
| p1-03 | 12 đạt, 0 lỗi |
| p1-04 | 10 đạt, 0 lỗi |
| p1-05-06 | 20 đạt, 0 lỗi |
| p1 | 16 đạt, 0 lỗi |
| p2 | 237 đạt, 0 lỗi |
| quan-ly-ho-so | 55 đạt, 0 lỗi |
| tb-2 | 22 đạt, 0 lỗi |
| tb-3 | 20 đạt, 0 lỗi |
| tb-4 | 31 đạt, 0 lỗi |
| tb-5 | 14 đạt, 0 lỗi |
| tb-6 | 21 đạt, 0 lỗi |
| tb-7 | 30 đạt, 0 lỗi |
| tb-8 | 23 đạt, 2 lỗi |

So sánh tệp tổng hợp `tong.txt` của 9B và 9C bằng `diff`: không khác dòng nào.

## 3. Lỗi có sẵn (không do 9C)

| Kiểm | Mô tả | Lý do |
|---|---|---|
| S8-W3-04 | Lịch sử diện tích ảnh thư viện không rõ ngày | Sửa ở PR 58 (S8-B03), chưa vào nền 9B |
| S8-B01 | Chạm đúp "Kết nối" ở T01 gửi thêm liệu trình | Sửa ở PR 58, chưa vào nền 9B |

Cả hai lỗi giống trên master và trên 9B. Kịch bản không bị sửa để qua.

## 4. Không chạy ở đây

- Kịch bản hồi quy hình ảnh Stage 9A (nằm ở nhánh PR 60).
- dot-9 (cần bản dựng tiêm dữ liệu AR riêng).
- Kiểm trên điện thoại thật, máy Plasma Pro thật: không có. Kết quả giả lập không phải xác minh phần cứng.
