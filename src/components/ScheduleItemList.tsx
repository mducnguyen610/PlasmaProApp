import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/Text';
import { Chip, Muted } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { SLOT_STATUS, type ScheduleItem } from '@/lib/sessionSchedule';
import type { Wound } from '@/lib/types';
import { C, numeric, T } from '@/theme';

/** Trạng thái còn có thể nạp liệu trình cho phiên (bệnh nhân bấm để nạp). */
export const LOADABLE = new Set(['due_today', 'upcoming']);

/**
 * 27/11/2026 (FR6, UR1): danh sách phiên theo lịch của mọi vết, mỗi dòng một phiên xác định bằng (mã phác đồ, ngày) do bác sĩ lập.
 * Thứ tự theo ngày rồi mã vết, chỉ để dễ đọc; ứng dụng không chọn vết nào phải điều trị trước.
 * Bấm một phiên hôm nay mở màn nạp liệu trình với đúng vết, đúng phiên bản phác đồ, đúng ngày (không đổi sang vết khác).
 */
export function ScheduleItemList({ items, wounds, today, showDate, empty }: { items: ScheduleItem[]; wounds: Wound[]; today: string; showDate?: boolean; empty?: string }) {
  if (!items.length) return <Muted>{empty ?? 'Không có phiên theo lịch.'}</Muted>;
  return (
    <View style={{ gap: 2 }}>
      {items.map((it) => {
        const w = wounds.find((x) => x.id === it.woundId);
        const st = SLOT_STATUS[it.status];
        const canLoad = it.date === today && LOADABLE.has(it.status) && !!it.versionId;
        const label = `${showDate ? fmtDate(it.date) + ', ' : ''}vết ${it.woundCode}${w ? ', ' + w.location : ''}, phác đồ phiên bản ${it.version ?? ''}, ${st.label}${canLoad ? '. Chạm để nạp liệu trình' : ''}`;
        return (
          <Pressable key={it.key} testID={`lich-${it.woundCode}-${it.date}`} disabled={!canLoad} accessibilityRole={canLoad ? 'button' : undefined} accessibilityLabel={label}
            onPress={() => router.push({ pathname: '/connect-device', params: { woundId: it.woundId, planId: it.versionId!, date: it.date } })}
            style={({ pressed }) => ({ minHeight: 56, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.divider, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pressed ? C.surfaceMuted : 'transparent' })}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.text, fontWeight: '700' }}>{`${it.woundCode}${w ? ': ' + w.location : ''}`}</Text>
              <Text style={[{ color: C.textSoft, fontSize: T.caption }, numeric]}>
                {`${showDate ? fmtDate(it.date) + ' · ' : ''}Phác đồ phiên bản ${it.version ?? '?'}${it.originDate ? ` · hoãn từ ${fmtDate(it.originDate)}` : ''}${it.extra ? ' · ngoài lịch' : ''}`}
              </Text>
            </View>
            <Chip label={st.label} tone={st.tone} />
            {canLoad && <Ionicons name="chevron-forward" size={18} color={C.primary} />}
          </Pressable>
        );
      })}
      <Muted>Thứ tự theo mã vết, không phải thứ tự ưu tiên điều trị.</Muted>
    </View>
  );
}
