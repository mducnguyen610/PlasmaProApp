# Đối chiếu mã nguồn với FR, NFR (trạng thái ngày 11/11/2026)

Mã nguồn hiện tại là prototype của vòng cũ, viết trước khi có bộ UR và FR ở thư mục này. Bảng dưới gắn từng FR, NFR với tệp mã đang đáp ứng nó, theo đúng yêu cầu của bảng tham chiếu ở slide 26 [1]: không thừa, không thiếu.

Cách đánh giá: đọc mã ở nhánh `nang-cap/sdk-58` (commit `765ba81`). Chưa chạy ứng dụng để kiểm lại từng dòng, nên cột "Mức đáp ứng" là nhận định từ việc đọc mã.

Kết quả gộp: trong 14 FR có 4 FR đạt phần lớn, 8 FR đạt một phần, 2 FR chưa có. Trong 7 NFR có 2 NFR đạt phần lớn, 1 NFR đạt một phần, 4 NFR chưa có.

## FR chức năng

| FR | Mức đáp ứng | Mã liên quan | Còn thiếu so với FR |
|---|---|---|---|
| FR1 Việc điều trị hôm nay | Phần lớn | `src/app/patient/index.tsx` (thẻ Hôm nay), `src/lib/course.ts`, `src/components/CourseCard.tsx` | Chưa hiện chế độ (Cold, Hybrid, Thermal); mô hình `TreatmentPlan` chưa có trường chế độ |
| FR2 Nạp liệu trình qua USB, tự ngắt | Chưa có | `setDevicePower`, `simulateSession` trong `src/lib/store.tsx` chỉ mô phỏng bật tắt từ xa | Toàn bộ: gói liệu trình, mã kiểm tra, xác nhận nạp. Lệnh bật tắt từ xa hiện tại trái với phương án S1 |
| FR3 Liều J/cm² | Chưa có | `doseLevel`, `durationSec`, `secondsPerCm2`, `targetEnergyWh` trong `src/lib/types.ts` | Chưa tính J/cm²; chờ mật độ công suất từ WCMD |
| FR4 Đọc nhật ký phiên | Một phần | Kiểu `DeviceSession` (có `sessionId` chống trùng, `woundId`), `src/lib/adherence.ts` | Dữ liệu phiên là mô phỏng; chưa có mức, chế độ, giây phát thực; chưa có lớp đọc từ máy |
| FR5 Chụp ảnh có hướng dẫn | Một phần | `src/app/guided-capture.tsx`, `src/lib/capture/*`, `modules/plasma-ar` | **Trái với UR3:** mã chỉ cho bác sĩ chụp (`store.tsx` dòng 341, `capture.tsx` dòng 24). Chưa có vật tham chiếu kích thước |
| FR6 Đau VAS và biến cố | Một phần | `src/app/report.tsx`, `setSessionPain` trong `store.tsx`, `AdherenceCalendar.tsx` | Chưa có ngưỡng do bác sĩ đặt, chưa có hướng dẫn liên hệ khi vượt ngưỡng |
| FR7 Diễn biến diện tích cho người bệnh | Phần lớn | `src/components/AreaChart.tsx`, `src/app/patient/index.tsx`, `src/app/patient/history.tsx` | Không |
| FR8 Lưu ngoại tuyến, đồng bộ | Một phần | Lưu cục bộ bằng AsyncStorage trong `store.tsx` | Chưa có máy chủ, hàng đợi đồng bộ, mã bản ghi duy nhất (TR5) |
| FR9 Bác sĩ soạn liệu trình, nhật ký thay đổi | Một phần | `src/app/plan/[patientId].tsx` (phiên bản, người sửa, lý do, giai đoạn) | Chưa có giới hạn an toàn theo bảng năng lực thiết bị (TR11) |
| FR10 Xếp người bệnh theo mức cần chú ý, 3 trạng thái | Một phần | `src/app/doctor/index.tsx` (việc cần làm), `adherence.ts`, `DeviceView.tsx` (tách "chưa có dữ liệu") | Danh sách người bệnh chưa xếp theo mức cần chú ý; 3 trạng thái mới có ở màn thiết bị, chưa có ở màn tổng quan |
| FR11 AI khoanh vùng, tính diện tích | Một phần | `src/lib/capture/woundDetect.ts` (ngưỡng màu Otsu), `estimateAreaCm2` trong `capture/ar.ts` | Chưa phải mô hình phân vùng; chạy trên máy, trái với phương án C1; bác sĩ chưa sửa được vùng; chưa lưu phiên bản mô hình |
| FR12 Xuất theo phiếu nghiên cứu | Một phần | `src/lib/export.ts`, `src/lib/research.ts` (ZIP ảnh và `labels.csv`), `src/lib/report.ts` (PDF) | Chưa có mẫu phiếu nghiên cứu của bệnh viện để đối chiếu trường |
| FR13 Gán máy và đầu phát, thu hồi | Phần lớn | `src/lib/devices.ts` (một máy một người, có kiểm thử), `src/app/admin/devices.tsx`, `Device.tip`, `Device.lifecycle` | Chưa gán bằng quét mã |
| FR14 Vòng đời máy, bảo dưỡng | Phần lớn | `src/lib/maintenance.ts`, `src/components/DeviceView.tsx` | Chu kỳ bảo dưỡng là số tạm, chờ WCMD |

## NFR

| NFR | Mức đáp ứng | Mã liên quan | Còn thiếu |
|---|---|---|---|
| NFR1 Mã hóa, phân quyền ở máy chủ | Chưa có | `src/lib/access.ts`, `src/components/Guard.tsx` kiểm ở phía ứng dụng | Máy chủ, mã hóa, tự đăng xuất, nhật ký truy cập |
| NFR2 IEC 62304, ISO 14971, IEC 62366-1 | Một phần | 15 tệp kiểm thử trong `npm test`; `src/lib/compliance.ts` liệt kê căn cứ | Hồ sơ rủi ro, hồ sơ vòng đời phần mềm |
| NFR3 Hợp đồng thiết bị và thiết bị giả lập | Chưa có | Mô phỏng nằm thẳng trong `store.tsx` | Lớp hợp đồng thiết bị với hai bản cài (TR4) |
| NFR4 Giao diện dễ đọc | Phần lớn | `src/theme.ts`, `src/theme.contrast.test.ts` | Chưa thử với người bệnh trên 60 tuổi |
| NFR5 Mốc "hôm nay" theo giờ Việt Nam | Phần lớn | `localDay` trong `src/lib/course.ts`, `src/lib/localDay.test.ts` | Dùng giờ của máy, chưa ép UTC+7 khi máy đặt múi giờ khác |
| NFR6 Hạ tầng lưu dữ liệu và AI | Chưa có | Không | Chờ pháp chế bệnh viện |
| NFR7 Triển khai thêm bệnh viện bằng cấu hình | Chưa có | Không | Chưa có cấu hình theo đơn vị |

## Mã không gắn với FR nào (phần "thừa" theo slide 26)

Các phần dưới đây có trong mã nhưng không FR hay NFR nào yêu cầu. Chưa nên xóa: theo slide 26, nhu cầu đôi khi bắt nguồn từ tính năng sẵn có của công nghệ. Mỗi mục cần một trong hai quyết định ở bước 8: bổ sung UR và FR, hoặc gỡ khỏi mã.

| Phần mã | Việc nó làm | Gợi ý |
|---|---|---|
| `src/app/evaluate/[woundId].tsx`, `src/lib/assessment.ts`, mức Nhẹ, Trung bình, Nặng trong `access.ts` | Bác sĩ đánh giá vết thương có cấu trúc và công bố cho người bệnh | Nhiều khả năng là nhu cầu thật của bác sĩ; hỏi bác sĩ rồi thêm UR |
| `src/app/compare/[woundId].tsx` | So sánh hai ảnh trước và sau | Có thể gộp vào FR7 hoặc UR9 |
| `src/lib/reminders.ts`, `src/app/schedule.tsx` | Nhắc lịch chiếu và lịch tái khám | Phục vụ UR1; nên ghi thêm vào FR1 |
| `ClosureActions.tsx`, trạng thái `awaiting_closure`, `follow_up` | Xác nhận liền thương hai lần, theo dõi sau điều trị | Hỏi bác sĩ; liên quan tiêu chí kết thúc của thử nghiệm |
| `src/app/admin/dataset.tsx`, `doctor/dataset.tsx`, quyền nghiên cứu, đồng ý nghiên cứu | Tách bộ ảnh đã giảm định danh cho huấn luyện AI | Phục vụ UR13, UR14; nên có FR riêng về bộ dữ liệu huấn luyện |
| `src/app/register.tsx`, `activate.tsx`, `terms.tsx`, `onboarding.tsx` | Đăng ký, kích hoạt, điều khoản, hướng dẫn lần đầu | Nền tảng cho NFR1 và UR13; nên ghi rõ trong NFR1 |
| `src/lib/naming.ts` | Quy tắc đặt tên tệp ảnh theo diện tích | Chi tiết của vòng cũ; xem lại khi làm FR12 |
| `src/lib/plausibility.ts` | Cảnh báo số đo diện tích bất thường | Biện pháp giảm rủi ro "đo sai diện tích" trong FMEA bước 8 |

## Vai trò

Mã có 3 vai trò: `doctor`, `patient`, `admin` (`src/lib/types.ts`). Bước 3 đang gộp thành "điều dưỡng, kỹ thuật viên" và còn chờ bệnh viện xác nhận. Chưa đổi mã cho đến khi có câu trả lời.

## Thứ tự sửa mã đề xuất

Theo slide 27 [1], mã chỉ nên đổi lớn sau khi bước 8 đạt validation. Thứ tự dưới đây xếp theo mức phụ thuộc vào các câu hỏi còn mở.

1. **Không phụ thuộc câu hỏi mở nào:** tách lớp hợp đồng thiết bị và chuyển phần mô phỏng thành thiết bị giả lập (NFR3, TR4); đưa 3 trạng thái và thứ tự ưu tiên lên màn tổng quan của bác sĩ (FR10).
2. **Chờ người dùng xác nhận UR3:** mở quyền chụp ảnh cho người bệnh, có khung hướng dẫn và vật tham chiếu (FR5).
3. **Chờ bác sĩ:** ngưỡng đau và hướng dẫn liên hệ (FR6).
4. **Chờ WCMD:** gói liệu trình USB, nhật ký phiên, liều J/cm², giới hạn an toàn (FR2, FR3, FR4, FR9).
5. **Chờ pháp chế:** máy chủ, đồng bộ, AI phía máy chủ (FR8, FR11, NFR1, NFR6).
