import { router, useLocalSearchParams } from 'expo-router';

import { DeviceView } from '@/components/DeviceView';
import { NoAccess } from '@/components/Guard';
import { Button, Header, Screen } from '@/components/ui';
import { useLookups, useStore } from '@/lib/store';

// BS07 – Lịch sử thiết bị: phiên sử dụng, thời gian, thông số thiết bị cung cấp.
export default function DeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useStore();
  const { device, patient } = useLookups();
  const d = device(id);
  const owner = patient(d?.patientId);
  const allowed =
    !!d && !!me &&
    (me.role === 'admin' || (me.role === 'doctor' && owner?.doctorId === me.id) || (me.role === 'patient' && me.patientId === owner?.id));
  if (!d) return <NoAccess notFound />;
  if (!allowed) return <NoAccess />;
  return (
    <Screen header={<Header back title="Thiết bị và nhật ký" subtitle={d.code} />}>
      <DeviceView device={d} level={me!.role === 'admin' ? 'tech' : me!.role === 'doctor' ? 'doctor' : 'patient'} />
      {me!.role === 'doctor' && owner && owner.doctorId === me!.id && (
        <>
          <Button label="Kết nối máy và nạp liệu trình" icon="arrow-down-circle-outline" onPress={() => router.push({ pathname: '/connect-device', params: { patientId: owner.id } })} />
          <Button label="Theo dõi phiên điều trị" variant="secondary" icon="pulse-outline" onPress={() => router.push({ pathname: '/session-monitor', params: { patientId: owner.id } })} />
        </>
      )}
    </Screen>
  );
}
