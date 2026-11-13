# Plasma Pro: bản đồ phụ thuộc giao diện theo tác vụ

Ngày: 13/11/2026. Mã nguồn: `master` `13b68bf`. Đi kèm `PLASMA_PRO_TASK_BASED_UI_IMPLEMENTATION_PLAN.md`.

## 1. Sơ đồ phụ thuộc giữa PR

```
                         ┌──────────────────────┐
                         │ PR-TB-1 Nền (GĐ-0)   │  Screen.footer, Sheet,
                         │ ui.tsx, Sheet.tsx    │  kiem-thu-tb.cjs
                         └──────────┬───────────┘
        ┌──────────────┬────────────┼─────────────┬──────────────┬──────────────┐
        ▼              ▼            ▼             ▼              ▼              ▼
  PR-TB-2 B07    PR-TB-3 B10   PR-TB-4 B11   PR-TB-5 B06,B03  PR-TB-11 T01,B13  PR-TB-6 B04 (kiểm thử)
                                                  ▲
                                                  ┆ chồng tệp mềm
                                            PR P2 chứa P2-05a

  PR-P2-2 Biểu đồ ──► PR-P2-3 Ảnh, lịch sử vết ──► PR-TB-7 B05 + Lịch sử vết thương ◄── PR-TB-1
  PR-P2-5 Lịch trình ─────────────────────────────► PR-TB-9 N03 → N06

  Độc lập (không cần footer): PR-TB-8 N07, PR-TB-10 Q01, Q02
```

Chú thích: mũi tên liền là phụ thuộc cứng (phải merge trước). Đường chấm là chồng tệp nhưng khác nhánh mã (bác sĩ, bệnh nhân): PR nào merge sau thì gộp `master`.

## 2. Ma trận tệp và PR

Dấu ✎ là sửa, ＋ là tạo mới, ◦ là chỉ kiểm thử. Cột P2 ghi PR P2 cũng sửa tệp đó (theo backlog P2).

| Tệp | TB-1 | TB-2 | TB-3 | TB-4 | TB-5 | TB-6 | TB-7 | TB-8 | TB-9 | TB-10 | TB-11 | P2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `src/components/ui.tsx` | ✎ | | | | | | | | | | | Không |
| `src/components/Sheet.tsx` | ＋ | | | | | | ◦ | | | | | Không |
| `scripts/kiem-thu-tb.cjs` | ＋ | | | | | ✎ | | | | | | Không |
| `src/app/evaluate/[woundId].tsx` | | ✎ | | | | | | | | | | Không |
| `src/app/guided-capture.tsx` | | | ✎ | | | | | | | | | Không |
| `src/app/images/[id].tsx` | | | | ✎ | | | | | | | | Không |
| `src/app/plan/[patientId].tsx` | | | | | ✎ (bác sĩ) | | | | | | | P2-05a (bệnh nhân) |
| `src/app/patients/new.tsx` | | | | | ✎ | | | | | | | Không |
| `src/app/patients/[id].tsx` | | | | | | ◦ | | | | | | Không |
| `src/app/wounds/[id].tsx` | | | | | | | ✎ (bác sĩ) | | | | | PR-P2-2, P2-3 |
| `src/app/wound-history/[woundId].tsx` | | | | | | | ＋ | | | | | Có thể dùng chung bố cục P2-07a |
| `src/app/patient/device.tsx` | | | | | | | | ✎ | | | | Không |
| `src/app/schedule.tsx` | | | | | | | | | ✎ | | | PR-P2-5 |
| `src/app/admin/index.tsx` | | | | | | | | | | ✎ | | Không |
| `src/app/admin/dataset.tsx` | | | | | | | | | | ✎ | | Không |
| `src/app/connect-device.tsx` | | | | | | | | | | | ✎ | Không |
| `src/app/devices/[id].tsx` | | | | | | | | | | | ✎ | Không |
| `src/app/session-monitor.tsx` | | | | | | | | | | | ◦ | Không |
| `src/lib/**` | | | | | | | | | | | | Không sửa trong mọi PR TB |

Không có hai PR TB cùng sửa một tệp. Điểm chạm duy nhất giữa các PR TB là `Screen.footer` của PR-TB-1.

## 3. Thành phần dùng chung bị ảnh hưởng

| Thành phần | Tệp | Dùng ở (đếm trên `13b68bf`) | Thay đổi | Ảnh hưởng tới màn khác |
|---|---|---|---|---|
| `Screen` | `ui.tsx:97` | 32 tệp | Thêm `footer?` tùy chọn; khi có footer thì bọc `KeyboardAvoidingView` và cộng chiều cao footer vào `paddingBottom` | Không, nếu không truyền `footer` (kiểm bằng 41 kiểm thử giao diện và so ảnh trước/sau ở màn không đổi) |
| `Button` | `ui.tsx:244` | Mọi màn | Không đổi | Không |
| `Header` | `ui.tsx:20` | Mọi màn | Không đổi | Không |
| `Disclosure` | `ui.tsx:476` | Nhiều màn | Không đổi; B06 dùng thêm một lần | Không |
| `StepRow` | `ui.tsx:517` | B06, B10 | Không đổi | Không |
| `Sheet` | mới | B05 (GĐ-6) | Tạo mới | Không |
| `ClinicalContext` | `ClinicalContext.tsx` | B05, B06, B07, B10, B11, T02 | Có thể thêm thuộc tính tùy chọn `compact` cho B10 bước chụp | Không, nếu mặc định giữ nguyên |
| `useDiscardGuard` | `useDiscardGuard.ts` | B06, B07, B10, B11 | Không đổi; dùng thêm ở B03 | Không |
| `DeviceView` | `DeviceView.tsx` | N07, B13/Q06 (xem ghi chú) | Không đổi nội dung; chỉ đổi vị trí so với nút ở N07, B13 | Không |
| `RoleTabs` | `RoleTabs.tsx` | Ba nhóm tab | Không đổi | Không |
| `AreaLineChart` | của P2 (chưa có) | B05, N05 | Không do TB tạo | GĐ-6 phụ thuộc |

Ghi chú `DeviceView`: tìm `DeviceView` trong `src/app` trả về `wounds/[id].tsx`, `patient/device.tsx`, `devices/[id].tsx`. Trong `wounds/[id].tsx` chỉ là chú thích ("Cùng nhãn với màn thiết bị (DeviceView)"), không dùng thành phần.

## 4. Phụ thuộc vào quyết định

| Quyết định | Chặn | Nếu chưa trả lời |
|---|---|---|
| QĐ-TB-1 | PR-TB-2 | Làm theo khuyến nghị A trên nhánh, không merge |
| QĐ-TB-2 | PR-TB-4 | Như trên |
| QĐ-TB-3 | PR-TB-7 | PR-TB-7 vốn đã chờ P2 |
| QĐ-TB-4 | Thứ tự PR-TB-11 | Theo thứ tự người dùng (thiết bị cuối) |
| QĐ-TB-5 | Thứ tự PR-TB-5 với P2-05a | Gộp `master` khi xung đột |
| QĐ-6 (cũ, chưa trả lời) | Không chặn; ràng buộc "không tự chuyển T01 sang T02" | |
| QĐ-3 (cũ, chưa trả lời) | Không liên quan | |

## 5. Phụ thuộc bên ngoài

| Phụ thuộc | Ảnh hưởng | Trạng thái |
|---|---|---|
| APK SDK 58, máy Android/iOS thật | Kiểm bàn phím che footer, cỡ chữ hệ thống, USB thật | BLOCKED |
| Máy Plasma Pro thật | Kiểm T01, T02 với ACK, NAK thật | BLOCKED |
| Bác sĩ, bệnh nhân thử | Thời gian hoàn tác vụ, mức hiểu | NOT TESTED |
| Nội dung dừng máy (CR-04) | Không đổi trong TB | Chờ nhóm phần cứng |

## 6. Rủi ro xung đột và cách xử lý

| Rủi ro | Xác suất | Xử lý |
|---|---|---|
| P2 mở PR sửa `wounds/[id].tsx` trong lúc TB làm B05 | Cao nếu làm song song | Không bắt đầu PR-TB-7 trước khi PR-P2-3 merge |
| P2-05a và PR-TB-5 cùng sửa `plan/[patientId].tsx` | Trung bình | Khác nhánh mã; người merge sau gộp `master`, chạy lại `kiem-thu-dot-8/10.cjs` |
| P2 cần `Screen.footer` (ví dụ N08) | Thấp | PR-TB-1 merge sớm để P2 dùng được |
| Thay đổi `Screen` làm lệch ảnh hồi quy | Thấp | So ảnh 41 kiểm thử giao diện trước và sau PR-TB-1 |
