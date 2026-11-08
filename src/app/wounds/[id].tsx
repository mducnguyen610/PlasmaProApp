import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { SeverityCard } from '@/components/SeverityCard';
import { AreaChart } from '@/components/AreaChart';
import { NoAccess, useCanView } from '@/components/Guard';
import { ImageTile } from '@/components/items';
import { Button, Card, Chip, Empty, Header, InfoRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { ClosureActions } from '@/components/ClosureActions';
import { DoseRows, PhaseList, ProgressRows, ReviewNote } from '@/components/CourseCard';
import { areaReview, courseProgress, fmtDuration, followUpDates, phaseLabel, phasesOf, localDay } from '@/lib/course';
import { fmtDate, PLAN_STATUS, TREND, WOUND_STATUS } from '@/lib/format';
import { assessmentSummary } from '@/lib/assessment';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';

// BS04 – Chi tiết vết thương: vị trí, ngày bắt đầu, album ảnh theo ngày, diện tích đã nhập, lịch sử đánh giá.
export default function WoundDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me } = useStore();
  const { wound, patient, imagesOf, account, coursePlan, sessionsOf } = useLookups();
  const w = wound(id);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  const [showCourse, setShowCourse] = useState(false);
  const [showAllPhotos, setShowAllPhotos] = useState(false);
  const [showOldEvals, setShowOldEvals] = useState(false);
  if (!w || !p || !canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  const images = imagesOf(w.id);
  const today = localDay();
  const plan = coursePlan(w.id, { patientView: !isDoctor });
  const dev = data.devices.find((x) => x.id === p.deviceId);
  const pr = plan && dev ? courseProgress(plan, sessionsOf(dev.id).filter((s) => !s.woundId || s.woundId === w.id), today, (dev.lastSync ? localDay(dev.lastSync) : null)) : null;
  const currentPhase = plan && pr && pr.phaseIndex >= 0 ? phasesOf(plan)[pr.phaseIndex] : undefined;
  const byDate = new Map<string, typeof images>();
  for (const im of [...images].reverse()) byDate.set(im.captureDate, [...(byDate.get(im.captureDate) ?? []), im]);
  const evals = data.evaluations
    .filter((e) => e.woundId === w.id && (isDoctor || e.visibleToPatient))
    .sort((a, b) => b.date.localeCompare(a.date) || data.evaluations.indexOf(b) - data.evaluations.indexOf(a));


  const retakes = images.filter((i) => i.retakeRequested);
  const dates = [...byDate.entries()];
  const shownDates = showAllPhotos ? dates : dates.slice(0, 2);
  const shownEvals = showOldEvals ? evals : evals.slice(0, 1);

  // Thứ tự theo việc bác sĩ cần quyết định (đề xuất 5): cảnh báo, đợt điều trị, diện tích, đánh giá, album.
  // Vị trí, nhóm, ngày bắt đầu đưa lên đầu trang thay cho một thẻ riêng.
  return (
    <Screen header={<Header back title={`Vết thương ${w.code}`} subtitle={`${p.name} · ${p.code}`} />}>
      {/* Tiêu đề có thể bị cắt khi chữ to: vị trí và nhóm tổn thương luôn hiện đủ ở đây để tránh nhầm vết (R15). */}
      <Text style={{ fontWeight: '700', color: C.text }}>{w.location}{w.group ? <Text style={{ fontWeight: '400', color: C.textSoft }}>{` · ${w.group}`}</Text> : null}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Chip label={WOUND_STATUS[w.status].label} tone={WOUND_STATUS[w.status].tone} />
        <Muted>Bắt đầu {fmtDate(w.startDate)} · {images.length} ảnh</Muted>
      </View>

      {isDoctor && retakes.length > 0 && (
        <Card style={{ borderWidth: 1.5, borderColor: C.red }}>
          <Text style={{ color: C.red, fontWeight: '700' }}>Đã yêu cầu chụp lại {retakes.length} ảnh</Text>
          {retakes.map((im) => <Muted key={im.id}>{im.id}: {im.retakeRequested}</Muted>)}
        </Card>
      )}

      {/* Đợt điều trị của vết thương: tiến độ, mốc xem lại tuần 4, kết thúc khi liền rồi theo dõi. */}
      <Card>
        <SectionTitle icon="flash-outline" right={isDoctor ? <Text onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} style={{ color: C.primary, fontWeight: '600' }}>{plan ? 'Sửa đợt' : '+ Lập đợt'}</Text> : null}>
          Đợt điều trị
        </SectionTitle>
        {plan ? (
          <>
            <Chip label={`Phiên bản ${plan.version} · ${PLAN_STATUS[plan.status].label}`} tone={PLAN_STATUS[plan.status].tone} />
            {/* Một dòng tóm tắt; giai đoạn, liều và số liệu tuân thủ đầy đủ nằm sau nút "Xem chi tiết đợt". */}
            <Text style={{ color: C.text, fontWeight: '600' }}>
              {currentPhase ? `Giai đoạn ${pr!.phaseIndex + 1}/${pr!.phaseCount}: ${phaseLabel(currentPhase)}` : `${phasesOf(plan).length} giai đoạn`} · mức {plan.doseLevel ?? '—'}, {fmtDuration(plan.durationSec)}
            </Text>
            {pr && (
              <Text style={{ color: pr.missed + pr.extra > 0 && isDoctor ? C.amber : C.textSoft }}>
                {pr.done}/{pr.total} buổi đã xong
                {isDoctor && pr.missed > 0 ? ` · bỏ lỡ ${pr.missed}` : ''}
                {isDoctor && pr.extra > 0 ? ` · ngoài lịch ${pr.extra}` : ''}
                {plan.status === 'active' && pr.next ? ` · tiếp theo ${fmtDate(pr.next)}` : ''}
              </Text>
            )}
            <ReviewNote review={areaReview(images, plan, today)} forPatient={!isDoctor} />
            <Text accessibilityRole="button" accessibilityState={{ expanded: showCourse }} onPress={() => setShowCourse(!showCourse)} style={{ color: C.primary, fontWeight: '600', paddingVertical: 12, minHeight: 44 }}>
              {showCourse ? 'Ẩn chi tiết đợt' : 'Xem chi tiết đợt'}
            </Text>
            {showCourse && (
              <>
                <PhaseList plan={plan} current={pr?.phaseIndex} />
                <DoseRows plan={plan} />
                {pr && isDoctor && <ProgressRows pr={pr} />}
              </>
            )}
          </>
        ) : <Muted>Chưa có đợt điều trị cho vết thương này.</Muted>}
        {isDoctor && <ClosureActions woundId={w.id} status={w.status} check1={w.closureCheck1} followUpFrom={w.followUpFrom} today={today} hasPlan={!!plan} onNewCourse={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} />}
        {!isDoctor && w.status === 'follow_up' && w.followUpFrom && <Muted>Đã liền ngày {fmtDate(w.followUpFrom)}. Các lần kiểm tra: {followUpDates(w.followUpFrom).map((x) => fmtDate(x.date)).join(', ')}.</Muted>}
      </Card>

      <Card>
        <SectionTitle icon="stats-chart-outline" right={images.length >= 2 ? <Text onPress={() => router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id } })} style={{ color: C.primary, fontWeight: '600' }}>So sánh trước/sau</Text> : null}>Diện tích</SectionTitle>
        <AreaChart images={images} />
        {isDoctor && <Button label="Chụp / thêm ảnh có hướng dẫn" icon="camera-outline" onPress={() => router.push({ pathname: '/guided-capture', params: { woundId: w.id } })} />}
      </Card>

      <SeverityCard title="Mức độ vết thương" evaluation={evals[0]} doctor={account(evals[0]?.doctorId)?.name} />

      <SectionTitle
        icon="clipboard-outline"
        right={isDoctor ? <Text onPress={() => router.push({ pathname: '/evaluate/[woundId]', params: { woundId: w.id } })} style={{ color: C.primary, fontWeight: '600' }}>+ Ghi đánh giá</Text> : null}>
        {isDoctor ? 'Đánh giá gần nhất' : 'Nhận xét của bác sĩ'}
      </SectionTitle>
      {evals.length === 0 && <Card><Empty text="Chưa có đánh giá." /></Card>}
      {shownEvals.map((e) => (
        <Card key={e.id}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{fmtDate(e.date)} · {account(e.doctorId)?.name}</Text>
            <Chip label={TREND[e.trend].label} tone={TREND[e.trend].tone} />
          </View>
          <InfoRow label="Diện tích" value={formatAreaDisplay(e.areaCm2)} />
          {isDoctor && e.assessment ? <Text style={{ color: C.text }}>{assessmentSummary(e.assessment)}</Text> : null}
          {e.characteristics ? <Muted>Đặc điểm: {e.characteristics}</Muted> : null}
          {e.symptoms ? <Muted>Triệu chứng: {e.symptoms} (nguồn: {e.symptomSource || '—'})</Muted> : null}
          {e.instructions ? <Text style={{ color: C.text }}>Hướng dẫn: {e.instructions}</Text> : null}
          {e.nextReview ? <Muted>Tái đánh giá: {fmtDate(e.nextReview)}</Muted> : null}
          {isDoctor && <Chip label={e.visibleToPatient ? 'Bệnh nhân xem được' : 'Chỉ nội bộ'} tone={e.visibleToPatient ? 'blue' : 'gray'} />}
        </Card>
      ))}
      {evals.length > 1 && <Button variant="ghost" label={showOldEvals ? 'Ẩn đánh giá cũ' : `Xem đánh giá cũ (${evals.length - 1})`} onPress={() => setShowOldEvals(!showOldEvals)} />}

      <SectionTitle icon="albums-outline">Album ảnh</SectionTitle>
      {images.length === 0 && <Card><Empty icon="image-outline" text={isDoctor ? 'Chưa có ảnh. Chụp hoặc tải ảnh lên để bắt đầu.' : 'Chưa có ảnh do bác sĩ chụp.'} /></Card>}
      {shownDates.map(([date, ims]) => (
        <View key={date} style={{ gap: 8 }}>
          <Text style={{ color: C.textSoft, fontWeight: '700', fontSize: 14 }}>Ngày chụp / thêm ảnh {fmtDate(date)}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
            {ims.map((im) => (
              <ImageTile key={im.id} image={im} width={160} />
            ))}
          </View>
        </View>
      ))}
      {dates.length > 2 && <Button variant="ghost" label={showAllPhotos ? 'Thu gọn album' : `Xem tất cả (${dates.length} ngày chụp)`} onPress={() => setShowAllPhotos(!showAllPhotos)} />}
    </Screen>
  );
}
