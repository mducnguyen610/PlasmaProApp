import type { CameraView } from 'expo-camera';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Platform } from 'react-native';

import { base64ToBytes, grabFrame, type SmallFrame } from './grabFrame';
import { getRecognizer } from '@/lib/ai';

import { smoothDetection, type WoundDetection } from './woundDetect';

export interface TrackedWound { detection: WoundDetection; at: number }

/**
 * Bám theo vết thương trên khung xem trực tiếp.
 * - AR: khung nhỏ đến từ phiên AR (pushBase64Frame).
 * - Camera thường: lấy khung định kỳ (web đọc video, Expo Go chụp ảnh nhỏ im lặng).
 */
export function useWoundTracker(active: boolean, mode: 'ar' | 'camera', camera: RefObject<CameraView | null>) {
  const [tracked, setTracked] = useState<TrackedWound | null>(null);
  const previous = useRef<WoundDetection | null>(null);
  const busy = useRef(false);

  const accept = useCallback((frame: SmallFrame) => {
    // Gọi bộ dò qua giao diện WoundRecognizer (TR10); mô-đun không có trackFrame thì không bám.
    const track = getRecognizer().trackFrame;
    if (!track) return;
    const raw = track(frame.data, frame.width, frame.height, frame.channels);
    // Giữ vị trí cũ một nhịp khi lỡ mất dấu để khung không nhấp nháy.
    const next = smoothDetection(previous.current, raw, 0.75);
    previous.current = next.found ? next : null;
    setTracked({ detection: next, at: Date.now() });
  }, []);

  const pushBase64Frame = useCallback((frame: { width: number; height: number; channels: number; data: string }) => {
    if (!active || mode !== 'ar' || busy.current) return;
    busy.current = true;
    try { accept({ ...frame, data: base64ToBytes(frame.data) }); } catch { /* bỏ qua khung lỗi */ } finally { busy.current = false; }
  }, [accept, active, mode]);

  useEffect(() => {
    previous.current = null;
    if (!active || mode !== 'camera') return;
    let cancelled = false;
    const interval = Platform.OS === 'web' ? 120 : 300;
    const loop = async () => {
      await Promise.resolve();
      if (!cancelled) setTracked(null);
      while (!cancelled) {
        const started = Date.now();
        try {
          const frame = await grabFrame(camera.current);
          if (frame && !cancelled) accept(frame);
        } catch { /* camera bận khi đang chụp ảnh thật */ }
        await new Promise(resolve => setTimeout(resolve, Math.max(60, interval - (Date.now() - started))));
      }
    };
    void loop();
    return () => { cancelled = true; };
  }, [accept, active, camera, mode]);

  return { tracked: active ? tracked : null, pushBase64Frame };
}
