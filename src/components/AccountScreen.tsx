import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Divider, Chip, Disclosure, Header, IconBadge, InfoRow, Muted, Screen, SwitchRow, type IconName } from '@/components/ui';
import { confirm } from '@/lib/dialog';
import { localDay } from '@/lib/course';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/lib/store';
import { C } from '@/theme';


/** Một dòng cài đặt: biểu tượng, tên, giá trị ngắn, mũi tên. Cao tối thiểu 52. */
function SettingRow({ icon, title, value, onPress, last }: { icon: IconName; title: string; value?: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={value ? `${title}, ${value}` : title}
      style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderBottomWidth: last ? 0 : 1, borderBottomColor: C.border, opacity: pressed ? 0.7 : 1 })}>
      <Ionicons name={icon} size={22} color={C.primary} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '600' }}>{title}</Text>
        {value ? <Text style={{ color: C.textSoft, fontSize: 14 }}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={20} color={C.textFaint} />
    </Pressable>
  );
}

export function AccountScreen() {
  const { data, me, logout, resetDemo, setResearchConsent } = useStore();
  if (!me) return null;
  return (
    <Screen header={<Header title="Cá nhân" />}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge icon="person" size={48} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: C.text }}>{me.name}</Text>
            <Text style={{ color: C.textSoft }}>@{me.username}{me.title ? ` · ${me.title}` : ''}</Text>
          </View>
        </View>
        {me.role === 'doctor' && (
          <InfoRow
            label="Quyền xuất dữ liệu nghiên cứu"
            value={<Chip label={me.researchAccess ? 'Được cấp' : 'Chưa cấp'} tone={me.researchAccess ? 'green' : 'gray'} />}
          />
        )}
        {/* Một thẻ: hồ sơ, các dòng cài đặt và (bệnh nhân) đồng ý nghiên cứu, tách bằng đường kẻ. */}
        <Divider />
        <View>
        <SettingRow icon="shield-checkmark-outline" title="Điều khoản và quyền riêng tư" value={me.termsAcceptedAt ? `Đã đồng ý ${fmtDate(localDay(me.termsAcceptedAt))}` : 'Chưa đồng ý bản mới'} onPress={() => router.push('/terms')} />
        {me.role === 'patient' && <SettingRow icon="help-circle-outline" title="Hướng dẫn sử dụng" onPress={() => router.push({ pathname: '/onboarding', params: { review: '1' } })} />}
        <SettingRow icon="document-text-outline" title="Căn cứ pháp lý" onPress={() => router.push('/compliance')} last />
        </View>
      {me.role === 'patient' && <>
        <Divider />
        <SwitchRow label="Dùng ảnh cho nghiên cứu" detail={data.patients.find(p => p.id === me.patientId)?.researchConsent ? 'Đang cho phép' : 'Không cho phép'} value={!!data.patients.find(p => p.id === me.patientId)?.researchConsent} onChange={setResearchConsent} />
        <Disclosure title="Điều gì được chia sẻ?">
          <Muted>Tùy chọn. Chỉ chia sẻ ảnh đã được bác sĩ kiểm tra và bỏ thông tin nhận dạng. Rút đồng ý sẽ ngừng chia sẻ mới; không tự thu hồi các tệp đã tải.</Muted>
        </Disclosure>
      </>}
      </Card>

      {/* Khôi phục xóa dữ liệu của mọi vai trò trên máy, nên chỉ quản trị kỹ thuật được thấy. */}
      {me?.role === 'admin' && <Card>
        <Text style={{ fontWeight: '700', color: C.text }}>Bản demo</Text>
        <Muted>Dữ liệu lưu cục bộ trên máy, chưa đồng bộ máy chủ. Có thể khôi phục bộ dữ liệu mô phỏng ban đầu.</Muted>
        <Button
          label="Khôi phục dữ liệu mô phỏng"
          variant="secondary"
          icon="refresh"
          onPress={() => confirm('Khôi phục dữ liệu', 'Mọi thay đổi trong bản demo sẽ mất.', resetDemo)}
        />
      </Card>}

      <Button
        label="Đăng xuất"
        variant="danger"
        icon="log-out-outline"
        onPress={() => {
          logout();
          router.replace('/');
        }}
      />
    </Screen>
  );
}
