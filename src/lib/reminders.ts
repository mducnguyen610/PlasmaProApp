import { Platform } from 'react-native';

import { followUpDates } from './course';
import { fmtDate } from './format';
import type { AppData } from './types';

export interface Reminder {
  id: string;
  date: string;
  kind: 'photo' | 'review' | 'retake' | 'plan' | 'followup';
  title: string;
  body: string;
}

const addDays = (iso: string, n: number) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);

/** Lấy chu kỳ ngày từ lịch đánh giá do bác sĩ ghi, ví dụ "Tái đánh giá mỗi 7 ngày". */
export function parseEveryDays(text: string): number | null {
  const m = text.match(/mỗi\s+(\d+)\s*ngày/i);
  const n = m ? Number(m[1]) : NaN;
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** Nhắc lịch chụp ảnh / tái đánh giá cho một bệnh nhân (đặc tả mục 8, giai đoạn 2). */
export function computeReminders(data: AppData, patientId: string, today: string): Reminder[] {
  const out: Reminder[] = [];
  const plan = data.plans
    .filter((p) => p.patientId === patientId && p.confirmed && p.status === 'active')
    .sort((a, b) => b.version - a.version)[0];
  const every = plan ? parseEveryDays(plan.reviewSchedule) : null;
  const wounds = data.wounds.filter((w) => w.patientId === patientId && (w.status === 'active' || w.status === 'awaiting_closure'));
  // Sau khi liền: hẹn chụp ảnh kiểm tra ở các mốc theo dõi (FDA 2006: ít nhất 3 tháng; mốc cụ thể chờ bác sĩ chọn).
  for (const w of data.wounds.filter((x) => x.patientId === patientId && x.status === 'follow_up' && x.followUpFrom)) {
    for (const m of followUpDates(w.followUpFrom!).filter((x) => x.date >= today)) {
      out.push({ id: `fu-${w.id}-${m.days}`, date: m.date, kind: 'followup', title: `Kiểm tra sau điều trị ${w.code}`, body: `${m.days} ngày sau khi liền: tái khám để bác sĩ chụp ảnh ${w.location}, chắc vết thương không mở lại.` });
    }
  }

  for (const w of wounds) {
    const imgs = data.images.filter((i) => i.woundId === w.id && i.capture?.sourceDateKnown !== false).sort((a, b) => b.captureDate.localeCompare(a.captureDate));
    if (every) {
      const base = imgs[0]?.captureDate ?? w.startDate;
      let due = addDays(base, every);
      if (due < today) due = today;
      out.push({ id: `photo-${w.id}`, date: due, kind: 'photo', title: `Hẹn bác sĩ chụp ảnh ${w.code}`, body: `Tái khám để bác sĩ chụp ảnh ${w.location} (lần trước ${fmtDate(base)}).` });
    }
    for (const im of imgs.filter((i) => i.retakeRequested)) {
      out.push({ id: `retake-${im.id}`, date: today, kind: 'retake', title: `Hẹn bác sĩ chụp lại ${w.code}`, body: im.retakeRequested! });
    }
    const ev = data.evaluations
      .filter((e) => e.woundId === w.id && e.visibleToPatient && e.nextReview)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    if (ev?.nextReview && ev.nextReview >= today) {
      out.push({ id: `review-${ev.id}`, date: ev.nextReview, kind: 'review', title: 'Tái đánh giá với bác sĩ', body: `Lịch tái đánh giá ${w.code} ngày ${fmtDate(ev.nextReview)}.` });
    }
  }
  if (plan && plan.endDate >= today) {
    out.push({ id: `plan-${plan.id}`, date: plan.endDate, kind: 'plan', title: 'Bác sĩ xem lại đợt điều trị', body: `Ngày dự kiến của đợt v${plan.version} (${fmtDate(plan.endDate)}). Đợt kết thúc khi bác sĩ xác nhận vết thương đã liền, không tự dừng theo ngày.` });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Đặt thông báo cục bộ trên iPhone lúc 8:00 các ngày nhắc. Không cần máy chủ (chạy được trong Expo Go). */
export async function scheduleReminders(list: Reminder[]): Promise<{ scheduled: number; denied: boolean }> {
  if (Platform.OS === 'web') return { scheduled: 0, denied: true };
  const Notifications = await import('expo-notifications');
  const perm = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: false, allowSound: true } });
  if (!perm.granted) return { scheduled: 0, denied: true };
  await Notifications.cancelAllScheduledNotificationsAsync();
  let scheduled = 0;
  for (const r of list) {
    const [y, m, d] = r.date.split('-').map(Number);
    const at = new Date(y, m - 1, d, 8, 0, 0);
    if (at.getTime() <= Date.now()) at.setTime(Date.now() + 60_000);
    await Notifications.scheduleNotificationAsync({
      content: { title: r.title, body: r.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
    });
    scheduled++;
  }
  return { scheduled, denied: false };
}
