import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Consent, TermsLink } from '@/components/Consent';
import { Text } from '@/components/Text';
import { Button, Card, Field, Muted, Choices } from '@/components/ui';
import { DEMO_PASSWORD, isSampleAccount } from '@/lib/auth';
import { TermsRequiredError, useStore } from '@/lib/store';
import { C, cardShape, G, T } from '@/theme';

const HOME = { doctor: '/doctor', patient: '/patient', admin: '/admin' } as const;
export default function Login() {
  const { me, data, authenticate } = useStore();
  const insets = useSafeAreaInsets();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [agreed, setAgreed] = useState(false);
  // Ô đồng ý chỉ hiện khi tài khoản chưa đồng ý phiên bản điều khoản hiện hành.
  const [termsNotice, setTermsNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (me) return <Redirect href={HOME[me.role]} />;
  const submit = async () => {
    setBusy(true); setError('');
    try { await authenticate(username, password, agreed); }
    catch (e) {
      if (e instanceof TermsRequiredError) { setTermsNotice(e.message); return; }
      setError(e instanceof Error ? e.message : 'Không thể đăng nhập.');
    }
    finally { setBusy(false); }
  };
  return <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, paddingBottom: 48, gap: 20, width: '100%', maxWidth: 540, alignSelf: 'center' }}>
    {/* Đầu trang gọn (rà soát 11/11/2026): bỏ vòng trang trí và ba nhãn vai trò trông như nút, để ô đăng nhập lên cao hơn. */}
    <LinearGradient colors={G.night} style={[cardShape(), { padding: 20, gap: 6, flexDirection: 'row', alignItems: 'center' }]}>
      <Ionicons name="pulse" size={36} color={C.onPrimary} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.onPrimary, fontSize: 26, fontWeight: '700' }}>Plasma Pro</Text>
        <Text style={{ color: C.onPrimarySoft, fontSize: T.label, lineHeight: 22 }}>Kết nối chăm sóc. Theo dõi mỗi ngày.</Text>
      </View>
    </LinearGradient>
    <View style={{ gap: 5 }}><Text style={{ fontSize: 25, fontWeight: '700' }}>Chào mừng trở lại</Text><Muted>Đăng nhập để tiếp tục theo dõi và chăm sóc.</Muted></View>
    <Card style={{ gap: 16 }}>
      <Field label="Tên đăng nhập" accessibilityLabel="Tên đăng nhập" value={username} onChangeText={(v) => { setUsername(v); setTermsNotice(''); setAgreed(false); }} autoCapitalize="none" autoCorrect={false} placeholder="Nhập tên đăng nhập" />
      {/* Lỗi đăng nhập hiện ngay dưới ô mật khẩu, viền ô đổi màu lỗi (A14). */}
      <Field label="Mật khẩu" accessibilityLabel="Mật khẩu" value={password} onChangeText={(v) => { setPassword(v); setError(''); }} secureTextEntry placeholder="Nhập mật khẩu" error={error || null} />
      {termsNotice ? (
        <>
          <Text accessibilityRole="alert" style={{ color: C.amber, fontWeight: '600' }}>{termsNotice}</Text>
          <Consent agreed={agreed} onChange={setAgreed} />
        </>
      ) : (
        <TermsLink />
      )}
      <Button label="Đăng nhập" icon="log-in-outline" loading={busy} disabled={!username.trim() || !password || (!!termsNotice && !agreed)} onPress={submit}
        reason={(!username.trim() || !password) ? 'Nhập tên đăng nhập và mật khẩu để đăng nhập.' : 'Đánh dấu đồng ý điều khoản để tiếp tục.'} />
      <Button label="Có mã kích hoạt từ bác sĩ? Kích hoạt tài khoản" variant="ghost" onPress={() => router.push('/activate')} />
      <Button label="Chưa có tài khoản? Đăng ký" variant="ghost" onPress={() => router.push('/register')} />
    </Card>
    <Card>
      <Text style={{ fontWeight: '700' }}>Trải nghiệm bản demo</Text>
      <Muted>Chọn tài khoản để điền nhanh. Mật khẩu thử nghiệm: {DEMO_PASSWORD}</Muted>
      <Choices value={username} onChange={value => { setUsername(value); setPassword(DEMO_PASSWORD); setError(''); setTermsNotice(''); setAgreed(false); }} options={data.accounts.filter(a => isSampleAccount(a) && !a.locked).map(a => ({ value: a.username, label: a.name }))} />
      <Muted>Đăng nhập cục bộ trên máy này; chưa xác thực qua máy chủ.</Muted>
    </Card>
  </ScrollView>;
}

