# Plasma Pro Stage 9C: Báo cáo triển khai

**Trạng thái cuối: PARTIALLY COMPLETE.** Bảy gói đều có kết quả; phần sửa mã giới hạn ở các thay đổi nhỏ, an toàn. Các mục cần thay đổi kiến trúc lưu trữ, backend hoặc duyệt lâm sàng để DEFERRED.

Nhánh `refactor/stage-9c-on-dinh`, xếp chồng trên `fix/stage-9b-backlog` (PR 61). PR 58, 60, 61 chưa review; nếu PR 61 đổi, nhánh này phải rebase.

## 1. Kết quả theo gói

| Gói | Trạng thái | Kết quả |
|---|---|---|
| A Rà soát | COMPLETE | 9 điểm lệch ranh giới L-01 đến L-09, kế hoạch tái cấu trúc 5 bước |
| B Tách lớp | PARTIALLY COMPLETE | L-01 sửa; L-03 đến L-09 DEFERRED |
| C Thiết bị | PARTIALLY COMPLETE | Xác nhận dừng tách sang `stopRequest.ts` có kiểm thử; lệnh dừng máy thật và lịch trong CFG vẫn BLOCKED (giao thức, phần cứng) |
| D Toàn vẹn dữ liệu | PARTIALLY COMPLETE | Bộ kiểm chỉ đọc, 0 lỗi trên mẫu và dữ liệu trình duyệt; chưa gắn vào ứng dụng, D-R1 đến D-R4 để lại |
| E Bảo mật | COMPLETE (rà soát) | 8 phát hiện SEC-01 đến SEC-08; không sửa vì cần backend |
| F Hiệu năng | COMPLETE | Ghi mỗi lần lưu 2 xuống 1, byte ghi 28 908 xuống 14 454 |
| G Kiểm thử, tài liệu | COMPLETE | 3 tệp kiểm thử mới, 9 tài liệu |

## 2. Commit

| Commit | Gói | Nội dung |
|---|---|---|
| d96070d | B | `treatmentConfig.ts`, T01 dùng dịch vụ thiết bị |
| 530a0bb | C | `stopRequest.ts`, T02 dùng dịch vụ thiết bị |
| f90ad18 | D | `integrity.ts` chỉ đọc |
| 950644d | F | `persistedRef` bỏ lần ghi trùng, `scripts/do-hieu-nang-9c.cjs` |
| cb86f37 | G | Thêm 3 kiểm thử vào `npm test` |
| aefabad | G | 9 tài liệu `docs/stage-9c/` |

## 3. So sánh trước và sau

| Chỉ số | 9B (trước) | 9C (sau) |
|---|---|---|
| Tệp kiểm thử đơn vị | 43 | 46 |
| Hồi quy Stage 8 (22 kịch bản) | 781 đạt, 2 lỗi | 781 đạt, 2 lỗi (giống hệt) |
| kiem-thu-9b | 18/18 | 18/18 |
| Lần ghi dữ liệu mỗi lần lưu B11 | 2 | 1 |
| Byte ghi mỗi lần lưu B11 | 28 908 | 14 454 |
| Màn hình import trực tiếp lớp giao thức (ngoài công cụ chẩn đoán) | 1 (T01) | 0 |
| Quyết định an toàn dừng có kiểm thử đơn vị | Không | Có (9 trường hợp) |
| Gói JS web | 2 412 KB | 2 412 KB |

## 4. Ràng buộc đã giữ

Không đổi: logic lâm sàng, thuật toán đo và diện tích, suy luận AI, tham số và lịch điều trị, giao thức USB/UART, lệnh firmware, hành vi máy, QĐ-1 đến QĐ-6, lược đồ dữ liệu. Giá trị AR ở B10 vẫn chỉ tham khảo. Nút Dừng khẩn cấp không đổi. Không sửa kiểm thử cũ để qua.

## 5. Không khẳng định

Không có xác minh backend, AI, firmware, phần cứng, lâm sàng hay môi trường sản xuất. Mọi kiểm thiết bị dùng giả lập. Số hiệu năng đo trên Chromium máy chạy kịch bản.

## 6. Hoàn tác

- Toàn bộ: đóng PR, hoặc `git revert` các commit theo thứ tự ngược (tài liệu, cb86f37, 950644d, f90ad18, 530a0bb, d96070d).
- Từng gói: `git revert <commit>` theo bảng mục 2. Các commit độc lập nhau, riêng cb86f37 nên revert cùng commit chứa tệp kiểm thử bị gỡ.
- Không có thay đổi dữ liệu nên không cần di chuyển dữ liệu khi hoàn tác.

## 7. Việc tiếp theo cần người duyệt

1. Review PR 58, 60, 61 trước, sau đó PR 9C.
2. Quyết định có đưa `addImage` vào hàng đợi commit (D-R1) và đổi cách lưu ảnh trên web (D-R2).
3. Quy tắc chọn đợt điều trị khi có nhiều đợt active (L-07).
