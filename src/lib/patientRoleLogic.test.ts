// Chạy: node src/lib/patientRoleLogic.test.ts
// Kiểm thử logic vai trò bệnh nhân (27/11/2026, mục III của yêu cầu): T01 đến T12 trên một bộ dữ liệu chung.
// Bộ dữ liệu: bệnh nhân P (bác sĩ phụ trách bs-1) có vết A (VT-01) và B (VT-02), mỗi vết một phác đồ, cùng ngày có phiên;
// bệnh nhân Q (bác sĩ bs-2); quản trị ad-1; máy D1, D2. Kịch bản đổi máy: P giữ D1, trả D1, nhận D2; D1 giao cho Q.
/* eslint-disable import/first */
// Đặt múi giờ tiến trình khác giờ Việt Nam để chắc ngày tính theo UTC+7 chứ không theo máy chạy kiểm thử (T12).
process.env.TZ = 'America/Los_Angeles';

import assert from 'node:assert/strict';
import { reportsVisibleTo } from './access.ts';
import { courseProgress, localDay, sessionsForWound } from './course.ts';
import { patientHomeCourses } from './patientHome.ts';
import { dedupeSessions, reconciledThrough, resolveSessionLink, sessionOwner, sessionResultLabel, sessionsOfPatient, syncText, unlinkedSessions } from './patientSessions.ts';
import { NO_DOCTOR_EVALUATION, patientCanSeeImage, patientImagesOf, publishedEvaluations } from './patientView.ts';
import { canLoadPlan, inEffectVersion, loadBlocker, needsPatientAck } from './planVersion.ts';
import { protocolSlots, scheduleItemKey, scheduleItems } from './sessionSchedule.ts';
import type { DeviceLinkLog, DeviceSession, TreatmentPlan } from './types.ts';

const TODAY = '2026-11-27';
const at = (d: string, hm: string) => new Date(`${d}T${hm}:00+07:00`).toISOString();

const plan = (x: Partial<TreatmentPlan>): TreatmentPlan => ({
  id: 'x', patientId: 'P', woundId: 'A', protocolId: 'prA', version: 1, status: 'active', confirmed: true, patientAckAt: at('2026-11-20', '08:00'),
  startDate: '2026-11-20', endDate: '2026-12-10', sessionsPerDay: 1, minIntervalMin: null, targetEnergyWh: null, reviewSchedule: '', notes: '',
  editedBy: 'bs-1', editedAt: at('2026-11-19', '09:00'), reason: '', durationSec: 60, doseLevel: 2, ...x,
}) as TreatmentPlan;
const A1 = plan({ id: 'A1', woundId: 'A', protocolId: 'prA' });
const B1 = plan({ id: 'B1', woundId: 'B', protocolId: 'prB' });
const wounds = [{ id: 'A', code: 'VT-01', patientId: 'P', location: 'Gót trái', status: 'active' }, { id: 'B', code: 'VT-02', patientId: 'P', location: 'Cẳng chân phải', status: 'active' }];
const patients = [{ id: 'P', doctorId: 'bs-1', deviceId: 'D1' }, { id: 'Q', doctorId: 'bs-2', deviceId: undefined as string | undefined }];
const devices = [{ id: 'D1', patientId: 'P' as string | undefined, assignedAt: at('2026-11-20', '07:00') }, { id: 'D2', patientId: undefined as string | undefined }];
const meP = { role: 'patient', locked: false, patientId: 'P' };
const S = (x: Partial<DeviceSession>): DeviceSession => ({ sessionId: 's', deviceId: 'D1', start: at(TODAY, '09:00'), durationMin: 1, energyWh: null, status: 'completed', source: 'device', ...x }) as DeviceSession;
const link = (x: Partial<DeviceLinkLog>): DeviceLinkLog => ({ id: 'l', deviceId: 'D1', patientId: 'P', planId: 'B1', planVersion: 1, at: at(TODAY, '08:55'), by: 'u-P', transport: 'simulated', result: 'acked', attempts: 1, protocolVersion: 1, capsSource: 'table', ...x }) as DeviceLinkLog;

// T01. Lịch theo vết: cùng ngày A và B là hai phiên riêng; thứ tự ổn định theo mã vết, không phụ thuộc thứ tự dữ liệu, không có ưu tiên.
{
  const input = { wounds, patientId: 'P', sessions: [], changes: [], today: TODAY, from: TODAY, to: TODAY, confirmedOnly: true };
  const a = scheduleItems({ ...input, plans: [A1, B1] });
  const b = scheduleItems({ ...input, plans: [B1, A1], wounds: [...wounds].reverse() });
  assert.deepEqual(a.map((i) => i.woundCode), ['VT-01', 'VT-02'], 'T01: hai phiên hôm nay, một cho mỗi vết');
  assert.deepEqual(a.map((i) => i.key), b.map((i) => i.key), 'T01: thứ tự không phụ thuộc thứ tự mảng');
  assert.ok(a.every((i) => i.status === 'due_today'), 'T01: cả hai đến hạn hôm nay');
  // Trang chủ không tự chọn vết: nhiều vết đang điều trị thì treating trống, liệt kê tất cả.
  const home = patientHomeCourses([{ w: wounds[1], plan: B1 }, { w: wounds[0], plan: A1 }]);
  assert.equal(home.treating, undefined, 'T01: không chọn vết đầu tiên');
  assert.deepEqual(home.treatingAll.map((c) => c.w.id), ['A', 'B']);
}

// T02. Định danh phiên theo lịch là (mã phác đồ, ngày) của bác sĩ; không có mã phiên giả. Chọn B trả đúng phiên bản B1.
{
  const items = scheduleItems({ plans: [A1, B1], wounds, patientId: 'P', sessions: [], changes: [], today: TODAY, from: TODAY, to: TODAY, confirmedOnly: true });
  const b = items.find((i) => i.woundId === 'B')!;
  assert.equal(b.key, scheduleItemKey('prB', TODAY), 'T02: khóa phiên = (phác đồ, ngày)');
  assert.equal(b.versionId, 'B1', 'T02: phiên của B dùng phiên bản B1');
  assert.equal(b.protocolId, 'prB');
  assert.ok(!('sessionId' in b), 'T02: phiên chưa diễn ra không có mã phiên máy');
}

// T03. Ba sự kiện tách nhau: bác sĩ xác nhận, bệnh nhân xác nhận đã đọc đúng phiên bản, máy xác nhận nhận liệu trình.
{
  const d = { plans: [A1, { ...B1, patientAckAt: undefined }], wounds, patients, devices };
  const unacked = d.plans[1];
  assert.equal(needsPatientAck(unacked), true, 'T03: B1 chưa được bệnh nhân xác nhận đọc');
  assert.equal(canLoadPlan(unacked), false);
  assert.match(loadBlocker(d, meP, { patientId: 'P', woundId: 'B', planId: 'B1', deviceId: 'D1' })!, /chưa xác nhận đã đọc phiên bản 1/);
  const acked = { ...d, plans: [A1, B1] };
  assert.equal(loadBlocker(acked, meP, { patientId: 'P', woundId: 'B', planId: 'B1', deviceId: 'D1' }), null, 'T03: đủ điều kiện nạp B1 vào D1');
  // Phiên bản của vết A không nạp được dưới tên vết B; máy không phải máy được giao thì chặn.
  assert.match(loadBlocker(acked, meP, { patientId: 'P', woundId: 'B', planId: 'A1', deviceId: 'D1' })!, /không thuộc vết thương này/);
  assert.match(loadBlocker(acked, meP, { patientId: 'P', woundId: 'B', planId: 'B1', deviceId: 'D2' })!, /không phải máy bác sĩ giao/);
  assert.match(loadBlocker(acked, { role: 'patient', locked: false, patientId: 'Q' }, { patientId: 'P', woundId: 'B', planId: 'B1', deviceId: 'D1' })!, /Chỉ bệnh nhân của hồ sơ/);
  // Bác sĩ chưa xác nhận: bệnh nhân không thấy phiên bản trong lịch.
  const draftOnly = scheduleItems({ plans: [{ ...B1, confirmed: false }], wounds, patientId: 'P', sessions: [], changes: [], today: TODAY, confirmedOnly: true });
  assert.equal(draftOnly.length, 0, 'T03: phiên bản bác sĩ chưa xác nhận không hiện cho bệnh nhân');
}

// T04. B1 sang B2: bản chờ áp dụng không thay B1 trên màn bệnh nhân (lỗi video N02); phiên đang chạy giữ B1; B2 có hiệu lực thì
// phải đọc B2 trước khi nạp.
{
  const B2s = plan({ id: 'B2', woundId: 'B', protocolId: 'prB', version: 2, status: 'scheduled', patientAckAt: undefined, effectiveFrom: '2026-11-30' } as Partial<TreatmentPlan>);
  assert.equal(inEffectVersion([A1, B1, B2s], 'P', 'B', { patientView: true })!.id, 'B1', 'T04: bản scheduled không thay đợt đang chạy');
  // Bác sĩ ban hành B2 lúc phiên B1 đang chạy: phiên vẫn thuộc B1 (lần nạp máy đã nhận trước lúc bắt đầu).
  const B2 = { ...B2s, status: 'active' as const };
  const r = resolveSessionLink({ links: [link({ id: 'l1' })], plans: [A1, { ...B1, status: 'ended' }, B2], patientId: 'P', deviceId: 'D1', startedAt: at(TODAY, '09:00'), woundId: 'B', linkId: 'l1' });
  assert.equal(r.link?.planId, 'B1', 'T04: phiên gắn phiên bản đã nạp thực tế');
  assert.equal(r.link?.planVersion, 1);
  // Sau khi B2 có hiệu lực, nạp lại B1 bị chặn, và B2 cần xác nhận đọc.
  const after = { plans: [A1, { ...B1, status: 'ended' as const }, B2], wounds, patients, devices };
  assert.match(loadBlocker(after, meP, { patientId: 'P', woundId: 'B', planId: 'B1', deviceId: 'D1' })!, /không còn đợt|đã áp dụng phiên bản 2/);
  assert.match(loadBlocker(after, meP, { patientId: 'P', woundId: 'B', planId: 'B2', deviceId: 'D1' })!, /chưa xác nhận đã đọc phiên bản 2/);
}

// T05. Liên kết phiên với lần nạp: không có lần nạp, lần gửi sau chưa có xác nhận, lệch vết đều không gắn vết nào.
{
  const base = { plans: [A1, B1], patientId: 'P', deviceId: 'D1', startedAt: at(TODAY, '09:00') };
  assert.equal(resolveSessionLink({ ...base, links: [] }).issue, 'no_load', 'T05: chưa nạp');
  assert.equal(resolveSessionLink({ ...base, links: [link({ id: 'l1' }), link({ id: 'l2', at: at(TODAY, '08:58'), result: 'timeout' })] }).issue, 'uncertain_load', 'T05: lần gửi sau chưa có ACK');
  assert.equal(resolveSessionLink({ ...base, woundId: 'A', links: [link({ id: 'l1' })] }).issue, 'wound_mismatch', 'T05: màn theo dõi mở vết A nhưng máy giữ B1');
  // Lần nạp của máy khác hoặc của người khác không được dùng.
  assert.equal(resolveSessionLink({ ...base, links: [link({ id: 'l1', deviceId: 'D2' })] }).issue, 'no_load');
  assert.equal(resolveSessionLink({ ...base, links: [link({ id: 'l1', patientId: 'Q' })] }).issue, 'no_load');
  // Lần nạp sau giờ bắt đầu phiên không được dùng.
  assert.equal(resolveSessionLink({ ...base, links: [link({ id: 'l1', at: at(TODAY, '09:05') })] }).issue, 'no_load');
}

// T06. Tiến độ chỉ tính phiên gắn đúng vết; phiên B không làm thay đổi A; phiên chưa gắn vết không tính cho vết nào (bỏ "!s.woundId ||").
{
  const sessions = [S({ sessionId: 'sB', woundId: 'B', planId: 'B1', protocolId: 'prB', patientId: 'P' }), S({ sessionId: 'sX', start: at(TODAY, '10:00'), patientId: 'P' })];
  const prA = courseProgress(A1, sessionsForWound(sessions, 'A'), TODAY, null);
  const prB = courseProgress(B1, sessionsForWound(sessions, 'B'), TODAY, null);
  assert.equal(prA.done, 0, 'T06: A không đổi khi điều trị B');
  assert.equal(prB.done, 1, 'T06: B ghi một buổi');
  assert.deepEqual(unlinkedSessions(sessions).map((s) => s.sessionId), ['sX'], 'T06: phiên chưa gắn vết giữ để đối soát');
  const slotsA = protocolSlots({ versions: [A1], sessions, changes: [], today: TODAY });
  assert.equal(slotsA.find((s) => s.date === TODAY)!.status, 'due_today', 'T06: lịch A hôm nay vẫn đến hạn');
  const slotsB = protocolSlots({ versions: [B1], sessions, changes: [], today: TODAY });
  assert.equal(slotsB.find((s) => s.date === TODAY)!.status, 'completed', 'T06: lịch B hôm nay hoàn thành');
}

// T07. Lịch sử theo bệnh nhân: P trả D1, nhận D2 vẫn thấy phiên cũ trên D1; D1 giao cho Q thì Q không thấy phiên của P.
{
  const ev = [
    { deviceId: 'D1', at: at('2026-11-20', '07:00'), kind: 'assign' as const, patientId: 'P' },
    { deviceId: 'D1', at: at('2026-11-24', '07:00'), kind: 'return' as const, patientId: 'P' },
    { deviceId: 'D2', at: at('2026-11-24', '08:00'), kind: 'assign' as const, patientId: 'P' },
    { deviceId: 'D1', at: at('2026-11-25', '07:00'), kind: 'assign' as const, patientId: 'Q' },
  ];
  const ctx = { devices: [{ id: 'D1', patientId: 'Q' }, { id: 'D2', patientId: 'P' }], deviceEvents: ev };
  const sessions = [
    S({ sessionId: 'old-P', deviceId: 'D1', start: at('2026-11-22', '09:00'), woundId: 'B' }), // bản ghi cũ chưa có patientId
    S({ sessionId: 'new-P', deviceId: 'D2', start: at('2026-11-26', '09:00'), woundId: 'B', patientId: 'P' }),
    S({ sessionId: 'Q-1', deviceId: 'D1', start: at('2026-11-26', '10:00'), patientId: 'Q' }),
  ];
  assert.equal(sessionOwner(sessions[0], ctx), 'P', 'T07: phiên cũ suy chủ theo lịch sử giao máy');
  assert.deepEqual(sessionsOfPatient(sessions, 'P', ctx).map((s) => s.sessionId), ['new-P', 'old-P'], 'T07: P thấy cả phiên D1 và D2');
  assert.deepEqual(sessionsOfPatient(sessions, 'Q', ctx).map((s) => s.sessionId), ['Q-1'], 'T07: Q không thấy phiên của P trên D1');
  // Máy không có nhật ký giao và không rõ ngày giao: không gán phiên cũ cho người đang giữ máy.
  assert.equal(sessionOwner(S({ deviceId: 'D9' }), { devices: [{ id: 'D9', patientId: 'Q' }] }), undefined);
}

// T08. Phân biệt hoàn thành, dừng, mất cáp, chưa đồng bộ; "Chưa đủ dữ liệu" thay cho "Đã bỏ lỡ" khi chưa đối soát.
{
  assert.equal(reconciledThrough(), null, 'T08: chưa có nguồn đối soát đầy đủ');
  assert.equal(sessionResultLabel(S({ status: 'completed', endState: 'done' })), 'Hoàn thành');
  assert.equal(sessionResultLabel(S({ status: 'interrupted', endState: 'stopped' })), 'Bị gián đoạn');
  assert.equal(sessionResultLabel(S({ status: 'interrupted', endState: 'error' })), 'Thất bại');
  assert.match(sessionResultLabel(S({ status: 'unknown' })), /Chưa đủ dữ liệu/, 'T08: mất cáp hoặc rời màn');
  assert.equal(syncText(S({ source: 'device' }), 'patient'), 'Đã lưu trên điện thoại, chưa đồng bộ máy chủ', 'T08: không giả đồng bộ');
  assert.equal(syncText(S({ source: 'device' }), 'doctor'), 'Chỉ có trên máy này, chưa qua máy chủ');
  const yesterday = '2026-11-26';
  const slots = protocolSlots({ versions: [B1], sessions: [S({ woundId: 'B', protocolId: 'prB', status: 'unknown', start: at(yesterday, '09:00') })], changes: [], today: TODAY });
  assert.equal(slots.find((s) => s.date === yesterday)!.status, 'no_data', 'T08: phiên không rõ kết quả');
  assert.equal(slots.find((s) => s.date === '2026-11-25')!.status, 'no_data', 'T08: ngày qua không có bản ghi không phải bỏ lỡ');
  const pr = courseProgress(B1, [], TODAY, null);
  assert.equal(pr.missed, 0, 'T08: không đếm bỏ lỡ khi chưa đối soát');
  assert.ok(pr.noData > 0);
}

// T09. Bỏ trùng bản ghi gửi lại cùng mã phiên.
{
  const list = [S({ sessionId: 'dup', patientId: 'P' }), S({ sessionId: 'dup', patientId: 'P' }), S({ sessionId: 'other', patientId: 'P' })];
  assert.equal(dedupeSessions(list).length, 2, 'T09');
  assert.equal(sessionsOfPatient(list, 'P', { devices: [] }).length, 2, 'T09: lịch sử không đếm trùng');
}

// T10. Ảnh bệnh nhân xem: chỉ ảnh bác sĩ duyệt cho xem; tách khỏi xác nhận nhãn và đồng ý nghiên cứu.
{
  const im = (x: object) => ({ id: 'i', woundId: 'B', captureDate: '2026-11-20', status: 'labeled', ...x }) as never;
  const imgs = [
    im({ id: 'shared', sharedWithPatientAt: at('2026-11-21', '09:00') }),
    im({ id: 'label-only', label: { confirmedAt: at('2026-11-21', '09:00') } }),
    im({ id: 'excluded', status: 'excluded', sharedWithPatientAt: at('2026-11-21', '09:00') }),
    im({ id: 'other-wound', woundId: 'A', sharedWithPatientAt: at('2026-11-21', '09:00') }),
  ];
  assert.deepEqual(patientImagesOf(imgs, 'B').map((i: { id: string }) => i.id), ['shared'], 'T10: chỉ ảnh đã duyệt, cùng vết');
  assert.equal(patientCanSeeImage(imgs[1]), false, 'T10: nhãn đã xác nhận không có nghĩa bệnh nhân được xem');
  assert.equal(patientCanSeeImage(imgs[2]), false, 'T10: ảnh Không sử dụng không hiện');
}

// T11. Đánh giá đã công bố có ngày; chưa có thì đúng câu "Chưa có đánh giá của bác sĩ". Báo cáo đến đúng người.
{
  const ev = (x: object) => ({ id: 'e', woundId: 'B', date: '2026-11-20', visibleToPatient: true, ...x }) as never;
  const list = [ev({ id: 'e1' }), ev({ id: 'e2', date: '2026-11-25' }), ev({ id: 'hidden', date: '2026-11-26', visibleToPatient: false })];
  assert.deepEqual(publishedEvaluations(list, 'B').map((e: { id: string }) => e.id), ['e2', 'e1'], 'T11: đã công bố, mới trước');
  assert.deepEqual(publishedEvaluations(list, 'A'), []);
  assert.equal(NO_DOCTOR_EVALUATION, 'Chưa có đánh giá của bác sĩ');
  const reports = [{ id: 'r1', patientId: 'P', kind: 'symptom' as const }, { id: 'r2', patientId: 'P', kind: 'device' as const }, { id: 'r3', patientId: 'Q', kind: 'symptom' as const }];
  const acc = (x: object) => ({ id: 'u', name: 'u', role: 'doctor', locked: false, ...x }) as never;
  const d = { reports, patients };
  assert.deepEqual(reportsVisibleTo(acc({ role: 'patient', patientId: 'P' }), d).map((r) => r.id), ['r1', 'r2'], 'T11: bệnh nhân thấy báo cáo của mình');
  assert.deepEqual(reportsVisibleTo(acc({ id: 'bs-1' }), d).map((r) => r.id), ['r1', 'r2'], 'T11: bác sĩ phụ trách thấy vết và thiết bị');
  assert.deepEqual(reportsVisibleTo(acc({ id: 'bs-3' }), d).map((r) => r.id), [], 'T11: bác sĩ khác không thấy');
  assert.deepEqual(reportsVisibleTo(acc({ role: 'admin' }), d).map((r) => r.id), ['r2'], 'T11: quản trị chỉ thấy sự cố thiết bị');
}

// T12. Ngày Việt Nam (UTC+7) ở hai phía nửa đêm, không theo múi giờ máy chạy.
{
  assert.equal(localDay(at('2026-11-27', '23:59')), '2026-11-27', 'T12: 23:59 giờ Việt Nam vẫn là ngày 27');
  assert.equal(localDay(at('2026-11-28', '00:01')), '2026-11-28', 'T12: 00:01 giờ Việt Nam là ngày 28');
  const late = S({ woundId: 'B', protocolId: 'prB', start: at('2026-11-27', '23:59') });
  const early = S({ sessionId: 's2', woundId: 'B', protocolId: 'prB', start: at('2026-11-28', '00:01') });
  const slots = protocolSlots({ versions: [B1], sessions: [late, early], changes: [], today: '2026-11-28' });
  assert.equal(slots.find((s) => s.date === '2026-11-27')!.sessions.length, 1, 'T12: phiên 23:59 thuộc ngày 27');
  assert.equal(slots.find((s) => s.date === '2026-11-28')!.sessions.length, 1, 'T12: phiên 00:01 thuộc ngày 28');
}

console.log('patientRoleLogic.test: đạt (T01 đến T12)');
