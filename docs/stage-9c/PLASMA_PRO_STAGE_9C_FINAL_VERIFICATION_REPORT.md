# Plasma Pro Stage 9C: Báo cáo kiểm định cuối

Ngày 15/11/2026. Đối tượng: PR 62, nhánh `refactor/stage-9c-on-dinh`, base `fix/stage-9b-backlog` (PR 61). Căn cứ là mã nguồn và diff git (`git diff origin/fix/stage-9b-backlog..HEAD`), không dựa vào tài liệu. Mọi kết quả kiểm thử dưới đây là lần chạy thật trong kiểm định này.

## 1. Trạng thái tổng

**PARTIALLY COMPLETE.**

Lý do không đạt COMPLETE:
- Gói B, C, D chỉ sửa một phần; nhiều điểm lệch và rủi ro được ghi nhận nhưng để lại.
- Gói E chỉ là rà soát; bảo mật thật cần backend chưa có.
- Không có kiểm trên điện thoại thật và máy Plasma Pro thật.
- Phụ thuộc PR 58, 60, 61 chưa review.

Không thay đổi hành vi lâm sàng, firmware, giao thức, lược đồ dữ liệu (kiểm bằng diff: chỉ 6 tệp mã ứng dụng đổi, xem mục 2).

## 2. Ma trận gói A đến G

| Gói | Trạng thái | Tệp đổi (thực tế trong diff) | Thay đổi mã thực tế | Kiểm thử đã chạy | Kết quả | Vấn đề còn lại |
|---|---|---|---|---|---|---|
| A Rà soát | COMPLETE | `docs/stage-9c/PLASMA_PRO_STAGE_9C_ARCHITECTURE_AUDIT.md` | Không có (chỉ tài liệu, đúng phạm vi rà soát) | Đếm import, grep ranh giới | Khớp mã hiện tại | L-03 đến L-09 |
| B Tách lớp | PARTIALLY COMPLETE | `src/lib/device/treatmentConfig.ts` (30 dòng, mới), `src/app/connect-device.tsx` (7 dòng) | T01 bỏ import `@/lib/device/protocol`; 3 dòng tính `cfg/errors/wire` thay bằng `checkTreatmentConfig` | `treatmentConfig.test.cjs` (7 trường hợp so logic cũ), hồi quy 22 kịch bản | Đạt; hồi quy giống 9B | L-04, L-05, L-07, L-09 |
| C Thiết bị | PARTIALLY COMPLETE | `src/lib/device/stopRequest.ts` (31 dòng, mới), `src/app/session-monitor.tsx` (7 dòng) | Quyết định xác nhận dừng chuyển khỏi màn T02, công thức giữ nguyên | `stopRequest.test.cjs` (9 trường hợp), tb-7, p0, dot-8 | Đạt | Giao thức không có lệnh dừng gửi xuống máy (kiểm `protocol.config.ts`: chỉ CFG, ACK, NAK, STA, INF, CAP); CFG không có trường lịch |
| D Toàn vẹn dữ liệu | PARTIALLY COMPLETE | `src/lib/integrity.ts` (82 dòng, mới) | Hàm thuần chỉ đọc; **không được ứng dụng gọi** | `integrity.test.cjs`; kịch bản trình duyệt sau lưu B11 | 0 lỗi trên mẫu và dữ liệu trình duyệt | D-R1 đến D-R4, khoảng trống bộ kiểm (mục 4) |
| E Bảo mật | COMPLETE (rà soát), sửa DEFERRED | `PLASMA_PRO_STAGE_9C_SECURITY_REVIEW.md` | Không có | Đọc mã, đếm hàm có kiểm vai trò | 29/31 hàm ghi có kiểm vai trò phía ứng dụng | SEC-01 đến SEC-05 cần backend |
| F Hiệu năng | COMPLETE | `src/lib/store.tsx` (9 dòng), `scripts/do-hieu-nang-9c.cjs` (mới) | `persistedRef` bỏ ghi lại bản vừa commit | Đo 5 lần trước và sau, chạy lại trong kiểm định | Ghi 2 xuống 1, byte 28 908 xuống 14 454, lưu đúng 5/5 ở cả hai | addImage vẫn ghi 2 lần; ảnh web data URL |
| G Kiểm thử, tài liệu | COMPLETE | `package.json`, 3 tệp `.test.cjs`, 10 tài liệu | Thêm 3 kiểm thử vào `npm test` | Toàn bộ mục 7 | Đạt | Không có kiểm thử thiết bị thật |

## 3. Tuân thủ kiến trúc

Ánh xạ 5 tầng yêu cầu sang mã thực:

| Tầng | Mã thực | Tuân thủ |
|---|---|---|
| Presentation | `src/app/**`, `src/components/**` | Không truy cập AsyncStorage; không gọi codec, checksum, transport, `protocol` |
| Application | `src/lib/store.tsx` (hàm ghi, kiểm quyền, commitQueue), `src/lib/device/useDeviceLink.ts`, dịch vụ `treatmentConfig`, `stopRequest`, `deviceStatusView`, `monitorTarget`, `simStartGate` | Một phần: `store.tsx` gom cả application và infrastructure |
| Domain | `src/lib/*.ts` thuần (course, assessment, areaProgress, access, integrity...) và `types.ts` | Không import `src/app` hay `src/components` (grep: 0 kết quả) |
| Infrastructure | AsyncStorage chỉ trong `store.tsx` (grep: chỉ tệp này gọi; `commitQueue.ts`, `integrity.ts` chỉ nhắc trong chú thích) | Đạt về chỗ gọi; chưa tách thành mô-đun riêng |
| Device Communication | `src/lib/device/{protocol, codec*, checksum, sender, transport, simulated, usb-android*, trace}`, `modules/plasma-usb` | Đạt: mã native chỉ ở `usb-android*.ts` |

Vi phạm còn lại:
1. `store.tsx` là một tệp lớn trộn tầng ứng dụng và hạ tầng (L-09).
2. `patient/index.tsx` chọn đợt active đầu tiên ngay trong màn (L-07).
3. `theme.status.ts`, `types.ts`, `DeviceStatus`, `UsbLinkStatus` import kiểu và nhãn thiết bị (L-05, L-06); chỉ kiểu và chuỗi, không có mã truyền thông.
4. `device-diagnostics.tsx` dùng `checkSpec`, `trace`, chọn transport: ngoại lệ có chủ đích cho quản trị viên (L-03).

## 4. Toàn vẹn dữ liệu

| Hạng mục | Hiện trạng trong mã | Kiểm chứng |
|---|---|---|
| Bệnh nhân và vết thương | `checkIntegrity` bắt vết mồ côi | Kiểm thử chèn lỗi |
| Ảnh, số đo và vết thương | Bắt ảnh mồ côi, ảnh lệch bệnh nhân với vết; đánh giá trỏ ảnh của vết khác | Kiểm thử chèn lỗi; 0 lỗi sau lưu B11 thật |
| Phiên điều trị | Chỉ kiểm thiết bị và vết tồn tại; **chưa kiểm** phiên thuộc đúng bệnh nhân, đúng đợt | Khoảng trống |
| Cập nhật đồng thời | 9 hàm qua `commitQueue` (xếp hàng, tính lại trên bản mới nhất); `addImage` ghi ngoài hàng đợi (D-R1); 21 hàm dùng `update()` đồng bộ | `commitQueue.test.ts` 7 trường hợp |
| Lỗi ghi bền | Hàm qua commit ném `PersistError`, màn hình không báo đã lưu. **21 hàm dùng `update()` nuốt lỗi ghi** (D-R3) | Đọc mã `store.tsx` dòng 162 đến 166 |
| Lược đồ | Không có phiên bản lược đồ, không migration (D-R4) | Không đổi ở 9C |

Đánh giá tác động của `persistedRef` (gói F): chỉ bỏ ghi khi đối tượng dữ liệu hiện tại chính là đối tượng đã ghi thành công. Đường tính lại của commitQueue (rebase) vẫn ghi bản mới. Độ tin cậy cao trên web (localStorage ghi theo thứ tự gọi); trên native chưa kiểm, độ tin cậy trung bình.

## 5. Bảo mật

| Hạng mục | Phía ứng dụng (có) | Phía máy chủ (không có) |
|---|---|---|
| Phân quyền theo vai trò | 29/31 hàm ghi gọi `requireDoctor`, `requireAdmin` hoặc `can*`; 2 hàm còn lại (`authenticate`, `activateAccount`) là luồng chưa đăng nhập | Không có. Vai trò đọc từ bộ nhớ máy, sửa được |
| Xác thực | SHA-256 `salt:password`, mật khẩu mẫu trong mã | Không có KDF, không có máy chủ |
| Phiên | Mã tài khoản trong AsyncStorage, không hết hạn | Không có token |
| Dữ liệu nhạy cảm | Văn bản thường; ảnh web là data URL trong localStorage | Không mã hóa khi lưu |
| Màn chẩn đoán | Chỉ hiện cho quản trị viên | Không khóa ở bản phát hành |

**Kiểm quyền phía ứng dụng không phải bảo mật.** Không có giới hạn nào ở trên bị che giấu trong tài liệu.

## 6. Thiết bị

| Thành phần | Mã | Nhận xét |
|---|---|---|
| UI thiết bị | `connect-device.tsx` (T01), `session-monitor.tsx` (T02), `device-diagnostics.tsx` | T01, T02 chỉ gọi `link.send(...)`, `link.startSession`, `link.stopSession` qua hook; không tạo byte, không tính checksum (grep `.write(`, `Uint8Array`, `encode`: 0 kết quả trong `src/app`, `src/components`) |
| Dịch vụ ứng dụng thiết bị | `treatmentConfig.ts`, `stopRequest.ts`, `session-tracker.ts`, `labels.ts`, `capabilities.ts` | Có kiểm thử đơn vị |
| Quản lý trạng thái | `useDeviceLink.ts` (trạng thái liên kết, danh tính, STA cuối, thời điểm nhận) | Transport dùng chung, listener được dọn |
| Giao thức | `protocol.config.ts`, `protocol.ts`, `codec-text.ts`, `codec-binary.ts`, `checksum.ts`, `sender.ts` | Giá trị giả định `confirmed: false`; không đổi ở 9C |
| Transport | `transport.ts`, `simulated.ts`, `usb-android.ts`, `usb-android-core.ts` | Giả lập dùng cho mọi kiểm thử |
| Bộ chuyển đổi phần cứng thật | `usb-android.ts` + `modules/plasma-usb` (Android); iOS không có | **Chưa xác minh trên phần cứng.** Không có bằng chứng phần cứng |

## 7. Kết quả chạy kiểm thử (kiểm định 15/11/2026)

| Kiểm | Lệnh | Trạng thái | Số | Đạt | Lỗi | Bỏ qua | Giới hạn |
|---|---|---|---|---|---|---|---|
| Kiểu | `npx tsc --noEmit -p .` | Đạt | Không áp dụng | | 0 | | |
| Lint | `npm run lint` | Đạt, 0 cảnh báo | Không áp dụng | | 0 | | |
| Đơn vị | `npm test` | Đạt | 46 tệp | 46 | 0 | 0 | Node |
| Giao diện | `node scripts/kiem-thu-giao-dien.cjs` (bản 9C) | Đạt | 41 | 41 | 0 | 0 | Chromium 390×844 |
| Hồi quy Stage 8 (bản 9C) | 22 kịch bản | Giống hệt 9B | 783 | 781 | 2 | 0 | 2 lỗi tb-8 có sẵn, sửa ở PR 58 |
| Hồi quy Stage 9A (bản PR 60) | 22 kịch bản (tb-2, tb-3, p2 của nhánh 9A) | Giống 9B | 783 | 781 | 2 | 0 | Cùng 2 lỗi tb-8; không có kịch bản hình ảnh riêng của 9A |
| Stage 9B | `scripts/kiem-thu-9b.cjs` (bản 9C) | Đạt | 18 | 18 | 0 | 0 | Giả lập thiết bị |
| Stage 9C đơn vị | `integrity`, `treatmentConfig`, `stopRequest` (.test.cjs) | Đạt | 3 tệp | 3 | 0 | 0 | |
| Stage 9C hiệu năng | `scripts/do-hieu-nang-9c.cjs` 5 lần | Đạt | 5 + 5 | 10 | 0 | 0 | Trước 9B: 2 ghi, 28 908 byte; sau 9C: 1 ghi, 14 454 byte. Thời gian mở trang chủ 142 và 124 ms, trong sai số |
| Stage 9C toàn vẹn trình duyệt | Playwright + `checkIntegrity` | Đạt | 1 | 1 | 0 | 0 | Một luồng |
| dot-9 (AR) | | Không chạy | | | | | Cần bản dựng tiêm AR riêng |
| Thiết bị thật | | Không chạy | | | | | Không có phần cứng |

Hai lỗi tb-8 (S8-W3-04, S8-B01) không phải hồi quy của 9C: có trên master, 9A, 9B, 9C.

## 8. Vướng mắc còn lại

1. Lệnh dừng gửi xuống máy thật không có trong giao thức (từ Stage 7).
2. S8-B08 chờ review an toàn lâm sàng và kỹ thuật thiết bị; S8-B09 chờ nhóm phần cứng (CFG không có trường lịch).
3. Giá trị giao thức chưa được nhóm firmware xác nhận.
4. Không có backend: SEC-01 đến SEC-05.
5. PR 58, 60, 61 chưa review; PR 62 xếp chồng trên PR 61.

## 9. Cần duyệt

| Mục | Người duyệt | Nội dung |
|---|---|---|
| PR 58, 60, 61, 62 | Người dùng | Review, merge theo thứ tự 58 → 61 → 62; 60 độc lập |
| D-R1 | Người dùng, kỹ thuật | Đưa `addImage` vào hàng đợi commit |
| D-R2 | Người dùng | Đổi cách lưu ảnh trên web (IndexedDB hoặc tệp) |
| D-R3 | Người dùng | Chuyển 21 hàm `update()` sang `commit` để báo lỗi ghi |
| L-07 | Bác sĩ | Quy tắc chọn đợt khi có nhiều đợt active |
| Gắn `checkIntegrity` vào ứng dụng | Người dùng | Ví dụ cảnh báo ở màn quản trị |
| S8-B08, S8-B09, lệnh dừng | Lâm sàng, phần cứng, firmware | Như mục 8 |

## 10. Khuyến nghị cho Stage 10

**Chưa sẵn sàng bắt đầu Stage 10 cho đến khi** PR 58, 61 và 62 được review và merge (để nền chung có S8-B01, S8-B03 và hàng đợi commit), và người dùng quyết định D-R3, vì Stage 10 nếu chạm luồng lưu sẽ kế thừa lỗi ghi im lặng. Nếu Stage 10 chỉ là giao diện hoặc tài liệu, có thể bắt đầu sau khi merge, với D-R1 đến D-R3 ghi rõ là rủi ro đã biết. Stage 10 chưa được bắt đầu.
