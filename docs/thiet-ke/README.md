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
| 3 | User requirements | [03-nhu-cau-nguoi-dung.md](03-nhu-cau-nguoi-dung.md) | 17 UR, chưa hỏi người dùng thật |
| 4 | Analyse | [04-phan-tich.md](04-phan-tich.md) | 5 mâu thuẫn, phương án là đề xuất |
| 5 | Functional requirements | [05-nhu-cau-tinh-nang.md](05-nhu-cau-tinh-nang.md) | 18 FR, 7 NFR, nhiều ngưỡng chờ chốt |
| 6 | Solutions generation | [06-tim-giai-phap.md](06-tim-giai-phap.md) | S1 đã chốt; C1 hay C2 chờ dạng mô-đun AI; nền tảng chờ quyết định |
| 7 | Conceptual design | [07-thiet-ke-cau-truc.md](07-thiet-ke-cau-truc.md) | 15 TR |
| 8 | Verif/validation | [08-kiem-chung-thiet-ke.md](08-kiem-chung-thiet-ke.md) | Verification trên giấy đạt; kịch bản validation V1 đến V7 có, chưa thử |
| 9 | Design requirements | [09-yeu-cau-thiet-ke.md](09-yeu-cau-thiet-ke.md) | 15 DR, bản nháp chờ validation |
| 10 | Detailed design | [10-kien-truc-tong-the.md](10-kien-truc-tong-the.md), [10-thiet-ke-chi-tiet.md](10-thiet-ke-chi-tiet.md) | Bản nháp |
| 11 | Product technical docs | [11-ho-so-ky-thuat.md](11-ho-so-ky-thuat.md) | Bảng mối nguy, dàn ý hướng dẫn |
| 12 | Product verif/validation | [12-kiem-chung-san-pham.md](12-kiem-chung-san-pham.md) | Kiểm thử tự động đạt; validation chưa làm |
| 13 | Prototypes | [13-nguyen-mau.md](13-nguyen-mau.md) | Demo web có; bản Android USB giai đoạn 2 |
| 14 | Tests | [14-thu-nghiem.md](14-thu-nghiem.md) | Kịch bản trên dữ liệu giả lập |
| 15 | Industrialisation | [15-cong-nghiep-hoa.md](15-cong-nghiep-hoa.md) | Ngoài phạm vi |

Tài liệu đi kèm:

- [doi-chieu-ma-nguon.md](doi-chieu-ma-nguon.md): gắn từng FR, NFR với tệp mã hiện có, liệt kê phần thiếu và phần thừa.
- [doi-chieu-quy-trinh-8-buoc.md](doi-chieu-quy-trinh-8-buoc.md): xếp quy trình 8 bước của chủ đồ án vào khung 15 bước, kèm chỗ khớp và chỗ lệch.
- [cau-hoi-mo-va-tai-lieu.md](cau-hoi-mo-va-tai-lieu.md): 12 câu hỏi (một số đã có câu trả lời) và danh mục tài liệu tham khảo [1] đến [7].
- [10-kien-truc-tong-the.md](10-kien-truc-tong-the.md): bản nháp kiến trúc tổng thể ứng dụng (tầng, quyết định kiến trúc, mô-đun, luồng dữ liệu).
- [de-xuat-backend.md](de-xuat-backend.md): đề xuất backend (kiến trúc, bảng FR sang API, phương án đồng bộ, bảo mật); chỉ thiết kế, không lập trình.
- [de-xuat-co-so-du-lieu.md](de-xuat-co-so-du-lieu.md): đề xuất mô hình dữ liệu (sơ đồ ER, bảng, đối chiếu với `src/lib/types.ts`).
- [../huong-dan/chay-usb-android.md](../huong-dan/chay-usb-android.md): cách dựng bản Android có USB thật và thử với mạch.
- Giai đoạn 5, thiết kế giao diện: [giao-dien-01-danh-sach-man.md](giao-dien-01-danh-sach-man.md) (35 màn theo vai trò và FR), [giao-dien-02-luong-man.md](giao-dien-02-luong-man.md) (sơ đồ luồng từng vai trò, luồng demo một máy), [giao-dien-03-wireframe.md](giao-dien-03-wireframe.md) (wireframe từng màn, trạng thái lỗi USB/UART, danh sách đề xuất đổi mã).
- [icd-usb-uart.md](icd-usb-uart.md): bản nháp tài liệu giao tiếp USB/UART (khung, bản tin, 10 trường, ví dụ đối chiếu) gửi nhóm firmware điền và xác nhận.

## Quy ước

- Mã định danh: `UR` nhu cầu người dùng, `FR` nhu cầu chức năng, `NFR` nhu cầu phi chức năng, `TR` nhu cầu kỹ thuật, `GA` giả định phần cứng, `A` mâu thuẫn ở bước Analyse.
- Con số ghi "(đx)" là đề xuất chưa có nguồn, cần giảng viên hoặc bác sĩ chốt.
- Số trong ngoặc vuông, ví dụ [3, mục 4.7], trỏ tới danh mục tài liệu tham khảo.
- Theo slide 27, nếu validation ở bước 8 không đạt thì quay lại UR hoặc FR. Vì vậy mã nguồn chỉ đổi lớn sau khi bước 8 đạt; khi đổi, cập nhật `doi-chieu-ma-nguon.md` trong cùng pull request.
