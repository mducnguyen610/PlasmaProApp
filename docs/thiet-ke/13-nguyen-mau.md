# Bước 13. Prototypes

Trạng thái: **bản nháp**. Theo phạm vi đề tài, nguyên mẫu là ứng dụng điện thoại chạy với thiết bị giả lập và, khi có, mạch Plasma Pro thật qua USB. Máy chủ chỉ đề xuất nên nguyên mẫu không có máy chủ (KT1).

| Bản | Cách chạy | Thiết bị | Dùng để | Trạng thái |
|---|---|---|---|---|
| P1. Demo web một máy | `npm run web` | Giả lập | Trình diễn luồng bác sĩ soạn liệu trình, người bệnh nạp và theo dõi phiên, quản trị xem hex | Có (PR 11) |
| P2. Expo Go trên điện thoại | `npx expo start` | Giả lập | Thử giao diện trên màn nhỏ, camera | Có; USB không chạy trong Expo Go |
| P3. Development build Android | `npx expo run:android` hoặc EAS Build hồ sơ `development` | Mạch thật qua cáp OTG | Thử USB/UART với firmware | Giai đoạn 2, chưa dựng |
| P4. iOS với mạch thật | Chờ bộ chuyển đổi (câu F4 ICD) | Mạch thật | | Chờ phần cứng |

Kịch bản demo P1 nằm trong mô tả PR 11. Kịch bản thử P3 sẽ nằm ở `docs/huong-dan/chay-usb-android.md`.

Bằng chứng cần lưu cho Chương 4: ảnh chụp các màn (ba ảnh ở `/mnt/project-files/datn/demo/`), video luồng P1, bản ghi hex của màn chẩn đoán khi chạy P3.
