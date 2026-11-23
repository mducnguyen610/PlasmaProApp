import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { ActivationCode } from '@/components/ActivationCode';
import { Text } from '@/components/Text';

import { Button, Card, Field, Header, Muted, Notice, Screen, Segmented, SectionTitle } from '@/components/ui';
import { DuplicatePatientError, PhoneDuplicateWarning, useStore, type Activation } from '@/lib/store';
import { confirm } from '@/lib/dialog';
import { maskDateInput } from '@/lib/format';
import { validateNewPatient, type PatientFormErrors } from '@/lib/patientIdentity';
import type { Patient } from '@/lib/types';
import { C, T } from '@/theme';
import { localDay } from '@/lib/course';

export default function NewPatient() {
  const { addPatient, me, data } = useStore();
  const [name, setName] = useState('');
  // Giai đoạn B (CN1 H1): ngày sinh đầy đủ dd/mm/yyyy thay cho năm sinh.
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'Nam' | 'Nữ'>('Nam');
  const [phone, setPhone] = useState('');
  const [wound, setWound] = useState('');
  const [consent, setConsent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [fieldErr, setFieldErr] = useState<PatientFormErrors>({});
  // CN1 H3: hồ sơ trùng cả họ tên, ngày sinh, số điện thoại thì không tạo, mở hồ sơ có sẵn.
  const [exact, setExact] = useState<Patient | null>(null);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<{ id: string; code: string; activation: Activation } | null>(null);

  const save = async (allowPhoneDuplicate = false) => {
    const check = validateNewPatient({ name, birthDate, phone }, data.patients, localDay());
    setFieldErr(check.errors);
    setExact(check.exact ?? null);
    if (!check.value) return setErr(check.exact ? null : 'Kiểm tra lại các ô được đánh dấu.');
    if (check.warnings.phone && !allowPhoneDuplicate) {
      confirm('Số điện thoại đã có', `${check.warnings.phone} Họ tên hoặc ngày sinh khác nên vẫn có thể là bệnh nhân khác. Vẫn tạo hồ sơ mới?`, () => { void save(true); }, 'Vẫn tạo', 'Kiểm tra lại');
      return;
    }
    setErr(null); setBusy(true);
    try {
      const { patient, activation } = await addPatient(
        {
          name: check.value.name, birthDate: check.value.birthDate, sex, phone: check.value.phone, doctorId: me!.id,
          researchConsent: consent, consentDate: consent ? localDay() : undefined,
        },
        wound.trim() || undefined,
        { allowPhoneDuplicate },
      );
      setCreated({ id: patient.id, code: patient.code, activation });
    } catch (e) {
      if (e instanceof DuplicatePatientError) { setExact(e.duplicate); setErr(null); }
      else setErr(e instanceof PhoneDuplicateWarning ? `${e.message} Hãy lưu lại để xác nhận.` : e instanceof Error ? e.message : String(e));
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
      {/* Stage 9A: năm sinh và giới một hàng; một tiêu đề nhóm để nút Lưu vẫn nằm trong màn 390 × 844 (kịch bản S8-W1-01). Trường và thứ tự lưu giữ nguyên. */}
      <SectionTitle>Thông tin bệnh nhân</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label="Họ và tên" value={name} onChangeText={(v) => { setName(v); setExact(null); }} error={fieldErr.name} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexGrow: 1, flexBasis: 140 }}><Field label="Ngày sinh" value={birthDate} onChangeText={(v) => { setBirthDate(maskDateInput(v)); setExact(null); }} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/yyyy" error={fieldErr.birthDate} /></View>
          <View style={{ flexGrow: 1, flexBasis: 160, gap: 6 }}>
            <Text style={{ color: C.textBody, fontSize: T.small, fontWeight: '600' }}>Giới tính</Text>
            <Segmented value={sex} onChange={setSex} options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }]} />
          </View>
        </View>
        <Field label="Số điện thoại" value={phone} onChangeText={(v) => { setPhone(v); setExact(null); }} keyboardType="phone-pad" error={fieldErr.phone} hint="10 số bắt đầu bằng 0, hoặc +84 và 9 số" />
        <Field label="Vị trí vết thương đầu tiên" optional value={wound} onChangeText={setWound} placeholder="Ví dụ: Cẳng chân trái" hint="Tạo sẵn vết thương VT01" />
      </Card>
      <Card>
        <Pressable onPress={() => setConsent((v) => !v)} accessibilityRole="checkbox" accessibilityState={{ checked: consent }} style={{ flexDirection: 'row', gap: 10, minHeight: 44 }}>
          <Ionicons name={consent ? 'checkbox' : 'square-outline'} size={22} color={consent ? C.primary : C.textFaint} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontWeight: '600', color: C.text }}>Bệnh nhân đồng ý dùng ảnh cho nghiên cứu</Text>
            <Muted>Ảnh được xuất bằng mã hồ sơ, không kèm họ tên. Có thể rút lại đồng ý trong hồ sơ; ảnh khi đó không còn được xuất.</Muted>
          </View>
        </Pressable>
      </Card>
      {exact && (
        <Card style={{ gap: 10 }} testID="ho-so-trung">
          <Notice tone="red" icon="copy-outline">{`Đã có hồ sơ ${exact.code} trùng họ tên, ngày sinh và số điện thoại. Không tạo hồ sơ mới.`}</Notice>
          <Button label={`Mở hồ sơ ${exact.code}`} icon="open-outline" variant="secondary" onPress={() => router.replace({ pathname: '/patients/[id]', params: { id: exact.id } })} />
        </Card>
      )}
      {err && <Text style={{ color: C.red, fontWeight: '600' }}>{err}</Text>}
      <Button label="Lưu hồ sơ và tạo tài khoản" icon="save-outline" loading={busy} onPress={() => save()} />
    </Screen>
  );
}
