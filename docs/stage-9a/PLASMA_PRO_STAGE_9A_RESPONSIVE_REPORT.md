# Plasma Pro, Stage 9A: báo cáo responsive

# Vòng 2: 30 màn còn lại

- Công cụ `resp2.cjs` (bản mở rộng của `resp.cjs`): 46 mục (C01 đến C05 không đăng nhập; các màn bác sĩ, bệnh nhân, quản trị, gồm B04a, B05a, B08c, B08d, Q01b, Q04b và trang `/help` của bác sĩ, quản trị) × 6 bề rộng (320, 360, 390, 768, 1024, 1440) = 276 lần đo trên bản dựng của nhánh. N01 đo riêng bằng `chup30.cjs` ở 320 và 390 px (cần đăng nhập bệnh nhân mới).
- Kết quả: tràn ngang trang 0/276; lỗi JS 0/276.
- "Phần tử vượt mép phải": 3 lần, đều ở N05 (320, 360, 390), là dải ảnh cuộn ngang có chủ đích (đã ghi ở vòng 1), không làm trang tràn.
- Chữ cắt bằng dấu ba chấm: Q02 ở 320 đến 768 px, là tên tệp nghiên cứu `ellipsizeMode="middle"`, vẫn chọn sao chép được (có chủ đích, như vòng 1).
- Điều khiển dưới 44 px: B05 (chip cảnh báo 208 × 23, có hitSlop; màn COMPLETE, không đổi), N03 (ô lịch 39 × 52 ở 320 px; thành phần `AdherenceCalendar` không đổi, đã ghi ở vòng 1), N09 (một điều khiển 40 × 20 không nhãn; màn COMPLETE, không đổi). 30 màn của vòng này không thêm điều khiển nhỏ mới.
- Chân màn cố định (nút chính luôn thấy) có ở: C02, C03, B04a, B05a, B06, B07, B08, B09, B10, B11, B13 (bác sĩ phụ trách), N08, Q04b (khi lỗi chưa xử lý), cùng B05, T01, T02 của vòng 1.
- Ảnh màn đầu ở 320 và 1024 px: `/mnt/project-files/datn/stage-9a/bo-cuc-con-lai/responsive/`; số liệu `ket-qua.json` cùng thư mục.
- Giới hạn: trình duyệt máy tính giả lập bề rộng; không đo cỡ chữ hệ thống lớn và bàn phím ảo trên máy thật (BLOCKED).

---

# Vòng 1 (PR 60, 13 màn và hệ thống chung)

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
