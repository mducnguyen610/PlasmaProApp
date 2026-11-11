// Xếp người bệnh của bác sĩ theo mức cần chú ý (FR10) và phân trạng thái hôm nay.
// Trọng số điểm là đề xuất của ứng dụng, chưa có nguồn; cần bác sĩ chốt.

export type TodayState = 'treated' | 'due' | 'no_data' | 'rest' | 'no_plan';

export interface AttentionInput {
  patientId: string;
  hasActivePlan: boolean;
  scheduledToday: boolean;
  completedToday: number;
  targetPerDay: number;
  lastSyncDay: string | null;
  today: string;
  missedLast7: number;
  openReports: number;
  severity: 'mild' | 'moderate' | 'severe' | undefined;
}

export interface Attention { patientId: string; state: TodayState; score: number; reasons: string[] }

export const TODAY_LABEL: Record<TodayState, string> = { treated: 'Đã chiếu', due: 'Cần chiếu', no_data: 'Chưa có dữ liệu', rest: 'Ngày nghỉ', no_plan: 'Chưa có đợt' };

export function classifyToday(i: AttentionInput): TodayState {
  if (!i.hasActivePlan) return 'no_plan';
  if (!i.scheduledToday) return 'rest';
  if (i.completedToday >= i.targetPerDay) return 'treated';
  if (i.lastSyncDay !== i.today) return 'no_data';
  return 'due';
}

export function attentionOf(i: AttentionInput): Attention {
  const state = classifyToday(i);
  let score = 0;
  const reasons: string[] = [];
  if (i.openReports > 0) {
    score += 100 * i.openReports;
    reasons.push(`${i.openReports} báo cáo chưa xử lý`);
  }
  if (i.severity === 'severe') {
    score += 50;
    reasons.push('Mức độ Nặng');
  } else if (i.severity === 'moderate') {
    score += 20;
    reasons.push('Mức độ Trung bình');
  }
  if (i.missedLast7 > 0) {
    score += 10 * i.missedLast7;
    reasons.push(`Bỏ lỡ ${i.missedLast7} buổi trong 7 ngày`);
  }
  if (state === 'no_data') {
    score += 5;
    reasons.push('Chưa có dữ liệu hôm nay');
  }
  return { patientId: i.patientId, state, score, reasons };
}

/** Điểm giảm dần; hai người cùng điểm giữ thứ tự vào. */
export function rankPatients(inputs: AttentionInput[]): Attention[] {
  return inputs
    .map((i, idx) => ({ a: attentionOf(i), idx }))
    .sort((x, y) => y.a.score - x.a.score || x.idx - y.idx)
    .map((x) => x.a);
}
