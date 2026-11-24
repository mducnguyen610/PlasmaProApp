/**
 * Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 4): vòng đời phác đồ ở thẻ Phác đồ của trang vết thương.
 * Hàm thuần, không phụ thuộc React, chạy được bằng node (planLifecycle.test.ts).
 *
 * - Phác đồ (protocolId) gồm các phiên bản (TreatmentPlan). Đổi thông số tạo phiên bản mới có ngày bắt đầu áp dụng (M24):
 *   phiên bản chờ ở trạng thái "scheduled", tới ngày thì thành Đang áp dụng, phiên bản cũ thành Kết thúc kèm supersededBy.
 * - Gia hạn chỉ đổi ngày kết thúc, không tạo phiên bản, bắt buộc lý do, bệnh nhân xác nhận đã đọc (M32).
 * - Kết thúc sớm bắt buộc lý do, ghi vào nhật ký trạng thái (M22). Không tự dừng thiết bị.
 */
// @ts-ignore TS5097: đuôi .ts để chạy kiểm thử bằng node; Metro và tsc vẫn phân giải đúng tệp.
import { localDay } from './course.ts';
import type { PlanExtension, SessionChange, TreatmentPlan } from './types.ts';

const byVersion = (a: TreatmentPlan, b: TreatmentPlan) => a.version - b.version;

/** Các phiên bản của một phác đồ, cũ trước. */
export function protocolVersions(plans: TreatmentPlan[], protocolId: string): TreatmentPlan[] {
  return plans.filter((p) => p.protocolId === protocolId).sort(byVersion);
}

/**
 * Ngày một phiên bản bắt đầu áp dụng. Phiên bản mới có effectiveFrom. Phiên bản cũ (trước 25/11) áp dụng ngay khi lưu (localDay của
 * editedAt); phiên bản đầu của phác đồ áp dụng từ ngày bắt đầu phác đồ.
 */
export function versionStart(v: TreatmentPlan, first: boolean): string {
  if (v.effectiveFrom) return v.effectiveFrom;
  if (first) return v.startDate;
  const saved = localDay(v.editedAt);
  return saved < v.startDate ? v.startDate : saved;
}

/**
 * Tới ngày áp dụng thì phiên bản chờ thành Đang áp dụng (hoặc Tạm dừng nếu phác đồ đang tạm dừng), phiên bản cũ đang áp dụng
 * hoặc tạm dừng thành Kết thúc kèm supersededBy. Không xóa phiên bản nào. Trả đúng mảng cũ khi không có gì đổi.
 */
export function settlePlans(plans: TreatmentPlan[], today: string): TreatmentPlan[] {
  const due = plans.filter((p) => p.status === 'scheduled' && !!p.effectiveFrom && p.effectiveFrom <= today).sort(byVersion);
  if (!due.length) return plans;
  let out = plans;
  for (const v of due) {
    const older = out.filter((x) => x.protocolId === v.protocolId && x.version < v.version && (x.status === 'active' || x.status === 'paused' || x.status === 'scheduled'));
    const wasPaused = older.some((x) => x.status === 'paused');
    out = out.map((x) => {
      if (x.id === v.id) return { ...x, status: wasPaused ? 'paused' as const : 'active' as const };
      if (older.some((o) => o.id === x.id)) return { ...x, status: 'ended' as const, supersededBy: v.id };
      return x;
    });
  }
  return out;
}

/** Nhãn trạng thái hiển thị của một phiên bản: "Đã thay thế" cho phiên bản bị phiên bản mới thay. */
export function versionStatusLabel(v: Pick<TreatmentPlan, 'status' | 'supersededBy'>): string | null {
  return v.status === 'ended' && v.supersededBy ? 'Đã thay thế' : null;
}

/** Lần gia hạn cuối chưa được bệnh nhân xác nhận đọc (M32). */
export function pendingExtension(v: Pick<TreatmentPlan, 'extensions'> | undefined | null): PlanExtension | undefined {
  const last = v?.extensions?.[v.extensions.length - 1];
  return last && !last.ackAt ? last : undefined;
}

/** Áp một lần gia hạn lên phiên bản: đổi ngày kết thúc và giai đoạn cuối, ghi nhật ký gia hạn. Không đổi version. */
export function applyExtension(v: TreatmentPlan, toEnd: string, reason: string, by: string, at: string): TreatmentPlan {
  const fromEnd = v.endDate;
  const phases = v.phases?.length ? v.phases.map((ph, i, all) => (i === all.length - 1 ? { ...ph, to: toEnd } : ph)) : v.phases;
  return { ...v, endDate: toEnd, phases, extensions: [...(v.extensions ?? []), { at, by, fromEnd, toEnd, reason }] };
}

/** Lý do chưa gia hạn được, null khi được. */
export function extendBlocker(v: TreatmentPlan | undefined, toEnd: string | null, reason: string): string | null {
  if (!v) return 'Không có phác đồ đang hoạt động.';
  if (v.status !== 'active' && v.status !== 'paused') return 'Chỉ gia hạn phác đồ đang hoạt động hoặc tạm dừng.';
  if (!toEnd) return 'Nhập ngày kết thúc mới dạng dd/mm/yyyy.';
  if (toEnd <= v.endDate) return 'Ngày kết thúc mới phải sau ngày kết thúc hiện tại.';
  if (!reason.trim()) return 'Nhập lý do gia hạn.';
  return null;
}

/** Số thứ tự phác đồ trong vết (1, 2, ...), theo thời điểm lập phiên bản đầu. */
export function protocolNumber(plans: TreatmentPlan[], woundId: string | undefined, protocolId: string | undefined): number {
  const firstAt = new Map<string, string>();
  for (const p of plans) {
    if (p.woundId !== woundId || !p.protocolId) continue;
    const cur = firstAt.get(p.protocolId);
    if (!cur || p.editedAt < cur) firstAt.set(p.protocolId, p.editedAt);
  }
  const order = [...firstAt.entries()].sort((a, b) => a[1].localeCompare(b[1]) || a[0].localeCompare(b[0])).map((x) => x[0]);
  return order.indexOf(protocolId ?? '') + 1;
}

export const pad3 = (n: number) => String(Math.max(0, n)).padStart(3, '0');

/** Tên hiển thị: tên bác sĩ đặt, hoặc "Phác đồ số 00n". */
export function protocolTitle(v: Pick<TreatmentPlan, 'title'> | undefined, n: number): string {
  return v?.title?.trim() || `Phác đồ số ${pad3(n)}`;
}

export interface ProtocolView {
  protocolId: string;
  versions: TreatmentPlan[];
  /** Phiên bản đang có hiệu lực (không tính bản chờ áp dụng); không có thì phiên bản mới nhất. */
  current: TreatmentPlan;
  /** Phiên bản chờ áp dụng, nếu có. */
  pending?: TreatmentPlan;
  latest: TreatmentPlan;
  number: number;
  title: string;
  /** Đang hoạt động hoặc tạm dừng (chưa kết thúc). */
  open: boolean;
  createdBy: string;
  createdAt: string;
  startDate: string;
  endDate: string;
}

/** Phác đồ của một vết, mới trước (M22: phác đồ đang hoạt động ở đầu, lịch sử phác đồ bên dưới). */
export function protocolsOfWound(plans: TreatmentPlan[], patientId: string, woundId: string): ProtocolView[] {
  const ids = [...new Set(plans.filter((p) => p.patientId === patientId && p.woundId === woundId && p.protocolId).map((p) => p.protocolId!))];
  return ids.map((id) => {
    const versions = protocolVersions(plans, id);
    const latest = versions[versions.length - 1];
    const pending = versions.filter((v) => v.status === 'scheduled').pop();
    const inEffect = versions.filter((v) => v.status !== 'scheduled' && v.status !== 'draft');
    const current = inEffect.find((v) => v.status === 'active' || v.status === 'paused') ?? inEffect[inEffect.length - 1] ?? latest;
    const number = protocolNumber(plans, woundId, id);
    return {
      protocolId: id, versions, current, pending, latest, number, title: protocolTitle(versions.find((v) => v.title) ?? latest, number),
      open: versions.some((v) => v.status === 'active' || v.status === 'paused' || v.status === 'scheduled' || v.status === 'draft'),
      createdBy: versions[0].editedBy, createdAt: versions[0].editedAt,
      startDate: versions[0].startDate, endDate: current.endDate,
    };
  }).sort((a, b) => Number(b.open) - Number(a.open) || b.createdAt.localeCompare(a.createdAt));
}

/** Một dòng lịch sử thay đổi (mục 4.2 nhóm 5): phiên bản, gia hạn, tạm dừng, tiếp tục, kết thúc. */
export interface ChangeEntry { at: string; by: string; kind: 'create' | 'version' | 'extend' | 'pause' | 'resume' | 'end'; title: string; reason: string; versionId: string }

export function changeHistory(versions: TreatmentPlan[], fmt: (iso: string) => string): ChangeEntry[] {
  const out: ChangeEntry[] = [];
  versions.forEach((v, i) => {
    out.push({
      at: v.editedAt, by: v.editedBy, kind: i === 0 ? 'create' : 'version', versionId: v.id, reason: v.reason,
      title: i === 0 ? `Lập phác đồ, phiên bản ${v.version}` : `Phiên bản ${v.version}${v.effectiveFrom ? `, áp dụng từ ${fmt(v.effectiveFrom)}` : ''}`,
    });
    for (const e of v.extensions ?? []) {
      out.push({ at: e.at, by: e.by, kind: 'extend', versionId: v.id, reason: e.reason, title: `Gia hạn từ ${fmt(e.fromEnd)} đến ${fmt(e.toEnd)}${e.ackAt ? ', bệnh nhân đã đọc' : ', chờ bệnh nhân xác nhận'}` });
    }
    for (const s of v.statusLog ?? []) {
      out.push({ at: s.at, by: s.by, kind: s.action, versionId: v.id, reason: s.reason, title: s.action === 'pause' ? 'Tạm dừng' : s.action === 'resume' ? 'Tiếp tục' : 'Kết thúc sớm' });
    }
  });
  return out.sort((a, b) => b.at.localeCompare(a.at));
}

/**
 * Lý do bệnh nhân chưa chạy được phiên hôm nay theo quy tắc phác đồ (P5, M31, M32, M29, P6). null khi không có chặn nào.
 * Không gồm điều kiện của máy (kết nối, nạp liệu trình); không chặn ngoài khung giờ (giả định 5 mục 8).
 */
export function runBlocker(plan: TreatmentPlan | undefined, changes: SessionChange[], today: string): string | null {
  if (!plan) return 'Chưa có phác đồ đang hoạt động.';
  if (plan.status === 'paused') return 'Phác đồ đang tạm dừng.';
  if (plan.status !== 'active') return 'Phác đồ không còn hoạt động.';
  if (!plan.patientAckAt) return 'Bệnh nhân chưa xác nhận đã đọc phiên bản đang áp dụng.';
  const ext = pendingExtension(plan);
  if (ext && today > ext.fromEnd) return `Bệnh nhân chưa xác nhận đã đọc ngày kết thúc mới (${ext.toEnd}).`;
  const mine = changes.filter((c) => c.protocolId === plan.protocolId).sort((a, b) => a.at.localeCompare(b.at));
  const last = mine.filter((c) => c.date === today).pop();
  if (last?.kind === 'cancel') return 'Bác sĩ đã hủy phiên hôm nay.';
  if (last?.kind === 'postpone') return `Bác sĩ đã hoãn phiên hôm nay sang ${last.newDate}.`;
  return null;
}
