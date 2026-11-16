// Stage 9C (gói C): dịch vụ ứng dụng "chuẩn bị liệu trình để nạp". Trước đây T01 tự gọi validateConfig và configToWire
// (lớp giao thức) ngay trong màn. Gom về đây để màn không chạm tới chi tiết giao thức; kết quả giữ nguyên từng trường.
// Không gửi lệnh nào; việc gửi vẫn qua useDeviceLink().send → sender.sendConfig.

import type { DeviceCapabilities } from './capabilities';
import type { ConfigMissing } from './index';
import { configToWire, validateConfig } from './protocol';
import type { ConfigError, TreatmentConfig } from './protocol';
import type { ProtocolSpec, WireValues } from './spec';

export type PreparedConfig = TreatmentConfig | { missing: ConfigMissing[] } | null;

export interface TreatmentConfigCheck {
  /** Cấu hình đủ trường (chưa xét năng lực máy). null khi chưa có đợt hoặc đợt thiếu trường. */
  cfg: TreatmentConfig | null;
  /** Trường đợt điều trị còn thiếu; null khi không thiếu hoặc chưa có đợt. */
  missing: ConfigMissing[] | null;
  /** Lỗi so với năng lực máy và đặc tả. */
  errors: ConfigError[];
  /** Giá trị trên dây (chỉ để hiển thị cho bác sĩ, quản trị); null khi còn lỗi. */
  wire: WireValues | null;
}

export function checkTreatmentConfig(prepared: PreparedConfig, caps: DeviceCapabilities | null, spec: ProtocolSpec): TreatmentConfigCheck {
  const cfg = prepared && !('missing' in prepared) ? prepared : null;
  const missing = prepared && 'missing' in prepared ? prepared.missing : null;
  const errors = cfg ? validateConfig(cfg, caps, spec) : [];
  const wire = cfg && errors.length === 0 ? configToWire(cfg, spec) : null;
  return { cfg, missing, errors, wire };
}
