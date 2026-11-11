// Điểm vào lớp thiết bị cho màn hình. Giai đoạn 1 luôn dùng thiết bị giả lập.

import type { Patient, TreatmentPlan } from '@/lib/types';

import { PROTOCOL } from './protocol.config';
import type { TreatmentConfig } from './protocol';
import { createSimulatedTransport } from './simulated';
import type { SimulatedTransport } from './simulated';
import { withTrace } from './trace';
import type { TracedTransport } from './trace';

export { PROTOCOL } from './protocol.config';

export type AppTransport = TracedTransport & Partial<Pick<SimulatedTransport, 'startSession' | 'stopSession'>>;

let shared: AppTransport | null = null;

/** Một thể hiện dùng chung trong phiên chạy ứng dụng. */
export function getTransport(): AppTransport {
  if (!shared) shared = withTrace(createSimulatedTransport(PROTOCOL));
  return shared;
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
