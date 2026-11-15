# Plasma Pro, Stage 9A: báo cáo responsive

## Cách đo

- Bản dựng: `npx expo export -p web`, phục vụ tĩnh có SPA fallback. Trước: master `457ee0c`. Sau: nhánh `ui/stage-9a-thiet-ke-lai`.
- Công cụ: Playwright (Chromium cài sẵn), 33 màn × 6 bề rộng (320, 360, 390, 768, 1024, 1440) = 198 lần đo mỗi bản; đăng nhập lần lượt bác sĩ, bệnh nhân, quản trị.
- Mỗi lần đo ghi: tràn ngang (`scrollWidth > innerWidth`), phần tử chữ bị cắt (`scrollWidth > clientWidth` với `overflow` ẩn), điều khiển bấm được có cạnh nhỏ hơn 44 px, lỗi JS trên trang.
- Ngưỡng 44 px theo Apple HIG (44 pt) và WCAG 2.2 SC 2.5.5 (mức AAA); mức AA tối thiểu là 24 px (SC 2.5.8).
- Giới hạn: đây là trình duyệt máy tính giả lập bề rộng, không phải Android/iOS thật, không đo cỡ chữ hệ thống lớn.

## Kết quả theo bề rộng

Số lần đo có vấn đề trên 33 màn mỗi bề rộng.

| Bề rộng | Tràn ngang (trước → sau) | Chữ bị cắt | Điều khiển dưới 44 px | Lỗi JS |
|---|---|---|---|---|
| 320 | 1 → 0 | 10 → 1 | 4 → 3 | 1 → 0 |
| 360 | 1 → 0 | 1 → 1 | 3 → 2 | 1 → 0 |
| 390 | 0 → 0 | 1 → 1 | 3 → 2 | 1 → 0 |
| 768 | 0 → 0 | 1 → 1 | 3 → 2 | 1 → 0 |
| 1024 | 0 → 0 | 1 → 0 | 3 → 2 | 1 → 0 |
| 1440 | 0 → 0 | 1 → 0 | 3 → 2 | 1 → 0 |
| Tổng (198) | 2 → 0 | 15 → 4 | 19 → 13 | 6 → 0 |

- Tràn ngang và lỗi JS trước đây đều ở B15 (route không khớp hiện trang mặc định của Expo Router, lỗi React #418). Màn `+not-found.tsx` mới xử lý cả hai.
- Chữ bị cắt trước đây ở B01, B02, B12, B14, N02, N04, N07, N09, Q02, T02 (chủ yếu 320 px: tiêu đề cạnh nút bên phải, nhãn tab đậm). Sau: chỉ còn Q02, là tên tệp dài cắt bằng dấu ba chấm có chủ đích (`numberOfLines`).
- Điều khiển dưới 44 px còn lại:
  - B05: chip "Cảnh báo giảm chậm" cao khoảng 40 px, có `hitSlop` nên vùng chạm thực tế đạt 44; bộ đo chỉ đo khung hiển thị.
  - N03: ô ngày trong lịch tháng, kích thước theo lưới 7 cột; không đổi để giữ lưới ở 320 px.
  - N09: một điều khiển chưa có nhãn; cần rà lại ở đợt sau.
- N05: phần tử nằm ngoài mép phải là dải ảnh cuộn ngang có chủ đích, giống bản trước.

## Bố cục theo tầng

| Tầng | Bề rộng | Bố cục |
|---|---|---|
| Điện thoại | dưới 768 | Một cột, lề 16, thanh tab đáy, thanh nhận diện navy ở màn chính. Dưới 360: ẩn ký hiệu vai trò ở thanh tiêu đề, tiêu đề 22. Dưới 340: ô nút giữa 60, nhãn tab không đậm. |
| Máy tính bảng | 768 đến 1023 | Lề 24, cột đọc 600, thanh tab đáy. |
| Máy tính | từ 1024 | Thanh bên navy 232 px thay thanh tab (cùng sự kiện `tabPress`, cùng kiểm vai trò), cột nội dung 760, lề 32; dòng thương hiệu ở thanh tiêu đề ẩn vì đã có ở thanh bên. |
| Đăng nhập | từ 900 | Hai cột: khối navy bên trái, thẻ đăng nhập bên phải. |

Ảnh: `docs/stage-9a/anh/truoc-sau-B01-320.jpg`, `truoc-sau-N02-768.jpg`, `truoc-sau-B01-1440.jpg`, `truoc-sau-B05-1440.jpg`. Bộ ảnh đầy đủ 198 lần đo mỗi bản ở `/mnt/project-files/datn/stage-9a/responsive/`.

## Chưa kiểm

- Android và iOS thật, cỡ chữ hệ thống lớn (Dynamic Type, font scale 1,3 trở lên), xoay ngang: NOT TESTED.
- Bàn phím ảo che ô nhập trên điện thoại thật: NOT TESTED.
