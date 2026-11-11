# Bước 12. Product verification and validation

Trạng thái: **bản nháp**. Verification bằng kiểm thử tự động đã chạy; validation với người dùng chưa làm (kịch bản ở [08-kiem-chung-thiet-ke.md](08-kiem-chung-thiet-ke.md) mục 8.3).

## 12.1. Kết quả kiểm thử tự động

Chạy ngày 11/11/2026 trên nhánh `trien-khai/giai-doan-2` (gốc là đỉnh PR 11, đã có bước 6 và 7):

| Lệnh | Kết quả |
|---|---|
| `npm test` (25 tệp kiểm thử, gồm `ai/result`, `attention` của PR 11 và `usb-android` của giai đoạn 2) | Tất cả đạt |
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
| FR4 | DR5 | `simulated.test.cjs` (bản tin STA) | Chờ F11 |
| FR5 | DR11 | `naming.test.ts`, `quality.test.cjs`, `steady.test.cjs`, `motion-adapter.test.cjs`, `ar.test.cjs` | V3 |
| FR6 | Không | Chưa có | V6 |
| FR7 | Không | `plausibility.test.ts` | V4 |
| FR8 | Không | Ngoài phạm vi lập trình (KT1) | Không |
| FR9 | DR7 | `course.test.ts` | V1 |
| FR10 | DR9, DR10 | `adherence.test.ts`, `attention.test.ts` | V2 |
| FR11 | DR12 | `woundDetect.test.cjs`, `ai/result.test.ts` | So với bác sĩ khi có mô-đun thật |
| FR12 | DR13 | `workflow.test.cjs` | Kiểm bản xuất |
| FR13 | Không | `devices.test.ts` | Thử tay |
| FR14 | Không | `maintenance.test.ts` | Không |
| FR15 đến FR17 | DR11 | `naming.test.ts` | Chờ phương pháp gán nhãn |
| FR18 | DR14 | `workflow.test.cjs` (quyền bác sĩ phụ trách) | Thử tay: tạo, tìm, kích hoạt một hồ sơ |
| NFR3 | DR5 | `simulated.test.cjs` | Chạy với mạch thật |
| NFR4 | DR8 | `theme.contrast.test.ts` | V4 |
| NFR5 | DR6, DR9 | `localDay.test.ts`, `vectors.test.cjs` | Không |
| Quyền (NFR1 phía ứng dụng) | DR14 | `workflow.test.cjs`, `assessment.test.ts` | Không |

Chỗ trống: FR3, FR6, FR8 chưa có kiểm thử tự động; FR3 và FR8 vì nằm ngoài phần lập trình hiện tại, FR6 vì ngưỡng chờ bác sĩ.
