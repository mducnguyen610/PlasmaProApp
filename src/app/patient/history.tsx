import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { noteText } from '@/components/AdherenceCalendar';
import { Card, Disclosure, Header, ListCard, IconBadge, InfoRow, Muted, Screen, SectionTitle, WoundPhoto, StatusChip } from '@/components/ui';
import { WOUND } from '@/theme.status';
import { fmtDate, fmtDateTime, WOUND_STATUS } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

// P2-08 (A27): tiêu đề "Lịch sử và hồ sơ" khớp tên tab "Lịch sử" (câu chữ chờ duyệt). Hồ sơ và lịch sử của bệnh nhân: thông tin cá nhân, bác sĩ phụ trách, vết thương, ảnh và nhận xét.
export default function PatientHistory() {
  const { data, me } = useStore();
  const { patient, account, woundsOf, imagesOf, sessionsOf } = useLookups();
  const p = patient(me?.patientId);
  if (!p) return null;
  // UX-19 (Đợt 11): năm buổi điều trị gần nhất do máy ghi; chạm một buổi để ghi hoặc sửa cảm giác ở Lịch trình.
  const myWounds = woundsOf(p.id);
  // A26: nhiều vết thì ghi buổi gắn vết nào; buổi không có woundId ghi "Chưa gắn vết thương".
  const woundTag = (wid?: string) => (wid ? myWounds.find((x) => x.id === wid)?.code ?? 'Vết không còn trong danh sách' : myWounds.length > 1 ? 'Chưa gắn vết thương' : '');
  const recent = p.deviceId ? [...sessionsOf(p.deviceId)].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 5) : [];
  return (
    <Screen header={<Header title="Lịch sử và hồ sơ" subtitle={`${p.name} · ${p.code}`} />}>
      {/* P2-07a (R2-07): vết thương lên đầu (việc hay làm hơn), rồi buổi điều trị, thông tin cá nhân cuối. */}
      <SectionTitle icon="bandage-outline">Vết thương đang theo dõi</SectionTitle>
      <ListCard>
      {myWounds.map((w) => {
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
      <SectionTitle icon="flash-outline" action="Lịch trình" onAction={() => router.push('/schedule')}>Các buổi điều trị gần đây</SectionTitle>
      {recent.length === 0 ? (
        <Card><Muted>{p.deviceId ? 'Chưa có buổi điều trị nào được ghi.' : 'Chưa được giao máy điều trị nên chưa có buổi nào.'}</Muted></Card>
      ) : (
        <ListCard>
          {recent.map((s) => {
            const n = data.sessionNotes.find((x) => x.sessionId === s.sessionId);
            const done = s.status === 'completed';
            return (
              <Pressable key={s.sessionId} accessibilityRole="button" accessibilityLabel={`Buổi ${fmtDateTime(s.start)}, ${done ? 'đủ thời gian' : 'bị ngắt'}, ${s.durationMin} phút${woundTag(s.woundId) ? `, ${woundTag(s.woundId)}` : ''}. ${n ? noteText(n) : 'Chưa ghi cảm giác'}. Chạm để ${n ? 'sửa' : 'ghi'} cảm giác`}
                onPress={() => router.push({ pathname: '/schedule', params: { sessionId: s.sessionId } })} style={({ pressed }) => ({ paddingVertical: 12, minHeight: 48, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Ionicons name={done ? 'checkmark-circle' : 'stop-circle-outline'} size={26} color={done ? C.green : C.amber} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: '700', color: C.text }}>{fmtDateTime(s.start)}</Text>
                    <Text style={{ color: C.textSoft, fontSize: T.small }}>{[done ? 'Đủ thời gian' : 'Bị ngắt giữa chừng', `${s.durationMin} phút`, woundTag(s.woundId)].filter(Boolean).join(' · ')}</Text>
                    <Text style={{ color: n ? C.text : C.primary, fontSize: T.small }}>{n ? noteText(n) : 'Chưa ghi cảm giác, chạm để ghi'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={C.textFaint} />
                </View>
              </Pressable>
            );
          })}
        </ListCard>
      )}
      {/* Giai đoạn 5 giao diện theo tác vụ: thông tin cá nhân là thông tin tham khảo, thu gọn; dòng tóm tắt giữ bác sĩ phụ trách.
          Các dòng và câu bên trong giữ nguyên. */}
      <Card>
        <Disclosure icon="person-outline" title="Thông tin cá nhân" summary={`${account(p.doctorId)?.name ?? 'Chưa có bác sĩ phụ trách'} · ${p.researchConsent ? 'đồng ý dùng ảnh cho nghiên cứu' : 'không dùng ảnh cho nghiên cứu'}`}>
          <InfoRow label="Họ tên" value={p.name} />
          <InfoRow label="Năm sinh" value={String(p.birthYear)} />
          <InfoRow label="Bác sĩ phụ trách" value={account(p.doctorId)?.name ?? '—'} />
          <InfoRow label="Đồng ý dùng ảnh cho nghiên cứu" value={p.researchConsent ? `Có (${fmtDate(p.consentDate)})` : 'Không'} />
          <Muted>Muốn thay đổi sự đồng ý, hãy báo bác sĩ phụ trách.</Muted>
        </Disclosure>
      </Card>
    </Screen>
  );
}
