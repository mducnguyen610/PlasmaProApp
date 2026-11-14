import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/Text';
import { Disclosure, TextLink } from '@/components/ui';
import { methodLabel } from '@/lib/areaProgress';
import { fmtDate, fmtDateTime, TREND } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import type { DeviceSession, Evaluation, WoundImage } from '@/lib/types';
import { C, T } from '@/theme';

type Item = { key: string; at: string; icon: keyof typeof Ionicons.glyphMap; kind: string; text: string; sub?: string; imageId?: string };
const SESSION_STATUS = { completed: 'Đủ thời gian', interrupted: 'Bị ngắt giữa chừng', over_limit: 'Ngắt do vượt ngưỡng' } as const;

/**
 * P2-07a (R2-07): dòng thời gian CHỈ của một vết thương, chỉ đọc. Gồm lần đo và ảnh chưa đo (từ WoundImage),
 * nhận xét của bác sĩ đã công bố, buổi điều trị có woundId đúng vết. Buổi không gắn vết không đưa vào (A26).
 * Mặc định thu gọn, 10 mục gần nhất, "Xem thêm".
 */
export function WoundTimeline({ images, evaluations, sessions, doctorName }: {
  images: WoundImage[]; evaluations: Evaluation[]; sessions: DeviceSession[]; doctorName: (id: string) => string | undefined;
}) {
  const [all, setAll] = useState(false);
  const items: Item[] = [
    ...images.filter((im) => im.status !== 'excluded').map((im): Item => {
      const date = im.capture?.sourceDateKnown === false ? null : im.captureDate;
      return im.status === 'labeled' && im.areaCm2 !== null
        ? { key: 'i' + im.id, at: date ?? '', icon: 'analytics-outline', kind: 'Lần đo', text: `Đo ${formatAreaDisplay(im.areaCm2)}`, sub: `${date ? fmtDate(date) : 'Ngày chụp chưa rõ'} · ${methodLabel(im.measureMethod)}`, imageId: im.id }
        : { key: 'i' + im.id, at: date ?? '', icon: 'image-outline', kind: 'Ảnh', text: 'Ảnh, chưa có số đo', sub: date ? fmtDate(date) : 'Ngày chụp chưa rõ', imageId: im.id };
    }),
    ...evaluations.map((e): Item => ({ key: 'e' + e.id, at: e.date, icon: 'clipboard-outline', kind: 'Nhận xét', text: `Nhận xét của bác sĩ: ${TREND[e.trend].label.toLowerCase()}`, sub: `${fmtDate(e.date)} · ${doctorName(e.doctorId) ?? 'Bác sĩ'}` })),
    ...sessions.map((s): Item => ({ key: 's' + s.sessionId + s.start, at: s.start, icon: 'flash-outline', kind: 'Buổi điều trị', text: `Buổi điều trị ${s.durationMin} phút`, sub: `${fmtDateTime(s.start)} · ${SESSION_STATUS[s.status]}` })),
  ].sort((a, b) => b.at.localeCompare(a.at) || a.key.localeCompare(b.key));
  const shown = all ? items : items.slice(0, 10);
  return (
    <Disclosure icon="git-commit-outline" title={`Lịch sử vết thương (${items.length})`} summary={items[0] ? `Gần nhất: ${items[0].kind.toLowerCase()} ${items[0].sub?.split(' · ')[0] ?? ''}` : 'Chưa có mục nào'}>
      {shown.map((it, i) => {
        const body = (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Ionicons name={it.icon} size={22} color={C.textSoft} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontWeight: '600' }}>{it.text}</Text>
              <Text style={{ color: C.textSoft, fontSize: T.small }}>{`${it.kind} · ${it.sub ?? ''}`}</Text>
            </View>
            {it.imageId ? <Ionicons name="chevron-forward" size={18} color={C.textFaint} /> : null}
          </View>
        );
        const style = [{ minHeight: 44, paddingVertical: 8, justifyContent: 'center' as const }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }];
        return it.imageId
          ? <Pressable key={it.key} testID="muc-lich-su" accessibilityRole="button" accessibilityLabel={`${it.kind}: ${it.text}, ${it.sub}. Mở ảnh`} onPress={() => router.push({ pathname: '/images/[id]', params: { id: it.imageId! } })} style={style}>{body}</Pressable>
          : <View key={it.key} testID="muc-lich-su" accessible accessibilityLabel={`${it.kind}: ${it.text}, ${it.sub}`} style={style}>{body}</View>;
      })}
      {items.length > 10 && <TextLink label={all ? 'Thu gọn' : `Xem thêm (${items.length - 10})`} onPress={() => setAll(!all)} />}
    </Disclosure>
  );
}
