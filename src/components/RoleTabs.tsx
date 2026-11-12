import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { FAB_RISE, TAB_BAR_HEIGHT, type IconName } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { C, G, radius } from '@/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type TabDef = { name: string; title: string; icon: IconName; iconOn: IconName; badge?: number };

/** Lề ngang của thanh tab: nhãn ngoài cùng ("Trang chủ", "Tài khoản") cách mép màn hình tối thiểu 16 pt. */
const BAR_SIDE = 12;
/** Chỗ dành cho nút giữa và nhãn của nó. */
const FAB_SLOT = 80;

/** Thanh tab của mẫu Fitness App: nền trắng, bo trên, nút tròn gradient nổi ở giữa, có nhãn bên dưới. */
function BottomBar({ state, emitter, navigateToTab, tabs, fab }: BottomTabBarProps & { tabs: TabDef[]; fab?: { icon: IconName; onPress: () => void; label: string; title: string } }) {
  const insets = useSafeAreaInsets();
  // Máy hẹp (dưới 380 pt, ví dụ 360 pt): thu ô nút giữa (giữ lề 12 pt theo TC13), giảm cỡ nhãn 1 pt để "Trang chủ", "Bệnh nhân" không bị cắt.
  // Trên máy thật nhãn còn tự thu (adjustsFontSizeToFit) khi người dùng đặt cỡ chữ lớn.
  const narrow = useWindowDimensions().width < 380;
  const labelSize = narrow ? 12 : 13;
  const fabSlot = narrow ? 72 : FAB_SLOT;
  const items = state.routes.map((r, i) => ({ route: r, index: i, def: tabs.find((t) => t.name === r.name)! })).filter((x) => x.def);
  const half = Math.ceil(items.length / 2);
  const render = (x: (typeof items)[number]) => {
    const on = state.index === x.index;
    return (
      <Pressable
        key={x.route.key}
        accessibilityRole="tab"
        accessibilityLabel={x.def.badge ? `${x.def.title}, ${x.def.badge} mục mới` : x.def.title}
        accessibilityState={{ selected: on }}
        onPress={() => {
          const ev = emitter.emit({ type: 'tabPress', target: x.route.key, canPreventDefault: true });
          if (!on && !ev.defaultPrevented) navigateToTab(x.route.key);
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 10 }}>
        <View>
          <Ionicons name={on ? x.def.iconOn : x.def.icon} size={25} color={on ? C.primary : C.textFaint} />
          {x.def.badge ? (
            <View style={{ position: 'absolute', top: -4, right: -10, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: C.onPrimary, fontSize: 13, fontWeight: '700' }}>{x.def.badge}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3} style={{ fontSize: labelSize, color: on ? C.primary : C.textFaint, fontWeight: on ? '700' : '500' }}>{x.def.title}</Text>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: on ? C.primary : 'transparent' }} />
      </Pressable>
    );
  };
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }} pointerEvents="box-none">
      <View style={{ width: '100%', maxWidth: 1080 }}>
      <View
        style={{
          flexDirection: 'row', backgroundColor: C.card, paddingBottom: insets.bottom, paddingHorizontal: BAR_SIDE, minHeight: TAB_BAR_HEIGHT + insets.bottom,
          borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet,
          shadowColor: C.grey, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, elevation: 12,
        }}>
        {items.slice(0, half).map(render)}
        {fab && (
          // Nhãn của nút giữa nằm trong thanh, cùng hàng với nhãn các tab, để người dùng biết nút mở gì.
          <View style={{ width: fabSlot, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 10 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {/* Cùng khung với một tab (chỗ biểu tượng 25, nhãn, chấm 5) để nhãn thẳng hàng với các nhãn khác. */}
            <View style={{ height: 25 }} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3} style={{ fontSize: labelSize, color: C.primary, fontWeight: '600' }}>{fab.title}</Text>
            <View style={{ height: 5 }} />
          </View>
        )}
        {items.slice(half).map(render)}
      </View>
      {fab && (
        // Giữ vị trí nút giữa (quyết định 03/11/2026). Bỏ vòng nền xám 76 pt và bóng lan rộng màu xanh:
        // vòng nền che chữ phía sau, bóng 16 pt lệch xuống dưới phải lan lên nội dung như một vầng sáng.
        <View style={{ position: 'absolute', top: -FAB_RISE, left: 0, right: 0, alignItems: 'center' }} pointerEvents="box-none">
          <Pressable
            onPress={fab.onPress}
            accessibilityRole="button"
            accessibilityLabel={fab.label}
            hitSlop={6}
            style={({ pressed }) => ({
              borderRadius: 30, borderWidth: 4, borderColor: C.card, transform: [{ scale: pressed ? 0.94 : 1 }],
              shadowColor: C.grey, shadowOpacity: 0.25, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 4,
            })}>
            <LinearGradient colors={G.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={fab.icon} size={28} color={C.onPrimary} />
            </LinearGradient>
          </Pressable>
        </View>
      )}
      </View>
    </View>
  );
}

/** Thanh tab theo vai trò; chặn truy cập nếu tài khoản không đúng vai trò (đặc tả mục 9). */
export function RoleTabs({ role, tabs, fab }: { role: Role; tabs: TabDef[]; fab?: { icon: IconName; onPress: () => void; label: string; title: string } }) {
  const { me } = useStore();
  if (!me || me.role !== role) return <Redirect href="/" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <BottomBar {...props} tabs={tabs} fab={fab} />}>
      {tabs.map((t) => (
        <Tabs.Screen key={t.name} name={t.name} options={{ title: t.title }} />
      ))}
    </Tabs>
  );
}
