import { router } from 'expo-router';

import { DeviceView } from '@/components/DeviceView';
import { PlanAckCard } from '@/components/PlanAckCard';
import { needsPatientAck } from '@/lib/planVersion';
import { Button, Card, Empty, Header, Notice, Screen } from '@/components/ui';
import { courseProgress, courseStatus, localDay, sessionsForWound } from '@/lib/course';
import { patientHomeCourses } from '@/lib/patientHome';
import { reconciledThrough } from '@/lib/patientSessions';
import { scheduleItems } from '@/lib/sessionSchedule';
import { ScheduleItemList } from '@/components/ScheduleItemList';
import { fmtDate } from '@/lib/format';
import { monitorTarget } from '@/lib/monitorTarget';
import { useLookups, useStore } from '@/lib/store';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { C, semantic, T } from '@/theme';

export default function PatientDevice() {
  const { data, me } = useStore();
  const { patient, device, woundsOf, coursePlan, sessionsOfPatient } = useLookups();
  const p = patient(me?.patientId);
  const d = device(p?.deviceId);
  // Cùng cách tính với trang chủ (N02): hôm nay có buổi chiếu thì nạp liệu trình là việc chính; ngày khác chỉ là nút phụ (V05).
  const today = localDay();
  // 27/11/2026 (FR6): nhiều vết đang điều trị thì bệnh nhân chọn phiên của vết nào; không tự lấy vết đầu tiên.
  const courses = p ? woundsOf(p.id).map((w) => ({ w, plan: coursePlan(w.id, { patientView: true }) })) : [];
  const { treatingAll, treating } = patientHomeCourses(courses);
  const mine = p ? sessionsOfPatient(p.id) : [];
  const sessions = treating ? sessionsForWound(mine, treating.w.id) : [];
  const status = treating?.plan ? courseStatus(courseProgress(treating.plan, sessions, today, reconciledThrough()), fmtDate) : null;
  const items = p && treatingAll.length > 1
    ? scheduleItems({ plans: data.plans, wounds: woundsOf(p.id), patientId: p.id, sessions: mine, changes: data.sessionChanges ?? [], live: data.liveSessions, today, from: today, to: today, confirmedOnly: true, reconciledThrough: reconciledThrough() })
    : [];
  const treatToday = status?.kind === 'treat';
  // Stage 9B (S8-B04): mở T02 kèm đúng vết thương khi chỉ có một đợt đang áp dụng (cùng điều kiện T01 chọn đợt);
  // nhiều đợt thì mở T01 để chọn vết rõ ràng; không có đợt thì giữ hành vi cũ.
  const openMonitor = () => {
    // Phiên đang chạy của bệnh nhân thì mở đúng vết của phiên đó; không thì theo vết có phác đồ đang áp dụng (bản bệnh nhân xem được).
    const live = p ? (data.liveSessions ?? []).find((l) => l.patientId === p.id) : undefined;
    if (live?.woundId) { router.push({ pathname: '/session-monitor', params: { woundId: live.woundId } }); return; }
    const t = p ? monitorTarget(woundsOf(p.id).map((w) => ({ woundId: w.id, plan: coursePlan(w.id, { patientView: true }) }))) : { kind: 'none' as const };
    if (t.kind === 'monitor') router.push({ pathname: '/session-monitor', params: { woundId: t.woundId } });
    else if (t.kind === 'choose') router.push('/connect-device');
    else router.push('/session-monitor');
  };
  return (
    <Screen header={<Header title="Thiết bị của tôi" subtitle={d?.code} />}>
      {/* Chỉ nạp liệu trình khi bác sĩ đã giao máy (FR13): phiên và nhật ký phải gắn với một thiết bị. */}
      {/* Stage 9A (bố cục riêng N07): một thẻ "Hôm nay" gom trạng thái lịch hôm nay và nút nạp liệu trình (việc chính); hai việc phụ
          (theo dõi phiên, báo sự cố) đứng cạnh nhau ngay dưới, rồi mới tới thông tin máy. Điều kiện hiện nút và đích đến giữ nguyên. */}
      {p && d && (
        <Card hero testID="n07-hom-nay">
          {treatingAll.length > 1 && <>
            <Text accessibilityRole="header" style={{ color: C.text, fontSize: T.cardTitle, fontWeight: '700' }}>Chọn phiên cần nạp</Text>
            {treatingAll.filter((c) => c.plan && needsPatientAck(c.plan)).map((c) => <PlanAckCard key={'ack-' + c.w.id} plan={c.plan!} wound={c.w} />)}
            <ScheduleItemList items={items} wounds={woundsOf(p.id)} today={today} empty="Hôm nay không có phiên theo lịch." />
          </>}
          {status && treatToday ? <Text style={{ color: C.text, fontSize: T.cardTitle, fontWeight: '700' }}>{status.title}</Text> : null}
          {!treatToday && status && <Notice tone={semantic.neutral.tone} icon={status.kind === 'rest' ? 'moon-outline' : 'information-circle-outline'}>{`${status.title}. Không cần nạp liệu trình hôm nay.`}</Notice>}
          {/* Giai đoạn B (AU-04): phiên bản mới chưa được bệnh nhân xác nhận đọc thì xác nhận trước, rồi mới nạp. */}
          {treatingAll.length > 1 ? null : treating?.plan && needsPatientAck(treating.plan)
            ? <PlanAckCard plan={treating.plan} wound={treating.w} />
            : treating?.plan ? <Button label="Nạp liệu trình vào máy" variant={treatToday ? 'primary' : 'secondary'} icon="arrow-down-circle-outline" onPress={() => router.push({ pathname: '/connect-device', params: { woundId: treating.w.id, planId: treating.plan!.id, date: today } })} />
            : <Notice tone={semantic.neutral.tone} icon="information-circle-outline">Chưa có phác đồ được bác sĩ xác nhận để nạp.</Notice>}
        </Card>
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {p && d && <View style={{ flexGrow: 1, flexBasis: 150 }}><Button label="Theo dõi phiên điều trị" variant="secondary" icon="pulse-outline" onPress={openMonitor} /></View>}
        <View style={{ flexGrow: 1, flexBasis: 150 }}><Button label="Báo sự cố thiết bị" variant="secondary" icon="warning-outline" onPress={() => router.push({ pathname: '/report', params: { kind: 'device' } })} /></View>
      </View>
      {/* Giai đoạn 5 giao diện theo tác vụ (TB-05): việc cần làm (trạng thái hôm nay, nạp liệu trình, theo dõi phiên, báo sự cố)
          lên đầu màn; thông tin máy và số lần điều trị 7 ngày (tham khảo) xuống dưới. Điều kiện hiện nút giữ nguyên. */}
      {d ? <DeviceView device={d} level="patient" /> : <Card><Empty icon="hardware-chip-outline" text="Chưa được gán thiết bị." /></Card>}
    </Screen>
  );
}
