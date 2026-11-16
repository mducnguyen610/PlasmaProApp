# Plasma Pro, Stage 8: danh sách lỗi và backlog

Ngày 14/11/2026. Nền master `dbad553`, nhánh `ui/tb-8-hoi-quy`. Phân loại theo mục 10 của đặc tả Stage 8 (P0 nghiêm trọng, P1 cao, P2 trung bình, P3 thấp).

Tóm tắt: không phát hiện P0. Một P1 (S8-B01) và một P2 (S8-B02) cùng nguồn ở T01, một P2 hiển thị (S8-B03): đã sửa trong PR Stage 8, chờ duyệt và chờ review chuyên môn cho S8-B01. Một P2 về dữ liệu (S8-B04) và các mục còn lại để backlog vì sửa sẽ đổi dữ liệu ghi, logic phân quyền hoặc lớp dữ liệu (ngoài phạm vi mục 11).

## 1. Lỗi đã sửa trong Stage 8

| Mã | Mức | Màn | Mô tả | Cách tái hiện | Nguồn gốc | Đã sửa | Xác nhận |
|---|---|---|---|---|---|---|---|
| S8-B01 | **P1**, liên quan điều khiển thiết bị, cần review chuyên môn | T01 `connect-device.tsx` | Chạm hai lần vào "Kết nối" (cách 300 ms hoặc 800 ms) thì lần chạm hai rơi vào nút "Nạp liệu trình vào máy" vừa hiện đúng chỗ đó ở chân màn, **gửi lệnh CFG xuống máy** khi người dùng chưa thấy phần "Đợt điều trị" sẽ nạp | Bệnh nhân, T01, chạm đúp "Kết nối" (ảnh `s8-b01-truoc-2-sau-cham-dup.png`: "Máy đã nhận liệu trình") | Stage 7 đưa "Kết nối", "Nạp", "Theo dõi" vào cùng một vị trí ở chân màn | Nút "Nạp liệu trình vào máy" và "Theo dõi phiên điều trị" ở chân màn bỏ qua lần chạm trong 800 ms đầu sau khi nút hiện hoặc hết khóa (prop `armAfterMs` của `Button`, `key` riêng để nút mới được gắn lại). Lệnh, nội dung lệnh, điều kiện bật nút, hàm `send` không đổi | Kịch bản `S8-B01` đạt; ảnh `s8-b01-sau-2-sau-cham-dup.png` (vẫn ở bước 2, chưa gửi) |
| S8-B02 | P2 (điều hướng), cùng nguồn S8-B01 | T01 | Chạm nhiều lần vào "Nạp liệu trình vào máy": sau ACK lần chạm sau rơi vào "Theo dõi phiên điều trị" và mở T02 ngoài ý muốn. T02 không tự bắt đầu (đã kiểm), nhưng trái tinh thần QĐ-6 (không tự chuyển T02) | Bấm nạp ba lần liền (300 ms) | Như S8-B01 | Như S8-B01 | `S8-B02` đạt: vẫn ở T01 |
| S8-B03 | P2 (hiển thị không nhất quán, dữ liệu nguồn không đổi) | B08 Lịch sử, thẻ Số đo (`AreaProgress`), N05 (`PatientWoundDashboard`) | Ảnh chọn từ thư viện có số đo bác sĩ nhập nhưng không rõ ngày chụp (quy tắc V4 không đưa vào biểu đồ). Màn báo "Chưa có lần đo diện tích", khiến bác sĩ tưởng số vừa nhập chưa lưu | Bác sĩ, B10, "Chọn ảnh có sẵn", nhập 5,5 cm², lưu; mở Lịch sử, thẻ Số đo | Nhánh "không có điểm" không in lý do loại như nhánh có điểm | Hàm `noPointsText` (`areaProgress.ts`, có kiểm thử): có ảnh có số đo bị loại thì ghi "Chưa có lần đo nào vẽ được trên biểu đồ… Không đưa vào biểu đồ: 1 ảnh không rõ ngày chụp." Quy tắc lọc V1 đến V6 giữ nguyên | `S8-W3-04` đạt; `areaProgress.test.ts` thêm 3 ca; ảnh `s8-b03-truoc/sau-lich-su-dien-tich.png` |

Giá trị 800 ms là đề xuất: lớn hơn hai lần ngưỡng chạm đúp mặc định 300 ms của Android (`ViewConfiguration.getDoubleTapTimeout()`), chưa thử với người dùng. Không áp cho nút "Dừng điều trị" (không được làm chậm lệnh dừng).

## 2. Lỗi của kịch bản kiểm thử (không phải lỗi ứng dụng)

| Mã | Kịch bản | Nguyên nhân đã xác định | Xử lý |
|---|---|---|---|
| S8-K01 | `kiem-thu-p0.cjs`, `kiem-thu-dot-8.cjs`, `kiem-thu-dot-11.cjs` dừng ở dòng bấm "Nạp liệu trình vào máy" trên N02 | **Phụ thuộc thứ trong tuần.** N02 chỉ hiện nút khi hôm nay có buổi điều trị; đợt mẫu của BN001 giai đoạn 2 là 3 buổi mỗi tuần (thứ 2, 4, 6, `WEEK_DAYS[3]`). Chạy ngày 14/11/2026 (thứ 7) nên không có nút. Ứng dụng tính "hôm nay" theo giờ Việt Nam (UTC+7, `localDay`), nên sau 17:00 UTC đã sang ngày hôm sau. Báo cáo Stage 7 ghi nguyên nhân là "từ Stage 5 N02 không còn nút": **không đúng** (nút vẫn ở `patient/index.tsx` dòng 126 đến 128, đã kiểm bằng đồng hồ lệch sang thứ 2) | Thêm `scripts/ngay-co-lich.cjs`: tiến đồng hồ trình duyệt kiểm thử 0 đến 2 ngày tới ngày có lịch (tính theo giờ Việt Nam), không đổi mã ứng dụng. Sau khi thêm: p0 47/47, dot-8 33/33, dot-11 34/34 (lần đầu chạy hết từ Stage 5) |
| S8-K02 | `dot-8` D8-03d, D8-03e, D8-03h | Stage 7 (PR 57, đã duyệt) đổi hộp thoại `window.confirm` khi rời T02 thành khung hỏi trong chân màn | Cập nhật ca kiểm theo khung hỏi `leave-ask`, giữ ý nghĩa kiểm |
| S8-K03 | `dot-8` D8-04, D8-05 | Stage 6 (PR 56) chuyển phân công sang thẻ "Phân công" và khóa, quyền sang trang chi tiết Q01b; người dùng chốt 14/11/2026 (commit 3779119) mở khóa và thu quyền đều hỏi xác nhận | Thêm bước mở thẻ "Phân công"; D8-05 dùng nút ở Q01b; D8-05c, D8-05f kiểm "hỏi một lần" theo quyết định mới |
| S8-K04 | `tb-5` TB5-07 | PR 55 (đã duyệt) đổi "Lịch sử vết thương (n)" ở N05 thành thẻ "Lịch sử (n)" cạnh "Ảnh (n)" | Cập nhật biểu thức tìm chữ |
| S8-K05 | `dot-9` 4 lỗi D9-01, 08, 09, 10 | Kịch bản cần bản dựng tiêm AR (`tiem-ar-kiem-thu.cjs`), không phải bản dựng thường | Dựng bản tiêm AR ở bản sao riêng (không commit): 13/13 đạt. Trong lượt hồi quy chung (bản thường) vẫn 9/13, như mọi giai đoạn trước |
| S8-K06 | `scripts/kiem-tra-kotlin.sh` | Tải `android-all-15-robolectric-12650502.jar` từ Maven Central trả 404 trong môi trường này | Không chạy được; mô-đun Kotlin không đổi trong Stage 8 |

## 3. Backlog (chưa sửa, cần duyệt)

| Mã | Mức | Mô tả | Bằng chứng | Vì sao chưa sửa | Đề xuất |
|---|---|---|---|---|---|
| S8-B04 | P2 (dữ liệu hiển thị thiếu, dữ liệu nguồn không sai) | N07 (tab Thiết bị) nút "Theo dõi phiên điều trị" mở T02 không kèm `woundId`. T02 ghi "Chưa chọn vết thương nên không hiện liệu trình", phiên ghi không gắn vết thương. `course.ts` vẫn tính phiên này vào đợt (`!s.woundId \|\| s.woundId === woundId`), còn N05 và dòng thời gian lọc `s.woundId === w.id` nên **không hiện** phiên trong "Lịch sử" của vết thương | `patient/device.tsx:27`; `PatientWoundDashboard.tsx:60`; `wound-history/[woundId]/index.tsx:115`; kịch bản `S8-DI-01` | Sửa sẽ đổi dữ liệu được ghi (gắn vết thương) hoặc quy tắc gán phiên cho vết thương; bệnh nhân có hai vết thương thì không biết gán vết nào | Khi bệnh nhân có đúng một vết thương đang có đợt áp dụng, N07 truyền `woundId` như N02 làm qua T01; nhiều vết thì mở T01. Cần người dùng duyệt |
| S8-B05 | P2 (phân quyền phòng vệ nhiều lớp, không lộ qua giao diện) | Trong `store.tsx`, `addReport`, `setReportHandled`, `resolveSyncError` không kiểm vai trò người gọi (các hàm khác có `requireDoctor`, `requireAdmin`). Giao diện hiện chỉ gọi đúng vai trò nên không khai thác được qua màn hình | `store.tsx` dòng 641 đến 652 | Mục 8 và 11: không đổi logic phân quyền trong Stage 8 | Thêm kiểm vai trò tương ứng khi có backend thật (phân quyền phải ở máy chủ, xem `de-xuat-backend.md`) |
| S8-B06 | P2 (rủi ro mất cập nhật, chưa tái hiện qua giao diện) | `commit()` tính bản mới từ `dataRef.current` trước khi `await AsyncStorage.setItem`; hai lần ghi chồng nhau (ví dụ lưu số đo và loại ảnh liền nhau) thì lần sau ghi đè lần trước | `store.tsx` dòng 163 đến 172 | Đổi lớp dữ liệu, ngoài phạm vi | Xếp hàng các lần `commit` (chuỗi Promise) hoặc tính lại từ bản mới nhất sau khi ghi |
| S8-B07 | P3 (chỉ giả lập) | Tải lại trang khi đang ở T02: máy giả lập tạo mới, mất liệu trình đã nạp; nút "Bắt đầu điều trị" (chỉ có ở giả lập) bấm không có phản hồi | Kịch bản `S8-T-01b` | Lớp giả lập trong `src/lib/device`, không sửa trong Stage 8 | Giả lập báo "Máy chưa có liệu trình" hoặc ẩn nút khi chưa nạp |
| S8-B08 | P3 | T02, khi mất kết nối lúc đang điều trị: nút "Kết nối" ở chân màn; kết nối lại thì "Dừng điều trị" hiện ở vị trí đó. Chạm đúp "Kết nối" có thể bấm luôn "Dừng" (thao tác về phía an toàn) | Đọc mã `session-monitor.tsx` dòng 140 đến 150; chưa có kịch bản | Không được làm chậm nút Dừng; cần review chuyên môn xem dừng ngoài ý muốn có chấp nhận được không | Review chuyên môn |
| S8-B09 | Ghi nhận cho review lâm sàng | N02 ẩn nút nạp vào ngày nghỉ theo lịch, nhưng T01 (vào từ tab Thiết bị) vẫn cho nạp liệu trình mọi ngày. Ứng dụng chỉ nạp cấu hình; việc chặn theo lịch được giả định do máy làm | `connect-device.tsx:67` (`canSend` không xét lịch) | Không đổi logic điều trị | Xác nhận với nhóm phần cứng: máy có tự chặn ngày nghỉ không |
| S8-B10 | P3 | Nhãn ô diện tích khác nhau: B10 "Diện tích bác sĩ đo (cm²)", B11 "Diện tích bác sĩ đã đo" | Kịch bản `S8-NV-05` | Chữ giao diện, không ảnh hưởng chức năng | Thống nhất một nhãn khi làm đợt giao diện sau |

## 4. Lỗi P0, P1 còn mở

Không có P0. S8-B01 (P1) đã sửa trong PR Stage 8 và đạt kiểm thử giả lập; **chưa xác nhận trên máy thật** (BLOCKED) và chờ review chuyên môn vì liên quan lệnh xuống thiết bị.
