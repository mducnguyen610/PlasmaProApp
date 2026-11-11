// Tầng bản tin: đổi cấu hình điều trị thành giá trị trên dây theo đặc tả, và đổi khung nhận được thành DeviceMessage.

import type { DeviceCapabilities } from './capabilities';
import { createCodec } from './codec';
import type { DecodedFrame } from './codec';
import type { FieldSpec, MessageKey, ProtocolSpec, SessionState, WireValues } from './spec';
import { charsetRegex, maxUint, UNKNOWN_REF } from './wire';

export interface TreatmentConfig { patientId: string; minTreatmentTimeSec: number; energyLevel: number; treatmentMode: string; at: Date }

export type ConfigError =
  | 'patient_id_empty'
  | 'patient_id_too_long'
  | 'patient_id_charset'
  | 'time_invalid'
  | 'time_out_of_range'
  | 'energy_invalid'
  | 'energy_not_allowed'
  | 'mode_not_allowed'
  | 'mode_not_in_spec'
  | 'value_out_of_wire_range'
  | 'capabilities_unknown';

/** Các mã lỗi phụ thuộc năng lực máy; encodeConfig không kiểm các mã này. */
export const CAPS_ERRORS: readonly ConfigError[] = ['capabilities_unknown', 'energy_not_allowed', 'mode_not_allowed', 'time_out_of_range'];

export function deviceClock(at: Date, offsetMin: number) {
  const d = new Date(at.getTime() + offsetMin * 60000);
  return { day: d.getUTCDate(), month: d.getUTCMonth() + 1, year: d.getUTCFullYear(), hour: d.getUTCHours(), minute: d.getUTCMinutes(), second: d.getUTCSeconds() };
}

function field(spec: ProtocolSpec, name: string): FieldSpec | undefined {
  return spec.messages.config.fields.find((f) => f.name === name);
}

function scale(v: number, f: FieldSpec): number {
  const d = f.divisor ?? 1;
  const q = v / d;
  const r = f.round === 'ceil' ? Math.ceil(q) : f.round === 'floor' ? Math.floor(q) : Math.round(q);
  return r + (f.offset ?? 0);
}

/** Giá trị 10 trường sau khi chia đơn vị, cộng bù, tra bảng mã. Chế độ không có trong bảng mã thành -1. */
export function configToWire(cfg: TreatmentConfig, spec: ProtocolSpec): WireValues {
  const clock = deviceClock(cfg.at, spec.timeZoneOffsetMin);
  const values: WireValues = {};
  for (const f of spec.messages.config.fields) {
    switch (f.name) {
      case 'patient_id':
        values[f.name] = cfg.patientId.trim();
        break;
      case 'min_treatment_time':
        values[f.name] = scale(cfg.minTreatmentTimeSec, f);
        break;
      case 'energy_level':
        values[f.name] = scale(cfg.energyLevel, f);
        break;
      case 'treatment_mode':
        values[f.name] = f.field.type === 'enum' ? f.field.map[cfg.treatmentMode] ?? -1 : cfg.treatmentMode;
        break;
      case 'day':
      case 'month':
      case 'year':
      case 'hour':
      case 'minute':
      case 'second':
        values[f.name] = scale(clock[f.name], f);
        break;
      default:
        throw new Error(`Ứng dụng không có giá trị cho trường ${f.name}`);
    }
  }
  return values;
}

export function validateConfig(cfg: TreatmentConfig, caps: DeviceCapabilities | null, spec: ProtocolSpec): ConfigError[] {
  const errors: ConfigError[] = [];
  const add = (e: ConfigError) => {
    if (!errors.includes(e)) errors.push(e);
  };
  const pid = cfg.patientId.trim();
  const pf = field(spec, 'patient_id');
  if (!pid) add('patient_id_empty');
  else if (pf && pf.field.type === 'ascii') {
    if (pid.length > pf.field.maxLength) add('patient_id_too_long');
    if (!charsetRegex(pf.field.charset).test(pid)) add('patient_id_charset');
  }
  const timeOk = Number.isInteger(cfg.minTreatmentTimeSec) && cfg.minTreatmentTimeSec > 0;
  if (!timeOk) add('time_invalid');
  else if (caps?.minTreatmentTimeSec && (cfg.minTreatmentTimeSec < caps.minTreatmentTimeSec.min || cfg.minTreatmentTimeSec > caps.minTreatmentTimeSec.max)) add('time_out_of_range');
  // Mức năng lượng là số nguyên; không để configToWire âm thầm làm tròn 2.5 thành 3.
  if (!Number.isInteger(cfg.energyLevel)) add('energy_invalid');
  if (caps === null) add('capabilities_unknown');
  else {
    if (!caps.energyLevels.includes(cfg.energyLevel)) add('energy_not_allowed');
    if (!caps.treatmentModes.some((m) => m.value === cfg.treatmentMode)) add('mode_not_allowed');
  }
  const mf = field(spec, 'treatment_mode');
  const modeInSpec = !mf || mf.field.type !== 'enum' || Object.prototype.hasOwnProperty.call(mf.field.map, cfg.treatmentMode);
  if (!modeInSpec) add('mode_not_in_spec');
  if (timeOk && Number.isFinite(cfg.energyLevel)) {
    const wire = configToWire(cfg, spec);
    for (const f of spec.messages.config.fields) {
      const t = f.field;
      if (t.type !== 'uint' && t.type !== 'enum') continue;
      if (f.name === 'treatment_mode' && !modeInSpec) continue;
      const v = wire[f.name] as number;
      if (!Number.isInteger(v) || v < 0 || v > maxUint(t.bytes) || (f.min !== undefined && v < f.min) || (f.max !== undefined && v > f.max)) add('value_out_of_wire_range');
    }
  }
  return errors;
}

export function encodeConfig(cfg: TreatmentConfig, spec: ProtocolSpec): Uint8Array {
  const errors = validateConfig(cfg, null, spec).filter((e) => !CAPS_ERRORS.includes(e));
  if (errors.length) throw new Error('Cấu hình không hợp lệ: ' + errors.join(', '));
  return createCodec(spec).encode('config', configToWire(cfg, spec));
}

export function encodeQuery(which: 'query_info' | 'query_caps', spec: ProtocolSpec): Uint8Array | null {
  if (!spec.messages[which]) return null;
  return createCodec(spec).encode(which, {});
}

export type DeviceMessage =
  | { kind: 'ack'; command: MessageKey | null }
  | { kind: 'nak'; command: MessageKey | null; code: string }
  | { kind: 'status'; state: SessionState; remainingSec: number | null }
  | { kind: 'info'; protocolVersion: number; firmwareVersion: string; model: string }
  | { kind: 'caps'; values: WireValues }
  | { kind: 'unknown'; message: MessageKey; values: WireValues };

function ref(v: unknown): MessageKey | null {
  return typeof v === 'string' && v !== UNKNOWN_REF ? (v as MessageKey) : null;
}

export function toDeviceMessage(frame: Extract<DecodedFrame, { kind: 'frame' }>, spec: ProtocolSpec): DeviceMessage {
  const v = frame.values;
  switch (frame.message) {
    case 'ack':
      return { kind: 'ack', command: ref(v.command) };
    case 'nak': {
      const f = spec.messages.nak.fields.find((x) => x.name === 'code');
      let code = String(v.code ?? '');
      if (f && f.field.type === 'enum' && typeof v.code === 'number') {
        const map = f.field.map;
        code = Object.keys(map).find((k) => map[k] === v.code) ?? '#' + v.code;
      }
      return { kind: 'nak', command: ref(v.command), code };
    }
    case 'status': {
      const states = spec.statusStates;
      const state = (Object.keys(states) as SessionState[]).find((k) => states[k] === v.state);
      if (!state) return { kind: 'unknown', message: frame.message, values: v };
      return { kind: 'status', state, remainingSec: typeof v.remaining_s === 'number' ? v.remaining_s : null };
    }
    case 'info':
      return { kind: 'info', protocolVersion: Number(v.protocol_version), firmwareVersion: String(v.firmware_version ?? ''), model: String(v.model ?? '') };
    case 'caps':
      return { kind: 'caps', values: v };
    default:
      return { kind: 'unknown', message: frame.message, values: v };
  }
}
