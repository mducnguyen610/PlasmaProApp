import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Polyline, Rect, Polygon, Text as SvgText } from 'react-native-svg';

import { chartLabel, dayDiff, niceAxis, xScale, type AreaPoint } from '@/lib/areaProgress';
import { C, F } from '@/theme';

/** Vạch ngày bắt đầu đợt (PP-08), chỉ màn bác sĩ. Chỉ là mốc thời gian, không mang ý nghĩa đánh giá. */
export type ChartMarker = { date: string; label: string };
export type MarkShape = 'circle' | 'square' | 'triangle';

const H = 200;
const PAD = { left: 34, right: 16, top: 26, bottom: 30 };
const LABEL = 13;

/**
 * P2-02b: biểu đồ đường diện tích theo thời gian (đặc tả mục 8, 9, 11).
 * - Trục X tỉ lệ theo số ngày, từ điểm đầu (hoặc đầu khoảng) đến hôm nay. Trục Y từ 0.
 * - Đoạn thẳng nối các điểm liên tiếp CÙNG nhóm phương pháp; không làm mượt, không nội suy, không dự báo.
 * - Số chỉ ghi trên điểm đầu và điểm cuối; điểm khác xem ở vùng chi tiết khi chọn.
 * - Vùng chạm là cả vùng vẽ: chạm hoặc kéo chọn điểm gần nhất theo trục X.
 * - Trình đọc màn hình đọc nhãn tóm tắt; từng lần đo đọc ở danh sách "Các lần đo" ngay dưới (phương án thay thế, mục 9).
 */
export function AreaLineChart({ code, groups, from, to, unmeasuredDates = [], markers = [], selectedId, onSelect, maxLabels }: {
  code: string;
  /** Mỗi nhóm một phương pháp; nhóm đầu là nhóm chính. */
  groups: { key: string; label: string; shape: MarkShape; points: AreaPoint[] }[];
  from: string; to: string;
  unmeasuredDates?: string[];
  markers?: ChartMarker[];
  selectedId: string | null;
  onSelect: (imageId: string) => void;
  /** Số nhãn ngày tối đa; mặc định theo độ rộng (4 ở máy hẹp, 6 ở 768 px). */
  maxLabels?: number;
}) {
  const [w, setW] = useState(0);
  const all = groups.flatMap((g) => g.points).sort((a, b) => a.date.localeCompare(b.date));
  const axis = niceAxis(Math.max(0, ...all.map((p) => p.areaCm2)));
  const x0 = PAD.left, x1 = Math.max(x0 + 10, w - PAD.right), y0 = PAD.top, y1 = H - PAD.bottom;
  const X = (d: string) => xScale(d, from, to, x0, x1);
  const Y = (a: number) => y1 - ((y1 - y0) * a) / axis.max;
  const ticks = Array.from({ length: Math.round(axis.max / axis.step) + 1 }, (_, i) => Math.round(i * axis.step * 1e6) / 1e6);
  const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
  const ddmm = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}${dayDiff(from, to) > 365 ? `/${d.slice(2, 4)}` : ''}`;

  // Nhãn ngày: luôn có điểm đầu và điểm cuối, thêm điểm khác khi đủ chỗ (không chồng nhau), tối đa 4 (máy hẹp) hoặc 6 (768 px).
  const limit = maxLabels ?? (w >= 600 ? 6 : 4);
  const minGap = 46;
  const first = all[0], last = all[all.length - 1];
  const labels: string[] = first ? [first.date] : [];
  if (last && last.date !== first?.date) labels.push(last.date);
  for (const p of all) {
    if (labels.length >= limit) break;
    if (labels.includes(p.date)) continue;
    if (labels.every((d) => Math.abs(X(d) - X(p.date)) >= minGap)) labels.push(p.date);
  }
  const anchor = (d: string) => (X(d) - x0 < 20 ? 'start' : x1 - X(d) < 20 ? 'end' : 'middle');

  const pick = (lx: number) => {
    if (!all.length) return;
    let best = all[0];
    for (const p of all) if (Math.abs(X(p.date) - lx) < Math.abs(X(best.date) - lx)) best = p;
    onSelect(best.imageId);
  };
  const sel = all.find((p) => p.imageId === selectedId);
  const mark = (shape: MarkShape, cx: number, cy: number, r: number, on: boolean, key: string) => {
    const fill = on ? C.primary : C.card;
    if (shape === 'square') return <Rect key={key} x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill={fill} stroke={C.primary} strokeWidth={2.5} />;
    if (shape === 'triangle') return <Polygon key={key} points={`${cx},${cy - r * 1.2} ${cx - r * 1.1},${cy + r * 0.8} ${cx + r * 1.1},${cy + r * 0.8}`} fill={fill} stroke={C.primary} strokeWidth={2.5} />;
    return <Circle key={key} cx={cx} cy={cy} r={r} fill={fill} stroke={C.primary} strokeWidth={2.5} />;
  };

  return (
    <View
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      accessible accessibilityRole="image" accessibilityLabel={chartLabel(code, all, axis.max)}
      onStartShouldSetResponder={() => true} onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => pick(e.nativeEvent.locationX)} onResponderMove={(e) => pick(e.nativeEvent.locationX)}
      testID="bieu-do-dien-tich"
      style={{ height: H, width: '100%' }}>
      {w > 0 && (
        <Svg width={w} height={H} pointerEvents="none">
          {ticks.map((t) => (
            <Line key={'g' + t} x1={x0} x2={x1} y1={Y(t)} y2={Y(t)} stroke={C.border} strokeWidth={1} />
          ))}
          {ticks.map((t) => (
            <SvgText key={'y' + t} x={x0 - 6} y={Y(t) + 4} fontSize={LABEL} fontFamily={F.regular} fill={C.textSoft} textAnchor="end">{fmt(t)}</SvgText>
          ))}
          {markers.filter((m) => m.date >= from && m.date <= to).map((m) => (
            <Line key={'m' + m.date} x1={X(m.date)} x2={X(m.date)} y1={y0 - 4} y2={y1} stroke={C.textSoft} strokeWidth={1.5} strokeDasharray="4 4" />
          ))}
          {markers.filter((m) => m.date >= from && m.date <= to).map((m) => (
            <SvgText key={'ml' + m.date} x={X(m.date) + 3} y={y0 - 8} fontSize={LABEL} fontFamily={F.medium} fill={C.textSoft}>{m.label}</SvgText>
          ))}
          {/* Hôm nay: vạch mảnh ở cuối trục, để thấy khoảng trống từ lần đo cuối tới nay. */}
          <Line x1={x1} x2={x1} y1={y1 - 6} y2={y1} stroke={C.textSoft} strokeWidth={1} />
          {sel && <Line x1={X(sel.date)} x2={X(sel.date)} y1={y0} y2={y1} stroke={C.textSoft} strokeWidth={1} />}
          {groups.map((g) => g.points.length > 1 && (
            <Polyline key={'l' + g.key} points={g.points.map((p) => `${X(p.date)},${Y(p.areaCm2)}`).join(' ')} fill="none" stroke={C.primary} strokeWidth={2.5} strokeLinejoin="round" strokeDasharray={g.shape === 'circle' ? undefined : '6 4'} />
          ))}
          {unmeasuredDates.filter((d) => d >= from && d <= to).map((d) => (
            <Circle key={'u' + d} cx={X(d)} cy={y1 - 5} r={4} fill={C.card} stroke={C.textSoft} strokeWidth={1.5} />
          ))}
          {groups.flatMap((g) => g.points.map((p) => mark(g.shape, X(p.date), Y(p.areaCm2), p.imageId === selectedId ? 7 : 5, p.imageId === selectedId, p.imageId)))}
          {first && <SvgText x={X(first.date)} y={Y(first.areaCm2) - 10} fontSize={LABEL} fontFamily={F.bold} fill={C.text} textAnchor={anchor(first.date)}>{fmt(first.areaCm2)}</SvgText>}
          {last && last !== first && <SvgText x={X(last.date)} y={Y(last.areaCm2) - 10} fontSize={LABEL} fontFamily={F.bold} fill={C.text} textAnchor={anchor(last.date)}>{fmt(last.areaCm2)}</SvgText>}
          {labels.map((d) => (
            <SvgText key={'x' + d} x={X(d)} y={H - 8} fontSize={LABEL} fontFamily={F.regular} fill={C.textSoft} textAnchor={anchor(d)}>{ddmm(d)}</SvgText>
          ))}
        </Svg>
      )}
    </View>
  );
}
