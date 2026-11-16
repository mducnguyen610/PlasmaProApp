import Ionicons from '@expo/vector-icons/Ionicons';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { FAB_RISE, TAB_BAR_HEIGHT, useLayoutTier, type IconName } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { C, radius, size, T } from '@/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type TabDef = { name: string; title: string; icon: IconName; iconOn: IconName; badge?: number };

/** Lề ngang của thanh tab: nhãn ngoài cùng ("Trang chủ", "Tài khoản") cách mép màn hình tối thiểu 16 pt. */
const BAR_SIDE = 12;
/** Chỗ dành cho nút giữa và nhãn của nó. */
const FAB_SLOT = 80;

/**
 * Thanh tab ở đáy (điện thoại, máy tính bảng). Stage 9A: nền trắng phẳng, viền mảnh trên, vạch chỉ báo trên mục đang chọn,
 * nút giữa nền navy đặc (giữ vị trí theo quyết định 03/11/2026). Từ 1024 px chuyển thành thanh bên trái (SideBar).
 */
function BottomBar({ state, emitter, navigateToTab, tabs, fab }: BottomTabBarProps & { tabs: TabDef[]; fab?: { icon: IconName; onPress: () => void; label: string; title: string } }) {
  const insets = useSafeAreaInsets();
  // Máy hẹp (dưới 380 pt, ví dụ 360 pt): thu ô nút giữa (giữ lề 12 pt theo TC13), giảm cỡ nhãn 1 pt để "Trang chủ", "Bệnh nhân" không bị cắt.
  // Trên máy thật nhãn còn tự thu (adjustsFontSizeToFit) khi người dùng đặt cỡ chữ lớn.
  const winW = useWindowDimensions().width;
  const narrow = winW < 380;
  const labelSize = narrow ? 12 : 13;
  // Stage 9A: dưới 340 pt (máy 320) nhãn mục chọn không in đậm (đã có vạch chỉ báo, biểu tượng đặc, màu), ô chữ của nút giữa thu còn 60 để "Trang chủ", "Bệnh nhân" không bị cắt; nút tròn vẫn 56 nhô trên thanh.
  const fabSlot = winW < 340 ? 60 : narrow ? 72 : FAB_SLOT;
  const tier = useLayoutTier();
  const items = state.routes.map((r, i) => ({ route: r, index: i, def: tabs.find((t) => t.name === r.name)! })).filter((x) => x.def);
  if (tier === 'desktop') return <SideBar items={items} state={state} emitter={emitter} navigateToTab={navigateToTab} fab={fab} />;
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
        {/* Vạch chỉ báo ở mép trên mục đang chọn, cùng với biểu tượng đặc và chữ đậm (không chỉ dựa vào màu). */}
        <View style={{ position: 'absolute', top: 0, width: 28, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: on ? C.primary : 'transparent' }} />
        <View>
          <Ionicons name={on ? x.def.iconOn : x.def.icon} size={24} color={on ? C.primary : C.textFaint} />
          {x.def.badge ? (
            <View style={{ position: 'absolute', top: -4, right: -10, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: C.onPrimary, fontSize: T.caption, fontWeight: '700' }}>{x.def.badge}</Text>
            </View>
          ) : null}
        </View>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3} style={{ fontSize: labelSize, color: on ? C.primary : C.textFaint, fontWeight: on && winW >= 340 ? '700' : '500' }}>{x.def.title}</Text>
        <View style={{ height: 5 }} />
      </Pressable>
    );
  };
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' }} pointerEvents="box-none">
      <View style={{ width: '100%', maxWidth: 1080 }}>
      <View
        style={{
          flexDirection: 'row', backgroundColor: C.card, paddingBottom: insets.bottom, paddingHorizontal: BAR_SIDE, minHeight: TAB_BAR_HEIGHT + insets.bottom,
          borderTopWidth: 1, borderTopColor: C.border,
          shadowColor: C.navy, shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: -2 }, elevation: 12,
        }}>
        {items.slice(0, half).map(render)}
        {fab && (
          // Nhãn của nút giữa nằm trong thanh, cùng hàng với nhãn các tab, để người dùng biết nút mở gì.
          <View style={{ width: fabSlot, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 10 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {/* Cùng khung với một tab (chỗ biểu tượng 25, nhãn, chấm 5) để nhãn thẳng hàng với các nhãn khác. */}
            <View style={{ height: 25 }} />
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.3} style={{ fontSize: labelSize, color: C.navy, fontWeight: '600' }}>{fab.title}</Text>
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
              shadowColor: C.navy, shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
            })}>
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={fab.icon} size={26} color={C.onPrimary} />
            </View>
          </Pressable>
        </View>
      )}
      </View>
    </View>
  );
}

type Item = { route: BottomTabBarProps['state']['routes'][number]; index: number; def: TabDef };

/**
 * Thanh bên trái ở màn rộng (từ 1024 px, Stage 9A): nền navy liền với thanh nhận diện của màn chính, thương hiệu ở trên,
 * hành động của nút giữa thành nút đầu tiên, các mục điều hướng xếp dọc. Cùng tab, cùng sự kiện tabPress như thanh đáy.
 */
function SideBar({ items, state, emitter, navigateToTab, fab }: Pick<BottomTabBarProps, 'state' | 'emitter' | 'navigateToTab'> & { items: Item[]; fab?: { icon: IconName; onPress: () => void; label: string; title: string } }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: size.sidebar, backgroundColor: C.navy, paddingTop: insets.top + 20, paddingHorizontal: 12, gap: 4, borderRightWidth: 1, borderRightColor: C.onNavyHairline }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8, marginBottom: 20 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <View style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: C.brandMint, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="pulse" size={16} color={C.navy} /></View>
        <Text style={{ color: C.onPrimary, fontWeight: '700', fontSize: T.body }}>Plasma Pro</Text>
      </View>
      {fab ? (
        <Pressable onPress={fab.onPress} accessibilityRole="button" accessibilityLabel={fab.label}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.m, backgroundColor: pressed ? C.primaryPressed : C.primary, marginBottom: 16 })}>
          <Ionicons name={fab.icon} size={20} color={C.onPrimary} />
          <Text style={{ color: C.onPrimary, fontWeight: '600', fontSize: T.small }}>{fab.title}</Text>
        </Pressable>
      ) : null}
      {items.map((x) => {
        const on = state.index === x.index;
        return (
          <Pressable key={x.route.key} accessibilityRole="tab" accessibilityLabel={x.def.badge ? `${x.def.title}, ${x.def.badge} mục mới` : x.def.title} accessibilityState={{ selected: on }}
            onPress={() => {
              const ev = emitter.emit({ type: 'tabPress', target: x.route.key, canPreventDefault: true });
              if (!on && !ev.defaultPrevented) navigateToTab(x.route.key);
            }}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.m, backgroundColor: on ? C.onNavyTint : pressed ? C.onNavyHairline : 'transparent' })}>
            <View style={{ position: 'absolute', left: 0, top: 10, bottom: 10, width: 3, borderRadius: 2, backgroundColor: on ? C.brandMint : 'transparent' }} />
            <Ionicons name={on ? x.def.iconOn : x.def.icon} size={20} color={on ? C.onPrimary : C.onPrimarySoft} />
            <Text style={{ flex: 1, color: on ? C.onPrimary : C.onPrimarySoft, fontWeight: on ? '700' : '500', fontSize: T.small }}>{x.def.title}</Text>
            {x.def.badge ? (
              <View style={{ minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                <Text style={{ color: C.onPrimary, fontSize: T.min, fontWeight: '700' }}>{x.def.badge}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
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
