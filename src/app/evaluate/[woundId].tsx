import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

import { NoAccess, useCanView } from '@/components/Guard';
import { Button, Card, Choices, Disclosure, Field, Header, InfoRow, Muted, Screen, SwitchRow } from '@/components/ui';
import { SEVERITY } from '@/lib/access';
import { assessmentError, EXUDATE, HELP, INFECTION, PERCENT_BANDS, PRESSURE, PRESSURE_STAGES, WOUND_TYPES, woundAge } from '@/lib/assessment';
import { TREND } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { todayIso, useLookups, useStore } from '@/lib/store';
import type { Severity, Trend, WoundAssessment } from '@/lib/types';
import { C } from '@/theme';

// BS06 – Đánh giá tình trạng: nhận xét của bác sĩ, tách riêng với việc đặt tên ảnh (đặc tả 3.2).
export default function Evaluate() {
  const { woundId, imageId } = useLocalSearchParams<{ woundId: string; imageId?: string }>();
  const { data, me, addEvaluation } = useStore();
  const { wound, patient, imagesOf } = useLookups();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  const latestLabeled = w ? [...imagesOf(w.id)].reverse().find((i) => i.areaCm2 !== null) : undefined;
  const img = imageId ? data.images.find((i) => i.id === imageId && i.woundId === w?.id) : latestLabeled;
  const openReports = data.reports.filter((r) => r.patientId === p?.id && r.kind === 'symptom' && !r.handled);

  // Lấy sẵn loại và giai đoạn của lần đánh giá trước (như Swift), bác sĩ chỉ sửa khi thay đổi.
  const prev = data.evaluations.filter((e) => e.woundId === woundId && e.assessment).sort((a, b) => b.date.localeCompare(a.date))[0]?.assessment;
  const [a, setA] = useState<Partial<WoundAssessment>>({ woundType: prev?.woundType, pressureStage: prev?.pressureStage });
  const set = (k: keyof WoundAssessment) => (v: string) => setA((x) => ({ ...x, [k]: v, ...(k === 'woundType' && v !== PRESSURE ? { pressureStage: undefined } : {}) }));
  const [characteristics, setCharacteristics] = useState('');
  const [symptoms, setSymptoms] = useState(openReports.map((r) => r.content).join(' '));
  const [symptomSource, setSymptomSource] = useState(openReports.length ? 'Bệnh nhân báo qua ứng dụng' : 'Bác sĩ hỏi trực tiếp');
  const [severity, setSeverity] = useState<Severity | ''>('');
  const [trend, setTrend] = useState<Trend>('insufficient');
  const [instructions, setInstructions] = useState('');
  const [nextReview, setNextReview] = useState('');
  const [visible, setVisible] = useState(true);
  const [err, setErr] = useState<string | null>(null);

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
  const g2 = { done: [severity, characteristics, symptoms, symptomSource].filter(filled).length, total: 4, missing: severity ? [] : ['mức độ'] };
  const g3 = { done: [trend, instructions, nextReview].filter(filled).length, total: 3, missing: [] as string[] };
  const groupSummary = (g: { done: number; total: number; missing: string[] }) =>
    `Đã điền ${g.done}/${g.total}${g.missing.length ? ` · còn ${g.missing.length} mục bắt buộc` : ''}`;

  const save = () => {
    const aErr = assessmentError(a);
    if (aErr) return setErr(aErr);
    if (!severity) return setErr('Hãy chọn mức Nhẹ, Trung bình hoặc Nặng.');
    if (nextReview && !/^\d{2}\/\d{2}\/\d{4}$/.test(nextReview)) return setErr('Ngày tái đánh giá theo dạng dd/mm/yyyy.');
    const [d, m, y] = nextReview.split('/');
    if (nextReview) {
      const date = new Date(Number(y), Number(m) - 1, Number(d));
      if (date.getFullYear() !== Number(y) || date.getMonth() !== Number(m) - 1 || date.getDate() !== Number(d)) return setErr('Ngày tái đánh giá không tồn tại.');
    }
    addEvaluation({
      woundId: w.id, imageId: img?.id, date: todayIso(), areaCm2: img?.areaCm2 ?? null,
      characteristics: characteristics.trim(), symptoms: symptoms.trim(), symptomSource: symptomSource.trim(),
      severity, trend, instructions: instructions.trim(), nextReview: nextReview ? `${y}-${m}-${d}` : undefined, visibleToPatient: visible,
      assessment: a as WoundAssessment,
    });
    router.back();
  };

  return (
    <Screen header={<Header back title="Đánh giá tình trạng" subtitle={`${p.name} · ${w.code} · ${w.location}`} />}>
      <Card>
        <InfoRow label="Ảnh tham chiếu" value={img?.id ?? 'Không có'} />
        <InfoRow label="Diện tích (bác sĩ đã nhập qua đổi tên ảnh)" value={formatAreaDisplay(img?.areaCm2 ?? null)} />
        <Muted>Ứng dụng chỉ lưu nhận định của bác sĩ; không tự suy luận tình trạng hay đề xuất liệu trình.</Muted>
      </Card>
      {/* PP-09: ba nhóm Disclosure theo thứ tự trường cũ; nhóm đầu mở sẵn. Giá trị nằm ở state của màn nên đóng mở nhóm không mất dữ liệu.
          Tóm tắt mỗi nhóm nêu số mục đã điền và mục bắt buộc còn thiếu; cách kiểm tra khi lưu giữ nguyên. */}
      <Card>
        <Disclosure title="Phân loại vết thương" summary={groupSummary(g1)} summaryTone={g1.missing.length ? C.amber : undefined} initiallyOpen>
          <InfoRow label="Tuổi vết thương (tự tính)" value={`${woundAge(w.startDate, todayIso())}, từ ${w.startDate.split('-').reverse().join('/')}`} />
          <Q label="Loại vết thương" required help={HELP.woundType}><Choices value={a.woundType ?? ''} onChange={set('woundType')} options={WOUND_TYPES.map((v) => ({ value: v, label: v }))} /></Q>
          {a.woundType === PRESSURE && (
            <Q label="Giai đoạn (NPIAP)" required help={HELP.pressureStage}><Choices value={a.pressureStage ?? ''} onChange={set('pressureStage')} options={PRESSURE_STAGES.map((v) => ({ value: v, label: v }))} /></Q>
          )}
          <Q label="Mô hạt" help={HELP.granulation}><Choices value={a.granulation ?? ''} onChange={set('granulation')} options={PERCENT_BANDS.map((v) => ({ value: v, label: v }))} /></Q>
          <Q label="Biểu mô hóa" help={HELP.epithelial}><Choices value={a.epithelial ?? ''} onChange={set('epithelial')} options={PERCENT_BANDS.map((v) => ({ value: v, label: v }))} /></Q>
          <Q label="Dịch tiết" required help={HELP.exudate}><Choices value={a.exudate ?? ''} onChange={set('exudate')} options={EXUDATE.map((v) => ({ value: v, label: v }))} /></Q>
          <Q label="Dấu hiệu nhiễm trùng" required help={HELP.infection}><Choices value={a.infection ?? ''} onChange={set('infection')} options={INFECTION.map((v) => ({ value: v, label: v }))} /></Q>
          <Muted>Danh mục là bản nháp cho demo, cần bác sĩ trong nhóm chọn thang đánh giá chính thức.</Muted>
        </Disclosure>
      </Card>
      <Card>
        <Disclosure title="Mức độ và triệu chứng" summary={groupSummary(g2)} summaryTone={g2.missing.length ? C.amber : undefined}>
          <Text style={{ fontWeight: '700', fontSize: 17 }}>Mức độ vết thương</Text>
          <Choices<Severity | ''> value={severity} onChange={setSeverity} options={(['mild', 'moderate', 'severe'] as const).map(value => ({ value, label: SEVERITY[value].label }))} />
          <Muted>Bác sĩ chọn mức độ sau khi đánh giá; mức độ không tự tính từ diện tích hay diễn biến.</Muted>
          <Field optional label="Đặc điểm vết thương" value={characteristics} onChangeText={setCharacteristics} multiline placeholder="Nền, bờ, da xung quanh, dịch tiết, mô hạt…" />
          <Field optional label="Triệu chứng" value={symptoms} onChangeText={setSymptoms} multiline placeholder="Đau, khó chịu…" />
          <Field optional label="Nguồn thông tin triệu chứng" value={symptomSource} onChangeText={setSymptomSource} />
        </Disclosure>
      </Card>
      <Card>
        <Disclosure title="Diễn biến và hướng dẫn" summary={groupSummary(g3)}>
          <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>Diễn biến theo nhận định bác sĩ</Text>
          <Choices<Trend> value={trend} onChange={setTrend} options={(['improving', 'stable', 'worsening', 'insufficient'] as const).map((t) => ({ value: t, label: TREND[t].label }))} />
          <Field optional label="Hướng dẫn tiếp theo" value={instructions} onChangeText={setInstructions} multiline placeholder="Theo dõi, chăm sóc, thay đổi liệu trình nếu có…" />
          <Field optional label="Ngày tái đánh giá" value={nextReview} onChangeText={setNextReview} placeholder="dd/mm/yyyy" />
          <SwitchRow label="Công bố cho bệnh nhân xem" value={visible} onChange={setVisible} />
        </Disclosure>
      </Card>
      {err ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{err}</Text> : null}
      <Button label="Lưu đánh giá" icon="save-outline" onPress={save} />
    </Screen>
  );
}

/** Nhãn câu hỏi kèm nút (i) mở giải thích ngắn. Chỉ ghi "(không bắt buộc)" cho câu không bắt buộc, cùng quy ước với Field (A05). */
function Q({ label, required, help, children }: { label: string; required?: boolean; help: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={{ color: C.text, fontSize: 14, fontWeight: '600' }}>
          {label}{required ? null : <Text style={{ color: C.textSoft, fontWeight: '400' }}> (không bắt buộc)</Text>}
        </Text>
        <Pressable onPress={() => setOpen(!open)} accessibilityRole="button" accessibilityLabel={`Giải thích: ${label}`} accessibilityState={{ expanded: open }} hitSlop={10} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={18} color={C.primary} />
        </Pressable>
      </View>
      {open && <Muted>{help}</Muted>}
      {children}
    </View>
  );
}
