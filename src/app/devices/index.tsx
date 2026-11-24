import { router } from 'expo-router';
import { useState } from 'react';

import { NoAccess } from '@/components/Guard';
import { Chip, Choices, Header, LinkRow, ListCard, Muted, Notice, Screen, SectionTitle } from '@/components/ui';
import { DEVICE_STATUS, deviceStatus, type DeviceStatus } from '@/lib/deviceState';
import { fmtDateTime } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';

/**
 * Giai đoạn B (CN4 D1, D9): bác sĩ xem danh sách máy và trạng thái (Sẵn sàng, Đang giao, Lỗi hoặc bảo trì).
 * Máy báo lỗi lên đầu, có biểu tượng cảnh báo. Chạm một máy để xem lịch sử, khử khuẩn hoặc ghi xử lý lỗi.
 * Bác sĩ không kết nối, không điều khiển máy (D6). Danh mục máy do quản trị thêm, sửa.
 */
type Filter = 'all' | DeviceStatus;
const ORDER: Record<DeviceStatus, number> = { fault: 0, maintenance: 1, ready: 2, in_use: 3 };

export default function DoctorDevices({ tab }: { tab?: boolean } = {}) {
  const { data, me } = useStore();
  const { patient } = useLookups();
  const [filter, setFilter] = useState<Filter>('all');
  if (me?.role !== 'doctor') return <NoAccess />;
  const list = [...data.devices].sort((a, b) => ORDER[deviceStatus(a)] - ORDER[deviceStatus(b)] || a.code.localeCompare(b.code));
  const count = (s: DeviceStatus) => list.filter((d) => deviceStatus(d) === s).length;
  const shown = filter === 'all' ? list : list.filter((d) => deviceStatus(d) === filter);
  const faults = count('fault');
  return (
    <Screen header={<Header back={!tab} home={tab ? '/doctor' : undefined} title="Thiết bị" subtitle="Danh sách máy và trạng thái" />}>
      {/* Logic chốt 25/11 (D5): không ghi mã lỗi, chỉ trạng thái Lỗi và mô tả. */}
      {faults > 0 && <Notice tone="red" icon="warning-outline">{`${faults} máy đang báo lỗi. Mở máy để xem mô tả lỗi và ghi đã xử lý.`}</Notice>}
      <Choices value={filter} onChange={setFilter} options={[
        { value: 'all', label: `Tất cả (${list.length})` },
        { value: 'ready', label: `Sẵn sàng (${count('ready')})` },
        { value: 'in_use', label: `Đang giao (${count('in_use')})` },
        { value: 'maintenance', label: `Chờ khử khuẩn (${count('maintenance')})` },
        { value: 'fault', label: `Lỗi (${faults})` },
      ]} />
      <SectionTitle caption="Giao và thu hồi máy trên hồ sơ bệnh nhân. Danh mục máy do quản trị quản lý.">{`${shown.length} máy`}</SectionTitle>
      {shown.length === 0 ? <Muted>Không có máy ở trạng thái này.</Muted> : (
        <ListCard>
          {shown.map((d) => {
            const st = deviceStatus(d);
            const owner = patient(d.patientId);
            return (
              <LinkRow key={d.id} testID={`may-${d.code}`} icon={st === 'fault' ? 'warning-outline' : 'hardware-chip-outline'} tone={DEVICE_STATUS[st].tone}
                title={d.code} accessibilityLabel={`${d.code}, ${DEVICE_STATUS[st].label}${owner ? `, ${owner.code}` : ''}`}
                sub={[d.serial ? `Sê-ri ${d.serial}` : '', owner ? `Đang giữ: ${owner.code}` : '', d.fault ? `Lỗi lúc ${fmtDateTime(d.fault.at)}` : ''].filter(Boolean).join(' · ') || d.model}
                right={<Chip label={DEVICE_STATUS[st].label} tone={DEVICE_STATUS[st].tone} />}
                onPress={() => router.push({ pathname: '/devices/[id]', params: { id: d.id } })} />
            );
          })}
        </ListCard>
      )}
    </Screen>
  );
}
