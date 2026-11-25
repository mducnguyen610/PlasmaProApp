import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { DoseRows } from '@/components/CourseCard';
import { Text } from '@/components/Text';
import { Button, Notice } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { pendingExtension } from '@/lib/planLifecycle';
import { useStore } from '@/lib/store';
import type { TreatmentPlan, Wound } from '@/lib/types';
import { C } from '@/theme';

/**
 * Giai đoạn B (AU-04): bệnh nhân đọc và xác nhận phiên bản đợt điều trị bác sĩ vừa áp dụng. Chưa xác nhận thì không nạp
 * liệu trình xuống máy được. Chỉ hiển thị giá trị bác sĩ đã lưu; không đổi nội dung phác đồ.
 */
export function PlanAckCard({ plan, wound, showDetailLink = true }: { plan: TreatmentPlan; wound?: Wound; showDetailLink?: boolean }) {
  const { acknowledgePlan } = useStore();
  const [busy, setBusy] = useState(false);
  // Logic chốt 25/11/2026 (M32): phiên bản đã đọc nhưng bác sĩ vừa gia hạn thì chỉ cần đọc ngày kết thúc mới.
  const ext = plan.patientAckAt ? pendingExtension(plan) : undefined;
  if (ext) {
    return (
      <View style={{ gap: 10 }} testID="xac-nhan-gia-han">
        <Notice tone="amber" icon="calendar-outline">
          {`Bác sĩ đã gia hạn đợt điều trị${wound ? ` ${wound.code}` : ''} từ ${fmtDate(ext.fromEnd)} đến ${fmtDate(ext.toEnd)} lúc ${fmtDateTime(ext.at)}. Liều và lịch không đổi. Hãy xác nhận đã đọc ngày kết thúc mới; chưa xác nhận thì không chạy được phiên sau ${fmtDate(ext.fromEnd)}.`}
        </Notice>
        {ext.reason ? <Text style={{ color: C.textSoft }}>{`Lý do gia hạn: ${ext.reason}`}</Text> : null}
        <Button label={`Tôi đã đọc ngày kết thúc mới ${fmtDate(ext.toEnd)}`} icon="checkmark-done-outline" loading={busy}
          onPress={async () => {
            setBusy(true);
            try { await acknowledgePlan(plan.id); } catch (e) { notify('Chưa ghi được xác nhận', e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
          }} />
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }} testID="xac-nhan-phien-ban">
      <Notice tone="amber" icon="document-text-outline">
        {`Bác sĩ đã áp dụng phiên bản ${plan.version} cho đợt điều trị${wound ? ` ${wound.code}` : ''} lúc ${fmtDateTime(plan.editedAt)}. Hãy đọc liều và lịch rồi xác nhận trước khi nạp liệu trình vào máy.`}
      </Notice>
      <View>
        <DoseRows plan={plan} />
      </View>
      {plan.reason ? <Text style={{ color: C.textSoft }}>{`Lý do thay đổi: ${plan.reason}`}</Text> : null}
      {showDetailLink && (
        <Button label="Xem đầy đủ đợt điều trị" variant="secondary" icon="reader-outline" onPress={() => router.push({ pathname: '/plan/[patientId]', params: { patientId: plan.patientId, ...(plan.woundId ? { woundId: plan.woundId } : {}) } })} />
      )}
      <Button
        label={`Tôi đã đọc phiên bản ${plan.version}`}
        icon="checkmark-done-outline"
        loading={busy}
        onPress={async () => {
          setBusy(true);
          try {
            await acknowledgePlan(plan.id);
          } catch (e) {
            notify('Chưa ghi được xác nhận', e instanceof Error ? e.message : String(e));
          } finally {
            setBusy(false);
          }
        }}
      />
    </View>
  );
}
