/**
 * Logic chốt 25/11/2026 (TC-7, TC-10): việc chờ của bác sĩ cho chuông thông báo ở Trang chủ. Chuông luôn báo đủ bốn loại,
 * không tùy chỉnh: ảnh chưa đủ nhãn, ảnh cần chụp lại, phác đồ chờ bệnh nhân xác nhận, máy báo lỗi. Chỉ hồ sơ mình phụ trách,
 * đang theo dõi (không tính hồ sơ đã lưu trữ); máy chưa giao báo lỗi cũng tính.
 */
import { needsLabel } from './imageLabel';
import { needsPatientAck } from './planVersion';
import type { AppData, Device, TreatmentPlan, WoundImage } from './types';

export interface DoctorTasks {
  unlabeled: WoundImage[];
  retakes: WoundImage[];
  awaitingAck: TreatmentPlan[];
  faults: Device[];
  total: number;
}

export function doctorTasks(data: Pick<AppData, 'patients' | 'images' | 'plans' | 'devices'>, doctorId: string | undefined): DoctorTasks {
  const ids = new Set(data.patients.filter((p) => p.doctorId === doctorId && !p.archivedAt).map((p) => p.id));
  const mine = data.images.filter((i) => ids.has(i.patientId));
  const unlabeled = mine.filter((i) => needsLabel(i));
  const retakes = mine.filter((i) => !!i.retakeRequested);
  const awaitingAck = data.plans.filter((p) => ids.has(p.patientId) && needsPatientAck(p));
  const faults = data.devices.filter((d) => d.fault && (!d.patientId || ids.has(d.patientId)));
  return { unlabeled, retakes, awaitingAck, faults, total: unlabeled.length + retakes.length + awaitingAck.length + faults.length };
}
