import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { SEVERITY } from '@/lib/access';
import { AreaChart } from '@/components/AreaChart';
import { NoAccess, useCanView } from '@/components/Guard';
import { ImageTile } from '@/components/items';
import { Button, Card, Chip, Disclosure, Divider, Header, IconBadge, InfoRow, Muted, Screen, SectionTitle, TextLink, StatusChip } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { ClosureActions } from '@/components/ClosureActions';
import { SEVERITY_ROLE, SOURCE, TREND_ROLE, WOUND } from '@/theme.status';
import { DoseRows, PhaseList, ProgressRows, ReviewNote } from '@/components/CourseCard';
import { areaReview, courseProgress, followUpDates, phasesOf, localDay } from '@/lib/course';
import { fmtDate, PLAN_STATUS, TREND, WOUND_STATUS } from '@/lib/format';
import { assessmentSummary } from '@/lib/assessment';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

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
  if (!w || !p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

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
  const sev = evals[0]?.severity;
  const dates = [...byDate.entries()];
  const shownDates = showAllPhotos ? dates : dates.slice(0, 2);
  const shownEvals = showOldEvals ? evals : evals.slice(0, 1);

  const compareTitle = (title: string) => (
    <SectionTitle icon="stats-chart-outline" right={images.length >= 2 ? <TextLink label="So sánh" onPress={() => router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id } })} /> : null}>{title}</SectionTitle>
  );
  // Số diện tích lớn và hàng chip (nguồn, thay đổi từ đầu đợt, mốc xem lại). showDate: màn bệnh nhân giữ ngày đo cạnh số như cũ.
  const areaBlock = (showDate: boolean) => latest && (
          <View style={{ gap: 8 }}>
            {/* Màn bác sĩ: số lớn có nhãn "Diện tích" vì tiêu đề khối là "Hiện trạng". */}
            {!showDate ? <Text style={{ color: C.textSoft, fontWeight: '600' }}>Diện tích</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={{ fontSize: 36, fontWeight: '800', color: C.text }}>{formatAreaDisplay(latest.areaCm2)}</Text>
              {showDate ? <Muted>{fmtDate(latest.captureDate)}</Muted> : null}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {/* PP-01: nguồn số đo đặt ngay cạnh số diện tích, thay cho câu chú thích cuối biểu đồ. */}
              {latest.areaCm2 !== null && <StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} />}
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
  );
  // PP-08: mỗi ngày bắt đầu khác nhau của các đợt (không tính bản nháp) là một mốc "Đợt n". Cùng cách lọc với coursePlan trong store;
  // các phiên bản sửa giữ nguyên ngày bắt đầu thì gộp làm một.
  const firstWound = data.wounds.find((x) => x.patientId === w.patientId)?.id;
  const courseMarkers = [...new Set(data.plans
    .filter((pl) => pl.patientId === w.patientId && (pl.woundId ?? firstWound) === w.id && pl.status !== 'draft')
    .map((pl) => pl.startDate))]
    .sort()
    .map((date, i) => ({ date, label: `Đợt ${i + 1}` }));

  // Ba thẻ: tổng quan (vị trí, trạng thái, mức độ, diện tích), đợt điều trị, đánh giá. Album không đóng khung.
  return (
    <Screen header={<Header back title={`Vết thương ${w.code}`} subtitle={`${p.name} · ${p.code}`} />}>
      {/* Thẻ 1, tổng quan: vị trí, trạng thái, mức độ, cảnh báo chụp lại và diện tích (điểm neo) trong một thẻ.
          Vị trí và nhóm tổn thương luôn hiện đủ để tránh nhầm vết (R15). */}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconBadge icon="body-outline" tone="teal" size={44} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontWeight: '700', fontSize: T.cardTitle, color: C.text }}>{w.location}</Text>
            {w.group ? <Text style={{ color: C.textSoft }}>{w.group}</Text> : null}
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusChip status={WOUND[w.status]} label={WOUND_STATUS[w.status].label} />
          {/* PP-07: chip mức độ và xu hướng do bác sĩ đánh giá lấy biểu tượng từ SEVERITY_ROLE, TREND_ROLE; tông giữ nguyên. */}
          {sev ? <StatusChip status={SEVERITY_ROLE[sev]} label={`Mức độ ${SEVERITY[sev].label.toLowerCase()}`} /> : <Chip label="Chưa đánh giá mức độ" tone="gray" />}
          {isDoctor && retakes.length > 0 && (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => notify(`Đã yêu cầu chụp lại ${retakes.length} ảnh`, retakes.map((im) => `${im.id}: ${im.retakeRequested}`).join('\n'))}>
              <Chip icon="camera-reverse-outline" tone="red" label={`Chụp lại ${retakes.length} ảnh`} />
            </Pressable>
          )}
        </View>
        <Text style={{ color: C.textSoft }}>Theo dõi từ {fmtDate(w.startDate)}, {images.length} ảnh</Text>
        <Divider />
        {isDoctor ? (
          <>
            {/* PP-02: khối Hiện trạng ở màn đầu: diện tích kèm nguồn, thay đổi từ đầu đợt, ngày đo, xu hướng bác sĩ đánh giá, đợt đang áp dụng.
                Chỉ dùng dữ liệu sẵn có; không suy ra mức độ hay xu hướng từ diện tích (chip thay đổi diện tích giữ màu cam theo quyết định PP-07). */}
            <SectionTitle icon="pulse-outline">Hiện trạng</SectionTitle>
            {latest ? areaBlock(false) : <Muted>Chưa có số đo. Chụp ảnh rồi nhập diện tích.</Muted>}
            <View>
              {latest ? <InfoRow label="Ngày đo" value={fmtDate(latest.captureDate)} /> : null}
              <InfoRow label="Xu hướng (bác sĩ đánh giá)" stack value={evals[0]
                ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}><StatusChip status={TREND_ROLE[evals[0].trend]} label={TREND[evals[0].trend].label} /><Muted>{fmtDate(evals[0].date)}</Muted></View>
                : 'Chưa có đánh giá'} />
              <InfoRow label="Đợt đang áp dụng" value={plan
                ? `${PLAN_STATUS[plan.status].label}, từ ${fmtDate(plan.startDate)}${currentPhase ? `, giai đoạn ${pr!.phaseIndex + 1}/${pr!.phaseCount}` : ''}`
                : 'Chưa có đợt'} />
            </View>
            <Button label="Chụp ảnh có hướng dẫn" icon="camera-outline" onPress={() => router.push({ pathname: '/guided-capture', params: { woundId: w.id } })} />
          </>
        ) : (
          <>
            {compareTitle('Diện tích')}
            {latest ? areaBlock(true) : <Muted>Chưa có ảnh đã đo diện tích.</Muted>}
            <AreaChart images={images} />
          </>
        )}
      </Card>

      {/* PP-08: biểu đồ diện tích tách thành thẻ riêng ở màn bác sĩ, có vạch ngày bắt đầu từng đợt. */}
      {isDoctor && (
        <Card>
          {compareTitle('Diện tích theo ngày')}
          <AreaChart images={images} markers={courseMarkers} />
        </Card>
      )}

      {/* Đợt điều trị: một dòng tóm tắt; giai đoạn, liều, tuân thủ và mốc xem lại nằm trong phần thu gọn. */}
      <Card>
        <SectionTitle icon="flash-outline" right={isDoctor ? <TextLink label={plan ? 'Sửa đợt' : '+ Lập đợt'} onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} /> : null}>
          Đợt điều trị
        </SectionTitle>
        {plan && isDoctor && <DoseRows plan={plan} />}
        {plan ? (
          <Disclosure
            // Tiêu đề là giai đoạn, dòng tóm tắt là tiến độ; liều của bác sĩ hiện thành cặp nhãn và giá trị ngay trên (V29).
            title={currentPhase ? `Giai đoạn ${pr!.phaseIndex + 1} trên ${pr!.phaseCount}` : `${phasesOf(plan).length} giai đoạn`}
            summary={pr ? `Đã xong ${pr.done}/${pr.total} buổi${isDoctor && pr.missed > 0 ? `, bỏ lỡ ${pr.missed}` : ''}${isDoctor && pr.extra > 0 ? `, ngoài lịch ${pr.extra}` : ''}, ${PLAN_STATUS[plan.status].label.toLowerCase()}` : PLAN_STATUS[plan.status].label}
            summaryTone={pr && isDoctor && pr.missed + pr.extra > 0 ? C.amber : undefined}>
            <Muted>Phiên bản {plan.version}{plan.status === 'active' && pr?.next ? ` · buổi tiếp theo ${fmtDate(pr.next)}` : ''}</Muted>
            {review && <ReviewNote review={review} forPatient={!isDoctor} />}
            <PhaseList plan={plan} current={pr?.phaseIndex} />
            {!isDoctor && <DoseRows plan={plan} />}
            {pr && isDoctor && <ProgressRows pr={pr} />}
          </Disclosure>
        ) : <Muted>Chưa có đợt điều trị cho vết thương này.</Muted>}
        {isDoctor && <ClosureActions woundId={w.id} status={w.status} check1={w.closureCheck1} followUpFrom={w.followUpFrom} today={today} hasPlan={!!plan} onNewCourse={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} />}
        {!isDoctor && w.status === 'follow_up' && w.followUpFrom && <Muted>Đã liền ngày {fmtDate(w.followUpFrom)}. Các lần kiểm tra: {followUpDates(w.followUpFrom).map((x) => fmtDate(x.date)).join(', ')}.</Muted>}
      </Card>

      {/* Thẻ 3: đánh giá gần nhất và các đánh giá cũ trong cùng một thẻ, tách bằng đường kẻ. */}
      <Card>
      <SectionTitle
        icon="clipboard-outline"
        right={isDoctor ? <TextLink label="+ Ghi đánh giá" onPress={() => router.push({ pathname: '/evaluate/[woundId]', params: { woundId: w.id } })} /> : null}>
        {isDoctor ? 'Đánh giá gần nhất' : 'Nhận xét của bác sĩ'}
      </SectionTitle>
      {evals.length === 0 && <Muted>Chưa có đánh giá.</Muted>}
      {shownEvals.map((e, i) => {
        // Đánh giá gần nhất mặc định 3 dòng; các trường còn lại mở bằng "Xem đầy đủ".
        const full = i > 0 || openEval;
        const main = (isDoctor && e.assessment ? assessmentSummary(e.assessment) : '') || e.instructions || e.characteristics || '';
        return (
          <View key={e.id} style={{ gap: 10 }}>
            {i > 0 && <Divider />}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>{fmtDate(e.date)} · {account(e.doctorId)?.name}</Text>
              <StatusChip status={TREND_ROLE[e.trend]} label={TREND[e.trend].label} />
            </View>
            {!full ? (
              <>
                {main ? <Text numberOfLines={3} style={{ color: C.text, lineHeight: 24 }}>{main}</Text> : null}
                <TextLink label="Xem đầy đủ" onPress={() => setOpenEval(true)} />
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
                {i === 0 && <TextLink label="Thu gọn" onPress={() => setOpenEval(false)} />}
              </>
            )}
          </View>
        );
      })}
      {evals.length > 1 && <Button variant="ghost" label={showOldEvals ? 'Ẩn đánh giá cũ' : `Xem đánh giá cũ (${evals.length - 1})`} onPress={() => setShowOldEvals(!showOldEvals)} />}
      </Card>

      <SectionTitle icon="albums-outline">Album ảnh</SectionTitle>
      {images.length === 0 && <Muted>{isDoctor ? 'Chưa có ảnh. Chụp hoặc tải ảnh lên để bắt đầu.' : 'Chưa có ảnh do bác sĩ chụp.'}</Muted>}
      {shownDates.map(([date, ims]) => (
        <View key={date} style={{ gap: 8 }}>
          <Text style={{ color: C.textSoft, fontWeight: '700', fontSize: T.small }}>Chụp {fmtDate(date)}</Text>
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
