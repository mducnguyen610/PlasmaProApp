import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ActivationCode } from '@/components/ActivationCode';
import { Text } from '@/components/Text';

import { Button, Card, Field, Header, Muted, Screen, Segmented } from '@/components/ui';
import { useStore, type Activation } from '@/lib/store';
import { C } from '@/theme';
import { localDay } from '@/lib/course';

export default function NewPatient() {
  const { addPatient, me } = useStore();
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [sex, setSex] = useState<'Nam' | 'Nữ'>('Nam');
  const [phone, setPhone] = useState('');
  const [wound, setWound] = useState('');
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string; activation: Activation } | null>(null);

  const save = async () => {
    const y = Number(birthYear);
    if (!name.trim()) return setErr('Nhập họ tên bệnh nhân.');
    if (!Number.isInteger(y) || y < 1900 || y > new Date().getFullYear()) return setErr('Năm sinh không hợp lệ.');
    setErr(null); setBusy(true);
    try {
      const { patient, activation } = await addPatient(
        {
          name: name.trim(), birthYear: y, sex, phone: phone.trim(), doctorId: me!.id,
          researchConsent: consent, consentDate: consent ? localDay() : undefined,
        },
        wound.trim() || undefined,
      );
      setCreated({ id: patient.id, code: patient.code, activation });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    return (
      <Screen header={<Header back title="Đã tạo hồ sơ" subtitle={`Mã hồ sơ ${created.code}`} />}>
        <Card>
          <Text style={{ fontWeight: '700', color: C.text }}>Tài khoản cho bệnh nhân</Text>
          <ActivationCode activation={created.activation} />
        </Card>
        <Button label="Mở hồ sơ" icon="arrow-forward" onPress={() => router.replace({ pathname: '/patients/[id]', params: { id: created.id } })} />
      </Screen>
    );
  }

  return (
    <Screen header={<Header back title="Thêm bệnh nhân" subtitle="Mã hồ sơ được cấp tự động" />}>
      <Card>
        <Field label="Họ và tên" value={name} onChangeText={setName} />
        <Field label="Năm sinh" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" />
        <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Giới tính</Text>
        <Segmented value={sex} onChange={setSex} options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }]} />
        <Field label="Số điện thoại" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Field label="Vị trí vết thương đầu tiên" optional value={wound} onChangeText={setWound} placeholder="Ví dụ: Cẳng chân trái" hint="Tạo sẵn vết thương VT01" />
      </Card>
      <Card>
        <Pressable onPress={() => setConsent((v) => !v)} style={{ flexDirection: 'row', gap: 10 }}>
          <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={22} color={consent ? C.primary : C.textFaint} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontWeight: '600', color: C.text }}>Bệnh nhân đồng ý dùng ảnh cho nghiên cứu</Text>
            <Muted>Ảnh được xuất bằng mã hồ sơ, không kèm họ tên. Có thể rút lại đồng ý trong hồ sơ; ảnh khi đó không còn được xuất.</Muted>
          </View>
        </Pressable>
      </Card>
      {err && <Text style={{ color: C.red, fontWeight: '600' }}>{err}</Text>}
      <Button label="Lưu hồ sơ và tạo tài khoản" icon="save-outline" loading={busy} onPress={save} />
    </Screen>
  );
}
