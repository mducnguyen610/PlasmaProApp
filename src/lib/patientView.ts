/**
 * Logic sử dụng vai trò bệnh nhân (27/11/2026, FR14, UR18): bệnh nhân xem gì trong hồ sơ của mình. Hàm thuần, chạy được bằng node.
 *
 * Ba điều kiện khác nhau, không gộp:
 * - Ảnh được duyệt cho bệnh nhân xem: bác sĩ phụ trách bấm duyệt (WoundImage.sharedWithPatientAt) và ảnh không bị "Không sử dụng".
 * - Nhãn nghiên cứu đã xác nhận (label.confirmedAt): điều kiện xuất tập huấn luyện, không liên quan việc bệnh nhân xem.
 * - Bệnh nhân đồng ý dùng ảnh cho nghiên cứu (Patient.researchConsent): rút đồng ý chỉ loại ảnh khỏi lần xuất mới, không ẩn ảnh trong hồ sơ.
 */
import type { Evaluation, WoundImage } from './types.ts';

export const NO_DOCTOR_EVALUATION = 'Chưa có đánh giá của bác sĩ';

export function patientCanSeeImage(im: Pick<WoundImage, 'sharedWithPatientAt' | 'status'>): boolean {
  return !!im.sharedWithPatientAt && im.status !== 'excluded';
}

/** Ảnh bệnh nhân được xem của một vết, theo ngày chụp. */
export function patientImagesOf<T extends Pick<WoundImage, 'woundId' | 'captureDate' | 'sharedWithPatientAt' | 'status'>>(images: T[], woundId: string): T[] {
  return images.filter((i) => i.woundId === woundId && patientCanSeeImage(i)).sort((a, b) => a.captureDate.localeCompare(b.captureDate));
}

/** Đánh giá bác sĩ đã công bố của một vết, mới trước (cùng thứ tự với access.latestEvaluation). */
export function publishedEvaluations<T extends Pick<Evaluation, 'woundId' | 'visibleToPatient' | 'date'>>(evaluations: T[], woundId: string): T[] {
  return evaluations
    .map((e, i) => ({ e, i }))
    .filter((x) => x.e.woundId === woundId && x.e.visibleToPatient)
    .sort((a, b) => b.e.date.localeCompare(a.e.date) || b.i - a.i)
    .map((x) => x.e);
}
