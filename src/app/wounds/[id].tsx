import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { SeverityCard } from '@/components/SeverityCard';
import { AreaChart } from '@/components/AreaChart';
import { NoAccess, useCanView } from '@/components/Guard';
import { ImageTile } from '@/components/items';
import { Button, Card, Chip, Disclosure, Empty, Header, InfoRow, Muted, Screen, SectionTitle } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { ClosureActions } from '@/components/ClosureActions';
import { DoseRows, PhaseList, ProgressRows, ReviewNote } from '@/components/CourseCard';
import { areaReview, courseProgress, fmtDuration, followUpDates, phasesOf, localDay } from '@/lib/course';
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
  const [openEval, setOpenEval] = useState(false);
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


  const labeled = images.filter((i) => i.status === 'labeled' && i.areaCm2 !== null).sort((a, b) => a.captureDate.localeCompare(b.captureDate));
  const latest = labeled[labeled.length - 1];
  const review = plan ? areaReview(images, plan, today) : null;
  const pctOf = (x: number) => `${Math.round(Math.abs(x) * 100)}%`;

  const retakes = images.filter((i) => i.retakeRequested);
  const dates = [...byDate.entries()];
  const shownDates = showAllPhotos ? dates : dates.slice(0, 2);
  const shownEvals = showOldEvals ? evals : evals.slice(0, 1);

  // Thứ tự: cảnh báo, diện tích (điểm neo), đợt điều trị, mức độ, đánh giá, album.
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

      {/* Điểm neo: số đo mới nhất cỡ lớn, chip thay đổi so với đầu đợt, rồi biểu đồ. */}
      <Card>
        <SectionTitle icon="stats-chart-outline" right={images.length >= 2 ? <Text onPress={() => router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id } })} style={{ color: C.primary, fontWeight: '600' }}>So sánh</Text> : null}>Diện tích</SectionTitle>
        {latest ? (
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontSize: 36, fontWeight: '800', color: C.text }}>{formatAreaDisplay(latest.areaCm2)}</Text>
              <Muted>{fmtDate(latest.captureDate)}</Muted>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {review && review.reduction != null && (
                <Chip icon={review.reduction >= 0 ? 'trending-down' : 'trending-up'} tone={review.reduction >= 0 ? 'green' : 'amber'} label={`${review.reduction >= 0 ? 'Giảm' : 'Tăng'} ${pctOf(review.reduction)} từ đầu đợt`} />
              )}
              {isDoctor && review?.state === 'low' && (
                <Pressable accessibilityRole="button" accessibilityLabel="Cảnh báo giảm chậm, xem giải thích" hitSlop={10}
                  onPress={() => notify('Giảm chậm sau mốc xem lại', `Đã qua mốc ${fmtDate(review.reviewDate)} mà diện tích mới giảm ${pctOf(review.reduction ?? 0)}, chưa tới 50%. Cân nhắc xem lại liệu trình và nguyên nhân. Ngưỡng tham khảo cho loét bàn chân đái tháo đường (Sheehan 2003).`)}>
                  <Chip icon="alert-circle" tone="red" label={`Mốc ${fmtDate(review.reviewDate)}: chưa tới 50%`} />
                </Pressable>
              )}
            </View>
          </View>
        ) : <Muted>Chưa có ảnh đã đo diện tích.</Muted>}
        <AreaChart images={images} />
        {isDoctor && <Button label="Chụp / thêm ảnh có hướng dẫn" icon="camera-outline" onPress={() => router.push({ pathname: '/guided-capture', params: { woundId: w.id } })} />}
      </Card>

      {/* Đợt điều trị: một dòng tóm tắt; giai đoạn, liều, tuân thủ và mốc xem lại nằm trong phần thu gọn. */}
      <Card>
        <SectionTitle icon="flash-outline" right={isDoctor ? <Text onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} style={{ color: C.primary, fontWeight: '600' }}>{plan ? 'Sửa đợt' : '+ Lập đợt'}</Text> : null}>
          Đợt điều trị
        </SectionTitle>
        {plan ? (
          <Disclosure
            title={currentPhase ? `Giai đoạn ${pr!.phaseIndex + 1}/${pr!.phaseCount} · mức ${plan.doseLevel ?? '—'} · ${fmtDuration(plan.durationSec)}` : `${phasesOf(plan).length} giai đoạn · mức ${plan.doseLevel ?? '—'}`}
            summary={pr ? `${pr.done}/${pr.total} buổi${isDoctor && pr.missed > 0 ? ` · bỏ lỡ ${pr.missed}` : ''}${isDoctor && pr.extra > 0 ? ` · ngoài lịch ${pr.extra}` : ''} · ${PLAN_STATUS[plan.status].label}` : PLAN_STATUS[plan.status].label}
            summaryTone={pr && isDoctor && pr.missed + pr.extra > 0 ? C.amber : undefined}>
            <Muted>Phiên bản {plan.version}{plan.status === 'active' && pr?.next ? ` · buổi tiếp theo ${fmtDate(pr.next)}` : ''}</Muted>
            {review && <ReviewNote review={review} forPatient={!isDoctor} />}
            <PhaseList plan={plan} current={pr?.phaseIndex} />
            <DoseRows plan={plan} />
            {pr && isDoctor && <ProgressRows pr={pr} />}
          </Disclosure>
        ) : <Muted>Chưa có đợt điều trị cho vết thương này.</Muted>}
        {isDoctor && <ClosureActions woundId={w.id} status={w.status} check1={w.closureCheck1} followUpFrom={w.followUpFrom} today={today} hasPlan={!!plan} onNewCourse={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} />}
        {!isDoctor && w.status === 'follow_up' && w.followUpFrom && <Muted>Đã liền ngày {fmtDate(w.followUpFrom)}. Các lần kiểm tra: {followUpDates(w.followUpFrom).map((x) => fmtDate(x.date)).join(', ')}.</Muted>}
      </Card>

      <SeverityCard title="Mức độ vết thương" evaluation={evals[0]} doctor={account(evals[0]?.doctorId)?.name} />

      <SectionTitle
        icon="clipboard-outline"
        right={isDoctor ? <Text onPress={() => router.push({ pathname: '/evaluate/[woundId]', params: { woundId: w.id } })} style={{ color: C.primary, fontWeight: '600' }}>+ Ghi đánh giá</Text> : null}>
        {isDoctor ? 'Đánh giá gần nhất' : 'Nhận xét của bác sĩ'}
      </SectionTitle>
      {evals.length === 0 && <Card><Empty text="Chưa có đánh giá." /></Card>}
      {shownEvals.map((e, i) => {
        // Đánh giá gần nhất mặc định 3 dòng; các trường còn lại mở bằng "Xem đầy đủ".
        const full = i > 0 || openEval;
        const main = (isDoctor && e.assessment ? assessmentSummary(e.assessment) : '') || e.instructions || e.characteristics || '';
        return (
          <Card key={e.id}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{fmtDate(e.date)} · {account(e.doctorId)?.name}</Text>
              <Chip label={TREND[e.trend].label} tone={TREND[e.trend].tone} />
            </View>
            {!full ? (
              <>
                {main ? <Text numberOfLines={3} style={{ color: C.text, lineHeight: 24 }}>{main}</Text> : null}
                <Text onPress={() => setOpenEval(true)} accessibilityRole="button" style={{ color: C.primary, fontWeight: '600', paddingVertical: 8 }}>Xem đầy đủ</Text>
              </>
            ) : (
              <>
                <InfoRow label="Diện tích" value={formatAreaDisplay(e.areaCm2)} />
                {isDoctor && e.assessment ? <Text style={{ color: C.text }}>{assessmentSummary(e.assessment)}</Text> : null}
                {e.characteristics ? <Muted>Đặc điểm: {e.characteristics}</Muted> : null}
                {e.symptoms ? <Muted>Triệu chứng: {e.symptoms} (nguồn: {e.symptomSource || '—'})</Muted> : null}
                {e.instructions ? <Text style={{ color: C.text }}>Hướng dẫn: {e.instructions}</Text> : null}
                {e.nextReview ? <Muted>Tái đánh giá: {fmtDate(e.nextReview)}</Muted> : null}
                {isDoctor && <Chip label={e.visibleToPatient ? 'Bệnh nhân xem được' : 'Chỉ nội bộ'} tone={e.visibleToPatient ? 'blue' : 'gray'} />}
                {i === 0 && <Text onPress={() => setOpenEval(false)} accessibilityRole="button" style={{ color: C.primary, fontWeight: '600', paddingVertical: 8 }}>Thu gọn</Text>}
              </>
            )}
          </Card>
        );
      })}
      {evals.length > 1 && <Button variant="ghost" label={showOldEvals ? 'Ẩn đánh giá cũ' : `Xem đánh giá cũ (${evals.length - 1})`} onPress={() => setShowOldEvals(!showOldEvals)} />}

      <SectionTitle icon="albums-outline">Album ảnh</SectionTitle>
      {images.length === 0 && <Card><Empty icon="image-outline" text={isDoctor ? 'Chưa có ảnh. Chụp hoặc tải ảnh lên để bắt đầu.' : 'Chưa có ảnh do bác sĩ chụp.'} /></Card>}
      {shownDates.map(([date, ims]) => (
        <View key={date} style={{ gap: 8 }}>
          <Text style={{ color: C.textSoft, fontWeight: '700', fontSize: 14 }}>Chụp {fmtDate(date)}</Text>
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
