import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { SEVERITY } from '@/lib/access';
import { AreaProgress } from '@/components/AreaProgress';
import { NoAccess, useCanView } from '@/components/Guard';
import { Button, Card, Chip, Disclosure, Divider, Header, IconBadge, InfoRow, LinkRow, Muted, Notice, Screen, SectionTitle, TextLink, StatusChip } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { ClosureActions } from '@/components/ClosureActions';
import { ClinicalContext } from '@/components/ClinicalContext';
import { WoundTimeline } from '@/components/WoundTimeline';
import { SEVERITY_ROLE, SOURCE, TREND_ROLE, WOUND } from '@/theme.status';
import { DoseRows, PhaseList, ProgressRows, ReviewNote } from '@/components/CourseCard';
import { areaReview, courseProgress, followUpDates, phasesOf, localDay, sessionsForWound } from '@/lib/course';
import { fmtDate, fmtDateTime, PLAN_STATUS, TREND, WOUND_STATUS } from '@/lib/format';
import { measurementSource } from '@/lib/measurementSource';
import { woundSummary } from '@/lib/woundSummary';
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
  const [showOldEvals, setShowOldEvals] = useState(false);
  if (!w || !p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  const isDoctor = me?.role === 'doctor';
  const images = imagesOf(w.id);
  const today = localDay();
  const plan = coursePlan(w.id, { patientView: !isDoctor });
  const dev = data.devices.find((x) => x.id === p.deviceId);
  const pr = plan && dev ? courseProgress(plan, sessionsForWound(sessionsOf(dev.id), w.id), today, (dev.lastSync ? localDay(dev.lastSync) : null)) : null;
  const currentPhase = plan && pr && pr.phaseIndex >= 0 ? phasesOf(plan)[pr.phaseIndex] : undefined;
  const evals = data.evaluations
    .filter((e) => e.woundId === w.id && (isDoctor || e.visibleToPatient))
    .sort((a, b) => b.date.localeCompare(a.date) || data.evaluations.indexOf(b) - data.evaluations.indexOf(a));


  const labeled = images.filter((i) => i.status === 'labeled' && i.areaCm2 !== null).sort((a, b) => a.captureDate.localeCompare(b.captureDate));
  const latest = labeled[labeled.length - 1];
  // P1-02b: số đo trước (cùng điểm với biểu đồ), người nhập, ảnh mới hơn chưa đo. Chỉ đọc.
  const sum = woundSummary(images, [], w.id);
  const src = latest ? measurementSource(latest) : null;
  // P1-02c: buổi điều trị của vết này (cùng bộ lọc với tiến độ đợt), mới trước.
  const woundSessions = dev ? [...sessionsForWound(sessionsOf(dev.id), w.id)].sort((a, b) => b.start.localeCompare(a.start)) : [];
  const review = plan ? areaReview(images, plan, today) : null;
  const pctOf = (x: number) => `${Math.round(Math.abs(x) * 100)}%`;

  const retakes = images.filter((i) => i.retakeRequested);
  const unmeasured = images.filter((i) => i.areaCm2 === null).length;
  const sev = evals[0]?.severity;
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
                  <Chip icon="alert-circle" tone="amber" label={`Mốc ${fmtDate(review.reviewDate)}: chưa tới 50%`} />
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
  const courseMarkerCount = courseMarkers.length;

  // Ba thẻ: tổng quan (vị trí, trạng thái, mức độ, diện tích), đợt điều trị, đánh giá. Album không đóng khung.
  return (
    <Screen header={<Header back title={`Vết thương ${w.code}`} />} footer={isDoctor ? (
      // Vùng nút cố định: hai việc chính của bác sĩ luôn thấy, không phải cuộn (giai đoạn 1 giao diện theo tác vụ).
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <Button style={{ flex: 1 }} label="Ghi đánh giá" variant="secondary" onPress={() => router.push({ pathname: '/evaluate/[woundId]', params: { woundId: w.id } })} />
        <Button style={{ flex: 1 }} label="Chụp ảnh" icon="camera-outline" onPress={() => router.push({ pathname: '/guided-capture', params: { woundId: w.id } })} />
      </View>
    ) : undefined}>
      {/* P0 G1: bệnh nhân và vết thương đang thao tác. */}
      <ClinicalContext patient={p} wound={w} />
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
              <Chip icon="camera-reverse-outline" tone="amber" label={`Chụp lại ${retakes.length} ảnh`} />
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
              {latest ? <InfoRow label="Ảnh đo chụp ngày" value={fmtDate(latest.captureDate)} /> : null}
              {latest ? <InfoRow label="Nhập bởi" value={src ? `${account(src.by)?.name ?? 'Tài khoản không còn trong danh sách'}${src.at ? ` lúc ${fmtDateTime(src.at)}` : ''}` : 'Chưa có thông tin người nhập'} /> : null}
              {latest ? <InfoRow label="Phương pháp đo" value={latest.measureMethod?.trim() || 'Chưa ghi'} /> : null}
              {sum.previous ? <InfoRow label="Lần đo trước" value={`${formatAreaDisplay(sum.previous.areaCm2)} · chụp ${fmtDate(sum.previous.captureDate)}`} /> : null}
              <InfoRow label="Xu hướng (bác sĩ đánh giá)" stack value={evals[0]
                ? <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}><StatusChip status={TREND_ROLE[evals[0].trend]} label={TREND[evals[0].trend].label} /><Muted>{fmtDate(evals[0].date)}</Muted></View>
                : 'Chưa có đánh giá'} />
              {/* "Đợt đang áp dụng" bỏ ở đây: cùng thông tin đã có ở thẻ "Đợt điều trị" và lối vào "Đợt điều trị" (không lặp dữ liệu). */}
            </View>
            {sum.newerUnmeasured.length > 0 && (
              <View style={{ gap: 4 }}>
                <Notice icon="information-circle-outline" tone="blue">{`Có ${sum.newerUnmeasured.length} ảnh mới hơn chưa đo (${sum.newerUnmeasured[0].id}, chụp ${fmtDate(sum.newerUnmeasured[0].captureDate)}). Số đo ở trên là của ảnh ${latest ? fmtDate(latest.captureDate) : 'trước đó'}.`}</Notice>
                <TextLink label={`Nhập số đo cho ${sum.newerUnmeasured[0].id}`} onPress={() => router.push({ pathname: '/images/[id]', params: { id: sum.newerUnmeasured[0].id } })} />
              </View>
            )}
          </>
        ) : (
          <>
            {/* P2-02c (QĐ-P2-2 A): bệnh nhân xem biểu đồ đường và câu thay đổi trung tính; bỏ chip xanh/cam "Giảm X% từ đầu đợt". */}
            {compareTitle('Tiến triển diện tích')}
            <AreaProgress code={w.code} woundId={w.id} images={images} evaluations={data.evaluations} today={today} isDoctor={false} accountName={(id) => account(id)?.name} photoStrip />
          </>
        )}
      </Card>

      {/* Giai đoạn 1 giao diện theo tác vụ: mỗi việc với vết thương một lối vào riêng, ngay dưới thẻ tổng quan.
          Biểu đồ, album, đánh giá cũ và buổi điều trị chuyển sang màn "Tiến triển và lịch sử" (wound-history), mở đúng thẻ.
          Hai việc hay làm nhất (ghi đánh giá, chụp ảnh) nằm ở vùng nút cố định cuối màn (UX-29). Mọi lối vào mang woundId (và patientId khi màn đích cần). */}
      {isDoctor && (
        <Card>
          <SectionTitle icon="list-outline">Việc với vết thương</SectionTitle>
          <View testID="loi-vao-vet-thuong">
            <LinkRow icon="flash-outline" tone="violet" title="Đợt điều trị" accessibilityLabel={`Đợt điều trị, ${plan ? `phiên bản ${plan.version}, ${PLAN_STATUS[plan.status].label.toLowerCase()}` : 'chưa lập đợt'}`}
              sub={plan ? `Phiên bản ${plan.version} · ${PLAN_STATUS[plan.status].label.toLowerCase()} · lập hoặc sửa phiên bản` : 'Chưa lập đợt · lập đợt mới'}
              onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: p.id, woundId: w.id } })} />
            <Divider />
            <LinkRow icon="images-outline" tone="teal" title="Ảnh và số đo" accessibilityLabel={`Ảnh và số đo, ${images.length} ảnh${unmeasured ? `, ${unmeasured} ảnh chưa đo` : ''}`}
              sub={`${images.length} ảnh${unmeasured ? ` · ${unmeasured} ảnh chưa đo` : ''}`}
              onPress={() => router.push({ pathname: '/wound-history/[woundId]', params: { woundId: w.id, tab: 'anh' } })} />
            <Divider />
            <LinkRow icon="stats-chart-outline" tone="teal" title="Tiến triển diện tích" accessibilityLabel={`Tiến triển diện tích, ${labeled.length} lần đo`}
              sub={`${labeled.length} lần đo${courseMarkerCount ? ` · ${courseMarkerCount} đợt` : ''}`}
              onPress={() => router.push({ pathname: '/wound-history/[woundId]', params: { woundId: w.id, tab: 'dien-tich' } })} />
            <Divider />
            <LinkRow icon="clipboard-outline" tone="violet" title="Lịch sử đánh giá" accessibilityLabel={`Lịch sử đánh giá, ${evals.length} lần`}
              sub={evals[0] ? `${evals.length} lần · gần nhất ${fmtDate(evals[0].date)}` : 'Chưa có đánh giá'}
              onPress={() => router.push({ pathname: '/wound-history/[woundId]', params: { woundId: w.id, tab: 'danh-gia' } })} />
            {dev && <Divider />}
            {dev && (
              <LinkRow icon="time-outline" tone="teal" title="Lịch sử điều trị" accessibilityLabel={`Lịch sử điều trị, ${woundSessions.length} buổi`}
                sub={woundSessions[0] ? `${woundSessions.length} buổi · gần nhất ${fmtDateTime(woundSessions[0].start)}` : 'Chưa có buổi nào được ghi'}
                onPress={() => router.push({ pathname: '/wound-history/[woundId]', params: { woundId: w.id, tab: 'buoi' } })} />
            )}
            {images.length >= 2 && <Divider />}
            {images.length >= 2 && (
              <LinkRow icon="git-compare-outline" tone="amber" title="So sánh trước và sau" accessibilityLabel="So sánh trước và sau"
                sub="Chọn hai ảnh của vết này"
                onPress={() => router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id } })} />
            )}
          </View>
        </Card>
      )}

      {/* Đợt điều trị: một dòng tóm tắt; giai đoạn, liều, tuân thủ và mốc xem lại nằm trong phần thu gọn. */}
      <Card>
        <SectionTitle icon="flash-outline">
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
>
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
      {/* Bác sĩ xem đánh giá cũ ở "Lịch sử đánh giá"; màn bệnh nhân giữ như cũ. */}
      {!isDoctor && evals.length > 1 && <Button variant="ghost" label={showOldEvals ? 'Ẩn đánh giá cũ' : `Xem đánh giá cũ (${evals.length - 1})`} onPress={() => setShowOldEvals(!showOldEvals)} />}
      </Card>

      {/* P2-07a (R2-07): dòng thời gian chỉ của vết này, phía bệnh nhân. Buổi không gắn vết không đưa vào (A26). */}
      {!isDoctor && (
        <Card>
          <WoundTimeline images={images} evaluations={evals} sessions={dev ? sessionsOf(dev.id).filter((s) => s.woundId === w.id) : []} doctorName={(id) => account(id)?.name} />
        </Card>
      )}

      {/* Album của bác sĩ chuyển sang "Ảnh và số đo" (màn Tiến triển và lịch sử, giao diện theo tác vụ giai đoạn 1); phía bệnh nhân dùng dòng thời gian P2-07a. */}
    </Screen>
  );
}

