// Dữ liệu MÔ PHỎNG cho bản demo. Không phải dữ liệu bệnh nhân thật (đặc tả mục 4.1, 7.2).
import { buildFilename } from './naming';
import type { AppData, DeviceSession, WoundImage } from './types';

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
        ? [{ at: `${date}T10:00:00.000Z`, by: DOCTOR, fromName: buildFilename(pCode, wCode, id, null, 'png'), toName: buildFilename(pCode, wCode, id, area, 'png'), fromArea: null, toArea: area }]
        : [],
  };
}

function sessions(deviceId: string, days: string[], perDay: number[]): DeviceSession[] {
  const out: DeviceSession[] = [];
  days.forEach((d, i) => {
    for (let k = 0; k < perDay[i]; k++) {
      const hour = 7 + k * 5;
      out.push({
        sessionId: `${deviceId}-${d.replaceAll('-', '')}-${k + 1}`,
        deviceId,
        start: `${d}T${String(hour).padStart(2, '0')}:00:00.000Z`,
        durationMin: 15,
        energyWh: null,
        status: 'completed',
        source: 'simulated',
      });
    }
  });
  return out;
}

export function createSeed(): AppData {
  const images: WoundImage[] = [
    img(1, 'w-1', 'p-1', 'BN001', 'VT01', '2026-09-14', 12.5, 1),
    img(2, 'w-1', 'p-1', 'BN001', 'VT01', '2026-09-21', 10.2, 2),
    img(3, 'w-1', 'p-1', 'BN001', 'VT01', '2026-09-28', 8.4, 3),
    img(4, 'w-1', 'p-1', 'BN001', 'VT01', '2026-10-05', null, 5),
    img(5, 'w-2', 'p-2', 'BN002', 'VT01', '2026-09-30', 8.0, 4),
    img(6, 'w-2', 'p-2', 'BN002', 'VT01', '2026-10-10', null, 6),
  ];
  const sesP1 = sessions('d-1', ['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'], [2, 2, 1, 2, 2, 1]);
  // Một bản ghi bị thiết bị gửi lại (cùng sessionId) để minh họa chống đếm trùng (đặc tả 7.2).
  sesP1.push({ ...sesP1[sesP1.length - 1] });

  return {
    accounts: [
      { id: DOCTOR, role: 'doctor', name: 'BS. Trần Minh An', username: 'bacsi', title: 'Da liễu', locked: false, researchAccess: true },
      { id: 'u-bs2', role: 'doctor', name: 'BS. Lê Thu Hà', username: 'bacsi2', title: 'Ngoại khoa', locked: false, researchAccess: false },
      { id: 'u-bn1', role: 'patient', name: 'Nguyễn Văn A', username: 'benhnhan', locked: false, patientId: 'p-1' },
      { id: 'u-bn2', role: 'patient', name: 'Phạm Thị B', username: 'benhnhan2', locked: false, patientId: 'p-2' },
      { id: 'u-qt', role: 'admin', name: 'Quản trị kỹ thuật', username: 'quantri', locked: false, researchAccess: true },
    ],
    patients: [
      { id: 'p-1', code: 'BN001', researchCode: 'RS-DEMO001', name: 'Nguyễn Văn A', birthYear: 1958, sex: 'Nam', phone: '09xx xxx 001', doctorId: DOCTOR, deviceId: 'd-1', researchConsent: true, consentDate: '2026-09-14', createdAt: '2026-09-14' },
      { id: 'p-2', code: 'BN002', researchCode: 'RS-DEMO002', name: 'Phạm Thị B', birthYear: 1965, sex: 'Nữ', phone: '09xx xxx 002', doctorId: DOCTOR, deviceId: 'd-2', researchConsent: true, consentDate: '2026-09-30', createdAt: '2026-09-30' },
      { id: 'p-3', code: 'BN003', researchCode: 'RS-DEMO003', name: 'Trần Văn M', birthYear: 1972, sex: 'Nam', phone: '09xx xxx 003', doctorId: DOCTOR, researchConsent: false, createdAt: '2026-10-08' },
    ],
    wounds: [
      { id: 'w-1', patientId: 'p-1', code: 'VT01', location: 'Cẳng chân trái, mặt trước', group: 'Vết thương mạn tính', startDate: '2026-09-14', status: 'active' },
      { id: 'w-2', patientId: 'p-2', code: 'VT01', location: 'Gót chân phải', group: 'Vết thương mạn tính', startDate: '2026-09-30', status: 'active' },
      { id: 'w-3', patientId: 'p-3', code: 'VT01', location: 'Mu bàn tay trái', startDate: '2026-10-08', status: 'paused' },
    ],
    images,
    evaluations: [
      {
        id: 'e-1', woundId: 'w-1', imageId: 'IMG0003', date: '2026-09-28', doctorId: DOCTOR, areaCm2: 8.4,
        characteristics: 'Nền đỏ hồng, có mô hạt; bờ đều; da xung quanh không sưng (mô phỏng).',
        symptoms: 'Đau nhẹ khi thay băng.', symptomSource: 'Bệnh nhân báo qua app',
        severity: 'mild', trend: 'improving', instructions: 'Tiếp tục liệu trình hiện tại, tái khám để bác sĩ chụp ảnh và đánh giá.', nextReview: '2026-10-05', visibleToPatient: true,
      },
      { id: 'e-demo2', woundId: 'w-2', date: '2026-10-10', doctorId: DOCTOR, areaCm2: 8, severity: 'moderate', trend: 'stable', characteristics: 'Đánh giá mô phỏng.', symptoms: '', symptomSource: 'Bác sĩ', instructions: 'Theo dõi theo hướng dẫn của bác sĩ; tái khám theo lịch.', nextReview: '2026-10-17', visibleToPatient: true },
      { id: 'e-demo3', woundId: 'w-3', date: '2026-10-10', doctorId: DOCTOR, areaCm2: null, severity: 'severe', trend: 'worsening', characteristics: 'Đánh giá mô phỏng.', symptoms: '', symptomSource: 'Bác sĩ', instructions: 'Liên hệ bác sĩ phụ trách để được đánh giá trực tiếp.', visibleToPatient: true },
    ],
    plans: [
      {
        id: 'pl-1', patientId: 'p-1', version: 2, status: 'active', sessionsPerDay: 2, minIntervalMin: 240, targetEnergyWh: null,
        startDate: '2026-09-14', endDate: '2026-11-14', reviewSchedule: 'Tái đánh giá mỗi 7 ngày',
        notes: 'Số lần/ngày và giãn cách là giá trị MÔ PHỎNG để minh họa tính năng, không phải chỉ định điều trị; giá trị thật do nhóm chuyên môn thiết lập.',
        editedBy: DOCTOR, editedAt: '2026-09-21T09:00:00.000Z', reason: 'Điều chỉnh lịch tái đánh giá', confirmed: true,
      },
      {
        id: 'pl-2', patientId: 'p-2', version: 1, status: 'draft', sessionsPerDay: null, minIntervalMin: null, targetEnergyWh: null,
        startDate: '2026-10-01', endDate: '2026-12-01', reviewSchedule: 'Tái đánh giá mỗi 7 ngày', notes: '',
        editedBy: DOCTOR, editedAt: '2026-09-30T09:00:00.000Z', reason: 'Tạo mới', confirmed: false,
      },
    ],
    devices: [
      { id: 'd-1', code: 'TB-001', model: 'Plasma Pro + mô-đun IoMT ESP32', patientId: 'p-1', online: true, lastSync: '2026-10-11T17:05:00.000Z', firmware: '0.3.1', power: 'off', simulated: true, care: { clean: '2026-10-06T00:00:00.000Z' } },
      { id: 'd-2', code: 'TB-002', model: 'Plasma Pro + mô-đun IoMT ESP32', patientId: 'p-2', online: false, lastSync: '2026-10-07T08:12:00.000Z', firmware: '0.3.1', power: 'off', simulated: true },
      { id: 'd-3', code: 'TB-003', model: 'Plasma Pro + mô-đun IoMT ESP32', online: false, lastSync: null, firmware: '0.3.0', power: 'off', simulated: true },
    ],
    sessions: [...sesP1, ...sessions('d-2', ['2026-10-02', '2026-10-03', '2026-10-04'], [1, 2, 1])],
    sessionNotes: [
      { sessionId: 'd-1-20261006-1', painBefore: 5, painAfter: 3, at: '2026-10-06T08:00:00.000Z' },
      { sessionId: 'd-1-20261007-1', painBefore: 4, painAfter: 3, at: '2026-10-07T08:00:00.000Z' },
      { sessionId: 'd-1-20261009-2', painBefore: 3, painAfter: 2, at: '2026-10-09T13:00:00.000Z' },
    ],
    reports: [
      { id: 'r-1', patientId: 'p-2', date: '2026-10-10T08:30:00.000Z', kind: 'symptom', content: 'Rát nhẹ quanh vết thương sau buổi tối.', painLevel: 3, handled: false },
      { id: 'r-2', patientId: 'p-2', date: '2026-10-07T08:30:00.000Z', kind: 'device', content: 'Thiết bị không hiện kết nối Wi-Fi.', handled: false },
    ],
    syncErrors: [
      { id: 's-1', at: '2026-10-07T08:15:00.000Z', deviceId: 'd-2', message: 'TB-002 mất kết nối, chưa đồng bộ nhật ký từ 07/10 (mô phỏng).', resolved: false },
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
