import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { Card, Chip, Empty, Header, Screen } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

// Quản trị: xem lỗi đồng bộ / lỗi hệ thống.
export default function AdminLogs() {
  const { data, resolveSyncError } = useStore();
  const list = [...data.syncErrors].sort((a, b) => b.at.localeCompare(a.at));
  return (
    <Screen header={<Header title="Lỗi hệ thống" subtitle="Lỗi đồng bộ thiết bị và máy chủ" />}>
      {list.length === 0 && <Card><Empty icon="checkmark-done-outline" text="Không có lỗi." /></Card>}
      {list.map((e) => (
        <Card key={e.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: C.textSoft, fontSize: 13, flex: 1 }}>{fmtDateTime(e.at)}</Text>
            <Chip label={e.resolved ? 'Đã xử lý' : 'Chưa xử lý'} tone={e.resolved ? 'green' : 'red'} />
          </View>
          <Text style={{ color: C.text }}>{e.message}</Text>
          {!e.resolved && (
            <Pressable onPress={() => resolveSyncError(e.id)}>
              <Text style={{ color: C.primary, fontWeight: '600' }}>Đánh dấu đã xử lý</Text>
            </Pressable>
          )}
        </Card>
      ))}
    </Screen>
  );
}
