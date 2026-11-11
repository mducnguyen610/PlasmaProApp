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
  /**
   * Diện tích theo cm² (DR12, TR10). Chỉ có khi mô-đun tự đo được, hoặc khi bên gọi đưa diện tích một điểm ảnh
   * (ví dụ từ AR). Không có thước đo thì để null, không suy ra từ areaFraction.
   */
  areaCm2: number | null;
  /** Chỉ có ở bộ dò màu; mô-đun khác để null. */
  contrast: number | null;
  /** Độ tin cậy của mô hình; null khi mô-đun không cung cấp, không bịa số. */
  confidence: number | null;
  modelId: string;
  modelVersion: string;
}

export function fromColorDetection(d: WoundDetection | null, modelId: string, modelVersion: string, pixelAreaCm2?: number | null): RecognitionResult {
  if (!d || !d.found) return { found: false, box: null, hull: [], center: null, areaFraction: null, areaCm2: null, contrast: null, confidence: null, modelId, modelVersion };
  const areaCm2 = pixelAreaCm2 && pixelAreaCm2 > 0 ? Math.round(d.areaFraction * d.width * d.height * pixelAreaCm2 * 100) / 100 : null;
  return { found: true, box: d.box, hull: d.hull, center: d.center, areaFraction: d.areaFraction, areaCm2, contrast: d.contrast, confidence: null, modelId, modelVersion };
}
