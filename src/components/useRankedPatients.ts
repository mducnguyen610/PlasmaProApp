import { useMemo } from 'react';

import { patientSeverity } from '@/lib/access';
import { rankPatients, type AttentionInput } from '@/lib/attention';
import { addDays, isScheduled, localDay } from '@/lib/course';
import { useLookups, useStore } from '@/lib/store';

/** Bệnh nhân của bác sĩ đang đăng nhập, xếp theo mức cần chú ý (FR10). Chuyển nguyên từ trang chủ bác sĩ để B01 và B02 dùng chung (V09). */
export function useRankedPatients() {
  const { data, me } = useStore();
  const { device, woundsOf, coursePlan, sessionsOf } = useLookups();
  return useMemo(() => {
    const today = localDay();
    const inputs: AttentionInput[] = data.patients
      .filter((p) => p.doctorId === me?.id)
      .map((p) => {
        const plans = woundsOf(p.id)
          .filter((w) => w.status === 'active')
          .map((w) => coursePlan(w.id))
          .filter((pl): pl is NonNullable<typeof pl> => !!pl && pl.status === 'active');
        const dev = device(p.deviceId);
        const lastSyncDay = dev?.lastSync ? localDay(dev.lastSync) : null;
        const completed = (p.deviceId ? sessionsOf(p.deviceId) : []).filter((s) => s.status === 'completed');
        const doneOn = (d: string) => completed.some((s) => localDay(s.start) === d);
        const todayPlans = plans.filter((pl) => isScheduled(pl, today));
        let missedLast7 = 0;
        for (let k = 1; k <= 7; k++) {
          const d = addDays(today, -k);
          // Cùng quy tắc với missed trong courseProgress: chỉ tính ngày đã có dữ liệu đồng bộ.
          if (plans.some((pl) => isScheduled(pl, d)) && !doneOn(d) && lastSyncDay !== null && d <= lastSyncDay) missedLast7++;
        }
        return {
          patientId: p.id,
          hasActivePlan: plans.length > 0,
          scheduledToday: todayPlans.length > 0,
          completedToday: completed.filter((s) => localDay(s.start) === today).length,
          targetPerDay: todayPlans.reduce((n, pl) => n + (pl.sessionsPerDay ?? 1), 0),
          lastSyncDay,
          today,
          missedLast7,
          missedYesterday: (() => {
            const y = addDays(today, -1);
            return plans.some((pl) => isScheduled(pl, y)) && !doneOn(y) && lastSyncDay !== null && y <= lastSyncDay;
          })(),
          openReports: data.reports.filter((r) => r.patientId === p.id && !r.handled).length,
          severity: patientSeverity(data, p.id),
        };
      });
    return rankPatients(inputs);
  }, [data, me?.id, woundsOf, coursePlan, sessionsOf, device]);
}
