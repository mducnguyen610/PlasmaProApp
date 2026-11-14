import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';

import { AreaLineChart } from '@/components/AreaLineChart';
import { Text } from '@/components/Text';
import { Card, Chip, Divider, LinkRow, Muted, SectionTitle, SimBadge, StatusChip, TextLink, WoundPhoto } from '@/components/ui';
import { SEVERITY } from '@/lib/access';
import { progressInput, progressSummary, splitByMethod, summaryText } from '@/lib/areaProgress';
import { courseProgress, localDay, phasesOf, sessionsForWound } from '@/lib/course';
import { fmtDate, fmtDateTime, PLAN_STATUS, TREND, WOUND_STATUS } from '@/lib/format';
import { measurementSource } from '@/lib/measurementSource';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups, useStore } from '@/lib/store';
import type { Patient, Wound } from '@/lib/types';
import { woundTimelineItems } from '@/components/WoundTimeline';
import { C, radius, T } from '@/theme';
import { SEVERITY_ROLE, TREND_ROLE, WOUND } from '@/theme.status';

const CAVEAT = 'Số đo cho biết kích thước vết thương. Việc vết thương hồi phục ra sao do bác sĩ đánh giá.';

/**
 * N05, trang tổng quan vết thương phía bệnh nhân (giao diện theo tác vụ). Chỉ đọc, không ghi dữ liệu.
 * Mỗi khối là bản tóm tắt; phần chuyên sâu mở màn riêng, luôn mang woundId (bệnh nhân lấy từ Wound.patientId):
 * - Lịch sử đo: /wound-history/[woundId]?tab=dien-tich (biểu đồ đầy đủ, dải ảnh, danh sách lần đo).
 * - So sánh ảnh: /compare/[woundId]. Mở ảnh: /wound-history/[woundId]/anh/[imageId].
 * - Đợt điều trị: /wound-history/[woundId]/dot-dieu-tri. Nhận xét: /wound-history/[woundId]?tab=lich-su&loc=danh-gia.
 * - Lịch sử vết thương: /wound-history/[woundId]/dong-thoi-gian (cùng dòng thời gian P2-07a, có buổi điều trị của vết).
 * Số đo, phần trăm và câu chữ lấy nguyên từ areaProgress (cùng quy tắc biểu đồ N05 trước đây), không tính lại theo cách khác.
 */
export function PatientWoundDashboard({ patient: p, wound: w }: { patient: Patient; wound: Wound }) {
  const { data } = useStore();
  const { imagesOf, account, coursePlan, sessionsOf } = useLookups();
  const today = localDay();
  const images = imagesOf(w.id);
  const evals = data.evaluations
    .filter((e) => e.woundId === w.id && e.visibleToPatient)
    .sort((a, b) => b.date.localeCompare(a.date) || data.evaluations.indexOf(b) - data.evaluations.indexOf(a));
  const sev = evals[0]?.severity;

  // C. Tiến triển: điểm hợp lệ (đã đo, rõ ngày chụp, không bị loại); nhóm chính là phương pháp của lần đo gần nhất (QĐ-P2-1 C).
  const input = progressInput(images, w.id, today, data.evaluations, measurementSource);
  const split = splitByMethod(input.points);
  const latest = split.main[split.main.length - 1];
  const first = split.main[0];
  const summary = progressSummary(input.points);
  const text = summaryText(summary);
  const demo = input.points.some((x) => x.source === 'demo');
  const openMeasure = () => router.push({ pathname: '/wound-history/[woundId]', params: { woundId: w.id, tab: 'dien-tich' } });

  // D. Ảnh: mới trước. Trạng thái đo là của chính ảnh đó.
  const photos = [...images].sort((a, b) => b.captureDate.localeCompare(a.captureDate) || a.id.localeCompare(b.id));

  // E. Đợt điều trị: cùng nguồn với thẻ đợt trước đây (coursePlan bản bệnh nhân, sessionsForWound).
  const plan = coursePlan(w.id, { patientView: true });
  const dev = data.devices.find((x) => x.id === p.deviceId);
  const pr = plan && dev ? courseProgress(plan, sessionsForWound(sessionsOf(dev.id), w.id), today, dev.lastSync ? localDay(dev.lastSync) : null) : null;

  // G. Lịch sử: cùng danh sách mục với dòng thời gian P2-07a (ảnh, nhận xét đã công bố, buổi gắn đúng vết).
  const timeline = woundTimelineItems({ images, evaluations: evals, sessions: dev ? sessionsOf(dev.id).filter((s) => s.woundId === w.id) : [], doctorName: (id) => account(id)?.name });

  return (
    <>
      {/* B. Tóm tắt bệnh nhân và vết thương: một thẻ, mỗi thông tin một lần. Giữ hai định danh bệnh nhân (P0 G1). */}
      <Card>
        <View accessible accessibilityRole="summary" accessibilityLabel={`Bệnh nhân ${p.name}, ${p.code}. Vết thương ${w.code}, ${w.location}${w.group ? `, ${w.group}` : ''}. ${WOUND_STATUS[w.status].label}. ${sev ? `Mức độ ${SEVERITY[sev].label.toLowerCase()}` : 'Chưa đánh giá mức độ'}`} style={{ gap: 8 }}>
          <Text style={{ color: C.textSoft, fontSize: T.small }}>{`${p.name} · ${p.code}`}</Text>
          <View style={{ gap: 2 }}>
            <Text style={{ fontWeight: '700', fontSize: T.cardTitle, color: C.text }}>{w.location}</Text>
            {w.group ? <Text style={{ color: C.textSoft }}>{w.group}</Text> : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <StatusChip status={WOUND[w.status]} label={WOUND_STATUS[w.status].label} />
            {sev ? <StatusChip status={SEVERITY_ROLE[sev]} label={`Mức độ ${SEVERITY[sev].label.toLowerCase()}`} /> : <Chip label="Chưa đánh giá mức độ" tone="gray" />}
          </View>
        </View>
      </Card>

      {/* C. Tiến triển diện tích (tóm tắt). Biểu đồ đầy đủ ở màn Lịch sử đo. */}
      <Card>
        <SectionTitle right={<TextLink label="Lịch sử đo" accessibilityLabel={`Lịch sử đo, ${input.points.length} lần đo`} onPress={openMeasure} />}>Tiến triển diện tích</SectionTitle>
        {demo && <View style={{ flexDirection: 'row' }}><SimBadge /></View>}
        {latest ? (
          <>
            <View style={{ gap: 2 }}>
              <Text style={{ color: C.textSoft, fontWeight: '600' }}>Lần đo gần nhất</Text>
              <Text style={{ fontSize: 32, fontWeight: '800', color: C.text }}>{formatAreaDisplay(latest.areaCm2)}</Text>
              {/* Ngày chụp ảnh và ngày bác sĩ nhập số là hai mốc khác nhau; chỉ ghi ngày nhập khi dữ liệu có lưu. */}
              <Muted>{`Ảnh chụp ngày ${fmtDate(latest.date)}${latest.enteredAt ? ` · bác sĩ nhập số ${fmtDateTime(latest.enteredAt)}` : ''}`}</Muted>
            </View>
            {first && first.imageId !== latest.imageId && (
              <Text style={{ color: C.text }}>{`Lần đo đầu: ${formatAreaDisplay(first.areaCm2)}, ảnh chụp ngày ${fmtDate(first.date)}`}</Text>
            )}
            {text.headline && <Text style={{ color: C.primary, fontWeight: '700', fontSize: T.cardTitle }}>{text.headline}</Text>}
            {!text.headline && text.detail && <Muted>{text.detail}</Muted>}
            {split.main.length >= 2 && (
              // Biểu đồ thu gọn: chỉ nhóm phương pháp chính, chạm vào biểu đồ mở Lịch sử đo (không chọn điểm tại đây).
              <View testID="bieu-do-thu-gon" style={{ gap: 4 }}>
                <AreaLineChart code={w.code} groups={[{ key: split.mainKey!, label: split.mainLabel!, shape: 'circle', points: split.main }]} from={split.main[0].date} to={today} unmeasuredDates={input.unmeasuredDates} selectedId={null} onSelect={openMeasure} maxLabels={3} height={140} />
                {split.others.length > 0 && <Muted>{`Biểu đồ chỉ vẽ ${split.main.length} lần đo bằng ${split.mainLabel}. Xem các phương pháp khác ở Lịch sử đo.`}</Muted>}
              </View>
            )}
            <Muted>{CAVEAT}</Muted>
          </>
        ) : (
          <Muted>{images.length ? `Chưa có lần đo diện tích. Ảnh đã chụp: ${images.length}.` : 'Chưa có ảnh vết thương. Bác sĩ sẽ chụp và đo ở lần khám.'}</Muted>
        )}
      </Card>

      {/* D. Ảnh theo thời gian: dải cuộn ngang, ảnh hiện đủ khung (contain), ngày chụp và trạng thái đo của chính ảnh. */}
      <Card>
        <SectionTitle right={images.length >= 2 ? <TextLink label="So sánh" accessibilityLabel="So sánh hai ảnh" onPress={() => router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id } })} /> : null}>{`Ảnh (${images.length})`}</SectionTitle>
        {photos.length === 0 ? <Muted>Chưa có ảnh do bác sĩ chụp.</Muted> : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {photos.map((im) => {
              const date = im.capture?.sourceDateKnown === false ? 'Ngày chụp chưa rõ' : fmtDate(im.captureDate);
              const measured = im.status === 'labeled' && im.areaCm2 !== null;
              const tag = measured ? `Có số đo: ${formatAreaDisplay(im.areaCm2)}` : im.status === 'excluded' ? 'Bác sĩ không dùng' : 'Chưa đo';
              return (
                <Pressable key={im.id} testID="o-anh" accessibilityRole="button" accessibilityLabel={`Ảnh chụp ${date}, ${tag}. Chạm để mở ảnh`}
                  onPress={() => router.push({ pathname: '/wound-history/[woundId]/anh/[imageId]', params: { woundId: w.id, imageId: im.id } })}
                  style={({ pressed }) => ({ width: 124, gap: 4, opacity: pressed ? 0.7 : 1 })}>
                  <WoundPhoto image={im} fit="contain" style={{ width: 124, height: 93, borderRadius: radius.m, backgroundColor: C.surfaceMuted }} />
                  <Text style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>{date}</Text>
                  <Text style={{ color: measured ? C.text : C.textSoft, fontSize: T.small }}>{tag}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}
      </Card>

      {/* E, F, G: mỗi việc chuyên sâu một dòng mở màn riêng. */}
      <Card>
        <LinkRow testID="dong-dot-dieu-tri" icon="flash-outline" tone="violet" title="Đợt điều trị"
          sub={plan ? [pr && pr.phaseIndex >= 0 ? `Giai đoạn ${pr.phaseIndex + 1} trên ${pr.phaseCount}` : `${phasesOf(plan).length} giai đoạn`, pr ? `${pr.done}/${pr.total} buổi` : null, PLAN_STATUS[plan.status].label.toLowerCase()].filter(Boolean).join(' · ') : 'Chưa có đợt điều trị cho vết thương này'}
          accessibilityLabel={`Đợt điều trị. ${plan ? `${pr ? `Đã xong ${pr.done} trên ${pr.total} buổi, ` : ''}${PLAN_STATUS[plan.status].label}` : 'Chưa có đợt'}. Mở chi tiết`}
          onPress={() => router.push({ pathname: '/wound-history/[woundId]/dot-dieu-tri', params: { woundId: w.id } })} />
        <Divider />
        <LinkRow testID="dong-lich-su" icon="git-commit-outline" tone="teal" title={`Lịch sử vết thương (${timeline.length})`}
          sub={timeline[0] ? `Gần nhất: ${timeline[0].kind.toLowerCase()} ${timeline[0].sub?.split(' · ')[0] ?? ''}` : 'Chưa có mục nào'}
          onPress={() => router.push({ pathname: '/wound-history/[woundId]/dong-thoi-gian', params: { woundId: w.id } })} />
      </Card>

      {/* F. Nhận xét của bác sĩ: nhận xét mới nhất đã công bố, xem trước 3 dòng. */}
      <Card>
        <SectionTitle right={evals.length > 0 ? <TextLink label={`Tất cả (${evals.length})`} accessibilityLabel={`Xem tất cả ${evals.length} nhận xét`} onPress={() => router.push({ pathname: '/wound-history/[woundId]', params: { woundId: w.id, tab: 'lich-su', loc: 'danh-gia' } })} /> : null}>Nhận xét của bác sĩ</SectionTitle>
        {evals[0] ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Nhận xét ngày ${fmtDate(evals[0].date)} của ${account(evals[0].doctorId)?.name ?? 'bác sĩ'}. Chạm để đọc đầy đủ`}
            onPress={() => router.push({ pathname: '/wound-history/[woundId]/ban-ghi/[recordId]', params: { woundId: w.id, recordId: evals[0].id, loai: 'danh-gia' } })}
            style={({ pressed }) => ({ gap: 8, opacity: pressed ? 0.7 : 1 })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={{ fontWeight: '700', color: C.text, flexShrink: 1 }}>{`${fmtDate(evals[0].date)} · ${account(evals[0].doctorId)?.name ?? 'Bác sĩ'}`}</Text>
              <StatusChip status={TREND_ROLE[evals[0].trend]} label={TREND[evals[0].trend].label} />
            </View>
            {(evals[0].instructions || evals[0].characteristics) ? <Text numberOfLines={3} style={{ color: C.text, lineHeight: 24 }}>{evals[0].instructions || evals[0].characteristics}</Text> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ color: C.primary, fontWeight: '700' }}>Xem đầy đủ</Text>
              <Ionicons name="chevron-forward" size={16} color={C.primary} />
            </View>
          </Pressable>
        ) : <Muted>Chưa có đánh giá.</Muted>}
      </Card>
    </>
  );
}
