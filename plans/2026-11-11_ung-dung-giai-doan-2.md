# Kế hoạch giai đoạn 2: USB thật trên Android, đề xuất backend và database, hồ sơ bước 8 đến 15

Ngày lập: 11/11/2026. Nhánh: `trien-khai/giai-doan-2`, tách từ `trien-khai/giai-doan-1` (PR 11, chưa gộp). Hồ sơ thiết kế: `docs/thiet-ke/`.

## Bối cảnh

Giai đoạn 1 (PR 11) đã lập trình bước 1 đến 5: đặc tả giao thức khai báo, bộ mã hóa khung, giả lập, bộ gửi có xác nhận, ba màn kết nối, theo dõi phiên, chẩn đoán. `src/lib/device/index.ts` luôn trả thiết bị giả lập. Giao diện `DeviceTransport` (`src/lib/device/transport.ts`) đã chừa `kind: 'usb-android' | 'usb-ios'`.

Phạm vi đề tài (chốt 11/11/2026, `docs/thiet-ke/00-pham-vi-va-gia-dinh.md`): ứng dụng được lập trình; backend chỉ đề xuất kiến trúc, chức năng, phương án kết nối; database chỉ đề xuất mô hình dữ liệu; AI chỉ tích hợp mô-đun có sẵn; luồng bác sĩ gửi liệu trình chỉ demo một máy (KT1).

## Việc trong giai đoạn 2 (làm được ngay)

| Mã | Việc | Loại | Phụ thuộc chờ |
|---|---|---|---|
| G2-A | Đường truyền USB thật trên Android | Lập trình (Kotlin + TypeScript) | Giá trị giao thức vẫn giả định (F1 đến F12) |
| G2-B | Hồ sơ đề xuất backend | Tài liệu | Không |
| G2-C | Hồ sơ đề xuất database (gồm Image, Annotation) | Tài liệu | Không |
| G2-D | Hồ sơ bước 8 đến 15 của quy trình bài giảng | Tài liệu | Validation thật cần bác sĩ, người bệnh |
| G2-E (tùy chọn) | Bước 6 giai đoạn 1: lớp `WoundRecognizer` | Lập trình | Dạng mô-đun AI có sẵn chưa biết |
| G2-F (tùy chọn) | Bước 7 giai đoạn 1: xếp người bệnh theo mức cần chú ý | Lập trình | Không |

Ngoài giai đoạn 2 (phải chờ): giao thức thật (firmware trả lời F1 đến F12), `usb-ios` (chờ bộ chuyển đổi), đọc nhật ký phiên (F11), thay bộ dò màu bằng mô-đun AI có sẵn, màn gán nhãn (chờ bác sĩ chốt phương pháp).

## G2-A. USB thật trên Android

### Lựa chọn trình điều khiển

Mạch dùng cầu CP2102N (GA-2). Android không có trình điều khiển CP210x dựng sẵn cho ứng dụng; ứng dụng phải tự gửi lệnh điều khiển qua USB Host API [1]. Hai cách:

1. **Thư viện `usb-serial-for-android`** (mik3y, giấy phép MIT) [2]: có sẵn trình điều khiển CP210x, CH34x, FTDI, PL2303, CDC-ACM. Nếu nhóm phần cứng đổi chip thì không phải viết lại. Cần thêm kho Maven JitPack vào bản dựng.
2. **Tự viết trình điều khiển CP210x** theo tài liệu AN571 của Silicon Labs [3]: khoảng 150 dòng Kotlin, không thêm phụ thuộc, nhưng chỉ chạy với CP210x.

Chọn cách 1. Nếu bản dựng không tải được JitPack thì chuyển sang cách 2, giữ nguyên giao diện mô-đun.

### Tệp

- `modules/plasma-usb/` (mô-đun Expo cục bộ, chỉ Android, cùng kiểu `modules/plasma-ar/`):
  - `expo-module.config.json`, `android/build.gradle` (phụ thuộc `usb-serial-for-android`), `PlasmaUsbModule.kt`.
  - Hàm: `listDevices()` trả `{ id, vendorId, productId, name, driver }[]`; `requestPermission(id)`; `open(id, baudRate, dataBits, parity, stopBits)`; `write(bytes)`; `close()`.
  - Sự kiện: `onData` (byte nhận), `onAttached`, `onDetached`, `onError`.
  - Đọc bằng `SerialInputOutputManager` trên luồng riêng, đẩy về JS qua sự kiện.
  - `app.plugin.js`: thêm `<uses-feature android:name="android.hardware.usb.host">`, intent filter `USB_DEVICE_ATTACHED` và `res/xml/device_filter.xml` (VID 0x10C4, PID 0xEA60 của CP2102N) để Android hỏi mở ứng dụng khi cắm máy. Không sửa thư mục `android/` bằng tay (quy tắc `AGENTS.md`).
- `src/lib/device/usb-android.ts`: bản cài `DeviceTransport` gọi mô-đun trên; lấy thông số UART từ `PROTOCOL.uart`; trạng thái `connecting` khi chờ người dùng cho phép, `error` kèm câu tiếng Việt khi không thấy máy, bị từ chối quyền hoặc rút cáp giữa chừng.
- `src/lib/device/usb-match.ts` (thuần): chọn thiết bị USB nào là Plasma Pro từ danh sách (theo VID, PID trong đặc tả), có kiểm thử `.test.cjs`.
- `src/lib/device/protocol.config.ts`: thêm `usb: { vendorId: 0x10C4, productId: 0xEA60, confirmed: false }`, kèm cập nhật `spec.ts`, `spec-check.ts`, ICD mục kết nối.
- `src/lib/device/index.ts`: `getTransport()` chọn `usb-android` khi chạy Android và mô-đun gốc có mặt (development build), ngược lại dùng giả lập. Màn chẩn đoán của quản trị viên có công tắc "Dùng thiết bị giả lập" để demo trên web và Expo Go.
- `eas.json`: hồ sơ `development` (development client, APK nội bộ).
- `docs/huong-dan/chay-usb-android.md`: cách dựng development build (EAS hoặc `npx expo run:android`), cắm cáp OTG, đọc màn chẩn đoán hex.

### Kiểm chứng

- `npm test`, `npx tsc --noEmit`, `npx expo lint` trên máy dựng mã.
- Môi trường dựng mã của hệ thống không có Android SDK và không tải được kho Google, JitPack, nên **phần Kotlin không biên dịch được ở đây**. Bản dựng và thử với máy thật phải chạy trên máy chủ đồ án hoặc EAS Build. Kịch bản thử tay nằm trong tệp hướng dẫn: cắm máy, cho phép quyền, INF và CAP, gửi cấu hình, nhận ACK, rút cáp giữa phiên.

## G2-B. Đề xuất backend (`docs/thiet-ke/11-de-xuat-backend.md`)

Chỉ thiết kế, không lập trình.

1. Vai trò backend trong hệ thống: nơi chung để bác sĩ và người bệnh trao liệu trình, ảnh, nhật ký phiên (giải quyết giới hạn KT1).
2. Kiến trúc: API REST, xác thực theo vai trò (bác sĩ, người bệnh, quản trị), lưu ảnh dạng đối tượng, hàng đợi đồng bộ.
3. Danh sách chức năng và điểm cuối API theo từng FR (bảng FR sang endpoint).
4. Phương án kết nối với ứng dụng: lớp kho dữ liệu sau này thay AsyncStorage; đẩy hàng đợi thay đổi có khóa chống trùng; kéo thay đổi theo mốc thời gian; xử lý xung đột liệu trình theo phiên bản.
5. Bảo mật và pháp lý: dữ liệu sức khỏe là dữ liệu cá nhân nhạy cảm theo Luật 91/2025/QH15 và Nghị định 13/2023/NĐ-CP [4]; mã hóa đường truyền, nhật ký truy cập.
6. Những gì để ngỏ: chọn nền tảng cụ thể, nơi đặt máy chủ (bệnh viện hay đám mây).

## G2-C. Đề xuất database (`docs/thiet-ke/12-de-xuat-co-so-du-lieu.md`)

Chỉ mô hình dữ liệu. Sơ đồ ER (Mermaid) và bảng từng thực thể: User, Patient, Wound, Image, Annotation, TreatmentPlan (có phiên bản), TreatmentSession, Device, DeviceLinkLog, AIResult, SymptomReport, Consent, DatasetVersion. Mỗi bảng ghi khóa, quan hệ, trường bắt buộc, và đối chiếu với kiểu tương ứng trong `src/lib/types.ts` (ví dụ `WoundImage` sang Image, `LabelChange` sang Annotation). Truy vết về TR8.

## G2-D. Hồ sơ bước 8 đến 15

Viết lại `docs/thiet-ke/09-15-ke-hoach.md` thành các tệp riêng, đúng mức đồ án làm được:

| Bước | Tệp | Nội dung trong phạm vi đề tài |
|---|---|---|
| 8 | `08-kiem-chung-thiet-ke.md` (bổ sung) | Kịch bản validation và phiếu hỏi cho bác sĩ, người bệnh; kết quả để trống đến khi thử |
| 9 | `09-yeu-cau-thiet-ke.md` | Yêu cầu thiết kế từng mô-đun mã, truy về TR |
| 10 | `10b-thiet-ke-chi-tiet.md` | Máy trạng thái phiên và gửi cấu hình, danh sách màn theo vai trò, trỏ tới ICD và G2-C |
| 11 | `11b-ho-so-ky-thuat.md` | Bảng rủi ro phần mềm theo ISO 14971 [5], hướng dẫn sử dụng rút gọn |
| 12 | `12b-kiem-chung-san-pham.md` | Ma trận truy vết FR sang tệp kiểm thử, kết quả `npm test` |
| 13 | `13-nguyen-mau.md` | Bản demo một máy, development build Android, ảnh chụp màn |
| 14 | `14-thu-nghiem.md` | Kịch bản thử trên dữ liệu giả lập; thử nghiệm 30 người bệnh năm 2027 nằm ngoài đề tài |
| 15 | `15-cong-nghiep-hoa.md` | Ngắn: ngoài phạm vi, nêu điều kiện chuyển giao |

Lưu ý phương pháp: theo slide 27, bước 9 trở đi chỉ bắt đầu khi bước 8 đạt validation. Validation với người dùng thật chưa làm, nên các tệp 9 đến 15 ghi rõ "bản nháp, chờ validation".

## G2-E và G2-F (nếu người dùng gộp vào)

Giữ nguyên nội dung bước 6 và 7 của `plans/2026-11-11_ung-dung-giai-doan-1.md`: `src/lib/ai/` với giao diện `WoundRecognizer` và bộ dò màu hiện có làm bản cài tạm; `src/lib/attention.ts` xếp người bệnh theo mức cần chú ý trên màn `src/app/doctor/index.tsx`.

## Thứ tự và pull request

1. PR tài liệu: G2-B, G2-C, G2-D (không đụng mã).
2. PR mã: G2-A (và G2-E, G2-F nếu gộp), cập nhật `docs/thiet-ke/doi-chieu-ma-nguon.md` cùng PR.

## Tài liệu tham khảo

1. Android Developers, "USB host overview". https://developer.android.com/develop/connectivity/usb/host (chưa kiểm lại trong phiên này).
2. M. Wakefield (mik3y) và cộng sự, "usb-serial-for-android", GitHub, giấy phép MIT. https://github.com/mik3y/usb-serial-for-android (chưa kiểm lại phiên bản mới nhất).
3. Silicon Labs, "AN571: CP210x Virtual COM Port Interface". https://www.silabs.com/documents/public/application-notes/AN571.pdf (chưa kiểm lại).
4. Quốc hội Việt Nam, Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15 (hiệu lực 01/01/2026), và Chính phủ Việt Nam, Nghị định 13/2023/NĐ-CP, 17/04/2023.
5. ISO 14971:2019, *Medical devices: Application of risk management to medical devices*.
