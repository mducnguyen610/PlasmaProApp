import { router } from 'expo-router';

import { DeviceView } from '@/components/DeviceView';
import { Button, Card, Empty, Header, Screen } from '@/components/ui';
import { useLookups, useStore } from '@/lib/store';

export default function PatientDevice() {
  const { me } = useStore();
  const { patient, device } = useLookups();
  const p = patient(me?.patientId);
  const d = device(p?.deviceId);
  return (
    <Screen header={<Header title="Thiết bị của tôi" subtitle={d?.code} />}>
      {d ? <DeviceView device={d} level="patient" /> : <Card><Empty icon="hardware-chip-outline" text="Chưa được gán thiết bị." /></Card>}
      {/* Chỉ nạp liệu trình khi bác sĩ đã giao máy (FR13): phiên và nhật ký phải gắn với một thiết bị. */}
      {p && d && <Button label="Kết nối máy và nạp liệu trình" icon="arrow-down-circle-outline" onPress={() => router.push('/connect-device')} />}
      {p && d && <Button label="Theo dõi phiên điều trị" variant="secondary" icon="pulse-outline" onPress={() => router.push('/session-monitor')} />}
      <Button label="Báo sự cố thiết bị" variant="secondary" icon="warning-outline" onPress={() => router.push({ pathname: '/report', params: { kind: 'device' } })} />
    </Screen>
  );
}
