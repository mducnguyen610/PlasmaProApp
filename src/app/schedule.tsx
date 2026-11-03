import { router } from 'expo-router';
import { AdherenceCalendar } from '@/components/AdherenceCalendar';
import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Empty, Header, InfoRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { computeReminders } from '@/lib/reminders';
import { useLookups, useStore } from '@/lib/store';

const localDay = (d: Date) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
export default function Schedule() {
  const { data, me } = useStore();
  const { patient, sessionsOf } = useLookups();
  const today = localDay(new Date());
  const p = patient(me?.patientId);
  // Màn nằm ngoài nhóm tab bệnh nhân nên tự chặn vai trò khác.
  if (me?.role !== 'patient' || !p) return <NoAccess />;
  const plans = data.plans.filter(x => x.patientId === p.id && x.confirmed && x.status === 'active').sort((a,b) => b.version-a.version);
  const plan = plans[0];
  const reminders = computeReminders(data, p.id, today);
  const dev = data.devices.find(d => d.id === p.deviceId);
  return <Screen header={<Header back title="Lịch trình của tôi" subtitle="Theo liệu trình bác sĩ đã xác nhận" />}>
    {/* Một lịch duy nhất cho bệnh nhân: liệu trình, số lần mỗi ngày, mức đau theo phiên và lịch hẹn. */}
    <Card hero>
      {plan ? <>
        <Chip label="Liệu trình đang áp dụng" tone="blue" />
        <Text style={{ fontSize: 22, fontWeight: '700' }}>{plan.sessionsPerDay ?? '—'} lần / ngày</Text>
        <Muted>Hai lần cách nhau ít nhất {plan.minIntervalMin ?? '—'} phút · {fmtDate(plan.startDate)} đến {fmtDate(plan.endDate)}</Muted>
        {plan.notes ? <Muted>{plan.notes}</Muted> : null}
      </> : <Muted>Chưa có liệu trình được bác sĩ xác nhận.</Muted>}
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
