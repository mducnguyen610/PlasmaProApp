import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AdherenceCalendar, SessionNoteForm } from '@/components/AdherenceCalendar';
import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { View } from 'react-native';
import { DateTile } from '@/components/items';
import { Card, Disclosure, Divider, Empty, Header, LinkRow, Muted, Notice, Ring, Screen, SectionTitle } from '@/components/ui';
import { courseProgress, courseStatus, fmtDuration, followUpDates, localDay, phasesOf } from '@/lib/course';
import { fmtDate, fmtDateTime, PLAN_STATUS } from '@/lib/format';
import { computeReminders } from '@/lib/reminders';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

export default function Schedule() {
  const { data, me } = useStore();
  const { patient, sessionsOf, woundsOf, coursePlan } = useLookups();
  // Đợt 11 (UX-19): T02 và mục "Các buổi điều trị gần đây" ở Lịch sử mở màn này kèm mã phiên để ghi cảm giác ngay, không phải tìm trong lịch tháng.
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const [noteFor, setNoteFor] = useState<string | null>(sessionId ?? null);
  const [noteSaved, setNoteSaved] = useState(false);
  const today = localDay(new Date());
  const p = patient(me?.patientId);
  // Màn nằm ngoài nhóm tab bệnh nhân nên tự chặn vai trò khác.
  if (me?.role !== 'patient' || !p) return <NoAccess />;
  const reminders = computeReminders(data, p.id, today);
  const dev = data.devices.find(d => d.id === p.deviceId);
  // Đợt đang áp dụng; nếu không có thì đợt gần nhất (đã dừng hoặc kết thúc) để vẫn xem lại được lịch đã làm.
  const courses = woundsOf(p.id).map((w) => ({ w, plan: coursePlan(w.id, { patientView: true }) })).filter((c) => c.plan);
  const course = courses.find((c) => c.plan!.status === 'active') ?? courses[0];
  const plan = course?.plan;
  const pr = plan && dev ? courseProgress(plan, sessionsOf(dev.id).filter((s) => !s.woundId || s.woundId === course!.w.id), today, (dev.lastSync ? localDay(dev.lastSync) : null)) : null;
  const phases = plan ? phasesOf(plan) : [];
  const ph = pr && pr.phaseIndex >= 0 ? phases[pr.phaseIndex] : undefined;
  const st = pr ? courseStatus(pr, fmtDate) : null;
  // Chỉ mở biểu mẫu cho phiên thuộc máy của bệnh nhân đang đăng nhập.
  const noteSession = noteFor && dev ? sessionsOf(dev.id).find((s) => s.sessionId === noteFor) : undefined;
  // P2-04 (R2-04): các mốc đã qua lấy từ ngày đã lưu (ngày tái đánh giá trong đánh giá đã công bố, mốc kiểm tra sau khi liền).
  // Chỉ hiển thị; ứng dụng không có dữ liệu "đã đi khám" nên không đánh dấu đã/chưa.
  const myWounds = woundsOf(p.id);
  const past = [
    ...data.evaluations
      .filter((e) => e.visibleToPatient && e.nextReview && e.nextReview < today && myWounds.some((w) => w.id === e.woundId))
      .map((e) => ({ id: 'rv-' + e.id, date: e.nextReview!, title: `Tái đánh giá với bác sĩ ${myWounds.find((w) => w.id === e.woundId)!.code}` })),
    ...myWounds.filter((w) => w.followUpFrom).flatMap((w) => followUpDates(w.followUpFrom!).filter((x) => x.date < today)
      .map((x) => ({ id: `fu-${w.id}-${x.days}`, date: x.date, title: `Kiểm tra sau điều trị ${w.code} (${x.days} ngày sau khi liền)` }))),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
  return <Screen header={<Header back title="Lịch trình của tôi" />}>
    {noteSession && (
      <Card>
        <Text accessibilityRole="header" style={{ fontSize: T.cardTitle, fontWeight: '700', color: C.text }}>Ghi cảm giác buổi điều trị</Text>
        <Muted>{`Buổi lúc ${fmtDateTime(noteSession.start)}, ${noteSession.durationMin} phút. Bác sĩ xem được ghi chú này.`}</Muted>
        <SessionNoteForm sessionId={noteSession.sessionId} onDone={(saved) => { setNoteFor(null); setNoteSaved(saved); }} />
      </Card>
    )}
    {noteSaved && <Notice tone="green" icon="checkmark-circle-outline">Đã lưu cảm giác của buổi điều trị. Có thể sửa lại trong lịch tháng bên dưới.</Notice>}
    {/* Bản rút gọn (08/11/2026): lịch tháng là điểm neo, nằm ngay dưới một dòng tóm tắt đợt.
        Giai đoạn, liều và ghi chú thu vào mục "Liệu trình". */}
    <Card hero>
      {plan ? <>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
          {pr && <Ring size={88} value={pr.done} max={pr.total} label={`${pr.done}/${pr.total}`} sub="đã xong" />}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.textSoft, fontSize: T.small, fontWeight: '600' }}>{plan.status === 'active' ? `Đợt điều trị ${course!.w.code}` : `Đợt ${PLAN_STATUS[plan.status].label.toLowerCase()}, vết thương ${course!.w.code}`}</Text>
            {plan.status === 'active' && st ? <>
              <Text style={{ fontSize: T.cardTitle, fontWeight: '700', color: C.text }}>{st.title}</Text>
              <Muted>{st.detail}</Muted>
            </> : <Muted>Lịch dưới đây để xem lại.</Muted>}
          </View>
        </View>
        {/* P2-04 (R2-04): ghi chú của bác sĩ về đợt luôn hiện ngay, nguyên văn, không sửa. */}
        {plan.notes ? <View style={{ gap: 4 }}>
          <Text style={{ color: C.textSoft, fontSize: T.small, fontWeight: '600' }}>Ghi chú của bác sĩ về đợt</Text>
          <Notice icon="information-circle-outline">{plan.notes}</Notice>
        </View> : null}
        {/* Giai đoạn 5 giao diện theo tác vụ: liều và các giai đoạn là thông tin tham khảo, chuyển sang màn "Đợt điều trị của tôi" (N06)
            của đúng vết này (S-12, trước đây bệnh nhân không có lối vào N06). Nội dung N06 đọc cùng đợt bác sĩ đã xác nhận. */}
        <Divider />
        <LinkRow testID="loi-vao-n06" icon="flash-outline" tone="violet" title="Liều và các giai đoạn"
          sub={`${ph ? `Giai đoạn ${pr!.phaseIndex + 1} trên ${phases.length}` : `${phases.length} giai đoạn`} · ${plan.doseLevel != null ? `mức ${plan.doseLevel}` : 'mức chưa đặt'}${plan.durationSec != null ? `, ${fmtDuration(plan.durationSec)} mỗi lần` : ''}`}
          accessibilityLabel={`Liều và các giai đoạn của đợt ${course!.w.code}. Mở màn Đợt điều trị của tôi`}
          onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: course!.w.id } })} />
      </> : <Muted>Chưa có đợt điều trị được bác sĩ xác nhận.</Muted>}
    </Card>
    {dev
      ? <AdherenceCalendar sessions={sessionsOf(dev.id)} plan={plan} lastSyncDay={(dev.lastSync ? localDay(dev.lastSync) : null)} reminders={reminders} canEdit />
      : <Empty icon="hardware-chip-outline" text="Chưa được gán thiết bị." />}
    {/* P2-04 (R2-04): ngày ở đây do ứng dụng tính từ lịch bác sĩ đặt (computeReminders), không phải lịch hẹn đã đặt chỗ. */}
    <SectionTitle>Mốc dự kiến</SectionTitle>
    <Muted>Ngày do ứng dụng tính từ lịch bác sĩ đặt. Hãy xác nhận với bác sĩ.</Muted>
    {reminders.some(r => r.date >= today) ? <Card>
      {reminders.filter(r => r.date >= today).slice(0, 5).map((r, i) => (
        <View key={r.id} accessible accessibilityLabel={`${fmtDate(r.date)}: ${r.title}. ${r.body}`} style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }]}>
          <DateTile date={r.date} today={today} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '600' }}>{r.title}</Text>
            <Text style={{ color: C.textSoft, fontSize: T.small }}>{r.body}</Text>
          </View>
        </View>
      ))}
    </Card> : <Muted>Chưa có mốc dự kiến.</Muted>}
    {past.length > 0 && (
      <Card>
        <Disclosure icon="time-outline" title="Mốc đã qua" summary={`${past.length} mốc gần nhất`}>
          {past.map((x, i) => (
            <View key={x.id} accessible accessibilityLabel={`${fmtDate(x.date)}: ${x.title}`} style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }]}>
              <DateTile date={x.date} today={today} />
              <Text style={{ flex: 1, color: C.text }}>{x.title}</Text>
            </View>
          ))}
          <Muted>Ứng dụng chỉ ghi ngày dự kiến, không ghi đã khám hay chưa.</Muted>
        </Disclosure>
      </Card>
    )}
  </Screen>;
}
