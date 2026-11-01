import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import type { IconName } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { C, G } from '@/theme';

type BottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];
type TabDef = { name: string; title: string; icon: IconName; iconOn: IconName; badge?: number };

/** Thanh tab của mẫu Fitness App: nền trắng, bo trên, nút tròn gradient nổi ở giữa. */
function BottomBar({ state, navigation, tabs, fab }: BottomTabBarProps & { tabs: TabDef[]; fab?: { icon: IconName; onPress: () => void; label: string } }) {
  const insets = useSafeAreaInsets();
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
          const ev = navigation.emit({ type: 'tabPress', target: x.route.key, canPreventDefault: true });
          if (!on && !ev.defaultPrevented) navigation.navigate(x.route.name);
        }}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, paddingTop: 10 }}>
        <View>
          <Ionicons name={on ? x.def.iconOn : x.def.icon} size={25} color={on ? C.primary : C.textFaint} />
          {x.def.badge ? (
            <View style={{ position: 'absolute', top: -4, right: -10, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <Text style={{ color: C.onPrimary, fontSize: 12, fontWeight: '700' }}>{x.def.badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, color: on ? C.primary : C.textFaint, fontWeight: on ? '700' : '500' }}>{x.def.title}</Text>
        <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: on ? C.primary : 'transparent' }} />
      </Pressable>
    );
  };
  return (
    <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
      <View
        style={{
          flexDirection: 'row', backgroundColor: C.card, paddingBottom: insets.bottom, minHeight: 62 + insets.bottom,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          shadowColor: C.grey, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: -2 }, elevation: 12,
        }}>
        {items.slice(0, half).map(render)}
        {fab && <View style={{ width: 84 }} />}
        {items.slice(half).map(render)}
      </View>
      {fab && (
        <View style={{ position: 'absolute', top: -30, left: 0, right: 0, alignItems: 'center' }} pointerEvents="box-none">
          <View style={{ width: 76, height: 76, borderRadius: 38, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Pressable
              onPress={fab.onPress}
              accessibilityRole="button"
              accessibilityLabel={fab.label}
              style={({ pressed }) => ({
                borderRadius: 30, transform: [{ scale: pressed ? 0.94 : 1 }],
                shadowColor: C.primary, shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 8, height: 16 }, elevation: 8,
              })}>
              <LinearGradient colors={G.fab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name={fab.icon} size={28} color={C.onPrimary} />
              </LinearGradient>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

/** Thanh tab theo vai trò; chặn truy cập nếu tài khoản không đúng vai trò (đặc tả mục 9). */
export function RoleTabs({ role, tabs, fab }: { role: Role; tabs: TabDef[]; fab?: { icon: IconName; onPress: () => void; label: string } }) {
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
