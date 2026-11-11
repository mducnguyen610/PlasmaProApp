# Giai đoạn 5.2. Sơ đồ luồng màn hình theo vai trò

Trạng thái: **bản nháp** (11/11/2026). Mã màn lấy từ [giao-dien-01-danh-sach-man.md](giao-dien-01-danh-sach-man.md). Mũi tên lấy từ các lệnh `router.push`, `router.replace`, `Redirect` và thanh tab trong `src/app/` và `src/components/` (nhánh `trien-khai/giai-doan-2`, commit `a2719c8`). Mũi tên nét đứt là luồng đề xuất, chưa có trong mã.

## 1. Vào ứng dụng (mọi vai trò)

```mermaid
flowchart TD
  start([Mở ứng dụng]) --> C01[C01 Đăng nhập]
  C01 -->|Có mã kích hoạt| C03[C03 Kích hoạt]
  C01 -->|Chưa có tài khoản| C02[C02 Đăng ký]
  C02 -->|Tạo xong| C01
  C03 -->|Kích hoạt xong, tự đăng nhập| R{Vai trò}
  C01 -->|Đăng nhập được| R
  C01 -->|Điều khoản mới| C01T[Ô đồng ý điều khoản trên C01] --> R
  C01T -.-> C04[C04 Điều khoản]
  R -->|Người bệnh, lần đầu| N01[N01 Hướng dẫn lần đầu] --> N02
  R -->|Người bệnh| N02[N02 Trang chủ người bệnh]
  R -->|Bác sĩ| B01[B01 Trang chủ bác sĩ]
  R -->|Quản trị viên| Q01[Q01 Quản lý tài khoản]
```

Mọi màn trong nhóm vai trò kiểm `me.role`; sai vai trò thì về C01 (`RoleTabs`). Màn C06 Tài khoản ở tab cuối của cả ba vai trò, dẫn tới C04, C05, N01 (xem lại) và Đăng xuất (về C01).

## 2. Người bệnh

Thanh tab: Trang chủ (N02), Lịch sử (N04), nút giữa Lịch trình (N03), Thiết bị (N07), Tài khoản (C06).

```mermaid
flowchart TD
  N02[N02 Trang chủ] -->|Thẻ đợt điều trị, nút giữa| N03[N03 Lịch trình]
  N02 -->|Báo triệu chứng hoặc sự cố| N08[N08 Báo triệu chứng]
  N02 -->|Mục Vết thương, tab Lịch sử| N04[N04 Hồ sơ và lịch sử]
  N04 --> N05[N05 Chi tiết vết thương]
  N05 -.->|Đề xuất: chưa có lối vào| N06[N06 Đợt điều trị của tôi]
  N02 -->|Tab Thiết bị| N07[N07 Thiết bị của tôi]
  N07 -->|Kết nối máy và nạp liệu trình| T01[T01 Kết nối và nạp liệu trình]
  N07 -->|Theo dõi phiên điều trị| T02[T02 Theo dõi phiên]
  N07 -->|Báo sự cố thiết bị| N08
  T01 -->|Máy đã nhận cấu hình| T02
  T02 -.->|Phiên xong: đề xuất mở ghi cảm giác| N03
```

Luồng chính tại nhà (một buổi điều trị):

1. N02 cho biết hôm nay có cần chiếu không (FR1) và các việc trước khi chiếu.
2. Cắm cáp USB OTG từ điện thoại vào máy, mở N07, bấm "Kết nối máy và nạp liệu trình" để vào T01.
3. T01 kết nối, hỏi thông tin máy, hiện cấu hình sẽ gửi, gửi xuống máy (FR2). Lỗi ở bước này xử lý theo [giao-dien-03-wireframe.md](giao-dien-03-wireframe.md), mục T01.
4. Máy nhận cấu hình thì sang T02. Người bệnh bấm nút trên máy; T02 hiện thời gian còn lại theo bản tin `STA`.
5. Phiên xong, người bệnh ghi cảm giác ở N03 (FR6). Mũi tên T02 sang N03 là đề xuất; hiện người bệnh tự quay về N03.

N06 có chế độ xem cho người bệnh trong `plan/[patientId].tsx` nhưng không màn nào của người bệnh dẫn tới (chỉ B01, B04, B05 có `router.push` tới tệp này). Thông tin đợt điều trị người bệnh cần đã hiện ở N02, N03 và thẻ đợt trong N05. Đề xuất: hoặc thêm lối vào từ thẻ đợt ở N05, hoặc bỏ chế độ xem người bệnh của N06.

## 3. Bác sĩ

Thanh tab: Trang chủ (B01), Bệnh nhân (B02), nút giữa Chụp ảnh (B09), Ảnh (B12), Tài khoản (C06).

```mermaid
flowchart TD
  B01[B01 Trang chủ] -->|Thẻ người bệnh| B04
  B01 -->|Ô Báo cáo triệu chứng| B04
  B01 -->|Ô Ảnh chưa đo, Ảnh cần chụp lại| B11
  B01 -->|Ô Đợt nháp chờ xác nhận| B06
  B01 -->|Ô Thiết bị chưa đồng bộ| B13
  B02[B02 Danh sách người bệnh] -->|Thêm mới| B03[B03 Thêm người bệnh] -->|Đã tạo hồ sơ| B04
  B02 --> B04[B04 Hồ sơ người bệnh]
  B04 -->|Vết thương| B05[B05 Thông tin vết thương]
  B04 -->|Đợt điều trị| B06[B06 Thiết lập điều trị]
  B04 -->|Thiết bị| B13[B13 Thiết bị và nhật ký]
  B05 -->|Lập đợt, Sửa đợt| B06
  B05 -->|Chụp, thêm ảnh có hướng dẫn| B10
  B05 -->|Đánh giá| B07[B07 Đánh giá]
  B05 -->|So sánh, từ 2 ảnh| B08[B08 So sánh trước và sau]
  B09[B09 Chọn hồ sơ để chụp] --> B10[B10 Chụp có hướng dẫn, kết quả AI]
  B10 -->|Lưu ảnh| B11[B11 Chi tiết ảnh, nhãn diện tích]
  B12[B12 Danh sách ảnh] --> B11
  B11 -->|Ghi đánh giá với ảnh này| B07
  B11 -.->|Gán nhãn theo phương pháp đã chốt: giai đoạn 7| L7[[Màn gán nhãn giai đoạn 7]]
  B13 -->|Kết nối máy và nạp liệu trình| T01[T01 Kết nối và nạp liệu trình]
  B13 -->|Theo dõi phiên| T02[T02 Theo dõi phiên]
  T01 --> T02
```

Nút L7 chỉ giữ chỗ. Cách gán nhãn (phân loại, khung, phân vùng) thuộc giai đoạn 7 và chờ bác sĩ chốt (FR15).

## 4. Quản trị viên

Thanh tab: Tài khoản (Q01), Dữ liệu (Q02), Thiết bị (Q03), Lỗi (Q04), Cá nhân (C06).

```mermaid
flowchart TD
  Q01[Q01 Quản lý tài khoản] -->|Duyệt, khóa, phân công bác sĩ| Q01
  Q02[Q02 Kho dữ liệu] -->|Xuất ZIP| Q02
  Q03[Q03 Thiết bị] -->|Xem nhật ký| Q06[Q06 Thiết bị và nhật ký mức kỹ thuật]
  Q03 -->|Chẩn đoán kết nối USB/UART| Q05[Q05 Chẩn đoán kết nối]
  Q04[Q04 Lỗi đồng bộ]
```

Quản trị viên không vào được T01, T02 và các màn lâm sàng (`useCanView` trả về sai cho vai trò admin). Q05 là nơi duy nhất xem byte gửi và nhận, đổi giữa USB thật và thiết bị giả lập.

## 5. Luồng demo trên một máy: bác sĩ gửi liệu trình cho người bệnh

Theo quyết định ngày 11/11/2026, luồng này chỉ demo trên một điện thoại, đăng nhập lần lượt từng vai trò. Đồng bộ giữa hai điện thoại để sau khi có backend và cơ sở dữ liệu ([de-xuat-backend.md](de-xuat-backend.md)).

```mermaid
sequenceDiagram
  actor BS as Bác sĩ
  participant App as Ứng dụng (một điện thoại, lưu cục bộ)
  actor NB as Người bệnh
  participant May as Máy Plasma Pro
  BS->>App: C01 đăng nhập bác sĩ
  BS->>App: B04, B06 lập đợt điều trị, lưu phiên bản, xác nhận
  BS->>App: C06 đăng xuất
  NB->>App: C01 đăng nhập người bệnh
  App-->>NB: N02 hiện việc điều trị hôm nay
  NB->>App: N07, T01 kết nối máy
  App->>May: INF, CAP, rồi CFG qua USB/UART
  May-->>App: ACK hoặc NAK
  App-->>NB: T02 theo dõi phiên
```

Giả định: dữ liệu bác sĩ lưu ở bước 2 nằm trong bộ nhớ cục bộ (AsyncStorage) của cùng điện thoại, nên người bệnh thấy ngay sau khi đăng nhập. Khi có máy chủ, bước "đăng xuất, đăng nhập" thay bằng đồng bộ.

## Tài liệu tham khảo

1. Mã nguồn `mducnguyen610/PlasmaProApp`, nhánh `trien-khai/giai-doan-2`, commit `a2719c8`: `src/components/RoleTabs.tsx`, `src/app/*/_layout.tsx`, `src/components/Guard.tsx`.
2. [10-thiet-ke-chi-tiet.md](10-thiet-ke-chi-tiet.md), mục 10.1 và 10.2 (máy trạng thái kết nối và phiên).
