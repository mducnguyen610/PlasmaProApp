import { useLocalSearchParams } from 'expo-router';

import { DeviceView } from '@/components/DeviceView';
import { NoAccess } from '@/components/Guard';
import { Header, Screen } from '@/components/ui';
import { useLookups, useStore } from '@/lib/store';

// BS07 – Lịch sử thiết bị: phiên sử dụng, thời gian, thông số thiết bị cung cấp.
export default function DeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me } = useStore();
  const { device, patient } = useLookups();
  const d = device(id);
  const owner = patient(d?.patientId);
  // Giai đoạn B (CN4 D1): bác sĩ xem danh sách và trạng thái mọi máy (máy đã thu hồi không còn gắn bệnh nhân nào để khử khuẩn).
  // Thao tác vẫn do store kiểm: máy đang giao chỉ bác sĩ phụ trách bệnh nhân giữ máy.
  const allowed =
    !!d && !!me &&
    (me.role === 'admin' || me.role === 'doctor' || (me.role === 'patient' && me.patientId === owner?.id));
  if (!d) return <NoAccess notFound />;
  if (!allowed) return <NoAccess />;
  // Giai đoạn B (AU-03): bác sĩ không kết nối, nạp liệu trình hay theo dõi phiên trên máy; màn chỉ xem thiết bị và nhật ký.
  return (
    <Screen header={<Header back title="Thiết bị và nhật ký" subtitle={d.code} />}>
      <DeviceView device={d} level={me!.role === 'admin' ? 'tech' : me!.role === 'doctor' ? 'doctor' : 'patient'} />
    </Screen>
  );
}
