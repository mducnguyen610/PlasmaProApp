import type { TreatmentPlan } from './types';

/**
 * Stage 9B (S8-B04): chọn đích khi bệnh nhân mở "Theo dõi phiên điều trị" từ N07 (tab Thiết bị).
 * Vết thương đủ điều kiện = có đợt đang áp dụng và bác sĩ đã xác nhận, cùng điều kiện T01 dùng để chọn đợt nạp
 * (`connect-device.tsx`, biến `courses`), nên đích ở đây trùng với vết T01 tự chọn khi chỉ có một đợt.
 * - Đúng một vết đủ điều kiện: mở T02 kèm woundId của vết đó.
 * - Từ hai vết trở lên: mở T01 để bệnh nhân chọn rõ vết thương (không lấy phần tử đầu mảng).
 * - Không có vết nào: giữ hành vi cũ (mở T02 không kèm vết thương; T02 ghi rõ "chưa chọn vết thương").
 */
export type MonitorTarget =
  | { kind: 'monitor'; woundId: string }
  | { kind: 'choose' }
  | { kind: 'none' };

export function eligibleCourseWounds(courses: { woundId: string; plan: TreatmentPlan | undefined }[]): string[] {
  return courses.filter((c) => c.plan && c.plan.status === 'active' && c.plan.confirmed).map((c) => c.woundId);
}

export function monitorTarget(courses: { woundId: string; plan: TreatmentPlan | undefined }[]): MonitorTarget {
  const ids = eligibleCourseWounds(courses);
  if (ids.length === 1) return { kind: 'monitor', woundId: ids[0] };
  if (ids.length > 1) return { kind: 'choose' };
  return { kind: 'none' };
}
