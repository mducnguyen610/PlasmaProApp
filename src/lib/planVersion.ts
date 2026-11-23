/**
 * Giai đoạn B (AU-04, AU-05): quy tắc phiên bản phác đồ, không phụ thuộc React, chạy được bằng node để kiểm thử.
 *
 * - Phác đồ (protocolId) gồm nhiều phiên bản (TreatmentPlan, id là mã phiên bản). Sửa phác đồ đang có tạo phiên bản mới
 *   cùng protocolId; tạo phác đồ mới cho vết thương thì protocolId mới.
 * - Bệnh nhân phải xác nhận đã đọc phiên bản đang áp dụng (patientAckAt) trước khi nạp liệu trình hay ghi phiên.
 * - Mỗi phiên điều trị ghi kèm mã phiên bản và phác đồ đang áp dụng lúc ghi; phiên cũ không có thì để trống, không suy đoán.
 */
import type { DeviceLinkLog, DeviceSession, TreatmentPlan, Wound } from './types.ts';

/** Phiên bản bác sĩ đã xác nhận, đang áp dụng, nhưng bệnh nhân chưa xác nhận đã đọc. */
export function needsPatientAck(plan: TreatmentPlan | undefined | null): boolean {
  return !!plan && plan.status === 'active' && plan.confirmed && !plan.patientAckAt;
}

/** Chỉ phiên bản đang áp dụng, bác sĩ đã xác nhận và bệnh nhân đã xác nhận đọc mới được nạp xuống máy hay ghi phiên. */
export function canLoadPlan(plan: TreatmentPlan | undefined | null): boolean {
  return !!plan && plan.status === 'active' && plan.confirmed && !!plan.patientAckAt;
}

/** Phiên bản đang áp dụng (đã xác nhận) của một vết thương; phiên bản cao nhất nếu có nhiều. */
export function activeVersionOf(plans: TreatmentPlan[], patientId: string, woundId: string | undefined): TreatmentPlan | undefined {
  if (!woundId) return undefined;
  return plans
    .filter((p) => p.patientId === patientId && p.woundId === woundId && p.status === 'active' && p.confirmed)
    .sort((a, b) => b.version - a.version)[0];
}

/**
 * Liên kết phiên với phiên bản phác đồ máy đang giữ: lần nạp gần nhất máy đã nhận (kết quả acked) của hồ sơ, cho đúng vết thương.
 * Đây là liệu trình máy thực sự chạy, kể cả khi bác sĩ vừa tạo phiên bản mới mà bệnh nhân chưa nạp. Không có lần nạp nào thì
 * trả null: phiên vẫn được ghi (máy đã chạy thật) nhưng để trống phiên bản, không suy đoán.
 */
export function loadedPlanLink(links: DeviceLinkLog[], plans: TreatmentPlan[], patientId: string, woundId: string | undefined): Pick<DeviceSession, 'planId' | 'planVersion' | 'protocolId'> | null {
  const hit = links
    .filter((l) => l.patientId === patientId && l.result === 'acked')
    .map((l) => ({ l, plan: plans.find((p) => p.id === l.planId) }))
    .filter((x) => !!x.plan && x.plan.patientId === patientId && (!woundId || x.plan.woundId === woundId))
    .sort((a, b) => b.l.at.localeCompare(a.l.at))[0];
  if (!hit) return null;
  return { planId: hit.plan!.id, planVersion: hit.plan!.version, protocolId: hit.plan!.protocolId };
}

/**
 * Mã phác đồ cho phiên bản sắp lưu. newProtocol: bác sĩ chọn tạo phác đồ mới. Không thì nối tiếp phác đồ của phiên bản
 * mới nhất cùng vết thương; vết chưa có phác đồ thì dùng mã mới (makeId).
 */
export function protocolIdFor(plans: TreatmentPlan[], patientId: string, woundId: string | undefined, newProtocol: boolean, makeId: () => string): string {
  if (newProtocol) return makeId();
  const prev = plans
    .filter((p) => p.patientId === patientId && (p.woundId ?? null) === (woundId ?? null))
    .sort((a, b) => b.version - a.version)[0];
  return prev?.protocolId ?? makeId();
}

/**
 * Chuyển đổi dữ liệu cũ khi đọc từ bộ nhớ máy. Xác định, chạy nhiều lần cho cùng kết quả, không xóa bản ghi nào.
 * - Phiên bản không có woundId: gán vết thương mở sớm nhất của bệnh nhân (ngày bắt đầu rồi mã vết), không theo vị trí trong mảng.
 *   Bệnh nhân không có vết thương thì giữ nguyên.
 * - Phiên bản không có protocolId: mỗi (bệnh nhân, vết thương) cũ là một phác đồ, mã dựng từ hai mã đó.
 * - Bác sĩ đã xác nhận ở bản cũ không có bước bệnh nhân xác nhận: để trống patientAckAt, bệnh nhân xác nhận một lần.
 */
export function migratePlans(plans: TreatmentPlan[], wounds: Wound[]): TreatmentPlan[] {
  const firstWound = (patientId: string) =>
    wounds
      .filter((w) => w.patientId === patientId)
      .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.code.localeCompare(b.code) || a.id.localeCompare(b.id))[0]?.id;
  return plans.map((p) => {
    const woundId = p.woundId ?? firstWound(p.patientId);
    const protocolId = p.protocolId ?? `pr-cu-${p.patientId}-${woundId ?? 'khong-vet'}`;
    if (woundId === p.woundId && protocolId === p.protocolId) return p;
    return { ...p, woundId, protocolId };
  });
}
