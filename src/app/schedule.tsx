import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView } from 'react-native';
import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Empty, Header, InfoRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { computeReminders } from '@/lib/reminders';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';

const localDay = (d: Date) => [d.getFullYear(), String(d.getMonth()+1).padStart(2,'0'), String(d.getDate()).padStart(2,'0')].join('-');
export default function Schedule() {
  const { data, me } = useStore();
  const { patient, sessionsOf } = useLookups();
  const today = localDay(new Date());
  const [selected, setSelected] = useState(today);
  const p = patient(me?.patientId);
  // Màn nằm ngoài nhóm tab bệnh nhân nên tự chặn vai trò khác.
  if (me?.role !== 'patient' || !p) return <NoAccess />;
  const plans = data.plans.filter(x => x.patientId === p.id && x.confirmed && x.status === 'active').sort((a,b) => b.version-a.version);
  const plan = plans[0];
  const inRange = plan && selected >= plan.startDate && selected <= plan.endDate;
  const reminders = computeReminders(data, p.id, today);
  const daySessions = p.deviceId ? sessionsOf(p.deviceId).filter(s => localDay(new Date(s.start)) === selected) : [];
  const days = Array.from({ length: 14 }, (_,i) => { const d = new Date(); d.setDate(d.getDate()+i-3); return d; });
  const dev = data.devices.find(d => d.id === p.deviceId);
  return <Screen header={<Header back title="Lịch trình của tôi" subtitle="Theo liệu trình bác sĩ đã xác nhận" />}>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 9, paddingVertical: 8 }}>
      {days.map(d => { const iso=localDay(d); const on=iso===selected;
        return <Pressable key={iso} accessibilityLabel={'Ngày ' + fmtDate(iso)} onPress={() => setSelected(iso)} style={{ width: 58, paddingVertical: 15, borderRadius: 20, alignItems: 'center', gap: 8, backgroundColor: on ? C.primary : C.card }}>
          <Text style={{ color: on ? C.onPrimary : C.textSoft, fontSize: 12 }}>{['CN','T2','T3','T4','T5','T6','T7'][d.getDay()]}</Text>
          <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: '700', fontSize: 21 }}>{d.getDate()}</Text>
        </Pressable>;
      })}
    </ScrollView>
    <SectionTitle>{selected === today ? 'Hôm nay' : fmtDate(selected)}</SectionTitle>
    <Card hero>
      {inRange ? <>
        <Chip label="Liệu trình đang áp dụng" tone="blue" />
        <Text style={{ fontSize: 25, fontWeight: '700' }}>{plan.sessionsPerDay ?? '—'} phiên / ngày</Text>
        <Muted>Khoảng cách tối thiểu: {plan.minIntervalMin ?? '—'} phút. Chưa có giờ điều trị cụ thể do bác sĩ đặt.</Muted>
        <InfoRow label="Phiên đã hoàn tất" value={daySessions.filter(s => s.status === 'completed').length} />
        <Muted>{plan.notes}</Muted>
      </> : <Muted>{plan ? 'Ngày được chọn nằm ngoài thời gian của liệu trình đang áp dụng.' : 'Chưa có liệu trình được bác sĩ xác nhận.'}</Muted>}
    </Card>
    <SectionTitle>Lịch hẹn & tái đánh giá</SectionTitle>
    {reminders.filter(r => r.date === selected).map(r => <Card key={r.id}><Text style={{ fontWeight: '700' }}>{r.title}</Text><Muted>{r.body}</Muted></Card>)}
    {!reminders.some(r => r.date === selected) && <Muted>Không có lịch hẹn được ghi nhận trong ngày này.</Muted>}
    <SectionTitle>Thiết bị & nhật ký</SectionTitle>
    <Card>
      <InfoRow label="Thiết bị" value={dev?.code ?? 'Chưa được gán'} />
      {dev && <Chip label={dev.online ? 'Đang kết nối' : 'Chưa kết nối'} tone={dev.online ? 'green' : 'gray'} />}
      {daySessions.length === 0 ? <Empty text="Chưa có phiên được đồng bộ trong ngày." /> : daySessions.map(s => <InfoRow key={s.sessionId} label={new Date(s.start).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} value={s.status === 'completed' ? s.durationMin + ' phút · Hoàn tất' : 'Chưa hoàn tất'} />)}
      <Button label="Xem thiết bị" variant="secondary" onPress={() => router.navigate('/patient/device')} />
    </Card>
    <SectionTitle>Sắp tới</SectionTitle>
    {reminders.filter(r => r.date > selected).slice(0,5).map(r => <Card key={r.id}><InfoRow label={fmtDate(r.date)} value={r.title} /><Muted>{r.body}</Muted></Card>)}
  </Screen>;
}

