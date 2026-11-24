import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { Screen, type IconName } from '@/components/ui';
import { doctorTasks } from '@/lib/doctorTasks';
import { useStore } from '@/lib/store';
import { C, radius, T } from '@/theme';

type Tile = { key: string; title: string; icon: IconName; href: string };

/**
 * Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 2; TC-6, TC-7, TC-12, M10): Trang chủ bác sĩ.
 * Thanh trên: tên ứng dụng bên trái, chuông thông báo bên phải (chấm đỏ khi có việc chờ). Dải chào kèm hình minh họa.
 * Bốn ô 2x2: Bệnh nhân, Chụp ảnh và gán nhãn, Thiết bị, Cài đặt; mỗi ô chỉ có tên và biểu tượng, không có số.
 * Bên dưới các ô không có gì thêm. Không có thanh dưới (giả định 1 mục 8: Cài đặt là ô thứ 4).
 */
const TILES: Tile[] = [
  { key: 'patients', title: 'Bệnh nhân', icon: 'people-outline', href: '/doctor/patients' },
  { key: 'capture', title: 'Chụp ảnh và gán nhãn', icon: 'camera-outline', href: '/doctor/dataset' },
  { key: 'devices', title: 'Thiết bị', icon: 'hardware-chip-outline', href: '/doctor/devices' },
  { key: 'settings', title: 'Cài đặt', icon: 'settings-outline', href: '/doctor/account' },
];

export default function DoctorHome() {
  const { data, me } = useStore();
  const insets = useSafeAreaInsets();
  const tasks = doctorTasks(data, me?.id);
  const name = (me?.name ?? '').replace(/^BS\.?\s+/i, '');
  return (
    <Screen header={
      <View style={{ backgroundColor: C.navy, paddingTop: insets.top + 12, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 720, alignSelf: 'center' }}>
          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: C.brandMint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="pulse" size={18} color={C.navy} /></View>
          <Text accessibilityRole="header" style={{ flex: 1, color: C.onPrimary, fontWeight: '700', fontSize: T.titleM }}>Plasma Pro</Text>
          <Pressable testID="chuong-thong-bao" onPress={() => router.push('/notifications')} accessibilityRole="button"
            accessibilityLabel={tasks.total ? `Thông báo, có ${tasks.total} việc chờ` : 'Thông báo, không có việc chờ'} hitSlop={8}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.onNavyTint : 'transparent' })}>
            <Ionicons name="notifications-outline" size={24} color={C.onPrimary} />
            {tasks.total > 0 && <View testID="cham-do" style={{ position: 'absolute', top: 9, right: 10, width: 10, height: 10, borderRadius: 5, backgroundColor: C.red, borderWidth: 1.5, borderColor: C.navy }} />}
          </Pressable>
        </View>
      </View>
    }>
      {/* TC-6: dải chào có hình minh họa. */}
      <View testID="dai-chao" style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.card, backgroundColor: C.primarySoft }}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={{ color: C.text, fontSize: T.titleM, fontWeight: '700' }}>{`Bác sĩ ${name}, chào mừng đến Plasma Pro`}</Text>
        </View>
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="medkit" size={34} color={C.primary} />
          <View style={{ position: 'absolute', right: 4, bottom: 6, width: 26, height: 26, borderRadius: 13, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="pulse" size={15} color={C.brandMint} />
          </View>
        </View>
      </View>
      {/* TC-2, TC-12: 4 ô 2x2, chỉ tên và biểu tượng. */}
      <View testID="o-chuc-nang" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {TILES.map((t) => (
          <Pressable key={t.key} testID={`o-${t.key}`} accessibilityRole="button" accessibilityLabel={t.title} onPress={() => router.navigate(t.href as never)}
            style={({ pressed }) => ({ flexGrow: 1, flexBasis: '45%', minHeight: 128, borderRadius: radius.card, borderWidth: 1, borderColor: C.border, backgroundColor: pressed ? C.primarySoft : C.card, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 })}>
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={t.icon} size={28} color={C.primary} />
            </View>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: T.body, textAlign: 'center' }}>{t.title}</Text>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
