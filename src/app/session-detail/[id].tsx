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
import { sessionEndedAt } from '@/lib/sessionSchedule';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';

const RESULT = { done: 'Thiết bị báo hoàn thành', stopped: 'Thiết bị báo dừng trước khi hoàn thành', error: 'Thiết bị báo lỗi' } as const;

export default function SessionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data } = useStore();
  const { device, patient, wound } = useLookups();
  const s = data.sessions.find((x) => x.sessionId === id);
  const w = wound(s?.woundId);
  const dev = device(s?.deviceId);
  const p = patient(w?.patientId ?? dev?.patientId);
  const canView = useCanView(p);
  if (!s) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  const status = s.status === 'completed' ? 'Hoàn thành' : s.endState === 'error' ? 'Thất bại' : s.status === 'over_limit' ? 'Vượt giới hạn (không tính)' : 'Bị gián đoạn';
  const tone = s.status === 'completed' ? 'green' : s.endState === 'error' ? 'red' : 'amber';
  const end = sessionEndedAt(s);
  const plan = s.planId ? data.plans.find((x) => x.id === s.planId) : undefined;
  const result = s.endState ? RESULT[s.endState] : s.status === 'completed' ? 'Hoàn thành (bản ghi cũ, máy chưa báo trạng thái kết thúc)' : 'Dừng trước khi hoàn thành (bản ghi cũ)';
  const earlier = data.sessions.filter((x) => x.sessionId !== s.sessionId && (s.woundId ? x.woundId === s.woundId : x.deviceId === s.deviceId) && x.start < s.start)
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
        <InfoRow label="Phiên bản phác đồ" value={s.planVersion ? `Phiên bản ${s.planVersion}` : 'Không rõ (phiên cũ)'} />
        <InfoRow label="Nguồn" value={s.source === 'simulated' ? 'Máy giả lập' : s.source === 'manual' ? 'Nhập tay' : 'Thiết bị'} />
        <Muted>Chỉ xem. Ứng dụng không tự gửi lại lệnh hay khởi động lại phiên.</Muted>
      </Card>
      <Card>
        <SectionTitle>Các phiên trước</SectionTitle>
        {earlier.length === 0 && <Muted>Chưa có phiên trước.</Muted>}
        {earlier.map((x) => (
          <LinkRow key={x.sessionId} icon="pulse-outline" tone={x.status === 'completed' ? 'green' : 'amber'} title={fmtDateTime(x.start)}
            sub={`${x.status === 'completed' ? 'Hoàn thành' : x.endState === 'error' ? 'Thất bại' : 'Bị gián đoạn'} · ${fmtDuration(Math.round(x.durationMin * 60))}`}
            onPress={() => router.replace({ pathname: '/session-detail/[id]', params: { id: x.sessionId } })} />
        ))}
      </Card>
    </Screen>
  );
}
