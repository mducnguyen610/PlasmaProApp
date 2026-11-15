# Plasma Pro, Stage 9B: phân tích nguyên nhân gốc

Mã dòng tính trên master `457ee0c` trừ khi ghi khác.

## S8-B04: phiên từ N07 không gắn vết thương

1. N02 mở T01 không truyền tham số (`patient/index.tsx` dòng 127: `router.push('/connect-device')`). T01 tự chọn đợt: `courses` là các vết có `coursePlan(w.id)` đang áp dụng và đã xác nhận; đúng một đợt thì chọn luôn, nhiều đợt thì bắt chọn (`connect-device.tsx` dòng 45 đến 52). Sau ACK, T01 mở T02 kèm `woundId` của đợt đã chọn (dòng 113).
2. N07 mở T02 trực tiếp, không tham số (`patient/device.tsx` dòng 27). T02 đọc `woundId` từ tham số (`session-monitor.tsx` dòng 29, 100), nên `w` không có và thanh ngữ cảnh báo "Chưa chọn vết thương".
3. Phiên được tạo khi T02 thấy STA chuyển từ `running` sang kết thúc, **sau** khi đã chọn (hoặc không chọn) vết thương: `recordDeviceSession({ patientId, woundId: params.woundId, ... })` (dòng 40). Không tham số thì `woundId` rỗng.
4. Quan hệ dữ liệu: phiên gắn `deviceId` (máy của hồ sơ) và `woundId` tùy chọn; không có `patientId` riêng trên phiên (suy ra qua thiết bị). `course.ts` tính tiến độ đợt bằng `!s.woundId || s.woundId === woundId`, còn N05 (`PatientWoundDashboard.tsx` dòng 60) và lịch sử (`wound-history/[woundId]/index.tsx` dòng 115) lọc `s.woundId === w.id`. Cùng một phiên được đếm ở đợt nhưng không hiện trong lịch sử vết.

Nguyên nhân gốc: N07 là lối vào T02 duy nhất không đi qua bước chọn đợt của T01.

Không đổi: quy tắc đếm phiên của `course.ts` (logic lâm sàng của tiến độ đợt). Phiên cũ không có `woundId` giữ nguyên, không gán lại.

## S8-B05: ba thao tác không kiểm vai trò

`addReport`, `setReportHandled`, `resolveSyncError` (`store.tsx` dòng 700 đến 712) gọi thẳng `update`. Các thao tác cùng loại khác có `requireDoctor` (bác sĩ phụ trách, chặn hồ sơ đã lưu trữ trừ khi cho phép) hoặc `requireAdmin` (quản trị chưa khóa). Ba hàm này được viết từ giai đoạn đầu khi giao diện là lớp chặn duy nhất, và không được cập nhật khi các hàm khác thêm kiểm tra.

Vai trò dự kiến lấy từ nơi gọi (không có yêu cầu nào khác):

| Hàm | Nơi gọi | Vai trò |
|---|---|---|
| `addReport` | `report.tsx` dòng 41 (N08), `patient/index.tsx` dòng 145 (vết mở lại) | Bệnh nhân, cho `me.patientId` |
| `setReportHandled` | `patients/[id].tsx` dòng 211 (chỉ hiện với bác sĩ), `evaluate/[woundId].tsx` dòng 194 | Bác sĩ phụ trách hồ sơ |
| `resolveSyncError` | `admin/logs.tsx` dòng 46, `admin-log/[id].tsx` dòng 31 | Quản trị viên |

Lớp thực thi hiện có: chỉ kho dữ liệu trong ứng dụng (React context, AsyncStorage). Không có máy chủ (`docs/thiet-ke/de-xuat-backend.md` là đề xuất). Kiểm tra mới chặn gọi sai qua mã ứng dụng; không chặn được người sửa bộ nhớ máy hay mã chạy trên máy.

Lựa chọn với hồ sơ đã lưu trữ: B04 hiện vẫn cho bác sĩ phụ trách đánh dấu báo cáo của hồ sơ đã lưu trữ; `canHandleReport` không chặn theo lưu trữ để không đổi hành vi đang có. Nếu muốn hồ sơ lưu trữ chỉ xem tuyệt đối, cần quyết định riêng.

## S8-B06: mất cập nhật khi commit chồng nhau

`commit()` (dòng 171 đến 179) tính `next = fn(dataRef.current)`, chờ `AsyncStorage.setItem`, rồi mới `update(() => next)` (gán `dataRef.current`). Trong lúc chờ, commit thứ hai đọc cùng `dataRef.current` cũ. Lần ghi xong sau cùng đưa bản của nó vào bộ nhớ và màn hình, xóa thay đổi của lần kia. Cũng vậy khi một `update()` đồng bộ hoặc ghi ảnh mới (`addImage` dòng 452, tự `setItem` rồi `update`) chen vào giữa: `update(() => next)` của commit đè lên.

Ngoài ra còn hiệu ứng ghi `data` mỗi khi đổi (dòng 157 đến 160, lệnh ghi ở dòng 159); hiệu ứng này ghi bản đang hiển thị nên sau mỗi lần đổi bộ nhớ máy hội tụ về màn hình, nhưng không cứu được thay đổi đã bị đè trong bộ nhớ.

Tái hiện có kiểm soát: `commitQueue.test.ts` ca 1 (ghi số đo mất 20 ms, đổi loại ảnh mất 5 ms, gọi liền nhau: thay đổi loại ảnh mất).

Giới hạn: AsyncStorage đảm bảo từng `setItem`, không có giao dịch nhiều bước. Hàng đợi chỉ bảo đảm thứ tự và cơ sở tính toán trong một tiến trình ứng dụng.

## S8-B07: giả lập mất liệu trình sau khi tải lại

`getTransport()` (`device/index.ts`) giữ một thể hiện trong bộ nhớ JS; tải lại trang tạo thể hiện mới với `config = null` (`simulated.ts` dòng 44). Máy giả lập được thiết kế tạm thời (không lưu cấu hình), giống máy thật mất điện. T02 hiện nút "Bắt đầu điều trị" khi giả lập đã kết nối và không chạy (dòng 108), không xét có cấu hình; `startSession` trả về im lặng khi `!config` (`simulated.ts` dòng 146). Người dùng bấm, không có phản hồi.

## S8-B08: Kết nối và Dừng cùng vùng chân màn

Chân màn T02 dựng theo trạng thái: đang chạy và đã kết nối thì phần tử đầu là "Dừng điều trị" (dòng 142); đang chạy mà mất kết nối thì là Notice "Mất kết nối…" rồi "Kết nối" (dòng 145 đến 149). Chân màn neo đáy nên khi Notice và "Kết nối" biến mất, "Dừng điều trị" chiếm vùng đáy mà "Kết nối" vừa ở. Hai nút là hai phần tử khác nhau (không dùng chung một phần tử đổi nhãn), nhưng vị trí chồng nhau theo thời gian; lần chạm thứ hai của chạm đúp có thể rơi vào nút mới. Cùng kiểu với S8-B01 ở T01 (đã sửa trong PR 58 bằng `armAfterMs`, không áp cho nút Dừng vì không được làm chậm lệnh dừng).

Không tái hiện được trên web: giả lập không có cách ngắt giữa phiên từ giao diện (TP-DV-06b, Stage 7).

## S8-B09: ngày nghỉ theo lịch

- Ứng dụng: N02 ẩn nút nạp vào ngày nghỉ (lịch tính ở `course.ts`, `courseStatus`); N07 hạ nút nạp xuống nút phụ và báo "Không cần nạp liệu trình hôm nay"; T01 `canSend` không xét lịch.
- Máy chủ: chưa có.
- Thiết bị: bản tin `CFG` (`protocol.config.ts` dòng 14 đến 23) gồm mã hồ sơ, thời gian tối thiểu, mức năng lượng, chế độ, ngày giờ hiện tại; **không có lịch, số buổi hay ngày nghỉ**. Vậy máy không nhận được lịch từ ứng dụng. Máy có tự giữ lịch riêng hay không: chưa biết (ICD mục 10, F1 đến F13 chưa có trả lời firmware).
- Mô phỏng: `simulateSession` (`store.tsx`) trả "Hôm nay là ngày nghỉ theo lịch của đợt: thiết bị không phát", là giả định của bản demo, không phải hành vi đã xác nhận.

Nguyên nhân gốc của sự không nhất quán: giả định "máy tự chặn" chưa được kiểm chứng, nên mỗi màn xử lý khác nhau.

## S8-B10: nhãn diện tích

B10 `guided-capture.tsx` dòng 340 và B07 `evaluate/[woundId].tsx` dòng 242 dùng "Diện tích bác sĩ đo"; B11 `images/[id].tsx` dòng 271 và 297 dùng "Diện tích bác sĩ đã đo". Cả ba hiển thị hoặc ghi cùng trường `WoundImage.areaCm2` qua `labelImage` (số đo tham chiếu bác sĩ nhập, khác ước lượng AR). Hai màn được viết ở hai đợt khác nhau. B11 còn cho chọn mm² (quy đổi sang cm² khi lưu), nên nhãn cố định "(cm²)" sẽ sai khi chọn mm².
