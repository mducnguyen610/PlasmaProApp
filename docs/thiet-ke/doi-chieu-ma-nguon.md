# Đối chiếu mã nguồn với FR, NFR (trạng thái ngày 11/11/2026)

Mã nguồn hiện tại là prototype của vòng cũ, viết trước khi có bộ UR và FR ở thư mục này. Bảng dưới gắn từng FR, NFR với tệp mã đang đáp ứng nó, theo đúng yêu cầu của bảng tham chiếu ở slide 26 [1]: không thừa, không thiếu.

Cách đánh giá: đọc mã ở nhánh `sua-loi/ra-soat-pr-10-13` (gốc là đỉnh PR 13, commit `3022d72`, cộng các bản sửa theo rà soát ngày 11/11/2026). Chưa chạy ứng dụng trên điện thoại hay mạch thật, nên cột "Mức đáp ứng" là nhận định từ việc đọc mã và kiểm thử tự động.

Kết quả gộp: trong 18 FR có 9 FR đạt phần lớn, 8 FR đạt một phần, 1 FR chưa có (FR3). Trong 7 NFR có 2 NFR đạt (NFR3, NFR5), 1 NFR đạt phần lớn (NFR4), 1 NFR đạt một phần (NFR2), 3 NFR chưa có (NFR1, NFR6, NFR7).

## FR chức năng

| FR | Mức đáp ứng | Mã liên quan | Còn thiếu so với FR |
|---|---|---|---|
| FR1 Việc điều trị hôm nay | Phần lớn | `src/app/patient/index.tsx` (thẻ Hôm nay), `src/lib/course.ts`, `src/components/CourseCard.tsx` (có chế độ, `src/lib/types.ts` trường `treatmentMode`) | Chưa thử với người bệnh (V4) |
| FR2 Nạp liệu trình qua USB, tự ngắt | Một phần | `src/lib/device/` (đặc tả khai báo `protocol.config.ts`, bộ mã hóa khung, `sender.ts` gửi lại khi hết giờ, dựng lại ngày giờ ở mỗi lần gửi, chặn gửi khi máy chưa trả `INF`), `src/app/connect-device.tsx` (chỉ gửi khi hồ sơ đã được giao máy), USB thật trên Android (`modules/plasma-usb`, `usb-android-core.ts`) | Chưa thử với mạch; iOS chưa có; giao thức chưa được firmware xác nhận (`confirmed: false`); máy thật không trả `CAP` thì dùng bảng dự phòng không giới hạn thời gian chiếu (mục A3 của rà soát, để lại theo quyết định ngày 11/11/2026); máy chưa biết số phiên hay hạn dùng của cấu hình (mục C4, để lại) |
| FR3 Liều J/cm² | Chưa có | `doseLevel`, `durationSec`, `secondsPerCm2`, `targetEnergyWh` trong `src/lib/types.ts` | Chưa tính J/cm²; chờ mật độ công suất từ WCMD |
| FR4 Đọc nhật ký phiên | Một phần | `src/lib/device/session-tracker.ts` (nhận ra phiên kết thúc từ chuỗi `STA`), `recordDeviceSession` trong `store.tsx`, `src/app/session-monitor.tsx` | Chỉ ghi khi màn theo dõi đang mở; mất kết nối giữa phiên thì không ghi; chưa có mức, chế độ thực phát và chưa đọc nhật ký lưu trong máy (chờ câu F11 của ICD) |
| FR5 Bác sĩ chụp, tải ảnh | Phần lớn | `src/app/guided-capture.tsx`, `src/app/capture.tsx`, `src/lib/capture/*`, `src/lib/photos.ts` | Chưa chặn ảnh trùng |
| FR6 Đau VAS và biến cố | Một phần | `src/app/report.tsx` (11 nút 0 đến 10, cảnh báo từ 7, hướng dẫn liên hệ), `setSessionPain` trong `store.tsx`, `AdherenceCalendar.tsx` | Ngưỡng 7 là giá trị cố định của ứng dụng, chưa do bác sĩ đặt; báo đến bác sĩ trong 15 phút cần máy chủ |
| FR7 Diễn biến diện tích cho người bệnh | Phần lớn | `src/components/AreaChart.tsx`, `src/app/patient/index.tsx`, `src/app/patient/history.tsx` | Chưa thử với người bệnh |
| FR8 Lưu ngoại tuyến, đồng bộ | Một phần | Lưu cục bộ bằng AsyncStorage trong `store.tsx` | Chưa có máy chủ, hàng đợi đồng bộ, mã bản ghi duy nhất (TR5) |
| FR9 Bác sĩ soạn liệu trình, nhật ký thay đổi | Một phần | `src/app/plan/[patientId].tsx` (phiên bản, người sửa, lý do, giai đoạn; mức và chế độ chỉ chọn trong bảng năng lực, dòng 129) | Thời gian chiếu chưa bị giới hạn theo năng lực máy (mục A3, để lại); chưa có giới hạn an toàn của WCMD |
| FR10 Xếp người bệnh theo mức cần chú ý, 3 trạng thái | Phần lớn | `src/lib/attention.ts` (`classifyToday` có Đã chiếu, Bỏ lỡ, Chưa có dữ liệu cùng các trạng thái phụ; `rankPatients`), `src/app/doctor/index.tsx`, `PatientCard` hiện lần đồng bộ cuối khi chưa có dữ liệu | Trọng số điểm là giả định của ứng dụng, cần bác sĩ góp ý; chưa đo tiêu chí 30 giây (V2) |
| FR11 AI khoanh vùng, tính diện tích | Một phần | `src/lib/ai/` (giao diện `WoundRecognizer` cho cả ảnh chụp và khung xem trực tiếp; kết quả có `areaCm2`, `confidence`, `modelId`, `modelVersion`, lưu vào `capture.wound`), bản cài hiện tại bọc `woundDetect.ts` (ngưỡng màu Otsu) | Chưa thay bằng mô-đun nhận diện có sẵn; `areaCm2` chỉ có khi có thước đo (AR); bác sĩ chưa sửa được vùng |
| FR12 Xuất bộ dữ liệu có nhãn | Phần lớn | `src/lib/export.ts`, `src/lib/research.ts` (ZIP ảnh PNG bỏ metadata, mã RS, `labels.csv`), `src/lib/access.ts` (`researchImages`) | Chưa có số phiên bản bộ dữ liệu |
| FR15 Gán nhãn ảnh | Một phần | `src/app/images/[id].tsx`, `src/lib/naming.ts` (nhãn là diện tích cm², trạng thái đã đo, chưa đo, đã loại) | Chưa có phân loại, khung hay phân vùng; bộ dò lưu đường bao (`capture.wound.hull`) nhưng bác sĩ chưa sửa được |
| FR16 Lưu vết nhãn | Phần lớn | `LabelChange` trong `src/lib/types.ts` (người sửa, giờ, giá trị trước và sau) | Duyệt nhãn ngoài phạm vi |
| FR17 Quản lý ảnh | Phần lớn | `src/app/doctor/dataset.tsx` (lọc chưa có, đã có, đã loại), `src/app/wounds/[id].tsx` (album theo ngày) | Chưa tìm theo bệnh nhân trên toàn bộ ảnh |
| FR18 Quản lý hồ sơ người bệnh | Một phần | `src/app/doctor/patients.tsx` (tìm kiếm), `patients/new.tsx`, `patients/[id].tsx`; `addPatient` (mã `BN` + 3 số, chặn trùng số điện thoại, mã kích hoạt), `updatePatient`, `issueActivation`, `addWound` trong `src/lib/store.tsx` | Bác sĩ chưa sửa được họ tên, năm sinh, số điện thoại; chưa lưu lịch sử sửa hồ sơ; đồng ý chỉ giữ bản mới nhất |
| FR13 Gán máy và đầu phát, thu hồi | Phần lớn | Bác sĩ phụ trách giao và thu hồi máy ở mục "Giao máy" của `patients/[id].tsx` (`assignDevice`, `setLifecycle` kiểm `requireDoctor`); `src/lib/devices.ts` (một máy một người); quản trị chỉ đăng ký và xem (`admin/devices.tsx`) | Chưa gán bằng quét mã |
| FR14 Vòng đời máy, bảo dưỡng | Phần lớn | `src/lib/maintenance.ts`, `src/components/DeviceView.tsx` | Chu kỳ bảo dưỡng là số tạm, chờ WCMD |

## NFR

| NFR | Mức đáp ứng | Mã liên quan | Còn thiếu |
|---|---|---|---|
| NFR1 Mã hóa, phân quyền ở máy chủ | Chưa có | `src/lib/access.ts`, `src/components/Guard.tsx` kiểm ở phía ứng dụng | Máy chủ, mã hóa, tự đăng xuất, nhật ký truy cập |
| NFR2 IEC 62304, ISO 14971, IEC 62366-1 | Một phần | 26 tệp kiểm thử trong `npm test` (`package.json`); `src/lib/compliance.ts` liệt kê căn cứ | Hồ sơ rủi ro, hồ sơ vòng đời phần mềm |
| NFR3 Hợp đồng thiết bị và thiết bị giả lập | Có | `src/lib/device/transport.ts` (hợp đồng), `simulated.ts` (giả lập), `usb-android-core.ts` và mô-đun gốc `modules/plasma-usb` (USB thật), `getTransport` trong `index.ts` | Bản USB Android chưa thử với mạch thật; chưa có bản iOS |
| NFR4 Giao diện dễ đọc | Phần lớn | `src/theme.ts`, `src/theme.contrast.test.ts` | Chưa thử với người bệnh trên 60 tuổi |
| NFR5 Mốc "hôm nay" theo giờ Việt Nam | Có | `localDay` trong `src/lib/course.ts` (cộng 7 giờ rồi lấy ngày UTC), `fmtDateTime` trong `src/lib/format.ts`, `dayOf` trong `adherence.ts`; `src/lib/localDay.test.ts` thử với múi giờ New York, UTC, Tokyo | Nhắc lịch (`reminders.ts`) vẫn đặt giờ báo theo múi giờ điện thoại |
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

Mã có 3 vai trò: `doctor`, `patient`, `admin` (`src/lib/types.ts`). Chủ đồ án quyết định giữ cả ba vai trò (11/11/2026). Các màn `src/app/admin/*` giữ nguyên.

## Ảnh hưởng của phạm vi đề tài lên mã

Theo bảng phạm vi ở tệp 00: backend và database chỉ đề xuất, nên FR8, NFR1, NFR6 không cần lập trình máy chủ trong đề tài; mã chỉ cần lớp lưu cục bộ và hàng đợi đồng bộ có thể nối vào backend sau. Mô-đun AI là mô-đun có sẵn, nên `woundDetect.ts` (ngưỡng màu) nên được đặt sau lớp tích hợp TR10 làm bản giả, chờ thay bằng mô-đun thật. Phần quản trị thiết bị (FR14) nằm ngoài phạm vi, giữ ở mức hiện có. Bộ dữ liệu ảnh (FR12, FR15 đến FR17, các màn `dataset`) nay thuộc phạm vi "thu thập và gán nhãn hình ảnh".

## Thứ tự sửa mã đề xuất

Theo slide 27 [1], mã chỉ nên đổi lớn sau khi bước 8 đạt validation. Thứ tự dưới đây xếp theo mức phụ thuộc vào các câu hỏi còn mở.

1. **Đã làm (PR 11 đến PR 13 và bản sửa theo rà soát):** lớp hợp đồng thiết bị và thiết bị giả lập (NFR3, TR4); lớp tích hợp AI (TR10); 3 trạng thái và thứ tự ưu tiên trên tổng quan bác sĩ (FR10); ghi phiên từ `STA` (FR4); bác sĩ giao máy (FR13).
2. **Chờ bác sĩ chốt phương pháp và bộ nhãn:** màn gán nhãn, số phiên bản bộ dữ liệu (FR15, FR12).
3. **Chờ bác sĩ:** ngưỡng đau do bác sĩ đặt (FR6); trọng số xếp hạng (FR10).
4. **Chờ nhóm phần cứng:** giới hạn thời gian chiếu của máy thật khi máy không trả `CAP` (mục A3), số phiên và hạn dùng trong gói cấu hình (mục C4), nhật ký phiên trong máy (FR4, câu F11). **Chờ WCMD:** liều J/cm², giới hạn an toàn (FR3, FR9).
5. **Chờ người giao mô-đun AI:** thay bản giả bằng mô-đun thật (FR11). Máy chủ và database chỉ viết đề xuất, không nằm trong danh sách sửa mã.
