# Giai đoạn 5.3. Wireframe màn hình và trạng thái lỗi

Trạng thái: **bản nháp** (11/11/2026). Wireframe mức thấp (bố cục, nội dung, thao tác), vẽ lại từ mã nhánh `trien-khai/giai-doan-2` (commit `a2719c8`). Màu, phông, kích thước theo `src/theme.ts` và không vẽ ở đây. Mã màn theo [giao-dien-01-danh-sach-man.md](giao-dien-01-danh-sach-man.md); luồng giữa các màn theo [giao-dien-02-luong-man.md](giao-dien-02-luong-man.md).

## Quy ước

- `[ Nút ]` nút bấm; `( Chip )` nhãn trạng thái; `< Quay lại` nút quay lại ở đầu màn; `▢` ô tích; `▾` mục thu gọn; `____` ô nhập.
- `!` thông báo màu đỏ (lỗi), `i` thông báo xanh hoặc vàng (thông tin, cảnh báo).
- Chữ trong ngoặc kép là chuỗi đúng như trong mã. Chữ đánh dấu **(đề xuất)** là nội dung chưa có trong mã.
- Mọi màn dài cuộn dọc; thanh tab cố định ở đáy với các màn có tab.
- Yêu cầu chung cho mọi màn (NFR4): tương phản chữ ít nhất 4,5:1 [3], vùng chạm ít nhất 44 pt [4] (mã dùng 48 cho dòng tích của người bệnh, theo [5]), chữ thân ít nhất 17 px với người bệnh.

Khung chung của màn có tab:

```
┌──────────────────────────────────────┐
│ Tiêu đề màn                  (11/11) │  đầu màn: tiêu đề, dòng phụ, ô ngày
│ Dòng phụ                             │
├──────────────────────────────────────┤
│                                      │
│  nội dung, cuộn dọc                  │
│                                      │
├──────────────────────────────────────┤
│  Tab1   Tab2    ( + )   Tab3   Tab4  │  nút giữa tròn nổi, có nhãn
└──────────────────────────────────────┘
```

---

## A. Màn thiết bị và trạng thái lỗi USB/UART

Phần này chi tiết nhất vì có nhiều trạng thái lỗi nhất. Các trạng thái lấy từ `LINK_LABEL`, `sendResultLabel`, `CONFIG_ERROR_LABEL` (`src/lib/device/labels.ts`), chuỗi lỗi của `usb-android-core.ts` và máy trạng thái ở [10-thiet-ke-chi-tiet.md](10-thiet-ke-chi-tiet.md), mục 10.1. Thời gian chờ 2000 ms, gửi lại tối đa 2 lần (tổng 3 lần), mã NAK `BAD_CHECKSUM`, `BAD_FIELDS`, `BUSY` theo [icd-usb-uart.md](icd-usb-uart.md).

Nguyên tắc cho thông báo lỗi: nói lỗi gì bằng lời người dùng hiểu, nói nguyên nhân có thể, chỉ một việc cần làm tiếp [2]. Người bệnh dùng tại nhà, nên không hiện mã kỹ thuật làm nội dung chính; mã kỹ thuật vẫn ghi vào nhật ký gửi máy (DR15) để Q05 và bác sĩ xem.

### T01. Kết nối thiết bị và nạp liệu trình

**T01-a. Chưa kết nối** (trạng thái ban đầu)

```
┌──────────────────────────────────────┐
│ < Nạp liệu trình xuống máy           │
│   BN004                              │
├──────────────────────────────────────┤
│ i "Giao thức chưa được firmware      │  chỉ hiện khi PROTOCOL.confirmed = false
│    xác nhận."                        │
│ ┌──────────────────────────────────┐ │
│ │ "Chưa kết nối"  (Thiết bị giả lập)│ │  chip chỉ hiện khi dùng giả lập
│ │ [        Kết nối         ]       │ │
│ └──────────────────────────────────┘ │
│ Đợt điều trị                         │
│ ┌──────────────────────────────────┐ │
│ │ Cấu hình sẽ gửi                  │ │
│ │ Chế độ          Cold             │ │
│ │ patient_id      BN004            │ │
│ │ min_treatment_time  120          │ │
│ │ energy_level    2                │ │
│ │ ... day, month, year, hour ...   │ │
│ └──────────────────────────────────┘ │
│ [  Nạp liệu trình vào máy  ] (mờ)    │  khóa đến khi đã kết nối
└──────────────────────────────────────┘
```

Có nhiều vết thương đang điều trị thì hiện hàng chip chọn vết thương phía trên thẻ cấu hình.

**T01-b. Đang kết nối, chờ cho phép truy cập USB** (Android)

```
│ ┌──────────────────────────────────┐ │
│ │ "Đang kết nối"                   │ │
│ │ "Chờ cho phép truy cập USB"      │ │
│ │ [   ◌ Kết nối   ] (đang chạy)    │ │
│ └──────────────────────────────────┘ │
│ ╔══════════════════════════════════╗ │  hộp thoại của Android, không do ứng dụng vẽ
│ ║ Cho phép Plasma Pro truy cập     ║ │
│ ║ CP2102N USB to UART?             ║ │
│ ║        [Hủy]   [Cho phép]        ║ │
│ ╚══════════════════════════════════╝ │
```

**T01-c. Các lỗi khi mở kết nối** (trạng thái `error`, thẻ kết nối đổi nội dung, nút trở lại "Kết nối")

```
│ ┌──────────────────────────────────┐ │
│ │ "Lỗi kết nối"                    │ │
│ │ <chuỗi chi tiết, xem bảng dưới>  │ │
│ │ [        Kết nối         ]       │ │  bấm lại để thử
│ └──────────────────────────────────┘ │
│ [  Nạp liệu trình vào máy  ] (mờ)    │
```

| Mã trạng thái | Khi nào | Chuỗi hiện tại trong mã | Việc người dùng làm | Đề xuất |
|---|---|---|---|---|
| K1 | Không thấy thiết bị USB nào | "Chưa thấy thiết bị USB nào. Hãy cắm cáp OTG vào máy Plasma Pro." | Cắm cáp, bấm Kết nối | Giữ |
| K2 | Thấy thiết bị nhưng VID, PID lạ | Chuỗi từ `describeUnknown` (liệt kê VID, PID thấy được) | Kiểm đúng cáp, đúng máy | Với người bệnh, dòng đầu là "Thiết bị cắm vào không phải máy Plasma Pro." rồi mới tới VID, PID **(đề xuất)** |
| K3 | Người dùng bấm Hủy ở hộp thoại quyền | "Chưa được cho phép truy cập USB. Hãy cắm lại cáp và chọn Cho phép." | Cắm lại, chọn Cho phép | Giữ |
| K4 | Không mở được cổng | Thông điệp lỗi của mô-đun gốc, hoặc "Không mở được cổng USB" | Rút, cắm lại | Thêm câu hướng dẫn "Rút cáp, chờ 5 giây, cắm lại." sau thông điệp gốc **(đề xuất)** |
| K5 | Chạy trên iOS hoặc Expo Go | Không có lỗi; ứng dụng tự dùng thiết bị giả lập, chỉ có chip "Thiết bị giả lập" | Không có | Trên iOS, thay chip bằng thông báo "Điện thoại iPhone chưa kết nối được máy qua cáp. Hãy dùng điện thoại Android hoặc nhờ bác sĩ nạp liệu trình." và khóa nút Gửi khi không phải bản demo **(đề xuất)**, vì người bệnh có thể dùng iOS |

**T01-d. Đã kết nối**

```
│ ┌──────────────────────────────────┐ │
│ │ "Đã kết nối"                     │ │
│ │ Giao thức của máy   Phiên bản 1  │ │
│ │ Firmware            0.3.1        │ │
│ │ Mã mẫu              PP-HOME-01   │ │
│ │ Năng lực   "Năng lực đọc từ máy" │ │
│ │ [          Ngắt          ]       │ │
│ └──────────────────────────────────┘ │
│ ... thẻ Cấu hình sẽ gửi ...          │
│ [  Nạp liệu trình vào máy  ]         │  bấm được
```

Biến thể: máy không trả lời `INF` trong thời gian chờ thì dòng Năng lực là "Máy không trả lời lệnh hỏi, dùng bảng dự phòng" và Giao thức của máy là "Không rõ". Vẫn cho gửi, vì ICD cho phép firmware chưa cài `INF`, `CAP`.

**T01-e. Không gửi được vì cấu hình** (chặn trước khi gửi, nút Gửi mờ)

```
│ ! "Máy dùng giao thức phiên bản 2,   │  lệch phiên bản
│    ứng dụng dùng phiên bản 1, cần    │
│    cập nhật ứng dụng hoặc firmware." │
│ Đợt điều trị                         │
│ ! "Đợt điều trị còn thiếu thời gian  │  đợt thiếu trường
│    chiếu, mức năng lượng. Bác sĩ cần │
│    lưu phiên bản mới."               │
│ ┌ Cấu hình sẽ gửi ─────────────────┐ │
│ │ ! "Mức năng lượng của đợt không  │ │  vi phạm năng lực máy (CONFIG_ERROR_LABEL)
│ │    có trong danh sách của máy,   │ │
│ │    bác sĩ cần lưu phiên bản mới."│ │
│ └──────────────────────────────────┘ │
│ [  Nạp liệu trình vào máy  ] (mờ)    │
```

Không có đợt được bác sĩ xác nhận thì thẻ chỉ ghi "Chưa có đợt điều trị được bác sĩ xác nhận."

**T01-f. Đang gửi**

```
│ [  ◌ Nạp liệu trình vào máy  ]       │  nút quay, các nút khác khóa
│ i Đang gửi, lần 2/3 (đề xuất)    │
```

Mã hiện chỉ có nút quay; số lần gửi chỉ biết sau khi xong. Đề xuất hiện lần gửi đang chạy để người dùng không rút cáp giữa chừng (tối đa khoảng 6 s: 3 lần × 2000 ms).

**T01-g. Kết quả gửi**

```
│ i ✓ "Máy đã nhận cấu hình."          │  xanh; sau gửi lại: "(sau 2 lần gửi)"
│ [   Theo dõi phiên điều trị   ]      │  sang T02
```

```
│ ! "Máy không trả lời sau 3 lần gửi." │  đỏ
│ [          Gửi lại           ]       │  chỉ hiện khi vẫn còn kết nối
```

Bảng các kết quả lỗi:

| Mã | Kết quả (`SendResult`) | Chuỗi hiện tại | Đề xuất cho người bệnh | Hành động chính |
|---|---|---|---|---|
| G1 | `nacked`, mã `BAD_CHECKSUM` (máy nhận khung hỏng) | "Máy từ chối cấu hình, mã BAD_CHECKSUM." | "Dữ liệu bị lỗi trên đường truyền. Kiểm tra cáp đã cắm chặt rồi bấm Gửi lại." **(đề xuất)** | Gửi lại. ICD quy định nhận NAK thì không tự gửi lại, nên người dùng bấm |
| G2 | `nacked`, mã `BAD_FIELDS` | "Máy từ chối cấu hình, mã BAD_FIELDS." | "Máy không nhận giá trị của đợt điều trị. Hãy báo bác sĩ." kèm nút sang N08 **(đề xuất)** | Không gửi lại; gửi lại vẫn lỗi |
| G3 | `nacked`, mã `BUSY` | "Máy từ chối cấu hình, mã BUSY." | "Máy đang chiếu hoặc đang bận. Chờ máy xong rồi gửi lại." **(đề xuất)** | Gửi lại sau |
| G4 | `nacked`, mã khác | "Máy từ chối cấu hình, mã <mã>." | Giữ, thêm "Hãy báo bác sĩ." | Báo sự cố |
| G5 | `timeout` | "Máy không trả lời sau 3 lần gửi." | Thêm "Kiểm tra máy đã bật." **(đề xuất)** | Gửi lại |
| G5b | `corrupted` (có khung sai checksum hoặc sai cấu trúc trong lúc chờ) | "Máy trả về dữ liệu hỏng (sai checksum hoặc sai cấu trúc) sau 3 lần gửi. Hãy kiểm tra cáp rồi gửi lại." | Giữ | Gửi lại |
| G5c | `unidentified` (máy chưa trả `INF`) | "Máy chưa trả lời lệnh hỏi thông tin nên chưa kiểm được phiên bản giao thức. Hãy ngắt rồi kết nối lại." | Giữ | Kết nối lại |
| G6 | `disconnected` (rút cáp lúc gửi) | "Mất kết nối, hãy cắm lại cáp và gửi lại." | Giữ. Thêm nút "Kết nối lại" ngay dưới thông báo **(đề xuất)**, vì nút Gửi lại ẩn khi chưa kết nối | Kết nối lại, rồi Gửi lại |
| G7 | `incompatible` | Như T01-e | Giữ | Không gửi |
| G8 | `invalid` | "Cấu hình không hợp lệ: ..." | Giữ | Bác sĩ sửa đợt |

Khoảng trống này đã được sửa ngày 11/11/2026: `request()` trong `sender.ts` ghi nhận khung `bad_checksum`, `malformed` và trả `corrupted` (G5b) thay cho `timeout` khi hết lượt gửi lại.

### T02. Theo dõi phiên điều trị và trạng thái kết nối

**T02-a. Đã kết nối, chưa nhận trạng thái**

```
┌──────────────────────────────────────┐
│ < Theo dõi phiên điều trị            │
│   BN004                              │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ "Đã kết nối"  (Thiết bị giả lập) │ │
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Trạng thái phiên  "Chưa nhận     │ │
│ │                    trạng thái"   │ │
│ │ Giây còn lại      –              │ │
│ │ Nhận lần cuối     –              │ │
│ │ "Bắt đầu phiên trên máy; trạng   │ │
│ │  thái hiện ở đây khi máy gửi về."│ │
│ └──────────────────────────────────┘ │
│ [Bắt đầu phiên (giả lập)] [Dừng ...] │  chỉ có với thiết bị giả lập
└──────────────────────────────────────┘
```

**T02-b. Đang chiếu**

```
│ │ Trạng thái phiên  "Đang chiếu"   │ │
│ │ Giây còn lại      87             │ │  cập nhật mỗi giây theo STA
│ │ Nhận lần cuối     11/11 09:02:15 │ │
```

Đề xuất cho người bệnh: thay dòng "Giây còn lại" bằng vòng đếm lớn (phút:giây), cùng kiểu vòng tiến độ ở N02 **(đề xuất)**.

**T02-c. Các trạng thái kết thúc và lỗi**

| Mã | Khi nào | Hiển thị hiện tại | Đề xuất |
|---|---|---|---|
| P1 | `STA` = `done` | "Đã xong" | Thêm thông báo xanh "Đã xong buổi chiếu hôm nay." và nút "Ghi cảm giác" sang N03 **(đề xuất)** |
| P2 | `STA` = `stopped` | "Đã dừng" | Thêm "Buổi chiếu dừng trước khi đủ thời gian. Nếu do đau hoặc khó chịu, hãy báo bác sĩ." kèm nút sang N08 **(đề xuất)** |
| P3 | `STA` = `error` | "Lỗi trên máy" | Thông báo đỏ "Máy báo lỗi. Tắt máy, bật lại. Nếu vẫn lỗi, báo sự cố thiết bị." kèm nút sang N08 **(đề xuất)** |
| P4 | Mất kết nối khi đang chiếu | Thông báo đỏ "Mất kết nối với máy trong lúc phiên đang chạy. Hãy cắm lại cáp." và nút Kết nối | Thêm câu "Máy vẫn tự chiếu đủ thời gian và tự ngắt; ứng dụng chỉ mất phần hiển thị." **(đề xuất, giả định GA tự ngắt của mạch [6] chờ firmware xác nhận)** |
| P5 | Đã kết nối nhưng không nhận `STA` quá 5 s khi đang chiếu | Không có; vẫn hiện số giây cũ | Thông báo vàng "Chưa nhận trạng thái từ máy N giây." **(đề xuất; ngưỡng 5 s là đề xuất, chưa có nguồn)** |

```
│ ! "Mất kết nối với máy trong lúc     │  P4
│    phiên đang chạy. Hãy cắm lại cáp."│
│ ┌──────────────────────────────────┐ │
│ │ "Chưa kết nối"                   │ │
│ │ [        Kết nối         ]       │ │
│ └──────────────────────────────────┘ │
│ │ Trạng thái phiên  "Đang chiếu"   │ │  giá trị cuối cùng nhận được
│ │ Nhận lần cuối     09:02:15       │ │
```

### Q05. Chẩn đoán kết nối (quản trị viên)

```
┌──────────────────────────────────────┐
│ < Chẩn đoán kết nối                  │
│   "Đã kết nối"                       │
├──────────────────────────────────────┤
│ ┌ Đặc tả đang dùng ────────────────┐ │
│ │ Kiểu khung   Văn bản ASCII       │ │
│ │ Checksum     xor8                │ │
│ │ Phiên bản giao thức   1          │ │
│ │ UART         9600 8N1            │ │
│ │ (Chưa được firmware xác nhận)    │ │
│ │ "Đặc tả hợp lệ." / danh sách lỗi │ │
│ └──────────────────────────────────┘ │
│ ┌ Đường truyền ────────────────────┐ │
│ │ Đang dùng    USB thật (Android)  │ │
│ │ [Chuyển sang thiết bị giả lập]   │ │
│ └──────────────────────────────────┘ │
│ [          Ngắt          ]           │
│ ┌──────────────────────────────────┐ │
│ │ Giao thức của máy, Firmware, Mã  │ │
│ │ mẫu, Năng lực                    │ │
│ │ [ Hỏi thông tin máy ]            │ │
│ │ Máy thật: "Thử nạp cấu hình bằng │ │  không nạp cấu hình xuống máy thật
│ │ luồng của người bệnh"            │ │  (FR2, KT5, DR15)
│ │ Giả lập: [ Gửi cấu hình thử ]    │ │
│ │ i <kết quả gửi thử>              │ │
│ └──────────────────────────────────┘ │
│ Byte gửi và nhận        Xóa bản ghi  │
│ ┌──────────────────────────────────┐ │
│ │ Nhận · 09:02:15                  │ │  mới nhất ở trên, giữ 200 dòng
│ │ 24 41 43 4B 2C 43 46 47 ...      │ │
│ │ $ACK,CFG*..                      │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

Đề xuất: đánh dấu đỏ dòng "Nhận" có khung sai checksum hoặc sai cấu trúc, kèm lý do `malformed` (ví dụ "Bản tin NAK cần 2 trường, nhận 1") **(đề xuất)**. Đây là nơi nhóm firmware và nhóm ứng dụng dò lỗi khi thử với mạch ([../huong-dan/chay-usb-android.md](../huong-dan/chay-usb-android.md)). Giá trị Checksum và UART trong khung trên lấy từ `protocol.config.ts` hiện tại (xor8, 9600 8N1), chờ firmware xác nhận.

---

## B. Người bệnh

### N01. Hướng dẫn lần đầu

```
┌──────────────────────────────────────┐
│ Hướng dẫn sử dụng            Bỏ qua  │
├──────────────────────────────────────┤
│        [ hình minh họa ]             │
│  Thiết bị Plasma Pro là gì           │  4 trang: thiết bị, đợt điều trị,
│  <đoạn giải thích ngắn>              │  báo triệu chứng ở đâu, khi khẩn cấp
│  Bác sĩ phụ trách: BS. ...           │
│            ● ○ ○ ○                   │
│ [ Quay lại ]           [ Tiếp ]      │
│ (trang 4) [ Gọi 115 ]                │
└──────────────────────────────────────┘
```

### N02. Trang chủ người bệnh

```
┌──────────────────────────────────────┐
│ Trang chủ                    (11/11) │
│ Nguyễn Văn A · BN004                 │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Đợt điều trị · VT1     Lịch trình>│ │
│ │  ╭──────╮  ⚡                     │ │
│ │  │ 5/14 │  Hôm nay cần chiếu      │ │  vòng tiến độ + câu chính (FR1)
│ │  │buổi  │  1 lần, 2 phút          │ │
│ │  ╰──────╯                         │ │
│ │ (☁ Chưa đồng bộ hôm nay  i)      │ │  chip vàng khi chưa nhận dữ liệu máy
│ │ ──────────────────────────────── │ │
│ │ ≡ Trước khi chiếu        0/3  ▾  │ │  mở ra: 3 dòng ▢, mỗi dòng cao 48
│ │ ──────────────────────────────── │ │
│ │ Lịch hẹn gần nhất     Tất cả (3)>│ │
│ │ [14/11] Tái khám          [🔔]   │ │
│ └──────────────────────────────────┘ │
│ Vết thương                  Lịch sử  │
│ ┌──────────────────────────────────┐ │
│ │ VT1 · Cẳng chân trái   12,4 cm²  │ │  số đo bác sĩ nhập, biểu đồ nhỏ (FR7)
│ └──────────────────────────────────┘ │
│ [ Báo triệu chứng hoặc sự cố ]       │
├──────────────────────────────────────┤
│ Trang chủ  Lịch sử (📅) Thiết bị  TK │
└──────────────────────────────────────┘
```

Biến thể thẻ chính: "Vết thương VT1 đã liền" kèm nút "Báo vết thương mở lại"; "Đã dừng chiếu, chờ bác sĩ xác nhận liền"; "Chưa có đợt điều trị được bác sĩ xác nhận." Thiếu so với FR1: dòng chế độ điều trị (Cold, Hybrid, Thermal) **(đề xuất thêm vào câu chính)**.

### N03. Lịch trình

```
┌──────────────────────────────────────┐
│ < Lịch trình của tôi                 │
├──────────────────────────────────────┤
│ i Thiết bị đã khóa theo mức và thời  │
│   gian bác sĩ đặt.                   │
│ ┌ Lịch tuân thủ 7 ngày ────────────┐ │
│ │ T2 T3 T4 T5 T6 T7 CN             │ │
│ │ ✓  ✓  ✗  ✓  –  ✓  ·              │ │  ✓ đã chiếu, ✗ bỏ lỡ, – ngày nghỉ,
│ │ chạm một ngày: ghi cảm giác      │ │  · chưa có dữ liệu
│ └──────────────────────────────────┘ │
│ Lịch hẹn sắp tới                     │
│ [14/11] Tái khám                     │
└──────────────────────────────────────┘
```

Đề xuất cho FR6: ô ghi cảm giác dùng thang VAS 0 đến 10 dạng 11 nút số, vượt ngưỡng bác sĩ đặt thì hiện hướng dẫn liên hệ **(đề xuất; ngưỡng chờ bác sĩ)**.

### N04. Hồ sơ và lịch sử

```
┌──────────────────────────────────────┐
│ Hồ sơ và lịch sử                     │
├──────────────────────────────────────┤
│ Họ tên            Nguyễn Văn A       │
│ Năm sinh          1958               │
│ Bác sĩ phụ trách  BS. ...            │
│ Đồng ý dùng ảnh cho nghiên cứu  Có   │
│ "Muốn thay đổi sự đồng ý, hãy báo    │
│  bác sĩ phụ trách."                  │
│ Vết thương đang theo dõi             │
│ VT1 · Cẳng chân trái            >    │  sang N05
│ VT2 · Gót phải (đã liền)        >    │
└──────────────────────────────────────┘
```

### N05. Chi tiết vết thương (người bệnh xem)

Dùng chung bố cục với B05 nhưng ẩn mọi nút sửa; chỉ hiện đánh giá bác sĩ đã công bố. Xem wireframe B05.

### N06. Đợt điều trị của tôi

```
┌──────────────────────────────────────┐
│ < Đợt điều trị của tôi               │
├──────────────────────────────────────┤
│ VT1 · Cẳng chân trái                 │
│ Mức năng lượng    2                  │
│ Thời gian         120 giây           │
│ Giãn cách         mỗi ngày           │
│ "Thiết bị đã được khóa theo mức năng │
│  lượng và thời gian bác sĩ đặt. Bạn  │
│  không cần chỉnh gì trên thiết bị."  │
└──────────────────────────────────────┘
```

### N07. Thiết bị của tôi

```
┌──────────────────────────────────────┐
│ Thiết bị của tôi                     │
│ PP-0007                              │
├──────────────────────────────────────┤
│ Tiến độ đợt điều trị  ▓▓▓▓░░░ 5/14   │
│ Số lần điều trị 7 ngày qua  (biểu đồ)│
│ Phiên sử dụng                        │
│  10/11 08:30  120 s  Hoàn thành      │
│ Chăm sóc thiết bị                    │
│  ▢ Vệ sinh đầu phát   [Tôi đã làm xong]│
│ [ Kết nối máy và nạp liệu trình ]    │  sang T01
│ [ Theo dõi phiên điều trị ]          │  sang T02
│ [ Báo sự cố thiết bị ]               │  sang N08 (kind=device)
└──────────────────────────────────────┘
```

Chưa gán thiết bị: thẻ rỗng "Chưa được gán thiết bị." Hai nút T01, T02 ẩn, vì phiên và nhật ký nạp phải gắn với một máy (FR13); bác sĩ giao máy ở B04.

### N08. Báo triệu chứng hoặc sự cố

```
┌──────────────────────────────────────┐
│ < Báo triệu chứng / sự cố            │
├──────────────────────────────────────┤
│ ( Triệu chứng ) ( Sự cố thiết bị )   │
│ Mức đau (VAS)                        │
│ (0)(1)(2)(3)(4)(5)(6)(7)(8)(9)(10)   │  từ 7: hiện hướng dẫn liên hệ bác sĩ
│ Mô tả                                │
│ ____________________________________ │
│ ____________________________________ │
│ [            Gửi            ]        │
│ "Ứng dụng không thay thế cấp cứu và  │
│  không được theo dõi liên tục."      │
└──────────────────────────────────────┘
```

Lỗi: mô tả trống thì nút Gửi mờ. Gửi xong: hộp thoại xác nhận bác sĩ sẽ xem khi mở ứng dụng.

---

## C. Bác sĩ

### B01. Trang chủ bác sĩ

```
┌──────────────────────────────────────┐
│ Trang chủ                    (11/11) │
│ Xin chào, BS. ...                    │
├──────────────────────────────────────┤
│ Việc cần làm                         │
│ ┌──────┐ ┌──────┐ ┌──────┐           │
│ │  2   │ │  5   │ │  1   │           │  ô số; chạm mở việc đầu tiên
│ │Báo cáo│ │Ảnh   │ │Đợt   │           │  (báo cáo, ảnh chưa đo, ảnh chụp lại,
│ │triệu │ │chưa  │ │nháp  │           │   đợt nháp, thiết bị chưa đồng bộ)
│ └──────┘ └──────┘ └──────┘           │
│ Bệnh nhân                  Danh sách │
│ ┌──────────────────────────────────┐ │
│ │ BN004 Nguyễn Văn A   (Bỏ lỡ)     │ │  xếp theo mức cần chú ý (FR10)
│ │ VT1 · bỏ lỡ 2/7 ngày · 1 báo cáo │ │
│ ├──────────────────────────────────┤ │
│ │ BN002 Trần Thị B  (Chưa có dữ    │ │  3 trạng thái: Đã điều trị,
│ │ liệu) · đồng bộ lần cuối 09/11   │ │  Bỏ lỡ, Chưa có dữ liệu (nhãn trong mã:
│ │                                  │ │  Đã chiếu, Bỏ lỡ, Chưa có dữ liệu)
│ ├──────────────────────────────────┤ │
│ │ BN001 Lê Văn C   (Đã chiếu)      │ │
│ └──────────────────────────────────┘ │
├──────────────────────────────────────┤
│ Trang chủ  Bệnh nhân (📷) Ảnh   TK   │
└──────────────────────────────────────┘
```

Không có việc: "Không có việc nào đang chờ."

### B02. Danh sách người bệnh

```
│ Bệnh nhân                [Thêm mới]  │
│ 🔍 ____________________________      │  tìm theo tên, mã
│ BN004 Nguyễn Văn A   (Nặng)      >   │
│ BN002 Trần Thị B                 >   │
```

Không có kết quả: "Không tìm thấy bệnh nhân phù hợp."

### B03. Thêm người bệnh

```
│ < Thêm bệnh nhân                     │
│ Mã hồ sơ được cấp tự động            │
│ Họ và tên         __________         │
│ Năm sinh          ____               │
│ Số điện thoại     __________         │
│ Vị trí vết thương đầu tiên (không    │
│ bắt buộc)         __________         │
│ ▢ Đồng ý dùng ảnh cho nghiên cứu     │
│ [ Lưu hồ sơ và tạo tài khoản ]       │
│ ── sau khi lưu ──                    │
│ Đã tạo hồ sơ  BN005                  │
│ Mã kích hoạt  482913                 │  người bệnh dùng ở C03
│ [ Mở hồ sơ ]                         │
```

### B04. Hồ sơ người bệnh

```
│ < Hồ sơ bệnh nhân                    │
│   BN004 · Nguyễn Văn A               │
│ Thông tin hồ sơ: SĐT, ngày tạo, bác  │
│ sĩ phụ trách, đồng ý nghiên cứu      │
│ Tài khoản: mã kích hoạt / đã kích hoạt│
│ Vết thương              [Thêm vết thương]│
│  VT1 · Cẳng chân trái  (Đang điều trị) >│
│ Đợt điều trị                      >  │  sang B06
│ Thiết bị PP-0007                  >  │  sang B13
│ Giao máy: [Thu hồi PP-0007]          │  chưa giữ máy: [Giao TB-xxx] cho từng
│                                      │  máy đã khử khuẩn, kiểm tra (FR13)
│ Triệu chứng và sự cố bệnh nhân báo   │
│  10/11 "Đau rát sau khi chiếu"       │
│  [Đã xử lý]                          │
│ [ Xuất báo cáo theo dõi (PDF) ]      │
```

### B05. Thông tin vết thương (bác sĩ; N05 dùng chung, ẩn nút sửa)

```
│ < VT1 · Cẳng chân trái               │
│ Diện tích                    So sánh │  "So sánh" khi có từ 2 ảnh
│  cm² ▁▂▄▅▆ (biểu đồ theo ngày)       │  FR7
│ Album ảnh                            │
│  [ảnh][ảnh][ảnh]  theo ngày          │  chạm sang B11
│ [ Chụp / thêm ảnh có hướng dẫn ]     │  sang B10
│ Đợt điều trị            Sửa đợt      │  sang B06
│  Phiên bản 3 · 5/14 buổi · bỏ lỡ 2   │
│ Đánh giá              + Ghi đánh giá │  sang B07
│  10/11 Trung bình · tái đánh giá 17/11│
│ [Xác nhận khép lần 1] (ClosureActions)│
```

### B06. Thiết lập thông tin điều trị

```
│ < Đợt điều trị                       │
│   BN004                              │
│ ( VT1 ) ( VT2 )                      │  chọn vết thương
│ "Mỗi vết thương một đợt. Giá trị điều│
│  trị cụ thể do nhóm chuyên môn đặt;  │
│  ứng dụng không đặt sẵn lịch hay     │
│  liều."                              │
│ Thiết lập phiên bản mới              │
│ Mức năng lượng   ( 1 ) ( 2 ) ( 3 )   │  chỉ các mức trong năng lực máy
│ Chế độ           ( Cold ) ( Hybrid ) │
│ Hệ số (giây cho mỗi cm²) ____        │
│  gợi ý thời gian: 124 s              │  "Chỉ là gợi ý..."
│ Giãn cách giữa hai lần  ____         │
│ Lịch tái khám     ____               │
│ Lý do thay đổi    ____________       │  bắt buộc khi sửa (FR9)
│ ▢ Bác sĩ xác nhận đợt điều trị       │
│ [ Lưu phiên bản mới ]                │
│ Các phiên bản                        │
│  v3 · 10/11 · BS. ... · "tăng mức"   │
│  v2 · ...                            │
```

Lỗi và cảnh báo: "Chưa có danh sách mức và chế độ cho mẫu thiết bị này."; "Danh sách mức và chế độ chưa được firmware xác nhận."; thiếu lý do thì nút Lưu mờ. Đề xuất cho FR3: dòng "Liều ước tính: x J/cm²" dưới thời gian **(đề xuất, chờ mật độ công suất từ WCMD)**.

### B07. Đánh giá tình trạng

```
│ < Đánh giá tình trạng                │
│ Ảnh tham chiếu   [ảnh]               │
│ Diện tích (bác sĩ đã nhập)  12,4 cm² │
│ Loại vết thương  ( ... )             │
│ Giai đoạn (NPIAP) ( 1 )( 2 )( 3 )( 4 )│
│ Mô hạt, Biểu mô hóa, Dịch tiết, Dấu  │
│ hiệu nhiễm trùng: chọn               │
│ Mức độ  ( Nhẹ )( Trung bình )( Nặng )│
│ Hướng dẫn tiếp theo  ____________    │
│ Ngày tái đánh giá    ____            │
│ ▢ Công bố cho bệnh nhân xem          │
│ [ Lưu đánh giá ]                     │
```

### B08. So sánh trước và sau

```
│ < So sánh trước / sau                │
│ [ ảnh 01/11 ]   [ ảnh 10/11 ]        │
│  14,0 cm²        12,4 cm²   (−11 %)  │
│ "Số đo do bác sĩ nhập; nếu phương    │
│  pháp đo thay đổi giữa hai lần, cần  │
│  lưu ý khi so sánh."                 │
```

### B09. Chọn hồ sơ để chụp

```
│ Chụp ảnh vết thương                  │
│ Ảnh vào đúng hồ sơ, rồi ghi diện tích│
│ Bệnh nhân  ( BN004 ) ( BN002 ) ...   │
│ Vết thương ( VT1 ) ( VT2 )           │
│ [ Chụp có hướng dẫn ]                │  sang B10
```

Rỗng: "Chưa có bệnh nhân được phân công..."; "Bệnh nhân chưa có vết thương đang theo dõi..."

### B10. Chụp có hướng dẫn, kết quả mô-đun AI

```
┌──────────────────────────────────────┐
│ < Chụp có hướng dẫn   BN004 · VT1    │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │        khung camera              │ │
│ │     ┌ ─ ─ ─ ─ ─ ┐               │ │  khung hướng dẫn, vùng AI khoanh
│ │       ( vết )                    │ │  vẽ chồng lên ảnh
│ │     └ ─ ─ ─ ─ ─ ┘               │ │
│ └──────────────────────────────────┘ │
│ Kiểm tra trước khi chụp              │
│ Khoảng cách tới vết thương  ✓ 25 cm  │
│ Góc nghiêng                 ✗ 18°    │
│ Độ nét, ánh sáng            ✓        │
│ [ Chụp ]  [ Chọn ảnh có sẵn ]        │
│ [ Vẫn chụp (bỏ qua kiểm tra) ]       │
│ ── sau khi chụp ──                   │
│ Diện tích vết thương                 │
│ Ước lượng AR     11,8 cm²            │  kết quả mô-đun (FR11)
│ "Ước lượng từ vùng khoanh... Chưa    │
│  kiểm chứng lâm sàng; bác sĩ sửa số  │
│  nếu đo thực tế khác."               │
│ Diện tích xác nhận (cm²)  ____       │
│ ▢ Đã xem ảnh: rõ nét, đủ sáng, thấy  │
│   toàn bộ vết thương                 │
│ [ Lưu ]   [ Chụp / chọn lại ]        │  lưu xong sang B11
└──────────────────────────────────────┘
```

Khi thay bằng mô-đun AI có sẵn (FR11): vùng hiển thị giữ nguyên chỗ, thêm dòng tên và phiên bản mô hình (`modelId`, `modelVersion`) và nút "Sửa vùng" **(đề xuất)**. Lỗi mô-đun (không chạy được, không tìm thấy vết thương): hiện "Không nhận diện được vết thương. Nhập diện tích đã đo." và vẫn cho lưu **(đề xuất)**.

### B11. Chi tiết ảnh và nhãn diện tích

```
│ < Ảnh VT1_20261110_...               │
│ [ ảnh lớn, có lớp vùng khoanh ]      │
│ (Đã đo) (Đã yêu cầu chụp lại)        │
│ Thông tin lần chụp: Mã bệnh nhân,    │
│ Cách chụp, Khoảng cách, Bản đồ chiều │
│ sâu, Diện tích ước lượng AR          │
│ Sửa tên theo diện tích đã đo         │
│  Diện tích bác sĩ đã đo  ____ cm²    │  nhãn hiện tại (FR15, mức diện tích)
│  Phương pháp đo         ____         │
│  [ Lưu ]                             │
│ [ Gán nhãn ] (giữ chỗ, GĐ7)│
│ Lịch sử sửa nhãn                     │  FR16
│  10/11 09:12 BS. ... 11,8 → 12,4     │
│ Chia sẻ cho bên kỹ thuật             │
│  ▢ Ảnh không có mặt, tên, giấy tờ    │  FR12
│ Thao tác khác                        │
│  [ Ghi đánh giá với ảnh này ]        │
│  [ Gửi yêu cầu chụp lại ]            │
│  [ Loại khỏi bộ dữ liệu ]  Lý do ___ │
```

Lỗi: thiếu phương pháp đo thì hộp thoại "Thiếu phương pháp đo"; người bệnh chưa đồng ý thì phần chia sẻ chỉ ghi "Bệnh nhân chưa đồng ý sử dụng ảnh cho nghiên cứu."

### B12. Danh sách ảnh

```
│ Ảnh vết thương                       │
│ ( Chưa đo 5 ) ( Đã đo ) ( Đã loại )  │  lọc theo trạng thái nhãn
│ 🔍 tìm theo mã bệnh nhân (đề xuất)│  FR17 còn thiếu
│ [ảnh] BN004 · VT1 · 10/11       >    │  sang B11
│ [ảnh] BN002 · VT1 · 09/11       >    │
```

Rỗng: "Không có ảnh trong nhóm này."

### B13. Thiết bị và nhật ký (bác sĩ; Q06 dùng chung ở mức kỹ thuật)

```
│ < Thiết bị và nhật ký   PP-0007      │
│ Gán cho BN004 · Firmware 0.3.1 · Mẫu │
│ 7 ngày gần nhất (biểu đồ)            │
│ Phiên sử dụng (thời điểm, thời gian, │
│ trạng thái)                          │
│ [ Kết nối máy và nạp liệu trình ]    │  chỉ bác sĩ phụ trách, sang T01
│ [ Theo dõi phiên điều trị ]          │  sang T02
```

Q06 thêm phần "Vòng đời thiết bị cho thuê", "Tổng thời gian", "Trạng thái nguồn" và ẩn hai nút kết nối.

---

## D. Quản trị viên

### Q01. Quản lý tài khoản

```
│ Quản lý tài khoản                    │
│ ( Chờ duyệt 1 ) ( Lỗi chưa xử lý 2 ) │
│ Tài khoản                            │
│  BS. ... · Bác sĩ (Chờ duyệt)        │
│   [Duyệt tài khoản] [Khóa tài khoản] │
│   ▢ Quyền xuất dữ liệu nghiên cứu    │
│ Phân công bác sĩ phụ trách           │
│  BN004 → ( BS. A ) ( BS. B )         │  "Chỉ hiển thị mã hồ sơ, không có
│                                      │   dữ liệu lâm sàng."
```

### Q02. Kho dữ liệu kỹ thuật

```
│ Kho dữ liệu kỹ thuật                 │
│ "Chỉ gồm ảnh được bác sĩ kiểm tra và │
│  bệnh nhân đồng ý nghiên cứu..."     │
│ Bộ ảnh đã gán diện tích   (24 ảnh)   │
│  RS-0012 · 12,4 cm²                  │
│ [ Xuất ZIP ]                         │
│ Phiên bản bộ dữ liệu  v__ (đề xuất)│  FR12 còn thiếu
```

### Q03. Thiết bị

```
│ Thiết bị                             │
│ Đăng ký thiết bị mới                 │
│  Mã thiết bị ____  [ Đăng ký ]       │
│ [ Chẩn đoán kết nối USB/UART ]       │  sang Q05
│ PP-0007 · Firmware 0.3.1             │
│  Đang giao cho: BN004 [ Xem nhật ký ]│  sang Q06; quản trị chỉ xem, bác sĩ giao ở B04
```

### Q04. Lỗi hệ thống

```
│ Lỗi hệ thống                         │
│ Lỗi đồng bộ thiết bị và máy chủ      │
│  10/11 PP-0007 hết thời gian đồng bộ │
│   [ Đã xử lý ]                       │
```

Rỗng: "Không có lỗi."

---

## E. Màn chung

### C01. Đăng nhập

```
┌──────────────────────────────────────┐
│ ┌──────────────────────────────────┐ │
│ │ ∿ Plasma Pro                     │ │
│ │ Kết nối chăm sóc. Theo dõi mỗi   │ │
│ │ ngày.                            │ │
│ └──────────────────────────────────┘ │
│ Chào mừng trở lại                    │
│ Tên đăng nhập  ____________          │
│ Mật khẩu       ____________          │
│ ! <lỗi đăng nhập>                    │
│ [         Đăng nhập          ]       │
│ Có mã kích hoạt từ bác sĩ? Kích hoạt │  sang C03
│ Chưa có tài khoản? Đăng ký           │  sang C02
│ ┌ Trải nghiệm bản demo ────────────┐ │
│ │ ( BS. A ) ( Nguyễn Văn A ) (QT)  │ │  điền nhanh tài khoản mẫu
│ │ "Đăng nhập cục bộ trên máy này;  │ │
│ │  chưa xác thực qua máy chủ."     │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

Điều khoản đổi phiên bản: hiện dòng vàng và ô "▢ Đồng ý điều khoản"; nút Đăng nhập mờ đến khi tích.

### C02. Đăng ký, C03. Kích hoạt

```
│ < Tạo tài khoản        │  │ < Kích hoạt tài khoản   │
│ ( Bệnh nhân )( Bác sĩ )│  │ Tên đăng nhập  bn004    │
│ Họ và tên    ____      │  │ Mã kích hoạt   ______   │  6 chữ số, dùng một lần
│ Năm sinh, SĐT ____     │  │ Mật khẩu mới   ____     │
│ Tên đăng nhập ____     │  │ Nhập lại       ____     │
│ Mật khẩu, nhập lại ___ │  │ [Kích hoạt và đăng nhập]│
│ ▢ Đồng ý điều khoản    │  │                         │
│ [ Tạo tài khoản ]      │  │                         │
```

Bác sĩ đăng ký phải chờ quản trị duyệt ("Tài khoản chuyên môn cần quản trị duyệt..."). Lỗi kích hoạt: mã sai hoặc đã dùng, mật khẩu nhập lại không khớp.

### C04 Điều khoản, C05 Căn cứ pháp lý, C06 Tài khoản

```
│ Tài khoản                            │
│ Nguyễn Văn A · Bệnh nhân             │
│ > Hướng dẫn sử dụng                  │  sang N01 (xem lại)
│ > Điều khoản và quyền riêng tư       │  sang C04
│ > Căn cứ pháp lý                     │  sang C05
│ > Điều gì được chia sẻ?              │
│ [ Đăng xuất ]                        │  về C01
```

C04 và C05 là trang văn bản cuộn, có nút quay lại.

---

## F. Tổng hợp đề xuất đổi mã từ wireframe

Các mục dưới chưa làm, trừ mục ghi "Đã làm". Mỗi mục cần cập nhật [doi-chieu-ma-nguon.md](doi-chieu-ma-nguon.md) khi làm.

| # | Màn | Đề xuất | FR | Độ ưu tiên (đề xuất) |
|---|---|---|---|---|
| 1 | T01 | Đếm khung sai checksum, sai cấu trúc trong `request()` và báo riêng ở kết quả hết giờ (G5) | FR2 | Đã làm ngày 11/11/2026 (G5b) |
| 2 | T01 | Nhãn dễ hiểu cho mã NAK `BAD_CHECKSUM`, `BAD_FIELDS`, `BUSY` (G1 đến G3) | FR2 | Đã làm ngày 11/11/2026 (`NAK_HINT` trong `labels.ts`; G2 và mã lạ ẩn Gửi lại, có nút báo sự cố) |
| 3 | T01 | Nút "Kết nối lại" sau G6; hiện lần gửi đang chạy (T01-f) | FR2 | Nút Kết nối lại: đã làm ngày 11/11/2026. Hiện lần gửi đang chạy: chưa làm |
| 4 | T01 | Trạng thái riêng cho iOS chưa có USB thật (K5) | FR2 | Trung bình, chờ quyết định nền tảng |
| 5 | T02 | Thông báo và nút tiếp theo cho `done`, `stopped`, `error`; cảnh báo khi `STA` ngừng đến (P1 đến P5) | FR4, FR6 | Đã làm ngày 11/11/2026 trừ câu bổ sung của P4 (chờ phần cứng xác nhận tự ngắt) |
| 6 | Q05 | Đánh dấu khung nhận lỗi trong bản ghi byte | TR3 | Trung bình |
| 7 | N02 | Hiện chế độ điều trị | FR1 | Đã có trong mã (`CourseCard.tsx`) |
| 8 | N03, N08 | Ngưỡng VAS do bác sĩ đặt (thang 0 đến 10 đã có ở N08) | FR6 | Chờ bác sĩ chốt ngưỡng |
| 9 | B06 | Liều J/cm² ước tính | FR3 | Chờ WCMD |
| 10 | B10 | Hiện tên, phiên bản mô hình AI (đã lưu trong `capture.wound`); sửa vùng; xử lý lỗi mô-đun | FR11 | Chờ dạng mô-đun AI |
| 11 | B12 | Tìm theo mã người bệnh | FR17 | Thấp |
| 12 | Q02 | Số phiên bản bộ dữ liệu | FR12 | Thấp |
| 13 | N05, N06 | Lối vào N06 cho người bệnh, hoặc bỏ chế độ xem người bệnh | FR1 | Thấp |
| 14 | B04 | Cho bác sĩ sửa họ tên, năm sinh, số điện thoại; lưu người, giờ, giá trị cũ | FR18 | Trung bình |
| 15 | N02, T01 | Nút "Nạp liệu trình vào máy" trên thẻ Hôm nay của N02; T01 hiện mức, chế độ, thời gian dạng đọc được, gói CFG thô thu vào "Chi tiết kỹ thuật"; thanh 3 bước; ẩn thông tin giao thức với người bệnh | FR1, FR2, NFR4 | Đã làm ngày 11/11/2026 |

## Giả định

- Giao thức, mã NAK, trạng thái `STA` lấy từ bản nháp ICD, chưa được firmware xác nhận (`confirmed: false`).
- Hộp thoại quyền USB ở T01-b là của hệ điều hành Android, nội dung minh họa.
- Số liệu trong wireframe (mã BN004, 12,4 cm², 5/14 buổi, firmware 0.3.1) là ví dụ.
- P4 giả định mạch tự ngắt khi đủ thời gian và chạy độc lập khi mất kết nối, theo báo cáo giữa kỳ [6]; chưa được nhóm phần cứng xác nhận cho máy đích.

## Tài liệu tham khảo

1. Mã nguồn `mducnguyen610/PlasmaProApp`, nhánh `trien-khai/giai-doan-2`, commit `a2719c8`: `src/app/`, `src/lib/device/labels.ts`, `sender.ts`, `usb-android-core.ts`, `codec-text.ts`, `codec-binary.ts`.
2. Nielsen, J. (1994, cập nhật 2020). *10 Usability Heuristics for User Interface Design*, nguyên tắc 9 "Help users recognize, diagnose, and recover from errors". Nielsen Norman Group, https://www.nngroup.com/articles/ten-usability-heuristics/ (chưa kiểm lại trong phiên này).
3. W3C (2018). *Web Content Accessibility Guidelines (WCAG) 2.1*, tiêu chí 1.4.3 Contrast (Minimum). https://www.w3.org/TR/WCAG21/#contrast-minimum (chưa kiểm lại trong phiên này).
4. Apple. *Human Interface Guidelines: Accessibility*, kích thước vùng chạm tối thiểu 44 × 44 pt. https://developer.apple.com/design/human-interface-guidelines/accessibility (chưa kiểm lại trong phiên này).
5. Google. *Material Design 3: Accessibility, touch targets* (48 × 48 dp). https://m3.material.io/foundations/designing/structure (chưa kiểm lại trong phiên này).
6. Hoàng Đình Việt, Lê Thanh Phương (2026). *Báo cáo giữa kỳ Đồ án thiết kế thiết bị nhúng*. ĐHBK Hà Nội (mạch PIC16F18875, CP2102N, tự ngắt khi hết thời gian).
7. [icd-usb-uart.md](icd-usb-uart.md): thời gian chờ, số lần gửi lại, mã NAK.
