// Giao diện chung cho mô-đun nhận diện vết thương (TR10). Đổi mô-đun AI có sẵn chỉ cần một bản cài mới.

import type { RecognitionResult } from './result';

export interface WoundRecognizer {
  id: string;
  version: string;
  kind: 'on_device' | 'remote';
  recognize(uri: string): Promise<RecognitionResult>;
}
