# Đối chiếu mã nguồn với FR, NFR (trạng thái ngày 11/11/2026)

Mã nguồn hiện tại là prototype của vòng cũ, viết trước khi có bộ UR và FR ở thư mục này. Bảng dưới gắn từng FR, NFR với tệp mã đang đáp ứng nó, theo đúng yêu cầu của bảng tham chiếu ở slide 26 [1]: không thừa, không thiếu.

Cách đánh giá: đọc mã ở nhánh `nang-cap/sdk-58` (commit `765ba81`). Chưa chạy ứng dụng để kiểm lại từng dòng, nên cột "Mức đáp ứng" là nhận định từ việc đọc mã.

Kết quả gộp: trong 17 FR có 7 FR đạt phần lớn, 8 FR đạt một phần, 2 FR chưa có (cập nhật theo quy trình 9 giai đoạn). Trong 7 NFR có 2 NFR đạt phần lớn, 1 NFR đạt một phần, 4 NFR chưa có.

## FR chức năng

| FR | Mức đáp ứng | Mã liên quan | Còn thiếu so với FR |
|---|---|---|---|
| FR1 Việc điều trị hôm nay | Phần lớn | `src/app/patient/index.tsx` (thẻ Hôm nay), `src/lib/course.ts`, `src/components/CourseCard.tsx` | Chưa hiện chế độ (Cold, Hybrid, Thermal); mô hình `TreatmentPlan` chưa có trường chế độ |
| FR2 Nạp liệu trình qua USB, tự ngắt | Chưa có | `setDevicePower`, `simulateSession` trong `src/lib/store.tsx` chỉ mô phỏng bật tắt từ xa | Toàn bộ: gói liệu trình, mã kiểm tra, xác nhận nạp. Lệnh bật tắt từ xa hiện tại trái với phương án S1 |
| FR3 Liều J/cm² | Chưa có | `doseLevel`, `durationSec`, `secondsPerCm2`, `targetEnergyWh` trong `src/lib/types.ts` | Chưa tính J/cm²; chờ mật độ công suất từ WCMD |
| FR4 Đọc nhật ký phiên | Một phần | Kiểu `DeviceSession` (có `sessionId` chống trùng, `woundId`), `src/lib/adherence.ts` | Dữ liệu phiên là mô phỏng; chưa có mức, chế độ, giây phát thực; chưa có lớp đọc từ máy |
| FR5 Bác sĩ chụp, tải ảnh | Phần lớn | `src/app/guided-capture.tsx`, `src/app/capture.tsx`, `src/lib/capture/*`, `src/lib/photos.ts` | Mã chỉ cho bác sĩ chụp, nay khớp UR3. Chưa chặn ảnh trùng |
| FR6 Đau VAS và biến cố | Một phần | `src/app/report.tsx`, `setSessionPain` trong `store.tsx`, `AdherenceCalendar.tsx` | Chưa có ngưỡng do bác sĩ đặt, chưa có hướng dẫn liên hệ khi vượt ngưỡng |
| FR7 Diễn biến diện tích cho người bệnh | Phần lớn | `src/components/AreaChart.tsx`, `src/app/patient/index.tsx`, `src/app/patient/history.tsx` | Không |
| FR8 Lưu ngoại tuyến, đồng bộ | Một phần | Lưu cục bộ bằng AsyncStorage trong `store.tsx` | Chưa có máy chủ, hàng đợi đồng bộ, mã bản ghi duy nhất (TR5) |
| FR9 Bác sĩ soạn liệu trình, nhật ký thay đổi | Một phần | `src/app/plan/[patientId].tsx` (phiên bản, người sửa, lý do, giai đoạn) | Chưa có giới hạn an toàn theo bảng năng lực thiết bị (TR11) |
| FR10 Xếp người bệnh theo mức cần chú ý, 3 trạng thái | Một phần | `src/app/doctor/index.tsx` (việc cần làm), `adherence.ts`, `DeviceView.tsx` (tách "chưa có dữ liệu") | Danh sách người bệnh chưa xếp theo mức cần chú ý; 3 trạng thái mới có ở màn thiết bị, chưa có ở màn tổng quan |
| FR11 AI khoanh vùng, tính diện tích | Một phần | `src/lib/capture/woundDetect.ts` (ngưỡng màu Otsu), `estimateAreaCm2` trong `capture/ar.ts` | Chưa phải mô hình phân vùng; chạy trên máy, trái với phương án C1; bác sĩ chưa sửa được vùng; chưa lưu phiên bản mô hình |
| FR12 Xuất bộ dữ liệu có nhãn | Phần lớn | `src/lib/export.ts`, `src/lib/research.ts` (ZIP ảnh PNG bỏ metadata, mã RS, `labels.csv`), `src/lib/access.ts` (`researchImages`) | Chưa có số phiên bản bộ dữ liệu |
| FR15 Gán nhãn ảnh | Một phần | `src/app/images/[id].tsx`, `src/lib/naming.ts` (nhãn là diện tích cm², trạng thái đã đo, chưa đo, đã loại) | Chưa có phân loại, khung hay phân vùng; bộ dò hiện có lưu đường bao (`capture.wound.hull`) nhưng bác sĩ chưa sửa được |
| FR16 Duyệt nhãn, lưu vết | Một phần | `LabelChange` trong `src/lib/types.ts`, `researchReviewedBy`, `retakeRequested` | Người gán và người duyệt là một; chưa có trạng thái "yêu cầu sửa nhãn" |
| FR17 Quản lý ảnh | Phần lớn | `src/app/doctor/dataset.tsx` (lọc chưa có, đã có, đã loại), `src/app/wounds/[id].tsx` (album theo ngày) | Chưa tìm theo bệnh nhân trên toàn bộ ảnh |
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
| `src/app/register.tsx`, `activate.tsx`, `terms.tsx`, `onboarding.tsx` | Đăng ký, kích hoạt, điều khoản, hướng dẫn lần đầu | Nền tảng cho NFR1 và UR13; nên ghi rõ trong NFR1 |
| `src/lib/plausibility.ts` | Cảnh báo số đo diện tích bất thường | Biện pháp giảm rủi ro "đo sai diện tích" trong FMEA bước 8 |

## Vai trò

Mã có 3 vai trò: `doctor`, `patient`, `admin` (`src/lib/types.ts`). Bộ vai trò đã chốt chỉ có bác sĩ và người bệnh, nên vai trò `admin` và các màn `src/app/admin/*` (duyệt tài khoản, gán thiết bị, quyền nghiên cứu, bộ dữ liệu, lỗi đồng bộ) là phần thừa. Việc gán máy cho người bệnh (FR13) chuyển sang màn của bác sĩ; duyệt tài khoản bác sĩ chuyển sang backend đề xuất. Cần một pull request riêng để gỡ vai trò này.

## Ảnh hưởng của phạm vi đề tài lên mã

Theo bảng phạm vi ở tệp 00: backend và database chỉ đề xuất, nên FR8, NFR1, NFR6 không cần lập trình máy chủ trong đề tài; mã chỉ cần lớp lưu cục bộ và hàng đợi đồng bộ có thể nối vào backend sau. Mô-đun AI là mô-đun có sẵn, nên `woundDetect.ts` (ngưỡng màu) nên được đặt sau lớp tích hợp TR10 làm bản giả, chờ thay bằng mô-đun thật. Phần quản trị thiết bị (FR14) nằm ngoài phạm vi, giữ ở mức hiện có. Bộ dữ liệu ảnh (FR12, FR15 đến FR17, các màn `dataset`) nay thuộc phạm vi "thu thập và gán nhãn hình ảnh"; màn `src/app/admin/dataset.tsx` chuyển sang bác sĩ khi gỡ vai trò `admin`.

## Thứ tự sửa mã đề xuất

Theo slide 27 [1], mã chỉ nên đổi lớn sau khi bước 8 đạt validation. Thứ tự dưới đây xếp theo mức phụ thuộc vào các câu hỏi còn mở.

1. **Không phụ thuộc câu hỏi mở nào:** tách lớp hợp đồng thiết bị và chuyển phần mô phỏng thành thiết bị giả lập (NFR3, TR4); tách lớp tích hợp AI và đặt bộ dò ngưỡng màu hiện có sau nó (TR10); đưa 3 trạng thái và thứ tự ưu tiên lên màn tổng quan của bác sĩ (FR10).
2. **Chờ bác sĩ chốt phương pháp và bộ nhãn:** màn gán nhãn, quy trình duyệt, số phiên bản bộ dữ liệu (FR15, FR16, FR12).
3. **Chờ bác sĩ:** ngưỡng đau và hướng dẫn liên hệ (FR6).
4. **Chờ nhóm phần cứng và lựa chọn nền tảng:** mô-đun USB gốc và bộ lệnh với firmware, gói liệu trình, nhật ký phiên (FR2, FR4). **Chờ WCMD:** liều J/cm², giới hạn an toàn (FR3, FR9).
5. **Chờ người giao mô-đun AI:** thay bản giả bằng mô-đun thật (FR11). Máy chủ và database chỉ viết đề xuất, không nằm trong danh sách sửa mã.
