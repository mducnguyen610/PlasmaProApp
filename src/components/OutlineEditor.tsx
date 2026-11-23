import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { Text } from '@/components/Text';
import { clamp01, type Point } from '@/lib/imageLabel';
import { DEMO_ASSETS } from '@/lib/seed';
import type { WoundImage } from '@/lib/types';
import { C, T } from '@/theme';

/**
 * Giai đoạn B (CN2 XN-08): khung chỉnh viền vết trên ảnh. Viền là đa giác tọa độ chuẩn hóa 0..1 trên ảnh đã lưu.
 * Bác sĩ kéo từng điểm (hệ responder của View, chạy được cả cảm ứng và chuột trên web); chạm một điểm để chọn rồi xóa, hoặc thêm điểm giữa.
 * Khung giữ đúng tỉ lệ ảnh (lấy từ capture hoặc khi ảnh tải xong) để tọa độ khớp điểm ảnh. Không sửa ảnh gốc, không sửa viền AI.
 */
export function OutlineEditor({ image, value, aiHull, onChange, readOnly }: {
  image: WoundImage; value: Point[]; aiHull?: Point[]; onChange?: (pts: Point[]) => void; readOnly?: boolean;
}) {
  const [ratio, setRatio] = useState(image.capture?.width && image.capture?.height ? image.capture.width / image.capture.height : 4 / 3);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<number | null>(null);
  const source = image.uri ? { uri: image.uri } : DEMO_ASSETS[image.demoAsset ?? 1];
  const pts = (arr: Point[]) => arr.map(([x, y]) => `${x},${y}`).join(' ');
  const handle = 36;

  return (
    <View style={{ gap: 8 }}>
      <View testID="khung-vien" onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        style={{ width: '100%', aspectRatio: ratio, borderRadius: 12, overflow: 'hidden', backgroundColor: C.photoPlaceholder }}>
        <Image source={source} style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 }} contentFit="fill"
          onLoad={(e) => { if (!image.capture?.width && e.source.width && e.source.height) setRatio(e.source.width / e.source.height); }} />
        <Svg pointerEvents="none" width="100%" height="100%" style={{ position: 'absolute', left: 0, top: 0 }} viewBox="0 0 1 1" preserveAspectRatio="none">
          {aiHull && aiHull.length >= 3 && <Polygon points={pts(aiHull)} fill="none" stroke={C.amber} strokeWidth={0.004} strokeDasharray="0.015,0.01" />}
          {value.length >= 3 && <Polygon points={pts(value)} fill={C.primary + '33'} stroke={C.primary} strokeWidth={0.006} strokeLinejoin="round" />}
        </Svg>
        {!readOnly && size.w > 0 && value.map((p, i) => (
          <DragHandle key={i} index={i} point={p} size={size} handle={handle} selected={selected === i}
            onSelect={() => setSelected(i)}
            onMove={(np) => onChange?.(value.map((q, j) => (j === i ? np : q)))} />
        ))}
      </View>
      {!readOnly && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <SmallAction label="Thêm điểm" onPress={() => {
            // Thêm điểm giữa cạnh sau điểm đang chọn (hoặc cạnh dài nhất) để khoanh sát bờ vết hơn.
            if (value.length < 2) return;
            let at = selected ?? -1;
            if (at < 0) {
              let best = 0;
              value.forEach((p, k) => { const q = value[(k + 1) % value.length]; const d = Math.hypot(p[0] - q[0], p[1] - q[1]); if (d > best) { best = d; at = k; } });
            }
            const a = value[at], b = value[(at + 1) % value.length];
            const mid: Point = [clamp01((a[0] + b[0]) / 2), clamp01((a[1] + b[1]) / 2)];
            onChange?.([...value.slice(0, at + 1), mid, ...value.slice(at + 1)]);
            setSelected(at + 1);
          }} />
          <SmallAction label="Xóa điểm đang chọn" disabled={selected === null || value.length <= 3} onPress={() => {
            if (selected === null || value.length <= 3) return;
            onChange?.(value.filter((_, k) => k !== selected));
            setSelected(null);
          }} />
        </View>
      )}
      <Text style={{ color: C.textSoft, fontSize: T.caption }}>
        {readOnly ? 'Viền xanh: vùng vết bác sĩ đã chốt.' : 'Kéo các điểm tròn vào đúng bờ vết. Viền xanh là vùng vết sẽ lưu'}{aiHull && aiHull.length >= 3 ? '; viền cam nét đứt là viền AI gốc (giữ nguyên, chỉ để đối chiếu).' : '.'}
      </Text>
    </View>
  );
}

function DragHandle({ index, point, size, handle, selected, onSelect, onMove }: {
  index: number; point: Point; size: { w: number; h: number }; handle: number; selected: boolean; onSelect: () => void; onMove: (p: Point) => void;
}) {
  // Dùng trực tiếp hệ responder của View: ghi vị trí lúc chạm, cộng độ dời theo kích thước khung.
  const start = useRef<{ pt: Point; x: number; y: number } | null>(null);
  return (
    <View accessibilityRole="adjustable" accessibilityLabel={`Điểm viền ${index + 1}`}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(e) => { start.current = { pt: point, x: e.nativeEvent.pageX, y: e.nativeEvent.pageY }; onSelect(); }}
      onResponderMove={(e) => {
        const st = start.current;
        if (!st) return;
        onMove([clamp01(st.pt[0] + (e.nativeEvent.pageX - st.x) / size.w), clamp01(st.pt[1] + (e.nativeEvent.pageY - st.y) / size.h)]);
      }}
      onResponderRelease={() => { start.current = null; }}
      style={{ position: 'absolute', left: point[0] * size.w - handle / 2, top: point[1] * size.h - handle / 2, width: handle, height: handle, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: selected ? 20 : 16, height: selected ? 20 : 16, borderRadius: 10, backgroundColor: selected ? C.amber : C.primary, borderWidth: 2, borderColor: C.onPrimary }} />
    </View>
  );
}

function SmallAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.cardBorder, opacity: disabled ? 0.5 : 1 }}>
      <Text style={{ color: C.primary, fontWeight: '600', fontSize: T.small }}>{label}</Text>
    </Pressable>
  );
}
