import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { DoseRows, PhaseList } from '@/components/CourseCard';
import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { CheckRow } from '@/components/Consent';
import { PLAN } from '@/theme.status';
import { Button, Card, Chip, Choices, Disclosure, Field, Header, InfoRow, Muted, Notice, Screen, SectionTitle, StepRow, TextLink, StatusChip } from '@/components/ui';
import { capabilitiesFor, modeLabel } from '@/lib/device/capabilities';
import { DEFAULT_REVIEW_DAY, fmtDuration, phaseLabel, phasesOf, suggestDurationSec } from '@/lib/course';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, maskDateInput, PLAN_STATUS } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import type { CoursePhase, PhasePattern, PlanStatus, TreatmentPlan } from '@/lib/types';
import { C, T } from '@/theme';

// Điều xảy ra khi lưu với từng trạng thái; nội dung theo quy tắc lưu hiện có (đợt "Đang áp dụng" cần mức, thời gian và xác nhận).
const STATUS_EFFECT: Record<PlanStatus, string> = {
  draft: 'Nháp: bệnh nhân không thấy và chưa nạp được.',
  active: 'Đang áp dụng: cần mức năng lượng, thời gian điều trị và xác nhận của bác sĩ; sau khi lưu, bệnh nhân nạp được xuống máy.',
  paused: 'Tạm dừng: bệnh nhân không nạp được cho tới khi đợt được áp dụng lại.',
  ended: 'Kết thúc: bệnh nhân không nạp được đợt này nữa.',
};

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
        <StatusChip status={PLAN[plan.status]} label={PLAN_STATUS[plan.status].label} />
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

/** Một dòng của bảng kiểm tra (R-02): giá trị phiên bản đang so sánh và giá trị sắp lưu. Chỉ hiển thị, không tạo giá trị thiếu. */
interface ReviewRow { label: string; before?: string; after: string; step: 0 | 1 }
// Khoảng ngày gọn cho bảng: bỏ năm ở ngày đầu khi cùng năm với ngày cuối.
const range = (from: string, to: string) => (from.slice(6) === to.slice(6) && from.length === 10 ? `${from.slice(0, 5)}–${to}` : `${from || '?'}–${to || '?'}`);
const phaseText = (p: CoursePhase) => `${phaseLabel(p)}, ${range(fmtDate(p.from), fmtDate(p.to))}`;

function ReviewTable({ rows, baseTitle }: { rows: ReviewRow[]; baseTitle?: string }) {
  const cell = { flex: 1, paddingVertical: 8, paddingHorizontal: 6 } as const;
  const head = { fontSize: T.small, fontWeight: '700' as const, color: C.textSoft };
  return (
    <View style={{ borderTopWidth: 1, borderColor: C.border }}>
      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border }}>
        <View style={cell}><Text style={head}>Thông số</Text></View>
        {baseTitle ? <View style={cell}><Text style={head}>{baseTitle}</Text></View> : null}
        <View style={cell}><Text style={head}>Phiên bản mới</Text></View>
      </View>
      {rows.map((r) => {
        const changed = baseTitle !== undefined && r.before !== r.after;
        return (
          <View key={r.label} accessible accessibilityLabel={`${r.label}: ${baseTitle ? `hiện tại ${r.before}, ` : ''}mới ${r.after}${changed ? ', đã thay đổi' : ''}`} style={{ flexDirection: 'row', borderBottomWidth: 1, borderColor: C.border }}>
            <View style={cell}><Text style={{ color: C.textSoft }}>{r.label}</Text></View>
            {baseTitle ? <View style={cell}><Text style={{ color: C.text }}>{r.before}</Text></View> : null}
            <View style={[cell, changed ? { backgroundColor: C.amberSoft } : null]}><Text style={{ color: C.text, fontWeight: changed ? '700' : '400' }}>{r.after}</Text></View>
          </View>
        );
      })}
    </View>
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
  const { patient, account, woundsOf, imagesOf, device } = useLookups();
  const p = patient(patientId);
  // Mức và chế độ chọn trong năng lực của mẫu thiết bị gán cho người bệnh; ứng dụng không tự đặt giá trị.
  const caps = capabilitiesFor(device(p?.deviceId)?.model);
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
  const [level, setLevel] = useState(
    latest?.doseLevel != null && (!caps || caps.energyLevels.includes(latest.doseLevel)) ? latest.doseLevel.toString() : '',
  );
  const [mode, setMode] = useState(latest?.treatmentMode && caps?.treatmentModes.some((m) => m.value === latest.treatmentMode) ? latest.treatmentMode : '');
  const [duration, setDuration] = useState(latest?.durationSec?.toString() ?? '');
  const [spc, setSpc] = useState(latest?.secondsPerCm2?.toString() ?? '');
  const [reviewDay, setReviewDay] = useState(String(latest?.reviewAtDay ?? DEFAULT_REVIEW_DAY));
  const [review, setReview] = useState(latest?.reviewSchedule ?? '');
  const [notes, setNotes] = useState(latest?.notes ?? '');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  // UX-02 (Đợt 8): dấu xác nhận chỉ ứng với bộ lịch và liều lúc bác sĩ tích. Đổi một trường của bước Lịch hoặc Liều,
  // hoặc lưu xong, thì dấu xác nhận trở về trống. Quy tắc lưu (đợt "Đang áp dụng" cần xác nhận) giữ nguyên.
  const [clearedByEdit, setClearedByEdit] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  // P0 SV-05, ID-05: biểu mẫu khác giá trị lúc mở (hoặc lúc vừa lưu) thì rời màn hay đổi vết thương phải hỏi trước.
  const snapshot = JSON.stringify({ status, phases, perVisit, gap, level, mode, duration, spc, reviewDay, review, notes, reason, confirmed });
  const [initial, setInitial] = useState(snapshot);
  const dirty = snapshot !== initial;
  useDiscardGuard(dirty);
  // CR-01: lưu chờ ghi bộ nhớ xong; chặn bấm lặp trong lúc chờ để không tạo hai phiên bản.
  const saving = useRef(false);

  if (!p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  if (me?.role === 'patient') {
    // Bệnh nhân chỉ xem đợt đã được bác sĩ xác nhận.
    const visible = data.plans.filter((x) => x.patientId === p.id && x.confirmed && x.status !== 'draft').sort((a, b) => b.version - a.version);
    // UX-20 (Đợt 11): mỗi vết thương một thẻ, mỗi thẻ là phiên bản mới nhất bệnh nhân được xem của vết đó (trước đây chỉ một thẻ cho mọi vết).
    const perWound = wounds
      .map((w) => ({ w, plan: visible.find((x) => (x.woundId ?? first) === w.id) }))
      .filter((x): x is { w: (typeof wounds)[number]; plan: TreatmentPlan } => !!x.plan);
    return (
      <Screen header={<Header back title="Đợt điều trị của tôi" />}>
        {perWound.length === 0 ? <Card><Muted>Chưa có đợt điều trị được bác sĩ xác nhận.</Muted></Card> : perWound.map(({ w, plan }) => (
          <View key={w.id} style={{ gap: 8 }}>
            {perWound.length > 1 && <SectionTitle icon="bandage-outline">{`${w.code}: ${w.location}`}</SectionTitle>}
            <PlanCard plan={plan} editorName={account(plan.editedBy)?.name} />
          </View>
        ))}
        <Muted>Thiết bị đã được khóa theo mức năng lượng và thời gian bác sĩ đặt. Bạn không cần chỉnh gì trên thiết bị.</Muted>
      </Screen>
    );
  }

  const suggestion = suggestDurationSec(lastArea?.areaCm2, numOrNull(spc));
  // R-02 (Đợt 10): so với phiên bản đang áp dụng; chưa có thì so với phiên bản gần nhất; lần lập đầu chỉ một cột.
  const base = plans.find((x) => x.status === 'active') ?? latest;
  const baseTitle = base ? (base.status === 'active' ? `Đang áp dụng (v${base.version})` : `Phiên bản ${base.version} (${PLAN_STATUS[base.status].label})`) : undefined;
  // Số phiên bản sắp tạo, cùng cách đánh số của savePlan (theo từng vết thương).
  const nextVersion = data.plans.filter((x) => x.patientId === patientId && (x.woundId ?? null) === (woundId ?? null)).reduce((m, x) => Math.max(m, x.version), 0) + 1;
  const dash = (v: string | null | undefined) => (v == null || v === '' ? '—' : v);
  const durText = (v: number | null | undefined) => (v == null ? '—' : fmtDuration(v));
  const draftPhase = (ph: PhaseDraft) => `${phaseLabel({ from: '', to: '', pattern: ph.pattern, n: Number(ph.n) || 1 })}, ${range(ph.from, ph.to)}`;
  const showMode = (caps?.treatmentModes.length ?? 0) > 0 || !!mode || !!base?.treatmentMode;
  const showGap = gap.trim() !== '' || base?.minIntervalMin != null;
  const reviewRows: ReviewRow[] = [
    { label: 'Lịch', before: base ? phasesOf(base).map(phaseText).join('\n') : undefined, after: phases.map(draftPhase).join('\n'), step: 0 },
    { label: 'Mức năng lượng', before: base ? dash(base.doseLevel?.toString()) : undefined, after: dash(level), step: 1 },
    ...(showMode ? [{ label: 'Chế độ', before: base ? dash(base.treatmentMode ? modeLabel(base.treatmentMode) : null) : undefined, after: dash(mode ? modeLabel(mode) : null), step: 1 as const }] : []),
    { label: 'Thời gian mỗi lần', before: base ? durText(base.durationSec) : undefined, after: durText(numOrNull(duration)), step: 1 },
    { label: 'Số lần mỗi buổi', before: base ? String(base.sessionsPerDay ?? 1) : undefined, after: dash(perVisit), step: 1 },
    ...(showGap ? [{ label: 'Giãn cách', before: base ? dash(base.minIntervalMin != null ? `${base.minIntervalMin} phút` : null) : undefined, after: dash(gap.trim() ? `${gap.trim()} phút` : null), step: 1 as const }] : []),
    { label: 'Mốc xem lại', before: base ? `Ngày thứ ${base.reviewAtDay ?? DEFAULT_REVIEW_DAY}` : undefined, after: reviewDay.trim() ? `Ngày thứ ${reviewDay.trim()}` : '—', step: 1 },
  ];
  const changedCount = base ? reviewRows.filter((r) => r.before !== r.after).length : 0;
  const w = wounds.find((x) => x.id === woundId);
  // P0 SV-06: cùng quy tắc với savePlan: lưu "Đang áp dụng" thì mọi phiên bản đang áp dụng hoặc tạm dừng của vết này chuyển Kết thúc.
  const willEnd = status === 'active'
    ? data.plans.filter((x) => x.patientId === patientId && (x.woundId ?? null) === (woundId ?? null) && (x.status === 'active' || x.status === 'paused')).sort((a, b) => a.version - b.version)
    : [];
  const changeWound = (v: string) => {
    if (v === woundId) return;
    if (!dirty) { setWoundId(v); return; }
    confirm('Đổi vết thương?', `Dữ liệu đang nhập cho ${w?.code ?? 'vết thương này'} chưa lưu sẽ bị bỏ.`, () => setWoundId(v), 'Bỏ và đổi vết', 'Ở lại');
  };
  /** Bỏ dấu xác nhận khi lịch hoặc liều đổi (UX-02); ghi lại để báo bác sĩ ở bước Xác nhận. */
  const unconfirm = () => {
    if (confirmed) setClearedByEdit(true);
    setConfirmed(false);
  };
  const edit = <T,>(set: (v: T) => void) => (v: T) => { set(v); unconfirm(); };
  const editPhases = (next: PhaseDraft[]) => { setPhases(next); unconfirm(); };
  const setPhase = (i: number, patch: Partial<PhaseDraft>) => editPhases(phases.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const fail = (st: number, msg: string) => { setStep(st); setErr(msg); };
  const STEP_NAME = ['Lịch', 'Liều', 'Xác nhận'];
  const save = async () => {
    if (saving.current) return;
    // P1-03d: cùng các câu kiểm tra như trước, nhưng gom hết lỗi; đưa về bước có lỗi đầu tiên và nêu mọi lỗi của bước đó,
    // kèm số lỗi còn ở bước khác. Mỗi giai đoạn vẫn chỉ báo lỗi đầu tiên của giai đoạn đó (thứ tự kiểm tra giữ nguyên).
    const errs: { st: 0 | 1 | 2; msg: string }[] = [];
    const parsed: CoursePhase[] = [];
    let prevTo: string | null = null;
    for (const [i, ph] of phases.entries()) {
      const from = fromVn(ph.from);
      const to = fromVn(ph.to);
      const n = ph.pattern === 'daily' ? 1 : Number(ph.n);
      const e = !from || !to ? `Giai đoạn ${i + 1}: ngày theo dạng dd/mm/yyyy.`
        : to < from ? `Giai đoạn ${i + 1}: ngày kết thúc phải sau ngày bắt đầu.`
        // Giai đoạn trước có lỗi thì không so thứ tự với nó (trước đây đã dừng ở lỗi đầu tiên).
        : i > 0 && prevTo !== null && from <= prevTo ? `Giai đoạn ${i + 1} phải bắt đầu sau giai đoạn ${i}.`
        : !Number.isInteger(n) || n < 1 || (ph.pattern === 'n_per_week' && n > 7) ? `Giai đoạn ${i + 1}: N phải là số nguyên${ph.pattern === 'n_per_week' ? ' từ 1 đến 7' : ' từ 1'}.`
        : null;
      if (e) { errs.push({ st: 0, msg: e }); prevTo = null; continue; }
      prevTo = to;
      parsed.push({ from: from!, to: to!, pattern: ph.pattern, n });
    }
    const nums = [perVisit, gap, level, duration, spc, reviewDay].map(numOrNull);
    if (nums.some((n) => n !== null && (!Number.isFinite(n) || n < 0))) errs.push({ st: 1, msg: 'Thông số phải là số không âm.' });
    if (status === 'active' && (nums[2] === null || nums[3] === null)) errs.push({ st: 1, msg: 'Đợt "Đang áp dụng" cần mức năng lượng và thời gian điều trị để khóa trên thiết bị.' });
    if (caps && nums[2] !== null && !caps.energyLevels.includes(nums[2])) errs.push({ st: 1, msg: 'Mức năng lượng phải thuộc danh sách của mẫu thiết bị.' });
    if (caps && status === 'active' && caps.treatmentModes.length > 0 && !mode) errs.push({ st: 1, msg: 'Đợt "Đang áp dụng" cần chọn chế độ điều trị.' });
    if (!reason.trim()) errs.push({ st: 2, msg: 'Nhập lý do thay đổi để lưu vết phiên bản.' });
    if (status === 'active' && !confirmed) errs.push({ st: 2, msg: 'Đợt "Đang áp dụng" cần bác sĩ xác nhận.' });
    if (errs.length) {
      const st = errs[0].st;
      const here = errs.filter((e) => e.st === st).map((e) => e.msg);
      const other = ([0, 1, 2] as const).filter((k) => k !== st).map((k) => ({ k, n: errs.filter((e) => e.st === k).length })).filter((x) => x.n > 0);
      return fail(st, [...here, ...other.map((x) => `Bước ${STEP_NAME[x.k]} còn ${x.n} lỗi.`)].join('\n'));
    }
    setErr(null);
    saving.current = true;
    try {
    await savePlan({
      patientId: p.id, woundId, status, phases: parsed, sessionsPerDay: nums[0] ?? 1, minIntervalMin: nums[1], targetEnergyWh: null,
      doseLevel: nums[2], treatmentMode: caps && mode ? mode : null, durationSec: nums[3], secondsPerCm2: nums[4], areaAtStart: lastArea?.areaCm2 ?? null, reviewAtDay: nums[5] ?? DEFAULT_REVIEW_DAY,
      startDate: parsed[0].from, endDate: parsed[parsed.length - 1].to, reviewSchedule: review.trim(), notes: notes.trim(), reason: reason.trim(), confirmed,
    });
    } catch (e) {
      // Lưu thất bại: giữ nguyên dữ liệu đã nhập và dấu xác nhận để bác sĩ thử lại.
      return fail(2, `Chưa lưu được phiên bản: ${e instanceof Error ? e.message : 'lỗi không xác định'}. Dữ liệu vẫn còn, hãy thử lại.`);
    } finally {
      saving.current = false;
    }
    setReason('');
    setConfirmed(false);
    setClearedByEdit(false);
    setInitial(JSON.stringify({ status, phases, perVisit, gap, level, mode, duration, spc, reviewDay, review, notes, reason: '', confirmed: false }));
    notify('Đã lưu phiên bản mới', 'Bệnh nhân nạp mức, chế độ và thời gian xuống máy qua cáp USB ở màn Thiết bị (bản demo: thiết bị giả lập).');
  };

  return (
    <Screen header={<Header back title="Đợt điều trị" />}>
      {/* P0 G1: bệnh nhân và vết thương của đợt đang lập. */}
      <ClinicalContext patient={p} wound={w ?? null} />
      {wounds.length > 1 && (
        <Card>
          <SectionTitle icon="bandage-outline">Vết thương</SectionTitle>
          <Choices<string> value={woundId} onChange={changeWound} options={wounds.map((w) => ({ value: w.id, label: `${w.code} · ${w.location}` }))} />
        </Card>
      )}
      <Card>
        <SectionTitle icon="flash-outline">Thiết lập phiên bản mới</SectionTitle>
        <Muted>Mỗi vết thương một đợt. Giá trị điều trị cụ thể do nhóm chuyên môn đặt; ứng dụng không đặt sẵn lịch hay liều.</Muted>

        {/* Biểu mẫu chia 3 bước (đề xuất 8): Lịch, Liều, Xác nhận. Lỗi đưa người dùng về đúng bước. */}
        {/* Cùng kiểu thanh bước với T01 (V10); vẫn chạm được để chuyển bước như trước. */}
        <StepRow steps={['Lịch', 'Liều', 'Xác nhận']} step={step + 1} onStep={(n) => setStep(n - 1)} />
        {/* P1-03d: mỗi lỗi một dòng riêng. */}
        {err ? err.split('\n').map((line) => <Text key={line} accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{line}</Text>) : null}
        {step === 0 && (
          <>
        <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Lịch theo giai đoạn</Text>
        <Muted>Ví dụ: mỗi ngày trong 2 tuần đầu, sau đó 3 buổi mỗi tuần.</Muted>
        {phases.map((ph, i) => (
          <View key={i} style={{ gap: 8, padding: 10, borderRadius: 10, backgroundColor: C.surfaceMuted }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontWeight: '700', color: C.text }}>Giai đoạn {i + 1}</Text>
              {phases.length > 1 && <TextLink label="Xóa" tone={C.red} accessibilityLabel={`Xóa giai đoạn ${i + 1}`} onPress={() => editPhases(phases.filter((_, k) => k !== i))} />}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Từ ngày" value={ph.from} onChangeText={(v) => setPhase(i, { from: maskDateInput(v) })} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/yyyy" /></View>
              <View style={{ flex: 1 }}><Field label="Đến ngày" value={ph.to} onChangeText={(v) => setPhase(i, { to: maskDateInput(v) })} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/yyyy" /></View>
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
            onPress={() => editPhases([...phases, { from: '', to: '', pattern: 'n_per_week', n: '3' }])}
          />
        )}

          </>
        )}
        {step === 1 && (
          <>
        {/* R-02, UX-14 (Đợt 10): nhóm liều khóa trên máy lên đầu; công cụ gợi ý thời gian vào mục thu gọn. Trường và quy tắc giữ nguyên. */}
        <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Liều khóa trên máy</Text>
        <Muted>Thiết bị tại nhà bị khóa ở mức và thời gian này; bệnh nhân không đổi được.</Muted>
        {caps ? (
          <>
            <Text style={{ fontWeight: '700', color: C.text }}>Mức năng lượng</Text>
            <Choices<string> value={level} onChange={edit(setLevel)} options={caps.energyLevels.map((e) => ({ value: String(e), label: String(e) }))} />
            {caps.treatmentModes.length > 0 && (
              <>
                <Text style={{ fontWeight: '700', color: C.text }}>Chế độ điều trị</Text>
                <Choices<string> value={mode} onChange={edit(setMode)} options={caps.treatmentModes} />
              </>
            )}
            {!caps.confirmed && <Muted>Danh sách mức và chế độ chưa được firmware xác nhận.</Muted>}
          </>
        ) : (
          <>
            <Field label="Mức năng lượng" value={level} onChangeText={edit(setLevel)} keyboardType="number-pad" hint="Ví dụ: 8" />
            <Muted>Chưa có danh sách mức và chế độ cho mẫu thiết bị này.</Muted>
          </>
        )}
        <Field label="Thời gian mỗi lần điều trị (giây)" value={duration} onChangeText={edit(setDuration)} keyboardType="number-pad" hint={numOrNull(duration) != null ? fmtDuration(numOrNull(duration)) : undefined} />
        <Disclosure title="Công cụ gợi ý thời gian" summary="Theo diện tích đo gần nhất · không bắt buộc">
        <View style={{ gap: 8, padding: 10, borderRadius: 10, backgroundColor: C.primarySoft }}>
          <Text style={{ fontWeight: '700', color: C.text }}>Gợi ý thời gian theo diện tích</Text>
          <Field label="Hệ số (giây cho mỗi cm²)" value={spc} onChangeText={setSpc} keyboardType="decimal-pad" hint="Chờ nhóm phần cứng xác nhận theo mật độ công suất đầu phát. Tài liệu tham khảo dùng 30 đến 45 giây/cm² cho thiết bị khác." />
          {lastArea ? (
            <Text style={{ color: C.text }}>
              Diện tích đo gần nhất {String(lastArea.areaCm2).replace('.', ',')} cm² ({fmtDate(lastArea.captureDate)})
              {suggestion != null ? ` × ${spc} giây = ${fmtDuration(suggestion)}.` : '.'}
            </Text>
          ) : <Muted>Chưa có diện tích đã đo cho vết thương này.</Muted>}
          {suggestion != null && <Button label={`Dùng gợi ý ${fmtDuration(suggestion)}`} icon="calculator-outline" variant="secondary" onPress={() => edit(setDuration)(String(suggestion))} />}
          <Muted>Chỉ là gợi ý. Bác sĩ quyết định thời gian cuối cùng.</Muted>
        </View>
        </Disclosure>
        <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Số lần và mốc xem lại</Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Số lần mỗi buổi" value={perVisit} onChangeText={edit(setPerVisit)} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Giãn cách (phút)" value={gap} onChangeText={edit(setGap)} keyboardType="number-pad" hint="Chỉ khi nhiều lần mỗi buổi." /></View>
        </View>
        <Field label="Mốc xem lại hiệu quả (ngày thứ)" value={reviewDay} onChangeText={edit(setReviewDay)} keyboardType="number-pad" hint="So diện tích với đầu đợt; mặc định ngày 28 (Sheehan 2003)." />
          </>
        )}
        {step === 2 && (
          <>
            {/* R-02, UX-10 (Đợt 10): màn kiểm tra trước khi lưu. Bảng so với phiên bản đang áp dụng, trường đổi tô vàng; sửa thì quay về đúng bước. */}
            <Text style={{ fontWeight: '700', color: C.text, fontSize: T.cardTitle }}>Kiểm tra lịch và liều trước khi lưu</Text>
            {/* P0 ID-05: nêu vết thương của phiên bản sắp lưu ngay đầu bảng kiểm tra. */}
            <InfoRow label="Vết thương" value={w ? `${w.code} · ${w.location}` : 'Chưa chọn'} />
            <ReviewTable rows={reviewRows} baseTitle={baseTitle} />
            <Muted>{!base ? 'Lần lập đầu cho vết thương này.' : changedCount ? `${changedCount} thay đổi được tô vàng.` : 'Không có thay đổi lịch hoặc liều so với phiên bản đang so sánh.'}</Muted>
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              <TextLink label="Sửa lịch" accessibilityLabel="Sửa lịch, quay về bước Lịch" onPress={() => setStep(0)} />
              <TextLink label="Sửa liều" accessibilityLabel="Sửa liều, quay về bước Liều" onPress={() => setStep(1)} />
            </View>
            <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Trạng thái sau khi lưu</Text>
            <Choices<PlanStatus> value={status} onChange={setStatus} options={(['draft', 'active', 'paused', 'ended'] as const).map((v) => ({ value: v, label: PLAN_STATUS[v].label }))} />
        <Disclosure title="Lịch tái khám, ghi chú" summary={review.trim() || notes.trim() ? 'Đã nhập' : 'Không bắt buộc'}>
          <Field label="Lịch tái khám" value={review} onChangeText={setReview} placeholder="Ví dụ: tái đánh giá mỗi 7 ngày" />
          <Field label="Ghi chú" value={notes} onChangeText={setNotes} multiline />
        </Disclosure>
        <Field label="Lý do thay đổi" value={reason} onChangeText={setReason} placeholder="Ví dụ: vết thương cải thiện, giảm còn 3 buổi mỗi tuần" />
        {clearedByEdit && !confirmed && (
          <Notice icon="alert-circle-outline">Dấu xác nhận đã được bỏ vì lịch hoặc liều vừa thay đổi. Kiểm tra lại tóm tắt ở trên rồi tích lại.</Notice>
        )}
        <CheckRow checked={confirmed} onChange={(v) => { setConfirmed(v); if (v) setClearedByEdit(false); }} label="Tôi xác nhận liều và lịch này. Bệnh nhân sẽ xem được đợt và nạp liệu trình xuống máy." />
            {/* Hậu quả của trạng thái đang chọn (V12), đặt sát nút Lưu. */}
            {willEnd.length > 0 && (
              <Notice icon="git-branch-outline">{`${willEnd.map((x) => `Phiên bản ${x.version} (${PLAN_STATUS[x.status].label})`).join(', ')} sẽ chuyển sang Kết thúc khi lưu. Các phiên bản cũ vẫn giữ trong danh sách bên dưới.`}</Notice>
            )}
            <Notice tone="blue" icon="information-circle-outline">{STATUS_EFFECT[status]}</Notice>
            <Button label={`Lưu phiên bản ${nextVersion}${w ? ` cho ${w.code}` : ''}`} icon="save-outline" onPress={save} />
          </>
        )}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 && <View style={{ flex: 1 }}><Button label="Quay lại" variant="ghost" onPress={() => setStep(step - 1)} /></View>}
          {step < 2 && <View style={{ flex: 1 }}><Button label="Tiếp" icon="arrow-forward" onPress={() => setStep(step + 1)} /></View>}
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
