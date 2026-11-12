import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Chip, Disclosure, Field, Header, ListCard, Muted, Screen, SimBadge } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

// Quản trị: đăng ký mã thiết bị và xem máy đang giao cho ai. Giao máy và thu hồi do bác sĩ phụ trách làm trên hồ sơ người bệnh (UR11).
export default function AdminDevices() {
  const { data, registerDevice } = useStore();
  const [code, setCode] = useState('');
  const exists = data.devices.some((d) => d.code.toUpperCase() === code.trim().toUpperCase());
  const valid = /^TB-\d{3,}$/i.test(code.trim());

  return (
    <Screen header={<Header title="Thiết bị" subtitle="Đăng ký và theo dõi thiết bị" />}>
      <SimBadge />
      <Button label="Chẩn đoán kết nối USB/UART" variant="secondary" icon="pulse-outline" onPress={() => router.push('/device-diagnostics')} />
      {/* Một thẻ cho cả danh sách: mỗi thiết bị một dòng, gán bệnh nhân và nhật ký nằm trong phần mở rộng. */}
      <ListCard>
      <View style={{ paddingVertical: 4 }}><Disclosure icon="add-circle-outline" title="Đăng ký thiết bị mới">
        <Field
          label="Mã thiết bị"
          value={code}
          onChangeText={setCode}
          autoCapitalize="characters"
          placeholder="TB-004"
          error={exists ? 'Mã thiết bị đã tồn tại.' : code && !valid ? 'Định dạng TB-xxx.' : null}
        />
        <Button
          label="Đăng ký"
          icon="add"
          disabled={!valid || exists}
          onPress={() => {
            registerDevice(code.trim().toUpperCase());
            setCode('');
          }}
        />
      </Disclosure></View>
      {data.devices.map((d) => (
        <View key={d.id} style={{ paddingVertical: 4 }}>
          <Disclosure icon="hardware-chip-outline" title={d.code} summary={`${data.patients.find((p) => p.id === d.patientId)?.code ?? 'Chưa gán'} · đồng bộ ${d.lastSync ? fmtDateTime(d.lastSync) : 'chưa từng'}`}
            right={<Chip label={d.online ? 'Đang kết nối' : 'Mất kết nối'} tone={d.online ? 'green' : 'gray'} />}>
          <Muted>Firmware {d.firmware}</Muted>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Đang giao cho: {data.patients.find((p) => p.id === d.patientId)?.code ?? 'chưa giao'}</Text>
          <Muted>Bác sĩ phụ trách giao và thu hồi máy trên hồ sơ bệnh nhân.</Muted>
          <Button label="Xem nhật ký" variant="ghost" icon="list-outline" onPress={() => router.push({ pathname: '/devices/[id]', params: { id: d.id } })} />
          </Disclosure>
        </View>
      ))}
      </ListCard>
    </Screen>
  );
}
