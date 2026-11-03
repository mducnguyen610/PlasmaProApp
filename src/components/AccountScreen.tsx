import { router } from 'expo-router';
import { Switch, View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Chip, Header, IconBadge, InfoRow, Muted, Screen } from '@/components/ui';
import { confirm } from '@/lib/dialog';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

const ROLE_LABEL = { doctor: 'Bác sĩ', patient: 'Bệnh nhân', admin: 'Quản trị kỹ thuật' } as const;

export function AccountScreen() {
  const { data, me, logout, resetDemo, setResearchConsent } = useStore();
  if (!me) return null;
  return (
    <Screen header={<Header title="Tài khoản" subtitle={ROLE_LABEL[me.role]} />}>
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
      </Card>

      <Card onPress={() => router.push('/terms')}>
        <Text style={{ fontWeight: '700' }}>Điều khoản sử dụng & quyền riêng tư</Text>
        <Muted>Đã đồng ý: {me.termsAcceptedAt ? new Date(me.termsAcceptedAt).toLocaleString('vi-VN') : 'Chưa ghi nhận theo phiên bản mới'}</Muted>
      </Card>
      {me.role === 'patient' && <Card>
        <Text style={{ fontWeight: '700' }}>Đồng ý sử dụng ảnh cho nghiên cứu</Text>
        <Muted>Tùy chọn. Chỉ chia sẻ ảnh đã được bác sĩ kiểm tra và bỏ thông tin nhận dạng. Rút đồng ý sẽ ngừng chia sẻ mới; không tự thu hồi các tệp đã tải.</Muted>
        <Switch accessibilityLabel="Đồng ý nghiên cứu" value={!!data.patients.find(p => p.id === me.patientId)?.researchConsent} onValueChange={setResearchConsent} />
      </Card>}
      {me.role === 'patient' && <Card onPress={() => router.push({ pathname: '/onboarding', params: { review: '1' } })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge icon="help-circle-outline" tone="green" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: C.text }}>Xem lại hướng dẫn sử dụng</Text>
            <Muted>Thiết bị là gì, mỗi ngày làm gì, báo triệu chứng ở đâu, khi khẩn cấp</Muted>
          </View>
        </View>
      </Card>}
      <Card onPress={() => router.push('/compliance')}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge icon="document-text-outline" tone="teal" />
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: C.text }}>Căn cứ pháp lý và tuân thủ</Text>
            <Muted>Văn bản của Bộ Y tế và pháp luật liên quan áp dụng cho ứng dụng</Muted>
          </View>
        </View>
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
