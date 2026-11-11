import type { ARCaptureData } from './ar';

export type QualityState = 'pass' | 'warn' | 'fail' | 'unknown';
export interface Roi { x: number; y: number; width: number; height: number }
export interface QualityMetrics {
  meanLuma: number; darkFraction: number; clippedFraction: number; laplacianVariance: number; samples: number;
}
export interface CaptureQuality {
  profileId: string; profileValidated: false;
  lighting: QualityState; sharpness: QualityState; reflection: QualityState; movement: QualityState;
  metrics: QualityMetrics | null; warnings: string[];
}
export interface DeviceCapabilities {
  platform: string; model: string | null; osVersion: string | null;
  cameraSupported: boolean | null; cameraPermission: string;
  arAdapter: 'available' | 'not_in_build' | 'unavailable';
  arFramework?: 'arkit' | 'arcore' | null;
  arcoreStatus?: string | null;
  worldTracking: boolean | null; depth: boolean | null; depthConfidence: boolean | null; sceneMesh: boolean | null;
  measurementProfileAvailable: false; segmentationModelAvailable: false;
}
export interface CaptureMetadata {
  schemaVersion: '1.0' | '1.1'; captureId: string; sessionId: string; selectedFrameId: string;
  imageSource: 'live_camera' | 'gallery'; mode: 'guided_photo' | 'ar_photo';
  shutter?: { trigger: 'manual' | 'gallery' | 'steady_auto'; stabilitySource: 'device_motion' | 'preview_frames' | null; holdMs: number | null; sceneConfirmed: boolean };
  width: number; height: number; capturedAt: string | null; recordedAt: string; sourceDateKnown: boolean;
  roi: Roi; roiCoordinates: 'saved_image_normalized'; previewGuideMapped: false;
  quality: CaptureQuality; capabilities: DeviceCapabilities;
  visualReview: { framing: boolean; lighting: boolean; sharpness: boolean; reviewedAt: string };
  /** Khoảng cách từ camera tới điểm giữa khung lúc chụp, do phiên AR ước lượng. Không dùng để tính cm². */
  distance: { valueM: number | null; source: 'none' | 'ar_plane' | 'ar_estimated_plane' | 'ar_depth' | 'ar_feature_point'; status: 'unavailable' | 'estimated' };
  /** Ước lượng tự động: chỉ có khi có phiên AR và vùng vết thương được khoanh. Chưa kiểm chứng lâm sàng. */
  automaticMeasurement: { areaCm2: number | null; status: 'unavailable' | 'estimated_unvalidated'; method: null | 'ar_pinhole_color_mask'; reasonCodes: string[]; depthM?: number; cosTilt?: number | null };
  /** Vùng vết thương do bộ dò màu khoanh trên ảnh đã lưu (tọa độ chuẩn hóa). */
  /** Kết quả mô-đun nhận diện (DR12): mã và phiên bản mô hình, độ tin cậy (null khi mô-đun không cung cấp), diện tích cm² khi đo được. */
  wound?: { detector: string; modelVersion?: string; confidence?: number | null; areaCm2?: number | null; box: Roi; hull: [number, number][]; areaFraction: number; contrast?: number };
  manualReference: { areaCm2: number | null; method: string | null; confirmedBy: string | null; confirmedAt: string | null };
  geometry: null;
  /** Dữ liệu frame AR đồng bộ với ảnh: nội tham số, tư thế camera, ma trận, tệp chiều sâu. */
  ar?: ARCaptureData;
}

