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

## 4. Kiểm định cuối (15/11/2026, tối)

Chạy lại trên bản dựng mới từ head PR 62 và trên bản dựng PR 60 (Stage 9A). Stage 9A không có kịch bản riêng; hồi quy 9A là 22 kịch bản trên bản dựng 9A, với tb-2, tb-3, p2 lấy từ nhánh PR 60 (đổi hằng màu) và 5 kịch bản PR 58 nguyên bản (nhãn B11 cũ, vì 9A không có S8-B10).

| Bản dựng | 22 kịch bản | kiem-thu-9b | Hiệu năng | Toàn vẹn trình duyệt |
|---|---|---|---|---|
| 9C (head PR 62) | 781 đạt, 2 lỗi, giống 9B | 18/18 | 1 lần ghi, 14 454 byte, lưu đúng 5/5 | 0 lỗi |
| 9A (PR 60) | 781 đạt, 2 lỗi (cùng 2 lỗi tb-8) | Không áp dụng | Không đo | Không đo |
| 9B (PR 61, đo lại) | Kết quả lưu trước | 18/18 (lần trước) | 2 lần ghi, 28 908 byte, lưu đúng 5/5 | Không đo |

## 5. Không chạy ở đây

- dot-9 (cần bản dựng tiêm dữ liệu AR riêng).
- Kiểm trên điện thoại thật, máy Plasma Pro thật: không có. Kết quả giả lập không phải xác minh phần cứng.

## 6. Hồi quy sau khi hoàn tất gói B, C, D (16/11/2026)

Bản dựng web mới từ head nhánh `refactor/stage-9c-bcd` (85d9ded). Ngày chạy 16/11/2026 (thứ Hai, có lịch điều trị).

| Kiểm | Kết quả |
|---|---|
| `npx tsc --noEmit -p .` | Đạt |
| `npm run lint` | Đạt, 0 cảnh báo |
| `npm test` | 51/51 tệp đạt |
| `scripts/kiem-thu-giao-dien.cjs` | 41/41 |
| Hồi quy Stage 8, 22 kịch bản | 782 đạt, 2 lỗi (tb-8 S8-W3-04, S8-B01, có sẵn, sửa ở PR 58) |
| `scripts/kiem-thu-9b.cjs` | 18/18 |
| `scripts/kiem-thu-9c-bcd.cjs` | 21/21 |
| `scripts/do-hieu-nang-9c.cjs` | 1 lần ghi mỗi lần lưu, lưu đúng 5/5 |
| Toàn vẹn dữ liệu trình duyệt | 0 lỗi |
| Stage 9A gộp thử (PR 60 + nhánh này, không commit) | giao diện 41/41; 22 kịch bản 782 đạt, 2 lỗi (cùng S8-W3-04, S8-B01); 9B 18/18; 9C-BCD 21/21. Xung đột duy nhất: import `AccountScreen.tsx` |

So với 9B: chỉ khác p2 (238 so với 237) vì kiểm P21-06 chỉ chạy vào ngày có lịch; giá trị đo P22-23 khác theo ngày. Không có kiểm nào chuyển từ đạt sang lỗi. Kịch bản cũ không bị sửa.
