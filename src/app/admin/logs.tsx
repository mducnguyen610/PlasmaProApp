import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { Chip, Empty, Header, LinkRow, ListCard, Screen, Segmented } from '@/components/ui';
import { groupErrorsByDay } from '@/lib/adminView';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { C, T } from '@/theme';

type Filter = 'all' | 'open' | 'resolved';

// Q04 Quản trị: lỗi đồng bộ / lỗi hệ thống. Stage 6: lọc theo trạng thái, nhóm theo ngày (mới nhất trước), mở chi tiết từng bản ghi.
// Không xóa hay sửa bản ghi; thao tác duy nhất vẫn là "Đánh dấu đã xử lý".
export default function AdminLogs() {
  const { data, resolveSyncError } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const open = data.syncErrors.filter((e) => !e.resolved).length;
  const groups = groupErrorsByDay(data.syncErrors, filter);
  const deviceCode = (id?: string) => data.devices.find((d) => d.id === id)?.code;
  return (
    <Screen header={<Header title="Lỗi hệ thống" subtitle="Lỗi đồng bộ thiết bị và máy chủ" />}>
      {data.syncErrors.length > 0 && (
        <Segmented<Filter> value={filter} onChange={setFilter} options={[
          { value: 'all', label: `Tất cả (${data.syncErrors.length})` },
          { value: 'open', label: `Chưa xử lý (${open})` },
          { value: 'resolved', label: 'Đã xử lý' },
        ]} />
      )}
      {groups.length === 0 && (
        <Empty icon="checkmark-done-outline" text={data.syncErrors.length === 0 ? 'Không có lỗi.' : filter === 'open' ? 'Không còn lỗi chưa xử lý.' : 'Chưa có lỗi nào được đánh dấu đã xử lý.'} />
      )}
      {groups.map((g) => (
        <View key={g.day} style={{ gap: 8 }}>
          <Text accessibilityRole="header" style={{ color: C.textSoft, fontSize: T.small, fontWeight: '700' }}>{fmtDate(g.day)}</Text>
          <ListCard>
            {g.items.map((e) => (
              <View key={e.id} style={{ gap: 4, paddingVertical: 8 }}>
                <LinkRow testID={`loi-${e.id}`} icon={e.resolved ? 'checkmark-circle-outline' : 'alert-circle-outline'} tone={e.resolved ? 'green' : 'red'}
                  title={e.message} sub={`${fmtDateTime(e.at)}${deviceCode(e.deviceId) ? ` · ${deviceCode(e.deviceId)}` : ''}`}
                  below={<Chip label={e.resolved ? 'Đã xử lý' : 'Chưa xử lý'} tone={e.resolved ? 'green' : 'red'} />}
                  accessibilityLabel={`${e.message}, ${fmtDateTime(e.at)}, ${e.resolved ? 'đã xử lý' : 'chưa xử lý'}. Mở chi tiết`}
                  onPress={() => router.push({ pathname: '/admin-log/[id]', params: { id: e.id } })} />
                {!e.resolved && (
                  <Pressable onPress={() => resolveSyncError(e.id)} accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 48 }}>
                    <Text style={{ color: C.primary, fontWeight: '600' }}>Đánh dấu đã xử lý</Text>
                  </Pressable>
                )}
              </View>
            ))}
          </ListCard>
        </View>
      ))}
    </Screen>
  );
}
