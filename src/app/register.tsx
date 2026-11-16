import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Consent, CheckRow } from '@/components/Consent';
import { Text } from '@/components/Text';
import { Button, Card, Choices, Field, Header, Muted, Notice, Screen, SectionTitle, Segmented } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { C, T } from '@/theme';

/**
 * C02 Tạo tài khoản. Stage 9A (bố cục riêng): biểu mẫu chia ba nhóm theo việc người dùng làm (vai trò, thông tin, đăng nhập),
 * phần đồng ý tách thành nhóm cuối, nút Đăng ký ở chân màn nên luôn thấy được. Trường, kiểm tra và thứ tự lưu giữ nguyên.
 */
export default function Register() {
  const { register } = useStore();
  const [role, setRole] = useState<Role>('patient');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [phone, setPhone] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [sex, setSex] = useState<'Nam' | 'Nữ'>('Nam');
  const [agreed, setAgreed] = useState(false);
  const [research, setResearch] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    if (password !== repeat) return setError('Mật khẩu nhập lại chưa khớp.');
    setError(''); setBusy(true);
    try {
      await register({ role, name, username, password, phone, birthYear: Number(birthYear), sex, agreed, researchConsent: research });
      setDone(true);
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa tạo được tài khoản.'); }
    finally { setBusy(false); }
  };
  if (done) {
    return <Screen header={<Header back title="Tạo tài khoản" />}>
      <Card hero style={{ gap: 12 }}>
        <Text accessibilityRole="header" style={{ fontSize: T.screenTitle, fontWeight: '700', color: C.green }}>Đăng ký thành công</Text>
        <Text style={{ color: C.textBody }}>{role === 'patient' ? 'Hồ sơ của bạn đã được tạo. Bạn có thể đăng nhập ngay; quản trị sẽ phân công bác sĩ.' : 'Yêu cầu đã được lưu. Quản trị cần duyệt trước khi bạn đăng nhập bằng vai trò này.'}</Text>
        <Button label="Về đăng nhập" onPress={() => router.replace('/')} />
      </Card>
    </Screen>;
  }
  return <Screen
    header={<Header back title="Tạo tài khoản" />}
    footer={<View style={{ gap: 8 }}>
      {error ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{error}</Text> : null}
      <Button label={role === 'patient' ? 'Đăng ký' : 'Gửi yêu cầu đăng ký'} loading={busy} disabled={!agreed} reason="Đánh dấu đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư để đăng ký." onPress={submit} />
    </View>}>
    {/* Lưu ý dữ liệu thử nghiệm đặt đầu màn: người dùng cần biết trước khi nhập thông tin thật. */}
    <Notice tone="gray" icon="information-circle-outline">Bản demo lưu trên máy này. Hãy dùng thông tin và mật khẩu thử nghiệm.</Notice>

    <SectionTitle>1. Vai trò</SectionTitle>
    <Card style={{ gap: 10 }}>
      <Choices<Role> value={role} onChange={setRole} options={[{ value: 'patient', label: 'Bệnh nhân' }, { value: 'doctor', label: 'Bác sĩ' }, { value: 'admin', label: 'Quản trị viên' }]} />
      {role !== 'patient' && <Muted>Tài khoản chuyên môn cần quản trị duyệt; quyền nghiên cứu được cấp riêng.</Muted>}
    </Card>

    <SectionTitle>2. Thông tin cá nhân</SectionTitle>
    <Card style={{ gap: 14 }}>
      <Field label="Họ và tên" accessibilityLabel="Họ và tên" value={name} onChangeText={setName} />
      <Field label="Số điện thoại" accessibilityLabel="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="09xxxxxxxx" />
      {role === 'patient' && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexGrow: 1, flexBasis: 120 }}><Field label="Năm sinh" accessibilityLabel="Năm sinh" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" /></View>
          <View style={{ flexGrow: 1, flexBasis: 160, gap: 6 }}>
            <Text style={{ color: C.textBody, fontSize: T.small, fontWeight: '600' }}>Giới tính</Text>
            <Segmented value={sex} onChange={setSex} options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }]} />
          </View>
        </View>
      )}
    </Card>

    <SectionTitle>3. Thông tin đăng nhập</SectionTitle>
    <Card style={{ gap: 14 }}>
      <Field label="Tên đăng nhập" accessibilityLabel="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Tối thiểu 4 ký tự, không dấu" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <View style={{ flexGrow: 1, flexBasis: 220 }}><Field label="Mật khẩu" accessibilityLabel="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholder="Ít nhất 8 ký tự" /></View>
        <View style={{ flexGrow: 1, flexBasis: 220 }}><Field label="Nhập lại mật khẩu" accessibilityLabel="Nhập lại mật khẩu" value={repeat} onChangeText={setRepeat} secureTextEntry /></View>
      </View>
    </Card>

    <SectionTitle>4. Đồng ý</SectionTitle>
    <Card style={{ gap: 4 }}>
      <Consent agreed={agreed} onChange={setAgreed} />
      {role === 'patient' && <CheckRow checked={research} onChange={setResearch} label="Đồng ý dùng ảnh đã bỏ thông tin cá nhân để nghiên cứu (không bắt buộc)" />}
    </Card>
  </Screen>;
}
