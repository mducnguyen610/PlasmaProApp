import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Consent, TermsLink } from '@/components/Consent';
import { Text } from '@/components/Text';
import { Button, Card, Field, Muted, Choices } from '@/components/ui';
import { DEMO_PASSWORD, isSampleAccount } from '@/lib/auth';
import { TermsRequiredError, useStore } from '@/lib/store';
import { C, T } from '@/theme';

const HOME = { doctor: '/doctor', patient: '/patient', admin: '/admin' } as const;
export default function Login() {
  const { me, data, authenticate } = useStore();
  const insets = useSafeAreaInsets();
  const wide = useWindowDimensions().width >= 900;
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
  // Stage 9A: điện thoại có dải nhận diện navy ở trên, khung đăng nhập nổi lên một phần; màn rộng chia hai cột (thương hiệu trái, biểu mẫu phải).
  const brand = (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: C.brandMint, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="pulse" size={22} color={C.navy} />
        </View>
        <Text style={{ color: C.onPrimary, fontSize: 22, fontWeight: '700' }}>Plasma Pro</Text>
      </View>
      <Text style={{ color: C.onPrimary, fontSize: wide ? 30 : 24, lineHeight: wide ? 38 : 31, fontWeight: '700' }}>Kết nối chăm sóc.{'\n'}Theo dõi mỗi ngày.</Text>
      <Text style={{ color: C.onPrimarySoft, fontSize: T.small, lineHeight: 21, maxWidth: 380 }}>Quản lý quá trình điều trị vết thương bằng thiết bị Plasma Pro cho bác sĩ và bệnh nhân.</Text>
    </View>
  );
  return <View style={{ flex: 1, backgroundColor: C.bg, flexDirection: wide ? 'row' : 'column' }}>
    <StatusBar style="light" />
    {wide ? <View style={{ width: '42%', maxWidth: 520, backgroundColor: C.navy, padding: 48, paddingTop: insets.top + 64, justifyContent: 'space-between' }}>{brand}<Text style={{ color: C.onPrimarySoft, fontSize: T.caption }}>Bản demo, dữ liệu mô phỏng. Không dùng cho chẩn đoán.</Text></View> : null}
  <ScrollView keyboardShouldPersistTaps="handled" style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 48 }}>
    {!wide ? <View style={{ backgroundColor: C.navy, paddingHorizontal: 20, paddingTop: insets.top + 28, paddingBottom: 64 }}>{brand}</View> : null}
    <View style={{ paddingHorizontal: 16, marginTop: wide ? insets.top + 64 : -40, gap: 20, width: '100%', maxWidth: 480, alignSelf: 'center' }}>
    {/* Đầu trang gọn (rà soát 11/11/2026): bỏ vòng trang trí và ba nhãn vai trò trông như nút, để ô đăng nhập lên cao hơn. */}
    <Card hero style={{ gap: 16, padding: 20 }}>
      <View style={{ gap: 4 }}><Text accessibilityRole="header" style={{ fontSize: 22, fontWeight: '700', color: C.text }}>Chào mừng trở lại</Text><Muted>Đăng nhập để tiếp tục theo dõi và chăm sóc.</Muted></View>
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
    <Card style={{ backgroundColor: C.surfaceMuted }}>
      <Text style={{ fontWeight: '700', color: C.text }}>Trải nghiệm bản demo</Text>
      <Muted>Chọn tài khoản để điền nhanh. Mật khẩu thử nghiệm: {DEMO_PASSWORD}</Muted>
      <Choices value={username} onChange={value => { setUsername(value); setPassword(DEMO_PASSWORD); setError(''); setTermsNotice(''); setAgreed(false); }} options={data.accounts.filter(a => isSampleAccount(a) && !a.locked).map(a => ({ value: a.username, label: a.name }))} />
      <Muted>Đăng nhập cục bộ trên máy này; chưa xác thực qua máy chủ.</Muted>
    </Card>
    </View>
  </ScrollView>
  </View>;
}

