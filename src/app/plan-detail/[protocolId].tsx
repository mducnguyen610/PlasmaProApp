/**
 * Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 4.2; M26, M33, M35): chi tiết phác đồ, 5 nhóm. Nút "Đổi thông số" (tạo phiên bản
 * mới có ngày bắt đầu áp dụng) nằm ở màn này. Xóa phác đồ chỉ khi chưa có phiên (P9), giữ như trước.
 */
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DoseRows } from '@/components/CourseCard';
import { NoAccess, useCanView } from '@/components/Guard';
import { planSummaryLines, SlotList, woundSessions } from '@/components/ProtocolTab';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Disclosure, Field, Header, InfoRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { localDay, phaseLabel, phasesOf } from '@/lib/course';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, PLAN_STATUS } from '@/lib/format';
import { changeHistory, protocolsOfWound, versionStatusLabel } from '@/lib/planLifecycle';
import { planDeleteBlocker } from '@/lib/planVersion';
import { protocolSlots, slotSummary } from '@/lib/sessionSchedule';
import { useLookups, useStore } from '@/lib/store';
import { C, numeric, T } from '@/theme';

export default function PlanDetail() {
  const { protocolId } = useLocalSearchParams<{ protocolId: string }>();
  const { data, me, deletePlan } = useStore();
  const { patient, wound, account } = useLookups();
  const first = data.plans.find((x) => x.protocolId === protocolId);
  const p = patient(first?.patientId);
  const w = wound(first?.woundId);
  const canView = useCanView(p);
  const [delReason, setDelReason] = useState('');
  if (!first || !p || !w) return <NoAccess notFound />;
  if (!canView || me?.role !== 'doctor') return <NoAccess />;

  const views = protocolsOfWound(data.plans, p.id, w.id);
  const view = views.find((v) => v.protocolId === protocolId)!;
  const cur = view.current;
  const canEdit = p.doctorId === me.id && !p.archivedAt;
  const today = localDay();
  const slots = protocolSlots({
    versions: view.versions, sessions: woundSessions(data.sessions, w, p) as typeof data.sessions, changes: data.sessionChanges ?? [], live: data.liveSessions, today,
    nextProtocolStart: views.map((x) => x.startDate).filter((d) => d > view.startDate).sort()[0],
  });
  const sum = slotSummary(slots);
  const history = changeHistory(view.versions, fmtDate);
  const blocker = planDeleteBlocker(data.plans, data.sessions, data.deviceLinks ?? [], protocolId);
  const statusLabel = versionStatusLabel(cur) ?? PLAN_STATUS[cur.status].label;
  const canChange = canEdit && view.open;

  return (
    <Screen header={<Header back title={view.title} subtitle={`${p.name} · ${w.code} · ${w.location}`} />}
      footer={canChange ? <Button label="Đổi thông số" icon="create-outline" onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} /> : undefined}>
      <Card testID="nhom-1">
        <SectionTitle>Phác đồ đang áp dụng</SectionTitle>
        <InfoRow label="Mã phác đồ" value={view.title} />
        <InfoRow label="Trạng thái" value={<Chip label={statusLabel} tone={cur.status === 'active' ? 'green' : cur.status === 'paused' ? 'amber' : 'gray'} />} />
        <InfoRow label="Phiên bản" value={`${cur.version}${view.pending ? ` (phiên bản ${view.pending.version} chờ áp dụng từ ${fmtDate(view.pending.effectiveFrom)})` : ''}`} />
        <InfoRow label="Ngày bắt đầu" value={fmtDate(view.startDate)} />
        <InfoRow label="Ngày kết thúc dự kiến" value={fmtDate(cur.endDate)} />
      </Card>
      <Card testID="nhom-2">
        <SectionTitle>Thông số điều trị</SectionTitle>
        <DoseRows plan={cur} />
        {cur.minIntervalMin != null ? <InfoRow label="Giãn cách giữa các lần" value={`${cur.minIntervalMin} phút`} /> : null}
        <Muted>Liều J/cm² và bảng năng lực HFP chính thức chờ số liệu firmware (HT-02).</Muted>
      </Card>
      <Card testID="nhom-3">
        <SectionTitle>Lịch điều trị</SectionTitle>
        <InfoRow label="Tần suất" value={phasesOf(cur).map(phaseLabel).join(', sau đó ')} />
        <InfoRow label="Số lần dự kiến" value={String(sum.planned)} />
        <InfoRow label="Ngày điều trị" value={phasesOf(cur).map((ph) => `${fmtDate(ph.from)} đến ${fmtDate(ph.to)}`).join('; ')} />
        <InfoRow label="Khung giờ thực hiện" value={cur.timeWindow ? `${cur.timeWindow.from} đến ${cur.timeWindow.to}` : 'Chưa đặt'} />
      </Card>
      <Card testID="nhom-4">
        <SectionTitle>Theo dõi thực hiện</SectionTitle>
        <InfoRow label="Tổng phiên dự kiến" value={String(sum.planned)} />
        <InfoRow label="Đã hoàn thành" value={String(sum.completed)} />
        <InfoRow label="Chưa thực hiện" value={`${sum.notDone}${sum.missed ? ` (bỏ lỡ ${sum.missed})` : ''}`} />
        <InfoRow label="Thất bại hoặc gián đoạn" value={String(sum.failedOrInterrupted)} />
        <Muted>Đã bỏ lỡ tính theo lịch và dữ liệu máy đã đồng bộ. Máy chưa đồng bộ thì phiên đã làm có thể chưa hiện.</Muted>
        <Disclosure title="Lịch sử thực hiện" summary={`${slots.length} phiên`}>
          <SlotList slots={slots} plan={cur} canChange={false} onChange={() => {}} limit={30} />
        </Disclosure>
      </Card>
      <Card testID="nhom-5">
        <SectionTitle>Lịch sử thay đổi</SectionTitle>
        {history.map((h, i) => (
          <View key={`${h.at}-${i}`} style={{ gap: 2, paddingVertical: 6, borderTopWidth: i ? 1 : 0, borderTopColor: C.divider }}>
            <Text style={[{ color: C.text, fontWeight: '600', fontSize: T.small }, numeric]}>{`${fmtDateTime(h.at)} · ${h.title}`}</Text>
            <Muted>{`${account(h.by)?.name ?? h.by}${h.reason ? ` · Lý do: ${h.reason}` : ''}`}</Muted>
          </View>
        ))}
        {view.versions.length > 1 && (
          <Disclosure title="Nội dung các phiên bản" summary={`${view.versions.length} phiên bản`}>
            {view.versions.map((v) => (
              <View key={v.id} style={{ gap: 2, paddingVertical: 6 }}>
                <Text style={{ color: C.text, fontWeight: '600' }}>{`Phiên bản ${v.version} · ${versionStatusLabel(v) ?? PLAN_STATUS[v.status].label}`}</Text>
                {planSummaryLines(v).map((l) => <Muted key={l}>{l}</Muted>)}
              </View>
            ))}
          </Disclosure>
        )}
      </Card>
      {canEdit && (
        <Card>
          <Disclosure icon="trash-outline" title="Xóa phác đồ" summary={blocker ? 'Không xóa được' : 'Chỉ khi chưa có phiên'}>
            {blocker ? <Muted>{blocker}</Muted> : (
              <View style={{ gap: 8 }}>
                <Muted>Phác đồ chưa có phiên điều trị nên xóa được. Nhật ký giữ mã phác đồ, người xóa, thời điểm và lý do.</Muted>
                <Field label="Lý do xóa" value={delReason} onChangeText={setDelReason} placeholder="Ví dụ: lập nhầm vết thương" />
                <Button label="Xóa phác đồ" icon="trash-outline" variant="danger" disabled={!delReason.trim()} reason="Nhập lý do xóa."
                  onPress={() => confirm('Xóa phác đồ', `Xóa ${view.versions.length} phiên bản của phác đồ này. Không hoàn tác được.`, async () => {
                    try { await deletePlan(protocolId, delReason); router.back(); } catch (e) { notify('Chưa xóa được', e instanceof Error ? e.message : String(e)); }
                  }, 'Xóa')} />
              </View>
            )}
          </Disclosure>
        </Card>
      )}
    </Screen>
  );
}
