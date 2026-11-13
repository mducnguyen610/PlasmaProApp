import { router } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Choices, Header, ListCard, Muted, Screen, SearchField, SectionTitle, WoundPhoto } from '@/components/ui';
import { fmtDate } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

// Nút giữa thanh tab của bác sĩ: chọn bệnh nhân, vết thương rồi chụp/tải ảnh, sau đó mở ngay màn đổi tên (BS05).
export default function Capture() {
  const { data, me } = useStore();
  const { woundsOf, imagesOf } = useLookups();
  const patients = data.patients.filter((p) => p.doctorId === me?.id);
  // Không chọn sẵn bệnh nhân khi có từ 2 hồ sơ trở lên, để tránh chụp nhầm vào hồ sơ đứng đầu danh sách.
  const [pid, setPid] = useState(patients.length === 1 ? patients[0].id : '');
  const wounds = pid ? woundsOf(pid).filter((w) => w.status !== 'closed') : [];
  const [wid, setWid] = useState(wounds[0]?.id ?? '');
  const woundId = wounds.some((w) => w.id === wid) ? wid : (wounds[0]?.id ?? '');
  const last = woundId ? imagesOf(woundId).at(-1) : undefined;
  // UX-23 (Đợt 12): tìm theo tên hoặc mã như B02, danh sách một cột thay cho hàng chip.
  const [q, setQ] = useState('');
  const norm = (x: string) => x.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase();
  const found = patients.filter((x) => !q || norm(`${x.name} ${x.code}`).includes(norm(q)));

  if (me?.role !== 'doctor') return <NoAccess />;

  const go = () => router.push({ pathname: '/guided-capture', params: { woundId } });

  return (
    <Screen header={<Header back title="Chụp ảnh vết thương" subtitle="Ảnh vào đúng hồ sơ, rồi ghi diện tích" />}>
      <SectionTitle>Bệnh nhân</SectionTitle>
      {patients.length > 1 && <SearchField label="Tìm bệnh nhân" value={q} onChangeText={setQ} placeholder="Tìm theo tên hoặc mã bệnh nhân…" />}
      {patients.length > 0 && found.length === 0 && <Muted>Không tìm thấy bệnh nhân phù hợp.</Muted>}
      <View accessibilityRole="radiogroup">
        <ListCard>
          {found.map((x) => {
            const on = x.id === pid;
            return (
              <Pressable key={x.id} accessibilityRole="radio" accessibilityState={{ checked: on, selected: on }} accessibilityLabel={`${x.code} · ${x.name}`}
                onPress={() => { setPid(x.id); setWid(''); }}
                style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, opacity: pressed ? 0.7 : 1 })}>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? C.primary : C.textSoft} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontWeight: '700', color: C.text }}>{x.name}</Text>
                  <Text style={{ color: C.textSoft, fontSize: T.small }}>{x.code}</Text>
                </View>
              </Pressable>
            );
          })}
        </ListCard>
      </View>
      {patients.length === 0 && <Muted>Chưa có bệnh nhân được phân công. Thêm bệnh nhân ở tab Bệnh nhân.</Muted>}
      <SectionTitle>Vết thương</SectionTitle>
      {!pid ? (
        <Muted>Chọn bệnh nhân trước.</Muted>
      ) : wounds.length ? (
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
              <Text style={{ color: C.text, fontWeight: '700', fontSize: T.body }}>{last.id}</Text>
              <Text style={{ color: C.textSoft, fontSize: T.caption }}>{last.capture?.sourceDateKnown === false ? 'Thêm' : 'Chụp'} {fmtDate(last.captureDate)} · giữ góc và khoảng cách tương tự</Text>
            </View>
          </View>
        </Card>
      )}
      <Button label="Chụp có hướng dẫn" icon="camera" disabled={!woundId} onPress={go} reason="Chọn bệnh nhân và vết thương trước." />
      <Muted>Mở bước chụp để dùng camera hoặc chọn ảnh từ thư viện, rồi kiểm tra trước khi lưu.</Muted>
    </Screen>
  );
}
