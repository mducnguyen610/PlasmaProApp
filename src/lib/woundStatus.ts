/**
 * Giai đoạn B, CN1 (H6, H7; XN-12): trạng thái hiển thị của vết thương và trạng thái chung của bệnh nhân. Hàm thuần.
 *
 * - Đã kết thúc: vết đã lành (đang theo dõi sau điều trị) hoặc đã kết thúc theo dõi.
 * - Đang điều trị: có phác đồ Đang áp dụng hoặc Tạm dừng (gồm tạm dừng tự động khi ghi nhận khép lần 1).
 * - Cần tái khám: bác sĩ đặt thủ công (Wound.revisitAt), hoặc vết từng có phác đồ, phác đồ đã kết thúc mà vết chưa lành
 *   (người dùng chốt 24/11/2026).
 * - Chưa điều trị: chưa từng có phác đồ (bản nháp không tính).
 * Trạng thái quy trình liền thương (WoundStatus) giữ nguyên, chỉ dùng để suy ra; không đổi quy tắc 2 lần khám cách 14 ngày.
 */
import type { TreatmentPlan, Wound } from './types.ts';

export type CareStatus = 'not_treated' | 'treating' | 'revisit' | 'ended';

export const CARE_STATUS: Record<CareStatus, { label: string; tone: 'gray' | 'blue' | 'amber' | 'green' }> = {
  treating: { label: 'Đang điều trị', tone: 'blue' },
  revisit: { label: 'Cần tái khám', tone: 'amber' },
  not_treated: { label: 'Chưa điều trị', tone: 'gray' },
  ended: { label: 'Đã kết thúc', tone: 'green' },
};

/** Thứ tự ưu tiên cho trạng thái chung (H7): đang điều trị > cần tái khám > chưa điều trị > đã kết thúc. */
export const CARE_PRIORITY: CareStatus[] = ['treating', 'revisit', 'not_treated', 'ended'];

export function woundCareStatus(w: Pick<Wound, 'id' | 'status' | 'revisitAt'>, plans: Pick<TreatmentPlan, 'woundId' | 'status'>[]): CareStatus {
  if (w.status === 'follow_up' || w.status === 'closed') return 'ended';
  const mine = plans.filter((p) => p.woundId === w.id);
  if (mine.some((p) => p.status === 'active' || p.status === 'paused')) return 'treating';
  if (w.revisitAt || mine.some((p) => p.status === 'ended')) return 'revisit';
  return 'not_treated';
}

/** Trạng thái chung của bệnh nhân theo thứ tự ưu tiên; chưa có vết thương thì Chưa điều trị. */
export function patientCareStatus(wounds: Pick<Wound, 'id' | 'status' | 'revisitAt'>[], plans: Pick<TreatmentPlan, 'woundId' | 'status'>[]): CareStatus {
  if (wounds.length === 0) return 'not_treated';
  const all = new Set(wounds.map((w) => woundCareStatus(w, plans)));
  return CARE_PRIORITY.find((s) => all.has(s)) ?? 'not_treated';
}

/**
 * Mốc cập nhật gần nhất của vết thương (H6: danh sách vết mới cập nhật trước): lớn nhất trong ngày bắt đầu, ngày chụp ảnh,
 * lần sửa phác đồ, phiên điều trị, các mốc liền thương và thời điểm bác sĩ đặt tái khám. So chuỗi ISO.
 */
export function woundUpdatedAt(
  w: Pick<Wound, 'id' | 'startDate' | 'closureCheck1' | 'followUpFrom' | 'revisitAt' | 'updatedAt'>,
  images: { woundId: string; uploadDate: string; captureDate: string }[],
  plans: { woundId?: string; editedAt: string }[],
  sessions: { woundId?: string; start: string }[],
): string {
  const dates = [
    w.startDate, w.closureCheck1, w.followUpFrom, w.revisitAt, w.updatedAt,
    ...images.filter((i) => i.woundId === w.id).flatMap((i) => [i.uploadDate, i.captureDate]),
    ...plans.filter((p) => p.woundId === w.id).map((p) => p.editedAt),
    ...sessions.filter((s) => s.woundId === w.id).map((s) => s.start),
  ].filter((x): x is string => !!x);
  return dates.sort().pop() ?? w.startDate;
}

/** Lý do chưa xóa được vết thương (H11). Vết đã có ảnh, phác đồ (kể cả nháp) hoặc phiên thì không xóa. */
export function woundDeleteBlocker(woundId: string, data: { images: { woundId: string }[]; plans: { woundId?: string }[]; sessions: { woundId?: string }[]; evaluations?: { woundId: string }[] }): string | null {
  const parts: string[] = [];
  const n = (xs: { woundId?: string }[]) => xs.filter((x) => x.woundId === woundId).length;
  if (n(data.images)) parts.push(`${n(data.images)} ảnh`);
  if (n(data.plans)) parts.push(`${n(data.plans)} phiên bản phác đồ`);
  if (n(data.sessions)) parts.push(`${n(data.sessions)} phiên điều trị`);
  if (data.evaluations && n(data.evaluations)) parts.push(`${n(data.evaluations)} đánh giá`);
  return parts.length ? `Vết thương đã có ${parts.join(', ')} nên không xóa được.` : null;
}
