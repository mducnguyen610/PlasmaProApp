# Hồ sơ thiết kế phần mềm Plasma Pro

**Đề tài:** Nghiên cứu, thiết kế và phát triển ứng dụng điện thoại hỗ trợ quản lý quá trình điều trị vết thương bằng thiết bị Plasma Pro, tích hợp mô-đun nhận diện vết thương và giao tiếp USB/UART. Bảng phạm vi từng thành phần nằm ở [00-pham-vi-va-gia-dinh.md](00-pham-vi-va-gia-dinh.md).

Thư mục này ghi lại việc đi qua quy trình thiết kế 15 bước ở slide 12 của bài giảng *Phương pháp luận thiết kế*, phần 1 (TS. Lương Thị Hồng Liên, 10/04/2026). Mỗi bước có một tệp riêng. Tầng sau phải truy được về tầng trước: TR về FR, FR về UR, UR về ba câu hỏi ý tưởng.

Vòng thiết kế này bắt đầu ngày 10/11/2026. Kết quả vòng cũ (10/10 đến 10/11/2026), gồm mã nguồn hiện tại và `docs/YEU_CAU_TONG_THE_PLASMA_PRO.md`, chỉ là sản phẩm tham khảo.

## Trạng thái các bước

| # | Bước (slide 12) | Tệp | Trạng thái |
|---|---|---|---|
| 0 | Tên đề tài, phạm vi, giả định phần cứng | [00-pham-vi-va-gia-dinh.md](00-pham-vi-va-gia-dinh.md) | Phạm vi đã chốt; giả định chờ nhóm phần cứng |
| 1 | Initial Idea | [01-y-tuong-ban-dau.md](01-y-tuong-ban-dau.md) | Bản nháp |
| 2 | Research | [02-nghien-cuu.md](02-nghien-cuu.md) | Bản nháp, thiếu thông số phần cứng |
| 3 | User requirements | [03-nhu-cau-nguoi-dung.md](03-nhu-cau-nguoi-dung.md) | 16 UR, chưa hỏi người dùng thật |
| 4 | Analyse | [04-phan-tich.md](04-phan-tich.md) | 5 mâu thuẫn, phương án là đề xuất |
| 5 | Functional requirements | [05-nhu-cau-tinh-nang.md](05-nhu-cau-tinh-nang.md) | 14 FR, 7 NFR, nhiều ngưỡng chờ chốt |
| 6 | Solutions generation | [06-tim-giai-phap.md](06-tim-giai-phap.md) | S1 đã chốt; C1 hay C2 chờ dạng mô-đun AI; nền tảng chờ quyết định |
| 7 | Conceptual design | [07-thiet-ke-cau-truc.md](07-thiet-ke-cau-truc.md) | 12 TR |
| 8 | Verif/validation | [08-kiem-chung-thiet-ke.md](08-kiem-chung-thiet-ke.md) | Verification trên giấy đạt; validation chưa làm |
| 9 đến 15 | Design requirements đến Industrialisation | [09-15-ke-hoach.md](09-15-ke-hoach.md) | Chỉ có kế hoạch |

Tài liệu đi kèm:

- [doi-chieu-ma-nguon.md](doi-chieu-ma-nguon.md): gắn từng FR, NFR với tệp mã hiện có, liệt kê phần thiếu và phần thừa.
- [doi-chieu-quy-trinh-8-buoc.md](doi-chieu-quy-trinh-8-buoc.md): xếp quy trình 8 bước của chủ đồ án vào khung 15 bước, kèm chỗ khớp và chỗ lệch.
- [cau-hoi-mo-va-tai-lieu.md](cau-hoi-mo-va-tai-lieu.md): 9 câu hỏi đang chặn và danh mục tài liệu tham khảo [1] đến [5].
- [10-kien-truc-tong-the.md](10-kien-truc-tong-the.md): bản nháp kiến trúc tổng thể ứng dụng (tầng, quyết định kiến trúc, mô-đun, luồng dữ liệu).
- [icd-usb-uart.md](icd-usb-uart.md): bản nháp tài liệu giao tiếp USB/UART (khung, bản tin, 10 trường, ví dụ đối chiếu) gửi nhóm firmware điền và xác nhận.

## Quy ước

- Mã định danh: `UR` nhu cầu người dùng, `FR` nhu cầu chức năng, `NFR` nhu cầu phi chức năng, `TR` nhu cầu kỹ thuật, `GA` giả định phần cứng, `A` mâu thuẫn ở bước Analyse.
- Con số ghi "(đx)" là đề xuất chưa có nguồn, cần giảng viên hoặc bác sĩ chốt.
- Số trong ngoặc vuông, ví dụ [3, mục 4.7], trỏ tới danh mục tài liệu tham khảo.
- Theo slide 27, nếu validation ở bước 8 không đạt thì quay lại UR hoặc FR. Vì vậy mã nguồn chỉ đổi lớn sau khi bước 8 đạt; khi đổi, cập nhật `doi-chieu-ma-nguon.md` trong cùng pull request.
