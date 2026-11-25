/**
 * Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 4.1, 4.3, 5; M22, M23, M29, M31, M32, M34, M35): thẻ Phác đồ ở trang vết thương
 * của bác sĩ. Từ trên xuống: phác đồ đang hoạt động (Gia hạn, Tạm dừng hoặc Tiếp tục, Kết thúc sớm, Xem chi tiết), lịch điều trị
 * (phiên dự kiến với 9 trạng thái, hoãn hoặc hủy phiên chưa diễn ra), lịch sử phác đồ (chỉ xem), nút "+ Tạo phác đồ mới".
 * Không gửi lệnh nào xuống thiết bị (kết thúc, tạm dừng, hoãn, hủy chỉ đổi dữ liệu trong ứng dụng).
 */
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Sheet } from '@/components/Sheet';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Disclosure, Field, InfoRow, Muted, Notice, SectionTitle, TextLink } from '@/components/ui';
import { fmtDuration, localDay, phaseLabel, phasesOf } from '@/lib/course';
import { modeLabel } from '@/lib/device/capabilities';
import { notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, maskDateInput, PLAN_STATUS } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { extendBlocker, protocolsOfWound, versionStatusLabel, type ProtocolView } from '@/lib/planLifecycle';
import { protocolSlots, slotChangeBlocker, SLOT_STATUS, type Slot } from '@/lib/sessionSchedule';
import { useLookups, useStore } from '@/lib/store';
import type { Patient, TreatmentPlan, Wound } from '@/lib/types';
import { C, numeric, T } from '@/theme';

export const fromVnDate = (s: string) => {
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};

const PLAN_TONE: Record<TreatmentPlan['status'], 'green' | 'amber' | 'gray' | 'blue'> = { active: 'green', paused: 'amber', ended: 'gray', draft: 'gray', scheduled: 'blue' };

/** Tóm tắt thông số và lịch của một phiên bản (một dòng mỗi ý). */
export function planSummaryLines(v: TreatmentPlan): string[] {
  const params = [v.treatmentMode ? `Chế độ ${modeLabel(v.treatmentMode)}` : null, v.doseLevel != null ? `mức ${v.doseLevel}` : null, v.durationSec != null ? `${fmtDuration(v.durationSec)} mỗi lần` : null].filter(Boolean).join(', ');
  const sched = phasesOf(v).map(phaseLabel).join(', sau đó ');
  return [params || 'Chưa đặt thông số', `${sched}${v.sessionsPerDay && v.sessionsPerDay > 1 ? `, ${v.sessionsPerDay} lần mỗi buổi` : ''}`, v.timeWindow ? `Khung giờ ${v.timeWindow.from} đến ${v.timeWindow.to}` : 'Chưa đặt khung giờ'];
}

/** Phiên của vết: phiên ghi vết này, hoặc phiên cũ không ghi vết của máy bệnh nhân đang giữ. */
export function woundSessions(sessions: { woundId?: string; deviceId: string }[], w: Wound, p: Patient) {
  return sessions.filter((s) => (s.woundId ? s.woundId === w.id : s.deviceId === p.deviceId));
}

type Ask = { kind: 'extend' | 'pause' | 'end' | 'endThenNew'; view: ProtocolView } | { kind: 'slot'; view: ProtocolView; slot: Slot; change: 'postpone' | 'cancel' };

export function ProtocolTab({ patient: p, wound: w, canEdit }: { patient: Patient; wound: Wound; canEdit: boolean }) {
  const { data, extendPlan, setPlanPaused, endPlan, changeSessionSlot } = useStore();
  const { account, imagesOf } = useLookups();
  const today = localDay();
  const views = protocolsOfWound(data.plans, p.id, w.id);
  const openView = views.find((v) => v.open);
  const history = views.filter((v) => v !== openView);
  const [ask, setAsk] = useState<Ask | null>(null);
  const [reason, setReason] = useState('');
  const [date, setDate] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const busy = useRef(false);
  const [working, setWorking] = useState(false);
  const sessions = woundSessions(data.sessions, w, p) as typeof data.sessions;
  const slotsOf = (v: ProtocolView) => protocolSlots({
    versions: v.versions, sessions, changes: data.sessionChanges ?? [], live: data.liveSessions, today,
    nextProtocolStart: views.map((x) => x.startDate).filter((d) => d > v.startDate).sort()[0],
  });
  const openNew = () => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } });
  const close = () => { setAsk(null); setReason(''); setDate(''); setErr(null); };
  const run = async (op: () => Promise<void>, done: string, after?: () => void) => {
    if (busy.current) return;
    busy.current = true; setWorking(true);
    try { await op(); close(); notify(done, ''); after?.(); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { busy.current = false; setWorking(false); }
  };
  const submit = () => {
    if (!ask) return;
    if (ask.kind === 'extend') {
      const toEnd = fromVnDate(date);
      const why = extendBlocker(ask.view.current, toEnd, reason);
      if (why) return setErr(why);
      return run(() => extendPlan(ask.view.protocolId, toEnd!, reason), 'Đã gia hạn', undefined);
    }
    if (ask.kind === 'pause') {
      const paused = ask.view.current.status === 'active';
      if (!reason.trim()) return setErr(paused ? 'Nhập lý do tạm dừng.' : 'Nhập lý do tiếp tục.');
      return run(() => setPlanPaused(ask.view.current.id, paused, reason), paused ? 'Đã tạm dừng phác đồ' : 'Đã tiếp tục phác đồ');
    }
    if (ask.kind === 'end' || ask.kind === 'endThenNew') {
      if (!reason.trim()) return setErr('Nhập lý do kết thúc phác đồ.');
      return run(() => endPlan(ask.view.protocolId, reason), 'Đã kết thúc phác đồ', ask.kind === 'endThenNew' ? openNew : undefined);
    }
    if (ask.kind !== 'slot') return;
    const newDate = ask.change === 'postpone' ? fromVnDate(date) : null;
    const why = slotChangeBlocker(ask.slot, ask.change, reason, newDate, today);
    if (why) return setErr(why);
    return run(() => changeSessionSlot({ protocolId: ask.view.protocolId, date: ask.slot.date, kind: ask.change, newDate: newDate ?? undefined, reason }), ask.change === 'postpone' ? 'Đã hoãn phiên' : 'Đã hủy phiên');
  };

  // M23: vết chưa từng có phác đồ: tổng quan, hướng dẫn quy trình và nút tạo.
  if (views.length === 0) {
    const imgs = imagesOf(w.id);
    const measured = imgs.filter((i) => i.status === 'labeled' && i.areaCm2 !== null).sort((a, b) => a.captureDate.localeCompare(b.captureDate)).pop();
    return (
      <View testID="phac-do-trong" style={{ gap: 12 }}>
        <Card>
          <SectionTitle icon="information-circle-outline">Tổng quan</SectionTitle>
          <InfoRow label="Diện tích mới nhất" value={measured ? `${formatAreaDisplay(measured.areaCm2)} · ${fmtDate(measured.captureDate)}` : 'Chưa có số đo'} />
          <InfoRow label="Số ảnh" value={String(imgs.length)} />
          <Muted>Vết thương này chưa có phác đồ điều trị.</Muted>
        </Card>
        <Card>
          <SectionTitle icon="list-outline">Quy trình tạo phác đồ</SectionTitle>
          {['Chụp ảnh căn cứ của vết trong ngày, chất lượng Đạt.', 'Đặt thông số, lịch và khung giờ thực hiện.', 'Bệnh nhân xác nhận đã đọc phác đồ trước phiên đầu tiên.'].map((t, i) => (
            <View key={t} style={{ flexDirection: 'row', gap: 10 }}>
              <Text style={[{ color: C.primary, fontWeight: '700' }, numeric]}>{i + 1}.</Text>
              <Text style={{ flex: 1, color: C.text }}>{t}</Text>
            </View>
          ))}
        </Card>
        {canEdit && <Button label="Tạo phác đồ mới" icon="add" onPress={openNew} />}
      </View>
    );
  }

  const cur = openView?.current;
  const slots = openView ? slotsOf(openView) : [];
  const isLive = !!cur && (cur.status === 'active' || cur.status === 'paused');
  return (
    <View style={{ gap: 12 }}>
      {openView && cur ? (
        <Card testID="phac-do-dang-hoat-dong">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontWeight: '700', fontSize: T.cardTitle, color: C.text }}>{openView.title}</Text>
            <Chip label={PLAN_STATUS[cur.status].label} tone={PLAN_TONE[cur.status]} />
          </View>
          <InfoRow label="Ngày bắt đầu" value={fmtDate(openView.startDate)} />
          <InfoRow label="Ngày kết thúc dự kiến" value={fmtDate(cur.endDate)} />
          {planSummaryLines(cur).map((l) => <Muted key={l}>{l}</Muted>)}
          {openView.pending && <Notice tone="blue" icon="time-outline">{`Phiên bản ${openView.pending.version} chờ áp dụng từ ${fmtDate(openView.pending.effectiveFrom)}.`}</Notice>}
          <View style={{ gap: 8 }}>
            {canEdit && isLive && (
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <View style={{ flex: 1 }}><Button label="Gia hạn" icon="calendar-outline" variant="secondary" onPress={() => setAsk({ kind: 'extend', view: openView })} /></View>
                <View style={{ flex: 1 }}><Button label={cur.status === 'active' ? 'Tạm dừng' : 'Tiếp tục'} icon={cur.status === 'active' ? 'pause-outline' : 'play-outline'} variant="secondary" onPress={() => setAsk({ kind: 'pause', view: openView })} /></View>
              </View>
            )}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {canEdit && <View style={{ flex: 1 }}><Button label="Kết thúc sớm" icon="stop-circle-outline" variant="danger" onPress={() => setAsk({ kind: 'end', view: openView })} /></View>}
              <View style={{ flex: 1 }}><Button label="Xem chi tiết" icon="document-text-outline" variant="secondary" onPress={() => router.push({ pathname: '/plan-detail/[protocolId]', params: { protocolId: openView.protocolId } })} /></View>
            </View>
          </View>
        </Card>
      ) : <Card><Muted>Không có phác đồ đang hoạt động.</Muted></Card>}

      {openView && (
        <Card testID="lich-dieu-tri">
          <SectionTitle icon="calendar-outline" caption="Phiên dự kiến tự sinh theo lịch của phác đồ. Đang thực hiện chỉ khi máy báo đã bắt đầu.">Lịch điều trị</SectionTitle>
          <SlotList slots={slots} plan={cur} canChange={canEdit && isLive} onChange={(slot, change) => setAsk({ kind: 'slot', view: openView, slot, change })} />
        </Card>
      )}

      <Card testID="lich-su-phac-do">
        <SectionTitle icon="time-outline">Lịch sử phác đồ</SectionTitle>
        {history.length === 0 && <Muted>Chưa có phác đồ trước.</Muted>}
        {history.map((v) => {
          const last = v.versions[v.versions.length - 1];
          const label = versionStatusLabel(last) ?? PLAN_STATUS[v.current.status].label;
          return (
            <Disclosure key={v.protocolId} title={`${v.title}`} summary={`${fmtDate(v.startDate)} đến ${fmtDate(v.endDate)} · ${label} · ${account(v.createdBy)?.name ?? 'Không rõ người tạo'}`}>
              <View style={{ gap: 6, paddingBottom: 8 }}>
                {planSummaryLines(v.current).map((l) => <Muted key={l}>{l}</Muted>)}
                <SlotList slots={slotsOf(v)} plan={v.current} canChange={false} onChange={() => {}} />
                <TextLink label="Xem chi tiết" onPress={() => router.push({ pathname: '/plan-detail/[protocolId]', params: { protocolId: v.protocolId } })} />
              </View>
            </Disclosure>
          );
        })}
      </Card>

      {canEdit && (
        <Button label="+ Tạo phác đồ mới" variant="secondary" onPress={() => (openView ? setAsk({ kind: 'endThenNew', view: openView }) : openNew())} />
      )}

      <Sheet visible={!!ask} onClose={close} testID="bang-phac-do"
        title={askTitle(ask)}>
        {ask?.kind === 'extend' && <Muted>{`Chỉ đổi ngày kết thúc (hiện là ${fmtDate(ask.view.current.endDate)}), không tạo phiên bản mới. Bệnh nhân phải xác nhận đã đọc ngày kết thúc mới; chưa xác nhận thì không chạy được phiên sau ngày kết thúc cũ.`}</Muted>}
        {ask?.kind === 'pause' && <Muted>{ask.view.current.status === 'active' ? 'Khi tạm dừng, các phiên sắp tới không chạy được. Ứng dụng không gửi lệnh dừng xuống máy.' : 'Bệnh nhân điều trị lại theo phiên bản đang áp dụng.'}</Muted>}
        {(ask?.kind === 'end' || ask?.kind === 'endThenNew') && <Muted>{ask.kind === 'endThenNew'
          ? `Mỗi vết chỉ có một phác đồ đang hoạt động. Kết thúc ${ask.view.title} rồi mở màn tạo phác đồ mới, nội dung sao chép từ phác đồ cũ.`
          : `${ask.view.title} chuyển xuống Lịch sử phác đồ. Lịch sử và phiên đã ghi giữ nguyên. Kết thúc phác đồ không tự dừng thiết bị.`}</Muted>}
        {ask?.kind === 'slot' && <Muted>{ask.change === 'postpone' ? 'Chuyển phiên sang ngày khác. Bệnh nhân chỉ thấy kết quả.' : 'Phiên không còn cần thực hiện. Phiên đã hủy vẫn giữ trong lịch.'}</Muted>}
        {(ask?.kind === 'extend' || (ask?.kind === 'slot' && ask.change === 'postpone')) && (
          <Field label={ask.kind === 'extend' ? 'Ngày kết thúc mới' : 'Ngày mới'} value={date} onChangeText={(v) => setDate(maskDateInput(v))} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/yyyy" />
        )}
        <Field label="Lý do" value={reason} onChangeText={setReason} placeholder="Bắt buộc" multiline />
        {err ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{err}</Text> : null}
        <Button label={askButton(ask)}
          variant={ask && (ask.kind === 'end' || ask.kind === 'endThenNew' || (ask.kind === 'slot' && ask.change === 'cancel')) ? 'danger' : 'primary'} loading={working} onPress={submit} />
      </Sheet>
    </View>
  );
}

function askTitle(ask: Ask | null): string {
  if (!ask) return '';
  if (ask.kind === 'slot') return `${ask.change === 'postpone' ? 'Hoãn' : 'Hủy'} phiên ${fmtDate(ask.slot.date)}`;
  if (ask.kind === 'pause') return ask.view.current.status === 'active' ? 'Tạm dừng phác đồ' : 'Tiếp tục phác đồ';
  return { extend: 'Gia hạn phác đồ', end: 'Kết thúc sớm phác đồ', endThenNew: 'Kết thúc phác đồ hiện tại' }[ask.kind];
}

function askButton(ask: Ask | null): string {
  if (!ask) return '';
  if (ask.kind === 'slot') return ask.change === 'postpone' ? 'Hoãn phiên' : 'Hủy phiên';
  if (ask.kind === 'pause') return ask.view.current.status === 'active' ? 'Tạm dừng' : 'Tiếp tục';
  return { extend: 'Gia hạn', end: 'Kết thúc sớm', endThenNew: 'Kết thúc và tạo mới' }[ask.kind];
}

const SLOT_TONE = { gray: 'gray', blue: 'blue', teal: 'teal', green: 'green', amber: 'amber', red: 'red', violet: 'violet' } as const;

/** Danh sách phiên dự kiến: ngày, giờ, chip trạng thái; phiên có dữ liệu máy mở chi tiết phiên (M28). */
export function SlotList({ slots, plan, canChange, onChange, limit = 14 }: { slots: Slot[]; plan?: TreatmentPlan; canChange: boolean; onChange: (s: Slot, kind: 'postpone' | 'cancel') => void; limit?: number }) {
  const [all, setAll] = useState(false);
  const today = localDay();
  // Mặc định: phiên quanh hôm nay (7 phiên trước, 7 phiên sau), mở hết bằng nút.
  const center = slots.findIndex((s) => s.date >= today);
  const start = Math.max(0, (center < 0 ? slots.length : center) - limit / 2);
  const shown = all ? slots : slots.slice(start, start + limit);
  if (!slots.length) return <Muted>Chưa có phiên dự kiến.</Muted>;
  return (
    <View style={{ gap: 2 }}>
      {shown.map((s) => {
        const st = SLOT_STATUS[s.status];
        const time = s.sessions[0] ? fmtDateTime(s.sessions[0].start).slice(-5) : plan?.timeWindow ? `${plan.timeWindow.from} đến ${plan.timeWindow.to}` : 'Chưa đặt giờ';
        const open = () => s.sessions[0] && router.push({ pathname: '/session-detail/[id]', params: { id: s.sessions[0].sessionId } });
        return (
          <View key={`${s.date}-${s.originDate ?? ''}`} testID={`phien-${s.date}`} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.divider, gap: 4 }}>
            <Pressable disabled={!s.sessions[0]} onPress={open} accessibilityRole={s.sessions[0] ? 'button' : undefined}
              accessibilityLabel={`Phiên ${fmtDate(s.date)}, ${time}, ${st.label}${s.originDate ? `, hoãn từ ${fmtDate(s.originDate)}` : ''}`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[{ color: C.text, fontWeight: '600' }, numeric]}>{fmtDate(s.date)}</Text>
                <Text style={[{ color: C.textSoft, fontSize: T.caption }, numeric]}>{time}{s.originDate ? ` · hoãn từ ${fmtDate(s.originDate)}` : ''}{s.extra ? ' · ngoài lịch' : ''}</Text>
                {s.change ? <Text style={{ color: C.textSoft, fontSize: T.caption }}>{`Lý do ${s.change.kind === 'postpone' ? `hoãn sang ${fmtDate(s.change.newDate)}` : 'hủy'}: ${s.change.reason}`}</Text> : null}
              </View>
              <Chip label={st.label} tone={SLOT_TONE[st.tone]} />
            </Pressable>
            {canChange && (s.status === 'upcoming' || s.status === 'due_today') && (
              <View style={{ flexDirection: 'row', gap: 16 }}>
                <TextLink label="Hoãn" accessibilityLabel={`Hoãn phiên ${fmtDate(s.date)}`} onPress={() => onChange(s, 'postpone')} />
                <TextLink label="Hủy" tone={C.red} accessibilityLabel={`Hủy phiên ${fmtDate(s.date)}`} onPress={() => onChange(s, 'cancel')} />
              </View>
            )}
          </View>
        );
      })}
      {slots.length > shown.length && <TextLink label={`Xem tất cả ${slots.length} phiên`} onPress={() => setAll(true)} />}
    </View>
  );
}
