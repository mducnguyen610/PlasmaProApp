import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { Button, Card, Choices, Header, Muted, Screen, SectionTitle, WoundPhoto } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';

// Nút giữa thanh tab của bác sĩ: chọn bệnh nhân, vết thương rồi chụp/tải ảnh, sau đó mở ngay màn đổi tên (BS05).
export default function Capture() {
  const { data, me } = useStore();
  const { woundsOf, imagesOf } = useLookups();
  const patients = data.patients.filter((p) => p.doctorId === me?.id);
  const [pid, setPid] = useState(patients[0]?.id ?? '');
  const wounds = pid ? woundsOf(pid).filter((w) => w.status !== 'closed') : [];
  const [wid, setWid] = useState(wounds[0]?.id ?? '');
  const woundId = wounds.some((w) => w.id === wid) ? wid : (wounds[0]?.id ?? '');
  const last = woundId ? imagesOf(woundId).at(-1) : undefined;

  if (me?.role !== 'doctor') return null;

  const go = () => router.push({ pathname: '/guided-capture', params: { woundId } });

  return (
    <Screen header={<Header back title="Chụp ảnh vết thương" subtitle="Ảnh vào đúng hồ sơ, rồi ghi diện tích" />}>
      <SectionTitle>Bệnh nhân</SectionTitle>
      <Choices
        value={pid}
        onChange={(v) => {
          setPid(v);
          setWid('');
        }}
        options={patients.map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }))}
      />
      <SectionTitle>Vết thương</SectionTitle>
      {wounds.length ? (
        <Choices value={woundId} onChange={setWid} options={wounds.map((w) => ({ value: w.id, label: `${w.code} · ${w.location}` }))} />
      ) : (
        <Muted>Bệnh nhân chưa có vết thương đang theo dõi; thêm trong hồ sơ bệnh nhân.</Muted>
      )}
      {last && (
        <Card hero>
          <View style={{ flexDirection: 'row', gap: 14, alignItems: 'center' }}>
            <WoundPhoto image={last} style={{ width: 96, height: 72, borderRadius: 8 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ color: C.textSoft, fontWeight: '500' }}>Ảnh gần nhất</Text>
              <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{last.id}</Text>
              <Text style={{ color: C.textSoft, fontSize: 12 }}>{last.capture?.sourceDateKnown === false ? 'Thêm' : 'Chụp'} {fmtDate(last.captureDate)} · giữ góc và khoảng cách tương tự</Text>
            </View>
          </View>
        </Card>
      )}
      <Button label="Chụp có hướng dẫn" icon="camera" disabled={!woundId} onPress={go} />
      <Muted>Mở bước chụp để dùng camera hoặc chọn ảnh từ thư viện, rồi kiểm tra trước khi lưu.</Muted>
    </Screen>
  );
}
