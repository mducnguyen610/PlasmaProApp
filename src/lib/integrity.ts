import type { AppData } from './types';

/**
 * Stage 9C (gói D): kiểm quan hệ giữa các thực thể trong dữ liệu một máy (AsyncStorage).
 * Chỉ đọc và báo cáo, không sửa dữ liệu, không chạy tự động trong ứng dụng.
 * Dùng trong kiểm thử (dữ liệu mẫu, dữ liệu sau các luồng) và làm đặc tả ràng buộc cho cơ sở dữ liệu sau này
 * (khóa ngoại, ràng buộc cùng bệnh nhân). Không thay cho ràng buộc ở máy chủ.
 */
export type IntegrityIssue = { code: string; entity: string; id: string; detail: string };

export function checkIntegrity(d: AppData): IntegrityIssue[] {
  const out: IntegrityIssue[] = [];
  const add = (code: string, entity: string, id: string, detail: string) => out.push({ code, entity, id, detail });
  const byId = <T extends { id: string }>(xs: T[]) => new Map(xs.map((x) => [x.id, x]));
  const accounts = byId(d.accounts), patients = byId(d.patients), wounds = byId(d.wounds), images = byId(d.images);
  const plans = byId(d.plans), devices = byId(d.devices);

  // Mã trùng trong cùng một tập (phiên trùng mã là bản gửi lại có chủ đích, đã khử trùng khi đọc, nên không xét).
  const dup = (name: string, xs: { id: string }[]) => {
    const seen = new Set<string>();
    for (const x of xs) { if (seen.has(x.id)) add('duplicate_id', name, x.id, 'Mã bị trùng'); seen.add(x.id); }
  };
  dup('account', d.accounts); dup('patient', d.patients); dup('wound', d.wounds); dup('image', d.images);
  dup('evaluation', d.evaluations); dup('plan', d.plans); dup('device', d.devices); dup('report', d.reports);

  for (const a of d.accounts) {
    if (a.role === 'patient' && (!a.patientId || !patients.has(a.patientId))) add('orphan', 'account', a.id, `Tài khoản bệnh nhân trỏ tới hồ sơ không có: ${a.patientId ?? '(trống)'}`);
  }
  for (const p of d.patients) {
    const doc = accounts.get(p.doctorId);
    if (!doc || doc.role !== 'doctor') add('orphan', 'patient', p.id, `Bác sĩ phụ trách không có hoặc không phải bác sĩ: ${p.doctorId}`);
    if (p.deviceId) {
      const dev = devices.get(p.deviceId);
      if (!dev) add('orphan', 'patient', p.id, `Thiết bị không có: ${p.deviceId}`);
      else if (dev.patientId !== p.id) add('mismatch', 'patient', p.id, `Hồ sơ trỏ tới ${p.deviceId} nhưng thiết bị gán cho ${dev.patientId ?? '(không ai)'}`);
    }
  }
  for (const dev of d.devices) {
    if (dev.patientId && !patients.has(dev.patientId)) add('orphan', 'device', dev.id, `Gán cho hồ sơ không có: ${dev.patientId}`);
  }
  for (const w of d.wounds) {
    if (!patients.has(w.patientId)) add('orphan', 'wound', w.id, `Hồ sơ không có: ${w.patientId}`);
  }
  for (const im of d.images) {
    const w = wounds.get(im.woundId);
    if (!w) add('orphan', 'image', im.id, `Vết thương không có: ${im.woundId}`);
    else if (w.patientId !== im.patientId) add('cross_patient', 'image', im.id, `Ảnh ghi ${im.patientId} nhưng vết ${w.id} thuộc ${w.patientId}`);
    if (!patients.has(im.patientId)) add('orphan', 'image', im.id, `Hồ sơ không có: ${im.patientId}`);
  }
  for (const e of d.evaluations) {
    if (!wounds.has(e.woundId)) add('orphan', 'evaluation', e.id, `Vết thương không có: ${e.woundId}`);
    if (e.imageId) {
      const im = images.get(e.imageId);
      if (!im) add('orphan', 'evaluation', e.id, `Ảnh không có: ${e.imageId}`);
      else if (im.woundId !== e.woundId) add('cross_wound', 'evaluation', e.id, `Đánh giá vết ${e.woundId} trỏ tới ảnh của vết ${im.woundId}`);
    }
  }
  for (const pl of d.plans) {
    if (!patients.has(pl.patientId)) add('orphan', 'plan', pl.id, `Hồ sơ không có: ${pl.patientId}`);
    if (pl.woundId) {
      const w = wounds.get(pl.woundId);
      if (!w) add('orphan', 'plan', pl.id, `Vết thương không có: ${pl.woundId}`);
      else if (w.patientId !== pl.patientId) add('cross_patient', 'plan', pl.id, `Đợt của ${pl.patientId} gắn vết ${w.id} thuộc ${w.patientId}`);
    }
  }
  for (const s of d.sessions) {
    if (!devices.has(s.deviceId)) add('orphan', 'session', s.sessionId, `Thiết bị không có: ${s.deviceId}`);
    if (s.woundId && !wounds.has(s.woundId)) add('orphan', 'session', s.sessionId, `Vết thương không có: ${s.woundId}`);
  }
  const sessionIds = new Set(d.sessions.map((s) => s.sessionId));
  for (const n of d.sessionNotes) {
    if (!sessionIds.has(n.sessionId)) add('orphan', 'sessionNote', n.sessionId, 'Ghi chú cho phiên không có');
  }
  for (const r of d.reports) {
    if (!patients.has(r.patientId)) add('orphan', 'report', r.id, `Hồ sơ không có: ${r.patientId}`);
  }
  for (const l of d.deviceLinks ?? []) {
    if (!patients.has(l.patientId)) add('orphan', 'deviceLink', l.id, `Hồ sơ không có: ${l.patientId}`);
    if (!plans.has(l.planId)) add('orphan', 'deviceLink', l.id, `Đợt không có: ${l.planId}`);
  }
  return out;
}
