// Năng lực của mẫu thiết bị: mức năng lượng, chế độ, khoảng thời gian.
// Ưu tiên năng lực máy báo qua bản tin CAP; bảng dưới đây chỉ là dự phòng khi máy không trả lời.

import type { ProtocolSpec, WireValues } from './spec';

export interface DeviceCapabilities {
  model: string;
  confirmed: boolean;
  source: 'device' | 'table';
  note: string;
  energyLevels: number[];
  treatmentModes: { value: string; label: string }[];
  minTreatmentTimeSec: { min: number; max: number } | null;
}

/** Trùng chuỗi `model` của thiết bị trong seed.ts và registerDevice của store.tsx. */
export const SIM_MODEL = 'Plasma Pro + mô-đun IoMT ESP32';

export const MODE_LABELS: Record<string, string> = { cold: 'Cold', hybrid: 'Hybrid', thermal: 'Thermal' };

export function modeLabel(mode: string | null | undefined): string {
  if (!mode) return '';
  return MODE_LABELS[mode] ?? mode;
}

export const CAPABILITIES: Record<string, DeviceCapabilities> = {
  [SIM_MODEL]: {
    model: SIM_MODEL,
    confirmed: false,
    source: 'table',
    note: 'Báo cáo giữa kỳ đồ án nhúng, bảng mục 3.2.1.1 (GA-3), chưa xác nhận với firmware',
    energyLevels: [1, 2, 3, 4, 5],
    treatmentModes: ['cold', 'hybrid', 'thermal'].map((value) => ({ value, label: MODE_LABELS[value] })),
    minTreatmentTimeSec: null,
  },
};

export function capabilitiesFor(model: string | undefined): DeviceCapabilities | null {
  if (!model) return null;
  return CAPABILITIES[model] ?? null;
}

/** Dựng năng lực từ giá trị của bản tin `caps`. Bit thứ n của mode_mask bật khi chế độ có mã n dùng được. */
export function capabilitiesFromDevice(values: WireValues, spec: ProtocolSpec, model: string): DeviceCapabilities {
  const num = (k: string) => (typeof values[k] === 'number' ? (values[k] as number) : 0);
  const energyLevels: number[] = [];
  for (let e = num('energy_min'); e <= num('energy_max'); e++) energyLevels.push(e);
  const modeField = spec.messages.config.fields.find((f) => f.name === 'treatment_mode');
  const map = modeField && modeField.field.type === 'enum' ? modeField.field.map : {};
  const mask = num('mode_mask');
  const treatmentModes = Object.keys(map)
    .filter((k) => map[k] < 31 && (mask & (1 << map[k])) !== 0)
    .map((value) => ({ value, label: modeLabel(value) }));
  const tMin = num('time_min_s');
  const tMax = num('time_max_s');
  return {
    model,
    confirmed: spec.confirmed,
    source: 'device',
    note: 'Đọc từ máy qua bản tin CAP',
    energyLevels,
    treatmentModes,
    minTreatmentTimeSec: tMax > 0 ? { min: tMin, max: tMax } : null,
  };
}
