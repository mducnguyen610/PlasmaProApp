# Plasma Pro, Stage 9B: kiểm tra backlog lỗi Stage 8

Ngày 15/11/2026. Nguồn duy nhất: `PLASMA_PRO_STAGE_8_BUG_BACKLOG.md` (PR 58, nhánh `ui/tb-8-hoi-quy`, bản sao ở `/mnt/project-files/datn/task-based-ui/giai-doan-8/`).

## 1. Điều kiện trước khi làm

| Điều kiện | Kết quả kiểm | Hệ quả |
|---|---|---|
| Stage 9A xong và đã review | **Chưa.** PR 60 (`ui/stage-9a-thiet-ke-lai`) đang mở, chưa có review, trạng thái IN PROGRESS | Stage 9B tách từ master, không phụ thuộc Stage 9A. Khi gộp cả hai sẽ chạm cùng tệp `session-monitor.tsx`, `images/[id].tsx` (xem mục 4) |
| Báo cáo hồi quy Stage 8 có sẵn | Có, trong PR 58 (chưa merge) và thư mục dự án | Dùng làm nguồn |
| Nhánh và cây làm việc | Nhánh Stage 9A sạch (đã commit, đã đẩy). Master `457ee0c` | Tạo nhánh `fix/stage-9b-backlog` từ `origin/master` |
| Thay đổi không được ghi đè | PR 58 (S8-B01, S8-B02, S8-B03 và các kịch bản sửa) chưa ở master; PR 60 chưa ở master | Không chép mã của PR 58, PR 60. Riêng `scripts/ngay-co-lich.cjs` được thêm giống hệt bản PR 58 (cùng nội dung, gộp không xung đột) để kịch bản mới không phụ thuộc thứ trong tuần |
| Mã hiện tại còn tái hiện lỗi | Có với S8-B04, S8-B05, S8-B06, S8-B07, S8-B10 (bằng chứng ở mục 3); S8-B08 và S8-B09 xác nhận bằng đọc mã | |

## 2. Phân loại

| Mã | Mức (Stage 8) | Phân loại 9B | Trạng thái cuối |
|---|---|---|---|
| S8-B04 | P2 | FIX APPROVED (hướng sửa đã được duyệt trong đặc tả 9B) | Đã sửa, có kiểm thử |
| S8-B05 | P2 | FIX APPROVED (vai trò xác định được từ nơi gọi hiện có) | Đã sửa phía ứng dụng, có kiểm thử; phân quyền máy chủ: chưa có máy chủ (ghi ở rủi ro) |
| S8-B06 | P2 | FIX APPROVED (hướng hàng đợi đã được duyệt) | Đã sửa, có kiểm thử |
| S8-B07 | P3 | FIX APPROVED (chỉ lớp giả lập và nút chỉ có ở giả lập) | Đã sửa, có kiểm thử |
| S8-B08 | P3, an toàn | APPROVAL REQUIRED | **BLOCKED**: chưa có review lâm sàng và kỹ thuật thiết bị; không đổi mã |
| S8-B09 | Review lâm sàng, phần cứng | HARDWARE VERIFICATION | **BLOCKED**: chưa có trả lời của nhóm phần cứng; đã ghi rõ hiện trạng các lớp; không đổi mã |
| S8-B10 | P3 | FIX APPROVED | Đã sửa, có kiểm thử |

Tổng: 7 mục đã xem; 5 đã sửa; 1 cần duyệt (S8-B08); 1 cần xác nhận phần cứng (S8-B09); 0 hoãn có chủ đích; 2 BLOCKED (S8-B08, S8-B09).

## 3. Từng mục

Mỗi mục: nguyên nhân gốc (chi tiết ở `PLASMA_PRO_STAGE_9B_ROOT_CAUSE_ANALYSIS.md`), cách tái hiện, tệp, luồng, ảnh hưởng dữ liệu và an toàn, cách sửa, duyệt, kiểm thử, trạng thái.

### S8-B04: N07 mở T02 không kèm woundId

- Tái hiện (trên master): bệnh nhân, tab Thiết bị (N07), "Theo dõi phiên điều trị" mở `/session-monitor` không tham số; thanh ngữ cảnh ghi "Chưa chọn vết thương"; phiên ghi ra không có `woundId`; "Lịch sử (n)" của VT01 ở N05 không tăng. Kịch bản `kiem-thu-9b.cjs` trên master: 9B-B04-01, 02, 03, 04 LỖI.
- Tệp: `src/app/patient/device.tsx`; mới `src/lib/monitorTarget.ts`.
- Luồng: bệnh nhân, thiết bị, theo dõi phiên, lịch sử vết thương.
- Dữ liệu: phiên không gắn vết thương; `course.ts` vẫn đếm (`!s.woundId || ...`) còn N05, lịch sử lọc chặt (`s.woundId === w.id`), nên hai nơi lệch nhau.
- An toàn: không đổi lệnh, thông số; chỉ đổi đích điều hướng.
- Sửa: một vết có đợt đang áp dụng đã xác nhận thì mở T02 kèm `woundId`; từ hai vết thì mở T01 (bắt chọn vết); không có vết nào thì giữ hành vi cũ.
- Kiểm thử: `src/lib/monitorTarget.test.ts`; `kiem-thu-9b.cjs` 9B-B04-01 đến 05.
- Trạng thái: đã sửa.

### S8-B05: thiếu kiểm vai trò trong `addReport`, `setReportHandled`, `resolveSyncError`

- Tái hiện: đọc mã master `store.tsx` dòng 700 đến 712: ba hàm gọi `update` không kiểm người gọi.
- Tệp: `src/lib/access.ts`, `src/lib/store.tsx`.
- Luồng: N08 gửi báo cáo, N02 báo vết mở lại, B04 và B07 đánh dấu báo cáo, Q04 và Q04b xử lý lỗi đồng bộ.
- Dữ liệu: không có backend; mọi kiểm tra chạy trong ứng dụng, dữ liệu ở bộ nhớ máy. Kiểm tra này chặn gọi sai từ giao diện, không chặn người sửa thẳng bộ nhớ máy.
- Sửa: `canAddReport` (bệnh nhân, đúng hồ sơ), `canHandleReport` (bác sĩ phụ trách, như `canManagePatient`), `canResolveSyncError` (quản trị chưa khóa, như `requireAdmin`).
- Kiểm thử: `src/lib/access.test.ts` (18 khẳng định, gồm các ca bị từ chối); `kiem-thu-9b.cjs` 9B-B05-01 đến 03 (luồng đúng vai trò vẫn chạy).
- Trạng thái: đã sửa phía ứng dụng.

### S8-B06: mất cập nhật khi các commit chồng nhau

- Tái hiện: `src/lib/commitQueue.test.ts` ca 1 chạy thuật toán cũ với hai lần ghi chồng nhau: thay đổi loại ảnh bị mất.
- Tệp: mới `src/lib/commitQueue.ts`; `src/lib/store.tsx` (`commit`).
- Luồng: mọi thao tác dùng `commit` (sửa hồ sơ, lưu trữ hồ sơ, sửa vị trí vết, gán nhãn diện tích, loại ảnh, yêu cầu chụp lại, lưu đánh giá, lưu đợt điều trị, ghi phiên).
- Dữ liệu: rủi ro mất dữ liệu lâm sàng đã nhập (số đo, đánh giá).
- Sửa: hàng đợi tuần tự; mỗi commit tính từ bản mới nhất; ghi lỗi thì từ chối commit đó, hàng đợi vẫn chạy; dữ liệu đổi bởi đường khác trong lúc ghi thì tính lại.
- Kiểm thử: `src/lib/commitQueue.test.ts` 7 ca.
- Trạng thái: đã sửa.

### S8-B07: giả lập mất liệu trình sau khi tải lại T02

- Tái hiện (master): mở thẳng `/session-monitor?woundId=w-1`, kết nối: có nút "Bắt đầu điều trị" nhưng bấm không có gì xảy ra (giả lập `startSession` bỏ qua khi chưa có cấu hình). `kiem-thu-9b.cjs` 9B-B07-01 LỖI trên master.
- Tệp: `src/lib/device/useDeviceLink.ts`, `src/lib/device/index.ts` (chỉ kiểu), mới `src/lib/simStartGate.ts`, `src/app/session-monitor.tsx`.
- An toàn: nút này chỉ có với giả lập; thiết bị thật không có `startSession` nên không đổi. Không tự nạp lại, không giả lập thành công.
- Kiểm thử: `src/lib/simStartGate.test.ts`; `kiem-thu-9b.cjs` 9B-B07-01 đến 03.
- Trạng thái: đã sửa.

### S8-B08: nút Kết nối và Dừng điều trị cùng chỗ ở T02

- Tái hiện: đọc mã master `session-monitor.tsx` dòng 141 đến 149: khi mất kết nối lúc đang chạy, chân màn có Notice và "Kết nối"; kết nối lại thì "Dừng điều trị" hiện ở đầu chân màn. Chưa tái hiện bằng kịch bản: giao diện web không có cách ngắt giả lập giữa phiên mà không sửa `src/lib/device` (ghi nhận từ Stage 7, TP-DV-06b).
- An toàn: lần chạm thừa có thể kích hoạt Dừng. Đặc tả 9B không cho tự quyết rằng dừng ngoài ý muốn là chấp nhận được.
- Đề xuất (chưa làm): xem nhật ký duyệt.
- Kiểm thử: không thêm (chưa có thay đổi; không tái hiện được trên web mà không sửa lớp thiết bị).
- Trạng thái: BLOCKED, chờ review.

### S8-B09: ngày nghỉ theo lịch chặn ở N02 nhưng không chặn ở T01

- Tái hiện: đọc mã. N02 chỉ hiện nút nạp khi `status.kind === 'treat'` (`patient/index.tsx` dòng 126); T01 `canSend` (`connect-device.tsx` dòng 67) không xét lịch.
- Phát hiện mới: bản tin cấu hình `CFG` trong đặc tả giao thức chỉ có mã hồ sơ, thời gian, mức, chế độ, ngày giờ (`protocol.config.ts` dòng 14 đến 23); không có lịch. Câu hỏi F1 đến F13 của ICD chưa có trả lời firmware. Câu "thiết bị không phát vào ngày nghỉ" trong `simulateSession` là mô phỏng.
- Trạng thái: BLOCKED, chờ nhóm phần cứng.

### S8-B10: nhãn diện tích khác nhau giữa B10 và B11

- Tái hiện: B10 "Diện tích bác sĩ đo (cm²)", B11 dòng giá trị và ô nhập "Diện tích bác sĩ đã đo". Hai nhãn chỉ cùng một trường `areaCm2` của ảnh (số đo tham chiếu bác sĩ nhập). `kiem-thu-9b.cjs` 9B-B10-02, 03 LỖI trên master.
- Tệp: `src/app/images/[id].tsx`; kịch bản `dot-12`, `p0`, `tb-3`, `p1-05-06` (đổi bộ tìm nhãn, giữ ý kiểm).
- Sửa: B11 dòng giá trị "Diện tích bác sĩ đo"; ô nhập "Diện tích bác sĩ đo (cm²)" hoặc "(mm²)" theo đơn vị đang chọn ngay dưới. Không đổi cách tính, quy đổi, dữ liệu.
- Kiểm thử: `kiem-thu-9b.cjs` 9B-B10-01 đến 03.
- Trạng thái: đã sửa.

## 4. Gộp với các PR đang mở

- PR 58 (Stage 8): khác vùng sửa với 9B, trừ `scripts/ngay-co-lich.cjs` (cùng nội dung). Kịch bản `p0` của PR 58 cũng đổi nhãn tìm ô diện tích nếu 9B gộp trước (đã áp cùng thay đổi vào bản kịch bản PR 58 dùng để chạy hồi quy ở đây).
- PR 60 (Stage 9A): cùng chạm `session-monitor.tsx` (khối nút Bắt đầu) và `images/[id].tsx` (không cùng dòng). Có thể có xung đột văn bản nhỏ khi gộp, cần giải tay.
