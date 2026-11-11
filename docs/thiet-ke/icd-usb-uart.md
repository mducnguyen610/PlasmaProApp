# Tài liệu giao tiếp USB/UART giữa ứng dụng và firmware Plasma Pro (ICD, bản nháp)

**Trạng thái:** bản nháp ngày 11/11/2026, do phía ứng dụng đề xuất, **chưa được nhóm firmware xác nhận**. Mọi giá trị dưới đây là đề xuất. Nhóm firmware chọn hoặc sửa từng mục ở mục 10, rồi hai bên ký xác nhận phiên bản.

**Truy vết:** thực hiện TR3 ở [07-thiet-ke-cau-truc.md](07-thiet-ke-cau-truc.md) và FR2 ở [05-nhu-cau-tinh-nang.md](05-nhu-cau-tinh-nang.md). Câu hỏi số 2 ở [cau-hoi-mo-va-tai-lieu.md](cau-hoi-mo-va-tai-lieu.md) được trả lời bằng tài liệu này khi xác nhận.

## 1. Mục đích và cách dùng

Tài liệu này là hợp đồng giữa ứng dụng điện thoại và firmware: khung dữ liệu, bản tin, trường, mã lỗi, thời gian chờ. Phía ứng dụng viết toàn bộ nội dung này thành một tệp dữ liệu duy nhất (`src/lib/device/protocol.config.ts` trong kế hoạch giai đoạn 1). Khi firmware chốt:

1. Nhóm firmware sửa các bảng ở mục 3 đến 7 cho đúng với firmware, điền mục 10.
2. Nhóm firmware gửi ít nhất 5 ví dụ đối chiếu (mục 8): chuỗi byte thật mà mạch nhận hoặc phát, chụp từ cổng gỡ lỗi.
3. Phía ứng dụng sửa tệp đặc tả và thêm ví dụ vào bộ kiểm thử. Ứng dụng không phải sửa mã, trừ khi có thêm trường điều trị ngoài 10 trường ở mục 5.
4. Hai bên tăng số phiên bản giao thức (mục 9) mỗi khi định dạng đổi không tương thích.

## 2. Tầng vật lý

| Mục | Đề xuất | Ghi chú |
|---|---|---|
| Kết nối | Cáp USB từ điện thoại người bệnh tới cầu USB-UART trên mạch | Android: chế độ USB Host. iPhone: cầu CP2102N không có trình điều khiển cho iOS [1], cần bộ chuyển khác, xem câu hỏi 9 |
| Mã USB của cầu | VID `0x10C4`, PID `0xEA60` (mã mặc định của Silicon Labs cho CP210x) | Ứng dụng Android chọn thiết bị theo cặp mã này (`PROTOCOL.usb`); nếu mạch dùng mã khác, xem câu F13 |
| Tốc độ | 9600 baud | Đủ cho gói cấu hình dưới 64 byte |
| Khung byte | 8 bit dữ liệu, không chẵn lẻ, 1 bit dừng (8N1) | |
| Điều khiển luồng | Không | |
| Bên nói trước | Ứng dụng | Thiết bị chỉ phát `STA` tự động khi phiên đang chạy |

## 3. Khung dữ liệu

Phía ứng dụng cài sẵn cả hai phương án; nhóm firmware chọn một.

### Phương án A: khung văn bản ASCII (đề xuất mặc định)

```
$<TOKEN>,<trường 1>,<trường 2>,...*<checksum>\r\n
```

- `$` mở khung, `\r\n` (0x0D 0x0A) đóng khung, `,` phân tách trường, `*` đứng trước checksum.
- Checksum: XOR mọi byte nằm giữa `$` và `*` (không tính hai ký tự này), viết 2 chữ số hex hoa, giống NMEA 0183 [2].
- Số viết thập phân không có số 0 đầu. Chuỗi chỉ gồm ký tự trong bộ ký tự của trường.
- Ưu điểm: đọc được bằng mắt trên cổng gỡ lỗi, dễ phân tích bằng `strtok` trên vi điều khiển.

### Phương án B: khung nhị phân

```
AA 55 | CODE (1 byte) | LEN (1 byte) | PAYLOAD (LEN byte) | CRC (2 byte, little-endian)
```

- Header cố định `AA 55`. `CODE` là mã bản tin (mục 4). `LEN` là độ dài phần tải.
- Phần tải là các trường nối liền theo độ rộng ở mục 5, số nguyên little-endian, chuỗi đệm 0x00 đến đủ độ dài.
- CRC: CRC-16/MODBUS (đa thức 0x8005 đảo bit, giá trị đầu 0xFFFF, không XOR cuối, kiểm chuẩn `123456789` cho 0x4B37 [3]) tính trên `CODE`, `LEN` và phần tải.
- Ưu điểm: gói ngắn, độ dài cố định, không phải phân tích chuỗi.

Các kiểu checksum ứng dụng hỗ trợ sẵn cho cả hai phương án: XOR 8 bit, tổng 8 bit modulo 256, CRC-16/CCITT-FALSE (kiểm chuẩn 0x29B1 [3]), CRC-16/MODBUS, không checksum. Firmware dùng kiểu khác thì báo ở mục 10.

## 4. Danh sách bản tin

| Bản tin | Hướng | Token (A) | Code (B) | Trường | Bắt buộc |
|---|---|---|---|---|---|
| Cấu hình điều trị | Ứng dụng tới máy | `CFG` | 0x01 | 10 trường ở mục 5 | Có |
| Xác nhận | Máy tới ứng dụng | `ACK` | 0x81 | `command` | Có |
| Từ chối | Máy tới ứng dụng | `NAK` | 0x82 | `command`, `code` | Có |
| Trạng thái phiên | Máy tới ứng dụng | `STA` | 0x83 | `state`, `remaining_s` | Có |
| Hỏi thông tin máy | Ứng dụng tới máy | `INF` | 0x10 | không | Nên có |
| Thông tin máy | Máy tới ứng dụng | `INF` | 0x90 | `protocol_version`, `firmware_version`, `model` | Nên có |
| Hỏi năng lực | Ứng dụng tới máy | `CAP` | 0x11 | không | Nên có |
| Năng lực | Máy tới ứng dụng | `CAP` | 0x91 | `energy_min`, `energy_max`, `mode_mask`, `time_min_s`, `time_max_s` | Nên có |

`command` trong `ACK`, `NAK` là token (A) hoặc code 1 byte (B) của bản tin được trả lời. Nếu firmware chưa cài `INF`, `CAP`, ứng dụng chờ hết giờ rồi dùng bảng năng lực ghi sẵn; có hai bản tin này thì ứng dụng không phải cập nhật khi thêm mức hay chế độ mới.

## 5. Trường của bản tin cấu hình (thứ tự cố định)

| # | Trường | Kiểu | Độ rộng (B) | Đơn vị | Khoảng | Ghi chú |
|---|---|---|---|---|---|---|
| 1 | `patient_id` | chuỗi | 16 byte | | 1 đến 16 ký tự `A-Z a-z 0-9 _ -` | Mã hồ sơ người bệnh, không phải họ tên |
| 2 | `min_treatment_time` | số nguyên không dấu | 2 byte | giây | theo năng lực máy | Thời gian điều trị tối thiểu |
| 3 | `energy_level` | số nguyên không dấu | 1 byte | mức | theo năng lực máy | Do bác sĩ đặt, ứng dụng không tự chọn |
| 4 | `treatment_mode` | mã | 1 byte | | `0` cold, `1` hybrid, `2` thermal | Bảng mã chờ firmware xác nhận |
| 5 | `day` | số nguyên | 1 byte | | 1 đến 31 | Giờ đồng hồ của máy, mục 7 |
| 6 | `month` | số nguyên | 1 byte | | 1 đến 12 | |
| 7 | `year` | số nguyên | A: 4 chữ số; B: 1 byte, năm trừ 2000 | | | |
| 8 | `hour` | số nguyên | 1 byte | | 0 đến 23 | |
| 9 | `minute` | số nguyên | 1 byte | | 0 đến 59 | |
| 10 | `second` | số nguyên | 1 byte | | 0 đến 59 | |

Tổng phần tải phương án B: 26 byte.

## 6. Trường của bản tin trả lời

| Bản tin | Trường | Kiểu | Độ rộng (B) | Giá trị |
|---|---|---|---|---|
| `NAK` | `code` | A: chuỗi; B: mã 1 byte | 1 | `BAD_CHECKSUM` (1), `BAD_FIELDS` (2), `BUSY` (3); firmware bổ sung mã khác ở mục 10 |
| `STA` | `state` | mã | 1 | `0` idle, `1` running, `2` done, `3` stopped, `4` error |
| `STA` | `remaining_s` | số nguyên không dấu | 2 | giây còn lại của phiên |
| `INF` | `protocol_version` | số nguyên không dấu | 1 | mục 9 |
| `INF` | `firmware_version` | chuỗi | 16 | ví dụ `0.1.0` |
| `INF` | `model` | chuỗi | 16 | mã mẫu máy |
| `CAP` | `energy_min`, `energy_max` | số nguyên không dấu | 1 mỗi trường | khoảng mức năng lượng máy chấp nhận |
| `CAP` | `mode_mask` | số nguyên không dấu | 1 | bit thứ n bật khi chế độ có mã n dùng được, ví dụ 7 là cả ba chế độ |
| `CAP` | `time_min_s`, `time_max_s` | số nguyên không dấu | 2 mỗi trường | khoảng thời gian điều trị máy chấp nhận |

## 7. Thời gian và quy tắc trao đổi

- Đồng hồ máy theo giờ Việt Nam (UTC+7). Ứng dụng đổi giờ điện thoại sang UTC+7 trước khi gửi, nên điện thoại đặt múi giờ khác vẫn gửi đúng.
- Sau khi nhận một khung `CFG` đúng, máy trả `ACK` trong vòng 2000 ms.
- Ứng dụng không nhận `ACK` hoặc `NAK` trong 2000 ms thì gửi lại, tối đa 2 lần gửi lại (tổng 3 lần). Nhận `NAK` thì không gửi lại tự động.
- Máy nhận lại cùng một cấu hình (do ứng dụng gửi lại) thì trả `ACK` lần nữa và giữ cấu hình, không coi là lỗi.
- Khung sai checksum: máy trả `NAK` mã `BAD_CHECKSUM`. Sai số trường hoặc giá trị ngoài khoảng: `NAK` mã `BAD_FIELDS`.
- Khi phiên đang chạy, máy phát `STA` mỗi giây; kết thúc phiên phát `STA` với `done` hoặc `stopped`.
- Một khung dài không quá 1024 byte; vượt thì bên nhận bỏ bộ đệm và chờ ký tự mở khung kế tiếp.

## 8. Ví dụ đối chiếu

Cấu hình mẫu: `patient_id` `BN001`, 120 giây, mức 3, chế độ cold, thời điểm 2026-11-10T23:30:05Z (tức 06:30:05 ngày 11/11/2026 giờ máy). Các chuỗi dưới đây do phía ứng dụng tính bằng một chương trình Python độc lập ngày 11/11/2026; chưa chạy trên mạch thật.

| # | Phương án | Hướng | Byte hoặc chuỗi | Ý nghĩa |
|---|---|---|---|---|
| V1 | A | tới máy | `$CFG,BN001,120,3,0,11,11,2026,6,30,5*49\r\n` | Cấu hình mẫu |
| V2 | A | tới ứng dụng | `$ACK,CFG*27\r\n` (hex `24 41 43 4B 2C 43 46 47 2A 32 37 0D 0A`) | Xác nhận cấu hình |
| V3 | A | tới ứng dụng | `$NAK,CFG,BUSY*1B\r\n` | Từ chối, máy đang bận |
| V4 | A | tới ứng dụng | `$STA,1,42*71\r\n` | Đang chạy, còn 42 giây |
| V5 | A | tới máy | `$INF*41\r\n` | Hỏi thông tin máy |
| V6 | A | tới ứng dụng | `$INF,1,0.1.0,SIM-PLASMA*15\r\n` | Giao thức 1, firmware 0.1.0 |
| V7 | A | tới máy | `$CAP*52\r\n` | Hỏi năng lực |
| V8 | A | tới ứng dụng | `$CAP,1,5,7,60,1800*42\r\n` | Mức 1 đến 5, ba chế độ, 60 đến 1800 giây |
| V9 | A | tới ứng dụng | `$ACK,CFG*28\r\n` | Sai checksum, phải bị bỏ |
| V10 | B | tới máy | `AA 55 01 1A 42 4E 30 30 31 00 00 00 00 00 00 00 00 00 00 00 78 00 03 00 0B 0B 1A 06 1E 05 58 BA` | Cấu hình mẫu |
| V11 | B | tới ứng dụng | `AA 55 81 01 01 E1 B8` | Xác nhận cấu hình |

Nhóm firmware cần gửi lại các ví dụ tương ứng chụp từ mạch thật (cột "Nguồn: firmware"). Ví dụ của hai bên phải trùng từng byte.

## 9. Phiên bản

- `protocol_version` là số nguyên, bắt đầu từ 1. Tăng khi đổi bất kỳ mục 3 đến 6 theo cách bản cũ không đọc được.
- Thêm mã `NAK` hoặc trạng thái mới không cần tăng phiên bản, nhưng phải ghi vào tài liệu này.
- Khi kết nối, ứng dụng gửi `INF`; phiên bản máy khác phiên bản ứng dụng thì ứng dụng không gửi cấu hình và báo người dùng cập nhật.

## 10. Phần nhóm firmware điền

| # | Câu hỏi | Trả lời của firmware |
|---|---|---|
| F1 | Chọn phương án khung A hay B, hay định dạng khác (gửi mô tả) | |
| F2 | Kiểu checksum | |
| F3 | Tốc độ baud và khung byte | |
| F4 | Cầu USB-UART dùng trên mạch (mã chip); bộ chuyển cho iPhone | |
| F5 | Thứ tự, kiểu, độ rộng, đơn vị của 10 trường ở mục 5 có đúng không | |
| F6 | Bảng mã `treatment_mode` và danh sách mức năng lượng thật | |
| F7 | Khoảng `min_treatment_time` máy chấp nhận | |
| F8 | Firmware có cài `INF`, `CAP` không; nếu không, có kế hoạch cài không | |
| F9 | Danh sách mã `NAK` và trạng thái `STA` thật | |
| F10 | Thời gian máy cần để trả `ACK`; máy có phát `STA` không | |
| F11 | Máy có ghi nhật ký phiên để ứng dụng đọc lại không (TR2, FR4) | |
| F12 | Ví dụ đối chiếu từ mạch thật (mục 8) | |
| F13 | Mã VID, PID thật của cầu USB-UART trên mạch (đọc bằng `lsusb` hoặc Device Manager); mạch có bật DTR, RTS không | |

Xác nhận: phía firmware ............ ngày ........ ; phía ứng dụng ............ ngày ........ ; `protocol_version` = ....

## Tài liệu tham khảo

[1] Silicon Labs, "CP210x USB to UART Bridge VCP Drivers". https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers (truy cập 11/11/2026; danh sách trình điều khiển gồm Windows, macOS, Linux, Android, không có iOS).

[2] Wikipedia, "NMEA 0183", mục định dạng câu và checksum. https://en.wikipedia.org/wiki/NMEA_0183 (truy cập 11/11/2026).

[3] G. Cook, "Catalogue of parametrised CRC algorithms with 16-bit width", CRC RevEng. https://reveng.sourceforge.io/crc-catalogue/16.htm (truy cập 11/11/2026; CRC-16/IBM-3740 bí danh CRC-16/CCITT-FALSE check 0x29B1, CRC-16/MODBUS check 0x4B37).
