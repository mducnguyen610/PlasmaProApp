# Chạy và thử USB thật trên Android

Áp dụng cho mã giai đoạn 2 (mô-đun gốc `modules/plasma-usb`). Expo Go và bản web **không** có USB thật, vì Expo Go chỉ chứa các mô-đun gốc đóng sẵn; phải dựng ứng dụng thành bản Android riêng.

Trạng thái: mã Kotlin chưa được biên dịch trong môi trường phát triển (không có Android SDK). Lần dựng đầu tiên có thể báo lỗi biên dịch; khi đó gửi nguyên văn lỗi để sửa.

## 1. Cần chuẩn bị

| Thứ | Ghi chú |
|---|---|
| Điện thoại Android hỗ trợ USB Host (OTG) | Hầu hết điện thoại Android hiện nay có; kiểm bằng ứng dụng "USB Host Check" nếu nghi ngờ |
| Cáp OTG: USB-C (hoặc micro-USB) đực sang cổng của mạch | Nếu mạch là USB-C, dùng cáp USB-C sang USB-C có hỗ trợ dữ liệu |
| Mạch Plasma Pro có cầu CP2102N | Nếu chip khác, ứng dụng báo "Không thấy máy Plasma Pro" kèm mã VID:PID đang cắm |
| Một trong hai cách dựng | Cách A: tài khoản Expo (miễn phí) để dựng trên máy chủ EAS. Cách B: Android Studio và Android SDK trên máy tính |

## 2. Dựng ứng dụng

**Cách A, EAS Build (không cần Android Studio):**

```bash
npm install
npx eas-cli@latest login
npx eas-cli@latest build -p android --profile usb-thu
```

Hồ sơ `usb-thu` trong `eas.json` dựng tệp APK cài trực tiếp. Khi xong, EAS in đường link tải APK; mở link trên điện thoại và cài (cho phép cài từ nguồn không xác định nếu được hỏi).

**Cách B, dựng trên máy (cần Android Studio):**

```bash
npm install
npx expo run:android
```

Lệnh này tự sinh thư mục `android/` (không sửa tay, không đưa vào git), dựng và cài lên điện thoại đang cắm cáp gỡ lỗi.

## 3. Thử với mạch

1. Mở ứng dụng, đăng nhập `quantri` (mật khẩu demo `Demo@123`), vào Thiết bị, chọn "Chẩn đoán kết nối USB/UART".
2. Ở khối "Đường truyền", dòng "Đang dùng" phải là **USB thật (Android)**. Nếu là "Thiết bị giả lập", bấm "Dùng USB thật".
3. Cắm cáp OTG từ điện thoại vào mạch. Bấm **Kết nối**. Android hỏi quyền truy cập thiết bị USB: chọn Cho phép.
4. Kết quả mong đợi và cách đọc:

| Ứng dụng báo | Nghĩa | Việc cần làm |
|---|---|---|
| Đã kết nối, có dòng Gửi `$INF*41` | Cổng mở được, đã gửi lệnh hỏi máy | Xem có dòng Nhận không |
| Có dòng Nhận `$INF,...` | Firmware hiểu lệnh hỏi | Ghi lại phiên bản, mẫu máy |
| Không có dòng Nhận, năng lực "dùng bảng dự phòng" | Firmware chưa cài `INF`, `CAP`, hoặc sai baud | Hỏi nhóm firmware câu F3, F8 trong ICD |
| "Chưa thấy thiết bị USB nào" | Điện thoại không nhận cáp | Thử cáp khác, kiểm OTG |
| "Không thấy máy Plasma Pro. Thiết bị USB đang cắm: ... (XXXX:YYYY)" | Mã VID:PID khác `10C4:EA60` | Gửi mã này cho người phát triển để thêm vào `PROTOCOL.usb` (ICD câu F13) |
| "Chưa được cho phép truy cập USB" | Đã bấm Từ chối | Rút cáp, cắm lại, bấm Kết nối, chọn Cho phép |
| "Chỉ hỗ trợ cầu CP210x" | Mã VID khớp danh sách nhưng không phải Silicon Labs | Cần thêm trình điều khiển cho chip đó |

5. Bấm **Gửi cấu hình thử (TEST01)**. Mong đợi: dòng Gửi bắt đầu bằng `$CFG,TEST01,60,1,0,...` và dòng Nhận `$ACK,CFG*27`. So từng byte với cổng gỡ lỗi của firmware.
6. Rút cáp khi đang kết nối: trạng thái phải về "Chưa kết nối", chi tiết "Đã rút cáp USB".
7. Thử luồng thật: đăng nhập `benhnhan`, vào Thiết bị, "Kết nối máy và nạp liệu trình", gửi cấu hình, rồi "Theo dõi phiên" khi bấm nút trên máy.

Lưu ảnh màn chẩn đoán (bản ghi hex) làm bằng chứng cho Chương 4 và cho nhóm firmware.

## 4. Giới hạn hiện tại

- Chỉ hỗ trợ cầu CP210x. Chip khác cần thêm trình điều khiển.
- Ứng dụng không tự mở khi cắm máy; người dùng mở ứng dụng rồi bấm Kết nối.
- Mọi giá trị giao thức vẫn là giả định (`confirmed: false`) cho đến khi nhóm firmware xác nhận ICD.
- iPhone chưa có USB thật (chờ bộ chuyển đổi, ICD câu F4).

## Tài liệu tham khảo

1. Android Developers, "USB host overview". https://developer.android.com/develop/connectivity/usb/host (chưa kiểm lại trong phiên này).
2. Silicon Labs, "AN571: CP210x Virtual COM Port Interface". https://www.silabs.com/documents/public/application-notes/AN571.pdf (chưa kiểm lại trong phiên này).
3. Expo, "Create a development build" và "EAS Build". https://docs.expo.dev/develop/development-builds/create-a-build/ (chưa kiểm lại với SDK 58).
