/**
 * Giai đoạn B (AU-04, AU-05): quy tắc phiên bản phác đồ, không phụ thuộc React, chạy được bằng node để kiểm thử.
 *
 * - Phác đồ (protocolId) gồm nhiều phiên bản (TreatmentPlan, id là mã phiên bản). Sửa phác đồ đang có tạo phiên bản mới
 *   cùng protocolId; tạo phác đồ mới cho vết thương thì protocolId mới.
 * - Bệnh nhân phải xác nhận đã đọc phiên bản đang áp dụng (patientAckAt) trước khi nạp liệu trình hay ghi phiên.
 * - Mỗi phiên điều trị ghi kèm mã phiên bản và phác đồ đang áp dụng lúc ghi; phiên cũ không có thì để trống, không suy đoán.
 */
import type { DeviceLinkLog, DeviceSession, TreatmentPlan, Wound, WoundImage } from './types.ts';

/**
 * Phiên bản bác sĩ đã xác nhận, đang áp dụng, nhưng bệnh nhân chưa xác nhận đã đọc; hoặc (logic chốt 25/11, M32) đã gia hạn mà
 * bệnh nhân chưa xác nhận đọc ngày kết thúc mới.
 */
export function needsPatientAck(plan: TreatmentPlan | undefined | null): boolean {
  if (!plan || !plan.confirmed || (plan.status !== 'active' && plan.status !== 'paused')) return false;
  if (plan.status === 'active' && !plan.patientAckAt) return true;
  const last = plan.extensions?.[plan.extensions.length - 1];
  return !!last && !last.ackAt;
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

/**
 * Giai đoạn B (CN3 P2, P7): phác đồ đang mở của một vết, tức phác đồ của phiên bản mới nhất khi phiên bản đó chưa kết thúc
 * (nháp, đang áp dụng hoặc tạm dừng). Không có thì lần lưu kế tiếp là phác đồ mới cho đợt khác.
 */
export function openProtocolId(plans: TreatmentPlan[], patientId: string, woundId: string | undefined): string | undefined {
  const latest = plans
    .filter((p) => p.patientId === patientId && (p.woundId ?? null) === (woundId ?? null))
    .sort((a, b) => b.version - a.version)[0];
  return latest && latest.status !== 'ended' ? latest.protocolId : undefined;
}

/**
 * Giai đoạn B (CN3 P1, P3; AU-06): ảnh căn cứ để tạo phác đồ mới: ảnh của chính vết đó, chụp trong ngày hôm nay (ngày giờ Việt Nam,
 * today do nơi gọi truyền từ localDay), đã lưu, chất lượng Đạt, không "Không sử dụng", ngày chụp xác định. Không cần kết quả AI.
 * Thứ tự: mới nhất trước (ảnh đầu tiên là ảnh đề xuất).
 */
export function planPhotoCandidates<T extends Pick<WoundImage, 'id' | 'woundId' | 'captureDate' | 'uploadDate' | 'status' | 'capture' | 'label'>>(images: T[], woundId: string | undefined, today: string): T[] {
  if (!woundId) return [];
  return images
    .filter((im) => im.woundId === woundId && im.captureDate === today && im.status !== 'excluded' && im.label?.quality === 'pass' && im.capture?.sourceDateKnown !== false)
    .sort((a, b) => (b.capture?.capturedAt ?? b.uploadDate).localeCompare(a.capture?.capturedAt ?? a.uploadDate) || b.id.localeCompare(a.id));
}

/**
 * Giai đoạn B (CN3 P9; AU-09): xóa phác đồ chỉ khi chưa có phiên. Phác đồ (mọi phiên bản cùng protocolId) bị chặn khi:
 * có phiên gắn một phiên bản của nó; đã nạp xuống máy (DeviceLinkLog); hoặc có phiên cũ chưa gắn phiên bản của cùng vết
 * trong khoảng ngày của phác đồ (không biết phiên đó theo phác đồ nào nên không xóa). Trả lý do chặn, hoặc null.
 */
export function planDeleteBlocker(
  plans: TreatmentPlan[],
  sessions: Pick<DeviceSession, 'planId' | 'protocolId' | 'woundId' | 'start'>[],
  links: Pick<DeviceLinkLog, 'planId'>[],
  protocolId: string,
): string | null {
  const versions = plans.filter((p) => p.protocolId === protocolId);
  if (!versions.length) return 'Không tìm thấy phác đồ.';
  const ids = new Set(versions.map((p) => p.id));
  const linked = sessions.filter((s) => s.protocolId === protocolId || (s.planId && ids.has(s.planId))).length;
  if (linked) return `Phác đồ đã có ${linked} phiên điều trị. Chỉ kết thúc được, không xóa.`;
  if (links.some((l) => ids.has(l.planId))) return 'Phác đồ đã được nạp xuống máy. Chỉ kết thúc được, không xóa.';
  const woundId = versions[0].woundId;
  const from = versions.reduce((m, p) => (p.startDate < m ? p.startDate : m), versions[0].startDate);
  const to = versions.reduce((m, p) => (p.endDate > m ? p.endDate : m), versions[0].endDate);
  const legacy = sessions.filter((s) => !s.planId && s.woundId === woundId && s.start.slice(0, 10) >= from && s.start.slice(0, 10) <= to).length;
  if (legacy) return `Có ${legacy} phiên cũ của vết này trong thời gian phác đồ (chưa ghi phiên bản). Chỉ kết thúc được, không xóa.`;
  return null;
}
