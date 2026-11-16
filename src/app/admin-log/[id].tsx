import { router, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { View } from 'react-native';

import { NoAccess } from '@/components/Guard';
import { Button, Card, Chip, Header, InfoRow, Muted, Notice, Screen } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import { notify } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import { Text } from '@/components/Text';
import { C, T } from '@/theme';

// Q04b Chi tiết một bản ghi lỗi (Stage 6). Chỉ đọc; thao tác duy nhất là "Đánh dấu đã xử lý" như ở danh sách Q04.
export default function AdminLogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me, resolveSyncError } = useStore();
  const [done, setDone] = useState(false);
  if (!me || me.role !== 'admin') return <NoAccess />;
  const e = data.syncErrors.find((x) => x.id === id);
  if (!e) return <NoAccess notFound />;
  const dev = data.devices.find((d) => d.id === e.deviceId);
  const resolve = async () => {
    try {
      await resolveSyncError(e.id);
    } catch (x) {
      notify('Chưa đánh dấu được', x instanceof Error ? x.message : String(x));
      return;
    }
    setDone(true);
  };
  // Stage 9A (bố cục riêng Q04b): nội dung lỗi là tiêu đề của thẻ chính, trạng thái cạnh đó; thời điểm chỉ còn ở một chỗ (bỏ phụ đề
  // trùng). Nút "Đánh dấu đã xử lý" ở chân màn nên luôn thấy; lối sang nhật ký thiết bị ngay dưới thẻ. Thao tác không đổi.
  return (
    <Screen header={<Header back title="Chi tiết lỗi" />}
      footer={!e.resolved ? <Button label="Đánh dấu đã xử lý" icon="checkmark-done-outline" onPress={resolve} /> : undefined}>
      {done && <Notice tone="green" icon="checkmark-circle-outline">Đã đánh dấu đã xử lý.</Notice>}
      <Card hero>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start' }}>
          <Ionicons name={e.resolved ? 'checkmark-circle-outline' : 'alert-circle-outline'} size={26} color={e.resolved ? C.green : C.red} style={{ marginTop: 1 }} />
          <View style={{ flex: 1, gap: 8 }}>
            <Text selectable style={{ color: C.text, fontWeight: '700', fontSize: T.titleM, lineHeight: 24 }}>{e.message}</Text>
            <View style={{ flexDirection: 'row' }}><Chip label={e.resolved ? 'Đã xử lý' : 'Chưa xử lý'} tone={e.resolved ? 'green' : 'red'} /></View>
          </View>
        </View>
        <InfoRow label="Thời điểm" value={fmtDateTime(e.at)} />
        <InfoRow label="Thiết bị" value={dev ? dev.code : 'Không gắn thiết bị'} />
        <InfoRow label="Mã bản ghi" value={e.id} mono />
        <Muted>Bản ghi lỗi được giữ nguyên, không xóa được trong ứng dụng.</Muted>
      </Card>
      {dev && <Button label={`Xem nhật ký ${dev.code}`} variant="secondary" icon="list-outline" onPress={() => router.push({ pathname: '/devices/[id]', params: { id: dev.id } })} />}
    </Screen>
  );
}
