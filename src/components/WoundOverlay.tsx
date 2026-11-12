import { View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Text } from '@/components/Text';
import { coverMap, type WoundDetection } from '@/lib/capture/woundDetect';
import { C, T } from '@/theme';

/** Viền khoanh vết thương, bám theo vị trí dò được trên khung camera (hiển thị kiểu cover). */
export function WoundOverlay({ detection, viewWidth, viewHeight, color, label }: {
  detection: WoundDetection | null; viewWidth: number; viewHeight: number; color: string; label?: string;
}) {
  if (!detection?.found || !detection.box || !viewWidth || !viewHeight) return null;
  const map = coverMap(detection.width, detection.height, viewWidth, viewHeight);
  // Hull từ khung trước có thể lệch nhẹ so với hộp đã làm mượt; dời theo tâm hộp.
  const shift = detection.center && detection.hull.length
    ? (() => {
      const cx = detection.hull.reduce((s, p) => s + p[0], 0) / detection.hull.length;
      const cy = detection.hull.reduce((s, p) => s + p[1], 0) / detection.hull.length;
      return { dx: detection.center.x - cx, dy: detection.center.y - cy };
    })()
    : { dx: 0, dy: 0 };
  const points = detection.hull.map(([x, y]) => { const v = map.toView(x + shift.dx, y + shift.dy); return `${v.x},${v.y}`; }).join(' ');
  const top = map.toView(detection.box.x, detection.box.y);
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, top: 0, width: viewWidth, height: viewHeight }}>
      <Svg width={viewWidth} height={viewHeight}>
        <Polygon points={points} fill={color + '33'} stroke={color} strokeWidth={3} strokeLinejoin="round" />
      </Svg>
      {label ? (
        <View style={{ position: 'absolute', left: Math.max(4, top.x), top: Math.max(4, top.y - 30), backgroundColor: color, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ color: C.onPrimary, fontWeight: '700', fontSize: T.caption }}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Viền vết thương trên ảnh tĩnh hiển thị vừa khít (cùng tỉ lệ). */
export function WoundOutline({ hull, color }: { hull: [number, number][]; color: string }) {
  if (hull.length < 3) return null;
  return (
    <Svg pointerEvents="none" width="100%" height="100%" style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} viewBox="0 0 1 1" preserveAspectRatio="none">
      <Polygon points={hull.map(([x, y]) => `${x},${y}`).join(' ')} fill={color + '33'} stroke={color} strokeWidth={0.006} strokeLinejoin="round" />
    </Svg>
  );
}
