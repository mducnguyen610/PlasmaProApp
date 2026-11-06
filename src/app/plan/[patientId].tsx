import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { DoseRows, PhaseList } from '@/components/CourseCard';
import { NoAccess, useCanView } from '@/components/Guard';
import { Button, Card, Chip, Choices, Field, Header, InfoRow, Muted, Screen, SectionTitle, Segmented, SwitchRow } from '@/components/ui';
import { DEFAULT_REVIEW_DAY, fmtDuration, phaseLabel, suggestDurationSec } from '@/lib/course';
import { notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, PLAN_STATUS } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import type { CoursePhase, PhasePattern, PlanStatus, TreatmentPlan } from '@/lib/types';
import { C } from '@/theme';

const toVn = (iso: string) => (iso ? fmtDate(iso) : '');
const fromVn = (s: string) => {
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
};
const numOrNull = (s: string) => (s.trim() === '' ? null : Number(s.replace(',', '.')));
const END_REASON = { healed: 'Đã liền thương', stopped: 'Dừng theo chỉ định', no_progress: 'Không cải thiện', other: 'Khác' } as const;
const PATTERNS: { value: PhasePattern; label: string }[] = [
  { value: 'daily', label: 'Mỗi ngày' },
  { value: 'every_n_days', label: 'Cách N ngày' },
  { value: 'n_per_week', label: 'N buổi mỗi tuần' },
];

function PlanCard({ plan, editorName }: { plan: TreatmentPlan; editorName?: string }) {
  return (
    <Card>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>Phiên bản {plan.version}</Text>
        <Chip label={PLAN_STATUS[plan.status].label} tone={PLAN_STATUS[plan.status].tone} />
      </View>
      <PhaseList plan={plan} />
      <DoseRows plan={plan} />
      {plan.minIntervalMin != null && <InfoRow label="Giãn cách giữa hai lần" value={`${plan.minIntervalMin} phút`} />}
      <InfoRow label="Ngày dự kiến xem lại đợt" value={fmtDate(plan.endDate)} />
      <InfoRow label="Mốc xem lại hiệu quả" value={`Ngày thứ ${plan.reviewAtDay ?? DEFAULT_REVIEW_DAY}`} />
      {plan.endReason && <InfoRow label="Lý do kết thúc" value={END_REASON[plan.endReason]} />}
      <InfoRow label="Lịch tái khám" value={plan.reviewSchedule || '—'} />
      {plan.notes ? <Muted>Ghi chú: {plan.notes}</Muted> : null}
      <Muted>Sửa bởi {editorName ?? '—'} lúc {fmtDateTime(plan.editedAt)} · Lý do: {plan.reason || '—'}</Muted>
      <Chip label={plan.confirmed ? 'Bác sĩ đã xác nhận' : 'Chưa xác nhận'} tone={plan.confirmed ? 'green' : 'gray'} />
    </Card>
  );
}

interface PhaseDraft { from: string; to: string; pattern: PhasePattern; n: string }
const toDraft = (p: CoursePhase): PhaseDraft => ({ from: toVn(p.from), to: toVn(p.to), pattern: p.pattern, n: String(p.n) });

// BS07 – Đợt điều trị theo vết thương: giai đoạn, liều theo mức + thời gian, phiên bản có lý do (đặc tả 7.1).
export default function Plan() {
  const { patientId, woundId: woundParam } = useLocalSearchParams<{ patientId: string; woundId?: string }>();
  const { woundsOf } = useLookups();
  const wounds = woundsOf(patientId);
  const [woundId, setWoundId] = useState(woundParam ?? wounds.find((w) => w.status === 'active')?.id ?? wounds[0]?.id ?? '');
  // Đổi vết thương thì dựng lại biểu mẫu theo đợt của vết đó.
  return <PlanBody key={woundId} patientId={patientId} woundId={woundId} setWoundId={setWoundId} />;
}

function PlanBody({ patientId, woundId, setWoundId }: { patientId: string; woundId: string; setWoundId: (v: string) => void }) {
  const { data, me, savePlan } = useStore();
  const { patient, account, woundsOf, imagesOf } = useLookups();
  const p = patient(patientId);
  const canView = useCanView(p);
  const wounds = p ? woundsOf(p.id) : [];
  const first = wounds[0]?.id;
  const plans = data.plans.filter((x) => x.patientId === patientId && (x.woundId ?? first) === woundId).sort((a, b) => b.version - a.version);
  const latest = plans[0];
  const lastArea = woundId ? [...imagesOf(woundId)].reverse().find((i) => i.areaCm2 !== null && i.status === 'labeled') : undefined;

  const [status, setStatus] = useState<PlanStatus>(latest?.status === 'ended' ? 'draft' : latest?.status ?? 'draft');
  const [phases, setPhases] = useState<PhaseDraft[]>(
    latest?.phases?.length ? latest.phases.map(toDraft) : [{ from: toVn(latest?.startDate ?? ''), to: toVn(latest?.endDate ?? ''), pattern: 'daily', n: '1' }],
  );
  const [perVisit, setPerVisit] = useState(latest?.sessionsPerDay?.toString() ?? '1');
  const [gap, setGap] = useState(latest?.minIntervalMin?.toString() ?? '');
  const [level, setLevel] = useState(latest?.doseLevel?.toString() ?? '');
  const [duration, setDuration] = useState(latest?.durationSec?.toString() ?? '');
  const [spc, setSpc] = useState(latest?.secondsPerCm2?.toString() ?? '');
  const [reviewDay, setReviewDay] = useState(String(latest?.reviewAtDay ?? DEFAULT_REVIEW_DAY));
  const [review, setReview] = useState(latest?.reviewSchedule ?? '');
  const [notes, setNotes] = useState(latest?.notes ?? '');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState(0);

  if (!p || !canView) return <NoAccess />;

  if (me?.role === 'patient') {
    // Bệnh nhân chỉ xem đợt đã được bác sĩ xác nhận.
    const visible = data.plans.filter((x) => x.patientId === p.id && x.confirmed && x.status !== 'draft').sort((a, b) => b.version - a.version);
    return (
      <Screen header={<Header back title="Đợt điều trị của tôi" />}>
        {visible.length === 0 ? <Card><Muted>Chưa có đợt điều trị được bác sĩ xác nhận.</Muted></Card> : <PlanCard plan={visible[0]} editorName={account(visible[0].editedBy)?.name} />}
        <Muted>Thiết bị đã được khóa theo mức năng lượng và thời gian bác sĩ đặt. Bạn không cần chỉnh gì trên thiết bị.</Muted>
      </Screen>
    );
  }

  const suggestion = suggestDurationSec(lastArea?.areaCm2, numOrNull(spc));
  const setPhase = (i: number, patch: Partial<PhaseDraft>) => setPhases(phases.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const fail = (st: number, msg: string) => { setStep(st); setErr(msg); };
  const save = () => {
    const parsed: CoursePhase[] = [];
    for (const [i, ph] of phases.entries()) {
      const from = fromVn(ph.from);
      const to = fromVn(ph.to);
      const n = ph.pattern === 'daily' ? 1 : Number(ph.n);
      if (!from || !to) return fail(0, `Giai đoạn ${i + 1}: ngày theo dạng dd/mm/yyyy.`);
      if (to < from) return fail(0, `Giai đoạn ${i + 1}: ngày kết thúc phải sau ngày bắt đầu.`);
      if (i > 0 && from <= parsed[i - 1].to) return fail(0, `Giai đoạn ${i + 1} phải bắt đầu sau giai đoạn ${i}.`);
      if (!Number.isInteger(n) || n < 1 || (ph.pattern === 'n_per_week' && n > 7)) return fail(0, `Giai đoạn ${i + 1}: N phải là số nguyên${ph.pattern === 'n_per_week' ? ' từ 1 đến 7' : ' từ 1'}.`);
      parsed.push({ from, to, pattern: ph.pattern, n });
    }
    const nums = [perVisit, gap, level, duration, spc, reviewDay].map(numOrNull);
    if (nums.some((n) => n !== null && (!Number.isFinite(n) || n < 0))) return fail(1, 'Thông số phải là số không âm.');
    if (status === 'active' && (nums[2] === null || nums[3] === null)) return fail(1, 'Đợt "Đang áp dụng" cần mức năng lượng và thời gian chiếu để khóa trên thiết bị.');
    if (!reason.trim()) return fail(2, 'Nhập lý do thay đổi để lưu vết phiên bản.');
    if (status === 'active' && !confirmed) return fail(2, 'Đợt "Đang áp dụng" cần bác sĩ xác nhận.');
    setErr(null);
    savePlan({
      patientId: p.id, woundId, status, phases: parsed, sessionsPerDay: nums[0] ?? 1, minIntervalMin: nums[1], targetEnergyWh: null,
      doseLevel: nums[2], durationSec: nums[3], secondsPerCm2: nums[4], areaAtStart: lastArea?.areaCm2 ?? null, reviewAtDay: nums[5] ?? DEFAULT_REVIEW_DAY,
      startDate: parsed[0].from, endDate: parsed[parsed.length - 1].to, reviewSchedule: review.trim(), notes: notes.trim(), reason: reason.trim(), confirmed,
    });
    setReason('');
    notify('Đã lưu phiên bản mới', 'Thiết bị nhận lịch và liều khi đồng bộ, rồi khóa ở các thông số này (bản demo: mô phỏng).');
  };

  return (
    <Screen header={<Header back title="Đợt điều trị" subtitle={`${p.name} · ${p.code}`} />}>
      {wounds.length > 1 && (
        <Card>
          <SectionTitle icon="bandage-outline">Vết thương</SectionTitle>
          <Choices<string> value={woundId} onChange={setWoundId} options={wounds.map((w) => ({ value: w.id, label: `${w.code} · ${w.location}` }))} />
        </Card>
      )}
      <Card>
        <SectionTitle icon="flash-outline">Thiết lập phiên bản mới</SectionTitle>
        <Muted>Mỗi vết thương một đợt. Giá trị điều trị cụ thể do nhóm chuyên môn đặt; ứng dụng không đặt sẵn lịch hay liều.</Muted>

        {/* Biểu mẫu chia 3 bước (đề xuất 8): Lịch, Liều, Xác nhận. Lỗi đưa người dùng về đúng bước. */}
        <Segmented<string> value={String(step)} onChange={(v) => setStep(Number(v))} options={['Lịch', 'Liều', 'Xác nhận'].map((l, i) => ({ value: String(i), label: `${i + 1}. ${l}` }))} />
        {err ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{err}</Text> : null}
        {step === 0 && (
          <>
        <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Lịch theo giai đoạn</Text>
        <Muted>Ví dụ: mỗi ngày trong 2 tuần đầu, sau đó 3 buổi mỗi tuần (dạng liệu trình ở slide 39, 40).</Muted>
        {phases.map((ph, i) => (
          <View key={i} style={{ gap: 8, padding: 10, borderRadius: 10, backgroundColor: C.surfaceMuted }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontWeight: '700', color: C.text }}>Giai đoạn {i + 1}</Text>
              {phases.length > 1 && <Text accessibilityRole="button" onPress={() => setPhases(phases.filter((_, k) => k !== i))} style={{ color: C.red, fontWeight: '600', padding: 8 }}>Xóa</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Từ ngày" value={ph.from} onChangeText={(v) => setPhase(i, { from: v })} placeholder="dd/mm/yyyy" /></View>
              <View style={{ flex: 1 }}><Field label="Đến ngày" value={ph.to} onChangeText={(v) => setPhase(i, { to: v })} placeholder="dd/mm/yyyy" /></View>
            </View>
            <Choices<PhasePattern> value={ph.pattern} onChange={(v) => setPhase(i, { pattern: v })} options={PATTERNS} />
            {ph.pattern !== 'daily' && (
              <Field
                label={ph.pattern === 'every_n_days' ? 'N (số ngày giữa hai buổi, 2 = cách ngày)' : 'N (số buổi mỗi tuần)'}
                value={ph.n}
                onChangeText={(v) => setPhase(i, { n: v })}
                keyboardType="number-pad"
                hint={Number(ph.n) >= 1 ? phaseLabel({ from: '', to: '', pattern: ph.pattern, n: Number(ph.n) }) : undefined}
              />
            )}
          </View>
        ))}
        {phases.length < 3 && (
          <Button
            label="Thêm giai đoạn"
            icon="add"
            variant="ghost"
            onPress={() => setPhases([...phases, { from: '', to: '', pattern: 'n_per_week', n: '3' }])}
          />
        )}

          </>
        )}
        {step === 1 && (
          <>
        <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Liều mỗi lần chiếu</Text>
        <Muted>Thiết bị tại nhà bị khóa ở mức và thời gian này; bệnh nhân không đổi được (slide 24).</Muted>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Mức năng lượng" value={level} onChangeText={setLevel} keyboardType="number-pad" placeholder="Ví dụ 8" /></View>
          <View style={{ flex: 1 }}><Field label="Thời gian (giây)" value={duration} onChangeText={setDuration} keyboardType="number-pad" hint={numOrNull(duration) != null ? fmtDuration(numOrNull(duration)) : undefined} /></View>
        </View>
        <View style={{ gap: 8, padding: 10, borderRadius: 10, backgroundColor: C.primarySoft }}>
          <Text style={{ fontWeight: '700', color: C.text }}>Gợi ý thời gian theo diện tích</Text>
          <Field label="Hệ số (giây cho mỗi cm²)" value={spc} onChangeText={setSpc} keyboardType="decimal-pad" hint="Chờ nhóm phần cứng xác nhận theo mật độ công suất đầu phát. Tài liệu tham khảo dùng 30 đến 45 giây/cm² cho thiết bị khác." />
          {lastArea ? (
            <Text style={{ color: C.text }}>
              Diện tích đo gần nhất {String(lastArea.areaCm2).replace('.', ',')} cm² ({fmtDate(lastArea.captureDate)})
              {suggestion != null ? ` × ${spc} giây = ${fmtDuration(suggestion)}.` : '.'}
            </Text>
          ) : <Muted>Chưa có diện tích đã đo cho vết thương này.</Muted>}
          {suggestion != null && <Button label={`Dùng gợi ý ${fmtDuration(suggestion)}`} icon="calculator-outline" variant="secondary" onPress={() => setDuration(String(suggestion))} />}
          <Muted>Chỉ là gợi ý. Bác sĩ quyết định thời gian cuối cùng.</Muted>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Số lần mỗi buổi" value={perVisit} onChangeText={setPerVisit} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Giãn cách (phút)" value={gap} onChangeText={setGap} keyboardType="number-pad" hint="Chỉ khi nhiều lần mỗi buổi." /></View>
        </View>
        <Field label="Mốc xem lại hiệu quả (ngày thứ)" value={reviewDay} onChangeText={setReviewDay} keyboardType="number-pad" hint="So diện tích với đầu đợt; mặc định ngày 28 (Sheehan 2003)." />
          </>
        )}
        {step === 2 && (
          <>
            <Text style={{ fontWeight: '700', color: C.text }}>Tóm tắt</Text>
            <Muted>{phases.map((ph, i) => `Giai đoạn ${i + 1}: ${phaseLabel({ from: '', to: '', pattern: ph.pattern, n: Number(ph.n) || 1 }).toLowerCase()} (${ph.from || '?'} đến ${ph.to || '?'})`).join('; ')}. Mức {level || '?'}, {duration ? fmtDuration(numOrNull(duration)) : '? giây'}, {perVisit || 1} lần mỗi buổi.</Muted>
            <Choices<PlanStatus> value={status} onChange={setStatus} options={(['draft', 'active', 'paused', 'ended'] as const).map((v) => ({ value: v, label: PLAN_STATUS[v].label }))} />
        <Field label="Lịch tái khám" value={review} onChangeText={setReview} placeholder="Ví dụ: tái đánh giá mỗi 7 ngày" />
        <Field label="Ghi chú" value={notes} onChangeText={setNotes} multiline />
        <Field label="Lý do thay đổi" value={reason} onChangeText={setReason} placeholder="Bắt buộc" />
        <SwitchRow label="Bác sĩ xác nhận đợt điều trị" detail="Bệnh nhân sẽ xem được đợt này" value={confirmed} onChange={setConfirmed} />
            <Button label="Lưu phiên bản mới" icon="save-outline" onPress={save} />
          </>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 && <View style={{ flex: 1 }}><Button label="Quay lại" variant="ghost" onPress={() => setStep(step - 1)} /></View>}
          {step < 2 && <View style={{ flex: 1 }}><Button label="Tiếp" icon="arrow-forward" variant="secondary" onPress={() => setStep(step + 1)} /></View>}
        </View>
      </Card>

      <SectionTitle icon="git-branch-outline">Các phiên bản</SectionTitle>
      {plans.length === 0 && <Muted>Chưa có phiên bản nào.</Muted>}
      {plans.map((pl) => (
        <PlanCard key={pl.id} plan={pl} editorName={account(pl.editedBy)?.name} />
      ))}
    </Screen>
  );
}
