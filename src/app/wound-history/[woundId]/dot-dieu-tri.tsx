import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { ClinicalContext } from '@/components/ClinicalContext';
import { DoseRows, PhaseList, ProgressRows, ReviewNote } from '@/components/CourseCard';
import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Card, Divider, Header, LinkRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { areaReview, courseProgress, followUpDates, localDay, phasesOf, sessionsForWound } from '@/lib/course';
import { fmtDate, PLAN_STATUS } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

/**
 * Đợt điều trị của một vết (màn riêng mở từ N05). Nội dung chuyển nguyên từ thẻ "Đợt điều trị" của N05 trước đây
 * (giai đoạn, tiến độ, so với đầu đợt, các giai đoạn, liều, mốc kiểm tra sau khi liền), nay hiện sẵn thay vì thu gọn.
 * Cùng nguồn: coursePlan (bệnh nhân chỉ thấy đợt đã xác nhận), sessionsForWound, areaReview. Chỉ đọc.
 */
export default function WoundCourse() {
  const { woundId } = useLocalSearchParams<{ woundId: string }>();
  const { data, me } = useStore();
  const { wound, patient, imagesOf, coursePlan, sessionsOf } = useLookups();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  if (!w || !p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;
  const isDoctor = me?.role === 'doctor';
  const today = localDay();
  const plan = coursePlan(w.id, { patientView: !isDoctor });
  const dev = data.devices.find((x) => x.id === p.deviceId);
  const pr = plan && dev ? courseProgress(plan, sessionsForWound(sessionsOf(dev.id), w.id), today, dev.lastSync ? localDay(dev.lastSync) : null) : null;
  const review = plan ? areaReview(imagesOf(w.id), plan, today) : null;
  const phaseCount = plan ? phasesOf(plan).length : 0;
  return (
    <Screen header={<Header back title="Đợt điều trị" subtitle={`${w.code} · ${w.location}`} />}>
      <ClinicalContext patient={p} wound={w} />
      {plan ? (
        <>
          <Card>
            <Text style={{ fontSize: T.cardTitle, fontWeight: '700', color: C.text }}>{pr && pr.phaseIndex >= 0 ? `Giai đoạn ${pr.phaseIndex + 1} trên ${pr.phaseCount}` : `${phaseCount} giai đoạn`}</Text>
            <Text style={{ color: C.text }}>{pr ? `Đã xong ${pr.done}/${pr.total} buổi${isDoctor && pr.missed > 0 ? `, bỏ lỡ ${pr.missed}` : ''}${isDoctor && pr.extra > 0 ? `, ngoài lịch ${pr.extra}` : ''}, ${PLAN_STATUS[plan.status].label.toLowerCase()}` : PLAN_STATUS[plan.status].label}</Text>
            <Muted>Phiên bản {plan.version}{plan.status === 'active' && pr?.next ? ` · buổi tiếp theo ${fmtDate(pr.next)}` : ''}</Muted>
            {review && <ReviewNote review={review} forPatient={!isDoctor} />}
            {pr && isDoctor && <ProgressRows pr={pr} />}
          </Card>
          <SectionTitle icon="options-outline">Các giai đoạn</SectionTitle>
          <Card><PhaseList plan={plan} current={pr?.phaseIndex} /></Card>
          <SectionTitle icon="flash-outline">Liều</SectionTitle>
          <Card><DoseRows plan={plan} /></Card>
        </>
      ) : <Card><Muted>Chưa có đợt điều trị cho vết thương này.</Muted></Card>}
      {w.status === 'follow_up' && w.followUpFrom && <Card><Muted>Đã liền ngày {fmtDate(w.followUpFrom)}. Các lần kiểm tra: {followUpDates(w.followUpFrom).map((x) => fmtDate(x.date)).join(', ')}.</Muted></Card>}
      {/* Các phiên bản đợt đã xác nhận (N06 phía bệnh nhân, B06 phía bác sĩ), cùng vết. */}
      <Card>
        <View>
          <LinkRow icon="document-text-outline" tone="violet" title="Phiên bản đợt điều trị" sub={isDoctor ? 'Lập hoặc sửa phiên bản' : 'Lịch, liều, lịch tái khám theo từng phiên bản'}
            onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} />
        </View>
        {!isDoctor && <Divider />}
        {!isDoctor && <Muted>Thiết bị đã được khóa theo mức năng lượng và thời gian bác sĩ đặt.</Muted>}
      </Card>
    </Screen>
  );
}
