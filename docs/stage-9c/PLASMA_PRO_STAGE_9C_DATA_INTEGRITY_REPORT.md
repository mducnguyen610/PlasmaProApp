# Plasma Pro Stage 9C: Báo cáo toàn vẹn dữ liệu (gói D)

## 1. Thay đổi

| Commit | Tệp | Nội dung |
|---|---|---|
| f90ad18 | `src/lib/integrity.ts` (mới) | `checkIntegrity(d: AppData): IntegrityIssue[]`, hàm thuần, chỉ đọc |
| f90ad18 | `src/lib/integrity.test.cjs` (mới) | Dữ liệu mẫu không có lỗi; từng kiểu lỗi chèn vào đều bị bắt |

Bộ kiểm **chưa gắn vào ứng dụng**: không chặn lưu, không sửa dữ liệu, không đổi lược đồ, không thêm migration. Gắn vào luồng (ví dụ cảnh báo cho quản trị viên) cần duyệt.

## 2. Các kiểu kiểm

| Mã | Ý nghĩa | Thực thể |
|---|---|---|
| `duplicate_id` | Trùng mã trong cùng tập | accounts, patients, wounds, images, evaluations, plans, devices, reports (chưa kiểm sessions, sessionNotes, deviceLinks) |
| `orphan` | Tham chiếu tới bản ghi không tồn tại | accounts, patients (bác sĩ phải tồn tại), devices, wounds, images, evaluations, plans, sessions, sessionNotes, reports, deviceLinks |
| `cross_patient` | Ảnh hoặc liệu trình gắn vết thương của bệnh nhân khác | image, plan |
| `cross_wound` | Đánh giá dẫn tới ảnh của vết thương khác | evaluation.imageId |
| `mismatch` | `patient.deviceId` và `device.patientId` không khớp hai chiều | patient, device |

## 3. Kết quả

| Dữ liệu | Số lỗi | Cách kiểm |
|---|---|---|
| Dữ liệu mẫu (`createSeed`) | 0 | `node src/lib/integrity.test.cjs` |
| Dữ liệu trình duyệt sau khi bác sĩ lưu diện tích B11 (IMG0004, 4,2 cm²) trên bản dựng 9C | 0 | Kịch bản Playwright đọc `localStorage` rồi gọi `checkIntegrity` |

## 4. Rủi ro toàn vẹn còn lại (chưa sửa)

| Mã | Mô tả | Vì sao để lại |
|---|---|---|
| D-R1 | `addImage` (`store.tsx`) ghi bộ nhớ trực tiếp ngoài hàng đợi commit. Một commit khác chạy xen giữa lúc lưu tệp ảnh có thể làm một trong hai thay đổi bị ghi đè trong bộ nhớ bền | Sửa chạm luồng lưu ảnh và xử lý hết dung lượng; cần review riêng |
| D-R2 | Bản web lưu ảnh dạng data URL bên trong cùng khóa AsyncStorage (`persistImageFile`). Ảnh mẫu khoảng 145 đến 155 KB mỗi tệp. Có thể chạm giới hạn localStorage của trình duyệt | Đổi cách lưu ảnh là thay đổi kiến trúc lưu trữ; bản native lưu tệp riêng, không bị |
| D-R3 | Trong 31 hàm ghi của store, 9 hàm đi qua `commit` (báo `PersistError`): addEvaluation, labelImage, recordDeviceSession, requestRetake, savePlan, setExcluded, setPatientArchived, updatePatient (một phần), updateWound; addImage ghi trực tiếp (D-R1). 21 hàm còn lại (ví dụ markCareDone, setSessionPain, simulateSession, recordDeviceLink, recordClosure, setLifecycle, addReport, assignDevice) dùng `update()`; lỗi ghi của chúng bị hiệu ứng nền nuốt (`.catch(() => {})`), màn hình có thể báo xong khi chưa ghi bền | Hành vi có từ trước 9C (kiểm định cuối 15/11/2026 đếm lại); chuyển sang commit đổi luồng lỗi của nhiều màn, cần duyệt |
| D-R4 | Không có phiên bản lược đồ hay migration; khóa `plasmapro.demo.v2` đọc thẳng | Ràng buộc 9C: không đổi lược đồ khi chưa duyệt |

## 5. Khoảng trống của bộ kiểm

- Chưa kiểm phiên điều trị (`sessions`) thuộc đúng bệnh nhân của thiết bị và của vết thương, chưa kiểm phiên với đợt điều trị.
- Chưa kiểm tài khoản bác sĩ bị khóa vẫn phụ trách hồ sơ.
- Không kiểm nội dung lâm sàng (giá trị diện tích, tham số điều trị); chỉ kiểm quan hệ.

## 6. Hoàn tác

`git revert f90ad18`. Mã mới không được ứng dụng gọi nên hoàn tác không ảnh hưởng hành vi.

## 7. Hoàn tất gói D (16/11/2026, nhánh `refactor/stage-9c-bcd`)

### 7.1 Đường ghi sau khi sửa

```
Màn hình ─await─► hàm store (kiểm quyền) ─► commit(fn)
   commit: xếp hàng (commitQueue) ─► fn(bản mới nhất) ─► newIntegrityIssues(bản cũ, bản mới)
           ─► persistence.saveData (hàng ghi tuần tự) ─► thành công: cập nhật màn hình
           lỗi ở bất kỳ bước nào: màn hình và bộ nhớ máy giữ bản cũ, ném PersistError hoặc IntegrityError
Ghi nền (chỉ resetDemo, mô phỏng IoMT bản phát triển, bộ đếm ảnh): lỗi ghi ─► PersistBanner + "Thử lưu lại"
Mở ứng dụng: JSON hỏng ─► chép nguyên văn sang plasmapro.demo.v2.khong-doc-duoc.<thời điểm>, báo người dùng
             kho không đọc được ─► không ghi gì (không đè dữ liệu thật), báo người dùng
```

### 7.2 Đối chiếu yêu cầu

| Yêu cầu | Trạng thái | Căn cứ |
|---|---|---|
| Giữ quan hệ patient, wound, image, device, session | Đạt | Không đổi lược đồ; `newIntegrityIssues` chặn mồ côi và gắn chéo mới |
| Chặn gắn chéo bệnh nhân | Đạt | Kiểm tại chỗ ở `addEvaluation` (ảnh thuộc đúng vết), `savePlan`, `recordDeviceSession` (vết thuộc đúng hồ sơ); kiểm chung trước mỗi commit; `writePath.test.cjs` mục 4 |
| Chặn mồ côi ngoài ý muốn | Đạt | `writePath.test.cjs` mục 5 |
| Ghi xung đột được tuần tự | Đạt | Hàng commit + hàng ghi; `writePath.test.cjs` mục 1, 2; `persistence.test.ts` mục 1 |
| Giữ trường không liên quan | Đạt | `writePath.test.cjs` mục 7 |
| Lỗi ghi được báo rõ | Đạt | 29/31 hàm ghi có kiểu Store đi qua commit (trước 9/31); 2 hàm còn lại là mô phỏng IoMT chỉ có trong bản phát triển (`setDevicePower`, `simulateSession`); chúng và `resetDemo` (quản trị khôi phục dữ liệu mẫu) ghi nền, lỗi hiện ở PersistBanner; 9C-D-01..10 |
| Bộ nhớ và màn hình khớp | Đạt | Màn hình chỉ đổi sau khi ghi xong; `writePath.test.cjs` mục 1 đến 3 |
| Chặn commit trùng | Một phần | Mã bản ghi trùng bị chặn; bấm nạp hai lần chỉ ghi một lần (9C-C-01); các nút lưu khác dựa vào khóa nút có từ trước |
| Giữ bản nháp | Đạt ở luồng đã kiểm | B11 (9C-D-02), N08 (9C-D-06). Màn khác giữ trạng thái khi lỗi như trước, chưa kiểm riêng từng màn |
| Không tự gán phiên vào vết khi không rõ | Đạt | `recordDeviceSession` chỉ nhận `woundId` do T02 truyền (S8-B04: chỉ khi đúng một vết có đợt) |
| Kiểm ghi đồng thời và ghi lỗi | Đạt | `writePath.test.cjs`, `persistence.test.ts`, `commitQueue.test.ts`, `kiem-thu-9c-bcd.cjs` |

Trước khi sửa (bản dựng 9C cũ, cùng kịch bản): bệnh nhân gửi báo cáo khi bộ nhớ ghi lỗi vẫn được báo "Đã ghi nhận" trong khi báo cáo không được lưu (9C-D-07 LỖI). Sau khi sửa: báo "Chưa gửi được", giữ nội dung, không rời màn.

### 7.3 Chi phí kiểm quan hệ mỗi commit (Node, máy chạy kịch bản)

| Quy mô | Kích thước | `newIntegrityIssues` |
|---|---|---|
| x1 | 14 KB | 0,08 ms |
| x10 | 135 KB | 0,23 ms |
| x100 | 1,35 MB | 1,55 ms |

### 7.4 Giới hạn còn lại

- Phiên điều trị (`DeviceSession`) không lưu `patientId`; quan hệ phiên với bệnh nhân suy ra qua thiết bị lúc ghi. Khi thiết bị đổi chủ, không kiểm lại được phiên cũ thuộc ai. Thêm trường cần duyệt đổi lược đồ.
- D-R2 (ảnh web dạng data URL trong localStorage) chưa đổi.
- D-R4 (không có phiên bản lược đồ, migration) chưa đổi.
- Hàng ghi tuần tự kiểm trên web và Node; chưa chạy trên điện thoại thật.

### 7.5 Hoàn tác

`git revert 85d9ded 4ca3ebb 3b41faf b51122c` (theo thứ tự này). Không đổi dữ liệu nên không cần di chuyển dữ liệu; khóa sao lưu `plasmapro.demo.v2.khong-doc-duoc.*` (nếu có) có thể xóa tay.
