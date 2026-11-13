import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View, type HostInstance, type ScrollViewInstance } from 'react-native';
import { Text } from '@/components/Text';

import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { Button, Card, Choices, Disclosure, Divider, Field, Header, InfoRow, Muted, Notice, Screen, SwitchRow, TextLink, WoundPhoto } from '@/components/ui';
import { SEVERITY } from '@/lib/access';
import { assessmentError, assessmentSummary, EXUDATE, HELP, INFECTION, PERCENT_BANDS, PRESSURE, PRESSURE_STAGES, WOUND_TYPES, woundAge } from '@/lib/assessment';
import { evaluationProblems, type EvalProblem } from '@/lib/evaluationCheck';
import { fmtDate, TREND } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { notify } from '@/lib/dialog';
import { todayIso, useLookups, useStore } from '@/lib/store';
import type { Severity, Trend, WoundAssessment } from '@/lib/types';
import { C, size, space, T } from '@/theme';

// BS06 – Đánh giá tình trạng: nhận xét của bác sĩ, tách riêng với việc đặt tên ảnh (đặc tả 3.2).
export default function Evaluate() {
  const { woundId, imageId } = useLocalSearchParams<{ woundId: string; imageId?: string }>();
  const { data, me, addEvaluation, setReportHandled } = useStore();
  const { wound, patient, imagesOf, account } = useLookups();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  const latestLabeled = w ? [...imagesOf(w.id)].reverse().find((i) => i.areaCm2 !== null) : undefined;
  const img = imageId ? data.images.find((i) => i.id === imageId && i.woundId === w?.id) : latestLabeled;
  const openReports = data.reports.filter((r) => r.patientId === p?.id && r.kind === 'symptom' && !r.handled);

  // Lấy sẵn loại và giai đoạn của lần đánh giá trước (như Swift), bác sĩ chỉ sửa khi thay đổi.
  const prevEval = data.evaluations.filter((e) => e.woundId === woundId && e.assessment).sort((a, b) => b.date.localeCompare(a.date))[0];
  const prev = prevEval?.assessment;
  // P1-03b: lần đánh giá gần nhất của đúng vết đang mở (có hay không có phân loại), chỉ để xem; không giá trị nào được chép vào biểu mẫu.
  const lastEval = data.evaluations.filter((e) => e.woundId === woundId).sort((x, y) => y.date.localeCompare(x.date))[0];
  // P0 ID-06: imageId có trên đường dẫn nhưng không thuộc vết thương đang mở thì dừng, không lưu thiếu ảnh tham chiếu.
  const imageMismatch = !!imageId && !img;
  const [a, setA] = useState<Partial<WoundAssessment>>({ woundType: prev?.woundType, pressureStage: prev?.pressureStage });
  const set = (k: keyof WoundAssessment) => (v: string) => { setA((x) => ({ ...x, [k]: v, ...(k === 'woundType' && v !== PRESSURE ? { pressureStage: undefined } : {}) })); clearErr(k as FieldKey); };
  const [characteristics, setCharacteristics] = useState('');
  const [symptoms, setSymptoms] = useState(openReports.map((r) => r.content).join(' '));
  const [defaultSource] = useState(openReports.length ? 'Bệnh nhân báo qua ứng dụng' : 'Bác sĩ hỏi trực tiếp');
  const [symptomSource, setSymptomSource] = useState(defaultSource);
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [trend, setTrend] = useState<Trend>('insufficient');
  const [instructions, setInstructions] = useState('');
  const [nextReview, setNextReview] = useState('');
  const [visible, setVisible] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  // P0 SV-05: so với giá trị lúc mở màn; khác thì rời màn phải hỏi. Không tự lưu.
  const [initial] = useState(() => JSON.stringify({ a: { woundType: prev?.woundType, pressureStage: prev?.pressureStage }, characteristics: '', symptoms: openReports.map((r) => r.content).join(' '), severity: '', trend: 'insufficient', instructions: '', nextReview: '', visible: true }));
  const dirty = JSON.stringify({ a, characteristics, symptoms, severity, trend, instructions, nextReview, visible }) !== initial;
  // R-05, UX-15 (Đợt 10): sau khi lưu, nếu báo cáo triệu chứng chưa xử lý đã được điền vào ô Triệu chứng thì hỏi có đánh dấu đã xử lý
  // không (không tự làm, QĐ-5 giữ nguyên). saving chặn lưu trùng khi bấm nhiều lần.
  const saving = useRef(false);
  const [saved, setSaved] = useState<{ reportIds: string[] } | null>(null);
  // Bổ sung Đợt 4: nhóm đang mở do màn điều khiển, để khi lưu thiếu trường thì mở đúng nhóm và đưa tới trường lỗi.
  const [openGroups, setOpenGroups] = useState<[boolean, boolean, boolean]>([true, false, false]);
  // P1-03a: lỗi tại từng trường (nhiều trường cùng lúc) và danh sách mục cần sửa của lần bấm Lưu gần nhất.
  const [fieldErrs, setFieldErrs] = useState<Partial<Record<FieldKey, string>>>({});
  const [problems, setProblems] = useState<EvalProblem[]>([]);
  // P0 SV-04: "Sửa" trong thẻ "Sẽ lưu" mở đúng nhóm và cuộn tới trường, như khi lưu thiếu.
  const [scrollTo, setScrollTo] = useState<{ key: FieldKey; at: number } | null>(null);
  const scrollRef = useRef<ScrollViewInstance>(null);
  // Bảng nút của các trường bắt buộc và hàm gắn nút, tạo một lần (không đọc trong lúc render).
  const [fieldNodes] = useState(() => new Map<FieldKey, HostInstance>());
  const [anchors] = useState(() => Object.fromEntries(FIELD_KEYS.map((k) => [k, (el: HostInstance | null) => { if (el) fieldNodes.set(k, el); else fieldNodes.delete(k); }])) as Record<FieldKey, (el: HostInstance | null) => void>);
  const clearErr = (k: FieldKey) => {
    setFieldErrs((f) => { if (!(k in f)) return f; const { [k]: _, ...rest } = f; return rest; });
    setProblems((ps) => ps.filter((x) => x.key !== k));
  };
  const [done, setDone] = useState(false);
  const allowLeave = useDiscardGuard(dirty && !done);
  // Cuộn tới trường lỗi một lần cho mỗi lần bấm Lưu (phụ thuộc fieldErr.at), sau khi nhóm đã mở và trường đã hiện.
  useEffect(() => {
    if (!scrollTo) return;
    const id = requestAnimationFrame(() => {
      const node = fieldNodes.get(scrollTo.key);
      const inner = scrollRef.current?.getInnerViewRef?.();
      if (!node || !inner) return;
      try { node.measureLayout(inner as never, (_x: number, y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 16), animated: true }), () => {}); } catch { /* không cuộn được thì vẫn có lỗi tại trường và trên nút Lưu */ }
    });
    return () => cancelAnimationFrame(id);
  }, [scrollTo?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!w || !p) return <NoAccess notFound />;
  if (!canView || me?.role !== 'doctor') return <NoAccess />;

  // PP-09: đếm mục đã điền cho dòng tóm tắt của từng nhóm (chỉ hiển thị, không thay cho kiểm tra khi lưu).
  const filled = (v: unknown) => typeof v === 'string' ? v.trim() !== '' : v != null;
  const isPressure = a.woundType === PRESSURE;
  const g1 = {
    done: [a.woundType, ...(isPressure ? [a.pressureStage] : []), a.granulation, a.epithelial, a.exudate, a.infection].filter(filled).length,
    total: isPressure ? 6 : 5,
    missing: [!filled(a.woundType) && 'loại vết thương', isPressure && !filled(a.pressureStage) && 'giai đoạn', !filled(a.exudate) && 'dịch tiết', !filled(a.infection) && 'dấu hiệu nhiễm trùng'].filter(Boolean) as string[],
  };
  // P1-03c: ô nguồn triệu chứng chỉ tính là đã điền khi bác sĩ đã sửa giá trị điền sẵn.
  const g2 = { done: [severity, characteristics, symptoms, symptomSource !== defaultSource ? symptomSource : ''].filter(filled).length, total: 4, missing: severity ? [] : ['mức độ'] };
  const g3 = { done: [trend, instructions, nextReview].filter(filled).length, total: 3, missing: [] as string[] };
  const groupSummary = (g: { done: number; total: number; missing: string[] }) =>
    `Đã điền ${g.done}/${g.total}${g.missing.length ? ` · còn ${g.missing.length} mục bắt buộc` : ''}`;
  // Các trường bệnh nhân thấy ở trang vết thương (wounds/[id].tsx), chỉ liệt kê trường đã nhập.
  const patientSees = [
    severity && 'mức độ', trend && 'diễn biến', characteristics.trim() && 'đặc điểm', symptoms.trim() && 'triệu chứng',
    instructions.trim() && 'hướng dẫn', nextReview.trim() && 'ngày tái đánh giá',
  ].filter(Boolean) as string[];
  const toggle = (g: 0 | 1 | 2) => (next: boolean) => setOpenGroups((o) => o.map((v, i) => (i === g ? next : v)) as [boolean, boolean, boolean]);
  const errOf = (k: FieldKey) => fieldErrs[k];
  const anchor = (k: FieldKey) => anchors[k];

  // Quy tắc và câu báo lỗi giữ nguyên; chỉ thêm việc chỉ ra trường lỗi (mở nhóm, cuộn tới, ghi lỗi tại trường).
  const fail = (msg: string) => { setErr(msg); setProblems([]); };
  // P1-03a: báo mọi mục cần sửa trong một lượt: mở mọi nhóm có mục, ghi lỗi tại từng trường, cuộn tới mục đầu tiên.
  const failAll = (list: EvalProblem[]) => {
    const keyed = list.filter((x): x is EvalProblem & { key: FieldKey } => !!x.key);
    setErr(list.length === 1 ? list[0].msg : `Còn ${list.length} mục cần sửa trước khi lưu: ${list.map((x) => x.label).join(', ')}.`);
    setProblems(list);
    setFieldErrs(Object.fromEntries(keyed.map((x) => [x.key, x.msg])));
    const groups = new Set(keyed.map((x) => GROUP_OF[x.key]));
    setOpenGroups((o) => o.map((v, i) => v || groups.has(i as 0 | 1 | 2)) as [boolean, boolean, boolean]);
    if (keyed[0]) setScrollTo((x) => ({ key: keyed[0].key, at: (x?.at ?? 0) + 1 }));
  };
  const jumpTo = (key: FieldKey) => {
    const g = GROUP_OF[key];
    setOpenGroups((o) => (o[g] ? o : (o.map((v, i) => v || i === g) as [boolean, boolean, boolean])));
    setScrollTo((x) => ({ key, at: (x?.at ?? 0) + 1 }));
  };
  const save = async () => {
    // Quy tắc không đổi: assessmentError (gọi lại nhiều lần trong evaluationCheck), mức độ bắt buộc, ngày tái đánh giá dd/mm/yyyy và có thật.
    const list = evaluationProblems(assessmentError, a, severity, nextReview);
    if (list.length) return failAll(list);
    const [d, m, y] = nextReview.split('/');
    if (imageMismatch) return fail('Ảnh tham chiếu không thuộc vết thương này. Mở lại từ màn vết thương.');
    if (saving.current) return;
    saving.current = true;
    // Báo cáo đã được điền vào ô Triệu chứng (nội dung còn nằm trong ô lúc lưu).
    const filledReports = openReports.filter((r) => r.content.trim() && symptoms.includes(r.content.trim())).map((r) => r.id);
    try {
    await addEvaluation({
      woundId: w.id, imageId: img?.id, date: todayIso(), areaCm2: img?.areaCm2 ?? null,
      characteristics: characteristics.trim(), symptoms: symptoms.trim(), symptomSource: symptomSource.trim(),
      severity: severity as Severity, trend, instructions: instructions.trim(), nextReview: nextReview ? `${y}-${m}-${d}` : undefined, visibleToPatient: visible,
      assessment: a as WoundAssessment,
    });
    } catch (e) {
      saving.current = false;
      return fail(`Chưa lưu được đánh giá: ${e instanceof Error ? e.message : 'lỗi không xác định'}. Dữ liệu vẫn còn, hãy thử lại.`);
    }
    setErr(null);
    setProblems([]);
    setDone(true);
    if (filledReports.length) { setSaved({ reportIds: filledReports }); return; }
    allowLeave();
    notify('Đã lưu đánh giá', visible ? 'Bệnh nhân xem được đánh giá này.' : 'Chỉ bác sĩ xem được đánh giá này.');
    router.back();
  };

  if (saved) {
    const n = saved.reportIds.length;
    return (
      <Screen header={<Header back title="Đánh giá tình trạng" />}>
      <ClinicalContext patient={p} wound={w} />
        <Notice tone="green" icon="checkmark-circle-outline">Đã lưu đánh giá. {visible ? 'Bệnh nhân xem được đánh giá này.' : 'Chỉ bác sĩ xem được đánh giá này.'}</Notice>
        <Card>
          <Text style={{ fontWeight: '700', color: C.text }}>{n} báo cáo triệu chứng của bệnh nhân đã được điền vào đánh giá</Text>
          <Muted>Báo cáo vẫn ở trạng thái chưa xử lý cho tới khi bác sĩ đánh dấu.</Muted>
          <Button label={`Đánh dấu ${n} báo cáo đã xử lý`} icon="checkmark-done-outline" onPress={() => { saved.reportIds.forEach((id) => setReportHandled(id)); router.back(); }} />
          <Button label="Để sau, quay lại hồ sơ" variant="secondary" onPress={() => router.back()} />
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scrollRef={scrollRef} header={<Header back title="Đánh giá tình trạng" />}>
      <ClinicalContext patient={p} wound={w} />
      {imageMismatch && <Notice tone="red" icon="close-circle-outline">{`Ảnh ${imageId} không thuộc ${w.code} của bệnh nhân này. Không lưu được đánh giá từ đường dẫn này; mở lại từ màn vết thương.`}</Notice>}
      <Card>
        {/* R-05, UX-16 (Đợt 10): ảnh tham chiếu nhỏ, ngày chụp, diện tích bác sĩ đo. Cùng dữ liệu như trước. */}
        {img ? (
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <WoundPhoto image={img} style={{ width: 88, height: 66, borderRadius: 10 }} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontWeight: '700', color: C.text }}>Ảnh tham chiếu {img.id}</Text>
              <Muted>{img.capture?.sourceDateKnown === false ? 'Ngày chụp chưa xác định' : `Chụp ${fmtDate(img.captureDate)}`}</Muted>
            </View>
          </View>
        ) : <InfoRow label="Ảnh tham chiếu" value="Không có" />}
        <InfoRow label="Diện tích bác sĩ đo" value={formatAreaDisplay(img?.areaCm2 ?? null)} />
        <Muted>Ứng dụng chỉ lưu nhận định của bác sĩ; không tự suy luận tình trạng hay đề xuất liệu trình.</Muted>
        {/* P1-03b: xem lại lần đánh giá trước của cùng vết, chỉ đọc. Không có nút chép, không điền thêm trường nào. */}
        {lastEval ? (
          <>
            <Divider />
            <Disclosure title={`Lần đánh giá trước ${fmtDate(lastEval.date)}`} summary={`${account(lastEval.doctorId)?.name ?? 'Bác sĩ không rõ'} · chỉ để tham khảo, không tự điền`}>
              <View testID="lan-danh-gia-truoc" style={{ gap: space.xs }}>
                <InfoRow label="Mức độ" value={lastEval.severity ? SEVERITY[lastEval.severity].label : 'Không ghi'} />
                <InfoRow label="Diễn biến" value={TREND[lastEval.trend].label} />
                <InfoRow label="Phân loại" value={lastEval.assessment ? assessmentSummary(lastEval.assessment) : 'Không ghi'} />
                <InfoRow label="Diện tích lúc đó" value={formatAreaDisplay(lastEval.areaCm2)} />
                {lastEval.characteristics ? <InfoRow label="Đặc điểm" value={lastEval.characteristics} /> : null}
                {lastEval.symptoms ? <InfoRow label="Triệu chứng" value={lastEval.symptoms} /> : null}
                <InfoRow label="Hướng dẫn" value={lastEval.instructions || 'Không ghi'} />
                <Muted>Giá trị lần trước không được chép vào biểu mẫu. Bác sĩ nhập lại theo nhận định hôm nay.</Muted>
              </View>
            </Disclosure>
          </>
        ) : null}
      </Card>
      {/* PP-09: ba nhóm Disclosure theo thứ tự trường cũ; nhóm đầu mở sẵn. Giá trị nằm ở state của màn nên đóng mở nhóm không mất dữ liệu.
          Bổ sung Đợt 4: ba nhóm chung một thẻ, tách bằng đường kẻ, khoảng cách trong nhóm 8 (thang space) để màn ngắn hơn; nhóm do màn điều khiển. */}
      <Card>
        <Disclosure title="Phân loại vết thương" summary={groupSummary(g1)} summaryTone={g1.missing.length ? C.amber : undefined} open={openGroups[0]} onToggle={toggle(0)}>
          <View style={{ gap: space.s }}>
            <Text style={{ color: C.textSoft, fontSize: T.small, fontWeight: '700' }}>Bắt buộc</Text>
            <InfoRow label="Tuổi vết thương (tự tính)" value={`${woundAge(w.startDate, todayIso())}, từ ${w.startDate.split('-').reverse().join('/')}`} />
            <Q label="Loại vết thương" required help={HELP.woundType} error={errOf('woundType')} anchor={anchor('woundType')}><Choices value={a.woundType ?? ''} onChange={set('woundType')} options={WOUND_TYPES.map((v) => ({ value: v, label: v }))} /></Q>
            {/* P0 DS-04: giá trị điền sẵn từ lần trước được ghi rõ nguồn cho tới khi bác sĩ chọn lại. */}
            {prevEval && prev?.woundType && a.woundType === prev.woundType && (a.woundType !== PRESSURE || a.pressureStage === prev.pressureStage) ? (
              <Muted>{`Lấy từ đánh giá ngày ${fmtDate(prevEval.date)}${a.woundType === PRESSURE && prev.pressureStage ? ' (cả giai đoạn)' : ''}. Kiểm tra lại trước khi lưu.`}</Muted>
            ) : null}
            {a.woundType === PRESSURE && (
              <Q label="Giai đoạn (NPIAP)" required help={HELP.pressureStage} error={errOf('pressureStage')} anchor={anchor('pressureStage')}><Choices value={a.pressureStage ?? ''} onChange={set('pressureStage')} options={PRESSURE_STAGES.map((v) => ({ value: v, label: v }))} /></Q>
            )}
            <Q label="Dịch tiết" required help={HELP.exudate} error={errOf('exudate')} anchor={anchor('exudate')}><Choices value={a.exudate ?? ''} onChange={set('exudate')} options={EXUDATE.map((v) => ({ value: v, label: v }))} /></Q>
            <Q label="Dấu hiệu nhiễm trùng" required help={HELP.infection} error={errOf('infection')} anchor={anchor('infection')}><Choices value={a.infection ?? ''} onChange={set('infection')} options={INFECTION.map((v) => ({ value: v, label: v }))} /></Q>
            {/* P1-03c (QĐ-P1-5 A): câu không bắt buộc gom xuống cụm "Bổ sung"; câu chữ và lựa chọn giữ nguyên. */}
            <Divider />
            <Text style={{ color: C.textSoft, fontSize: T.small, fontWeight: '700' }}>Bổ sung (không bắt buộc)</Text>
            <Q label="Mô hạt" help={HELP.granulation}><Choices value={a.granulation ?? ''} onChange={set('granulation')} options={PERCENT_BANDS.map((v) => ({ value: v, label: v }))} /></Q>
            <Q label="Biểu mô hóa" help={HELP.epithelial}><Choices value={a.epithelial ?? ''} onChange={set('epithelial')} options={PERCENT_BANDS.map((v) => ({ value: v, label: v }))} /></Q>
            <Muted>Danh mục là bản nháp cho demo, cần bác sĩ trong nhóm chọn thang đánh giá chính thức.</Muted>
          </View>
        </Disclosure>
        <Divider />
        <Disclosure title="Mức độ và triệu chứng" summary={groupSummary(g2)} summaryTone={g2.missing.length ? C.amber : undefined} open={openGroups[1]} onToggle={toggle(1)}>
          <View style={{ gap: space.s }}>
            <View ref={anchor('severity')} style={{ gap: space.xs }}>
              <Text style={{ fontWeight: '700', fontSize: 17 }}>Mức độ vết thương</Text>
              {errOf('severity') ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600', fontSize: T.caption }}>{errOf('severity')}</Text> : null}
              <Choices<Severity | ''> value={severity} onChange={(v) => { setSeverity(v); clearErr('severity'); }} options={(['mild', 'moderate', 'severe'] as const).map(value => ({ value, label: SEVERITY[value].label }))} />
            </View>
            <Muted>Bác sĩ chọn mức độ sau khi đánh giá; mức độ không tự tính từ diện tích hay diễn biến.</Muted>
            <Field optional label="Đặc điểm vết thương" value={characteristics} onChangeText={setCharacteristics} multiline placeholder="Nền, bờ, da xung quanh, dịch tiết, mô hạt…" />
            <Field optional label="Triệu chứng" value={symptoms} onChangeText={setSymptoms} multiline placeholder="Đau, khó chịu…" />
            <Field optional label="Nguồn thông tin triệu chứng" value={symptomSource} onChangeText={setSymptomSource} />
          </View>
        </Disclosure>
        <Divider />
        <Disclosure title="Diễn biến và hướng dẫn" summary={groupSummary(g3)} open={openGroups[2]} onToggle={toggle(2)}>
          <View style={{ gap: space.s }}>
            <Text style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>Diễn biến theo nhận định bác sĩ</Text>
            <View ref={anchor('trend')}>
              <Choices<Trend> value={trend} onChange={setTrend} options={(['improving', 'stable', 'worsening', 'insufficient'] as const).map((t) => ({ value: t, label: TREND[t].label }))} />
            </View>
            <Field optional label="Hướng dẫn tiếp theo" value={instructions} onChangeText={setInstructions} multiline placeholder="Theo dõi, chăm sóc, thay đổi liệu trình nếu có…" />
            <View ref={anchor('nextReview')}>
              <Field optional label="Ngày tái đánh giá" value={nextReview} onChangeText={(v) => { setNextReview(v); clearErr('nextReview'); }} placeholder="dd/mm/yyyy" error={errOf('nextReview')} />
            </View>
          </View>
        </Disclosure>
      </Card>
      {/* R-05, UX-06 (Đợt 10): ai sẽ thấy đánh giá, đặt ngay trên nút Lưu. Mặc định giữ nguyên (QĐ-2 chưa đổi). Nội dung xem trước lấy
          đúng như trang chủ bệnh nhân (lời dặn, nếu trống thì đặc điểm) và trang vết thương (các trường đã nhập). */}
      <View style={{ gap: space.s, padding: 14, borderRadius: 14, borderWidth: 2, borderColor: visible ? C.primary : C.cardBorder, backgroundColor: C.card }}>
        {/* P0 SV-04: tóm tắt các lựa chọn chính ngay trên nút Lưu, sửa thì mở đúng nhóm. Không thêm màn hay hộp xác nhận. */}
        <View testID="se-luu" style={{ gap: space.xs }}>
          <Text style={{ fontWeight: '700', color: C.text }}>Sẽ lưu</Text>
          <SummaryRow label="Vết thương" value={`${w.code} · ${w.location}`} />
          <SummaryRow label="Mức độ" value={severity ? SEVERITY[severity].label : 'Chưa chọn'} missing={!severity} onEdit={() => jumpTo('severity')} />
          <SummaryRow label="Diễn biến" value={TREND[trend].label} onEdit={() => jumpTo('trend')} />
          <SummaryRow label="Loại vết thương" value={a.woundType ? `${a.woundType}${a.woundType === PRESSURE ? `, ${a.pressureStage ?? 'chưa chọn giai đoạn'}` : ''}` : 'Chưa chọn'} missing={!a.woundType || (a.woundType === PRESSURE && !a.pressureStage)} onEdit={() => jumpTo('woundType')} />
          <SummaryRow label="Nhiễm trùng" value={a.infection ?? 'Chưa chọn'} missing={!a.infection} onEdit={() => jumpTo('infection')} />
          <SummaryRow label="Ảnh tham chiếu" value={img ? `${img.id}, ${formatAreaDisplay(img.areaCm2)}` : 'Không có'} />
        </View>
        <Divider />
        <SwitchRow label="Bệnh nhân sẽ xem đánh giá này" value={visible} onChange={setVisible} />
        {visible ? (
          <>
            <Text style={{ color: C.text }}>Lời dặn trên trang chủ bệnh nhân: {(instructions.trim() || characteristics.trim()) ? `“${instructions.trim() || characteristics.trim()}”` : 'chưa có lời dặn.'}</Text>
            {!instructions.trim() && characteristics.trim() ? <Muted>Chưa có hướng dẫn nên trang chủ hiện đặc điểm vết thương thay lời dặn.</Muted> : null}
            {patientSees.length ? <Muted>Trang vết thương còn hiện: {patientSees.join(', ')}.</Muted> : null}
          </>
        ) : <Muted>Chỉ bác sĩ thấy đánh giá này.</Muted>}
      </View>
      {err ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{err}</Text> : null}
      {/* P1-03a: mỗi mục cần sửa là một liên kết mở đúng nhóm và cuộn tới trường. */}
      {problems.length > 1 ? (
        <View testID="muc-can-sua" style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: space.m }}>
          {problems.filter((x) => x.key).map((x) => <TextLink key={x.key} label={`Tới ${x.label.toLowerCase()}`} accessibilityLabel={`Tới mục ${x.label}`} onPress={() => jumpTo(x.key as FieldKey)} />)}
        </View>
      ) : null}
      <Button label={visible ? 'Lưu và công bố cho bệnh nhân' : 'Lưu đánh giá (chỉ bác sĩ)'} icon="save-outline" onPress={save} disabled={imageMismatch} reason="Ảnh tham chiếu không thuộc vết thương này." />
    </Screen>
  );
}

/** Nhãn câu hỏi kèm nút (i) mở giải thích ngắn. Chỉ ghi "(không bắt buộc)" cho câu không bắt buộc, cùng quy ước với Field (A05).
 *  Bổ sung Đợt 4: `error` hiện lỗi ngay dưới nhãn; `anchor` để màn cuộn tới câu hỏi khi lưu thiếu. Khoảng cách nhãn và chip giữ 6 để nút (i) không chồng lên chip. */
function Q({ label, required, help, error, anchor, children }: { label: string; required?: boolean; help: string; error?: string; anchor?: (el: HostInstance | null) => void; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View ref={anchor} style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>
          {label}{required ? null : <Text style={{ color: C.textSoft, fontWeight: '400' }}> (không bắt buộc)</Text>}
        </Text>
        {/* Bổ sung Đợt 4: vùng bấm thật 44x44 (size.touch) trên mọi nền tảng; lề âm 6 giữ chỗ chiếm trong hàng 32x32 như cũ.
            Bỏ hitSlop vì bản web không áp dụng hitSlop, và trên máy thật vùng hitSlop 10 chồng lên chip bên dưới. */}
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`Giải thích: ${label}`} accessibilityState={{ expanded: open }} style={{ width: size.touch, height: size.touch, margin: -(size.touch - 32) / 2, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={18} color={C.primary} />
        </Pressable>
      </View>
      {open && <Muted>{help}</Muted>}
      {error ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600', fontSize: T.caption }}>{error}</Text> : null}
      {children}
    </View>
  );
}

const FIELD_KEYS = ['woundType', 'pressureStage', 'exudate', 'infection', 'severity', 'trend', 'nextReview'] as const;
type FieldKey = (typeof FIELD_KEYS)[number];
/** Nhóm chứa từng trường bắt buộc hoặc có kiểm tra (0, 1, 2 theo thứ tự Disclosure). */
const GROUP_OF: Record<FieldKey, 0 | 1 | 2> = { woundType: 0, pressureStage: 0, exudate: 0, infection: 0, severity: 1, trend: 2, nextReview: 2 };

/** P0 SV-04: một dòng của thẻ "Sẽ lưu". Mục bắt buộc còn trống ghi chữ "Chưa chọn" màu cảnh báo, không chỉ dựa vào màu. */
function SummaryRow({ label, value, missing, onEdit }: { label: string; value: string; missing?: boolean; onEdit?: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, minHeight: 32 }}>
      <Text style={{ width: 112, color: C.textSoft, fontSize: T.small }}>{label}</Text>
      <Text style={{ flex: 1, color: missing ? C.amber : C.text, fontWeight: missing ? '700' : '600' }}>{value}</Text>
      {onEdit ? <TextLink label="Sửa" accessibilityLabel={`Sửa ${label.toLowerCase()}`} onPress={onEdit} /> : null}
    </View>
  );
}
