import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { C } from '@/theme';

/** Ngày hiện tại ở góc phải thanh tiêu đề, dạng viên thuốc nhỏ "9/11". */
export function DateBadge() {
  const d = new Date();
  return (
    <View accessible accessibilityLabel={`Hôm nay ngày ${d.getDate()} tháng ${d.getMonth() + 1}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: C.surfaceMuted }}>
      <Ionicons name="calendar-outline" size={16} color={C.primary} />
      <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{`${d.getDate()}/${d.getMonth() + 1}`}</Text>
    </View>
  );
}
