import { useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { DoseRows, PhaseList } from '@/components/CourseCard';
import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { PlanAckCard } from '@/components/PlanAckCard';
import { needsPatientAck, openProtocolId, planPhotoCandidates } from '@/lib/planVersion';
import { PlanEligibility, SessionHistoryCard } from '@/components/PlanManage';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { CheckRow } from '@/components/Consent';
import { PLAN } from '@/theme.status';
import { Button, Card, Chip, Choices, Disclosure, Divider, Field, Header, InfoRow, Muted, Notice, Screen, SectionTitle, StepRow, TextLink, StatusChip } from '@/components/ui';
import { CAPABILITIES, SIM_MODEL, capabilitiesFor, modeLabel } from '@/lib/device/capabilities';
import { addDays, dayDiff, DEFAULT_REVIEW_DAY, fmtDuration, localDay, phaseLabel, phasesOf, suggestDurationSec } from '@/lib/course';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, maskDateInput, PLAN_STATUS } from '@/lib/format';
import { protocolsOfWound } from '@/lib/planLifecycle';
import { useLookups, useStore } from '@/lib/store';
import type { CoursePhase, PhasePattern, PlanStatus, TreatmentPlan } from '@/lib/types';
import { C, T } from '@/theme';

// Điều xảy ra khi lưu với từng trạng thái; nội dung theo quy tắc lưu hiện có (đợt "Đang áp dụng" cần mức, thời gian và xác nhận).
const STATUS_EFFECT: Record<PlanStatus, string> = {
  draft: 'Nháp: bệnh nhân không thấy và chưa nạp được.',
  scheduled: 'Chờ áp dụng: phiên bản cũ còn hiệu lực tới ngày bắt đầu áp dụng.',
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

function PlanDetails({ plan, editorName }: { plan: TreatmentPlan; editorName?: string }) {
  return (
    <>
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
    </>
  );
}

/**
 * Stage 9A (bố cục riêng N06): thứ tự theo điều bệnh nhân cần biết: liều máy đã khóa (kèm câu "không cần
 * chỉnh gì trên thiết bị" ngay cạnh, trước đây ở cuối màn), lịch theo giai đoạn có đánh dấu giai đoạn hiện tại, các mốc xem lại,
 * ghi chú của bác sĩ. Người sửa, lý do sửa (thông tin quản lý phiên bản) thu vào một mục. Cùng dữ liệu như thẻ cũ.
 */
function PatientPlanCard({ plan, editorName }: { plan: TreatmentPlan; editorName?: string }) {
  const today = localDay();
  const current = phasesOf(plan).findIndex((ph) => ph.from <= today && today <= ph.to);
  return (
    <Card hero style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontWeight: '700', color: C.text, flex: 1 }}>Phiên bản {plan.version}</Text>
        <StatusChip status={PLAN[plan.status]} label={PLAN_STATUS[plan.status].label} />
      </View>
      <Text accessibilityRole="header" style={{ color: C.textSoft, fontSize: T.small, fontWeight: '700' }}>LIỀU TRÊN MÁY</Text>
      <View><DoseRows plan={plan} />{plan.minIntervalMin != null && <InfoRow label="Giãn cách giữa hai lần" value={`${plan.minIntervalMin} phút`} />}</View>
      <Notice tone="blue" icon="lock-closed-outline">Thiết bị đã được khóa theo mức năng lượng và thời gian bác sĩ đặt. Bạn không cần chỉnh gì trên thiết bị.</Notice>
      <Divider />
      <Text accessibilityRole="header" style={{ color: C.textSoft, fontSize: T.small, fontWeight: '700' }}>LỊCH THEO GIAI ĐOẠN</Text>
      <PhaseList plan={plan} current={current >= 0 ? current : undefined} />
      <Divider />
      <Text accessibilityRole="header" style={{ color: C.textSoft, fontSize: T.small, fontWeight: '700' }}>MỐC XEM LẠI</Text>
      <View>
        <InfoRow label="Ngày dự kiến xem lại đợt" value={fmtDate(plan.endDate)} />
        <InfoRow label="Mốc xem lại hiệu quả" value={`Ngày thứ ${plan.reviewAtDay ?? DEFAULT_REVIEW_DAY}`} />
        {plan.endReason && <InfoRow label="Lý do kết thúc" value={END_REASON[plan.endReason]} />}
        <InfoRow label="Lịch tái khám" value={plan.reviewSchedule || '—'} />
      </View>
      {plan.notes ? <View style={{ gap: 4 }}>
        <Text style={{ color: C.textSoft, fontSize: T.small, fontWeight: '700' }}>GHI CHÚ CỦA BÁC SĨ</Text>
        <Text style={{ color: C.text }}>{plan.notes}</Text>
      </View> : null}
      <Disclosure title="Thông tin phiên bản" summary={plan.confirmed ? 'Bác sĩ đã xác nhận' : 'Chưa xác nhận'}>
        <Muted>Sửa bởi {editorName ?? '—'} lúc {fmtDateTime(plan.editedAt)} · Lý do: {plan.reason || '—'}</Muted>
        <View style={{ flexDirection: 'row' }}><Chip label={plan.confirmed ? 'Bác sĩ đã xác nhận' : 'Chưa xác nhận'} tone={plan.confirmed ? 'green' : 'gray'} /></View>
      </Disclosure>
    </Card>
  );
}

/**
 * Stage 9A (bố cục riêng B06): tóm tắt phiên bản đang so sánh (đang áp dụng, hoặc gần nhất) đặt trên biểu mẫu,
 * để bác sĩ thấy lịch và liều hiện hành trước khi lập phiên bản mới. Chỉ hiển thị giá trị đã lưu, không suy ra giá trị thiếu.
 */
function CurrentPlanSummary({ plan }: { plan: TreatmentPlan }) {
  const dose = [
    plan.doseLevel != null ? `Mức ${plan.doseLevel}` : 'Chưa đặt mức',
    plan.treatmentMode ? modeLabel(plan.treatmentMode) : null,
    plan.durationSec != null ? `${fmtDuration(plan.durationSec)} mỗi lần` : 'chưa đặt thời gian',
    `${plan.sessionsPerDay ?? 1} lần mỗi buổi`,
  ].filter(Boolean).join(' · ');
  return (
    <Card hero style={{ gap: 8 }} testID="b06-dang-ap-dung">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text accessibilityRole="header" style={{ flex: 1, fontWeight: '700', color: C.text, fontSize: T.titleM }}>Phiên bản {plan.version}</Text>
        <StatusChip status={PLAN[plan.status]} label={PLAN_STATUS[plan.status].label} />
      </View>
      {phasesOf(plan).map((ph, i) => (
        <Text key={i} style={{ color: C.textBody }}>{`${i + 1}. ${phaseLabel(ph)}, ${fmtDate(ph.from)} đến ${fmtDate(ph.to)}`}</Text>
      ))}
      <Text style={{ color: C.text, fontWeight: '600' }}>{dose}</Text>
      <Text style={{ color: C.textSoft, fontSize: T.small }}>{`Xem lại hiệu quả ngày thứ ${plan.reviewAtDay ?? DEFAULT_REVIEW_DAY} · ${plan.confirmed ? 'Bác sĩ đã xác nhận' : 'Chưa xác nhận'}`}</Text>
    </Card>
  );
}

/** Một dòng của bảng kiểm tra (R-02): giá trị phiên bản đang so sánh và giá trị sắp lưu. Chỉ hiển thị, không tạo giá trị thiếu. */
interface ReviewRow { label: string; before?: string; after: string; step: number }
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
  return <PlanBody key={woundId} patientId={patientId} woundId={woundId} setWoundId={setWoundId} woundParam={woundParam} />;
}

function PlanBody({ patientId, woundId, setWoundId, woundParam }: { patientId: string; woundId: string; setWoundId: (v: string) => void; woundParam?: string }) {
  const { data, me, savePlan } = useStore();
  const { patient, account, woundsOf, imagesOf, device } = useLookups();
  const p = patient(patientId);
  // Mức và chế độ chọn trong năng lực của mẫu thiết bị gán cho người bệnh; ứng dụng không tự đặt giá trị.
  // Giai đoạn B (AU-01, XN G-b): luôn khóa mức năng lượng theo bảng mức 1..5 của dòng máy, kể cả khi hồ sơ chưa được giao máy
  // hoặc mẫu máy không có trong bảng; không còn ô nhập tự do.
  const caps = capabilitiesFor(device(p?.deviceId)?.model) ?? CAPABILITIES[SIM_MODEL];
  const canView = useCanView(p);
  const wounds = p ? woundsOf(p.id) : [];
  // Giai đoạn B (AU-05): phiên bản cũ đã được gán vết thương khi đọc dữ liệu (migratePlans), không còn suy theo vị trí trong mảng.
  const plans = data.plans.filter((x) => x.patientId === patientId && x.woundId === woundId).sort((a, b) => b.version - a.version);
  const latest = plans[0];
  const lastArea = woundId ? [...imagesOf(woundId)].reverse().find((i) => i.areaCm2 !== null && i.status === 'labeled') : undefined;

  // Logic chốt 25/11/2026 (mục 4.3, P4, M33): biểu mẫu 4 bước, lưu luôn là Đang áp dụng và đã xác nhận (bỏ chọn trạng thái).
  // Phiên bản mới của phác đồ đang mở có ngày bắt đầu áp dụng (M24); tới ngày đó mới thay phiên bản cũ.
  const status: PlanStatus = 'active';
  const isNewAtOpen = !openProtocolId(data.plans, patientId, woundId);
  const todayVn = toVn(localDay());
  const [title, setTitle] = useState(isNewAtOpen ? '' : latest?.title ?? '');
  const [startVn, setStartVn] = useState(isNewAtOpen ? todayVn : toVn(latest?.startDate ?? ''));
  const [endVn, setEndVn] = useState(isNewAtOpen ? (latest ? toVn(addDays(localDay(), dayDiff(latest.startDate, latest.endDate))) : '') : toVn(latest?.endDate ?? ''));
  const [effVn, setEffVn] = useState(todayVn);
  const [tFrom, setTFrom] = useState(latest?.timeWindow?.from ?? '');
  const [tTo, setTTo] = useState(latest?.timeWindow?.to ?? '');
  const [phases, setPhases] = useState<PhaseDraft[]>(
    latest?.phases?.length && !(isNewAtOpen && latest.phases.length > 1) ? latest.phases.map(toDraft) : [{ from: toVn(latest?.startDate ?? ''), to: toVn(latest?.endDate ?? ''), pattern: latest?.phases?.[0]?.pattern ?? 'daily', n: String(latest?.phases?.[0]?.n ?? 1) }],
  );
  const [perVisit, setPerVisit] = useState(latest?.sessionsPerDay?.toString() ?? '1');
  const [gap, setGap] = useState(latest?.minIntervalMin?.toString() ?? '');
  const [level, setLevel] = useState(
    latest?.doseLevel != null && caps.energyLevels.includes(latest.doseLevel) ? latest.doseLevel.toString() : '',
  );
  const [mode, setMode] = useState(latest?.treatmentMode && caps.treatmentModes.some((m) => m.value === latest.treatmentMode) ? latest.treatmentMode : '');
  const [duration, setDuration] = useState(latest?.durationSec?.toString() ?? '');
  const [spc, setSpc] = useState(latest?.secondsPerCm2?.toString() ?? '');
  const [reviewDay, setReviewDay] = useState(String(latest?.reviewAtDay ?? DEFAULT_REVIEW_DAY));
  const [review] = useState(latest?.reviewSchedule ?? '');
  const [notes, setNotes] = useState(latest?.notes ?? '');
  const [reason, setReason] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  // UX-02 (Đợt 8): dấu xác nhận chỉ ứng với bộ lịch và liều lúc bác sĩ tích. Đổi một trường của bước Lịch hoặc Liều,
  // hoặc lưu xong, thì dấu xác nhận trở về trống. Quy tắc lưu (đợt "Đang áp dụng" cần xác nhận) giữ nguyên.
  const [clearedByEdit, setClearedByEdit] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  // Giai đoạn B (CN3 P3): ảnh căn cứ bác sĩ chọn khi lập phác đồ mới; trống thì dùng ảnh đề xuất (mới nhất).
  const [basisPick, setBasisPick] = useState('');
  // P0 SV-05, ID-05: biểu mẫu khác giá trị lúc mở (hoặc lúc vừa lưu) thì rời màn hay đổi vết thương phải hỏi trước.
  const snapshot = JSON.stringify({ title, startVn, endVn, effVn, tFrom, tTo, phases, perVisit, gap, level, mode, duration, spc, reviewDay, review, notes, reason, confirmed });
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
      .map((w) => ({ w, plan: visible.find((x) => x.woundId === w.id) }))
      .filter((x): x is { w: (typeof wounds)[number]; plan: TreatmentPlan } => !!x.plan);
    // Giai đoạn 5 giao diện theo tác vụ: mở từ N03 hoặc N05 kèm woundId thì chỉ hiện đợt của vết đó (vết phải thuộc chính bệnh nhân).
    // Mở không kèm woundId (lối vào cũ) vẫn hiện mọi vết như trước.
    const only = woundParam ? perWound.filter((x) => x.w.id === woundParam) : [];
    const shown = only.length ? only : perWound;
    return (
      <Screen header={<Header back title="Đợt điều trị của tôi" subtitle={only.length ? `${only[0].w.code}: ${only[0].w.location}` : undefined} />}>
        {shown.length === 0 ? <Card><Muted>Chưa có đợt điều trị được bác sĩ xác nhận.</Muted></Card> : shown.map(({ w, plan }) => (
          <View key={w.id} style={{ gap: 8 }}>
            {shown.length > 1 && <SectionTitle icon="bandage-outline">{`${w.code}: ${w.location}`}</SectionTitle>}
            <PatientPlanCard plan={plan} editorName={account(plan.editedBy)?.name} />
            {needsPatientAck(plan) && <Card><PlanAckCard plan={plan} wound={w} showDetailLink={false} /></Card>}
          </View>
        ))}
      </Screen>
    );
  }

  // Giai đoạn B (CN1 H9): bác sĩ khác xem các phiên bản (không gồm nháp), không sửa.
  if (me?.role === 'doctor' && p.doctorId !== me.id) {
    const shown = plans.filter((x) => x.status !== 'draft');
    const w0 = wounds.find((x) => x.id === woundId);
    return (
      <Screen header={<Header back title="Đợt điều trị" subtitle={w0 ? `${w0.code}: ${w0.location}` : undefined} />}>
        <ClinicalContext patient={p} wound={w0 ?? null} />
        <Notice icon="eye-outline" tone="gray">Hồ sơ do bác sĩ khác phụ trách. Chỉ xem các phiên bản đã lưu.</Notice>
        {wounds.length > 1 && <Choices<string> value={woundId} onChange={setWoundId} options={wounds.map((x) => ({ value: x.id, label: x.code }))} />}
        {shown.length === 0 ? <Card><Muted>Chưa có phiên bản nào.</Muted></Card> : shown.map((x) => (
          <Card key={x.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ flex: 1, fontWeight: '700', color: C.text }}>Phiên bản {x.version}</Text>
              <StatusChip status={PLAN[x.status]} label={PLAN_STATUS[x.status].label} />
            </View>
            <PlanDetails plan={x} editorName={account(x.editedBy)?.name} />
          </Card>
        ))}
        {woundId && <SessionHistoryCard woundId={woundId} />}
      </Screen>
    );
  }

  const suggestion = suggestDurationSec(lastArea?.areaCm2, numOrNull(spc));
  // Giai đoạn B (CN3 P2, P7): còn phác đồ mở thì lập phiên bản mới của nó; không còn thì lập phác đồ mới cho đợt khác,
  // cần ảnh căn cứ trong ngày (P1, P3). Nội dung phác đồ (lịch, liều) giữ như cũ (XN-01..05).
  const isNewProtocol = !openProtocolId(data.plans, patientId, woundId);
  const view = woundId ? protocolsOfWound(data.plans, patientId, woundId).find((v) => v.open) : undefined;
  const candidates = isNewProtocol ? planPhotoCandidates(data.images, woundId, localDay()) : [];
  const basisId = candidates.some((c) => c.id === basisPick) ? basisPick : candidates[0]?.id ?? '';
  const blockedNew = isNewProtocol && !candidates.length;
  // R-02 (Đợt 10): so với phiên bản đang áp dụng; chưa có thì so với phiên bản gần nhất; lần lập đầu chỉ một cột.
  const base = plans.find((x) => x.status === 'active') ?? latest;
  const baseTitle = base ? (base.status === 'active' ? `Đang áp dụng (v${base.version})` : `Phiên bản ${base.version} (${PLAN_STATUS[base.status].label})`) : undefined;
  // Số phiên bản sắp tạo, cùng cách đánh số của savePlan (theo từng vết thương).
  const nextVersion = data.plans.filter((x) => x.patientId === patientId && (x.woundId ?? null) === (woundId ?? null)).reduce((m, x) => Math.max(m, x.version), 0) + 1;
  const dash = (v: string | null | undefined) => (v == null || v === '' ? '—' : v);
  const durText = (v: number | null | undefined) => (v == null ? '—' : fmtDuration(v));
  const draftPhase = (ph: PhaseDraft) => `${phaseLabel({ from: '', to: '', pattern: ph.pattern, n: Number(ph.n) || 1 })}, ${range(ph.from, ph.to)}`;
  const showMode = caps.treatmentModes.length > 0 || !!mode || !!base?.treatmentMode;
  const showGap = gap.trim() !== '' || base?.minIntervalMin != null;
  const reviewRows: ReviewRow[] = [
    { label: 'Lịch', before: base ? phasesOf(base).map(phaseText).join('\n') : undefined, after: (phases.length === 1 ? [{ ...phases[0], from: startVn, to: endVn }] : phases).map(draftPhase).join('\n'), step: 2 },
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
  const effIso = isNewProtocol ? fromVn(startVn) : fromVn(effVn);
  const willEnd = effIso !== null && effIso <= localDay()
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
  const STEP_NAME = ['Thông tin', 'Thông số', 'Lịch', 'Xem lại'];
  const save = async () => {
    if (saving.current) return;
    // P1-03d: cùng các câu kiểm tra như trước, nhưng gom hết lỗi; đưa về bước có lỗi đầu tiên và nêu mọi lỗi của bước đó,
    // kèm số lỗi còn ở bước khác. Mỗi giai đoạn vẫn chỉ báo lỗi đầu tiên của giai đoạn đó (thứ tự kiểm tra giữ nguyên).
    const errs: { st: 0 | 1 | 2 | 3; msg: string }[] = [];
    const start = fromVn(startVn);
    const end = fromVn(endVn);
    const eff = isNewProtocol ? start : fromVn(effVn);
    if (!start || !end) errs.push({ st: 0, msg: 'Ngày bắt đầu và ngày kết thúc theo dạng dd/mm/yyyy.' });
    else if (end < start) errs.push({ st: 0, msg: 'Ngày kết thúc phải sau ngày bắt đầu.' });
    if (!isNewProtocol && (!eff || eff < localDay() || (end && eff > end))) errs.push({ st: 0, msg: 'Ngày bắt đầu áp dụng theo dạng dd/mm/yyyy, từ hôm nay đến ngày kết thúc.' });
    if (!isNewProtocol && !reason.trim()) errs.push({ st: 0, msg: 'Nhập lý do đổi thông số để lưu vết phiên bản.' });
    const hhmm = /^([01]\d|2[0-3]):[0-5]\d$/;
    if ((tFrom.trim() || tTo.trim()) && (!hhmm.test(tFrom.trim()) || !hhmm.test(tTo.trim()) || tTo.trim() <= tFrom.trim())) errs.push({ st: 2, msg: 'Khung giờ theo dạng hh:mm, giờ kết thúc sau giờ bắt đầu.' });
    // Một giai đoạn: dùng đúng ngày bắt đầu và kết thúc ở bước 1. Nhiều giai đoạn: giai đoạn đầu và cuối phải khớp hai ngày đó.
    const drafts = phases.length === 1 && start && end ? [{ ...phases[0], from: toVn(start), to: toVn(end) }] : phases;
    const parsed: CoursePhase[] = [];
    let prevTo: string | null = null;
    for (const [i, ph] of drafts.entries()) {
      const from = fromVn(ph.from);
      const to = fromVn(ph.to);
      const n = ph.pattern === 'daily' ? 1 : Number(ph.n);
      const e = !from || !to ? `Giai đoạn ${i + 1}: ngày theo dạng dd/mm/yyyy.`
        : to < from ? `Giai đoạn ${i + 1}: ngày kết thúc phải sau ngày bắt đầu.`
        // Giai đoạn trước có lỗi thì không so thứ tự với nó (trước đây đã dừng ở lỗi đầu tiên).
        : i > 0 && prevTo !== null && from <= prevTo ? `Giai đoạn ${i + 1} phải bắt đầu sau giai đoạn ${i}.`
        : !Number.isInteger(n) || n < 1 || (ph.pattern === 'n_per_week' && n > 7) ? `Giai đoạn ${i + 1}: N phải là số nguyên${ph.pattern === 'n_per_week' ? ' từ 1 đến 7' : ' từ 1'}.`
        : null;
      if (e) { errs.push({ st: 2, msg: e }); prevTo = null; continue; }
      prevTo = to;
      parsed.push({ from: from!, to: to!, pattern: ph.pattern, n });
    }
    if (phases.length > 1 && start && end && parsed.length === phases.length && (parsed[0].from !== start || parsed[parsed.length - 1].to !== end)) {
      errs.push({ st: 2, msg: 'Giai đoạn đầu bắt đầu từ ngày bắt đầu, giai đoạn cuối kết thúc ở ngày kết thúc của phác đồ.' });
    }
    const nums = [perVisit, gap, level, duration, spc, reviewDay].map(numOrNull);
    if (nums.some((n) => n !== null && (!Number.isFinite(n) || n < 0))) errs.push({ st: 1, msg: 'Thông số phải là số không âm.' });
    if (status === 'active' && (nums[2] === null || nums[3] === null)) errs.push({ st: 1, msg: 'Đợt "Đang áp dụng" cần mức năng lượng và thời gian điều trị để khóa trên thiết bị.' });
    if (nums[2] !== null && !caps.energyLevels.includes(nums[2])) errs.push({ st: 1, msg: 'Mức năng lượng phải thuộc danh sách của mẫu thiết bị.' });
    if (status === 'active' && caps.treatmentModes.length > 0 && !mode) errs.push({ st: 1, msg: 'Đợt "Đang áp dụng" cần chọn chế độ điều trị.' });
    if (!confirmed) errs.push({ st: 3, msg: 'Bác sĩ cần xác nhận thông số và lịch trước khi lưu.' });
    if (errs.length) {
      const st = errs[0].st;
      const here = errs.filter((e) => e.st === st).map((e) => e.msg);
      const other = ([0, 1, 2, 3] as const).filter((k) => k !== st).map((k) => ({ k, n: errs.filter((e) => e.st === k).length })).filter((x) => x.n > 0);
      return fail(st, [...here, ...other.map((x) => `Bước ${STEP_NAME[x.k]} còn ${x.n} lỗi.`)].join('\n'));
    }
    setErr(null);
    saving.current = true;
    try {
    await savePlan({
      patientId: p.id, woundId, status, phases: parsed, sessionsPerDay: nums[0] ?? 1, minIntervalMin: nums[1], targetEnergyWh: null,
      doseLevel: nums[2], treatmentMode: mode ? mode : null, durationSec: nums[3], secondsPerCm2: nums[4], areaAtStart: lastArea?.areaCm2 ?? null, reviewAtDay: nums[5] ?? DEFAULT_REVIEW_DAY,
      startDate: start!, endDate: end!, reviewSchedule: review.trim(), notes: notes.trim(), reason: reason.trim() || 'Lập phác đồ mới', confirmed,
      title: title.trim() || undefined, timeWindow: tFrom.trim() && tTo.trim() ? { from: tFrom.trim(), to: tTo.trim() } : undefined,
      ...(isNewProtocol ? {} : { effectiveFrom: eff! }),
      ...(isNewProtocol ? { basisImageId: basisId } : {}),
    });
    } catch (e) {
      // Lưu thất bại: giữ nguyên dữ liệu đã nhập và dấu xác nhận để bác sĩ thử lại.
      return fail(3, `Chưa lưu được phiên bản: ${e instanceof Error ? e.message : 'lỗi không xác định'}. Dữ liệu vẫn còn, hãy thử lại.`);
    } finally {
      saving.current = false;
    }
    setReason('');
    setConfirmed(false);
    setClearedByEdit(false);
    setInitial(JSON.stringify({ title, startVn, endVn, effVn, tFrom, tTo, phases, perVisit, gap, level, mode, duration, spc, reviewDay, review, notes, reason: '', confirmed: false }));
    notify(isNewProtocol ? 'Đã lập phác đồ' : 'Đã lưu phiên bản mới', `${eff && eff > localDay() ? `Phiên bản áp dụng từ ${fmtDate(eff)}; phiên bản cũ còn hiệu lực tới ngày đó. ` : ''}Bệnh nhân cần xác nhận đã đọc rồi mới nạp liệu trình xuống máy.`);
  };

  // Stage 9A (bố cục riêng B06): thứ tự theo việc của bác sĩ: ai, vết nào (ngữ cảnh), đang áp dụng gì (tóm tắt), lập phiên bản mới
  // (ba bước, nút chuyển bước và nút Lưu ở chân màn nên luôn thấy), rồi lịch sử phiên bản thu gọn. Quy tắc lưu và kiểm tra giữ nguyên.
  return (
    <Screen
      header={<Header back title={isNewProtocol ? 'Tạo phác đồ mới' : 'Đổi thông số'} subtitle={w ? `${w.code} · ${w.location}` : undefined} />}
      footer={
        <View style={{ gap: 8 }}>
        {/* Câu hậu quả của trạng thái nằm ngay trên nút Lưu (D10-06h). */}
        {step === 3 && <Notice tone="blue" icon="information-circle-outline">{isNewProtocol ? STATUS_EFFECT.active : effIso && effIso > localDay() ? `${STATUS_EFFECT.scheduled} Ngày áp dụng ${fmtDate(effIso)}.` : 'Áp dụng ngay khi lưu; phiên bản cũ chuyển "Đã thay thế". Bệnh nhân cần xác nhận đã đọc phiên bản mới.'}</Notice>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {step > 0 && <View style={{ flex: 1 }}><Button label="Quay lại" variant="ghost" onPress={() => setStep(step - 1)} /></View>}
          {step < 3
            ? <View style={{ flex: step > 0 ? 2 : 1 }}><Button label="Tiếp" icon="arrow-forward" onPress={() => setStep(step + 1)} /></View>
            : <View style={{ flex: 2 }}><Button label={isNewProtocol ? 'Lưu phác đồ' : `Lưu phiên bản ${nextVersion}`} icon="save-outline" disabled={blockedNew} reason="Chưa đủ điều kiện tạo phác đồ mới." onPress={save} /></View>}
        </View>
        </View>
      }>
      {/* P0 G1: bệnh nhân và vết thương của đợt đang lập. */}
      <ClinicalContext patient={p} wound={w ?? null} />
      {wounds.length > 1 && (
        <View style={{ gap: 8 }}>
          <SectionTitle>Vết thương</SectionTitle>
          <Choices<string> value={woundId} onChange={changeWound} options={wounds.map((w) => ({ value: w.id, label: `${w.code} · ${w.location}` }))} />
        </View>
      )}
      {base && (
        <View style={{ gap: 8 }}>
          <SectionTitle>{base.status === 'active' ? 'Đang áp dụng' : 'Phiên bản gần nhất'}</SectionTitle>
          <CurrentPlanSummary plan={base} />
          <Disclosure title={`Chi tiết phiên bản ${base.version}`} summary="Lịch tái khám, ghi chú, người sửa">
            <Card style={{ gap: 6 }}><PlanDetails plan={base} editorName={account(base.editedBy)?.name} /></Card>
          </Disclosure>
        </View>
      )}
      {isNewProtocol && woundId && <PlanEligibility woundId={woundId} candidates={candidates} value={basisId} onChange={setBasisPick} />}
      <SectionTitle caption="Mỗi vết chỉ một phác đồ đang hoạt động. Giá trị điều trị do bác sĩ đặt; ứng dụng không điền sẵn thông số.">{isNewProtocol ? (latest ? 'Phác đồ mới (sao chép nội dung phác đồ trước)' : 'Phác đồ mới') : 'Phiên bản mới của phác đồ đang mở'}</SectionTitle>
      {!blockedNew && <Card>
        {/* Biểu mẫu chia 3 bước (đề xuất 8): Lịch, Liều, Xác nhận. Lỗi đưa người dùng về đúng bước. */}
        {/* Cùng kiểu thanh bước với T01 (V10); vẫn chạm được để chuyển bước như trước. */}
        <StepRow steps={STEP_NAME} step={step + 1} onStep={(n) => setStep(n - 1)} />
        {/* P1-03d: mỗi lỗi một dòng riêng. */}
        {err ? err.split('\n').map((line) => <Text key={line} accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{line}</Text>) : null}
        {step === 0 && (
          <>
            <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Thông tin phác đồ</Text>
            {isNewProtocol
              ? <Field label="Tên phác đồ" optional value={title} onChangeText={setTitle} placeholder="Trống thì hiện Phác đồ số 00n" />
              : <InfoRow label="Phác đồ" value={view?.title ?? '—'} />}
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}>{isNewProtocol
                ? <Field label="Ngày bắt đầu" value={startVn} onChangeText={(v) => setStartVn(maskDateInput(v))} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/yyyy" />
                : <InfoRow label="Ngày bắt đầu" value={startVn} stack />}</View>
              <View style={{ flex: 1 }}>{isNewProtocol
                ? <Field label="Ngày kết thúc" value={endVn} onChangeText={(v) => setEndVn(maskDateInput(v))} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/yyyy" />
                : <InfoRow label="Ngày kết thúc dự kiến" value={endVn} stack />}</View>
            </View>
            {!isNewProtocol && (
              <>
                <Muted>Đổi ngày kết thúc dùng Gia hạn ở thẻ Phác đồ, không tạo phiên bản.</Muted>
                <Field label="Ngày bắt đầu áp dụng phiên bản mới" value={effVn} onChangeText={(v) => setEffVn(maskDateInput(v))} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/yyyy"
                  hint="Phiên bản cũ còn hiệu lực đến ngày này rồi thành Đã thay thế." />
                <Field label="Lý do đổi thông số" value={reason} onChangeText={setReason} placeholder="Ví dụ: vết thương cải thiện, giảm còn 3 buổi mỗi tuần" />
              </>
            )}
            <Field label="Ghi chú" optional value={notes} onChangeText={setNotes} multiline />
          </>
        )}
        {step === 2 && (
          <>
        <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Lịch theo giai đoạn</Text>
        <Muted>{phases.length === 1 ? `Áp dụng từ ${startVn || '?'} đến ${endVn || '?'}. Thêm giai đoạn nếu tần suất đổi giữa chừng.` : 'Giai đoạn đầu bắt đầu từ ngày bắt đầu, giai đoạn cuối kết thúc ở ngày kết thúc.'}</Muted>
        {phases.map((ph, i) => (
          <View key={i} style={{ gap: 8, padding: 10, borderRadius: 10, backgroundColor: C.surfaceMuted }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ flex: 1, fontWeight: '700', color: C.text }}>Giai đoạn {i + 1}</Text>
              {phases.length > 1 && <TextLink label="Xóa" tone={C.red} accessibilityLabel={`Xóa giai đoạn ${i + 1}`} onPress={() => editPhases(phases.filter((_, k) => k !== i))} />}
            </View>
            {phases.length > 1 && <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Field label="Từ ngày" value={ph.from} onChangeText={(v) => setPhase(i, { from: maskDateInput(v) })} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/yyyy" /></View>
              <View style={{ flex: 1 }}><Field label="Đến ngày" value={ph.to} onChangeText={(v) => setPhase(i, { to: maskDateInput(v) })} keyboardType="number-pad" maxLength={10} placeholder="dd/mm/yyyy" /></View>
            </View>}
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
            onPress={() => editPhases([...(phases.length === 1 ? [{ ...phases[0], from: startVn, to: endVn }] : phases), { from: '', to: endVn, pattern: 'n_per_week', n: '3' }])}
          />
        )}
        <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Khung giờ thực hiện</Text>
        <Muted>Chỉ để hiển thị và nhắc bệnh nhân; không chặn phiên ngoài khung giờ.</Muted>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Từ giờ" optional value={tFrom} onChangeText={setTFrom} placeholder="hh:mm" maxLength={5} /></View>
          <View style={{ flex: 1 }}><Field label="Đến giờ" optional value={tTo} onChangeText={setTTo} placeholder="hh:mm" maxLength={5} /></View>
        </View>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}><Field label="Số lần mỗi buổi" value={perVisit} onChangeText={edit(setPerVisit)} keyboardType="number-pad" /></View>
          <View style={{ flex: 1 }}><Field label="Giãn cách (phút)" value={gap} onChangeText={edit(setGap)} keyboardType="number-pad" hint="Chỉ khi nhiều lần mỗi buổi." /></View>
        </View>

          </>
        )}
        {step === 1 && (
          <>
        {/* R-02, UX-14 (Đợt 10): nhóm liều khóa trên máy lên đầu; công cụ gợi ý thời gian vào mục thu gọn. Trường và quy tắc giữ nguyên. */}
        <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Liều khóa trên máy</Text>
        <Muted>Thiết bị tại nhà bị khóa ở mức và thời gian này; bệnh nhân không đổi được.</Muted>
        <Text style={{ fontWeight: '700', color: C.text }}>Mức năng lượng</Text>
        <Choices<string> value={level} onChange={edit(setLevel)} options={caps.energyLevels.map((e) => ({ value: String(e), label: String(e) }))} />
        {caps.treatmentModes.length > 0 && (
          <>
            <Text style={{ fontWeight: '700', color: C.text }}>Chế độ điều trị</Text>
            <Choices<string> value={mode} onChange={edit(setMode)} options={caps.treatmentModes} />
          </>
        )}
        {!caps.confirmed && <Muted>Danh sách mức và chế độ chưa được firmware xác nhận.</Muted>}
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
        <Text style={{ fontWeight: '700', color: C.text, marginTop: 4 }}>Mốc xem lại</Text>
        <Field label="Mốc xem lại hiệu quả (ngày thứ)" value={reviewDay} onChangeText={edit(setReviewDay)} keyboardType="number-pad" hint="So diện tích với đầu đợt; mặc định ngày 28 (Sheehan 2003)." />
          </>
        )}
        {step === 3 && (
          <>
            {/* R-02, UX-10 (Đợt 10): màn kiểm tra trước khi lưu. Bảng so với phiên bản đang áp dụng, trường đổi tô vàng; sửa thì quay về đúng bước. */}
            <Text style={{ fontWeight: '700', color: C.text, fontSize: T.cardTitle }}>Kiểm tra lịch và liều trước khi lưu</Text>
            {/* P0 ID-05: nêu vết thương của phiên bản sắp lưu ngay đầu bảng kiểm tra. */}
            <InfoRow label="Vết thương" value={w ? `${w.code} · ${w.location}` : 'Chưa chọn'} />
            <ReviewTable rows={reviewRows} baseTitle={baseTitle} />
            <Muted>{!base ? 'Lần lập đầu cho vết thương này.' : changedCount ? `${changedCount} thay đổi được tô vàng.` : 'Không có thay đổi lịch hoặc liều so với phiên bản đang so sánh.'}</Muted>
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              <TextLink label="Sửa thông tin" accessibilityLabel="Sửa thông tin, quay về bước Thông tin" onPress={() => setStep(0)} />
              <TextLink label="Sửa lịch" accessibilityLabel="Sửa lịch, quay về bước Lịch" onPress={() => setStep(2)} />
              <TextLink label="Sửa thông số" accessibilityLabel="Sửa thông số, quay về bước Thông số" onPress={() => setStep(1)} />
            </View>
            <InfoRow label="Tên" value={isNewProtocol ? title.trim() || 'Phác đồ số (tự đặt)' : view?.title ?? '—'} />
            <InfoRow label="Thời gian" value={`${startVn || '?'} đến ${endVn || '?'}`} />
            {!isNewProtocol && <InfoRow label="Bắt đầu áp dụng" value={effVn || '?'} />}
            <InfoRow label="Khung giờ" value={tFrom.trim() && tTo.trim() ? `${tFrom.trim()} đến ${tTo.trim()}` : 'Chưa đặt'} />
            {!isNewProtocol && <InfoRow label="Lý do" value={reason.trim() || 'Chưa nhập'} />}
        {clearedByEdit && !confirmed && (
          <Notice icon="alert-circle-outline">Dấu xác nhận đã được bỏ vì lịch hoặc liều vừa thay đổi. Kiểm tra lại tóm tắt ở trên rồi tích lại.</Notice>
        )}
        <CheckRow checked={confirmed} onChange={(v) => { setConfirmed(v); if (v) setClearedByEdit(false); }} label="Tôi xác nhận liều và lịch này. Bệnh nhân sẽ xem được đợt và nạp liệu trình xuống máy." />
            {/* Hậu quả của trạng thái đang chọn (V12), đặt sát nút Lưu. */}
            {willEnd.length > 0 && (
              <Notice icon="git-branch-outline">{`${willEnd.map((x) => `Phiên bản ${x.version} (${PLAN_STATUS[x.status].label})`).join(', ')} sẽ thành Đã thay thế khi lưu. Phiên bản cũ vẫn giữ trong lịch sử thay đổi.`}</Notice>
            )}
          </>
        )}
      </Card>}

    </Screen>
  );
}
