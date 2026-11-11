import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from './Text';
import { Muted } from './ui';
import { C } from '@/theme';

export function CheckRow({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return <Pressable accessibilityRole="checkbox" aria-checked={checked} accessibilityState={{ checked }} accessibilityLabel={label} onPress={() => onChange(!checked)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 10, minHeight: 44 }}>
    <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={23} color={checked ? C.primary : C.textSoft} />
    <Text style={{ flex: 1, lineHeight: 21 }}>{label}</Text>
  </Pressable>;
}
/** Dùng ở màn đăng nhập khi tài khoản đã đồng ý đúng phiên bản điều khoản hiện hành: chỉ còn đường dẫn để đọc lại. */
export function TermsLink() {
  return <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/terms')} style={{ minHeight: 44, justifyContent: 'center' }}>
    <Text style={{ color: C.primary, fontWeight: '500' }}>Điều khoản sử dụng và Chính sách quyền riêng tư</Text>
  </Pressable>;
}
export function Consent({ agreed, onChange }: { agreed: boolean; onChange: (value: boolean) => void }) {
  return <View style={{ gap: 4 }}>
    <CheckRow checked={agreed} onChange={onChange} label="Tôi đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư" />
    <Pressable accessibilityRole="link" hitSlop={8} onPress={() => router.push('/terms')} style={{ minHeight: 44, justifyContent: 'center' }}>
      <Text style={{ color: C.primary, fontWeight: '500' }}>Đọc điều khoản và chính sách</Text>
    </Pressable>
    <Muted>Việc dùng ảnh để nghiên cứu cần sự đồng ý riêng, không bắt buộc để sử dụng ứng dụng.</Muted>
  </View>;
}

