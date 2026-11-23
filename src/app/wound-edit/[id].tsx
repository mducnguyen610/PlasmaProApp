import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanManage } from '@/components/Guard';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { Button, Card, Field, Header, InfoRow, Muted, Notice, Screen, SectionTitle } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { validateWoundLocation } from '@/lib/patientRecord';
import { useLookups, useStore } from '@/lib/store';

// B05a – Chỉnh sửa vị trí vết thương (bác sĩ phụ trách). Sửa đúng vết đang mở: mã vết, bệnh nhân, ảnh, số đo, đánh giá, đợt và buổi điều trị giữ nguyên.
// Vị trí là văn bản tự do như khi thêm vết (B04). Lưu cần xác nhận; quyền và kiểm tra nằm ở store (updateWound).
export default function WoundEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { me, updateWound } = useStore();
  const { wound, patient } = useLookups();
  const w = wound(id);
  const p = patient(w?.patientId);
  // Giai đoạn B (CN1 H9): chỉ bác sĩ phụ trách sửa vị trí vết.
  const canView = useCanManage(p);
  const [location, setLocation] = useState(w?.location ?? '');
  const [group, setGroup] = useState(w?.group ?? '');
  const [error, setError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const locationChanged = !!w && location.trim().replace(/\s+/g, ' ') !== w.location;
  const groupChanged = !!w && group.trim() !== (w.group ?? '');
  const dirty = locationChanged || groupChanged;
  const allowLeave = useDiscardGuard(dirty && !busy);
  // Mở thẳng bằng đường dẫn (không có màn trước) thì về màn gốc thay vì không đi đâu.
  const leave = () => (router.canGoBack() ? router.back() : router.replace({ pathname: '/wounds/[id]', params: { id: (id ?? '') } }));

  if (!w || !p) return <NoAccess notFound />;
  if (!canView || me?.role !== 'doctor') return <NoAccess />;
  if (p.archivedAt) {
    return (
      <Screen header={<Header back title="Chỉnh sửa vị trí" subtitle={`${w.code} · ${p.name}`} />}>
        <Notice icon="archive-outline">Hồ sơ đã lưu trữ, chỉ xem được. Khôi phục hồ sơ trước khi sửa vết thương.</Notice>
        <Button label="Quay lại" variant="secondary" onPress={() => leave()} />
      </Screen>
    );
  }

  const doSave = async (patch: { location?: string; group?: string }) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setFailure(null);
    try {
      await updateWound(w.id, patch);
      allowLeave();
      notify('Đã lưu vị trí', `${w.code} giữ nguyên mã vết, ảnh, số đo và lịch sử điều trị.`);
      leave();
    } catch (e) {
      setFailure(e instanceof Error ? e.message : String(e));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const save = () => {
    if (saving.current) return;
    const patch: { location?: string; group?: string } = {};
    if (locationChanged) {
      const r = validateWoundLocation(location, w);
      if (!r.value) return setError(r.error ?? null);
      patch.location = r.value;
    }
    if (groupChanged) patch.group = group.trim();
    setError(null);
    const lines = [
      patch.location ? `Vị trí: "${w.location}" thành "${patch.location}".` : '',
      patch.group !== undefined ? `Nhóm tổn thương: "${w.group ?? 'chưa ghi'}" thành "${patch.group || 'chưa ghi'}".` : '',
      'Đây là sửa thông tin của cùng vết thương; ảnh, số đo, đánh giá và buổi điều trị vẫn gắn với vết này.',
    ].filter(Boolean);
    confirm(`Lưu thay đổi cho ${w.code}?`, lines.join('\n'), () => { void doSave(patch); }, 'Lưu thay đổi');
  };

  // Stage 9A (bố cục riêng): thanh ngữ cảnh đã ghi mã vết và vị trí đang lưu nên bỏ dòng phụ đề trùng;
  // dòng "Vị trí đang lưu" giữ ngay trên ô để so khi sửa (yêu cầu WD-02). Lỗi lưu nằm ngay trên nút.
  return (
    <Screen
      header={<Header back title="Chỉnh sửa vị trí" />}
      footer={
        <View style={{ gap: 8 }}>
          {failure && <Notice tone="red" icon="alert-circle-outline">{`Chưa lưu được: ${failure}`}</Notice>}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} label="Hủy" variant="secondary" disabled={busy} onPress={() => leave()} />
            <Button style={{ flex: 1 }} label="Lưu" icon="save-outline" loading={busy} disabled={!dirty} onPress={save} />
          </View>
        </View>
      }>
      <ClinicalContext patient={p} wound={w} />
      <SectionTitle>Vị trí và nhóm tổn thương</SectionTitle>
      <Card style={{ gap: 14 }}>
        <InfoRow label="Vị trí đang lưu" value={w.location} />
        <Field label="Vị trí mới" value={location} onChangeText={(v) => { setLocation(v); setError(null); }} placeholder="Ví dụ: Gót chân phải" error={error} />
        <Field label="Nhóm tổn thương" optional value={group} onChangeText={setGroup} hint="Để trống nếu chưa ghi" />
      </Card>
      <Muted>{`Mã vết (${w.code}) và trạng thái không đổi ở màn này. Trạng thái đổi bằng các nút ở thẻ "Đợt điều trị".`}</Muted>
    </Screen>
  );
}
