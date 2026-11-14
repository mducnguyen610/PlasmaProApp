import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { NoAccess } from '@/components/Guard';
import { Button, Card, Chip, Header, InfoRow, Muted, Notice, Screen } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { Text } from '@/components/Text';
import { C } from '@/theme';

// Q04b Chi tiết một bản ghi lỗi (Stage 6). Chỉ đọc; thao tác duy nhất là "Đánh dấu đã xử lý" như ở danh sách Q04.
export default function AdminLogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me, resolveSyncError } = useStore();
  const [done, setDone] = useState(false);
  if (!me || me.role !== 'admin') return <NoAccess />;
  const e = data.syncErrors.find((x) => x.id === id);
  if (!e) return <NoAccess notFound />;
  const dev = data.devices.find((d) => d.id === e.deviceId);
  return (
    <Screen header={<Header back title="Chi tiết lỗi" subtitle={fmtDateTime(e.at)} />}>
      {done && <Notice tone="green" icon="checkmark-circle-outline">Đã đánh dấu đã xử lý.</Notice>}
      <Card hero>
        <Chip label={e.resolved ? 'Đã xử lý' : 'Chưa xử lý'} tone={e.resolved ? 'green' : 'red'} />
        <Text selectable style={{ color: C.text, fontWeight: '600' }}>{e.message}</Text>
        <InfoRow label="Thời điểm" value={fmtDateTime(e.at)} />
        <InfoRow label="Thiết bị" value={dev ? dev.code : 'Không gắn thiết bị'} />
        <InfoRow label="Mã bản ghi" value={e.id} mono />
      </Card>
      {dev && <Button label={`Xem nhật ký ${dev.code}`} variant="secondary" icon="list-outline" onPress={() => router.push({ pathname: '/devices/[id]', params: { id: dev.id } })} />}
      {!e.resolved && <Button label="Đánh dấu đã xử lý" icon="checkmark-done-outline" onPress={() => { resolveSyncError(e.id); setDone(true); }} />}
      <Muted>Bản ghi lỗi được giữ nguyên, không xóa được trong ứng dụng.</Muted>
    </Screen>
  );
}
