import Ionicons from '@expo/vector-icons/Ionicons';
import { router, usePathname } from 'expo-router';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { Button, Card, Header, Muted, Screen } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C, numeric, radius, T } from '@/theme';

const HOME = { doctor: '/doctor', patient: '/patient', admin: '/admin' } as const;

/**
 * Màn không tìm thấy (B15, Stage 9A). Trước đây src/app chưa có +not-found.tsx nên Expo Router hiện trang mặc định
 * "Unmatched Route" bằng tiếng Anh kèm liên kết Sitemap lộ danh sách route. Màn này chỉ hiển thị, không đổi quyền:
 * "Về trang chủ" mở trang chủ đúng vai trò đang đăng nhập, chưa đăng nhập thì về màn đăng nhập.
 */
export default function NotFound() {
  const { me } = useStore();
  const path = usePathname();
  const home = me ? HOME[me.role] : '/';
  return (
    <Screen header={<Header title="Không tìm thấy trang" back />}>
      <Card style={{ alignItems: 'center', paddingVertical: 32, gap: 14 }}>
        <View style={{ width: 56, height: 56, borderRadius: radius.m + 4, backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="compass-outline" size={28} color={C.primary} />
        </View>
        <Text accessibilityRole="header" style={{ fontSize: T.titleL, fontWeight: '700', color: C.text, textAlign: 'center' }}>Trang này không có trong ứng dụng</Text>
        <Muted style={{ textAlign: 'center', maxWidth: 360 }}>Liên kết có thể đã cũ, gõ sai, hoặc hồ sơ đã bị xóa khỏi máy này. Dữ liệu của bạn không bị ảnh hưởng.</Muted>
        <Text selectable style={[{ fontSize: T.caption, color: C.textSoft, backgroundColor: C.surfaceMuted, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.s }, numeric]}>{path}</Text>
      </Card>
      <Button label={me ? 'Về trang chủ' : 'Về màn đăng nhập'} icon="home-outline" onPress={() => router.replace(home)} />
      {router.canGoBack() ? <Button label="Quay lại trang trước" variant="secondary" icon="arrow-back" onPress={() => router.back()} /> : null}
    </Screen>
  );
}
