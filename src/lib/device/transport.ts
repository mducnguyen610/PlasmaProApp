// Đường truyền chỉ chuyển byte, không biết gì về khung. Bản USB Android, USB iOS sau này cắm vào cùng giao diện.

export type TransportKind = 'simulated' | 'usb-android' | 'usb-ios';
export type LinkState = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface DeviceTransport {
  kind: TransportKind;
  model: string;
  open(): Promise<void>;
  close(): Promise<void>;
  write(data: Uint8Array): Promise<void>;
  onData(cb: (chunk: Uint8Array) => void): () => void;
  onState(cb: (s: LinkState, detail?: string) => void): () => void;
}
