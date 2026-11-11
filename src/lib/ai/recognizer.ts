// Giao diện chung cho mô-đun nhận diện vết thương (TR10). Đổi mô-đun AI có sẵn chỉ cần một bản cài mới.

import type { WoundDetection } from '../capture/woundDetect';
import type { RecognitionResult } from './result';

export interface WoundRecognizer {
  id: string;
  version: string;
  kind: 'on_device' | 'remote';
  /** Nhận diện trên ảnh đã chụp. `pixelAreaCm2`: diện tích một điểm ảnh khi có thước đo (AR), để trả areaCm2. */
  recognize(uri: string, opts?: { pixelAreaCm2?: number | null }): Promise<RecognitionResult>;
  /**
   * Bám vết thương trên khung xem trực tiếp để hướng dẫn chụp. Mô-đun không hỗ trợ thì bỏ trống,
   * màn chụp khi đó không vẽ khung bám. Mọi lời gọi bộ dò đi qua giao diện này (TR10).
   */
  trackFrame?(data: ArrayLike<number>, width: number, height: number, channels?: number): WoundDetection;
}
