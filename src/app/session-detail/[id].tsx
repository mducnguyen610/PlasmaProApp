/**
 * Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 5, M28, P10): chi tiết một phiên điều trị, chỉ xem. Trạng thái, thời điểm bệnh nhân
 * bắt đầu, thời điểm thiết bị hoàn thành, thời lượng thực tế, thiết bị đã dùng, kết quả hoặc lỗi, nguyên nhân dừng, các phiên trước.
 * Mọi giá trị lấy từ bản ghi máy báo về (DeviceSession); không suy ra kết quả khi máy chưa báo.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Card, Chip, Header, InfoRow, LinkRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { fmtDuration } from '@/lib/course';
import { fmtDateTime } from '@/lib/format';
import { LINK_ISSUE_TEXT, sessionResultLabel, sessionsOfPatient, syncText } from '@/lib/patientSessions';
import { sessionEndedAt } from '@/lib/sessionSchedule';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';

const RESULT = { done: 'Thiết bị báo hoàn thành', stopped: 'Thiết bị báo dừng trước khi hoàn thành', error: 'Thiết bị báo lỗi' } as const;

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me } = useStore();
  const { device, patient, wound, ownerOf } = useLookups();
  const s = data.sessions.find((x) => x.sessionId === id);
  const w = wound(s?.woundId);
  const dev = device(s?.deviceId);
  // 27/11/2026 (FR11, FR14): chủ phiên là bệnh nhân ghi trong phiên (hoặc người giữ máy lúc phiên bắt đầu), không phải người đang giữ máy.
  // Máy đã giao cho người khác thì người sau không mở được phiên của người trước bằng đường dẫn trực tiếp.
  const ownerId = s ? ownerOf(s) : undefined;
  const p = patient(ownerId);
  const mismatch = !!w && !!ownerId && w.patientId !== ownerId;
  const canView = useCanView(p);
  if (!s) return <NoAccess notFound />;
  if (!canView || !p || mismatch) return <NoAccess />;

  const status = sessionResultLabel(s);
  const tone = s.status === 'completed' ? 'green' : s.status === 'unknown' ? 'gray' : s.endState === 'error' ? 'red' : 'amber';
  const end = sessionEndedAt(s);
  const plan = s.planId ? data.plans.find((x) => x.id === s.planId) : undefined;
  const result = s.status === 'unknown' ? 'Chưa nhận trạng thái kết thúc từ máy (mất kết nối hoặc rời màn theo dõi). Không tính hoàn thành, không tính bỏ lỡ.' : s.endState ? RESULT[s.endState] : s.status === 'completed' ? 'Hoàn thành (bản ghi cũ, máy chưa báo trạng thái kết thúc)' : 'Dừng trước khi hoàn thành (bản ghi cũ)';
  // Các phiên trước của cùng bệnh nhân (và cùng vết nếu phiên đã gắn vết); không lấy theo máy để không lẫn phiên của người dùng khác.
  const earlier = sessionsOfPatient(data.sessions, p.id, { devices: data.devices, deviceEvents: data.deviceEvents })
    .filter((x) => x.sessionId !== s.sessionId && (s.woundId ? x.woundId === s.woundId : !x.woundId) && x.start < s.start)
    .sort((a, b) => b.start.localeCompare(a.start)).slice(0, 10);

  return (
    <Screen header={<Header back title="Chi tiết phiên" subtitle={`${p?.name ?? ''}${w ? ` · ${w.code}` : ''}`} />}>
      <Card testID="chi-tiet-phien">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ flex: 1, fontWeight: '700', color: C.text }}>Trạng thái</Text>
          <Chip label={status} tone={tone} />
        </View>
        <InfoRow label="Bệnh nhân bắt đầu" value={fmtDateTime(s.start)} />
        <InfoRow label="Thiết bị hoàn thành" value={`${fmtDateTime(end.at)}${end.estimated ? ' (ước tính từ giờ bắt đầu và thời lượng)' : ''}`} />
        <InfoRow label="Thời lượng thực tế" value={fmtDuration(Math.round(s.durationMin * 60))} />
        <InfoRow label="Thời lượng dự kiến" value={plan?.durationSec != null ? fmtDuration(plan.durationSec) : 'Không rõ'} />
        <InfoRow label="Thiết bị đã dùng" value={dev ? `${dev.code} · ${dev.model}` : s.deviceId} />
        <InfoRow label="Kết quả hoặc lỗi" value={result} />
        <InfoRow label="Nguyên nhân dừng" value={s.stopCause === 'patient_stop' ? 'Bệnh nhân bấm Dừng điều trị trên ứng dụng' : s.status === 'completed' ? 'Không có' : 'Chưa ghi nhận'} />
        <InfoRow label="Vết thương" value={w ? `${w.code}: ${w.location}` : 'Chưa gắn vết thương, không tính tiến độ'} />
        {s.linkIssue && <InfoRow label="Lý do chưa gắn" value={LINK_ISSUE_TEXT[s.linkIssue]} />}
        <InfoRow label="Phiên bản phác đồ đã nạp" value={s.planVersion ? `Phiên bản ${s.planVersion}` : 'Không rõ'} />
        <InfoRow label="Đồng bộ" value={syncText(s, me?.role === 'patient' ? 'patient' : 'doctor')} />
        <InfoRow label="Nguồn" value={s.source === 'simulated' ? 'Máy giả lập' : s.source === 'manual' ? 'Nhập tay' : 'Thiết bị'} />
        <Muted>Chỉ xem. Ứng dụng không tự gửi lại lệnh hay khởi động lại phiên.</Muted>
      </Card>
      <Card>
        <SectionTitle>Các phiên trước</SectionTitle>
        {earlier.length === 0 && <Muted>Chưa có phiên trước.</Muted>}
        {earlier.map((x) => (
          <LinkRow key={x.sessionId} icon="pulse-outline" tone={x.status === 'completed' ? 'green' : x.status === 'unknown' ? 'gray' : 'amber'} title={fmtDateTime(x.start)}
            sub={`${sessionResultLabel(x)} · ${fmtDuration(Math.round(x.durationMin * 60))}`}
            onPress={() => router.replace({ pathname: '/session-detail/[id]', params: { id: x.sessionId } })} />
        ))}
      </Card>
    </Screen>
  );
}
