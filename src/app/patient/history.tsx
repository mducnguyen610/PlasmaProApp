import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { noteText } from '@/components/AdherenceCalendar';
import { Card, Disclosure, Header, ListCard, IconBadge, InfoRow, Muted, Screen, SectionTitle, WoundPhoto, StatusChip } from '@/components/ui';
import { WOUND } from '@/theme.status';
import { fmtDate, fmtDateTime, WOUND_STATUS } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { sessionResultLabel, syncText } from '@/lib/patientSessions';
import { C, T } from '@/theme';
import { birthLabel } from '@/lib/patientIdentity';

// P2-08 (A27): tiêu đề "Lịch sử và hồ sơ" khớp tên tab "Lịch sử" (câu chữ chờ duyệt). Hồ sơ và lịch sử của bệnh nhân: thông tin cá nhân, bác sĩ phụ trách, vết thương, ảnh và nhận xét.
export default function PatientHistory() {
  const { data, me } = useStore();
  const { patient, account, woundsOf, imagesOf, sessionsOfPatient } = useLookups();
  const p = patient(me?.patientId);
  if (!p) return null;
  // UX-19 (Đợt 11): năm buổi điều trị gần nhất do máy ghi; chạm một buổi để ghi hoặc sửa cảm giác ở Lịch trình.
  const myWounds = woundsOf(p.id);
  // A26: nhiều vết thì ghi buổi gắn vết nào; buổi không có woundId ghi "Chưa gắn vết thương".
  // 27/11/2026 (FR10, FR11): buổi chưa gắn vết luôn ghi rõ, kể cả khi chỉ có một vết, vì buổi đó không được tính cho vết nào.
  const woundTag = (wid?: string) => (wid ? myWounds.find((x) => x.id === wid)?.code ?? 'Vết không còn trong danh sách' : 'Chưa gắn vết thương, không tính tiến độ');
  // Lịch sử theo bệnh nhân, không theo máy đang giữ: đổi máy vẫn thấy buổi cũ; máy đã trả không làm lộ buổi của người dùng sau.
  const recent = [...sessionsOfPatient(p.id)].sort((a, b) => b.start.localeCompare(a.start)).slice(0, 5);
  const unnoted = recent.filter((s) => !data.sessionNotes.some((x) => x.sessionId === s.sessionId)).length;
  return (
    <Screen header={<Header title="Lịch sử và hồ sơ" subtitle={`${p.name} · ${p.code}`} />}>
      {/* P2-07a (R2-07): vết thương lên đầu (việc hay làm hơn), rồi buổi điều trị, thông tin cá nhân cuối. */}
      {/* Stage 9A (bố cục riêng N04): số vết và số buổi chưa ghi cảm giác ở cuối dòng tiêu đề mục; buổi chưa ghi chỉ hiện một nút
          "Ghi cảm giác" ở cuối dòng thay cho câu lặp lại ở mỗi dòng. Nhãn đọc màn hình, thứ tự mục và điều hướng giữ nguyên. */}
      <SectionTitle icon="bandage-outline" right={<Text style={{ color: C.textSoft, fontSize: T.small }}>{`${myWounds.length} vết`}</Text>}>Vết thương đang theo dõi</SectionTitle>
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
      <SectionTitle icon="flash-outline" action="Lịch trình" onAction={() => router.push('/schedule')}
        caption={unnoted > 0 ? `${unnoted} trên ${recent.length} buổi chưa ghi cảm giác` : undefined}>Các buổi điều trị gần đây</SectionTitle>
      {recent.length === 0 ? (
        <Card><Muted>{p.deviceId ? 'Chưa có buổi điều trị nào được ghi.' : 'Chưa có buổi điều trị nào được ghi. Hiện chưa được giao máy.'}</Muted></Card>
      ) : (
        <ListCard>
          {recent.map((s) => {
            const n = data.sessionNotes.find((x) => x.sessionId === s.sessionId);
            const done = s.status === 'completed';
            const result = sessionResultLabel(s);
            return (
              <Pressable key={s.sessionId} accessibilityRole="button" accessibilityLabel={`Buổi ${fmtDateTime(s.start)}, ${result}, ${s.durationMin} phút, ${syncText(s, 'patient')}${woundTag(s.woundId) ? `, ${woundTag(s.woundId)}` : ''}. ${n ? noteText(n) : 'Chưa ghi cảm giác'}. Chạm để ${n ? 'sửa' : 'ghi'} cảm giác`}
                onPress={() => router.push({ pathname: '/schedule', params: { sessionId: s.sessionId } })} style={({ pressed }) => ({ paddingVertical: 12, minHeight: 48, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                  <Ionicons name={done ? 'checkmark-circle' : s.status === 'unknown' ? 'help-circle-outline' : 'stop-circle-outline'} size={26} color={done ? C.green : s.status === 'unknown' ? C.textSoft : C.amber} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ fontWeight: '700', color: C.text }}>{fmtDateTime(s.start)}</Text>
                    <Text style={{ color: C.textSoft, fontSize: T.small }}>{[result, `${s.durationMin} phút`, woundTag(s.woundId)].filter(Boolean).join(' · ')}</Text>
                    <Text style={{ color: C.textSoft, fontSize: T.caption }}>{syncText(s, 'patient')}</Text>
                    {n ? <Text style={{ color: C.text, fontSize: T.small }}>{noteText(n)}</Text> : (
                      <View style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: C.primarySoft }}>
                        <Ionicons name="create-outline" size={16} color={C.primary} />
                        <Text style={{ color: C.primary, fontSize: T.small, fontWeight: '700' }}>Ghi cảm giác</Text>
                      </View>
                    )}
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
          <InfoRow label="Ngày sinh" value={birthLabel(p)} />
          <InfoRow label="Bác sĩ phụ trách" value={account(p.doctorId)?.name ?? '—'} />
          <InfoRow label="Đồng ý dùng ảnh cho nghiên cứu" value={p.researchConsent ? `Có (${fmtDate(p.consentDate)})` : 'Không'} />
          <Muted>Muốn thay đổi sự đồng ý, hãy báo bác sĩ phụ trách.</Muted>
        </Disclosure>
      </Card>
    </Screen>
  );
}
