import { router } from 'expo-router';

import { DeviceView } from '@/components/DeviceView';
import { Button, Card, Empty, Header, Notice, Screen } from '@/components/ui';
import { courseProgress, courseStatus, localDay } from '@/lib/course';
import { fmtDate } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { semantic } from '@/theme';

export default function PatientDevice() {
  const { me } = useStore();
  const { patient, device, woundsOf, coursePlan, sessionsOf } = useLookups();
  const p = patient(me?.patientId);
  const d = device(p?.deviceId);
  // Cùng cách tính với trang chủ (N02): hôm nay có buổi chiếu thì nạp liệu trình là việc chính; ngày khác chỉ là nút phụ (V05).
  const today = localDay();
  const treating = p ? woundsOf(p.id).map((w) => ({ w, plan: coursePlan(w.id, { patientView: true }) })).find((c) => c.plan?.status === 'active') : undefined;
  const lastSyncDay = d?.lastSync ? localDay(d.lastSync) : null;
  const sessions = p?.deviceId && treating ? sessionsOf(p.deviceId).filter((x) => !x.woundId || x.woundId === treating.w.id) : [];
  const status = treating?.plan ? courseStatus(courseProgress(treating.plan, sessions, today, lastSyncDay), fmtDate) : null;
  const treatToday = status?.kind === 'treat';
  return (
    <Screen header={<Header title="Thiết bị của tôi" subtitle={d?.code} />}>
      {d ? <DeviceView device={d} level="patient" /> : <Card><Empty icon="hardware-chip-outline" text="Chưa được gán thiết bị." /></Card>}
      {/* Chỉ nạp liệu trình khi bác sĩ đã giao máy (FR13): phiên và nhật ký phải gắn với một thiết bị. */}
      {p && d && !treatToday && status && <Notice tone={semantic.neutral.tone} icon={status.kind === 'rest' ? 'moon-outline' : 'information-circle-outline'}>{`${status.title}. Không cần nạp liệu trình hôm nay.`}</Notice>}
      {p && d && <Button label="Nạp liệu trình vào máy" variant={treatToday ? 'primary' : 'secondary'} icon="arrow-down-circle-outline" onPress={() => router.push('/connect-device')} />}
      {p && d && <Button label="Theo dõi phiên điều trị" variant="secondary" icon="pulse-outline" onPress={() => router.push('/session-monitor')} />}
      <Button label="Báo sự cố thiết bị" variant="secondary" icon="warning-outline" onPress={() => router.push({ pathname: '/report', params: { kind: 'device' } })} />
    </Screen>
  );
}
