import { useEffect, useRef, useState } from 'react';
import { Platform, View } from 'react-native';
import { CheckRow } from './Consent';
import { Text } from './Text';
import { Card, Muted } from './ui';
import { observeSteady } from '@/lib/capture/observeSteady';
import { advanceHold, emptyHold, MAX_SAMPLE_AGE, type SteadySample, type SteadySource } from '@/lib/capture/steady';
import { C, T } from '@/theme';

export interface GuideStatus { text: string; progress: number }
export function AutoCaptureGuide({ onCapture, onStatus }: { onCapture: (source: SteadySource) => void; onStatus: (status: GuideStatus) => void }) {
  const [confirmed, setConfirmed] = useState(false);
  const [status, setStatus] = useState<GuideStatus>({ text: 'Căn toàn bộ vết thương vào khung.', progress: 0 });
  const latest = useRef<SteadySample | null>(null);
  const hold = useRef(emptyHold());
  const callbacks = useRef({ onCapture, onStatus });
  useEffect(() => { callbacks.current = { onCapture, onStatus }; }, [onCapture, onStatus]);
  useEffect(() => observeSteady(sample => { latest.current = sample; }), []);
  useEffect(() => {
    hold.current = emptyHold();
    const timer = setInterval(() => {
      const now = Date.now(), sample = latest.current;
      const result = advanceHold(hold.current, sample, now, confirmed);
      hold.current = result.state;
      const stale = !sample || now - sample.at > MAX_SAMPLE_AGE;
      const text = !confirmed ? 'Căn khung, kiểm tra ánh sáng rồi xác nhận bên dưới.'
        : result.progress > 0 ? `Giữ yên · chụp sau ${Math.max(1, Math.ceil((1 - result.progress) * 3))} giây`
        : sample?.quiet === null ? sample.reason
        : stale ? 'Chưa có tín hiệu mới. Tạm dừng tự chụp.' : sample.reason;
      const next = { text: result.fire ? 'Đang chụp…' : text, progress: result.progress };
      setStatus(next); callbacks.current.onStatus(next);
      if (result.fire && sample) callbacks.current.onCapture(sample.source);
    }, 100);
    return () => clearInterval(timer);
  }, [confirmed]);
  return <Card>
    <Text style={{ color: C.text, fontSize: T.body, fontWeight: '700' }}>Căn khung → Giữ yên → Tự chụp</Text>
    <CheckRow checked={confirmed} onChange={setConfirmed} label="Đã căn đủ vết thương, đủ sáng và nhìn rõ chi tiết" />
    <Text accessibilityLiveRegion="polite" style={{ color: C.primary, fontWeight: '700' }}>{status.text}</Text>
    <View style={{ height: 6, borderRadius: 6, backgroundColor: C.border, overflow: 'hidden' }}>
      <View style={{ height: 6, width: `${status.progress * 100}%`, backgroundColor: C.primary }} />
    </View>
    <Muted>{Platform.OS === 'web' ? 'Theo dõi thay đổi vùng giữa ảnh; chưa nhận diện đường biên vết thương.' : 'Cảm biến chỉ theo dõi chuyển động điện thoại. Hãy giữ cả vùng chụp đứng yên; ánh sáng và độ nét được kiểm tra sau chụp.'}</Muted>
    <Muted>Giữ yên 3 giây để chụp một ảnh. Tự chụp không xác nhận độ chính xác đo diện tích.</Muted>
  </Card>;
}
