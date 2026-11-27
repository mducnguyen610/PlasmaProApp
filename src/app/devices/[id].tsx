import { useLocalSearchParams } from 'expo-router';

import { DeviceView } from '@/components/DeviceView';
import { NoAccess } from '@/components/Guard';
import { Card, Header, InfoRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { reportsVisibleTo } from '@/lib/access';
import { fmtDateTime } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';

// BS07 – Lịch sử thiết bị: phiên sử dụng, thời gian, thông số thiết bị cung cấp.
export default function DeviceScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, data } = useStore();
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
      {/* 27/11/2026 (FR15): báo cáo sự cố thiết bị của người đang giữ máy; quản trị và bác sĩ phụ trách thấy, bác sĩ khác không thấy. */}
      {me!.role !== 'patient' && owner && (() => {
        const list = reportsVisibleTo(me, data).filter((r) => r.kind === 'device' && r.patientId === owner.id);
        return <>
          <SectionTitle icon="warning-outline">Báo cáo sự cố thiết bị</SectionTitle>
          <Card>
            {list.length === 0 ? <Muted>Không có báo cáo sự cố thiết bị nào mà tài khoản này được xem.</Muted>
              : list.map((r) => <InfoRow key={r.id} stack label={`${fmtDateTime(r.date)}${r.handled ? ' · đã xử lý' : ''}`} value={r.content} />)}
          </Card>
        </>;
      })()}
      <DeviceView device={d} level={me!.role === 'admin' ? 'tech' : me!.role === 'doctor' ? 'doctor' : 'patient'} />
    </Screen>
  );
}
