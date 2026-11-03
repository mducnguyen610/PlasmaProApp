import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Card, Chip, Header, IconBadge, InfoRow, Muted, Screen, SectionTitle, WoundPhoto } from '@/components/ui';
import { fmtDate, WOUND_STATUS } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';

// Hồ sơ và lịch sử của bệnh nhân: thông tin cá nhân, bác sĩ phụ trách, vết thương, ảnh và nhận xét.
export default function PatientHistory() {
  const { me } = useStore();
  const { patient, account, woundsOf, imagesOf } = useLookups();
  const p = patient(me?.patientId);
  if (!p) return null;
  return (
    <Screen header={<Header title="Hồ sơ và lịch sử" subtitle={p.code} />}>
      <Card>
        <InfoRow label="Họ tên" value={p.name} />
        <InfoRow label="Năm sinh" value={String(p.birthYear)} />
        <InfoRow label="Bác sĩ phụ trách" value={account(p.doctorId)?.name ?? '—'} />
        <InfoRow label="Đồng ý dùng ảnh cho nghiên cứu" value={p.researchConsent ? `Có (${fmtDate(p.consentDate)})` : 'Không'} />
        <Muted>Muốn thay đổi sự đồng ý, hãy báo bác sĩ phụ trách.</Muted>
      </Card>
      <SectionTitle icon="bandage-outline">Vết thương đang theo dõi</SectionTitle>
      {woundsOf(p.id).map((w) => {
        const imgs = imagesOf(w.id);
        const last = imgs[imgs.length - 1];
        return (
          <Card key={w.id} onPress={() => router.push({ pathname: '/wounds/[id]', params: { id: w.id } })}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {last ? <WoundPhoto image={last} style={{ width: 64, height: 64, borderRadius: 12 }} /> : <IconBadge icon="image-outline" size={64} tone="gray" />}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{w.code} · {w.location}</Text>
                <Muted>{imgs.length} ảnh · từ {fmtDate(w.startDate)}</Muted>
                <Chip label={WOUND_STATUS[w.status].label} tone={WOUND_STATUS[w.status].tone} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}
