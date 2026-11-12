import { View } from 'react-native';

import { Text } from '@/components/Text';
import { Muted } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import type { Activation } from '@/lib/store';
import { C, T } from '@/theme';

/** Khung hiện mã kích hoạt cho bác sĩ đọc/đưa bệnh nhân; mã chỉ hiện một lần. */
export function ActivationCode({ activation }: { activation: Activation }) {
  return (
    <View style={{ gap: 8, backgroundColor: C.primarySoft, borderRadius: 12, padding: 14 }}>
      <Muted>Tên đăng nhập</Muted>
      <Text selectable style={{ fontSize: T.cardTitle, fontWeight: '700', color: C.text }}>{activation.username}</Text>
      <Muted>Mã kích hoạt</Muted>
      <Text selectable style={{ fontSize: 30, fontWeight: '700', letterSpacing: 6, color: C.primary }}>{activation.code}</Text>
      <Muted>
        Đưa hai thông tin này cho bệnh nhân. Bệnh nhân chọn “Kích hoạt tài khoản” ở màn đăng nhập, nhập mã và tự đặt mật khẩu.
        Mã dùng một lần, hết hạn ngày {fmtDate(activation.expiresAt.slice(0, 10))} và sẽ không hiện lại; nếu mất, cấp mã mới trong hồ sơ.
      </Muted>
    </View>
  );
}
