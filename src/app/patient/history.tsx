import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { Card, Header, ListCard, IconBadge, InfoRow, Muted, Screen, SectionTitle, WoundPhoto, StatusChip } from '@/components/ui';
import { WOUND } from '@/theme.status';
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
    <Screen header={<Header title="Hồ sơ và lịch sử" subtitle={`${p.name} · ${p.code}`} />}>
      <Card>
        <InfoRow label="Họ tên" value={p.name} />
        <InfoRow label="Năm sinh" value={String(p.birthYear)} />
        <InfoRow label="Bác sĩ phụ trách" value={account(p.doctorId)?.name ?? '—'} />
        <InfoRow label="Đồng ý dùng ảnh cho nghiên cứu" value={p.researchConsent ? `Có (${fmtDate(p.consentDate)})` : 'Không'} />
        <Muted>Muốn thay đổi sự đồng ý, hãy báo bác sĩ phụ trách.</Muted>
      </Card>
      <SectionTitle icon="bandage-outline">Vết thương đang theo dõi</SectionTitle>
      <ListCard>
      {woundsOf(p.id).map((w) => {
        const imgs = imagesOf(w.id);
        const last = imgs[imgs.length - 1];
        return (
          <Pressable key={w.id} accessibilityRole="button" onPress={() => router.push({ pathname: '/wounds/[id]', params: { id: w.id } })} style={({ pressed }) => ({ paddingVertical: 12, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              {last ? <WoundPhoto image={last} style={{ width: 64, height: 64, borderRadius: 12 }} /> : <IconBadge icon="image-outline" size={64} tone="gray" />}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{w.code}: {w.location}</Text>
                <Muted>{`Theo dõi từ ${fmtDate(w.startDate)}, ${imgs.length} ảnh`}</Muted>
                <StatusChip status={WOUND[w.status]} label={WOUND_STATUS[w.status].label} />
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
            </View>
          </Pressable>
        );
      })}
      </ListCard>
    </Screen>
  );
}
