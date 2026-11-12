import { router } from 'expo-router';
import { useState } from 'react';

import { PatientCard } from '@/components/items';
import { useRankedPatients } from '@/components/useRankedPatients';
import { patientSeverity, SEVERITY } from '@/lib/access';
import type { Severity } from '@/lib/types';
import { Choices, Empty, Header, HeaderButton, ListCard, Screen, SearchField } from '@/components/ui';
import { useStore } from '@/lib/store';

// BS02 – Danh sách bệnh nhân: tìm theo tên/mã, thêm mới, mở hồ sơ.
export default function PatientList() {
  const { data, me } = useStore();
  const [level, setLevel] = useState<Severity | 'all'>('all');
  const [q, setQ] = useState('');
  // Cùng thông tin và thứ tự với trang chủ (V09): trạng thái hôm nay và lý do cần chú ý.
  const ranked = useRankedPatients();
  const order = new Map(ranked.map((a, i) => [a.patientId, i]));
  const attentionOf = new Map(ranked.map((a) => [a.patientId, a]));
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const list = data.patients
    .filter((p) => p.doctorId === me?.id)
    .filter(p => level === 'all' || patientSeverity(data, p.id) === level)
    .filter((p) => !q || norm(`${p.name} ${p.code}`).includes(norm(q)))
    .sort((a, b) => (order.get(a.id) ?? 1e9) - (order.get(b.id) ?? 1e9));

  return (
    <Screen header={<Header title="Bệnh nhân" right={<HeaderButton icon="add" label="Thêm mới" onPress={() => router.push('/patients/new')} />} />}>
      <SearchField label="Tìm bệnh nhân" value={q} onChangeText={setQ} placeholder="Tìm theo tên hoặc mã bệnh nhân…" />
      <Choices<Severity | 'all'> value={level} onChange={setLevel} options={[{ value: 'all', label: 'Tất cả' }, ...(['mild', 'moderate', 'severe'] as const).map(value => ({ value, label: SEVERITY[value].label }))]} />
      {list.length === 0 && <Empty icon="search" text="Không tìm thấy bệnh nhân phù hợp." />}
      <ListCard>
        {list.map((p) => <PatientCard key={p.id} patient={p} attention={attentionOf.get(p.id)} />)}
      </ListCard>
    </Screen>
  );
}
