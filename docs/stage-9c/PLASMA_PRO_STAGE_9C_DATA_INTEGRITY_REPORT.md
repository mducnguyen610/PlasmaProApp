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
