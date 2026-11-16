import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Consent } from '@/components/Consent';
import { Text } from '@/components/Text';
import { Button, Card, Field, Header, Screen, SectionTitle } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

/**
 * C03 Kích hoạt. Bệnh nhân do bác sĩ tạo hồ sơ: nhập mã kích hoạt bác sĩ đưa và tự đặt mật khẩu.
 * Stage 9A (bố cục riêng): hai nhóm theo hai việc (nhập mã bác sĩ đưa, đặt mật khẩu); đoạn giới thiệu đầu thẻ chuyển thành gợi ý
 * ngay dưới từng ô; nút kích hoạt ở chân màn. Kiểm tra và điều kiện bật nút giữ nguyên.
 */
export default function Activate() {
  const { me, activateAccount } = useStore();
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (me) return <Redirect href="/" />;

  const submit = async () => {
    if (password !== repeat) return setError('Mật khẩu nhập lại chưa khớp.');
    setError(''); setBusy(true);
    try {
      await activateAccount({ username, code, password, agreed });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chưa kích hoạt được tài khoản.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      header={<Header back title="Kích hoạt tài khoản" subtitle="Dùng mã bác sĩ đưa khi tạo hồ sơ" />}
      footer={<View style={{ gap: 8 }}>
        {error ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{error}</Text> : null}
        <Button label="Kích hoạt và đăng nhập" icon="key-outline" loading={busy} disabled={!username.trim() || code.length !== 6 || !password || !agreed} onPress={submit} />
      </View>}>
      <SectionTitle>1. Mã từ bác sĩ</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label="Tên đăng nhập" accessibilityLabel="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Ví dụ: bn004" hint="Là mã hồ sơ bác sĩ đưa (ví dụ bn004)." />
        <Field label="Mã kích hoạt" accessibilityLabel="Mã kích hoạt" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6 chữ số" hint="Gồm 6 chữ số, chỉ dùng một lần." />
      </Card>
      <SectionTitle>2. Đặt mật khẩu</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label="Mật khẩu mới" accessibilityLabel="Mật khẩu mới" value={password} onChangeText={setPassword} secureTextEntry placeholder="Ít nhất 8 ký tự" />
        <Field label="Nhập lại mật khẩu" accessibilityLabel="Nhập lại mật khẩu" value={repeat} onChangeText={setRepeat} secureTextEntry />
      </Card>
      <Card style={{ gap: 4 }}>
        <Consent agreed={agreed} onChange={setAgreed} />
      </Card>
    </Screen>
  );
}
