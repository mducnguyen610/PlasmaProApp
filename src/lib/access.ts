import type { Account, AppData, Evaluation, Patient, Severity } from './types';

export const TERMS_VERSION = 'demo-2026-10-12';
export const SEVERITY = {
  // Tông theo SEVERITY_ROLE (src/theme.status.ts): Nhẹ là neutral để xanh lá chỉ còn nghĩa hoàn thành.
  mild: { label: 'Nhẹ', tone: 'gray' },
  moderate: { label: 'Trung bình', tone: 'amber' },
  severe: { label: 'Nặng', tone: 'red' },
} as const;
export function canManagePatient(actor: Account | null | undefined, patient?: Patient) {
  return !!actor && !actor.locked && !actor.pendingApproval && actor.role === 'doctor' && patient?.doctorId === actor.id;
}
export function latestEvaluation(data: AppData, woundId: string, publishedOnly = false): Evaluation | undefined {
  return data.evaluations.filter(e => e.woundId === woundId && (!publishedOnly || e.visibleToPatient))
    .sort((a, b) => b.date.localeCompare(a.date) || data.evaluations.indexOf(b) - data.evaluations.indexOf(a))[0];
}
export function patientSeverity(data: AppData, patientId: string): Severity | undefined {
  const levels = data.wounds.filter(w => w.patientId === patientId && w.status !== 'closed')
    .map(w => latestEvaluation(data, w.id)?.severity);
  return levels.includes('severe') ? 'severe' : levels.includes('moderate') ? 'moderate' : levels.includes('mild') ? 'mild' : undefined;
}
// Giai đoạn B (CN2 N9, S3): tập dữ liệu huấn luyện chuyển sang imageLabel.ts (trainingImages), suy ra tự động, chỉ quản trị xuất.


/**
 * Stage 9B (S8-B05): chính sách phân quyền ở lớp kho dữ liệu trên máy cho ba thao tác trước đây không kiểm vai trò.
 * Vai trò lấy từ nơi gọi hiện có (không đổi vai trò dự kiến):
 * - addReport: bệnh nhân báo triệu chứng, sự cố cho chính hồ sơ của mình (N08 `report.tsx`, N02 "vết thương mở lại").
 * - setReportHandled: bác sĩ phụ trách hồ sơ (B04 hồ sơ bệnh nhân, B07 sau khi lưu đánh giá).
 * - resolveSyncError: quản trị viên (Q04 lỗi hệ thống, Q04b chi tiết lỗi), cùng điều kiện với requireAdmin.
 * Đây là kiểm tra phía ứng dụng; dữ liệu nằm trong bộ nhớ máy nên không thay được phân quyền ở máy chủ.
 */
export function canAddReport(actor: Account | null | undefined, patientId: string) {
  return !!actor && !actor.locked && !actor.pendingApproval && actor.role === 'patient' && !!actor.patientId && actor.patientId === patientId;
}
export function canHandleReport(actor: Account | null | undefined, patient?: Patient) {
  return canManagePatient(actor, patient);
}
export function canResolveSyncError(actor: Account | null | undefined) {
  return !!actor && !actor.locked && actor.role === 'admin';
}
