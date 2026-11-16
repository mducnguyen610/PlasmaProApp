import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { ClinicalContext } from '@/components/ClinicalContext';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { Button, Card, Field, Header, InfoRow, Muted, Notice, Screen, SectionTitle } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { patientEditDirty, validatePatientEdit, type PatientEditErrors } from '@/lib/patientRecord';
import { useLookups, useStore } from '@/lib/store';

// B04a – Chỉnh sửa hồ sơ (bác sĩ phụ trách): họ tên, năm sinh, số điện thoại. Mã hồ sơ, giới tính và bác sĩ phụ trách chỉ xem.
// Lưu gọi updatePatient (cùng hàm với đồng ý nghiên cứu); quyền và kiểm tra nằm ở store, màn này chỉ hiện lỗi theo ô.
export default function PatientEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me, updatePatient } = useStore();
  const { patient, account } = useLookups();
  const p = patient(id);
  const canView = useCanView(p);
  const [name, setName] = useState(p?.name ?? '');
  const [birthYear, setBirthYear] = useState(p ? String(p.birthYear) : '');
  const [phone, setPhone] = useState(p?.phone ?? '');
  const [errors, setErrors] = useState<PatientEditErrors>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const dirty = !!p && patientEditDirty({ name, birthYear, phone }, p);
  const allowLeave = useDiscardGuard(dirty && !busy);
  // Mở thẳng bằng đường dẫn (không có màn trước) thì về màn gốc thay vì không đi đâu.
  const leave = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/patients/[id]', params: { id: (id ?? '') } }));

  if (!p) return <NoAccess notFound />;
  if (!canView || me?.role !== 'doctor') return <NoAccess />;
  if (p.archivedAt) {
    return (
      <Screen header={<Header back title="Chỉnh sửa hồ sơ" subtitle={`${p.name} · ${p.code}`} />}>
        <Notice icon="archive-outline">Hồ sơ đã lưu trữ, chỉ xem được. Khôi phục hồ sơ ở màn hồ sơ bệnh nhân trước khi sửa.</Notice>
        <Button label="Quay lại hồ sơ" variant="secondary" onPress={() => leave()} />
      </Screen>
    );
  }

  const save = async () => {
    // Chặn chạm đúp: ref đổi ngay, trạng thái busy chỉ đổi ở lần vẽ sau.
    if (saving.current) return;
    const { errors: errs } = validatePatientEdit({ name, birthYear, phone }, p, data.patients);
    setErrors(errs);
    setFailure(null);
    if (Object.keys(errs).length) return;
    saving.current = true;
    setBusy(true);
    try {
      await updatePatient(p.id, { name, birthYear: Number(birthYear.trim()), phone: phone.trim() });
      allowLeave();
      notify('Đã lưu hồ sơ', `Thông tin của ${p.code} đã cập nhật. Mã hồ sơ, vết thương và lịch sử điều trị giữ nguyên.`);
      leave();
    } catch (e) {
      // Lưu lỗi: dữ liệu đã lưu không đổi, nội dung đang nhập giữ nguyên để sửa rồi lưu lại.
      setFailure(e instanceof Error ? e.message : String(e));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  // Stage 9A (bố cục riêng): thanh định danh bệnh nhân đầu màn (như các màn lâm sàng khác) thay cho dòng phụ đề;
  // ô sửa và phần chỉ xem tách thành hai nhóm có tiêu đề; năm sinh và số điện thoại một hàng khi đủ rộng; lỗi lưu nằm ngay trên nút.
  return (
    <Screen
      header={<Header back title="Chỉnh sửa hồ sơ" />}
      footer={
        <View style={{ gap: 8 }}>
          {failure && <Notice tone="red" icon="alert-circle-outline">{`Chưa lưu được: ${failure}`}</Notice>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} label="Hủy" variant="secondary" disabled={busy} onPress={() => leave()} />
            <Button style={{ flex: 1 }} label="Lưu" icon="save-outline" loading={busy} disabled={!dirty} onPress={save} />
          </View>
        </View>
      }>
      <ClinicalContext patient={p} />
      <SectionTitle>Thông tin sửa được</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label="Họ và tên" value={name} onChangeText={(v) => { setName(v); setErrors((x) => ({ ...x, name: undefined })); }} error={errors.name} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexGrow: 1, flexBasis: 120 }}>
            <Field label="Năm sinh" value={birthYear} onChangeText={(v) => { setBirthYear(v); setErrors((x) => ({ ...x, birthYear: undefined })); }} keyboardType="number-pad" maxLength={4} error={errors.birthYear} />
          </View>
          <View style={{ flexGrow: 2, flexBasis: 220 }}>
            <Field label="Số điện thoại" optional value={phone} onChangeText={(v) => { setPhone(v); setErrors((x) => ({ ...x, phone: undefined })); }} keyboardType="phone-pad"
              error={errors.phone} hint="10 số bắt đầu bằng 0, hoặc +84 và 9 số" />
          </View>
        </View>
      </Card>
      <SectionTitle>Không đổi ở màn này</SectionTitle>
      <Card>
        <InfoRow label="Mã hồ sơ" value={p.code} />
        <InfoRow label="Giới tính" value={p.sex} />
        <InfoRow label="Bác sĩ phụ trách" value={account(p.doctorId)?.name ?? '—'} />
        <Muted>{'Đổi bác sĩ phụ trách do quản trị thực hiện. Đồng ý nghiên cứu sửa ở mục "Thông tin hồ sơ".'}</Muted>
      </Card>
    </Screen>
  );
}
