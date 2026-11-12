import { router } from 'expo-router';
import { useState } from 'react';
import { Consent, CheckRow } from '@/components/Consent';
import { Text } from '@/components/Text';
import { Button, Card, Choices, Field, Header, Muted, Screen, Segmented } from '@/components/ui';
import { useStore } from '@/lib/store';
import type { Role } from '@/lib/types';
import { C } from '@/theme';

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
  return <Screen header={<Header back title="Tạo tài khoản" subtitle="Bắt đầu cùng Plasma Pro" />}>
    <Card style={{ width: '100%', maxWidth: 600, alignSelf: 'center', gap: 16 }}>
      {done ? <>
        <Text style={{ fontSize: 22, fontWeight: '700', color: C.green }}>Đăng ký thành công</Text>
        <Muted>{role === 'patient' ? 'Hồ sơ của bạn đã được tạo. Bạn có thể đăng nhập ngay; quản trị sẽ phân công bác sĩ.' : 'Yêu cầu đã được lưu. Quản trị cần duyệt trước khi bạn đăng nhập bằng vai trò này.'}</Muted>
        <Button label="Về đăng nhập" onPress={() => router.replace('/')} />
      </> : <>
        <Text style={{ fontWeight: '700', fontSize: 18 }}>Bạn sử dụng ứng dụng với vai trò</Text>
        <Choices<Role> value={role} onChange={setRole} options={[{ value: 'patient', label: 'Bệnh nhân' }, { value: 'doctor', label: 'Bác sĩ' }, { value: 'admin', label: 'Quản trị viên' }]} />
        {role !== 'patient' && <Muted>Tài khoản chuyên môn cần quản trị duyệt; quyền nghiên cứu được cấp riêng.</Muted>}
        <Field label="Họ và tên" accessibilityLabel="Họ và tên" value={name} onChangeText={setName} />
        <Field label="Tên đăng nhập" accessibilityLabel="Tên đăng nhập" value={username} onChangeText={setUsername} autoCapitalize="none" autoCorrect={false} placeholder="Tối thiểu 4 ký tự, không dấu" />
        <Field label="Số điện thoại" accessibilityLabel="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="09xxxxxxxx" />
        {role === 'patient' && <>
          <Field label="Năm sinh" accessibilityLabel="Năm sinh" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" />
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Giới tính</Text>
          <Segmented value={sex} onChange={setSex} options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }]} />
        </>}
        <Field label="Mật khẩu" accessibilityLabel="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry placeholder="Ít nhất 8 ký tự" />
        <Field label="Nhập lại mật khẩu" accessibilityLabel="Nhập lại mật khẩu" value={repeat} onChangeText={setRepeat} secureTextEntry />
        <Consent agreed={agreed} onChange={setAgreed} />
        {role === 'patient' && <CheckRow checked={research} onChange={setResearch} label="Đồng ý dùng ảnh đã bỏ thông tin cá nhân để nghiên cứu (không bắt buộc)" />}
        {error ? <Text accessibilityRole="alert" style={{ color: C.red }}>{error}</Text> : null}
        <Button label={role === 'patient' ? 'Đăng ký' : 'Gửi yêu cầu đăng ký'} loading={busy} disabled={!agreed} reason="Đánh dấu đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư để đăng ký." onPress={submit} />
        <Muted>Bản demo lưu trên máy này. Hãy dùng thông tin và mật khẩu thử nghiệm.</Muted>
      </>}
    </Card>
  </Screen>;
}

