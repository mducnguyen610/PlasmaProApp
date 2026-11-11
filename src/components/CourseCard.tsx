import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { Chip, InfoRow, Muted, StatGrid } from '@/components/ui';
import { type AreaReview, type CourseProgress, fmtDuration, phaseLabel, phasesOf, REVIEW_MIN_REDUCTION } from '@/lib/course';
import { fmtDate } from '@/lib/format';
import type { TreatmentPlan } from '@/lib/types';
import { C, radius } from '@/theme';
import { modeLabel } from '@/lib/device/capabilities';

/** Các giai đoạn của đợt, giai đoạn hiện tại được tô đậm. */
export function PhaseList({ plan, current }: { plan: TreatmentPlan; current?: number }) {
  const ps = phasesOf(plan);
  return (
    <View style={{ gap: 6 }}>
      {ps.map((p, i) => {
        const on = i === current;
        return (
          <View key={i} accessible accessibilityLabel={`Giai đoạn ${i + 1}: ${phaseLabel(p)}, từ ${fmtDate(p.from)} đến ${fmtDate(p.to)}${on ? ', đang áp dụng' : ''}`} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', padding: 12, borderRadius: radius.m, backgroundColor: on ? C.primarySoft : C.surfaceMuted }}>
            <Text style={{ fontWeight: '700', color: on ? C.primary : C.textSoft, width: 22 }}>{i + 1}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '600', color: C.text }}>{phaseLabel(p)}</Text>
              <Text style={{ fontSize: 13, color: C.textSoft }}>{fmtDate(p.from)} đến {fmtDate(p.to)}</Text>
            </View>
            {on && <Chip label="Hiện tại" tone="blue" />}
          </View>
        );
      })}
    </View>
  );
}

/** Liều theo y lệnh. Thiết bị tại nhà bị khóa ở các thông số này (slide 24). */
export function DoseRows({ plan }: { plan: TreatmentPlan }) {
  return (
    <>
      <InfoRow label="Mức năng lượng" value={plan.doseLevel != null ? `Mức ${plan.doseLevel}` : 'Chưa đặt'} />
      {plan.treatmentMode ? <InfoRow label="Chế độ điều trị" value={modeLabel(plan.treatmentMode)} /> : null}
      <InfoRow label="Thời gian mỗi lần chiếu" value={fmtDuration(plan.durationSec)} />
      <InfoRow label="Số lần mỗi buổi" value={String(plan.sessionsPerDay ?? 1)} />
    </>
  );
}

export function ProgressRows({ pr }: { pr: CourseProgress }) {
  return (
    <>
      <StatGrid
        items={[
          { label: 'Buổi đã làm', value: `${pr.done}/${pr.total}` },
          { label: 'Bỏ lỡ (đã đồng bộ)', value: pr.missed, tone: pr.missed > 0 ? 'amber' : undefined },
          { label: 'Ngoài lịch hoặc thừa', value: pr.extra, tone: pr.extra > 0 ? 'amber' : undefined },
          { label: 'Thiết bị chặn', value: pr.blocked },
        ]}
      />
      {pr.next && <InfoRow label="Buổi tiếp theo" value={fmtDate(pr.next)} />}
    </>
  );
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Mốc xem lại hiệu quả ở ngày 28 của đợt. Chỉ gợi ý, bác sĩ quyết định. */
export function ReviewNote({ review, forPatient }: { review: AreaReview; forPatient?: boolean }) {
  if (review.state === 'no_data') {
    return <Muted>{forPatient ? 'Chưa đủ số đo để so với đầu đợt.' : `Chưa đủ số đo để so với đầu đợt. Mốc xem lại hiệu quả: ${fmtDate(review.reviewDate)}.`}</Muted>;
  }
  const change = review.reduction! >= 0 ? `giảm ${pct(review.reduction!)}` : `tăng ${pct(-review.reduction!)}`;
  const line = `Diện tích ${String(review.baseline).replace('.', ',')} → ${String(review.latest).replace('.', ',')} cm², ${change} so với đầu đợt.`;
  if (forPatient) return <Text style={{ color: C.text }}>{line}</Text>;
  const low = review.state === 'low';
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', padding: 12, borderRadius: radius.m, backgroundColor: low ? C.amberSoft : review.state === 'ok' ? C.greenSoft : C.surfaceMuted }}>
      <Ionicons name={low ? 'alert-circle-outline' : review.state === 'ok' ? 'checkmark-circle-outline' : 'time-outline'} size={20} color={low ? C.amber : review.state === 'ok' ? C.green : C.textSoft} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ color: C.text }}>{line}</Text>
        <Text style={{ color: C.textSoft, fontSize: 14 }}>
          {review.state === 'pending'
            ? `Mốc xem lại hiệu quả: ${fmtDate(review.reviewDate)}.`
            : low
              ? `Đã qua mốc ${fmtDate(review.reviewDate)} mà giảm chưa tới ${pct(REVIEW_MIN_REDUCTION)}: cân nhắc xem lại liệu trình và nguyên nhân. Ngưỡng tham khảo cho loét bàn chân đái tháo đường (Sheehan 2003).`
              : `Đã qua mốc ${fmtDate(review.reviewDate)}, giảm từ ${pct(REVIEW_MIN_REDUCTION)} trở lên.`}
        </Text>
      </View>
    </View>
  );
}
