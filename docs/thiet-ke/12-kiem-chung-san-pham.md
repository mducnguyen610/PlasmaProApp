# Bước 12. Product verification and validation

Trạng thái: **bản nháp**. Verification bằng kiểm thử tự động đã chạy; validation với người dùng chưa làm (kịch bản ở [08-kiem-chung-thiet-ke.md](08-kiem-chung-thiet-ke.md) mục 8.3).

## 12.1. Kết quả kiểm thử tự động

Chạy lại ngày 11/11/2026 trên nhánh `sua-loi/ra-soat-pr-10-13` (gốc là đỉnh PR 13, cộng bản sửa theo rà soát):

| Lệnh | Kết quả |
|---|---|
| `npm test` (26 tệp kiểm thử, thêm `session-tracker`) | Tất cả đạt |
| `npx expo lint` | Không lỗi |
| Biên dịch mô-đun gốc Kotlin | **Chưa chạy**: môi trường dựng mã không có Android SDK |
| `npx tsc --noEmit` | Không lỗi |

Tệp này cập nhật lại sau mỗi pull request mã của giai đoạn 2.

## 12.2. Ma trận truy vết FR, NFR sang kiểm thử

| FR, NFR | DR | Kiểm thử tự động | Thử tay hoặc validation |
|---|---|---|---|
| FR1 | DR8, DR9 | `course.test.ts`, `localDay.test.ts` | V4 |
| FR2 | DR1 đến DR6, DR15 | `checksum`, `spec`, `protocol`, `vectors`, `simulated`, `sender`, `trace`, `usb-android` (`src/lib/device/*.test.cjs`) | V5; thử với mạch thật (bước 13) |
| FR3 | Không | Chưa có (chờ WCMD) | Không |
| FR4 | DR5, DR16 | `simulated.test.cjs` (bản tin STA), `session-tracker.test.cjs` | T02; nhật ký trong máy chờ F11 |
| FR5 | DR11 | `naming.test.ts`, `quality.test.cjs`, `steady.test.cjs`, `motion-adapter.test.cjs`, `ar.test.cjs` | V3 |
| FR6 | DR17 | Chưa có | V6 |
| FR7 | DR18 | `plausibility.test.ts` | V4 |
| FR8 | Không | Ngoài phạm vi lập trình (KT1) | Không |
| FR9 | DR7 | `course.test.ts` | V1 |
| FR10 | DR9, DR10 | `adherence.test.ts`, `attention.test.ts` (có trạng thái Bỏ lỡ) | V2 |
| FR11 | DR12 | `woundDetect.test.cjs`, `ai/result.test.ts` | So với bác sĩ khi có mô-đun thật |
| FR12 | DR13 | `workflow.test.cjs` | Kiểm bản xuất |
| FR13 | DR19 | `devices.test.ts` | Thử tay B04 (giao, thu hồi), T01 (chặn khi chưa giao máy) |
| FR14 | Không | `maintenance.test.ts` | Không |
| FR15 đến FR17 | DR11 | `naming.test.ts` | Chờ phương pháp gán nhãn |
| FR18 | DR14, DR20 | `workflow.test.cjs` (quyền bác sĩ phụ trách); chưa có kiểm thử cho mã hồ sơ, chặn trùng và lịch sử sửa | Thử tay: tạo, tìm, kích hoạt một hồ sơ |
| NFR3 | DR5 | `simulated.test.cjs` | Chạy với mạch thật |
| NFR4 | DR8 | `theme.contrast.test.ts` | V4 |
| NFR5 | DR6, DR9 | `localDay.test.ts` (múi giờ Hồ Chí Minh, New York, UTC, Tokyo), `vectors.test.cjs` | Không |
| Quyền (NFR1 phía ứng dụng) | DR14 | `workflow.test.cjs`, `assessment.test.ts` | Không |

Chỗ trống: FR3, FR6, FR8 chưa có kiểm thử tự động; FR3 và FR8 vì nằm ngoài phần lập trình hiện tại, FR6 vì ngưỡng chờ bác sĩ. FR18 mới có kiểm thử phần quyền.
