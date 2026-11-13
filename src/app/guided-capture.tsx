import Ionicons from '@expo/vector-icons/Ionicons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import { Image } from 'expo-image';
import { router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, useWindowDimensions, View } from 'react-native';
import { ARCameraView, arViewInBuild, type ARCameraHandle } from '@/components/ARCameraView';
import { ClinicalContext } from '@/components/ClinicalContext';
import { CheckRow } from '@/components/Consent';
import { CaptureQualityCard } from '@/components/CaptureQualityCard';
import { NoAccess, useCanView } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Choices, Field, Header, InfoRow, Muted, Screen, SectionTitle, StatusChip, StepRow } from '@/components/ui';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { WoundOutline, WoundOverlay } from '@/components/WoundOverlay';
import { getRecognizer, type RecognitionResult } from '@/lib/ai';
import { analyzeImage } from '@/lib/capture/analyzeImage';
import { assessCapture, distanceSource, estimateAreaCm2, HIT_SOURCE_LABEL, type ARCaptureData, type ARSessionError, type ARTone, type ARTrackingEvent, type LiveCheck } from '@/lib/capture/ar';
import { inspectCapabilities } from '@/lib/capture/capabilities';
import { DEFAULT_ROI, unknownQuality } from '@/lib/capture/quality';
import type { CaptureMetadata, CaptureQuality, DeviceCapabilities, Roi } from '@/lib/capture/types';
import { useWoundTracker } from '@/lib/capture/useWoundTracker';
import { waitForFrame } from '@/lib/capture/waitForFrame';
import { coverMap } from '@/lib/capture/woundDetect';
import { confirm } from '@/lib/dialog';
import { MEASURE_METHODS } from '@/lib/measureMethod';
import { formatAreaDisplay, parseArea } from '@/lib/naming';
import { pickPhoto, type PickedPhoto } from '@/lib/photos';
import { useLookups, useStore } from '@/lib/store';
import { bar, C } from '@/theme';
import { SOURCE } from '@/theme.status';
import { localDay } from '@/lib/course';

type Photo = PickedPhoto & { imageSource: 'live_camera' | 'gallery'; takenAt: string | null; ar?: ARCaptureData; manualOverride?: boolean };
const TONE_COLOR: Record<ARTone, string> = { green: C.green, amber: C.amber, red: C.red, gray: C.textSoft };
// P0 DS-01 (QĐ-P0-1 phương án B): bỏ lựa chọn "Ước lượng AR, bác sĩ đã xem lại"; phương pháp chỉ còn các cách bác sĩ đo, không chọn sẵn.
// P1-07c: danh sách chuyển sang measureMethod.ts để B11 dùng chung, nội dung không đổi.
const METHODS = MEASURE_METHODS;

function roiFrom(detection: RecognitionResult | null): Roi {
  if (!detection?.found || !detection.box) return DEFAULT_ROI;
  const b = detection.box, pad = 0.15;
  const x = Math.max(0, b.x - b.width * pad), y = Math.max(0, b.y - b.height * pad);
  return { x, y, width: Math.min(1 - x, b.width * (1 + 2 * pad)), height: Math.min(1 - y, b.height * (1 + 2 * pad)) };
}

function estimateFor(photo: Photo | null, found: RecognitionResult | null) {
  const hit = photo?.ar?.centerHit;
  if (!photo?.ar || !hit || !found?.found || !found.center || found.areaFraction === null) return null;
  return estimateAreaCm2({
    areaFraction: found.areaFraction, imageWidth: photo.width, imageHeight: photo.height,
    intrinsics: photo.ar.intrinsics, distanceM: hit.centerDistanceM, point: found.center,
    planeNormal: hit.planeNormal, cameraForward: photo.ar.cameraForward,
  });
}

/** P1-05a: chỉ đổi thứ tự hiển thị: chưa đạt, chưa biết, đạt; giữ thứ tự gốc trong cùng nhóm. Không đổi mảng gốc hay `ready`. */
function orderChecks(checks: LiveCheck[]): LiveCheck[] {
  const rank = (c: LiveCheck) => (c.ok === false ? 0 : c.ok === null ? 1 : 2);
  return checks.map((c, i) => ({ c, i })).sort((a, b) => rank(a.c) - rank(b.c) || a.i - b.i).map((x) => x.c);
}

function CheckList({ checks }: { checks: LiveCheck[] }) {
  return <View style={{ gap: 8 }}>
    {orderChecks(checks).map(c => {
      const color = c.ok === true ? TONE_COLOR.green : c.ok === false ? TONE_COLOR.amber : TONE_COLOR.gray;
      return <View key={c.key} style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <Ionicons name={c.ok === true ? 'checkmark-circle' : c.ok === false ? 'alert-circle' : 'ellipsis-horizontal-circle'} size={22} color={color} />
        <Text style={{ minWidth: 92, maxWidth: '40%', color: C.text, fontWeight: '700' }}>{c.label}</Text>
        <Text style={{ flex: 1, color }}>{c.detail}</Text>
      </View>;
    })}
  </View>;
}

export default function GuidedCapture() {
  const { woundId } = useLocalSearchParams<{ woundId: string }>();
  const { me, addImage, labelImage } = useStore();
  const { wound, patient } = useLookups();
  const w = wound(woundId), p = patient(w?.patientId);
  const canView = useCanView(p), focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const arCamera = useRef<ARCameraHandle>(null);
  const session = useRef(Crypto.randomUUID());
  const generation = useRef(0);
  const shutterLocked = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [live, setLive] = useState(false);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [capabilities, setCapabilities] = useState<DeviceCapabilities | null>(null);
  const [quality, setQuality] = useState<CaptureQuality>(unknownQuality());
  const [photoWound, setPhotoWound] = useState<RecognitionResult | null>(null);
  const [reviewed, setReviewed] = useState(false);
  const [areaText, setAreaText] = useState('');
  const [method, setMethod] = useState('');
  const [error, setError] = useState('');
  const [cameraMode, setCameraMode] = useState<'ar' | 'standard'>('ar');
  const [tracking, setTracking] = useState<{ event: ARTrackingEvent; at: number } | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState({ width: 0, height: 0 });
  // P1-05b: khung camera cao theo màn (tối đa 440 như trước, tối thiểu 280) để dòng trạng thái và nút Chụp nằm trong màn đầu.
  const { height: winH } = useWindowDimensions();
  const cameraH = Math.max(280, Math.min(440, Math.round(winH * 0.5)));

  const arAvailable = arViewInBuild && capabilities?.arAdapter === 'available';
  const useAr = arAvailable && cameraMode === 'ar';
  const liveVisible = live && focused && active && !photo;
  const tracker = useWoundTracker(liveVisible && ready && !busy, useAr ? 'ar' : 'camera', camera);
  const pushFrame = useRef(tracker.pushBase64Frame);
  useEffect(() => { pushFrame.current = tracker.pushBase64Frame; }, [tracker.pushBase64Frame]);
  const liveWound = tracker.tracked?.detection ?? null;
  const readiness = assessCapture({
    ar: useAr, tracking: tracking?.event ?? null, trackingAt: tracking?.at ?? null,
    wound: liveWound, woundAt: tracker.tracked?.at ?? null, now,
  });
  // Điểm AR cần đo khoảng cách: tâm vết thương đang khoanh, đổi sang tọa độ khung xem.
  const focusPoint = liveWound?.found && liveWound.center && view.width
    ? (() => { const f = coverMap(liveWound.width, liveWound.height, view.width, view.height).toViewNormalized(liveWound.center.x, liveWound.center.y); return [f.x, f.y]; })()
    : undefined;

  useEffect(() => {
    if (!liveVisible) return;
    const timer = setInterval(() => setNow(Date.now()), 400);
    return () => clearInterval(timer);
  }, [liveVisible]);
  const onTracking = useCallback((event: ARTrackingEvent) => {
    const at = Date.now();
    setTracking({ event, at }); setNow(at);
    if (event.frame) pushFrame.current(event.frame);
    if (mounted.current) setReady(true);
  }, []);
  const onARError = useCallback((e: ARSessionError) => {
    setLive(false); setReady(false); setTracking(null); setError(e.message);
    if (e.code === 'unsupported' || e.code === 'install_declined') setCameraMode('standard');
  }, []);
  useFocusEffect(useCallback(() => () => { generation.current++; setLive(false); setReady(false); }, []));
  useEffect(() => {
    let alive = true;
    inspectCapabilities(permission?.status ?? 'unknown').then(c => { if (alive) setCapabilities(c); }).catch(() => {});
    return () => { alive = false; };
  }, [permission?.status]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setActive(state === 'active');
      if (state !== 'active') { setReady(false); generation.current++; }
      if (state === 'background') { setLive(false); session.current = Crypto.randomUUID(); }
    });
    return () => { sub.remove(); };
  }, []);

  // Sau khi chụp: khoanh lại vết thương trên chính ảnh đã lưu, rồi phân tích chất lượng trong vùng đó.
  useEffect(() => {
    if (!photo) return;
    let cancelled = false;
    void (async () => {
      const found = await getRecognizer().recognize(photo.uri);
      if (cancelled) return;
      setPhotoWound(found);
      // QĐ-1 phương án A (UX-01): ước lượng AR chỉ hiển thị để tham khảo, không điền vào ô diện tích của bác sĩ.
      const result = await analyzeImage(photo.uri, roiFrom(found));
      if (cancelled) return;
      setQuality(result); setAnalyzing(false);
    })();
    return () => { cancelled = true; };
  }, [photo]);
  const hit = photo?.ar?.centerHit;
  const estimate = estimateFor(photo, photoWound);

  const onCameraReady = useCallback(() => {
    const token = generation.current;
    void waitForFrame().then(() => { if (mounted.current && token === generation.current) setReady(true); }).catch(() => { if (mounted.current && token === generation.current) { setLive(false); setReady(false); setError('Camera chưa có hình ảnh. Hãy mở lại camera hoặc chọn ảnh có sẵn.'); } });
  }, []);
  const onCameraError = useCallback(() => { setLive(false); setReady(false); setError('Không mở được camera. Hãy kiểm tra quyền hoặc chọn ảnh có sẵn.'); }, []);
  const selectPhoto = (value: Photo) => {
    generation.current++; setAnalyzing(true); setPhoto(value); setLive(false); setReady(false); setQuality(unknownQuality());
    setPhotoWound(null); setReviewed(false); setAreaText(''); setMethod(''); setError('');
  };
  // P0 bổ sung PX-02: ảnh đã chụp nhưng chưa lưu (kèm số đo đang nhập) thì hỏi trước khi rời màn. Không tự lưu.
  const allowLeave = useDiscardGuard(photo !== null);
  const retake = () => {
    const reset = () => { generation.current++; setPhoto(null); setQuality(unknownQuality()); setPhotoWound(null); setError(''); };
    confirm('Bỏ ảnh vừa chụp?', `Ảnh này${areaText.trim() ? ' và số đo đang nhập' : ''} chưa được lưu và sẽ bị bỏ khi chụp hoặc chọn lại.`, reset, 'Bỏ và chụp lại', 'Ở lại');
  };
  if (!p || !w) return <NoAccess notFound />;
  if (!canView || me?.role !== 'doctor') return <NoAccess />;

  const start = async () => {
    setError('');
    try {
      const perm = permission?.granted ? permission : await requestPermission();
      if (!perm.granted) { setError('Chưa có quyền camera. Bạn có thể chọn ảnh có sẵn hoặc bật quyền camera trong cài đặt.'); return; }
      generation.current++; session.current = Crypto.randomUUID(); setReady(false); setTracking(null); setLive(true);
    } catch { setError('Chưa mở được camera. Hãy thử lại hoặc chọn ảnh có sẵn.'); }
  };
  const take = async (manualOverride = false) => {
    if (!ready || busy || shutterLocked.current || (!useAr && !camera.current) || !focused || !active) return;
    if (useAr && !readiness.ready) return;
    shutterLocked.current = true;
    setBusy(true); setError('');
    const token = generation.current;
    const capturedAt = new Date().toISOString();
    try {
      if (useAr) {
        if (!arCamera.current) return;
        const shot = await arCamera.current.capture();
        if (token !== generation.current || !mounted.current) return;
        selectPhoto({ uri: shot.uri, ext: 'jpg', captureDate: localDay(capturedAt), width: shot.width, height: shot.height, sourceDateKnown: true, imageSource: 'live_camera', takenAt: capturedAt, ar: shot.ar });
        return;
      }
      // Chờ vòng lấy khung bám vết thương dừng hẳn trước khi chụp ảnh thật.
      await new Promise(resolve => setTimeout(resolve, Platform.OS === 'web' ? 50 : 450));
      await waitForFrame();
      if (token !== generation.current || !mounted.current || !camera.current) return;
      const picture = await camera.current.takePictureAsync({ quality: 1, imageType: 'jpg', exif: false, skipProcessing: false });
      if (token !== generation.current || !mounted.current) return;
      if (!picture?.uri) throw new Error('Camera chưa trả về ảnh.');
      selectPhoto({ uri: picture.uri, ext: 'jpg', captureDate: localDay(capturedAt), width: picture.width, height: picture.height, sourceDateKnown: true, imageSource: 'live_camera', takenAt: capturedAt, manualOverride });
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa chụp được ảnh.'); }
    finally { shutterLocked.current = false; setBusy(false); }
  };
  const fromLibrary = async () => {
    generation.current++; setLive(false); setReady(false); setError(''); setBusy(true);
    try { const picked = await pickPhoto('library'); if (picked && mounted.current) selectPhoto({ ...picked, imageSource: 'gallery', takenAt: null }); }
    catch { setError('Không đọc được ảnh đã chọn.'); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!photo || busy || !capabilities) return;
    const area = areaText.trim() ? parseArea(areaText) : null;
    if (area && !area.ok) { setError(area.error); return; }
    if (area?.ok && area.value === 0) { setError('Diện tích phải lớn hơn 0. Để trống nếu chưa đo.'); return; }
    if (area?.ok && !method) { setError('Chọn phương pháp bác sĩ đã dùng để đo trước khi lưu số đo.'); return; }
    setBusy(true); setError('');
    try {
      const roi = roiFrom(photoWound);
      const metadata: CaptureMetadata = {
        schemaVersion: photo.ar ? '1.1' : '1.0', captureId: 'CAP-' + Crypto.randomUUID(), sessionId: session.current, selectedFrameId: 'PHOTO-' + Crypto.randomUUID(),
        shutter: { trigger: photo.imageSource === 'gallery' ? 'gallery' : 'manual', stabilitySource: null, holdMs: null, sceneConfirmed: !photo.manualOverride && photo.imageSource !== 'gallery' },
        imageSource: photo.imageSource, mode: photo.ar ? 'ar_photo' : 'guided_photo', width: photo.width, height: photo.height,
        capturedAt: photo.takenAt, recordedAt: new Date().toISOString(), sourceDateKnown: photo.sourceDateKnown, roi, roiCoordinates: 'saved_image_normalized', previewGuideMapped: false,
        quality, capabilities, visualReview: { framing: reviewed, lighting: reviewed, sharpness: reviewed, reviewedAt: new Date().toISOString() },
        distance: hit ? { valueM: hit.centerDistanceM, source: distanceSource(hit.centerSource), status: 'estimated' } : { valueM: null, source: 'none', status: 'unavailable' },
        automaticMeasurement: estimate
          ? { areaCm2: estimate.areaCm2, status: 'estimated_unvalidated', method: 'ar_pinhole_color_mask', reasonCodes: ['MEASUREMENT_PROFILE_UNVALIDATED', 'COLOR_SEGMENTATION_HEURISTIC'], depthM: estimate.depthM, cosTilt: estimate.cosTilt }
          : { areaCm2: null, status: 'unavailable', method: null, reasonCodes: [...(photo.ar ? [] : ['GEOMETRY_UNAVAILABLE']), ...(photoWound?.found ? [] : ['WOUND_NOT_DETECTED'])] },
        // Diện tích bác sĩ xác nhận là số đo tham chiếu; ước lượng AR được giữ riêng.
        manualReference: { areaCm2: null, method: null, confirmedBy: null, confirmedAt: null }, geometry: null,
        ...(photoWound?.found && photoWound.box && photoWound.areaFraction !== null
          ? { wound: { detector: photoWound.modelId, modelVersion: photoWound.modelVersion, confidence: photoWound.confidence, areaCm2: photoWound.areaCm2 ?? estimate?.areaCm2 ?? null, box: photoWound.box, hull: photoWound.hull, areaFraction: photoWound.areaFraction, ...(photoWound.contrast !== null ? { contrast: photoWound.contrast } : {}) } }
          : {}),
        ...(photo.ar ? { ar: photo.ar } : {}),
      };
      const image = await addImage({ woundId: w.id, ...photo, source: 'doctor', capture: metadata });
      // P0 SV-02: ảnh đã lưu. Nếu bước ghi số đo lỗi, không báo "chưa lưu ảnh" (bấm lại sẽ tạo ảnh trùng):
      // mở chi tiết ảnh vừa lưu, điền lại số và phương pháp đang nhập để bác sĩ lưu lại.
      if (area?.ok) {
        try { await labelImage(image.id, area.value, method); }
        catch (e) {
          allowLeave();
          router.replace({ pathname: '/images/[id]', params: { id: image.id, nhapLai: areaText.trim(), phuongPhap: method, loi: e instanceof Error ? e.message : String(e) } });
          return;
        }
      }
      allowLeave();
      router.replace({ pathname: '/images/[id]', params: { id: image.id } });
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa lưu được ảnh. Ảnh vẫn ở đây để thử lại.'); }
    finally { setBusy(false); }
  };

  const overlayColor = TONE_COLOR[readiness.ready ? 'green' : liveWound?.found ? 'amber' : 'gray'];
  return <Screen header={<Header back title={photo ? 'Kiểm tra ảnh và nhập số đo' : 'Chụp vết thương'} />}>
    {/* P0 G1: ảnh và số đo sẽ lưu vào bệnh nhân và vết thương này. */}
    <ClinicalContext patient={p} wound={w} />
    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
      <Chip label={useAr ? (capabilities?.arFramework === 'arcore' ? 'ARCore' : 'ARKit') : 'Không có AR'} tone={useAr ? 'teal' : 'gray'} />
      <Chip label={photo?.imageSource === 'gallery' ? 'Ảnh từ thư viện' : 'Tự khoanh vết thương'} />
    </View>
    {/* P1-05c: thanh bước chỉ để hiển thị, không chặn thao tác. */}
    <StepRow steps={['Chụp', 'Kiểm tra ảnh', 'Nhập số đo']} step={!photo ? 1 : reviewed ? 3 : 2} />
    {photo ? <>
      <View style={{ width: '100%', aspectRatio: photo.width / photo.height, backgroundColor: C.text, borderRadius: 18, overflow: 'hidden' }}>
        <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" />
        {photoWound?.found ? <WoundOutline hull={photoWound.hull} color={bar.green} /> : null}
      </View>
      <Muted>{analyzing ? 'Đang khoanh vết thương trên ảnh…' : photoWound?.found ? 'Viền xanh là vùng vết thương ứng dụng tự khoanh theo màu (thử nghiệm). Bác sĩ kiểm tra lại trước khi xác nhận diện tích.' : 'Chưa khoanh được vết thương trên ảnh này. Bác sĩ vẫn có thể nhập diện tích đã đo.'}</Muted>

      {/* P1-05c: kiểm ảnh trước (chất lượng, ô "Đã xem ảnh"), nhập số sau. Không bỏ bước nào; QĐ-1 giữ nguyên: ô diện tích trống, số AR không tự điền. */}
      <CaptureQualityCard quality={quality} busy={analyzing} />
      <CheckRow checked={reviewed} onChange={setReviewed} label="Đã xem ảnh: rõ nét, đủ sáng, thấy toàn bộ vết thương" />
      <Card>
        <SectionTitle>Diện tích vết thương</SectionTitle>
        {estimate ? <>
          {/* P1-07d: cùng nhãn nguồn AI với B11 (SOURCE.ai) và cùng dòng "Ước lượng AR (tham khảo)". */}
          <View style={{ flexDirection: 'row' }}><StatusChip status={SOURCE.ai} label={SOURCE.ai.label} /></View>
          <InfoRow label="Ước lượng AR (tham khảo)" value={`${formatAreaDisplay(estimate.areaCm2)} (chưa kiểm chứng)`} />
          <InfoRow label="Khoảng cách tới vết thương" value={`${Math.round(hit!.centerDistanceM * 100)} cm (${HIT_SOURCE_LABEL[hit!.centerSource]})`} />
          {estimate.cosTilt !== null ? <InfoRow label="Góc nghiêng" value={`${Math.round(Math.acos(Math.min(1, estimate.cosTilt)) * 180 / Math.PI)}°`} /> : null}
          <Muted>Ước lượng từ vùng khoanh, khoảng cách và thông số camera của phiên AR. Chưa kiểm chứng lâm sàng. Số này chỉ để tham khảo, không tự điền vào ô bên dưới và không được ghi thành số đo của bác sĩ.</Muted>
        </> : <Muted>{photo.ar ? 'Chưa ước lượng được vì chưa khoanh được vết thương hoặc chưa đo được khoảng cách.' : 'Không có dữ liệu AR nên app không ước lượng diện tích. Nhập số đo của bác sĩ.'}</Muted>}
        <Field label="Diện tích bác sĩ đo (cm²)" value={areaText} onChangeText={setAreaText} keyboardType="decimal-pad" placeholder="Ví dụ: 12,5. Để trống nếu chưa đo" />
        <Text style={{ color: C.text, fontWeight: '600' }}>{`Phương pháp bác sĩ đã dùng để đo${areaText.trim() ? '' : ' (khi có số đo)'}`}</Text>
        <Choices value={method} options={METHODS.map(m => ({ value: m, label: m }))} onChange={setMethod} />
      </Card>
      <Button label={areaText.trim() ? 'Lưu ảnh và số đo bác sĩ' : 'Lưu ảnh (chưa có số đo)'} icon="save-outline" loading={busy} disabled={analyzing || !capabilities} onPress={save} />
      <Button label="Chụp / chọn lại" variant="secondary" disabled={busy} onPress={retake} />
    </> : <>
      <View onLayout={e => setView({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })} style={{ height: cameraH, backgroundColor: C.text, borderRadius: 24, overflow: 'hidden' }}>
        {liveVisible ? useAr
          ? <ARCameraView ref={arCamera} style={{ flex: 1 }} focusPoint={focusPoint} onTracking={onTracking} onError={onARError} />
          : <CameraView ref={camera} style={{ flex: 1 }} facing="back" flash="off" enableTorch={false} animateShutter={false} onCameraReady={onCameraReady} onMountError={onCameraError} />
          : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 35 }}>
            <Text style={{ color: C.onPrimary, fontSize: 23, fontWeight: '700', textAlign: 'center' }}>Hướng camera vào vết thương</Text>
            <Text style={{ color: C.onDarkSoft, textAlign: 'center', marginTop: 12, lineHeight: 22 }}>Ứng dụng tự khoanh vết thương, kiểm tra độ sáng{useAr ? ' và khoảng cách bằng AR' : ''} rồi mới cho chụp. Tránh để lộ khuôn mặt hoặc thông tin cá nhân.</Text>
          </View>}
        {liveVisible && <WoundOverlay detection={liveWound} viewWidth={view.width} viewHeight={view.height} color={overlayColor} label={readiness.ready ? 'Vết thương · đạt' : 'Vết thương'} />}
        {liveVisible && <View accessibilityLiveRegion="polite" style={{ position: 'absolute', left: 14, top: 14, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: C.scrim }}>
          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: TONE_COLOR[readiness.tone] }} />
          <Text style={{ color: C.onPrimary, fontWeight: '700' }}>{readiness.ready ? 'Sẵn sàng chụp' : 'Chưa đạt'}</Text>
        </View>}
        {/* Khi camera chưa mở, chú thích chỉ lặp lại nút "Mở camera" nên ẩn; giữ hướng dẫn quét cho AR (A23). */}
        {(liveVisible || useAr) && (
          <View style={{ position: 'absolute', bottom: 18, left: 16, right: 16, padding: 12, borderRadius: 12, backgroundColor: C.scrim }}>
            <Text style={{ color: C.onPrimary, textAlign: 'center' }}>{liveVisible ? (ready ? readiness.headline : 'Đang mở camera…') : useAr ? 'Mở camera AR rồi quét chậm quanh vết thương.' : 'Mở camera để ứng dụng khoanh vết thương.'}</Text>
          </View>
        )}
      </View>
      {/* P1-05b: mục chưa đạt đầu tiên nằm ngay dưới khung, sát nút Chụp; danh sách đủ ở dưới nút. */}
      {liveVisible && ready && !readiness.ready && (() => { const first = orderChecks(readiness.checks)[0]; return first && first.ok !== true
        ? <Text accessibilityLiveRegion="polite" style={{ color: first.ok === false ? C.amber : C.textSoft, fontWeight: '700' }}>{`${first.ok === false ? 'Chưa đạt' : 'Đang kiểm tra'}: ${first.label}`}</Text> : null; })()}
      {live
        ? <Button label={readiness.ready ? 'Chụp ảnh' : useAr ? 'Chờ đạt yêu cầu để chụp' : 'Chụp ảnh'} icon="camera" loading={busy} disabled={!ready || !readiness.ready} onPress={() => void take()} />
        : <Button label={useAr ? 'Mở camera AR' : 'Mở camera'} icon="camera" loading={busy} onPress={start} />}
      {live && !useAr && ready && !readiness.ready && <Button label="Vẫn chụp (bỏ qua kiểm tra)" variant="ghost" disabled={busy} onPress={() => void take(true)} />}
      {liveVisible && ready && <Card>
        <SectionTitle>Kiểm tra trước khi chụp</SectionTitle>
        <CheckList checks={readiness.checks} />
      </Card>}
      {arAvailable && <Button label={useAr ? 'Dùng camera thường (không có AR)' : 'Dùng camera AR'} icon="swap-horizontal" variant="ghost" disabled={busy} onPress={() => { generation.current++; setLive(false); setReady(false); setTracking(null); setCameraMode(useAr ? 'standard' : 'ar'); }} />}
      <Button label="Chọn ảnh có sẵn" icon="images-outline" variant="secondary" disabled={busy} onPress={fromLibrary} />
      <Muted>{useAr
        ? 'AR đo khoảng cách tới đúng vết thương đang khoanh và độ sáng môi trường. Nút chụp chỉ mở khi vết thương được khoanh, đủ sáng và cách 20–60 cm.'
        : Platform.OS !== 'web' && !arViewInBuild
          ? 'Expo Go không có AR: app vẫn khoanh vết thương và kiểm tra độ sáng, nhưng không đo được khoảng cách và diện tích. Cần bản cài riêng để dùng AR.'
          : 'Không có AR: ứng dụng khoanh vết thương và kiểm tra độ sáng, không đo được khoảng cách.'}</Muted>
    </>}
    {error ? <Text accessibilityRole="alert" style={{ color: C.red }}>{error}</Text> : null}
  </Screen>;
}
