# Plasma Pro, Stage 9B: báo cáo triển khai

Nhánh `fix/stage-9b-backlog` từ master `457ee0c`. Mỗi mục một commit. Không gộp PR 58, PR 60. Trạng thái chung: **BLOCKED** (5 mục sửa xong; S8-B08 chờ review an toàn, S8-B09 chờ nhóm phần cứng).

## Thay đổi theo mục

| Mục | Tệp | Thay đổi |
|---|---|---|
| S8-B04 | `src/lib/monitorTarget.ts` (mới), `src/app/patient/device.tsx` | `monitorTarget()` chọn đích theo số vết có đợt đang áp dụng đã xác nhận (cùng điều kiện T01). N07 "Theo dõi phiên điều trị": một vết thì `/session-monitor?woundId=…`; nhiều vết thì `/connect-device`; không có thì như cũ |
| S8-B05 | `src/lib/access.ts`, `src/lib/store.tsx` | `canAddReport`, `canHandleReport`, `canResolveSyncError`; ba hàm của kho ném lỗi khi sai vai trò, cùng kiểu với `requireDoctor`, `requireAdmin` |
| S8-B06 | `src/lib/commitQueue.ts` (mới), `src/lib/store.tsx` | `commit()` đi qua hàng đợi tuần tự; giao diện hàm `commit` không đổi (vẫn `Promise<void>`, vẫn ném `PersistError` khi ghi lỗi) |
| S8-B07 | `src/lib/simStartGate.ts` (mới), `src/lib/device/useDeviceLink.ts`, `src/lib/device/index.ts`, `src/app/session-monitor.tsx` | Cờ `simConfigLoaded` (chỉ giả lập, đọc `lastConfig()`, không gửi lệnh). T02 ẩn "Bắt đầu điều trị" khi giả lập chưa có liệu trình và hiện câu giải thích. Thiết bị thật: cờ là `undefined`, nút vốn không có |
| S8-B10 | `src/app/images/[id].tsx` | B11 dùng "Diện tích bác sĩ đo" (dòng giá trị) và "Diện tích bác sĩ đo (cm²)" hoặc "(mm²)" theo đơn vị đang chọn (ô nhập), cùng nhãn B10 |
| S8-B08 | không | BLOCKED, xem nhật ký duyệt |
| S8-B09 | không | BLOCKED, xem nhật ký duyệt |

Không đổi: `src/lib/course.ts` (đếm phiên của đợt), giao thức, lệnh, thông số, firmware, mô hình dữ liệu, QĐ-1 đến QĐ-6, nút Dừng điều trị.

## Kiểm thử thêm

| Tệp | Mục | Nội dung |
|---|---|---|
| `src/lib/monitorTarget.test.ts` | S8-B04 | Một vết, một vết đủ điều kiện giữa nhiều vết (không lấy phần tử đầu), hai vết, không vết |
| `src/lib/access.test.ts` | S8-B05 | 18 khẳng định: đúng vai trò được; sai vai trò, khóa, chưa đăng nhập, bác sĩ không phụ trách bị từ chối |
| `src/lib/commitQueue.test.ts` | S8-B06 | Tái hiện lỗi cũ; hai trường khác nhau; cùng trường (thứ tự xác định); ghi lỗi; lỗi kiểm tra; update đồng bộ chen vào; tính lại bị từ chối |
| `src/lib/simStartGate.test.ts` | S8-B07 | Có, không có, không rõ liệu trình; đang chạy; chưa kết nối; thiết bị thật |
| `scripts/kiem-thu-9b.cjs` | S8-B04, B05, B07, B10 | 18 ca trên giao diện web, giả lập |
| `scripts/ngay-co-lich.cjs` | hỗ trợ | Giống hệt bản PR 58 |

Bốn tệp kiểm thử đơn vị đã thêm vào `npm test`.

## Kịch bản cũ được chỉnh

`scripts/kiem-thu-dot-12.cjs`, `kiem-thu-p0.cjs`, `kiem-thu-tb-3.cjs`, `kiem-thu-p1-05-06.cjs`: bộ tìm ô diện tích ở B11 đổi từ "Diện tích bác sĩ đã đo" sang nhãn mới (S8-B10). Ý kiểm không đổi.

## Rủi ro còn lại

1. S8-B05: kiểm tra chỉ ở ứng dụng. Khi có máy chủ, ba thao tác phải được phân quyền ở máy chủ (bệnh nhân chỉ ghi cho hồ sơ của mình; bác sĩ phụ trách đánh dấu; quản trị xử lý lỗi đồng bộ).
2. S8-B06: hàng đợi không phải giao dịch. Trường hợp hiếm (tính lại thành công nhưng lần ghi thứ hai lỗi) để bộ nhớ máy chứa bản thiếu thay đổi đồng bộ trong khi màn hình giữ bản mới nhất; commit đó báo lỗi ghi, hiệu ứng ghi `data` sẽ ghi lại ở lần đổi kế tiếp. `update()` đồng bộ và `addImage` vẫn ghi ngoài hàng đợi (không đổi trong 9B để giữ nhỏ thay đổi).
3. S8-B04: nhiều vết thì bệnh nhân phải qua T01 (chọn vết, kết nối, nạp) rồi mới mở được theo dõi; phiên cũ không có `woundId` vẫn được `course.ts` đếm vào đợt nhưng không hiện ở lịch sử vết (không gán lại theo yêu cầu). N02 vẫn tự chọn đợt đầu tiên đang áp dụng để hiển thị trạng thái hôm nay (`patient/index.tsx`, ngoài phạm vi backlog).
4. S8-B07: cờ đọc lúc vẽ màn (T02 vẽ lại mỗi giây), không phải sự kiện.
5. S8-B08, S8-B09: chưa xử lý, xem nhật ký duyệt.
6. Chưa thử Android, iOS thật; chưa có review lâm sàng; chưa kiểm phần cứng.
