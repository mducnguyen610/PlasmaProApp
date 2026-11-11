// Giai đoạn 1: bản cài tạm bọc bộ dò màu hiện có. Khi biết dạng mô-đun AI có sẵn, thay ở đây.

import { detectInPhoto } from '@/lib/capture/analyzeImage';
import { detectWound, DETECTOR_ID } from '@/lib/capture/woundDetect';

import type { WoundRecognizer } from './recognizer';
import { fromColorDetection } from './result';

export type { RecognitionResult } from './result';
export type { WoundRecognizer } from './recognizer';

const colorRecognizer: WoundRecognizer = {
  id: DETECTOR_ID,
  version: '1',
  kind: 'on_device',
  recognize: async (uri, opts) => fromColorDetection(await detectInPhoto(uri), DETECTOR_ID, '1', opts?.pixelAreaCm2),
  trackFrame: (data, width, height, channels) => detectWound(data, width, height, channels),
};

export function getRecognizer(): WoundRecognizer {
  return colorRecognizer;
}
