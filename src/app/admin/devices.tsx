import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Chip, Choices, Field, Header, Muted, Screen, SectionTitle, SimBadge } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import { useStore } from '@/lib/store';
import { C } from '@/theme';

// Quản trị: đăng ký mã thiết bị và gán cho bệnh nhân (đặc tả 7.2, 9).
export default function AdminDevices() {
  const { data, registerDevice, assignDevice } = useStore();
  const [code, setCode] = useState('');
  const exists = data.devices.some((d) => d.code.toUpperCase() === code.trim().toUpperCase());
  const valid = /^TB-\d{3,}$/i.test(code.trim());

  return (
    <Screen header={<Header title="Thiết bị" subtitle="Đăng ký và gán thiết bị" />}>
      <SimBadge />
      <Card>
        <SectionTitle icon="add-circle-outline">Đăng ký thiết bị mới</SectionTitle>
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
      </Card>
      {data.devices.map((d) => (
        <Card key={d.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '800', color: C.text, flex: 1, fontSize: 16 }}>{d.code}</Text>
            <Chip label={d.online ? 'Online' : 'Offline'} tone={d.online ? 'green' : 'gray'} />
          </View>
          <Muted>Đồng bộ gần nhất: {d.lastSync ? fmtDateTime(d.lastSync) : 'chưa từng'} · Firmware {d.firmware}</Muted>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Gán cho bệnh nhân</Text>
          <Choices
            value={d.patientId ?? 'none'}
            onChange={(v) => assignDevice(d.id, v === 'none' ? null : v)}
            options={[{ value: 'none', label: 'Chưa gán' }, ...data.patients.map((p) => ({ value: p.id, label: p.code }))]}
          />
          <Button label="Xem nhật ký" variant="ghost" icon="list-outline" onPress={() => router.push({ pathname: '/devices/[id]', params: { id: d.id } })} />
        </Card>
      ))}
    </Screen>
  );
}
