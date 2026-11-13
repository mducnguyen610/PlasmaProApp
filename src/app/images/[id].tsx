import { CaptureQualityCard } from '@/components/CaptureQualityCard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { MONO, Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { Button, Card, Chip, Choices, Disclosure, Divider, Field, Header, InfoRow, Muted, Notice, Screen, SectionTitle, Segmented, StatusChip, TextLink, WoundPhoto } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { measurementSource, neighbourImages, previousMeasuredImage } from '@/lib/measurementSource';
import { fmtDate, fmtDateTime, LABEL_STATUS } from '@/lib/format';
import { buildFilename, checkFullFilename, formatAreaDisplay, formatAreaForName, parseArea, type AreaUnit } from '@/lib/naming';
import { areaWarning, previousArea } from '@/lib/plausibility';
import { MEASURE_METHODS, previousMethod } from '@/lib/measureMethod';
import { DEMO_ASSETS } from '@/lib/seed';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';
import { AI_CONFIDENCE, LABEL, SOURCE, aiConfidenceLevel } from '@/theme.status';
import type { WoundImage } from '@/lib/types';

type Mode = 'area' | 'full';

// Giá trị ban đầu của biểu mẫu đo, chỉ lấy từ chính ảnh này (và PP-11: phương pháp của lần đo trước cùng vết thương).
// Không lấy số AR hay dữ liệu của ảnh, vết thương, bệnh nhân khác (QĐ-1).
function editDefaults(images: WoundImage[], im: WoundImage, pCode: string, wCode: string) {
  const ref = im.measureMethod ? null : previousMethod(images, im);
  return {
    areaText: im.areaCm2 !== null ? formatAreaForName(im.areaCm2).replace('.', ',') : '',
    fullName: im.areaCm2 !== null ? im.filename : `${pCode}_${wCode}_${im.id}_area__cm2.${im.ext}`,
    method: im.measureMethod ?? ref?.method ?? '',
    methodFrom: ref ? { imageId: ref.imageId, captureDate: ref.captureDate } : null,
  };
}

// BS05 – Xem ảnh và đổi tên theo diện tích bác sĩ đã đo (đặc tả mục 4).
// Đợt 12 (R-06): key theo mã ảnh để khi mở "Ảnh chưa đo tiếp theo", toàn bộ trạng thái nhập được tạo mới,
// không mang số hay phương pháp đang gõ sang ảnh khác.
export default function ImageDetail() {
  // P0: tuBenhNhan là bệnh nhân của ảnh trước trong chuỗi "Ảnh chưa đo tiếp theo" (ID-01);
  // nhapLai, phuongPhap, loi do B10 truyền khi ảnh đã lưu mà số đo chưa lưu được (SV-02).
  const { id, tuBenhNhan, nhapLai, phuongPhap, loi } = useLocalSearchParams<{ id: string; tuBenhNhan?: string; nhapLai?: string; phuongPhap?: string; loi?: string }>();
  return <ImageDetailInner key={id} id={id} fromPatient={tuBenhNhan} retry={nhapLai ? { areaText: nhapLai, method: phuongPhap ?? '', error: loi ?? '' } : undefined} />;
}

function ImageDetailInner({ id, fromPatient, retry }: { id: string; fromPatient?: string; retry?: { areaText: string; method: string; error: string } }) {
  const { data, me, labelImage, setExcluded, requestRetake, setResearchReady } = useStore();
  const { patient, wound, account } = useLookups();
  const insets = useSafeAreaInsets();
  const im = data.images.find((x) => x.id === id);
  const p = patient(im?.patientId);
  const w = wound(im?.woundId);
  const canView = useCanView(p);

  // UX-11: ảnh chưa có số đo thì biểu mẫu đo mở sẵn cho bác sĩ (ảnh đã loại thì không). Chỉ mở, không lưu gì.
  const [auto] = useState(() => (im && p && w && me?.role === 'doctor' && im.areaCm2 === null && im.status !== 'excluded') ? editDefaults(data.images, im, p.code, w.code) : null);
  const [sharingBusy, setSharingBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [editing, setEditing] = useState(!!auto || !!retry);
  const [focusField, setFocusField] = useState(false);
  const [mode, setMode] = useState<Mode>('area');
  const [areaText, setAreaText] = useState(retry?.areaText ?? auto?.areaText ?? '');
  const [unit, setUnit] = useState<AreaUnit>('cm2');
  const [fullName, setFullName] = useState(auto?.fullName ?? '');
  const [method, setMethod] = useState(retry?.method || (auto?.method ?? ''));
  // PP-11: nguồn của giá trị điền sẵn; null khi bác sĩ tự gõ hoặc ảnh đã có phương pháp riêng.
  const [methodFrom, setMethodFrom] = useState<{ imageId: string; captureDate: string } | null>(auto?.methodFrom ?? null);
  const [justSaved, setJustSaved] = useState(false);
  // P1-06c: số cũ khi lần lưu vừa rồi là thay số (null nếu là lần đo đầu).
  const [replacedFrom, setReplacedFrom] = useState<number | null>(null);
  // P1-07c: bác sĩ chọn "Khác (ghi rõ)" khi ô còn trống.
  const [otherMethod, setOtherMethod] = useState(false);
  const saving = useRef(false);
  const [retakeNote, setRetakeNote] = useState('');
  const [excludeReason, setExcludeReason] = useState('');
  // P0 SV-05: giá trị lúc mở biểu mẫu đo; khác thì rời màn phải hỏi. Không tự lưu.
  const [editStart, setEditStart] = useState(() => JSON.stringify({ areaText: auto?.areaText ?? '', method: auto?.method ?? '', fullName: auto?.fullName ?? '' }));
  const dirty = (editing && JSON.stringify({ areaText, method, fullName }) !== editStart) || !!retakeNote.trim() || !!excludeReason.trim();
  useDiscardGuard(dirty);

  if (!im || !p || !w) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;
  const isDoctor = me?.role === 'doctor';
  const expected = { patientCode: p.code, woundCode: w.code, imageId: im.id, ext: im.ext };

  // Kết quả kiểm tra đầu vào → tên xem trước
  let preview: string | null = null;
  let error: string | null = null;
  let newArea: number | null = null;
  let needsZero = false;
  if (editing) {
    if (mode === 'area') {
      if (areaText.trim()) {
        const r = parseArea(areaText, unit);
        if (r.ok) {
          newArea = r.value;
          needsZero = r.needsZeroConfirm;
          preview = buildFilename(p.code, w.code, im.id, r.value, im.ext);
        } else error = r.error;
      }
    } else if (fullName.trim()) {
      const r = checkFullFilename(fullName, expected);
      if (r.ok) {
        newArea = r.area;
        needsZero = r.needsZeroConfirm;
        preview = buildFilename(p.code, w.code, im.id, r.area, im.ext);
      } else error = r.error;
    }
  }

  // Cảnh báo khi diện tích mới bất thường so với ngưỡng hoặc lần đo trước của cùng vết thương.
  const warning = editing && newArea !== null ? areaWarning(newArea, previousArea(data.images, im)) : null;

  const startEdit = (m: Mode = 'area') => {
    const d = editDefaults(data.images, im, p.code, w.code);
    setEditing(true);
    setOtherMethod(false);
    setFocusField(true);
    setJustSaved(false);
    setMode(m);
    setUnit('cm2');
    setAreaText(d.areaText);
    setFullName(d.fullName);
    setMethod(d.method);
    setMethodFrom(d.methodFrom);
    setEditStart(JSON.stringify({ areaText: d.areaText, method: d.method, fullName: d.fullName }));
  };

  const doSave = async () => {
    if (saving.current) return;
    saving.current = true;
    try {
      const before = im.areaCm2;
      await labelImage(im.id, newArea, method.trim() || undefined, unit === 'mm2' ? `Nhập ${areaText} mm², quy đổi sang cm²` : undefined);
      setReplacedFrom(before !== null && before !== newArea ? before : null);
      setEditing(false);
      setJustSaved(newArea !== null);
    } catch (e) {
      // Lưu thất bại: giữ nguyên số và phương pháp đang nhập để bác sĩ sửa rồi lưu lại.
      notify('Chưa lưu được', e instanceof Error ? e.message : String(e));
    } finally {
      saving.current = false;
    }
  };

  const save = () => {
    if (!preview || newArea === null) return;
    if (im.capture && !method.trim()) { notify('Thiếu phương pháp đo', 'Ghi cách bác sĩ lấy số đo tham chiếu trước khi lưu.'); return; }
    if (needsZero) {
      confirm('Diện tích bằng 0', 'Giá trị 0 là số đo có chủ ý, không dùng thay cho dữ liệu thiếu. Bác sĩ đã kiểm tra lại?', doSave, 'Lưu giá trị 0');
      return;
    }
    if (warning) {
      confirm('Kiểm tra lại diện tích', warning, doSave, 'Vẫn lưu');
      return;
    }
    doSave();
  };

  const source = im.uri ? { uri: im.uri } : DEMO_ASSETS[im.demoAsset ?? 1];
  const arArea = im.capture?.automaticMeasurement.areaCm2 ?? null;

  // UX-17: hàng đợi ảnh chưa đo của bác sĩ, cùng bộ lọc và thứ tự với B12 (mới chụp trước). Chỉ để mở ảnh kế tiếp.
  const myPatients = new Set(data.patients.filter((x) => x.doctorId === me?.id).map((x) => x.id));
  const queue = data.images
    .filter((x) => myPatients.has(x.patientId) && x.status === 'unlabeled' && x.id !== im.id)
    .sort((a, b) => b.captureDate.localeCompare(a.captureDate));
  const next = queue[0];
  const nextP = patient(next?.patientId);
  const nextW = wound(next?.woundId);

  // CR-01: chờ ghi bộ nhớ xong mới coi là đã đổi; lỗi ghi thì báo, dữ liệu trên màn giữ nguyên.
  const persist = (op: () => Promise<void>, after?: () => void) => {
    op().then(() => after?.(), (e: unknown) => notify('Chưa lưu được', e instanceof Error ? e.message : String(e)));
  };

  const exclude = () => {
    const reason = excludeReason.trim();
    if (!reason) return;
    // R-06: "Loại" có hộp xác nhận; ô lý do vẫn bắt buộc như trước.
    confirm('Loại ảnh khỏi bộ dữ liệu', `Ảnh ${im.id} sẽ không dùng cho huấn luyện. Lý do: ${reason}. Có thể đưa lại sau.`, () => {
      persist(() => setExcluded(im.id, reason), () => setExcludeReason(''));
    }, 'Loại ảnh');
  };

  const aiBlock = isDoctor ? <AiBlock wound={im.capture?.wound} arArea={arArea} /> : null;

  // P0 DS-02: người nhập và thời điểm của số bác sĩ hiện tại, chỉ lấy từ dữ liệu đã lưu; không có thì nói không có.
  // P1-07b: cùng quy tắc, chuyển sang hàm dùng chung với B08.
  const enteredBy = measurementSource(im);
  const enteredText = enteredBy ? `${account(enteredBy.by)?.name ?? 'Tài khoản không còn trong danh sách'}${enteredBy.at ? ` lúc ${fmtDateTime(enteredBy.at)}` : ''}` : 'Chưa có thông tin người nhập';
  // P0 SV-03: số mới sẽ thay số đã có.
  const replacing = editing && im.areaCm2 !== null && newArea !== null && newArea !== im.areaCm2;
  const patientChanged = !!fromPatient && fromPatient !== im.patientId;
  // P1-06a: lần đo trước của cùng vết (cùng cách chọn với cảnh báo bất thường), chỉ đọc; ô số không điền sẵn.
  const prevImg = previousMeasuredImage(data.images, im);
  const prevSrc = prevImg ? measurementSource(prevImg) : null;
  const prevText = prevImg ? [`${formatAreaDisplay(prevImg.areaCm2)}`, `chụp ${prevImg.capture?.sourceDateKnown === false ? 'chưa rõ ngày' : fmtDate(prevImg.captureDate)}`, prevImg.measureMethod?.trim() || 'chưa ghi phương pháp', prevSrc ? account(prevSrc.by)?.name ?? 'tài khoản không còn' : null].filter(Boolean).join(' · ') : null;
  // P1-06b: ảnh liền trước, liền sau của cùng vết. Mở bằng replace với key theo mã ảnh: biểu mẫu tạo mới, không mang số sang.
  const nb = neighbourImages(data.images, im);
  const dayOf = (x: WoundImage) => (x.capture?.sourceDateKnown === false ? 'chưa rõ ngày' : fmtDate(x.captureDate).slice(0, 5));
  // P1-07c: lựa chọn phương pháp dẫn xuất từ chữ trong ô; giá trị cũ ngoài danh sách hiện là "Khác" và giữ nguyên chữ.
  const methodChoice = (MEASURE_METHODS as readonly string[]).includes(method.trim()) ? method.trim() : method.trim() || otherMethod ? 'khac' : '';

  return (
    <Screen header={<Header back title={`Ảnh ${im.id}`} />}>
      {/* P0 G1, ID-01: bệnh nhân và vết thương của ảnh; báo rõ khi vừa chuyển sang bệnh nhân khác. */}
      <ClinicalContext patient={p} wound={w} patientChanged={patientChanged} />
      {retry && editing && (
        <Notice icon="alert-circle-outline">{`Ảnh ${im.id} đã lưu nhưng số đo chưa lưu${retry.error ? `: ${retry.error}` : '.'} Số và phương pháp đang nhập được điền lại bên dưới; kiểm tra rồi bấm "Lưu diện tích".`}</Notice>
      )}
      {/* UX-11: ảnh thấp hơn (16:9) để thẻ số đo lên màn đầu; chạm để xem đủ khung. */}
      <Pressable onPress={() => setZoom(true)} accessibilityRole="imagebutton" accessibilityLabel="Phóng to ảnh vết thương">
        <WoundPhoto image={im} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 20 }} />
        <View style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.scrim, borderRadius: 10, padding: 6, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Ionicons name="expand" size={14} color={C.onPrimary} />
          <Text style={{ color: C.onPrimary, fontSize: T.caption }}>Phóng to</Text>
        </View>
        {im.source === 'demo' && (
          <View style={{ position: 'absolute', left: 10, bottom: 10 }}>
            <Chip label="Ảnh mô phỏng" tone="amber" />
          </View>
        )}
      </Pressable>

      {/* P1-06b: đi giữa các ảnh của cùng vết; luôn ghi mã vết để không nhầm với hàng đợi "Ảnh chưa đo tiếp theo". */}
      <View testID="anh-cung-vet" style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', columnGap: 12 }}>
        {nb.prev ? <TextLink label={`← Ảnh trước của ${w.code} (${dayOf(nb.prev)})`} accessibilityLabel={`Ảnh trước của ${w.code}, ${nb.prev.id}, ${dayOf(nb.prev)}`} onPress={() => router.replace({ pathname: '/images/[id]', params: { id: nb.prev!.id } })} /> : <Muted>{`Ảnh đầu tiên của ${w.code}`}</Muted>}
        {nb.next ? <TextLink label={`Ảnh sau của ${w.code} (${dayOf(nb.next)}) →`} accessibilityLabel={`Ảnh sau của ${w.code}, ${nb.next.id}, ${dayOf(nb.next)}`} onPress={() => router.replace({ pathname: '/images/[id]', params: { id: nb.next!.id } })} /> : <Muted>{`Ảnh mới nhất của ${w.code}`}</Muted>}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16 }}>
        <TextLink label={`Mở ${w.code}`} accessibilityLabel={`Mở vết thương ${w.code}`} onPress={() => router.push(`/wounds/${w.id}`)} />
        <TextLink label="So sánh với ảnh khác" accessibilityLabel={`So sánh ảnh ${im.id} với ảnh khác của ${w.code}`} onPress={() => router.push({ pathname: '/compare/[woundId]', params: { woundId: w.id, sau: im.id } })} />
      </View>

      {justSaved && im.areaCm2 !== null && (
        <Notice tone="green" icon="checkmark-circle-outline">{replacedFrom !== null ? `Đã thay ${formatAreaDisplay(replacedFrom)} bằng ${formatAreaDisplay(im.areaCm2)} cho ảnh ${im.id}.` : `Đã lưu diện tích ${formatAreaDisplay(im.areaCm2)} cho ảnh ${im.id}.`}</Notice>
      )}
      {/* UX-17: vừa lưu số thì mở thẳng ảnh chưa đo kế tiếp, không phải về Trang chủ. Ảnh kế tiếp có biểu mẫu trống riêng. */}
      {isDoctor && justSaved && (next && nextP && nextW ? (
        <View style={{ gap: 4 }}>
          <Button label={next.patientId !== im.patientId ? `Ảnh chưa đo tiếp theo, bệnh nhân khác (${queue.length})` : `Ảnh chưa đo tiếp theo (${queue.length})`} icon="arrow-forward" variant="secondary"
            onPress={() => router.replace({ pathname: '/images/[id]', params: { id: next.id, tuBenhNhan: im.patientId } })} />
          <Muted>{`Tiếp theo: ${next.id} · ${nextP.name} · ${nextP.code} · ${nextW.code} ${nextW.location}`}</Muted>
        </View>
      ) : <Muted>Không còn ảnh chưa đo.</Muted>)}

      {/* Thẻ số đo: trạng thái, số bác sĩ đã đo, biểu mẫu đo và gợi ý AI ngay dưới ô nhập (R-06). */}
      <Card style={editing ? { borderWidth: 1.5, borderColor: C.primary } : undefined}>
        <SectionTitle icon="resize-outline">Diện tích</SectionTitle>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <StatusChip status={LABEL[im.status]} label={LABEL_STATUS[im.status].label} />
          {im.retakeRequested && <Chip label="Đã yêu cầu chụp lại" tone="amber" icon="refresh" />}
        </View>
        {/* Khi chưa có số đo, chip trạng thái đã nói "Chưa có nhãn diện tích": không lặp lại ở dòng giá trị (A18). */}
        {im.areaCm2 !== null && <InfoRow label="Diện tích bác sĩ đã đo" value={formatAreaDisplay(im.areaCm2)} />}
        {im.areaCm2 !== null && <StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} />}
        {im.areaCm2 !== null && <InfoRow label="Nhập bởi" value={enteredText} />}
        {im.measureMethod ? <InfoRow label="Phương pháp đo" value={im.measureMethod} /> : null}
        <InfoRow label="Ngày chụp" value={im.capture?.sourceDateKnown === false ? 'Chưa xác định (ảnh thư viện)' : fmtDate(im.captureDate)} />
        {im.excludeReason ? <InfoRow label="Lý do loại" value={im.excludeReason} /> : null}

        {isDoctor && !editing && (
          <>
            {aiBlock}
            <Button label={im.areaCm2 === null ? 'Nhập diện tích bác sĩ đã đo' : 'Sửa số đo'} icon="create-outline" onPress={() => startEdit('area')} />
          </>
        )}

        {isDoctor && editing && (
          <>
            <Divider />
            <Text accessibilityRole="header" style={{ fontSize: T.cardTitle, fontWeight: '700', color: C.text }}>
              {mode === 'full' ? 'Sửa tên đầy đủ' : im.areaCm2 === null ? 'Nhập diện tích bác sĩ đã đo' : 'Sửa số đo'}
            </Text>
            <Muted>Ứng dụng không tự đo diện tích. Nhập số đo bác sĩ đã đo bên ngoài; ứng dụng ghép thành tên đúng quy ước.</Muted>
            {mode === 'area' ? (
              <>
                <Field
                  label="Diện tích bác sĩ đã đo"
                  value={areaText}
                  onChangeText={setAreaText}
                  keyboardType="decimal-pad"
                  autoFocus={focusField}
                  error={error}
                  // Không đặt số mẫu trong ô: placeholder dạng số dễ bị đọc nhầm là giá trị đã nhập (A03, audit lần 2).
                  hint="Ví dụ: 12,5. Có thể dùng dấu phẩy hoặc dấu chấm."
                />
                {/* P1-06a: số lần trước chỉ để đối chiếu, không điền vào ô, không có nút chép. */}
                {prevText ? <Muted>{`Lần đo trước của ${w.code}: ${prevText}`}</Muted> : <Muted>{`Chưa có lần đo trước của ${w.code}.`}</Muted>}
                <Segmented<AreaUnit> value={unit} onChange={setUnit} options={[{ value: 'cm2', label: 'cm²' }, { value: 'mm2', label: 'mm² (quy đổi sang cm²)' }]} />
                {aiBlock}
              </>
            ) : (
              <>
                <Field label="Tên tệp đầy đủ" value={fullName} onChangeText={setFullName} autoCapitalize="none" autoCorrect={false} autoFocus error={error} hint="Chỉ sửa phần số sau area_; mã và đuôi tệp phải giữ nguyên." />
                <TextLink label="Quay về nhập diện tích" onPress={() => setMode('area')} />
              </>
            )}
            {/* P1-07c (QĐ-P1-3 A): cùng hai lựa chọn với B10 cộng "Khác (ghi rõ)"; ô chữ bên dưới vẫn là giá trị được lưu. */}
            <Choices<string> value={methodChoice} onChange={(v) => { if (v === 'khac') { setOtherMethod(true); if ((MEASURE_METHODS as readonly string[]).includes(method.trim())) setMethod(''); } else { setOtherMethod(false); setMethod(v); } setMethodFrom(null); }}
              options={[...MEASURE_METHODS.map((m) => ({ value: m as string, label: m as string })), { value: 'khac', label: 'Khác (ghi rõ)' }]} />
            <Field label="Phương pháp đo" optional={!im.capture}
              hint={methodFrom ? `Điền sẵn theo lần đo trước (${methodFrom.imageId}, ${fmtDate(methodFrom.captureDate)}). Sửa nếu lần này đo cách khác.` : im.capture ? undefined : "Nên ghi để so sánh được giữa các lần đo."}
              value={method} onChangeText={(v) => { setMethod(v); setMethodFrom(null); }} placeholder="Ví dụ: thước giấy kẻ ô, phần mềm đo trên máy tính…" />
            <View style={{ gap: 4 }}>
              <Text style={{ color: C.textSoft, fontSize: T.caption }}>Xem trước tên sẽ lưu</Text>
              <Text style={{ fontFamily: MONO, fontSize: T.small, color: preview ? C.green : C.textFaint, backgroundColor: preview ? C.greenSoft : C.surfaceMuted, padding: 10, borderRadius: 10 }}>
                {preview ?? '—'}
              </Text>
              {preview && newArea !== null && <Muted>Diện tích lưu trong hồ sơ: {formatAreaDisplay(newArea)}</Muted>}
              {warning && <Text accessibilityLiveRegion="polite" style={{ color: C.amber, fontSize: T.small, fontWeight: '600' }}>{warning}</Text>}
              {replacing && (
                <Text accessibilityLiveRegion="polite" style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>
                  {`Số hiện tại ${formatAreaDisplay(im.areaCm2)}${enteredBy?.at ? ` (nhập ${fmtDate(enteredBy.at)})` : ''} sẽ được thay bằng ${formatAreaDisplay(newArea)}. Số cũ vẫn ở Lịch sử sửa nhãn.`}
                </Text>
              )}
            </View>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Button style={{ flex: 1 }} label="Hủy" variant="secondary" onPress={() => setEditing(false)} />
              <Button style={{ flex: 1 }} label={replacing ? 'Lưu số mới' : 'Lưu diện tích'} icon="checkmark" disabled={!preview} onPress={save} reason="Nhập diện tích hợp lệ để có tên xem trước." />
            </View>
            {im.areaCm2 !== null && (
              <Pressable
                accessibilityRole="button"
                style={{ minHeight: 44, justifyContent: 'center' }}
                onPress={() =>
                  confirm('Gỡ nhãn diện tích', 'Ảnh sẽ trở về trạng thái "Chưa có nhãn diện tích" (không đặt thành 0).', () => {
                    persist(() => labelImage(im.id, null, undefined, 'Gỡ nhãn'), () => {
                      setEditing(false);
                      setJustSaved(false);
                    });
                  })
                }>
                <Text style={{ color: C.red, fontWeight: '600', textAlign: 'center' }}>Gỡ nhãn diện tích</Text>
              </Pressable>
            )}
          </>
        )}
      </Card>

      {/* Thao tác ít dùng và thông tin kỹ thuật thu gọn (R-06). Nội dung đang gõ trong các mục này giữ nguyên khi đóng mở. */}
      <Card style={{ gap: 6 }}>
        {isDoctor && (
          <>
            <Pressable accessibilityRole="button" accessibilityLabel="Ghi đánh giá với ảnh này"
              onPress={() => router.push({ pathname: '/evaluate/[woundId]', params: { woundId: w.id, imageId: im.id } })}
              style={({ pressed }) => ({ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, opacity: pressed ? 0.7 : 1 })}>
              <Ionicons name="clipboard-outline" size={22} color={C.primary} />
              <Text style={{ flex: 1, color: C.text, fontWeight: '700' }}>Ghi đánh giá với ảnh này</Text>
              <Ionicons name="chevron-forward" size={22} color={C.textSoft} />
            </Pressable>
            <Divider />
            <Disclosure icon="share-outline" title="Chia sẻ cho bên kỹ thuật" summary={im.researchReady ? 'Đã kiểm tra và chia sẻ' : 'Chưa đưa vào kho dữ liệu'}>
              <Muted>Chỉ xác nhận khi ảnh không có mặt, tên, giấy tờ hay thông tin nhận dạng. Ứng dụng tạo bản sao PNG bỏ siêu dữ liệu; giữ nguyên ảnh gốc trong hồ sơ.</Muted>
              <Button label={im.researchReady ? 'Ngừng chia sẻ ảnh' : 'Xác nhận ảnh và chia sẻ'} variant="secondary" loading={sharingBusy}
                disabled={!im.researchReady && (im.areaCm2 === null || im.status !== 'labeled' || !p.researchConsent || im.source === 'patient')}
                reason={im.source === 'patient' ? 'Ảnh bệnh nhân tự chụp không đưa vào kho dữ liệu.' : !p.researchConsent ? 'Bệnh nhân chưa đồng ý dùng ảnh cho nghiên cứu.' : 'Nhập diện tích bác sĩ đã đo trước khi chia sẻ.'}
                onPress={() => confirm(im.researchReady ? 'Ngừng chia sẻ' : 'Kiểm tra nội dung ảnh', im.researchReady ? 'Ảnh sẽ không còn trong kho kỹ thuật. Tệp đã tải trước đó không tự thu hồi.' : 'Tôi đã kiểm tra ảnh không chứa khuôn mặt, tên, giấy tờ hoặc thông tin nhận dạng cá nhân.', async () => {
                  setSharingBusy(true);
                  try { await setResearchReady(im.id, !im.researchReady); }
                  catch(e) { notify('Chưa cập nhật được ảnh', String(e)); }
                  finally { setSharingBusy(false); }
                })} />
              {!p.researchConsent && im.researchReady && <Muted>Bệnh nhân chưa đồng ý sử dụng ảnh cho nghiên cứu.</Muted>}
            </Disclosure>
            <Divider />
            <Disclosure icon="refresh-outline" title="Yêu cầu chụp lại, loại ảnh"
              summary={[im.retakeRequested ? 'Đã yêu cầu chụp lại' : null, im.status === 'excluded' ? 'Đã loại khỏi bộ dữ liệu' : null].filter(Boolean).join(' · ') || 'Chưa có yêu cầu'}>
              {im.retakeRequested ? (
                <Button label="Hủy yêu cầu chụp lại" variant="ghost" onPress={() => persist(() => requestRetake(im.id, null))} />
              ) : (
                <>
                  <Field label="Yêu cầu chụp lại" value={retakeNote} onChangeText={setRetakeNote} placeholder="Ảnh mờ / sai vị trí / thiếu sáng…" />
                  <Button
                    label="Gửi yêu cầu chụp lại"
                    variant="secondary"
                    icon="refresh"
                    disabled={!retakeNote.trim()}
                    onPress={() => {
                      persist(() => requestRetake(im.id, retakeNote.trim()), () => {
                        setRetakeNote('');
                        notify('Đã gửi', 'Bệnh nhân sẽ thấy yêu cầu chụp lại trên trang chủ.');
                      });
                    }}
                  />
                </>
              )}
              {im.status === 'excluded' ? (
                <Button label="Đưa lại vào bộ dữ liệu" variant="secondary" icon="return-up-back" onPress={() => persist(() => setExcluded(im.id, null))} />
              ) : (
                <>
                  <Field label="Loại khỏi bộ dữ liệu huấn luyện" value={excludeReason} onChangeText={setExcludeReason} placeholder="Lý do, ví dụ: ảnh chứa nhiều vết thương" />
                  <Button label="Loại khỏi bộ dữ liệu" variant="danger" icon="remove-circle-outline" disabled={!excludeReason.trim()} onPress={exclude} />
                </>
              )}
            </Disclosure>
            <Divider />
          </>
        )}
        {/* UX-12, UX-28: thông tin lần chụp, chất lượng ảnh, tên tệp và "Sửa tên đầy đủ" gộp một mục.
            Bỏ khỏi phần hiển thị hai dòng trùng ("Số đo tham chiếu bác sĩ", "Diện tích ước lượng AR"); trường dữ liệu giữ nguyên. */}
        <Disclosure icon="document-text-outline" title="Thông tin lần chụp và chi tiết kỹ thuật" summary="Nguồn ảnh, AR, chất lượng, tên tệp, mã">
          <InfoRow label="Ngày tải lên" value={fmtDate(im.uploadDate)} />
          <InfoRow label="Người tải" value={im.source === 'demo' ? 'Dữ liệu mô phỏng' : account(im.uploadedBy)?.name ?? '—'} />
          {im.capture && <>
            <InfoRow label="Nguồn ảnh" value={im.capture.imageSource === 'gallery' ? 'Thư viện ảnh' : 'Camera có hướng dẫn'} />
            <InfoRow label="Cách chụp" value={im.capture.shutter?.trigger === 'steady_auto' ? 'Tự chụp sau khi giữ yên 3 giây' : im.capture.imageSource === 'gallery' ? 'Chọn ảnh có sẵn' : 'Bác sĩ bấm chụp'} />
            <InfoRow label="Phiên AR" value={im.capture.ar ? (im.capture.ar.framework === 'arkit' ? 'ARKit' : 'ARCore') + ' · theo dõi ổn định lúc chụp' : 'Không có'} />
            {im.capture.ar ? <>
              <InfoRow label="Khoảng cách tới tâm khung" value={im.capture.distance.valueM !== null ? `${Math.round(im.capture.distance.valueM * 100)} cm (ước lượng)` : 'Chưa nhận được bề mặt'} />
              <InfoRow label="Bản đồ chiều sâu" value={im.capture.ar.depth ? `${im.capture.ar.depth.width}×${im.capture.ar.depth.height}` : 'Không có'} />
              <InfoRow label="Thông số camera, tư thế máy" value="Đã lưu" />
            </> : null}
            <InfoRow label="Vết thương được khoanh" value={im.capture.wound ? `Có · ${(im.capture.wound.areaFraction * 100).toFixed(1).replace('.', ',')}% ảnh` : 'Không'} />
            <InfoRow label="Đã kiểm tra bằng mắt" value={[im.capture.visualReview.framing && 'Bố cục', im.capture.visualReview.lighting && 'Ánh sáng', im.capture.visualReview.sharpness && 'Độ nét'].filter(Boolean).join(' · ') || 'Chưa xác nhận'} />
            <Muted>{im.capture.ar ? 'Ảnh gốc được giữ nguyên cùng dữ liệu AR của đúng frame đã chụp. Diện tích bác sĩ nhập là số đo tham chiếu; dữ liệu AR không ghi đè số này.' : 'Ảnh gốc được giữ nguyên. Ảnh này không có dữ liệu AR để quy đổi pixel thành cm².'}</Muted>
            <CaptureQualityCard quality={im.capture.quality} />
          </>}
          <Text style={{ color: C.textSoft, fontSize: T.caption }}>Tên tệp hiện tại</Text>
          <Text selectable style={{ fontFamily: MONO, fontSize: T.small, color: C.text, backgroundColor: C.surfaceMuted, padding: 10, borderRadius: 10 }}>{im.filename}</Text>
          <InfoRow label="Mã bệnh nhân" value={p.code} />
          <InfoRow label="Mã vết thương" value={w.code} />
          <InfoRow label="Mã ảnh (cố định)" value={im.id} />
          {isDoctor && !(editing && mode === 'full') && (
            <Button label="Sửa tên đầy đủ" variant="ghost" icon="text-outline" onPress={() => (editing ? setMode('full') : startEdit('full'))} />
          )}
        </Disclosure>
        {isDoctor && (
          <>
            <Divider />
            <Disclosure icon="time-outline" title="Lịch sử sửa nhãn" summary={im.history.length === 0 ? 'Chưa có thay đổi' : `${im.history.length} thay đổi`}>
              {im.history.length === 0 && <Muted>Chưa có thay đổi.</Muted>}
              {[...im.history].reverse().map((h, i) => (
                <View key={i} style={{ gap: 2, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
                  <Text style={{ color: C.text, fontWeight: '600', fontSize: T.small }}>
                    {fmtDateTime(h.at)} · {account(h.by)?.name ?? 'Dữ liệu mô phỏng'}
                  </Text>
                  <Muted>{formatAreaDisplay(h.fromArea)} → {formatAreaDisplay(h.toArea)}</Muted>
                  <Text style={{ fontFamily: MONO, fontSize: T.caption, color: C.textFaint }}>{h.toName}</Text>
                  {h.note ? <Muted>{h.note}</Muted> : null}
                </View>
              ))}
            </Disclosure>
          </>
        )}
      </Card>

      <Modal visible={zoom} animationType="fade" onRequestClose={() => setZoom(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <ScrollView
            maximumZoomScale={5}
            minimumZoomScale={1}
            centerContent
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            <Image source={source} style={{ width: '100%', aspectRatio: 4 / 3 }} contentFit="contain" />
          </ScrollView>
          <Pressable onPress={() => setZoom(false)} style={{ position: 'absolute', top: insets.top + 12, right: 16, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: 8 }} accessibilityLabel="Đóng">
            <Ionicons name="close" size={24} color={C.onPrimary} />
          </Pressable>
          <Text style={{ position: 'absolute', bottom: insets.bottom + 16, alignSelf: 'center', color: C.onDarkSoft, fontSize: T.caption }}>Chụm hai ngón để phóng to</Text>
        </View>
      </Modal>
    </Screen>
  );
}

// Gợi ý của AI nằm trong thẻ diện tích, nền tím riêng, luôn ghi nguồn và "chưa kiểm chứng" (V06, R-06).
// Chỉ hiển thị: không điền vào ô, không ghi đè số đo (QĐ-1).
function AiBlock({ wound, arArea }: { wound: { detector: string; modelVersion?: string; confidence?: number | null; areaCm2?: number | null; areaFraction: number } | undefined; arArea: number | null }) {
  const box = { gap: 6, backgroundColor: C.violetSoft, borderRadius: 12, padding: 12 } as const;
  if (!wound) {
    return (
      <View style={box} accessible accessibilityLabel={`Gợi ý của AI. ${arArea !== null ? `Ước lượng AR ${formatAreaDisplay(arArea)}, chưa kiểm chứng.` : 'Ảnh này chưa có kết quả nhận diện.'}`}>
        <StatusChip status={SOURCE.ai} label={SOURCE.ai.label} />
        {arArea !== null && <InfoRow label="Ước lượng AR (tham khảo)" value={`${formatAreaDisplay(arArea)} (chưa kiểm chứng)`} />}
        <Muted>Ảnh này chưa có kết quả nhận diện. Ảnh chụp bằng Chụp có hướng dẫn sẽ được khoanh vết thương tự động.</Muted>
      </View>
    );
  }
  const level = aiConfidenceLevel(wound.confidence ?? null);
  const area = wound.areaCm2 ?? arArea;
  return (
    <View style={box}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <StatusChip status={SOURCE.ai} label={SOURCE.ai.label} />
        <StatusChip status={AI_CONFIDENCE[level]} label={AI_CONFIDENCE[level].label} />
      </View>
      <InfoRow label="Diện tích ước lượng (tham khảo)" value={area !== null ? `${formatAreaDisplay(area)} (chưa kiểm chứng)` : 'Không có (thiếu dữ liệu AR)'} />
      <InfoRow label="Vùng vết thương" value={`${(wound.areaFraction * 100).toFixed(1).replace('.', ',')}% ảnh`} />
      <InfoRow label="Mô-đun" value={wound.modelVersion ? `${wound.detector} ${wound.modelVersion}` : wound.detector} />
      <Muted>Số của AI chỉ để tham khảo, không tự điền vào ô. Diện tích dùng cho theo dõi và bộ dữ liệu là số bác sĩ đã đo.</Muted>
    </View>
  );
}
