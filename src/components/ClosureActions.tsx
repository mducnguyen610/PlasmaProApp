import { View } from 'react-native';

import { Button, Muted } from '@/components/ui';
import { addDays, CLOSURE_CONFIRM_DAYS, followUpDates } from '@/lib/course';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { WoundStatus } from '@/lib/types';

type Step = Parameters<ReturnType<typeof useStore>['recordClosure']>[1];

/**
 * Kết thúc đợt khi liền thương thay vì theo ngày (S2k 2022: dừng khi biểu mô khép).
 * Liền được xác nhận ở hai lần khám cách nhau 2 tuần (FDA 2006), sau đó chuyển sang theo dõi.
 */
export function ClosureActions({ woundId, status, check1, followUpFrom, today, hasPlan, onNewCourse }: {
  woundId: string; status: WoundStatus; check1?: string; followUpFrom?: string; today: string; hasPlan: boolean; onNewCourse: () => void;
}) {
  const { recordClosure } = useStore();
  const run = (step: Step, title: string, body: string, ok: string, after?: () => void) =>
    confirm(title, body, () => {
      try { recordClosure(woundId, step); after?.(); } catch (e) { notify('Chưa ghi được', e instanceof Error ? e.message : String(e)); }
    }, ok);

  if (status === 'active') {
    return (
      <View style={{ gap: 8 }}>
        <Button label="Ghi nhận biểu mô đã khép (lần 1)" icon="checkmark-circle-outline" variant="secondary"
          onPress={() => run('check1', 'Biểu mô đã khép', 'Dừng điều trị plasma và hẹn khám lại sau 2 tuần để xác nhận đã liền. Thiết bị sẽ không phát trong thời gian chờ.', 'Ghi nhận')} />
        <Button label="Tạm dừng đợt" icon="pause-outline" variant="ghost" onPress={() => run('pause', 'Tạm dừng', 'Thiết bị sẽ không phát cho tới khi bác sĩ tiếp tục đợt.', 'Tạm dừng')} />
      </View>
    );
  }
  if (status === 'paused') {
    return <Button label="Tiếp tục đợt" icon="play-outline" variant="secondary" onPress={() => run('resume', 'Tiếp tục đợt', 'Thiết bị phát lại theo lịch của đợt.', 'Tiếp tục')} />;
  }
  if (status === 'awaiting_closure') {
    const from = check1 ? addDays(check1, CLOSURE_CONFIRM_DAYS) : today;
    const can = today >= from;
    return (
      <View style={{ gap: 8 }}>
        <Muted>Lần 1 ngày {fmtDate(check1)}. Xác nhận lần 2 được từ {fmtDate(from)} (cách {CLOSURE_CONFIRM_DAYS} ngày).</Muted>
        <Button label="Xác nhận đã liền (lần 2)" icon="checkmark-done-outline" disabled={!can}
          onPress={() => run('confirm', 'Xác nhận đã liền', 'Kết thúc đợt điều trị (lý do: đã liền thương) và chuyển sang theo dõi sau điều trị. Thu hồi thiết bị do quản trị kỹ thuật thực hiện.', 'Xác nhận')} />
        <Button label="Chưa liền, tiếp tục đợt" icon="refresh-outline" variant="ghost" onPress={() => run('not_healed', 'Tiếp tục đợt', 'Vết thương chưa liền: đợt điều trị được áp dụng lại.', 'Tiếp tục')} />
      </View>
    );
  }
  if (status === 'follow_up') {
    return (
      <View style={{ gap: 8 }}>
        {followUpFrom && <Muted>Đã liền ngày {fmtDate(followUpFrom)}. Mốc kiểm tra: {followUpDates(followUpFrom).map((x) => `${fmtDate(x.date)} (${x.days} ngày)`).join(', ')}. Mốc là giá trị giả định, chờ bác sĩ chọn.</Muted>}
        <Button label="Vết thương mở lại: lập đợt mới" icon="add-circle-outline" variant="secondary"
          onPress={() => run('reopen', 'Mở đợt mới', 'Vết thương chuyển về đang điều trị. Lịch sử các đợt trước được giữ.', 'Mở đợt', onNewCourse)} />
        <Button label="Kết thúc theo dõi" icon="archive-outline" variant="ghost" onPress={() => run('end_follow_up', 'Kết thúc theo dõi', 'Vết thương được đóng hồ sơ.', 'Kết thúc')} />
      </View>
    );
  }
  return <Muted>{hasPlan ? 'Đã kết thúc theo dõi, hồ sơ vết thương đã đóng.' : 'Hồ sơ vết thương đã đóng.'}</Muted>;
}
