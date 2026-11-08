// Dữ liệu MÔ PHỎNG cho bản demo. Không phải dữ liệu bệnh nhân thật (đặc tả mục 4.1, 7.2).
import { buildFilename } from './naming';
import { addDays, localDay, scheduledDays } from './course';
import type { AppData, DeviceSession, TreatmentPlan, WoundImage } from './types';

const DOCTOR = 'u-bs1';

function img(
  n: number,
  woundId: string,
  patientId: string,
  pCode: string,
  wCode: string,
  date: string,
  area: number | null,
  demoAsset: number,
): WoundImage {
  const id = `IMG${String(n).padStart(4, '0')}`;
  return {
    id,
    woundId,
    patientId,
    uri: null,
    demoAsset,
    ext: 'png',
    filename: buildFilename(pCode, wCode, id, area, 'png'),
    captureDate: date,
    uploadDate: date,
    uploadedBy: DOCTOR,
    source: 'demo',
    areaCm2: area,
    measureMethod: area !== null ? 'Thước giấy kẻ ô vô trùng (mô phỏng)' : undefined,
    status: area !== null ? 'labeled' : 'unlabeled',
    researchReady: area !== null,
    researchUri: area !== null ? 'demo' : undefined,
    researchReviewedBy: DOCTOR,
    history:
      area !== null
        ? [{ at: at(date, '10:00'), by: DOCTOR, fromName: buildFilename(pCode, wCode, id, null, 'png'), toName: buildFilename(pCode, wCode, id, area, 'png'), fromArea: null, toArea: area }]
        : [],
  };
}

/** Phiên mô phỏng vào các ngày có lịch của đợt, trừ những ngày bỏ lỡ; giờ chiếu 08:00, 3 phút. */
function courseSessions(deviceId: string, woundId: string, plan: Pick<TreatmentPlan, 'phases' | 'startDate' | 'endDate'>, until: string, skip: string[] = []): DeviceSession[] {
  return scheduledDays(plan, undefined, until)
    .filter((d) => !skip.includes(d))
    .map((d) => ({
      sessionId: `${deviceId}-${d.replaceAll('-', '')}-1`,
      deviceId,
      woundId,
      start: at(d, '08:00'),
      durationMin: 3,
      energyWh: null,
      status: 'completed' as const,
      source: 'simulated' as const,
    }));
}

/**
 * Ngày trong dữ liệu mô phỏng tính lùi từ hôm nay, để đợt điều trị luôn "đang diễn ra" khi mở demo.
 * BN001: đợt 30 ngày trước, 14 ngày đầu mỗi ngày, sau đó 3 buổi mỗi tuần; đã qua mốc xem lại tuần 4.
 * BN002: đợt cách ngày đã dừng, bác sĩ ghi nhận biểu mô khép lần 1 cách đây 15 ngày, chờ xác nhận lần 2.
 */
/** Thời điểm theo giờ địa phương của máy, đổi sang ISO để lưu. */
const at = (day: string, hm: string) => new Date(`${day}T${hm}:00`).toISOString();

export function createSeed(): AppData {
  const T = localDay();
  const D = (n: number) => addDays(T, n);
  const images: WoundImage[] = [
    img(1, 'w-1', 'p-1', 'BN001', 'VT01', D(-30), 12.5, 1),
    img(2, 'w-1', 'p-1', 'BN001', 'VT01', D(-23), 10.2, 2),
    img(3, 'w-1', 'p-1', 'BN001', 'VT01', D(-16), 8.4, 3),
    img(4, 'w-1', 'p-1', 'BN001', 'VT01', D(-2), null, 5),
    img(5, 'w-2', 'p-2', 'BN002', 'VT01', D(-36), 8.0, 4),
    img(6, 'w-2', 'p-2', 'BN002', 'VT01', D(-15), null, 6),
  ];
  const plan1: Pick<TreatmentPlan, 'phases' | 'startDate' | 'endDate'> = {
    startDate: D(-30), endDate: D(13),
    phases: [
      { from: D(-30), to: D(-17), pattern: 'daily', n: 1 },
      { from: D(-16), to: D(13), pattern: 'n_per_week', n: 3 },
    ],
  };
  const plan2: Pick<TreatmentPlan, 'phases' | 'startDate' | 'endDate'> = {
    startDate: D(-36), endDate: D(-15), phases: [{ from: D(-36), to: D(-15), pattern: 'every_n_days', n: 2 }],
  };
  const sesP1 = courseSessions('d-1', 'w-1', plan1, D(-1), [D(-27), D(-20)]);
  // Một bản ghi bị thiết bị gửi lại (cùng sessionId) để minh họa chống đếm trùng (đặc tả 7.2).
  sesP1.push({ ...sesP1[sesP1.length - 1] });
  const sesP2 = courseSessions('d-2', 'w-2', plan2, D(-15));
  const lastP1 = sesP1[sesP1.length - 1].start;

  return {
    accounts: [
      { id: DOCTOR, role: 'doctor', name: 'BS. Trần Minh An', username: 'bacsi', title: 'Da liễu', locked: false, researchAccess: true },
      { id: 'u-bs2', role: 'doctor', name: 'BS. Lê Thu Hà', username: 'bacsi2', title: 'Ngoại khoa', locked: false, researchAccess: false },
      { id: 'u-bn1', role: 'patient', name: 'Nguyễn Văn A', username: 'benhnhan', locked: false, patientId: 'p-1' },
      { id: 'u-bn2', role: 'patient', name: 'Phạm Thị B', username: 'benhnhan2', locked: false, patientId: 'p-2' },
      { id: 'u-qt', role: 'admin', name: 'Quản trị kỹ thuật', username: 'quantri', locked: false, researchAccess: true },
    ],
    patients: [
      { id: 'p-1', code: 'BN001', researchCode: 'RS-DEMO001', name: 'Nguyễn Văn A', birthYear: 1958, sex: 'Nam', phone: '09xx xxx 001', doctorId: DOCTOR, deviceId: 'd-1', researchConsent: true, consentDate: D(-31), createdAt: D(-31) },
      { id: 'p-2', code: 'BN002', researchCode: 'RS-DEMO002', name: 'Phạm Thị B', birthYear: 1965, sex: 'Nữ', phone: '09xx xxx 002', doctorId: DOCTOR, deviceId: 'd-2', researchConsent: true, consentDate: D(-37), createdAt: D(-37) },
      { id: 'p-3', code: 'BN003', researchCode: 'RS-DEMO003', name: 'Trần Văn M', birthYear: 1972, sex: 'Nam', phone: '09xx xxx 003', doctorId: DOCTOR, researchConsent: false, createdAt: D(-26) },
    ],
    wounds: [
      { id: 'w-1', patientId: 'p-1', code: 'VT01', location: 'Cẳng chân trái, mặt trước', group: 'Loét tĩnh mạch chân', startDate: D(-31), status: 'active' },
      { id: 'w-2', patientId: 'p-2', code: 'VT01', location: 'Gót chân phải', group: 'Loét bàn chân đái tháo đường', startDate: D(-37), status: 'awaiting_closure', closureCheck1: D(-15) },
      { id: 'w-3', patientId: 'p-3', code: 'VT01', location: 'Mu bàn tay trái', startDate: D(-26), status: 'paused' },
    ],
    images,
    evaluations: [
      {
        id: 'e-1', woundId: 'w-1', imageId: 'IMG0003', date: D(-16), doctorId: DOCTOR, areaCm2: 8.4,
        characteristics: 'Nền đỏ hồng, có mô hạt; bờ đều; da xung quanh không sưng (mô phỏng).',
        symptoms: 'Đau nhẹ khi thay băng.', symptomSource: 'Bệnh nhân báo qua app',
        severity: 'mild', trend: 'improving', instructions: 'Chuyển sang 3 buổi mỗi tuần theo giai đoạn 2, tái khám để bác sĩ chụp ảnh và đánh giá.', nextReview: D(5), visibleToPatient: true,
      },
      { id: 'e-demo2', woundId: 'w-2', imageId: 'IMG0006', date: D(-15), doctorId: DOCTOR, areaCm2: null, severity: 'mild', trend: 'improving', characteristics: 'Biểu mô phủ kín, không còn dịch (mô phỏng).', symptoms: '', symptomSource: 'Bác sĩ', instructions: 'Dừng chiếu plasma. Giữ vùng da khô sạch, tái khám sau 2 tuần để xác nhận đã liền.', nextReview: D(0), visibleToPatient: true },
      { id: 'e-demo3', woundId: 'w-3', date: D(-24), doctorId: DOCTOR, areaCm2: null, severity: 'severe', trend: 'worsening', characteristics: 'Đánh giá mô phỏng.', symptoms: '', symptomSource: 'Bác sĩ', instructions: 'Liên hệ bác sĩ phụ trách để được đánh giá trực tiếp.', visibleToPatient: true },
    ],
    plans: [
      {
        id: 'pl-1', patientId: 'p-1', woundId: 'w-1', version: 2, status: 'active', sessionsPerDay: 1, minIntervalMin: null, targetEnergyWh: null,
        ...plan1, doseLevel: 8, durationSec: 180, secondsPerCm2: 20, areaAtStart: 12.5, reviewAtDay: 28,
        reviewSchedule: 'Tái đánh giá mỗi 7 ngày',
        notes: 'Mức năng lượng, thời gian và lịch là giá trị mô phỏng theo dạng liệu trình trên slide 34 và 39, không phải chỉ định điều trị.',
        editedBy: DOCTOR, editedAt: at(D(-16), '09:00'), reason: 'Vết thương cải thiện: chuyển sang 3 buổi mỗi tuần', confirmed: true,
      },
      {
        id: 'pl-2', patientId: 'p-2', woundId: 'w-2', version: 1, status: 'paused', sessionsPerDay: 1, minIntervalMin: null, targetEnergyWh: null,
        ...plan2, doseLevel: 6, durationSec: 120, secondsPerCm2: 15, areaAtStart: 8, reviewAtDay: 28,
        reviewSchedule: 'Tái đánh giá mỗi 7 ngày', notes: 'Giá trị mô phỏng.',
        editedBy: DOCTOR, editedAt: at(D(-15), '09:00'), reason: 'Biểu mô đã khép lần 1, dừng chiếu chờ xác nhận', confirmed: true,
      },
    ],
    devices: [
      { id: 'd-1', code: 'TB-001', model: 'Plasma Pro + mô-đun IoMT ESP32', patientId: 'p-1', online: true, lastSync: at(D(-1), '17:05'), firmware: '0.3.1', power: 'off', simulated: true, care: { clean: new Date(new Date(lastP1).getTime() + 10 * 60000).toISOString() }, tip: { code: 'ĐP-0001', issuedAt: D(-30) }, lifecycle: 'in_use' },
      { id: 'd-2', code: 'TB-002', model: 'Plasma Pro + mô-đun IoMT ESP32', patientId: 'p-2', online: false, lastSync: at(D(-15), '08:12'), firmware: '0.3.1', power: 'off', simulated: true, tip: { code: 'ĐP-0002', issuedAt: D(-36) }, lifecycle: 'in_use' },
      { id: 'd-3', code: 'TB-003', model: 'Plasma Pro + mô-đun IoMT ESP32', online: false, lastSync: null, firmware: '0.3.0', power: 'off', simulated: true, lifecycle: 'disinfected' },
    ],
    sessions: [...sesP1, ...sesP2],
    sessionNotes: [
      { sessionId: sesP1[0].sessionId, painBefore: 5, painAfter: 3, stinging: true, at: sesP1[0].start },
      { sessionId: sesP1[1].sessionId, painBefore: 4, painAfter: 3, rednessNextDay: true, at: sesP1[1].start },
      { sessionId: sesP1[6].sessionId, painBefore: 3, painAfter: 2, at: sesP1[6].start },
    ],
    reports: [
      { id: 'r-1', patientId: 'p-2', date: at(D(-16), '08:30'), kind: 'symptom', content: 'Rát nhẹ quanh vết thương sau buổi chiếu.', painLevel: 3, handled: false },
      { id: 'r-2', patientId: 'p-2', date: at(D(-17), '08:30'), kind: 'device', content: 'Thiết bị không hiện kết nối Wi-Fi.', handled: false },
    ],
    syncErrors: [
      { id: 's-1', at: at(D(-17), '08:15'), deviceId: 'd-2', message: 'TB-002 mất kết nối một ngày, đã đồng bộ lại (mô phỏng).', resolved: true },
    ],
    counters: { image: 6, patient: 3 },
  };
}

export const DEMO_ASSETS: Record<number, number> = {
  1: require('../../assets/demo/demo_1.png'),
  2: require('../../assets/demo/demo_2.png'),
  3: require('../../assets/demo/demo_3.png'),
  4: require('../../assets/demo/demo_4.png'),
  5: require('../../assets/demo/demo_5.png'),
  6: require('../../assets/demo/demo_6.png'),
};
