import type { CaptureMetadata } from './capture/types';
export type Role = 'doctor' | 'patient' | 'admin';

export interface Account {
  id: string;
  role: Role;
  name: string;
  username: string;
  title?: string;
  passwordHash?: string;
  passwordSalt?: string;
  pendingApproval?: boolean;
  termsVersion?: string;
  termsAcceptedAt?: string;
  /** Thời điểm bệnh nhân xem xong hoặc bỏ qua hướng dẫn lần đầu (đề xuất 3 của bản đánh giá trải nghiệm). */
  onboardingDoneAt?: string;
  locked: boolean;
  /** Bác sĩ được cấp quyền xuất dữ liệu nghiên cứu (đặc tả mục 9). */
  researchAccess?: boolean;
  /** Tài khoản bệnh nhân liên kết tới hồ sơ nào. */
  patientId?: string;
  /** Mã kích hoạt (đã băm) bác sĩ cấp khi tạo hồ sơ; bệnh nhân dùng một lần để tự đặt mật khẩu. */
  activationHash?: string;
  activationSalt?: string;
  activationExpiresAt?: string;
  activationAttempts?: number;
}

export type WoundStatus = 'active' | 'paused' | 'closed';

export interface Patient {
  id: string;
  /** Mã hồ sơ dùng trong tên ảnh, ví dụ BN001; không dùng họ tên. */
  code: string;
  researchCode?: string;
  name: string;
  birthYear: number;
  sex: 'Nam' | 'Nữ';
  phone: string;
  doctorId: string;
  deviceId?: string;
  /** Đồng ý cho phép dùng ảnh (đã mã hóa) để nghiên cứu, huấn luyện mô hình. */
  researchConsent: boolean;
  consentDate?: string;
  createdAt: string;
}

export interface Wound {
  id: string;
  patientId: string;
  /** Mã vết thương trong hồ sơ, ví dụ VT01. */
  code: string;
  location: string;
  group?: string;
  startDate: string;
  status: WoundStatus;
}

export type LabelStatus = 'unlabeled' | 'labeled' | 'excluded';

export interface LabelChange {
  at: string;
  by: string;
  fromName: string;
  toName: string;
  fromArea: number | null;
  toArea: number | null;
  note?: string;
}

export interface WoundImage {
  /** Mã ảnh ổn định, không đổi khi sửa tên tệp, ví dụ IMG0001. */
  id: string;
  woundId: string;
  patientId: string;
  /** Đường dẫn tệp trên máy; null nếu là ảnh mô phỏng đóng gói sẵn. */
  uri: string | null;
  /** Chỉ số ảnh mô phỏng trong assets/demo. */
  demoAsset?: number;
  ext: 'jpg' | 'jpeg' | 'png' | 'heic' | 'webp';
  filename: string;
  captureDate: string;
  uploadDate: string;
  uploadedBy: string;
  source: 'doctor' | 'patient' | 'demo';
  areaCm2: number | null;
  measureMethod?: string;
  status: LabelStatus;
  excludeReason?: string;
  retakeRequested?: string;
  history: LabelChange[];
  researchReady?: boolean;
  researchUri?: string;
  researchReviewedBy?: string;
  researchReviewedAt?: string;
  capture?: CaptureMetadata;
}

export type Severity = 'mild' | 'moderate' | 'severe';

export type Trend = 'improving' | 'stable' | 'worsening' | 'insufficient';

/** Mức đau bệnh nhân tự ghi cho một phiên điều trị (mẫu Nerivio). Lưu riêng để không sửa nhật ký thiết bị gửi lên. */
export interface SessionNote {
  sessionId: string;
  painBefore?: number;
  painAfter?: number;
  at: string;
}

/** Trường đánh giá có cấu trúc (mẫu Swift). Danh mục là bản nháp, chờ bác sĩ trong nhóm chọn thang. */
export interface WoundAssessment {
  woundType: string;
  pressureStage?: string;
  granulation?: string;
  epithelial?: string;
  exudate: string;
  infection: string;
}

export interface Evaluation {
  id: string;
  woundId: string;
  imageId?: string;
  date: string;
  doctorId: string;
  areaCm2: number | null;
  characteristics: string;
  symptoms: string;
  symptomSource: string;
  trend: Trend;
  severity?: Severity;
  instructions: string;
  nextReview?: string;
  visibleToPatient: boolean;
  assessment?: WoundAssessment;
}

export type PlanStatus = 'draft' | 'active' | 'paused' | 'ended';

export interface TreatmentPlan {
  id: string;
  patientId: string;
  version: number;
  status: PlanStatus;
  sessionsPerDay: number | null;
  minIntervalMin: number | null;
  targetEnergyWh: number | null;
  startDate: string;
  endDate: string;
  reviewSchedule: string;
  notes: string;
  editedBy: string;
  editedAt: string;
  reason: string;
  confirmed: boolean;
}

export interface Device {
  id: string;
  /** Mã thiết bị in trên vỏ, ví dụ TB-001. */
  code: string;
  model: string;
  patientId?: string;
  online: boolean;
  lastSync: string | null;
  firmware: string;
  power: 'on' | 'off' | 'pending';
  simulated: boolean;
  /** Lần gần nhất làm từng mục chăm sóc (mã mục trong maintenance.ts → thời điểm ISO). */
  care?: Record<string, string>;
}

export interface DeviceSession {
  /** Mã phiên do thiết bị sinh ra; dùng để loại bản ghi gửi trùng. */
  sessionId: string;
  deviceId: string;
  start: string;
  durationMin: number;
  energyWh: number | null;
  status: 'completed' | 'interrupted' | 'over_limit';
  source: 'device' | 'manual' | 'simulated';
}

export interface SymptomReport {
  id: string;
  patientId: string;
  date: string;
  kind: 'symptom' | 'device';
  content: string;
  painLevel?: number;
  handled: boolean;
}

export interface SyncError {
  id: string;
  at: string;
  deviceId?: string;
  message: string;
  resolved: boolean;
}

export interface AppData {
  accounts: Account[];
  patients: Patient[];
  wounds: Wound[];
  images: WoundImage[];
  evaluations: Evaluation[];
  plans: TreatmentPlan[];
  devices: Device[];
  sessions: DeviceSession[];
  sessionNotes: SessionNote[];
  reports: SymptomReport[];
  syncErrors: SyncError[];
  counters: { image: number; patient: number };
}
