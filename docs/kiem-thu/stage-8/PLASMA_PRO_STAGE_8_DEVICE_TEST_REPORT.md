# Plasma Pro, Stage 8: báo cáo kiểm thử thiết bị (T01, T02)

Ngày 14/11/2026. Nền master `dbad553`, nhánh `ui/tb-8-hoi-quy`.

## 0. Kết luận

| Hạng mục | Kết quả |
|---|---|
| Kiểm thử phần mềm với **thiết bị giả lập** | Đạt sau khi sửa S8-B01, S8-B02 (xem mục 3) |
| Kiểm thử **thiết bị thật** (USB, UART, firmware) | **BLOCKED**: không có máy, chưa có APK SDK 58 dựng cho thử |
| Dừng khẩn cấp với **máy thật** | **BLOCKED**: giao thức USB/UART (`protocol.config.ts`, ICD `docs/thiet-ke/icd-usb-uart.md`) chỉ có `CFG`, `INF`, `CAP` từ ứng dụng xuống máy, **không có lệnh dừng**. Ứng dụng không có cơ chế dừng máy thật; không tự thêm cơ chế |
| Dừng với giả lập | Đạt: chỉ báo "Máy đã xác nhận: Đã dừng" sau bản tin `STA` gửi về sau lúc bấm |
| Hardware verification | **Chưa đạt, chưa thực hiện** |

Kết quả giả lập không chứng minh máy thật hoạt động đúng. Không được dùng báo cáo này để tuyên bố hệ thống an toàn cho sử dụng lâm sàng.

## 1. Phân biệt nguồn kiểm thử

| Nguồn | Phạm vi | Dùng trong Stage 8 |
|---|---|---|
| Kiểm thử đơn vị lớp thiết bị (`src/lib/device/*.test.cjs`: checksum, spec, protocol, vectors, simulated, sender, trace, usb-android, session-tracker) | Đóng gói khung, mã kiểm, thời gian chờ ACK, số lần gửi, theo dõi phiên | `npm test` đạt |
| Kiểm thử giao diện trên bản web với `SimulatedTransport` | Luồng T01, T02, trạng thái hiển thị, chống gửi lặp, dừng giả lập | `kiem-thu-tb-7.cjs`, `kiem-thu-tb-8.cjs`, `p0`, `dot-8`, `dot-11` |
| Kiểm kiểu Kotlin mô-đun USB (`kiem-tra-kotlin.sh`) | Cú pháp, kiểu mã Android | Không chạy được: tải thư viện android-all trả 404 trong môi trường này |
| Máy thật qua cáp USB OTG | Mọi thứ còn lại | BLOCKED |

## 2. Ca kiểm thử thiết bị

Cột "Nguồn" ghi kịch bản; G = giả lập, T = máy thật.

| Mã | Ca | Nguồn | G | T |
|---|---|---|---|---|
| D-01 | Device Overview: thanh trạng thái và bảng 6 mục, không hiện "Sẵn sàng", "Đã kết nối" khi chưa kết nối | TB7-01..03 | Đạt | BLOCKED |
| D-02 | USB Connection: kết nối, ngắt, kết nối lại | TB7-04, 07, 08 | Đạt | BLOCKED |
| D-03 | UART: gửi CFG, nhận ACK, giờ nhận | TB7-05, TP-DV-03, S8-W5-02 | Đạt | BLOCKED |
| D-04 | Không gửi lặp lệnh: bấm nạp 3 lần liền ghi đúng 1 lần nạp | S8-W5-02 | Đạt | BLOCKED |
| D-05 | **Chạm đúp "Kết nối" không gửi liệu trình** | S8-B01 | Trước sửa: **LỖI** (gửi CFG). Sau sửa: Đạt | BLOCKED |
| D-06 | Chạm nhiều lần vào nút nạp không mở T02 | S8-B02 | Trước: LỖI. Sau: Đạt | BLOCKED |
| D-07 | QĐ-6: sau ACK chờ 5 giây vẫn ở T01 | TB7-06, S8-W5-03 | Đạt | BLOCKED |
| D-08 | Mở T02 không tự bắt đầu phiên | TB7-10, S8-W5-04 | Đạt | BLOCKED |
| D-09 | Device Status khi đang điều trị: "Máy đang bận" | TB7-11 | Đạt | BLOCKED |
| D-10 | Session Recovery: tải lại trang giữa phiên không tự kết nối, không tự bắt đầu, không nạp lại, không báo "Máy đang bận" | S8-NV-01 | Đạt | BLOCKED |
| D-11 | Tải lại giữa phiên không ghi phiên giả | S8-NV-02 | Đạt | BLOCKED |
| D-12 | Tải lại T02 giữ `patientId`, `woundId` trên URL | S8-NV-01b | Đạt | Không áp dụng (ứng dụng điện thoại không tải lại trang; tương đương là chuyển nền) |
| D-13 | Rời T02 khi đang chạy: hỏi trong chân màn, "Rời màn không dừng máy" | TB7-13, 14, 19; D8-03d, e, h | Đạt | BLOCKED |
| D-14 | Mở lại T02 khi máy còn chạy: hiện theo bản tin mới, có nút Dừng | TB7-20 | Đạt | BLOCKED |
| D-15 | Emergency Stop luôn thấy, không bị che ở 320, 360, 390, 768 px | TB7-11, 13 | Đạt | BLOCKED |
| D-16 | Emergency Stop luôn thấy, không bị che ở 1024, 1280 px | S8-RS-04 | Đạt | BLOCKED |
| D-17 | Không xác nhận đã dừng khi chưa có STA: "Đang chờ máy xác nhận"; quá 5 giây báo đỏ "Chưa coi là đã dừng" | TB7-15, S8-T-02, `sessionDisplay.test.ts` | Đạt | BLOCKED |
| D-18 | Bấm thêm vào chỗ nút Dừng cũ không bắt đầu phiên mới | TB7-16 | Đạt | BLOCKED |
| D-19 | Mỗi phiên ghi đúng một bản ghi (dừng giữa chừng, đủ thời gian) | TB7-17, 21, 22; S8-T-03 | Đạt | BLOCKED |
| D-20 | Mất kết nối giữa phiên: "Không rõ trạng thái", không suy ra máy chạy hay dừng | `deviceStatusView.test.ts`, `sessionDisplay.test.ts` | Đạt (đơn vị) | BLOCKED |
| D-21 | Lỗi mở cổng, không tìm thấy thiết bị | `usb-android.test.cjs` | Đạt (đơn vị); giao diện chưa kiểm được vì giả lập luôn mở được | BLOCKED |
| D-22 | Dừng khẩn cấp qua ứng dụng với máy thật | Không có lệnh trong giao thức | Không áp dụng | **BLOCKED** |
| D-23 | Phiên mở từ N07 gắn đúng vết thương | S8-DI-01 | Xem báo cáo hồi quy; backlog S8-B04 | BLOCKED |

## 3. Lỗi liên quan thiết bị

- **S8-B01 (P1, cần review chuyên môn)**: chạm đúp "Kết nối" gửi CFG ngoài ý muốn. Nguyên nhân: Stage 7 đặt ba nút của ba bước vào cùng một chỗ ở chân màn. Sửa: nút "Nạp liệu trình vào máy" và "Theo dõi phiên điều trị" bỏ qua lần chạm trong 800 ms đầu sau khi hiện hoặc hết khóa. Không đổi: nội dung lệnh, giao thức, hàm `link.send`, `sendConfig`, điều kiện `canSend`, thời gian chờ ACK, số lần gửi lại, cơ chế dừng.
- **S8-B02 (P2)**: cùng nguồn, sau ACK mở T02 ngoài ý muốn. Cùng cách sửa.
- **S8-B07 (P3, giả lập)**, **S8-B08 (P3, cần review)**, **S8-B09 (review lâm sàng)**: xem backlog.

Theo mục 8 của đặc tả: hai lỗi S8-B01, S8-B02 được đánh dấu mức cao và chuyển review chuyên môn; cách sửa chỉ ở lớp giao diện.

## 4. Logic thiết bị giữ nguyên

`git diff dbad553 -- src/lib/device modules` rỗng. Không đổi: giao thức USB/UART, firmware, lệnh, thông số và trình tự điều trị, `useDeviceLink`, `session-tracker`, cách ghi phiên, nút Dừng (không gắn `armAfterMs`).

## 5. Việc cần để mở BLOCKED

1. Dựng APK SDK 58 (hồ sơ EAS `usb-thu`), có máy Plasma Pro và cáp OTG.
2. Chạy lại D-02 đến D-21 trên máy thật, ghi nhật ký `trace`.
3. Firmware bổ sung lệnh dừng từ ứng dụng (cập nhật ICD), rồi mới làm và kiểm D-22.
4. Xác nhận các giả định: máy có nút dừng vật lý; ngưỡng 5 giây chờ xác nhận dừng; máy tự chặn ngày nghỉ theo lịch (S8-B09).
