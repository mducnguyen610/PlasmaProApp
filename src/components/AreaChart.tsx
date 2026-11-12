import { View } from 'react-native';
import { Text } from '@/components/Text';

import { fmtDate } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import type { WoundImage } from '@/lib/types';
import { C } from '@/theme';

/**
 * Biểu đồ cột diện tích theo ngày chụp. Chỉ hiển thị số đo bác sĩ đã nhập;
 * không cộng diện tích các góc chụp: nếu một ngày có nhiều ảnh, lấy ảnh có mã nhỏ nhất (đặc tả mục 8).
 */
export function AreaChart({ images }: { images: WoundImage[] }) {
  const byDate = new Map<string, WoundImage>();
  for (const im of images) {
    if (im.status !== 'labeled' || im.areaCm2 === null || im.capture?.sourceDateKnown === false) continue;
    const prev = byDate.get(im.captureDate);
    if (!prev || im.id < prev.id) byDate.set(im.captureDate, im);
  }
  const points = [...byDate.values()].sort((a, b) => a.captureDate.localeCompare(b.captureDate));
  if (points.length === 0) return <Text style={{ color: C.textSoft }}>Chưa có ảnh đủ số đo và ngày chụp xác định.</Text>;
  const max = Math.max(...points.map((p) => p.areaCm2!), 0.001);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 130 }}>
        {points.map((p) => (
          <View key={p.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: 13, color: C.text, fontWeight: '700' }}>{formatAreaDisplay(p.areaCm2).replace(' cm²', '')}</Text>
            <View style={{ width: '70%', maxWidth: 34, height: Math.max(6, (p.areaCm2! / max) * 100), backgroundColor: C.primary, borderRadius: 8 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {points.map((p) => (
          <Text key={p.id} style={{ flex: 1, textAlign: 'center', fontSize: 13, color: C.textFaint }}>{fmtDate(p.captureDate).slice(0, 5)}</Text>
        ))}
      </View>
      <Text style={{ fontSize: 13, color: C.textFaint }}>Đơn vị cm². Không dùng ảnh chưa rõ ngày chụp. Số đo lấy bên ngoài ứng dụng.</Text>
    </View>
  );
}
