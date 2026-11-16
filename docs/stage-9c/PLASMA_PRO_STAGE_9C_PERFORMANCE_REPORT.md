# Plasma Pro Stage 9C: Báo cáo hiệu năng (gói F)

Nguyên tắc: đo trước, sửa sau, đo lại. Mọi số đo chạy trên Chromium (Playwright) của máy chạy kịch bản với bản web tĩnh (`npx expo export -p web`), dữ liệu mô phỏng. **Không đại diện cho điện thoại thật.**

## 1. Đo trước khi sửa

Kịch bản: `scripts/do-hieu-nang-9c.cjs <baseURL> <tệp JSON> [số lần]`, 5 lần, lấy trung vị. Đếm mọi lần `localStorage.setItem` vào khóa dữ liệu khi bác sĩ bấm "Lưu diện tích" ở B11 (ảnh IMG0004, 4,2 cm²).

| Chỉ số | Bản 9B (trước) |
|---|---|
| Số lần ghi toàn bộ dữ liệu cho một lần lưu | 2 |
| Số byte ghi cho một lần lưu | 28 908 |
| Kích thước dữ liệu | 14 454 byte |
| Mở trang chủ bác sĩ tới khi thấy "Việc cần làm" | 120 ms |

Nguyên nhân lần ghi thứ hai: `commit()` (hàng đợi 9B) ghi bền dữ liệu mới, rồi `setData` kích hoạt `useEffect` ghi lại đúng dữ liệu đó lần nữa.

## 2. Sửa (commit 950644d)

`store.tsx` thêm `persistedRef` giữ bản đã ghi bền gần nhất. Hiệu ứng ghi nền bỏ qua khi `data === persistedRef.current`. Nội dung ghi không đổi, thứ tự ghi không đổi, lỗi ghi của commit vẫn báo `PersistError`.

## 3. Đo sau khi sửa

| Chỉ số | Trước | Sau | Đổi |
|---|---|---|---|
| Số lần ghi cho một lần lưu | 2 | 1 | Giảm một nửa |
| Số byte ghi cho một lần lưu | 28 908 | 14 454 | Giảm một nửa |
| Kích thước dữ liệu | 14 454 | 14 454 | Không đổi |
| Mở trang chủ bác sĩ | 120 ms | 112 ms | Trong sai số đo, **không coi là cải thiện** |
| Giá trị lưu đúng 4,2 ở cả 5 lần | Có | Có | Không đổi |
| Gói JS web | 2 412 KB | 2 412 KB | Không đổi |

## 4. Chi phí tuần tự hóa theo quy mô dữ liệu

`JSON.stringify` dữ liệu mẫu nhân bản (Node, máy chạy kịch bản):

| Quy mô | Kích thước | Thời gian |
|---|---|---|
| x1 | 14 KB | 0,03 ms |
| x10 | 103 KB | 0,40 ms |
| x100 | 993 KB | 2,76 ms |

Suy luận (độ tin cậy trung bình): với dữ liệu văn bản, ghi toàn bộ mỗi lần lưu chưa là điểm nghẽn ở quy mô demo. Rủi ro lớn hơn nằm ở ảnh.

## 5. Rủi ro chưa xử lý

- Bản web lưu ảnh dạng data URL trong cùng khóa dữ liệu (D-R2). Mỗi ảnh chụp thêm làm mỗi lần ghi nặng thêm khoảng 150 KB trở lên và có thể chạm giới hạn localStorage (thường vài MB mỗi nguồn gốc, tùy trình duyệt). Không sửa ở 9C vì là thay đổi kiến trúc lưu trữ.
- `addImage` vẫn ghi hai lần (ghi trực tiếp, sau đó hiệu ứng nền), do nằm ngoài hàng đợi commit (D-R1).
- Chưa đo trên điện thoại Android, iOS thật.

## 6. Tái lập

```
npx expo export -p web --output-dir <thư mục>
node <máy chủ tĩnh có SPA fallback> <thư mục> <cổng>
NODE_PATH=$(npm root -g) node scripts/do-hieu-nang-9c.cjs http://localhost:<cổng> ket-qua.json 5
```

## 7. Hoàn tác

`git revert 950644d`.

## Tài liệu tham khảo

- MDN Web Docs, Storage quotas and eviction criteria, https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
- React Native Async Storage, Limits, https://react-native-async-storage.github.io/async-storage/docs/limits
