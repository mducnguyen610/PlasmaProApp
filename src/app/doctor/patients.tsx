import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { TextInput } from '@/components/Text';

import { PatientCard } from '@/components/items';
import { patientSeverity, SEVERITY } from '@/lib/access';
import type { Severity } from '@/lib/types';
import { Choices, Empty, Header, HeaderButton, Screen } from '@/components/ui';
import { useStore } from '@/lib/store';
import { C, shadow } from '@/theme';

// BS02 – Danh sách bệnh nhân: tìm theo tên/mã, thêm mới, mở hồ sơ.
export default function PatientList() {
  const { data, me } = useStore();
  const [level, setLevel] = useState<Severity | 'all'>('all');
  const [q, setQ] = useState('');
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const list = data.patients
    .filter((p) => p.doctorId === me?.id)
    .filter(p => level === 'all' || patientSeverity(data, p.id) === level)
    .filter((p) => !q || norm(`${p.name} ${p.code}`).includes(norm(q)));

  return (
    <Screen header={<Header title="Bệnh nhân" right={<HeaderButton icon="add" label="Thêm mới" onPress={() => router.push('/patients/new')} />} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.card, borderRadius: 14, paddingHorizontal: 14, ...shadow }}>
        <Ionicons name="search" size={18} color={C.textFaint} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Tìm theo tên hoặc mã bệnh nhân…"
          placeholderTextColor={C.textFaint}
          style={{ flex: 1, paddingVertical: 13, fontSize: 15, color: C.text }}
          autoCorrect={false}
        />
      </View>
      <Choices<Severity | 'all'> value={level} onChange={setLevel} options={[{ value: 'all', label: 'Tất cả' }, ...(['mild', 'moderate', 'severe'] as const).map(value => ({ value, label: SEVERITY[value].label }))]} />
      {list.length === 0 && <Empty icon="search" text="Không tìm thấy bệnh nhân phù hợp." />}
      {list.map((p) => (
        <PatientCard key={p.id} patient={p} />
      ))}
    </Screen>
  );
}
