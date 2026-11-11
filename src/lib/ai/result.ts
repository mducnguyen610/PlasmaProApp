// Kết quả nhận diện vết thương, dùng chung cho mọi mô-đun AI cắm sau giao diện WoundRecognizer.

import type { WoundDetection } from '../capture/woundDetect';

export interface RecognitionResult {
  found: boolean;
  /** Hộp bao, chuẩn hóa 0 đến 1 theo ảnh. */
  box: { x: number; y: number; width: number; height: number } | null;
  /** Đường bao, chuẩn hóa 0 đến 1. */
  hull: [number, number][];
  center: { x: number; y: number } | null;
  /** Tỉ lệ diện tích vết thương trên toàn ảnh. */
  areaFraction: number | null;
  /** Chỉ có ở bộ dò màu; mô-đun khác để null. */
  contrast: number | null;
  /** Độ tin cậy của mô hình; null khi mô-đun không cung cấp, không bịa số. */
  confidence: number | null;
  modelId: string;
  modelVersion: string;
}

export function fromColorDetection(d: WoundDetection | null, modelId: string, modelVersion: string): RecognitionResult {
  if (!d || !d.found) return { found: false, box: null, hull: [], center: null, areaFraction: null, contrast: null, confidence: null, modelId, modelVersion };
  return { found: true, box: d.box, hull: d.hull, center: d.center, areaFraction: d.areaFraction, contrast: d.contrast, confidence: null, modelId, modelVersion };
}
