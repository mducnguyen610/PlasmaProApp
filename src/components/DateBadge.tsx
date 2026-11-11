import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { localDay } from '@/lib/course';
import { C } from '@/theme';

/** Ngày hiện tại ở góc phải thanh tiêu đề, dạng viên thuốc nhỏ "9/11". */
export function DateBadge() {
  // Ngày theo giờ Việt Nam, cùng "hôm nay" với lịch điều trị (localDay).
  const [, m, dd] = localDay().split('-').map(Number);
  return (
    <View accessible accessibilityLabel={`Hôm nay ngày ${dd} tháng ${m}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: C.surfaceMuted }}>
      <Ionicons name="calendar-outline" size={16} color={C.primary} />
      <Text style={{ fontSize: 15, fontWeight: '600', color: C.text }}>{`${dd}/${m}`}</Text>
    </View>
  );
}
