import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { Text } from '@/components/Text';
import { Button, Card, Chip, Disclosure, Field, InfoRow, Muted, Notice, SectionTitle, WoundPhoto } from '@/components/ui';
import { fmtDuration } from '@/lib/course';
import { confirm, notify } from '@/lib/dialog';
import { fmtDateTime, PLAN_STATUS } from '@/lib/format';
import { planDeleteBlocker } from '@/lib/planVersion';
import { useLookups, useStore } from '@/lib/store';
import type { TreatmentPlan, WoundImage } from '@/lib/types';
import { C, T } from '@/theme';

/**
 * Giai đoạn B (CN3 P1, P3; AU-06): kiểm tra điều kiện trước khi lập phác đồ mới. Liệt kê ảnh hợp lệ của vết chụp hôm nay,
 * chọn sẵn ảnh mới nhất (đề xuất), bác sĩ đổi được. Không có ảnh hợp lệ thì không lập được, có lối chụp ảnh.
 */
export function PlanEligibility({ woundId, candidates, value, onChange }: { woundId: string; candidates: WoundImage[]; value: string; onChange: (id: string) => void }) {
  if (!candidates.length) {
    return (
      <Card testID="dieu-kien-phac-do" style={{ gap: 10 }}>
        <SectionTitle icon="clipboard-outline">Kiểm tra điều kiện</SectionTitle>
        <Notice icon="camera-outline">Chưa đủ điều kiện tạo phác đồ mới: cần ít nhất một ảnh của vết chụp hôm nay, đã lưu, chất lượng Đạt và không đánh dấu Không sử dụng. Không cần kết quả AI.</Notice>
        <Button label="Chụp ảnh vết thương" icon="camera" onPress={() => router.push({ pathname: '/guided-capture', params: { woundId } })} />
        <Muted>Sau khi chụp, mở ảnh và đánh giá chất lượng Đạt ở thẻ Nhãn ảnh.</Muted>
      </Card>
    );
  }
  return (
    <Card testID="dieu-kien-phac-do" style={{ gap: 10 }}>
      <SectionTitle icon="clipboard-outline">Kiểm tra điều kiện</SectionTitle>
      <Muted>{`Đạt điều kiện: ${candidates.length} ảnh hợp lệ chụp hôm nay. Ảnh mới nhất được chọn làm ảnh căn cứ; bác sĩ đổi được.`}</Muted>
      <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
        {candidates.map((im, i) => {
          const on = im.id === value;
          return (
            <Pressable key={im.id} accessibilityRole="radio" accessibilityState={{ checked: on, selected: on }} accessibilityLabel={`Ảnh căn cứ ${im.id}${i === 0 ? ', đề xuất' : ''}`}
              onPress={() => onChange(im.id)} style={{ width: 120, gap: 4, borderRadius: 12, borderWidth: 2, borderColor: on ? C.primary : 'transparent', padding: 2 }}>
              <WoundPhoto image={im} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 10 }} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={16} color={on ? C.primary : C.textSoft} />
                <Text style={{ fontSize: T.caption, color: C.text, fontWeight: '600' }}>{im.id}</Text>
              </View>
              {i === 0 && <Text style={{ fontSize: T.caption, color: C.textSoft }}>Đề xuất</Text>}
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}

/**
 * Giai đoạn B (CN3 P8, P9; AU-08, AU-09): tạm dừng, tiếp tục phiên bản đang áp dụng với lý do bắt buộc; xóa phác đồ chưa có phiên.
 * Chỉ bác sĩ phụ trách. Lành lần 1 tự tạm dừng đợt giữ như cũ (XN-05).
 */
export function PlanManageCard({ plan }: { plan: TreatmentPlan }) {
  const { data, setPlanPaused, deletePlan } = useStore();
  const { account } = useLookups();
  const [reason, setReason] = useState('');
  const [delReason, setDelReason] = useState('');
  const busy = useRef(false);
  const [working, setWorking] = useState(false);
  const run = async (op: () => Promise<void>, done: string) => {
    if (busy.current) return;
    busy.current = true; setWorking(true);
    try { await op(); notify(done, ''); }
    catch (e) { notify('Chưa thực hiện được', e instanceof Error ? e.message : String(e)); }
    finally { busy.current = false; setWorking(false); }
  };
  const canToggle = plan.status === 'active' || plan.status === 'paused';
  const blocker = plan.protocolId ? planDeleteBlocker(data.plans, data.sessions, data.deviceLinks ?? [], plan.protocolId) : 'Phác đồ chưa có mã.';
  const log = [...(plan.statusLog ?? [])].reverse();
  return (
    <Card testID="quan-ly-phac-do" style={{ gap: 10 }}>
      <SectionTitle icon="options-outline">Quản lý phác đồ</SectionTitle>
      <View style={{ flexDirection: 'row' }}><Chip label={`Phiên bản ${plan.version} · ${PLAN_STATUS[plan.status].label}`} tone={plan.status === 'active' ? 'green' : plan.status === 'paused' ? 'amber' : 'gray'} /></View>
      {canToggle && (
        <>
          <Field label={plan.status === 'active' ? 'Lý do tạm dừng' : 'Lý do tiếp tục'} value={reason} onChangeText={setReason}
            placeholder={plan.status === 'active' ? 'Ví dụ: da quanh vết kích ứng, theo dõi thêm' : 'Ví dụ: hết kích ứng'} />
          <Button label={plan.status === 'active' ? 'Tạm dừng phác đồ' : 'Tiếp tục phác đồ'} icon={plan.status === 'active' ? 'pause-outline' : 'play-outline'} variant="secondary"
            loading={working} disabled={!reason.trim()} reason="Nhập lý do trước."
            onPress={() => confirm(plan.status === 'active' ? 'Tạm dừng phác đồ' : 'Tiếp tục phác đồ',
              plan.status === 'active' ? 'Bệnh nhân không nạp liệu trình và không bắt đầu phiên cho tới khi bác sĩ tiếp tục. Trạng thái vết thương không đổi.' : 'Bệnh nhân điều trị lại theo phiên bản này.',
              () => run(async () => { await setPlanPaused(plan.id, plan.status === 'active', reason); setReason(''); }, plan.status === 'active' ? 'Đã tạm dừng' : 'Đã tiếp tục'),
              plan.status === 'active' ? 'Tạm dừng' : 'Tiếp tục')} />
        </>
      )}
      {log.length > 0 && (
        <Disclosure icon="time-outline" title="Nhật ký tạm dừng, tiếp tục" summary={`${log.length} lần`}>
          {log.map((e, i) => (
            <View key={i} style={{ gap: 2, paddingVertical: 4 }}>
              <Text style={{ fontSize: T.small, fontWeight: '600', color: C.text }}>{`${fmtDateTime(e.at)} · ${e.action === 'pause' ? 'Tạm dừng' : 'Tiếp tục'} · ${account(e.by)?.name ?? '—'}`}</Text>
              <Muted>{`Lý do: ${e.reason}`}</Muted>
            </View>
          ))}
        </Disclosure>
      )}
      <Disclosure icon="trash-outline" title="Xóa phác đồ" summary={blocker ? 'Không xóa được' : 'Chỉ khi chưa có phiên'}>
        {blocker ? <Muted>{blocker}</Muted> : (
          <View style={{ gap: 8 }}>
            <Muted>Phác đồ chưa có phiên điều trị nên xóa được. Mọi phiên bản của phác đồ này bị xóa; nhật ký giữ mã phác đồ, người xóa, thời điểm và lý do.</Muted>
            <Field label="Lý do xóa" value={delReason} onChangeText={setDelReason} placeholder="Ví dụ: lập nhầm vết thương" />
            <Button label="Xóa phác đồ" icon="trash-outline" variant="danger" loading={working} disabled={!delReason.trim()} reason="Nhập lý do xóa."
              onPress={() => confirm('Xóa phác đồ', `Xóa ${data.plans.filter((x) => x.protocolId === plan.protocolId).length} phiên bản của phác đồ này. Không hoàn tác được.`,
                () => run(async () => { await deletePlan(plan.protocolId!, delReason); setDelReason(''); }, 'Đã xóa phác đồ'), 'Xóa')} />
          </View>
        )}
      </Disclosure>
    </Card>
  );
}

/** Giai đoạn B (CN3 P10): lịch sử phiên theo vết, chỉ xem: thời lượng dự kiến (theo phiên bản), thực tế, hoàn tất hay gián đoạn. */
export function SessionHistoryCard({ woundId }: { woundId: string }) {
  const { data } = useStore();
  const list = data.sessions.filter((s) => s.woundId === woundId).sort((a, b) => b.start.localeCompare(a.start));
  const [all, setAll] = useState(false);
  const shown = all ? list : list.slice(0, 10);
  const STATUS = { completed: 'Hoàn tất', interrupted: 'Gián đoạn', over_limit: 'Vượt giới hạn' } as const;
  return (
    <Card testID="lich-su-phien" style={{ gap: 6 }}>
      <SectionTitle icon="pulse-outline" caption="Chỉ xem. Phiên cũ chưa ghi phiên bản hiện dấu gạch.">{`Lịch sử phiên (${list.length})`}</SectionTitle>
      {list.length === 0 && <Muted>Chưa có phiên điều trị nào của vết này.</Muted>}
      {shown.map((s) => {
        const pl = s.planId ? data.plans.find((x) => x.id === s.planId) : undefined;
        return (
          <View key={s.sessionId} accessible style={{ gap: 2, paddingVertical: 6, borderTopWidth: 1, borderTopColor: C.border }}>
            <Text style={{ fontSize: T.small, fontWeight: '600', color: C.text }}>{`${fmtDateTime(s.start)} · ${STATUS[s.status]}`}</Text>
            <InfoRow label="Thực tế" value={`${s.durationMin} phút`} />
            <InfoRow label="Dự kiến" value={pl?.durationSec != null ? fmtDuration(pl.durationSec) : '—'} />
            <InfoRow label="Phiên bản" value={s.planVersion ? `v${s.planVersion}` : '—'} />
          </View>
        );
      })}
      {list.length > 10 && <Button label={all ? 'Thu gọn' : `Xem tất cả ${list.length} phiên`} variant="ghost" onPress={() => setAll(!all)} />}
    </Card>
  );
}
