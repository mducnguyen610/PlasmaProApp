import { CaptureQualityCard } from '@/components/CaptureQualityCard';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { MONO, Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NoAccess, useCanView } from '@/components/Guard';
import { Button, Card, Chip, Field, Header, InfoRow, Muted, Screen, SectionTitle, Segmented, StatusChip, WoundPhoto } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, LABEL_STATUS } from '@/lib/format';
import { buildFilename, checkFullFilename, formatAreaDisplay, formatAreaForName, parseArea, type AreaUnit } from '@/lib/naming';
import { areaWarning, previousArea } from '@/lib/plausibility';
import { DEMO_ASSETS } from '@/lib/seed';
import { useLookups, useStore } from '@/lib/store';
import { C } from '@/theme';
import { AI_CONFIDENCE, aiConfidenceLevel, SOURCE } from '@/theme.status';

type Mode = 'area' | 'full';

// BS05 – Xem ảnh và đổi tên theo diện tích bác sĩ đã đo (đặc tả mục 4).
export default function ImageDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, me, labelImage, setExcluded, requestRetake, setResearchReady } = useStore();
  const { patient, wound, account } = useLookups();
  const insets = useSafeAreaInsets();
  const im = data.images.find((x) => x.id === id);
  const p = patient(im?.patientId);
  const w = wound(im?.woundId);
  const canView = useCanView(p);

  const [sharingBusy, setSharingBusy] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [editing, setEditing] = useState(false);
  const [mode, setMode] = useState<Mode>('area');
  const [areaText, setAreaText] = useState('');
  const [unit, setUnit] = useState<AreaUnit>('cm2');
  const [fullName, setFullName] = useState('');
  const [method, setMethod] = useState('');
  const [retakeNote, setRetakeNote] = useState('');
  const [excludeReason, setExcludeReason] = useState('');

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

  const startEdit = () => {
    setEditing(true);
    setMode('area');
    setUnit('cm2');
    setAreaText(im.areaCm2 !== null ? formatAreaForName(im.areaCm2).replace('.', ',') : '');
    setFullName(im.areaCm2 !== null ? im.filename : `${p.code}_${w.code}_${im.id}_area__cm2.${im.ext}`);
    setMethod(im.measureMethod ?? '');
  };

  const doSave = () => {
    labelImage(im.id, newArea, method.trim() || undefined, unit === 'mm2' ? `Nhập ${areaText} mm², quy đổi sang cm²` : undefined);
    setEditing(false);
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

  return (
    <Screen header={<Header back title={`Ảnh ${im.id}`} subtitle={`${p.code} · ${w.code} · ${w.location}`} />}>
      <Pressable onPress={() => setZoom(true)} accessibilityRole="imagebutton" accessibilityLabel="Phóng to ảnh vết thương">
        <WoundPhoto image={im} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 20 }} />
        <View style={{ position: 'absolute', right: 10, bottom: 10, backgroundColor: C.scrim, borderRadius: 10, padding: 6, flexDirection: 'row', gap: 4, alignItems: 'center' }}>
          <Ionicons name="expand" size={14} color={C.onPrimary} />
          <Text style={{ color: C.onPrimary, fontSize: 13 }}>Phóng to</Text>
        </View>
        {im.source === 'demo' && (
          <View style={{ position: 'absolute', left: 10, bottom: 10 }}>
            <Chip label="Ảnh mô phỏng" tone="amber" />
          </View>
        )}
      </Pressable>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Chip label={LABEL_STATUS[im.status].label} tone={LABEL_STATUS[im.status].tone} />
          {im.retakeRequested && <Chip label="Đã yêu cầu chụp lại" tone="red" icon="refresh" />}
        </View>
        <Text style={{ color: C.textSoft, fontSize: 13 }}>Tên hiện tại</Text>
        <Text selectable style={{ fontFamily: MONO, fontSize: 14, color: C.text, backgroundColor: C.surfaceMuted, padding: 10, borderRadius: 10 }}>{im.filename}</Text>
        <InfoRow label="Diện tích bác sĩ đã đo" value={formatAreaDisplay(im.areaCm2)} />
        {im.areaCm2 !== null && <StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} />}
        {im.measureMethod ? <InfoRow label="Phương pháp đo" value={im.measureMethod} /> : null}
        <InfoRow label="Mã bệnh nhân" value={p.code} />
        <InfoRow label="Mã vết thương" value={w.code} />
        <InfoRow label="Mã ảnh (cố định)" value={im.id} />
        <InfoRow label="Ngày chụp" value={im.capture?.sourceDateKnown === false ? 'Chưa xác định (ảnh thư viện)' : fmtDate(im.captureDate)} />
        <InfoRow label="Ngày tải lên" value={fmtDate(im.uploadDate)} />
        <InfoRow label="Người tải" value={im.source === 'demo' ? 'Dữ liệu mô phỏng' : account(im.uploadedBy)?.name ?? '—'} />
        {im.excludeReason ? <InfoRow label="Lý do loại" value={im.excludeReason} /> : null}
      </Card>

      {/* Kết quả nhận diện tách khỏi số đo của bác sĩ, luôn ghi nguồn và độ tin cậy (V06). Chỉ hiển thị, không ghi đè số đo. */}
      {isDoctor && <AiResultCard wound={im.capture?.wound} arArea={im.capture?.automaticMeasurement.areaCm2 ?? null} />}

      {im.capture && <>
        <Card>
          <SectionTitle>Thông tin lần chụp</SectionTitle>
          <InfoRow label="Nguồn ảnh" value={im.capture.imageSource === 'gallery' ? 'Thư viện ảnh' : 'Camera có hướng dẫn'} />
          <InfoRow label="Cách chụp" value={im.capture.shutter?.trigger === 'steady_auto' ? 'Tự chụp sau khi giữ yên 3 giây' : im.capture.imageSource === 'gallery' ? 'Chọn ảnh có sẵn' : 'Bác sĩ bấm chụp'} />
          <InfoRow label="Phiên AR" value={im.capture.ar ? (im.capture.ar.framework === 'arkit' ? 'ARKit' : 'ARCore') + ' · theo dõi ổn định lúc chụp' : 'Không có'} />
          {im.capture.ar ? <>
            <InfoRow label="Khoảng cách tới tâm khung" value={im.capture.distance.valueM !== null ? `${Math.round(im.capture.distance.valueM * 100)} cm (ước lượng)` : 'Chưa nhận được bề mặt'} />
            <InfoRow label="Bản đồ chiều sâu" value={im.capture.ar.depth ? `${im.capture.ar.depth.width}×${im.capture.ar.depth.height}` : 'Không có'} />
            <InfoRow label="Thông số camera, tư thế máy" value="Đã lưu" />
          </> : null}
          <InfoRow label="Vết thương được khoanh" value={im.capture.wound ? `Có · ${(im.capture.wound.areaFraction * 100).toFixed(1).replace('.', ',')}% ảnh` : 'Không'} />
          <InfoRow label="Diện tích ước lượng AR" value={im.capture.automaticMeasurement.areaCm2 !== null ? `${formatAreaDisplay(im.capture.automaticMeasurement.areaCm2)} (chưa kiểm chứng)` : 'Không có'} />
          <InfoRow label="Số đo tham chiếu bác sĩ" value={formatAreaDisplay(im.capture.manualReference.areaCm2)} />
          <InfoRow label="Đã kiểm tra bằng mắt" value={[im.capture.visualReview.framing && 'Bố cục', im.capture.visualReview.lighting && 'Ánh sáng', im.capture.visualReview.sharpness && 'Độ nét'].filter(Boolean).join(' · ') || 'Chưa xác nhận'} />
          <Muted>{im.capture.ar ? 'Ảnh gốc được giữ nguyên cùng dữ liệu AR của đúng frame đã chụp. Diện tích bác sĩ nhập là số đo tham chiếu; dữ liệu AR không ghi đè số này.' : 'Ảnh gốc được giữ nguyên. Ảnh này không có dữ liệu AR để quy đổi pixel thành cm².'}</Muted>
        </Card>
        <CaptureQualityCard quality={im.capture.quality} />
      </>}
      {isDoctor && <Card>
        <SectionTitle>Chia sẻ cho bên kỹ thuật</SectionTitle>
        <Chip label={im.researchReady ? 'Đã kiểm tra và chia sẻ' : 'Chưa đưa vào kho dữ liệu'} tone={im.researchReady ? 'green' : 'gray'} />
        <Muted>Chỉ xác nhận khi ảnh không có mặt, tên, giấy tờ hay thông tin nhận dạng. App tạo bản sao PNG bỏ metadata; giữ nguyên ảnh gốc trong hồ sơ.</Muted>
        <Button label={im.researchReady ? 'Ngừng chia sẻ ảnh' : 'Xác nhận ảnh và chia sẻ'} variant="secondary" loading={sharingBusy}
          disabled={!im.researchReady && (im.areaCm2 === null || im.status !== 'labeled' || !p.researchConsent || im.source === 'patient')}
          onPress={() => confirm(im.researchReady ? 'Ngừng chia sẻ' : 'Kiểm tra nội dung ảnh', im.researchReady ? 'Ảnh sẽ không còn trong kho kỹ thuật. Tệp đã tải trước đó không tự thu hồi.' : 'Tôi đã kiểm tra ảnh không chứa khuôn mặt, tên, giấy tờ hoặc thông tin nhận dạng cá nhân.', async () => {
            setSharingBusy(true);
            try { await setResearchReady(im.id, !im.researchReady); }
            catch(e) { notify('Chưa cập nhật được ảnh', String(e)); }
            finally { setSharingBusy(false); }
          })} />
        {!p.researchConsent && <Muted>Bệnh nhân chưa đồng ý sử dụng ảnh cho nghiên cứu.</Muted>}
      </Card>}
      {isDoctor && !editing && <Button label={im.areaCm2 === null ? "Nhập diện tích bác sĩ đã đo" : "Sửa số đo / tên ảnh"} icon="create-outline" onPress={startEdit} />}

      {isDoctor && editing && (
        <Card style={{ borderWidth: 1.5, borderColor: C.primary }}>
          <SectionTitle icon="create-outline">Sửa tên theo diện tích đã đo</SectionTitle>
          <Muted>Ứng dụng không tự đo diện tích. Nhập số đo bác sĩ đã đo bên ngoài; ứng dụng ghép thành tên đúng quy ước.</Muted>
          <Segmented<Mode> value={mode} onChange={setMode} options={[{ value: 'area', label: 'Nhập diện tích' }, { value: 'full', label: 'Sửa tên đầy đủ' }]} />
          {mode === 'area' ? (
            <>
              <Field
                label="Diện tích bác sĩ đã đo"
                value={areaText}
                onChangeText={setAreaText}
                keyboardType="decimal-pad"
                placeholder="12,5"
                autoFocus
                error={error}
                hint="Có thể dùng dấu phẩy hoặc dấu chấm."
              />
              <Segmented<AreaUnit> value={unit} onChange={setUnit} options={[{ value: 'cm2', label: 'cm²' }, { value: 'mm2', label: 'mm² (quy đổi sang cm²)' }]} />
            </>
          ) : (
            <Field label="Tên tệp đầy đủ" value={fullName} onChangeText={setFullName} autoCapitalize="none" autoCorrect={false} error={error} hint="Chỉ sửa phần số sau area_; mã và đuôi tệp phải giữ nguyên." />
          )}
          <Field label={im.capture ? "Phương pháp đo (bắt buộc)" : "Phương pháp đo (khuyến nghị)"} value={method} onChangeText={setMethod} placeholder="Ví dụ: thước giấy kẻ ô, phần mềm đo trên máy tính…" />
          <View style={{ gap: 4 }}>
            <Text style={{ color: C.textSoft, fontSize: 13 }}>Xem trước tên sẽ lưu</Text>
            <Text style={{ fontFamily: MONO, fontSize: 14, color: preview ? C.green : C.textFaint, backgroundColor: preview ? C.greenSoft : C.surfaceMuted, padding: 10, borderRadius: 10 }}>
              {preview ?? '—'}
            </Text>
            {preview && newArea !== null && <Muted>Diện tích lưu trong hồ sơ: {formatAreaDisplay(newArea)}</Muted>}
            {warning && <Text accessibilityLiveRegion="polite" style={{ color: C.amber, fontSize: 14, fontWeight: '600' }}>{warning}</Text>}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button style={{ flex: 1 }} label="Hủy" variant="secondary" onPress={() => setEditing(false)} />
            <Button style={{ flex: 1 }} label="Lưu" icon="checkmark" disabled={!preview} onPress={save} />
          </View>
          {im.areaCm2 !== null && (
            <Pressable
              onPress={() =>
                confirm('Gỡ nhãn diện tích', 'Ảnh sẽ trở về trạng thái "Chưa có nhãn diện tích" (không đặt thành 0).', () => {
                  labelImage(im.id, null, undefined, 'Gỡ nhãn');
                  setEditing(false);
                })
              }>
              <Text style={{ color: C.red, fontWeight: '600', textAlign: 'center' }}>Gỡ nhãn diện tích</Text>
            </Pressable>
          )}
        </Card>
      )}

      {isDoctor && (
        <Card>
          <SectionTitle icon="options-outline">Thao tác khác</SectionTitle>
          <Button
            label="Ghi đánh giá với ảnh này"
            variant="secondary"
            icon="clipboard-outline"
            onPress={() => router.push({ pathname: '/evaluate/[woundId]', params: { woundId: w.id, imageId: im.id } })}
          />
          {im.retakeRequested ? (
            <Button label="Hủy yêu cầu chụp lại" variant="ghost" onPress={() => requestRetake(im.id, null)} />
          ) : (
            <>
              <Field label="Yêu cầu chụp lại" value={retakeNote} onChangeText={setRetakeNote} placeholder="Ảnh mờ / sai vị trí / thiếu sáng…" />
              <Button
                label="Gửi yêu cầu chụp lại"
                variant="secondary"
                icon="refresh"
                disabled={!retakeNote.trim()}
                onPress={() => {
                  requestRetake(im.id, retakeNote.trim());
                  setRetakeNote('');
                  notify('Đã gửi', 'Bệnh nhân sẽ thấy yêu cầu chụp lại trên trang chủ.');
                }}
              />
            </>
          )}
          {im.status === 'excluded' ? (
            <Button label="Đưa lại vào bộ dữ liệu" variant="secondary" icon="return-up-back" onPress={() => setExcluded(im.id, null)} />
          ) : (
            <>
              <Field label="Loại khỏi bộ dữ liệu huấn luyện" value={excludeReason} onChangeText={setExcludeReason} placeholder="Lý do, ví dụ: ảnh chứa nhiều vết thương" />
              <Button
                label="Loại khỏi bộ dữ liệu"
                variant="danger"
                icon="remove-circle-outline"
                disabled={!excludeReason.trim()}
                onPress={() => {
                  setExcluded(im.id, excludeReason.trim());
                  setExcludeReason('');
                }}
              />
            </>
          )}
        </Card>
      )}

      {isDoctor && (
        <Card>
          <SectionTitle icon="time-outline">Lịch sử sửa nhãn</SectionTitle>
          {im.history.length === 0 && <Muted>Chưa có thay đổi.</Muted>}
          {[...im.history].reverse().map((h, i) => (
            <View key={i} style={{ gap: 2, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <Text style={{ color: C.text, fontWeight: '600', fontSize: 14 }}>
                {fmtDateTime(h.at)} · {account(h.by)?.name ?? 'Dữ liệu mô phỏng'}
              </Text>
              <Muted>{formatAreaDisplay(h.fromArea)} → {formatAreaDisplay(h.toArea)}</Muted>
              <Text style={{ fontFamily: MONO, fontSize: 13, color: C.textFaint }}>{h.toName}</Text>
              {h.note ? <Muted>{h.note}</Muted> : null}
            </View>
          ))}
        </Card>
      )}

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
          <Text style={{ position: 'absolute', bottom: insets.bottom + 16, alignSelf: 'center', color: C.onDarkSoft, fontSize: 13 }}>Chụm hai ngón để phóng to</Text>
        </View>
      </Modal>
    </Screen>
  );
}

function AiResultCard({ wound, arArea }: { wound: { detector: string; modelVersion?: string; confidence?: number | null; areaCm2?: number | null; areaFraction: number } | undefined; arArea: number | null }) {
  if (!wound) {
    return (
      <Card>
        <SectionTitle>Gợi ý của AI</SectionTitle>
        <Muted>Ảnh này chưa có kết quả nhận diện. Ảnh chụp bằng Chụp có hướng dẫn sẽ được khoanh vết thương tự động.</Muted>
      </Card>
    );
  }
  const level = aiConfidenceLevel(wound.confidence ?? null);
  const area = wound.areaCm2 ?? arArea;
  return (
    <Card>
      <SectionTitle>Gợi ý của AI</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <StatusChip status={SOURCE.ai} label={SOURCE.ai.label} />
        <StatusChip status={AI_CONFIDENCE[level]} label={AI_CONFIDENCE[level].label} />
      </View>
      <InfoRow label="Diện tích ước lượng" value={area !== null ? `${formatAreaDisplay(area)} (chưa kiểm chứng)` : 'Không có (thiếu dữ liệu AR)'} />
      <InfoRow label="Vùng vết thương" value={`${(wound.areaFraction * 100).toFixed(1).replace('.', ',')}% ảnh`} />
      <InfoRow label="Mô-đun" value={wound.modelVersion ? `${wound.detector} ${wound.modelVersion}` : wound.detector} />
      <Muted>Số của AI chỉ để tham khảo. Diện tích dùng cho theo dõi và bộ dữ liệu là số bác sĩ đã đo ở trên.</Muted>
    </Card>
  );
}
