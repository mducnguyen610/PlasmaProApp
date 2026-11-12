import { AdherenceCalendar } from '@/components/AdherenceCalendar';
import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { View } from 'react-native';
import { DateTile } from '@/components/items';
import { Card, Disclosure, Empty, Header, Muted, Notice, Ring, Screen, SectionTitle } from '@/components/ui';
import { DoseRows, PhaseList } from '@/components/CourseCard';
import { courseProgress, courseStatus, localDay, phasesOf } from '@/lib/course';
import { fmtDate, PLAN_STATUS } from '@/lib/format';
import { computeReminders } from '@/lib/reminders';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

export default function Schedule() {
  const { data, me } = useStore();
  const { patient, sessionsOf, woundsOf, coursePlan } = useLookups();
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
  return <Screen header={<Header back title="Lịch trình của tôi" />}>
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
        {/* Liều luôn hiện thành dòng có nhãn (rà soát thiết kế 12/11/2026), không nén vào một chuỗi nối dấu chấm giữa. */}
        <DoseRows plan={plan} />
        <Disclosure icon="options-outline" title="Các giai đoạn" summary={ph ? `Đang ở giai đoạn ${pr!.phaseIndex + 1} trên ${phases.length}` : `${phases.length} giai đoạn`}>
          <PhaseList plan={plan} current={pr?.phaseIndex} />
          {plan.notes ? <Notice icon="information-circle-outline">{plan.notes}</Notice> : null}
        </Disclosure>
      </> : <Muted>Chưa có đợt điều trị được bác sĩ xác nhận.</Muted>}
    </Card>
    {dev
      ? <AdherenceCalendar sessions={sessionsOf(dev.id)} plan={plan} lastSyncDay={(dev.lastSync ? localDay(dev.lastSync) : null)} reminders={reminders} canEdit />
      : <Empty icon="hardware-chip-outline" text="Chưa được gán thiết bị." />}
    <SectionTitle>Lịch hẹn sắp tới</SectionTitle>
    {reminders.some(r => r.date >= today) ? <Card>
      {reminders.filter(r => r.date >= today).slice(0, 5).map((r, i) => (
        <View key={r.id} accessible accessibilityLabel={`${fmtDate(r.date)}: ${r.title}. ${r.body}`} style={[{ flexDirection: 'row', alignItems: 'center', gap: 14 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12 }]}>
          <DateTile date={r.date} today={today} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ color: C.text, fontWeight: '600' }}>{r.title}</Text>
            <Text style={{ color: C.textSoft, fontSize: T.small }} numberOfLines={1}>{r.body}</Text>
          </View>
        </View>
      ))}
    </Card> : <Muted>Chưa có lịch hẹn.</Muted>}
  </Screen>;
}
