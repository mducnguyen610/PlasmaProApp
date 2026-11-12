import { Redirect } from 'expo-router';
import { useState } from 'react';

import { Consent } from '@/components/Consent';
import { Text } from '@/components/Text';
import { Button, Card, Field, Header, Muted, Screen } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

// Bệnh nhân do bác sĩ tạo hồ sơ: nhập mã kích hoạt bác sĩ đưa và tự đặt mật khẩu.
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
    <Screen header={<Header back title="Kích hoạt tài khoản" subtitle="Dùng mã bác sĩ đưa khi tạo hồ sơ" />}>
      <Card style={{ width: '100%', maxWidth: 600, alignSelf: 'center', gap: 16 }}>
        <Muted>Tên đăng nhập là mã hồ sơ (ví dụ bn004). Mã kích hoạt gồm 6 chữ số, chỉ dùng một lần.</Muted>
        <Field label="Tên đăng nhập" accessibilityLabel="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Ví dụ: bn004" />
        <Field label="Mã kích hoạt" accessibilityLabel="Mã kích hoạt" value={code} onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" placeholder="6 chữ số" />
        <Field label="Mật khẩu mới" accessibilityLabel="Mật khẩu mới" value={password} onChangeText={setPassword} secureTextEntry placeholder="Ít nhất 8 ký tự" />
        <Field label="Nhập lại mật khẩu" accessibilityLabel="Nhập lại mật khẩu" value={repeat} onChangeText={setRepeat} secureTextEntry />
        <Consent agreed={agreed} onChange={setAgreed} />
        {error ? <Text accessibilityRole="alert" style={{ color: C.red }}>{error}</Text> : null}
        <Button label="Kích hoạt và đăng nhập" icon="key-outline" loading={busy} disabled={!username.trim() || code.length !== 6 || !password || !agreed} onPress={submit} />
      </Card>
    </Screen>
  );
}
