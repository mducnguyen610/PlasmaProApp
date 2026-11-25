# Plasma Pro: backlog giảm cuộn và giao diện theo tác vụ

Ngày: 13/11/2026. Trạng thái: chờ duyệt. Chưa có PR mã. Base dự kiến: `master` `13b68bf`.

## 1. Hạng mục

Cỡ: S dưới nửa ngày, M khoảng một ngày, L hơn một ngày. Ưu tiên: P1 an toàn hoặc hoàn tất tác vụ chính, P2 tốn thao tác, P3 tiện lợi.

| ID | Hạng mục | Màn, tệp | Phát hiện | Ưu tiên | Cỡ | Phụ thuộc | Trạng thái |
|---|---|---|---|---|---|---|---|
| TB-01 | `Screen` thêm `footer`; chừa đáy nội dung; xử lý bàn phím | `src/components/ui.tsx` | Nền | P1 | M | Không | Chờ duyệt |
| TB-02 | Thành phần `Sheet` (Modal, nút Đóng, Back đóng, một lớp) | `src/components/Sheet.tsx` (mới) | Nền | P3 | S | Không | Chờ duyệt |
| TB-03 | T01 nút chính theo trạng thái vào footer | `src/app/connect-device.tsx` | TB-A12 | P1 | M | TB-01 | Chờ duyệt |
| TB-04 | B13 hai nút vào footer | `src/app/devices/[id].tsx` | TB-A06 | P2 | S | TB-01 | Chờ duyệt |
| TB-05 | N07 Notice và ba nút lên trên `DeviceView` | `src/app/patient/device.tsx` | TB-A11, TB-A15 | P2 | S | Không | Chờ duyệt |
| TB-06 | B03 footer + `useDiscardGuard` | `src/app/patients/new.tsx` | TB-A18 | P2 | S | TB-01 | Chờ duyệt |
| TB-07 | B10 tách bước 2, 3; footer theo bước; khung camera lớn | `src/app/guided-capture.tsx` | TB-A05, TB-A17 | P1 | M | TB-01 | Chờ duyệt |
| TB-08 | B11 chế độ đo tập trung, footer Hủy/Lưu | `src/app/images/[id].tsx` | TB-A03, TB-A09 | P1 | M | TB-01, QĐ-TB-2 | Chờ duyệt |
| TB-09 | B07 footer Lưu + "Còn n mục bắt buộc" (A) hoặc 4 bước (B) | `src/app/evaluate/[woundId].tsx` | TB-A02, TB-A16 | P1 | M (A) / L (B) | TB-01, QĐ-TB-1 | Chờ duyệt |
| TB-10 | B06 footer bước; "Các phiên bản" thu gọn | `src/app/plan/[patientId].tsx` (nhánh bác sĩ) | TB-A04, TB-A10, TB-A19 | P2 | M | TB-01; sau PR P2 có P2-05a | Chờ duyệt |
| TB-11 | B05 tóm tắt + lối vào + footer; màn đọc "Lịch sử vết thương"; Sheet giải thích | `src/app/wounds/[id].tsx`, `src/app/wounds/[id]/history.tsx` (mới) | TB-A01, TB-A08, TB-A14 | P1 | L | TB-01, TB-02, PR-P2-2, PR-P2-3, QĐ-TB-3 | Chờ duyệt |
| TB-12 | N03 lối vào N06 | `src/app/schedule.tsx` | TB-A13 | P2 | S | PR-P2-5 | Chờ duyệt |
| TB-13 | Công cụ đo cuộn thành kịch bản kiểm thử, ngưỡng hồi quy | `scripts/kiem-thu-tb.cjs` (mới) | Kiểm thử | P1 | S | TB-01 | Chờ duyệt |

## 2. PR dự kiến (nhỏ, độc lập)

| PR | Hạng mục | Base | Tệp | Đụng P2 | Ghi chú |
|---|---|---|---|---|---|
| PR-TB-1 Nền | TB-01, TB-02, TB-13 | `master` | `ui.tsx`, `Sheet.tsx`, `scripts/kiem-thu-tb.cjs` | Không | Không đổi màn nào; chỉ thêm khả năng |
| PR-TB-2 Thiết bị | TB-03, TB-04, TB-05 | Nhánh PR-TB-1 | `connect-device.tsx`, `devices/[id].tsx`, `patient/device.tsx` | Không | Ưu tiên cao nhất vì TB-A12; chạy lại toàn bộ kịch bản P0 thiết bị |
| PR-TB-3 B03 | TB-06 | Nhánh PR-TB-1 | `patients/new.tsx` | Không | Nhỏ |
| PR-TB-4 B10 | TB-07 | Nhánh PR-TB-1 | `guided-capture.tsx` | Không | |
| PR-TB-5 B11 | TB-08 | Nhánh PR-TB-1 | `images/[id].tsx` | Không | |
| PR-TB-6 B07 | TB-09 | Nhánh PR-TB-1 | `evaluate/[woundId].tsx` | Không | |
| PR-TB-7 B06 | TB-10 | `master` sau PR-TB-1 và PR P2 chứa P2-05a | `plan/[patientId].tsx` | Có | |
| PR-TB-8 B05 | TB-11 | `master` sau PR-TB-1, PR-P2-2, PR-P2-3 | `wounds/[id].tsx`, route mới | Có | Lớn nhất; làm cuối |
| PR-TB-9 N03 | TB-12 | `master` sau PR-P2-5 | `schedule.tsx` | Có | Có thể gộp vào P2 nếu người dùng muốn |

Thứ tự merge đề xuất: PR-TB-1, rồi PR-TB-2, 3, 4, 5, 6 (độc lập với nhau, cùng base PR-TB-1), rồi PR-TB-7, 8, 9 sau các PR P2 tương ứng.

Sau mỗi PR: `npx tsc --noEmit`, `npx expo lint`, `npm test`, kịch bản giao diện cũ, ảnh 320/360/390/768, kiểm Back và dữ liệu chưa lưu, tràn ngang, nút chính, điều khiển an toàn thiết bị (chi tiết ở TEST_PLAN). Không merge khi chưa có duyệt.

## 3. Quyết định chờ người dùng

| Mã | Câu hỏi | Phương án | Khuyến nghị | Lý do, độ tin cậy |
|---|---|---|---|---|
| QĐ-TB-1 | B07: giữ 3 nhóm thu gọn + footer, hay chia 4 bước? | A: nhóm + footer. B: 4 bước có bước xem lại | A | Ít đổi nhất; khối "Sẽ lưu" và nhảy "Sửa" về nhóm đang chạy (P0 SV-04). Chia bước bất lợi khi phải qua lại giữa nhóm [1]. Trung bình: chưa thử với bác sĩ |
| QĐ-TB-2 | B11: nhập diện tích là chế độ trong màn, hay route riêng `/images/[id]/measure`? | A: chế độ trong màn. B: route riêng | A | Không thêm route, giữ nguyên hàng đợi và `patientChanged`; nhược điểm: Back hệ thống rời màn chứ không chỉ thoát chế độ (có hỏi). Trung bình |
| QĐ-TB-3 | B05: album và đánh giá cũ chuyển sang màn "Lịch sử vết thương" riêng không? | A: màn đọc riêng, dùng chung bố cục với P2-07a. B: giữ ở B05, thu gọn bằng mục thu gọn | A | Giảm khoảng 900 px; nhưng phụ thuộc thiết kế P2-03a (ảnh nối điểm biểu đồ). Thấp đến trung bình, vì P2 chưa làm |
| QĐ-TB-4 | Làm PR-TB-2 (T01, B13, N07) trước, ngay sau PR-TB-1? | Có / Không | Có | TB-A12 là phát hiện liên quan an toàn quy trình (phiên chỉ ghi khi T02 mở); thay đổi chỉ vị trí nút |

## 4. Không làm trong phạm vi này

- Không đổi logic tự chuyển T01 sang T02 (QĐ-6 chưa trả lời).
- Không đổi nội dung câu lâm sàng, ngưỡng, liều, thang đánh giá.
- Không đổi N02, N04, N05, N08 ngoài những gì P2 đã lên kế hoạch.
- Không đổi bộ chọn ngày ở B06.
- Không thêm tự lưu nháp.

## Tài liệu tham khảo

1. Nielsen, J. (2006). *Progressive Disclosure*. Nielsen Norman Group. https://www.nngroup.com/articles/progressive-disclosure/
2. Backlog P2: `/mnt/project-files/datn/p2-patient-experience/PLASMA_PRO_P2_IMPLEMENTATION_BACKLOG.md`.
