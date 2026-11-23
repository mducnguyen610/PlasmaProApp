import type { CaptureMetadata } from './capture/types';
import type { SendResult } from './device/sender';
import type { TransportKind } from './device/transport';
import type { PatientEditEntry } from './patientIdentity';
import type { ImageLabel, LabelEvent } from './imageLabel';
export type { PatientEditEntry };
export type Role = 'doctor' | 'patient' | 'admin';

/** Giai đoạn B: một dòng nhật ký thao tác. action là mã ngắn (ví dụ wound_delete); detail là câu đọc được. */
export interface AuditEntry {
  id: string;
  at: string;
  by: string;
  action: string;
  patientId?: string;
  targetId?: string;
  detail: string;
}

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

/**
 * active: đang trong đợt điều trị. awaiting_closure: bác sĩ ghi nhận biểu mô đã khép lần 1, chờ xác nhận lần 2.
 * follow_up: đã xác nhận liền, đang theo dõi sau điều trị (không còn phiên chiếu). closed: kết thúc theo dõi.
 */
export type WoundStatus = 'active' | 'paused' | 'awaiting_closure' | 'follow_up' | 'closed';

export interface Patient {
  id: string;
  /** Mã hồ sơ dùng trong tên ảnh, ví dụ BN001; không dùng họ tên. */
  code: string;
  researchCode?: string;
  name: string;
  /** Năm sinh. Giữ cho dữ liệu cũ và các màn đang dùng; hồ sơ mới suy từ birthDate. */
  birthYear: number;
  /** Giai đoạn B (CN1 H1): ngày sinh đầy đủ yyyy-mm-dd. Hồ sơ cũ chỉ có năm thì trống (hiện "Chưa đủ ngày sinh"). */
  birthDate?: string;
  sex: 'Nam' | 'Nữ';
  phone: string;
  doctorId: string;
  deviceId?: string;
  /** Đồng ý cho phép dùng ảnh (đã mã hóa) để nghiên cứu, huấn luyện mô hình. */
  researchConsent: boolean;
  consentDate?: string;
  createdAt: string;
  /**
   * Lưu trữ hồ sơ (xóa mềm): thời điểm bác sĩ phụ trách lưu trữ. Có giá trị thì hồ sơ rời danh sách đang theo dõi,
   * mọi dữ liệu lâm sàng giữ nguyên. Trường tùy chọn để dữ liệu cũ đọc được, không cần chuyển đổi.
   */
  archivedAt?: string;
  /** Tài khoản đã lưu trữ hồ sơ. */
  archivedBy?: string;
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
  /** Ngày bác sĩ ghi nhận biểu mô đã khép lần 1 (chờ xác nhận lần 2 sau 14 ngày, theo FDA 2006). */
  closureCheck1?: string;
  /** Ngày xác nhận liền lần 2, bắt đầu theo dõi sau điều trị. */
  followUpFrom?: string;
  /** Giai đoạn B (CN1 H7): thời điểm bác sĩ đặt "Cần tái khám" thủ công; trống là không đặt. */
  revisitAt?: string;
  /** Lần sửa vị trí, nhóm hoặc trạng thái tái khám gần nhất (để xếp vết mới cập nhật trước). */
  updatedAt?: string;
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
  /** Giai đoạn B (CN2): nhãn theo ảnh để huấn luyện lại mô-đun nhận diện (imageLabel.ts). Ảnh gốc và capture không đổi. */
  label?: ImageLabel;
  /** Lịch sử sửa và xác nhận nhãn (N6). Chỉ thêm. */
  labelHistory?: LabelEvent[];
  /** A9: ảnh sau điều trị bệnh nhân chụp, gắn phiên điều trị (DeviceSession.sessionId). */
  sessionId?: string;
}

export type Severity = 'mild' | 'moderate' | 'severe';

export type Trend = 'improving' | 'stable' | 'worsening' | 'insufficient';

/** Mức đau bệnh nhân tự ghi cho một phiên điều trị (mẫu Nerivio). Lưu riêng để không sửa nhật ký thiết bị gửi lên. */
export interface SessionNote {
  sessionId: string;
  painBefore?: number;
  painAfter?: number;
  /** Dung nạp trong lúc chiếu (slide 35: "sans douleurs, ni brûlant ou piquant"). */
  burning?: boolean;
  stinging?: boolean;
  /** Phản ứng da quanh vết thương ngày hôm sau (slide 29: ban đỏ, phù). */
  rednessNextDay?: boolean;
  swellingNextDay?: boolean;
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
/**
 * Một giai đoạn của đợt điều trị (slide 39, 40: mỗi ngày rồi thưa dần).
 * - daily: mỗi ngày.
 * - every_n_days: cách n ngày tính từ ngày đầu giai đoạn (n = 2 là cách ngày).
 * - n_per_week: n buổi mỗi tuần vào các thứ cố định (xem WEEK_DAYS trong course.ts).
 */
export type PhasePattern = 'daily' | 'every_n_days' | 'n_per_week';
export interface CoursePhase { from: string; to: string; pattern: PhasePattern; n: number }
export type CourseEndReason = 'healed' | 'stopped' | 'no_progress' | 'other';

export interface TreatmentPlan {
  id: string;
  patientId: string;
  /** Đợt điều trị gắn với một vết thương. Bản cũ không có trường này thì coi là vết đầu tiên của bệnh nhân. */
  woundId?: string;
  /** Các giai đoạn; trống thì coi như mỗi ngày từ startDate đến endDate. */
  phases?: CoursePhase[];
  /** Mức năng lượng trên thiết bị (thiết bị tại nhà bị khóa ở mức này, slide 24). Đây là energy_level gửi firmware. */
  doseLevel?: number | null;
  /** Chế độ điều trị gửi firmware (treatment_mode), ví dụ cold, hybrid, thermal. Bản cũ không có trường này. */
  treatmentMode?: string | null;
  /** Thời gian chiếu mỗi lần, giây. */
  durationSec?: number | null;
  /** Hệ số giây/cm² để gợi ý thời gian theo diện tích (S2k 2022, Stratmann 2020). Chờ nhóm phần cứng xác nhận. */
  secondsPerCm2?: number | null;
  /** Diện tích dùng để so sánh ở mốc xem lại. */
  areaAtStart?: number | null;
  /** Ngày thứ mấy của đợt cần xem lại hiệu quả (mặc định 28, Sheehan 2003). */
  reviewAtDay?: number | null;
  endReason?: CourseEndReason;
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
  /**
   * Giai đoạn B (AU-05): mã phác đồ. Các phiên bản sửa của cùng phác đồ chung mã này; phác đồ mới cho vết thương có mã mới.
   * Mã phiên bản là id. Dữ liệu cũ được gán khi đọc (planVersion.ts, migratePlans).
   */
  protocolId?: string;
  /** Giai đoạn B (AU-04): thời điểm bệnh nhân xác nhận đã đọc phiên bản này. Chưa có thì không nạp liệu trình, không ghi phiên. */
  patientAckAt?: string;
  /** Giai đoạn B (CN3 P3, AU-06): ảnh căn cứ khi tạo phác đồ mới: ảnh ứng dụng đề xuất và ảnh bác sĩ chọn. */
  suggestedBasisImageId?: string;
  basisImageId?: string;
  /** Giai đoạn B (CN3 P8, AU-08): nhật ký tạm dừng, tiếp tục của phiên bản này (người, thời điểm, lý do). */
  statusLog?: PlanStatusEvent[];
}

export interface PlanStatusEvent { at: string; by: string; action: 'pause' | 'resume'; reason: string }

export type DeviceLifecycle = 'in_use' | 'returned' | 'disinfected' | 'ready';
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
  /** Đầu phát dùng riêng cho bệnh nhân đang giữ thiết bị (slide 25 "embouts à usage individuel"). */
  tip?: { code: string; issuedAt: string };
  /** Vòng đời thiết bị cho thuê (slide 24): đang dùng, đã thu hồi, đã khử khuẩn, sẵn sàng cấp. */
  lifecycle?: DeviceLifecycle;
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
  /** Vết thương được chiếu trong phiên (bệnh nhân chọn trên thiết bị hoặc ứng dụng khi có nhiều vết). */
  woundId?: string;
  /** Giai đoạn B (AU-05): phiên bản phác đồ (TreatmentPlan.id), số phiên bản và mã phác đồ áp dụng khi ghi phiên. Phiên cũ để trống. */
  planId?: string;
  planVersion?: number;
  protocolId?: string;
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

/** Một lần gửi cấu hình điều trị xuống máy qua USB/UART. */
export interface DeviceLinkLog {
  id: string;
  deviceId: string | null;
  patientId: string;
  planId: string;
  planVersion: number;
  at: string;
  by: string;
  transport: TransportKind;
  result: SendResult['kind'];
  attempts: number;
  code?: string;
  protocolVersion: number;
  capsSource: 'device' | 'table' | 'none';
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
  /** Nhật ký gửi cấu hình xuống máy. Tùy chọn để dữ liệu cũ đọc được. */
  deviceLinks?: DeviceLinkLog[];
  /** Giai đoạn B (CN1 H8): nhật ký sửa hồ sơ (cũ, mới, người sửa, thời điểm). */
  patientEdits?: PatientEditEntry[];
  /** Giai đoạn B: nhật ký thao tác quản lý (xóa vết, xóa phác đồ, tạm dừng, giao, thu hồi, khử khuẩn máy...). Chỉ thêm, không sửa. */
  auditLog?: AuditEntry[];
  counters: { image: number; patient: number };
}
