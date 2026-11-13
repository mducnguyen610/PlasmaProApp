import { View } from 'react-native';
import { chartPoints } from '@/lib/woundSummary';
import { Text } from '@/components/Text';

import { fmtDate } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import type { WoundImage } from '@/lib/types';
import { C, typeScale, T } from '@/theme';

/** Mốc bắt đầu đợt điều trị vẽ thành vạch dọc giữa các cột (PP-08). Chỉ là mốc thời gian, không mang ý nghĩa đánh giá. */
export type ChartMarker = { date: string; label: string };
const MARKER_W = 44;
const LABEL = typeScale.small.size; // PP-16: nhãn cột và nhãn ngày 14 px thay cho 13 px.

/**
 * Biểu đồ cột diện tích theo ngày chụp. Chỉ hiển thị số đo bác sĩ đã nhập;
 * không cộng diện tích các góc chụp: nếu một ngày có nhiều ảnh, lấy ảnh có mã nhỏ nhất (đặc tả mục 8).
 */
export function AreaChart({ images, markers = [] }: { images: WoundImage[]; markers?: ChartMarker[] }) {
  // P1-02b: quy tắc chọn điểm chuyển sang woundSummary.ts để B05 "Lần trước" dùng đúng điểm của biểu đồ. Nội dung không đổi.
  const points = chartPoints(images);
  if (points.length === 0) return <Text style={{ color: C.textSoft }}>Chưa có ảnh đủ số đo và ngày chụp xác định.</Text>;
  const max = Math.max(...points.map((p) => p.areaCm2!), 0.001);
  // Mỗi mốc đứng ngay trước cột đầu tiên có ngày chụp từ ngày bắt đầu đợt trở đi; mốc sau cột cuối đứng ở cuối.
  const sorted = [...markers].sort((a, b) => a.date.localeCompare(b.date));
  const before = (i: number) => sorted.filter((m) => m.date <= points[i].captureDate && (i === 0 || m.date > points[i - 1].captureDate));
  const after = sorted.filter((m) => m.date > points[points.length - 1].captureDate);
  const slots: ({ kind: 'bar'; p: WoundImage } | { kind: 'marker'; m: ChartMarker })[] = [];
  points.forEach((p, i) => { before(i).forEach((m) => slots.push({ kind: 'marker', m })); slots.push({ kind: 'bar', p }); });
  after.forEach((m) => slots.push({ kind: 'marker', m }));
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10, height: 130 }}>
        {slots.map((x) => x.kind === 'bar' ? (
          <View key={x.p.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
            <Text style={{ fontSize: LABEL, color: C.text, fontWeight: '700' }}>{formatAreaDisplay(x.p.areaCm2).replace(' cm²', '')}</Text>
            <View style={{ width: '70%', maxWidth: 34, height: Math.max(6, (x.p.areaCm2! / max) * 100), backgroundColor: C.primary, borderRadius: 8 }} />
          </View>
        ) : (
          <View key={'m' + x.m.date} accessible accessibilityLabel={`${x.m.label}, bắt đầu ${fmtDate(x.m.date)}`} style={{ width: MARKER_W, height: '100%', alignItems: 'center' }}>
            <Text style={{ fontSize: LABEL, color: C.textSoft, fontWeight: '700' }} numberOfLines={1}>{x.m.label}</Text>
            <View style={{ flex: 1, width: 0, borderLeftWidth: 2, borderStyle: 'dashed', borderColor: C.textSoft, marginTop: 2 }} />
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {slots.map((x) => x.kind === 'bar' ? (
          <Text key={x.p.id} style={{ flex: 1, textAlign: 'center', fontSize: LABEL, color: C.textFaint }}>{fmtDate(x.p.captureDate).slice(0, 5)}</Text>
        ) : (
          <Text key={'m' + x.m.date} style={{ width: MARKER_W, textAlign: 'center', fontSize: LABEL, color: C.textSoft }}>{fmtDate(x.m.date).slice(0, 5)}</Text>
        ))}
      </View>
      <Text style={{ fontSize: T.caption, color: C.textFaint }}>Đơn vị cm². Không dùng ảnh chưa rõ ngày chụp. Số đo lấy bên ngoài ứng dụng.{sorted.length > 0 ? ' Vạch đứt là ngày bắt đầu đợt điều trị.' : ''}</Text>
    </View>
  );
}
