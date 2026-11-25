import { router, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import { View } from 'react-native';

import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { useDiscardGuard } from '@/components/useDiscardGuard';
import { Button, Card, Choices, Header, InfoRow, Muted, Notice, Screen } from '@/components/ui';
import { fmtDateTime } from '@/lib/format';
import { pickPhoto, type PickedPhoto } from '@/lib/photos';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

/**
 * Giai đoạn B (CN2 A9): bệnh nhân chụp ảnh vết sau một phiên điều trị tại nhà. Ảnh gắn đúng phiên (DeviceSession.sessionId)
 * và vết của phiên, mang sẵn loại "Ảnh sau điều trị"; bác sĩ thấy trong dòng thời gian và gán nhãn như ảnh khác.
 * Bệnh nhân không đo, không gán nhãn. Store kiểm lại: chỉ vết của chính mình, phiên từ máy của mình.
 */
export default function PatientPhoto() {
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  const { me, data, addImage } = useStore();
  const { patient, woundsOf } = useLookups();
  const p = patient(me?.patientId);
  const ses = data.sessions.find((s) => s.sessionId === sessionId);
  const wounds = p ? woundsOf(p.id).filter((w) => w.status !== 'closed') : [];
  const [wid, setWid] = useState(ses?.woundId ?? (wounds.length === 1 ? wounds[0].id : ''));
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const allowLeave = useDiscardGuard(photo !== null);

  if (me?.role !== 'patient' || !p) return <NoAccess />;
  if (!ses || ses.deviceId !== p.deviceId) return <NoAccess notFound />;
  const woundId = ses.woundId ?? wid;

  const pick = async (source: 'camera' | 'library') => {
    setError('');
    try { const r = await pickPhoto(source); if (r) setPhoto(r); }
    catch { setError('Không đọc được ảnh.'); }
  };
  const send = async () => {
    if (!photo || !woundId || lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try {
      await addImage({ woundId, uri: photo.uri, ext: photo.ext, captureDate: photo.captureDate, source: 'patient', sessionId: ses.sessionId });
      allowLeave();
      router.back();
    } catch (e) { setError(e instanceof Error ? e.message : 'Chưa gửi được ảnh. Ảnh vẫn ở đây để thử lại.'); }
    finally { lock.current = false; setBusy(false); }
  };

  return (
    <Screen header={<Header back title="Ảnh sau điều trị" subtitle="Gửi bác sĩ ảnh vết thương sau phiên" />}
      footer={<View style={{ gap: 8 }}>
        {error ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{error}</Text> : null}
        {photo
          ? <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Chọn lại" variant="secondary" disabled={busy} onPress={() => setPhoto(null)} style={{ flexShrink: 0 }} />
            <Button label="Gửi ảnh cho bác sĩ" icon="send-outline" loading={busy} disabled={!woundId} reason="Chọn vết thương của ảnh." onPress={send} style={{ flex: 1 }} />
          </View>
          : <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button label="Chọn ảnh có sẵn" icon="images-outline" variant="secondary" onPress={() => void pick('library')} style={{ flex: 1 }} />
            <Button label="Chụp ảnh" icon="camera" onPress={() => void pick('camera')} style={{ flex: 1 }} />
          </View>}
      </View>}>
      <Card>
        <InfoRow label="Phiên điều trị" value={fmtDateTime(ses.start)} />
        <InfoRow label="Thời lượng" value={`${ses.durationMin} phút`} />
        {ses.planVersion ? <InfoRow label="Phác đồ áp dụng" value={`Phiên bản ${ses.planVersion}`} /> : null}
      </Card>
      {!ses.woundId && (wounds.length > 1
        ? <><Text style={{ color: C.text, fontWeight: '600', fontSize: T.small }}>Vết thương trong ảnh</Text>
          <Choices value={wid} onChange={setWid} options={wounds.map((w) => ({ value: w.id, label: `${w.code} · ${w.location}` }))} /></>
        : wounds.length === 0 ? <Muted>Chưa có vết thương đang theo dõi.</Muted> : null)}
      {photo
        ? <Image source={{ uri: photo.uri }} style={{ width: '100%', aspectRatio: photo.width && photo.height ? photo.width / photo.height : 4 / 3, borderRadius: 16 }} contentFit="cover" accessibilityLabel="Ảnh vừa chọn" />
        : <Notice tone="blue" icon="camera-outline">Chụp thẳng vết thương, đủ sáng, cách khoảng 30 cm. Ảnh được gửi kèm phiên điều trị này; bác sĩ xem và đánh giá.</Notice>}
    </Screen>
  );
}
