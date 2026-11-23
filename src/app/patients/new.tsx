import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
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
  // Giai đoạn B (CN2 A1): mở từ Chụp ảnh, chọn "Bệnh nhân mới" (chup=1): bắt buộc vị trí vết, tạo xong thì chụp ngay cho VT01.
  const { chup } = useLocalSearchParams<{ chup?: string }>();
  const forCapture = chup === '1';
  const [name, setName] = useState('');
  // Giai đoạn B (CN1 H1): ngày sinh đầy đủ dd/mm/yyyy thay cho năm sinh.
  const [birthDate, setBirthDate] = useState('');
  const [sex, setSex] = useState<'Nam' | 'Nữ'>('Nam');
  const [phone, setPhone] = useState('');
  const [wound, setWound] = useState('');
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
    if (forCapture && !wound.trim()) { setFieldErr({ ...check.errors }); return setErr('Nhập vị trí vết thương để chụp ảnh cho vết này.'); }
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
          // N10, C1: bác sĩ không tích thay bệnh nhân; bệnh nhân tự chọn khi kích hoạt tài khoản.
          researchConsent: false,
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

  const firstWound = created ? data.wounds.find((w) => w.patientId === created.id) : undefined;
  if (created) {
    return (
      <Screen header={<Header back title="Đã tạo hồ sơ" subtitle={`Mã hồ sơ ${created.code}`} />}>
        <Card>
          <Text style={{ fontWeight: '700', color: C.text }}>Tài khoản cho bệnh nhân</Text>
          <ActivationCode activation={created.activation} />
        </Card>
        {forCapture && firstWound && <Button label={`Chụp ảnh ${firstWound.code}`} icon="camera" onPress={() => router.replace({ pathname: '/guided-capture', params: { woundId: firstWound.id } })} />}
        <Button label="Mở hồ sơ" icon="arrow-forward" variant={forCapture && firstWound ? 'secondary' : undefined} onPress={() => router.replace({ pathname: '/patients/[id]', params: { id: created.id } })} />
      </Screen>
    );
  }

  return (
    <Screen header={<Header back title="Thêm bệnh nhân" subtitle={forCapture ? 'Tạo hồ sơ rồi chụp ảnh' : 'Mã hồ sơ được cấp tự động'} />}>
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
        <Field label="Vị trí vết thương đầu tiên" optional={!forCapture} value={wound} onChangeText={setWound} placeholder="Ví dụ: Cẳng chân trái" hint="Tạo sẵn vết thương VT01" />
      </Card>
      {/* Giai đoạn B (CN2 N10, C1): ô đồng ý dùng dữ liệu chuyển sang màn kích hoạt của bệnh nhân. */}
      <Muted>Bệnh nhân tự chọn đồng ý dùng dữ liệu khi kích hoạt tài khoản. Chưa đồng ý thì ảnh vẫn lưu và gán nhãn bình thường nhưng không vào tập huấn luyện.</Muted>
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
