# Plasma Pro, Stage 9A: hướng thị giác

Tên hướng: **Clinical Precision** (chính xác lâm sàng). Mục tiêu: một phần mềm quản lý điều trị trông điềm tĩnh, đáng tin, đọc nhanh, khác hẳn mẫu ứng dụng thể dục mà bản trước kế thừa (comment đầu `src/theme.ts` bản trước: "Best Flutter UI Templates / Fitness App").

## 1. Nguyên tắc

1. **Navy là bản sắc, xanh y tế là hành động.** Navy sâu `#17324D` cho thanh nhận diện, thanh bên, chữ tiêu đề, nút giữa thanh tab. Xanh y tế `#1F67A3` (đặc tả gợi ý `#2878B8`, làm tối để đạt AA, xem mục 3) chỉ cho thứ bấm được và trạng thái đang chọn. Người dùng học được: xanh là bấm, navy là khung.
2. **Mòng két có chọn lọc.** `#087F7B` chỉ cho chỉ báo lâm sàng phụ (vòng tiến độ đợt, vạch biểu đồ "teal"). Không màn nào có mòng két làm màu chủ đạo.
3. **Màu chỉ mang nghĩa trạng thái.** Ô số, khối lưu ý, chip giữ nền trắng hoặc nền nhạt, màu trạng thái thu về vạch nhấn 3 px bên trái và chữ số. Không còn khối màu kẹo chiếm diện tích.
4. **Phẳng trước, bóng sau.** Tách lớp bằng viền 1 px `#E2E8F0` và nền `#F5F8FB`. Bóng chỉ cho khối chính của màn (rất nhẹ, opacity 0,07), menu và bảng trượt. Không gradient trang trí.
5. **Hai kiểu thanh tiêu đề, hai vai trò.** Màn chính của vai trò (Trang chủ, Bệnh nhân, Ảnh, Thiết bị, Lỗi hệ thống, Cá nhân...) có thanh nhận diện navy kèm dòng "Plasma Pro · vai trò". Màn chi tiết (hồ sơ, vết thương, đợt, đánh giá, T01, T02...) có thanh trắng phẳng, viền mảnh dưới. Người dùng luôn biết mình đang ở "nơi làm việc" hay "đang xem một mục".
6. **Số lâm sàng lớn hơn nhãn rõ rệt.** Diện tích gần nhất 34 pt đậm màu navy; giá trị tham chiếu (ngày đo, lần đo trước) đặt trong ô nền nhạt cỡ 15. Mọi số dùng chữ số đều bề rộng (`tabular-nums`) để cột số thẳng hàng.
7. **Định danh bệnh nhân bằng chữ cái đầu.** Ký hiệu tròn hai chữ cái của hai tiếng cuối họ tên (tiếng Việt: tên gọi ở cuối) thay cho biểu tượng người chung, dùng ở danh sách, hồ sơ, thanh ngữ cảnh lâm sàng, màn Cá nhân. Trình đọc màn hình vẫn đọc họ tên đầy đủ.
8. **Thiết bị có ngôn ngữ riêng.** T01 có sơ đồ điện thoại nối máy; T02 có bảng điều khiển nền navy, đồng hồ 56 pt chữ trắng. Không trông như một bảng số liệu chung. Nút Dừng điều trị giữ nguyên chỗ (chân màn), màu, cỡ và hành vi.
9. **Điện thoại và máy tính là hai bố cục.** Điện thoại: một cột, lề 16, thanh tab đáy. Máy tính bảng: lề 24, cột đọc 600. Máy tính (từ 1024 px): thanh bên navy 232 px thay thanh tab, cột nội dung 760.
10. **Tiếng Việt dễ đọc.** Giữ Google Sans Flex đã ghép bộ chữ tiếng Việt; không dùng chữ in hoa cho tiêu đề nhóm (dấu bị nén); không giãn chữ; thân bài 16 (bệnh nhân 17).

## 2. Cảm nhận mong muốn và cách đạt

| Cảm nhận (đặc tả 2.1) | Cách thể hiện |
|---|---|
| Chuyên nghiệp lâm sàng, tin cậy | Navy, bề mặt phẳng, viền mảnh, không gradient |
| Chính xác | Chữ số đều bề rộng, số đo chính tách khỏi giá trị tham chiếu, thang chữ ít bậc |
| Rõ ràng, điềm tĩnh | Nền xám xanh rất nhạt, màu chỉ cho trạng thái, khoảng cách theo thang 4 |
| Công nghệ hiện đại | Thanh bên màn rộng, thanh chọn kiểu rãnh, sơ đồ kết nối, bảng điều khiển phiên |
| Quy trình hiệu quả | Thanh tiêu đề màn chính chứa ô tìm kiếm (B02), bộ lọc gom một khối, chân màn cố định giữ nguyên |

## 3. Điều chỉnh so với bảng màu gợi ý trong đặc tả

Đặc tả ghi rõ là "hướng khởi đầu". Các giá trị dưới đây được làm tối để chữ đạt WCAG 2.2 SC 1.4.3 (4,5:1) trên nền nhạt tương ứng; giá trị gốc vẫn dùng cho vạch biểu đồ và thành phần đồ họa (cần 3:1).

| Vai trò | Gợi ý | Dùng cho chữ | Lý do |
|---|---|---|---|
| Xanh y tế | `#2878B8` | `#1F67A3` | `#2878B8` trên nền `#EAF3FA` dưới 4,5:1; bản tối đạt 5,30:1, chữ trắng trên nền đạt 5,95:1 |
| Thông tin | `#2878B8` | `#2470AD` | 4,60:1 trên `#E8F1F9` |
| Thành công | `#25845A` | `#1F7A50` | 4,68:1 trên `#E6F4EC` |
| Cảnh báo | `#C77B27` | `#9A5A12` | `#C77B27` trên trắng chỉ 3,34:1 |
| Nguy hiểm | `#C83D4D` | `#B8323F` | 5,04:1 trên `#FBE9EB` |
| Chữ phụ | `#64748B` | `#526173` | `#64748B` trên nền trang 4,46:1 (dưới AA) |

Kết quả kiểm: `node src/theme.contrast.test.ts` đạt (34 cặp chữ/nền, gồm 10 cặp mới của Stage 9A trên nền navy và mòng két, và mọi điểm dừng của G).

## 4. Không làm

- Không sao chép giao diện sản phẩm khác; các so sánh trước đây (Swift Skin & Wound, Net Health Tissue Analytics, báo cáo ở `/mnt/project-files/datn/so-sanh-ui/`) chỉ dùng làm tham chiếu nguyên tắc (thứ bậc số đo, nguồn số đo).
- Không biểu đồ trang trí, không thống kê tổng hợp ở trang chủ bác sĩ (quyết định cũ giữ nguyên: số liệu tổng hợp ở quản trị).
- Không đổi chữ trên giao diện ngoài những chỗ cần cho bố cục (tiêu đề nhóm mới, dòng chú thích dưới tiêu đề); thuật ngữ "bệnh nhân" giữ nguyên.
