import { View } from 'react-native';

import { Text } from '@/components/Text';
import { localDay } from '@/lib/course';
import { C, T } from '@/theme';

/**
 * Ngày hiện tại ở góc phải thanh tiêu đề, dạng chữ "Thứ năm, 12/11".
 * Không có nền viên thuốc để khỏi trông như nút bấm (V27).
 */
const WEEKDAY = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
export function DateBadge() {
  // Ngày theo giờ Việt Nam, cùng "hôm nay" với lịch điều trị (localDay).
  const [y, m, dd] = localDay().split('-').map(Number);
  const wd = WEEKDAY[new Date(Date.UTC(y, m - 1, dd)).getUTCDay()];
  return (
    <View accessible accessibilityLabel={`Hôm nay ${wd.toLowerCase()}, ngày ${dd} tháng ${m}`} style={{ alignItems: 'flex-end' }}>
      <Text style={{ fontSize: T.small, color: C.textSoft }}>{wd}</Text>
      <Text style={{ fontSize: T.label, fontWeight: '600', color: C.text }}>{`${dd}/${m}`}</Text>
    </View>
  );
}
