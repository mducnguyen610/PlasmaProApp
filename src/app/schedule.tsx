import { router } from 'expo-router';
import { AdherenceCalendar } from '@/components/AdherenceCalendar';
import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Empty, Header, InfoRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { DoseRows, PhaseList } from '@/components/CourseCard';
import { courseProgress } from '@/lib/course';
import { fmtDate, PLAN_STATUS } from '@/lib/format';
import { computeReminders } from '@/lib/reminders';
import { useLookups, useStore } from '@/lib/store';

const localDay = (d: Date) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
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
  const pr = plan && dev ? courseProgress(plan, sessionsOf(dev.id).filter((s) => !s.woundId || s.woundId === course!.w.id), today, dev.lastSync?.slice(0, 10) ?? null) : null;
  return <Screen header={<Header back title="Lịch trình của tôi" subtitle="Theo đợt điều trị bác sĩ đã xác nhận" />}>
    {/* Một lịch duy nhất cho bệnh nhân: giai đoạn của đợt, ngày có buổi và ngày nghỉ, cảm giác theo phiên, lịch hẹn. */}
    <Card hero>
      {plan ? <>
        <Chip label={plan.status === 'active' ? `Đợt đang áp dụng · ${course!.w.code}` : `Đợt ${PLAN_STATUS[plan.status].label.toLowerCase()} · ${course!.w.code}`} tone={plan.status === 'active' ? 'blue' : 'gray'} />
        {pr && <Text style={{ fontSize: 22, fontWeight: '700' }}>Buổi {pr.done}/{pr.total}{pr.next && plan.status === 'active' ? ` · tiếp theo ${fmtDate(pr.next).slice(0, 5)}` : ''}</Text>}
        <PhaseList plan={plan} current={pr?.phaseIndex} />
        <DoseRows plan={plan} />
        {plan.notes ? <Muted>{plan.notes}</Muted> : null}
      </> : <Muted>Chưa có đợt điều trị được bác sĩ xác nhận.</Muted>}
    </Card>
    {dev
      ? <AdherenceCalendar sessions={sessionsOf(dev.id)} plan={plan} lastSyncDay={dev.lastSync?.slice(0, 10) ?? null} reminders={reminders} canEdit />
      : <Card><Empty icon="hardware-chip-outline" text="Chưa được gán thiết bị, nên chưa có nhật ký điều trị." /></Card>}
    <SectionTitle>Lịch hẹn sắp tới</SectionTitle>
    {reminders.filter(r => r.date >= today).slice(0, 5).map(r => <Card key={r.id}><InfoRow label={r.date === today ? 'Hôm nay' : fmtDate(r.date)} value={r.title} /><Muted>{r.body}</Muted></Card>)}
    {!reminders.some(r => r.date >= today) && <Muted>Chưa có lịch hẹn. Lịch được lấy từ liệu trình và đánh giá của bác sĩ.</Muted>}
    <Button label="Xem thiết bị" variant="secondary" icon="hardware-chip-outline" onPress={() => router.navigate('/patient/device')} />
  </Screen>;
}
