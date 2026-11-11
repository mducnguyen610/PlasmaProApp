// Điểm vào lớp thiết bị cho màn hình. Bản dựng Android có mô-đun gốc dùng USB thật; còn lại dùng thiết bị giả lập.

import type { Patient, TreatmentPlan } from '@/lib/types';

import { PROTOCOL } from './protocol.config';
import type { TreatmentConfig } from './protocol';
import { createSimulatedTransport } from './simulated';
import type { SimulatedTransport } from './simulated';
import { withTrace } from './trace';
import type { TracedTransport } from './trace';
import { createUsbAndroid } from './usb-android';

export { PROTOCOL } from './protocol.config';

export type AppTransport = TracedTransport & Partial<Pick<SimulatedTransport, 'startSession' | 'stopSession'>>;

let shared: AppTransport | null = null;

/** auto: dùng USB thật khi chạy bản dựng Android có mô-đun gốc, ngược lại dùng giả lập. */
export type TransportPreference = 'auto' | 'simulated';
let preference: TransportPreference = 'auto';
const changeListeners: (() => void)[] = [];

/** Một thể hiện dùng chung trong phiên chạy ứng dụng. */
export function getTransport(): AppTransport {
  if (!shared) {
    const usb = preference === 'auto' ? createUsbAndroid(PROTOCOL) : null;
    shared = withTrace(usb ?? createSimulatedTransport(PROTOCOL));
  }
  return shared;
}

export function transportPreference(): TransportPreference {
  return preference;
}

export { usbAndroidAvailable } from './usb-android';

/** Đổi giữa USB thật và giả lập (màn chẩn đoán của quản trị viên). Đóng kết nối cũ trước khi đổi. */
export async function setTransportPreference(p: TransportPreference): Promise<void> {
  if (p === preference) return;
  const old = shared;
  preference = p;
  shared = null;
  if (old) await old.close().catch(() => {});
  for (const l of [...changeListeners]) l();
}

export function onTransportChange(cb: () => void): () => void {
  changeListeners.push(cb);
  return () => {
    const i = changeListeners.indexOf(cb);
    if (i >= 0) changeListeners.splice(i, 1);
  };
}

export type ConfigMissing = 'duration' | 'energy' | 'mode';

export function planToConfig(plan: TreatmentPlan, patient: Patient, at: Date): TreatmentConfig | { missing: ConfigMissing[] } {
  const missing: ConfigMissing[] = [];
  const empty = (v: unknown) => v === null || v === undefined || v === '';
  if (empty(plan.durationSec)) missing.push('duration');
  if (empty(plan.doseLevel)) missing.push('energy');
  if (empty(plan.treatmentMode)) missing.push('mode');
  if (missing.length) return { missing };
  return { patientId: patient.code, minTreatmentTimeSec: plan.durationSec as number, energyLevel: plan.doseLevel as number, treatmentMode: plan.treatmentMode as string, at };
}
