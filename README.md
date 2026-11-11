# Plasma Pro – ứng dụng IoMT theo dõi vết thương (bản demo)

Ứng dụng di động cho hệ thống IoMT của thiết bị Plasma Pro điều trị tại nhà, dựng theo
`Plasma_Pro_Dac_ta_chuc_nang_app (1).md` (v1.1, 12/10/2026) và slide `IoT_Plasma_Pro_System V2.pptx`.

> **Hồ sơ thiết kế:** từ ngày 10/11/2026, đồ án đi lại quy trình thiết kế 15 bước của bài giảng *Phương pháp luận thiết kế*. Bộ UR, FR, TR và bảng đối chiếu với mã nguồn nằm ở [`docs/thiet-ke/`](docs/thiet-ke/README.md). Mã nguồn và đặc tả mô tả bên dưới thuộc vòng cũ, dùng làm sản phẩm tham khảo cho đến khi bước 8 (validation) đạt.
Viết bằng Expo SDK 58 (React Native, TypeScript, Expo Router) để chạy thử trên iPhone qua Expo Go từ máy Windows.

Toàn bộ dữ liệu trong bản demo là **dữ liệu mô phỏng**, lưu cục bộ trên máy; ảnh mẫu trong `assets/demo` là hình vẽ trừu tượng, không phải ảnh bệnh nhân.

## Luồng demo cập nhật

- Giao diện theo Fitness App trong Best Flutter UI Templates; font Google Sans Flex từ bộ font được cung cấp, ghép Latin/Latin Extended/Vietnamese ở 3 độ đậm, kèm giấy phép.
- Đăng nhập bằng tên tài khoản và mật khẩu. Mật khẩu của các tài khoản mẫu: **Demo@123**; tên đăng nhập: **bacsi**, **bacsi2**, **benhnhan**, **benhnhan2**, **quantri**.
- Đăng ký bệnh nhân tạo hồ sơ chờ phân công bác sĩ. Đăng ký bác sĩ/kỹ thuật cần quản trị duyệt; quyền nghiên cứu cấp riêng. Đồng ý điều khoản có lưu thời điểm/phiên bản; đồng ý nghiên cứu là tùy chọn độc lập và có thể rút tại Tài khoản.
- Bệnh nhân xem lịch trình, thiết bị và ba mức **Nhẹ / Trung bình / Nặng** do bác sĩ đánh giá. Bệnh nhân không chụp/tải ảnh. Đánh giá cũ thiếu mức độ không được tự gán mức.
- Bác sĩ quản lý nhiều bệnh nhân, tìm kiếm/lọc mức độ, chụp/tải ảnh và nhập diện tích. Ở chi tiết ảnh, bác sĩ xác nhận ảnh không lộ thông tin nhận dạng rồi chia sẻ.
- Kỹ thuật mở tab **Dữ liệu** để xem/tải bộ ảnh đã duyệt theo bộ lọc. Chỉ có ảnh do bác sĩ thu thập, có diện tích, không bị loại và bệnh nhân còn đồng ý nghiên cứu.
- Bản xuất là bản sao PNG đã bỏ metadata, dùng mã nghiên cứu RS, kèm labels.csv; không có tên, điện thoại, năm sinh hay ngày chụp. Ảnh gốc giữ riêng. Cần bác sĩ kiểm tra nhận dạng trong nội dung ảnh; đổi mã không đồng nghĩa ẩn danh tuyệt đối.
- Dữ liệu cũ được giữ nguyên. Các ảnh cũ cần bác sĩ xác nhận chia sẻ; quản trị có thể bật quyền nghiên cứu của mình ở tab Tài khoản. Không khôi phục demo nếu cần giữ thay đổi đang có.

Đây vẫn là demo lưu cục bộ. Mật khẩu đăng ký lưu dạng hash SHA-256 có salt để không lưu nguyên văn, không thay thế xác thực máy chủ/KDF mật khẩu cho sản phẩm thật. Mọi phân quyền hiện ở phía ứng dụng; chưa phù hợp lưu dữ liệu bệnh nhân thật.

## Chạy trên iPhone (Expo Go)

1. Cài **Expo Go** bản mới nhất (58.x, hỗ trợ SDK 58) từ App Store trên iPhone. Laptop cần Node.js 22.13 trở lên (hoặc 24.3 trở lên).
2. iPhone và laptop dùng chung một mạng Wi-Fi.
3. Trên laptop:

   ```bash
   cd PlasmaProApp
   npm install
   npx expo start
   ```

4. Mở app **Camera** trên iPhone, quét mã QR hiện trong terminal, chọn "Mở trong Expo Go".

Nếu mạng trường chặn kết nối giữa các máy, chạy `npx expo start --tunnel`.

Chạy thử trên trình duyệt: `npm run web`. Kiểm thử quy tắc đặt tên ảnh: `npm test`.

## Tài khoản mẫu

| Tài khoản | Vai trò | Ghi chú |
| --- | --- | --- |
| BS. Trần Minh An | Bác sĩ | Phụ trách BN001–BN003, có quyền xuất dữ liệu nghiên cứu |
| BS. Lê Thu Hà | Bác sĩ | Chưa có bệnh nhân, chưa có quyền nghiên cứu |
| Nguyễn Văn A, Phạm Thị B | Bệnh nhân | Hồ sơ BN001, BN002 |
| Quản trị kỹ thuật | Quản trị | Không xem được dữ liệu lâm sàng |

Tài khoản → Khôi phục dữ liệu mô phỏng để đưa bản demo về trạng thái ban đầu.

## Đối chiếu với đặc tả

| Đặc tả | Màn hình | Tệp |
| --- | --- | --- |
| BS01 Trang chủ | Bệnh nhân, ảnh mới, công việc cần xử lý | `src/app/doctor/index.tsx` |
| BS02 Danh sách bệnh nhân | Tìm theo tên/mã (bỏ dấu), thêm mới | `src/app/doctor/patients.tsx`, `src/app/patients/new.tsx` |
| BS03 Hồ sơ bệnh nhân | Thông tin, đồng ý nghiên cứu, thiết bị, liệu trình, vết thương, triệu chứng | `src/app/patients/[id].tsx` |
| BS04 Chi tiết vết thương | Album theo ngày, biểu đồ diện tích, đánh giá, chụp/tải ảnh | `src/app/wounds/[id].tsx` |
| BS05 Xem ảnh và đổi tên | Phóng to, nhập diện tích hoặc sửa tên đầy đủ, xem trước, lịch sử sửa | `src/app/images/[id].tsx` |
| BS06 Đánh giá | Đặc điểm, triệu chứng + nguồn, diễn biến, hướng dẫn, công bố cho BN | `src/app/evaluate/[woundId].tsx` |
| BS07 Liệu trình, thiết bị | Phiên bản, người sửa, lý do; phiên sử dụng, bật/tắt nguồn có xác nhận | `src/app/plan/[patientId].tsx`, `src/app/devices/[id].tsx` |
| BS08 Dữ liệu huấn luyện | Lọc chưa có/đã có/đã loại, xuất ZIP + labels.csv | `src/app/doctor/dataset.tsx` |
| Mục 6 Bệnh nhân | Trang chủ, lịch sử, lịch trình, liệu trình, báo triệu chứng, thiết bị | `src/app/patient/*`, `src/app/report.tsx` |
| Mục 9 Quản trị | Khóa tài khoản, cấp quyền nghiên cứu, phân công BS, đăng ký/gán thiết bị, lỗi đồng bộ | `src/app/admin/*` |
| Mục 8 So sánh trước/sau | Chọn hai ảnh, chênh lệch diện tích | `src/app/compare/[woundId].tsx` |

Quy tắc đặt tên (mục 4.3, 4.4) nằm trong `src/lib/naming.ts`, có kiểm thử ở `src/lib/naming.test.ts`:
`<ma_benh_nhan>_<ma_vet_thuong>_<ma_anh>_area_<dien_tich>_cm2.<duoi_tep>`.

### Tiêu chí nghiệm thu (mục 12)

- Nhấn ảnh, mở được sửa tên: có (nút "Sửa tên ảnh").
- Lưu tên chuẩn có giá trị và đơn vị: có; `12,5` → `12.5`, mm² được quy đổi sang cm².
- Không ghi đè khi trùng diện tích: mã ảnh `IMGxxxx` duy nhất nằm trong tên.
- Tên tệp và diện tích luôn khớp: cả hai được cập nhật trong cùng một thao tác (`labelImage` trong `src/lib/store.tsx`).
- Không đổi nội dung ảnh: tệp ảnh lưu theo mã ảnh cố định; tên chỉ là siêu dữ liệu, áp vào khi xuất.
- Ảnh chưa có diện tích tách riêng: bộ lọc "Chưa có", không bao giờ mặc định 0; nhập 0 phải xác nhận lại.
- ZIP chứa bản ảnh nghiên cứu dùng mã RS, diện tích khớp CSV; kèm `labels.csv` + `README.txt`).
- Quyền sửa nhãn và xuất dữ liệu theo tài khoản: chỉ bác sĩ phụ trách sửa nhãn; chỉ bác sĩ có quyền nghiên cứu xuất; chỉ ảnh của bệnh nhân đã đồng ý.

## Tệp APK Android

Hai tệp APK không còn nằm trong repo để bản tải ZIP nhẹ hơn khoảng 110 MB. Cả hai được dựng từ mã gốc commit `10e9f40` (18/10/2026, Expo SDK 57), chưa gồm các thay đổi về sau, chỉ dùng để tham khảo:

- Bản thường: https://github.com/mducnguyen610/PlasmaProApp/raw/10e9f40/dist-apk/PlasmaPro-1.0.0.apk
- Bản có AR (ARCore): https://github.com/mducnguyen610/PlasmaProApp/raw/10e9f40/dist-apk/PlasmaPro-AR.apk

Khi dựng APK mới, đăng lên mục Releases của GitHub thay vì đưa vào repo.

## Căn cứ pháp lý

Danh sách văn bản (số hiệu, ngày, nguồn) nằm trong `src/lib/compliance.ts` và hiển thị trong app ở Tài khoản → Căn cứ pháp lý.

## Giới hạn của bản demo

- Chưa có máy chủ: chưa kết nối Firebase/Firestore và ESP32 như kiến trúc trên slide; trạng thái thiết bị và lệnh bật/tắt là mô phỏng.
- Đăng nhập/đăng ký cục bộ có mật khẩu demo, chưa có xác thực máy chủ.
- Chưa có nhắc lịch (thông báo đẩy) và xuất báo cáo; đây là chức năng giai đoạn 2 trong đặc tả.
