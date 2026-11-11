// Bộ mã hóa khung chọn theo đặc tả: khung văn bản hoặc khung nhị phân.

import { createBinaryCodec } from './codec-binary';
import { createTextCodec } from './codec-text';
import type { Direction, MessageKey, ProtocolSpec, WireValues } from './spec';

export type DecodedFrame =
  | { kind: 'frame'; message: MessageKey; values: WireValues; raw: Uint8Array }
  | { kind: 'bad_checksum'; raw: Uint8Array }
  | { kind: 'malformed'; raw: Uint8Array; reason: string };

export interface FrameReader {
  push(chunk: Uint8Array): DecodedFrame[];
  readonly buffered: number;
}

export interface FrameCodec {
  /** Ném lỗi nếu thiếu trường hoặc giá trị không vừa độ rộng. */
  encode(message: MessageKey, values: WireValues): Uint8Array;
  /** Bộ đọc chỉ nhận bản tin theo `direction` (phía ứng dụng đọc 'device_to_app'). */
  createReader(direction: Direction): FrameReader;
}

export function createCodec(spec: ProtocolSpec): FrameCodec {
  return spec.framing.kind === 'text' ? createTextCodec(spec, spec.framing) : createBinaryCodec(spec, spec.framing);
}
