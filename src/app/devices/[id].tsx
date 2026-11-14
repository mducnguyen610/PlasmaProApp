import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

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
  // Stage 7 (GĐ-9): hai lối vào T01, T02 của bác sĩ phụ trách nằm ở chân màn, thấy ngay khi mở. Điều kiện vai trò giữ nguyên.
  const doctorOwns = me!.role === 'doctor' && !!owner && owner.doctorId === me!.id;
  return (
    <Screen
      header={<Header back title="Thiết bị và nhật ký" subtitle={d.code} />}
      footer={doctorOwns && owner ? (
        <View style={{ gap: 8 }}>
          <Button label="Kết nối máy và nạp liệu trình" icon="arrow-down-circle-outline" onPress={() => router.push({ pathname: '/connect-device', params: { patientId: owner.id } })} />
          <Button label="Theo dõi phiên điều trị" variant="secondary" icon="pulse-outline" onPress={() => router.push({ pathname: '/session-monitor', params: { patientId: owner.id } })} />
        </View>
      ) : undefined}>
      <DeviceView device={d} level={me!.role === 'admin' ? 'tech' : me!.role === 'doctor' ? 'doctor' : 'patient'} />
    </Screen>
  );
}
