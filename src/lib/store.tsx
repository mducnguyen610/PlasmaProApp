import * as Crypto from 'expo-crypto';
import { createWritePath } from './writePath';
import { canAddReport, canHandleReport, canManagePatient, canResolveSyncError, TERMS_VERSION } from './access';
import { ACTIVATION_DAYS, generateActivationCode, hashDemoPassword, isPendingActivation, isRecordUsername, MAX_ACTIVATION_ATTEMPTS, normalizeUsername, verifyPassword } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createPersistence } from './persistence';
import { newIntegrityIssues, type IntegrityIssue } from './integrity';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { reassignDevice } from './devices';
import { CLOSURE_CONFIRM_DAYS, addDays, isScheduled, localDay } from './course';
import { CARE_ITEMS, LIFECYCLE } from './maintenance';
import { assignBlocker, catalogErrors, STA_ERROR_FAULT } from './deviceState';
import { buildFilename } from './naming';
import { archiveBlocker, isArchived, splitDoctorPatientPatch, validateWoundLocation } from './patientRecord';
import { isoToVn, patientEditEntries, validateNewPatient, validatePatientEdit } from './patientIdentity';
import { woundDeleteBlocker } from './woundStatus';
import { applyLabelPatch, missingForConfirm, type ImageLabel } from './imageLabel';
import { isPendingCapture } from './pendingCapture';
import { createSeed } from './seed';
import { canLoadPlan, loadedPlanLink, migratePlans, openProtocolId, planDeleteBlocker, planPhotoCandidates, protocolIdFor } from './planVersion';
import { CAPABILITIES, SIM_MODEL, capabilitiesFor } from './device/capabilities';
import type {
  Account, AppData, AuditEntry, Device, DeviceEvent, DeviceLifecycle, DeviceLinkLog, DeviceSession, Evaluation, Patient, SessionNote, SymptomReport, TreatmentPlan, Wound, WoundImage,
} from './types';

// v2: dữ liệu demo theo đợt điều trị (ngày tính từ hôm nay); bản v1 cũ không được đọc lại.
// Stage 9C (gói B, D): đọc ghi bền qua tầng hạ tầng src/lib/persistence.ts (một hàng ghi, giữ bản sao khi dữ liệu hỏng).
const persistence = createPersistence<AppData>(AsyncStorage);

export const nowIso = () => new Date().toISOString();
export const todayIso = () => localDay();

async function persistImageFile(uri: string, imageId: string, ext: string): Promise<string> {
  if (Platform.OS === 'web') {
    if (uri.startsWith('data:')) return uri;
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Không đọc được tệp ảnh.');
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error('Không lưu được ảnh trên trình duyệt.'));
      reader.readAsDataURL(blob);
    });
  }
  // Lưu tệp theo mã ảnh ổn định; tên hiển thị/xuất là siêu dữ liệu riêng, nên đổi tên
  // không bao giờ chạm vào nội dung ảnh (đặc tả 4.4, 12).
  const { Directory, File, Paths } = await import('expo-file-system');
  const dir = new Directory(Paths.document, 'wound-images');
  if (!dir.exists) dir.create();
  const dest = new File(dir, `${imageId}.${ext}`);
  if (dest.exists) dest.delete();
  await new File(uri).copy(dest);
  return dest.uri;
}

/** Xóa tệp ảnh của ứng dụng (tệp tạm của ảnh chờ, hoặc tệp đã chép khi lần ghi dữ liệu lỗi). Trên web ảnh là data URL nên không có tệp. */
async function removeImageFile(uri: string | undefined): Promise<void> {
  if (!uri || Platform.OS === 'web' || uri.startsWith('data:')) return;
  try {
    const { File } = await import('expo-file-system');
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // Xóa tệp là dọn dẹp, không ảnh hưởng dữ liệu; lỗi xóa không chặn thao tác.
  }
}

/** Hồ sơ có cùng số điện thoại (quy tắc trùng của addPatient). Màn hình bắt lỗi này để cho bác sĩ xem hồ sơ trùng. */
export class DuplicatePatientError extends Error {
  constructor(public duplicate: Patient, message?: string) {
    super(message ?? `Số điện thoại đã có hồ sơ ${duplicate.code}. Nếu bệnh nhân đã tự đăng ký, nhờ quản trị phân công hồ sơ đó cho bạn thay vì tạo hồ sơ mới.`);
    this.name = 'DuplicatePatientError';
  }
}

/** Giai đoạn B (CN1 H3): chỉ trùng số điện thoại. Không chặn; nơi gọi hỏi bác sĩ rồi gọi lại với allowPhoneDuplicate. */
export class PhoneDuplicateWarning extends Error {
  constructor(public duplicates: Patient[]) {
    super(`Số điện thoại đã có ở hồ sơ ${duplicates.map((p) => p.code).join(', ')}.`);
    this.name = 'PhoneDuplicateWarning';
  }
}

interface Store {
  ready: boolean;
  data: AppData;
  me: Account | null;
  authenticate: (username: string, password: string, agreed: boolean) => Promise<void>;
  register: (input: { name: string; username: string; password: string; role: Account['role']; phone: string; birthYear: number; sex: Patient['sex']; agreed: boolean; researchConsent: boolean }) => Promise<void>;
  setResearchConsent: (consent: boolean) => Promise<void>;
  logout: () => void;
  finishOnboarding: () => Promise<void>;
  resetDemo: () => void;
  /**
   * Giai đoạn B (CN1 H1, H3): cần họ tên, ngày sinh, giới tính, số điện thoại. Trùng cả ba trường thì ném DuplicatePatientError;
   * chỉ trùng số thì ném PhoneDuplicateWarning trừ khi allowPhoneDuplicate.
   */
  addPatient: (p: Omit<Patient, 'id' | 'code' | 'createdAt' | 'researchCode' | 'birthYear'> & { birthDate: string }, woundLocation?: string, opts?: { allowPhoneDuplicate?: boolean }) => Promise<{ patient: Patient; activation: Activation }>;
  issueActivation: (patientId: string) => Promise<Activation>;
  activateAccount: (input: { username: string; code: string; password: string; agreed: boolean; researchConsent?: boolean }) => Promise<void>;
  /**
   * Quản trị: chỉ đổi bác sĩ phụ trách (Q01, giữ nguyên như cũ). Bác sĩ phụ trách: họ tên, năm sinh, số điện thoại, đồng ý nghiên cứu;
   * trường khác (doctorId, id, code, lưu trữ) bị từ chối. Nhánh bác sĩ ghi bộ nhớ máy trước rồi mới cập nhật (CR-01).
   */
  updatePatient: (id: string, patch: Partial<Patient>) => Promise<void>;
  /** Lưu trữ (xóa mềm) hoặc khôi phục hồ sơ; chỉ bác sĩ phụ trách. Không xóa dữ liệu nào. */
  setPatientArchived: (id: string, archived: boolean) => Promise<void>;
  addWound: (patientId: string, location: string, group?: string) => Promise<Wound>;
  /** Sửa vị trí (và nhóm tổn thương) của vết thương; giữ woundId, patientId, mã vết. Trạng thái chỉ đổi qua recordClosure. */
  updateWound: (id: string, patch: Partial<Wound>) => Promise<void>;
  deleteWound: (woundId: string) => Promise<void>;
  setWoundRevisit: (woundId: string, on: boolean) => Promise<void>;
  /** Bác sĩ phụ trách chụp cho vết của hồ sơ mình; bệnh nhân chỉ gửi ảnh sau điều trị cho vết của mình, gắn phiên (A9). */
  addImage: (args: { woundId: string; uri: string; ext: WoundImage['ext']; captureDate: string; source: 'doctor' | 'patient'; capture?: WoundImage['capture']; sessionId?: string }) => Promise<WoundImage>;
  /** Giai đoạn B (CN2): lưu nhãn đang gán (nháp). Sửa nhãn đã xác nhận thì nhãn về Đang gán. Có lịch sử. */
  saveImageLabel: (imageId: string, patch: Omit<ImageLabel, 'confirmedAt' | 'confirmedBy' | 'updatedAt' | 'updatedBy'>) => Promise<void>;
  /** K1: bác sĩ xác nhận nhãn khi đủ nhãn, đã chọn tin cậy và chất lượng Đạt. */
  confirmImageLabel: (imageId: string) => Promise<void>;
  // CR-01: các thao tác lưu lâm sàng chỉ hoàn tất khi đã ghi xong vào bộ nhớ máy; lỗi ghi thì từ chối và dữ liệu trên màn không đổi.
  labelImage: (imageId: string, area: number | null, method: string | undefined, note?: string) => Promise<void>;
  setExcluded: (imageId: string, reason: string | null) => Promise<void>;
  requestRetake: (imageId: string, note: string | null) => Promise<void>;
  addEvaluation: (e: Omit<Evaluation, 'id' | 'doctorId'>) => Promise<void>;
  /**
   * Giai đoạn B (CN3 P2, P6, P7): vết đang có phác đồ mở (nháp, đang áp dụng, tạm dừng) thì lưu thành phiên bản mới của phác đồ đó.
   * Không có thì tạo phác đồ mới cho đợt khác, cần ảnh căn cứ hợp lệ trong ngày (P1, P3): basisImageId.
   */
  savePlan: (p: Omit<TreatmentPlan, 'id' | 'version' | 'editedBy' | 'editedAt' | 'protocolId' | 'patientAckAt' | 'suggestedBasisImageId' | 'statusLog'> & { id?: string }) => Promise<void>;
  /** Giai đoạn B (CN3 P8, AU-08): bác sĩ tạm dừng hoặc tiếp tục phiên bản đang áp dụng, bắt buộc lý do. Không đổi trạng thái vết. */
  setPlanPaused: (planId: string, paused: boolean, reason: string) => Promise<void>;
  /** Giai đoạn B (CN3 P9, AU-09): xóa phác đồ chưa có phiên, bắt buộc lý do; ghi nhật ký. */
  deletePlan: (protocolId: string, reason: string) => Promise<void>;
  /** Giai đoạn B (AU-04): bệnh nhân xác nhận đã đọc phiên bản đang áp dụng; chỉ sau đó mới nạp liệu trình được. */
  acknowledgePlan: (planId: string) => Promise<void>;
  setDevicePower: (deviceId: string, on: boolean) => void;
  simulateSession: (deviceId: string) => { ok: boolean; message: string };
  /** Giai đoạn B (CN4 D1, AU-25): quản trị thêm, sửa danh mục máy (mã, số sê-ri, dòng máy). */
  registerDevice: (input: { code: string; serial: string; model: string }) => Promise<void>;
  updateDevice: (deviceId: string, input: { code: string; serial: string; model: string }) => Promise<void>;
  /** Giao máy (CN4 D2, D8): chỉ máy Sẵn sàng, bệnh nhân có phác đồ đang hoạt động và chưa giữ máy khác. null là thu hồi. */
  assignDevice: (deviceId: string, patientId: string | null) => Promise<void>;
  /** Giai đoạn B (CN4 D5): bác sĩ ghi đã xử lý lỗi máy, bắt buộc ghi chú. Ứng dụng không gửi lệnh khắc phục xuống máy. */
  clearDeviceFault: (deviceId: string, note: string) => Promise<void>;
  /** Giai đoạn B (CN4 D4, AU-27): bệnh nhân kết nối, ngắt kết nối máy của mình; chỉ ghi nhật ký, không đổi lớp USB/UART. */
  recordDeviceConnection: (kind: 'connect' | 'disconnect', transport: string) => Promise<void>;
  addReport: (r: Omit<SymptomReport, 'id' | 'date' | 'handled'>) => Promise<void>;
  setReportHandled: (id: string) => Promise<void>;
  updateAccount: (id: string, patch: Partial<Account>) => Promise<void>;
  resolveSyncError: (id: string) => Promise<void>;
  setSessionPain: (sessionId: string, pain: Pick<SessionNote, 'painBefore' | 'painAfter' | 'burning' | 'stinging' | 'rednessNextDay' | 'swellingNextDay'>) => Promise<void>;
  markCareDone: (deviceId: string, itemId: string) => Promise<void>;
  /** Quy trình kết thúc đợt khi liền thương (FDA 2006: xác nhận ở hai lần khám cách 2 tuần), rồi theo dõi. */
  recordClosure: (woundId: string, step: 'check1' | 'confirm' | 'not_healed' | 'reopen' | 'end_follow_up' | 'pause' | 'resume') => Promise<void>;
  setLifecycle: (deviceId: string, next: DeviceLifecycle) => Promise<void>;
  /** Ghi một lần gửi cấu hình xuống máy; người bệnh của hồ sơ hoặc bác sĩ phụ trách. */
  recordDeviceLink: (entry: Omit<DeviceLinkLog, 'id' | 'at' | 'by'>) => Promise<void>;
  /**
   * Ghi một phiên điều trị nhận qua USB (STA running rồi done, stopped hoặc error); người bệnh của hồ sơ hoặc bác sĩ phụ trách.
   * Trả false khi hồ sơ chưa được giao máy, vì phiên phải gắn với một thiết bị.
   */
  recordDeviceSession: (entry: { patientId: string; woundId?: string; startedAt: string; durationSec: number; outcome: 'done' | 'stopped' | 'error' }) => Promise<boolean>;
  /** Stage 9C (gói D): sự cố lưu trữ đang có (null là bình thường). Màn hình chung hiện thông báo khi khác null. */
  persistIssue: PersistIssue | null;
  /** Ghi lại bản dữ liệu đang hiển thị sau một lần ghi nền lỗi. */
  retryPersist: () => Promise<void>;
  /** Ẩn thông báo dữ liệu cũ không đọc được (bản sao vẫn giữ). */
  dismissPersistIssue: () => void;
}

/**
 * write_failed: một lần ghi nền lỗi, thay đổi đang hiển thị chưa chắc đã ghi bền.
 * unreadable: dữ liệu cũ không đọc được, đã chép sang backupKey, ứng dụng dùng dữ liệu mẫu.
 * read_failed: kho không đọc được; ứng dụng không ghi để khỏi đè dữ liệu cũ.
 */
export type PersistIssue = { kind: 'write_failed' } | { kind: 'unreadable'; backupKey: string | null } | { kind: 'read_failed' };

/**
 * Đăng nhập đúng mật khẩu nhưng tài khoản chưa đồng ý phiên bản điều khoản hiện hành (R8).
 * Màn đăng nhập bắt lỗi này để hiện ô đồng ý; người đã đồng ý đúng phiên bản không bị hỏi lại.
 */
export class TermsRequiredError extends Error {
  constructor(public reason: 'first' | 'updated') {
    super(reason === 'first' ? 'Hãy đọc và đồng ý điều khoản trước lần đăng nhập đầu tiên.' : `Điều khoản đã cập nhật (phiên bản ${TERMS_VERSION}). Hãy đọc và đồng ý để tiếp tục.`);
    this.name = 'TermsRequiredError';
  }
}

/** Ghi vào bộ nhớ máy thất bại (đầy bộ nhớ, bị chặn). Dữ liệu chưa được lưu. */
/** Lần ghi bị từ chối vì làm phát sinh lỗi quan hệ dữ liệu (gói D). Dữ liệu trên màn và trong bộ nhớ máy không đổi. */
export class IntegrityError extends Error {
  issues: IntegrityIssue[];
  constructor(issues: IntegrityIssue[]) {
    super('Chưa lưu vì dữ liệu sẽ bị sai liên kết: ' + issues.map((x) => x.detail).join('; ') + '.');
    this.name = 'IntegrityError';
    this.issues = issues;
  }
}

export class PersistError extends Error {
  constructor(public cause: unknown) {
    super('Không ghi được vào bộ nhớ máy (có thể bộ nhớ đã đầy). Dữ liệu này chưa được lưu');
    this.name = 'PersistError';
  }
}

/** Mã kích hoạt chỉ trả về một lần cho bác sĩ; trong dữ liệu chỉ lưu bản băm. */
export interface Activation { username: string; code: string; expiresAt: string }

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createSeed);
  const [meId, setMeId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [persistIssue, setPersistIssue] = useState<PersistIssue | null>(null);
  // Kho không đọc được lúc mở: không ghi gì, để dữ liệu mẫu không đè lên dữ liệu thật chưa đọc được.
  const readFailedRef = useRef(false);
  // Ảnh chờ gắn hồ sơ (luồng "Chụp cho bệnh nhân mới"), ngoài AppData.
  // Mỗi tài khoản bác sĩ giữ tối đa một ảnh chờ (máy demo dùng chung cho nhiều tài khoản): ảnh của bác sĩ này không bị bác sĩ khác thay.
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    (async () => {
      const loaded = await persistence.load();
      if (loaded.kind === 'unreadable') setPersistIssue({ kind: 'unreadable', backupKey: loaded.backupKey });
      if (loaded.kind === 'failed') { readFailedRef.current = true; setPersistIssue({ kind: 'read_failed' }); }
      try {
        const sess = loaded.kind === 'failed' ? null : loaded.session;
        if (loaded.kind === 'loaded') {
          const original: AppData = loaded.data;
          const saved: AppData = { ...original };
          saved.sessionNotes ??= [];
          saved.deviceLinks ??= [];
          saved.patients = saved.patients.map(p => ({ ...p, researchCode: p.researchCode ?? 'RS-' + Crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase() }));
          // Giai đoạn B (AU-05): gán vết thương và mã phác đồ cho phiên bản cũ (xác định, không xóa bản ghi).
          const plans = migratePlans(saved.plans, saved.wounds);
          const migrated = plans.some((x, i) => x !== saved.plans[i]);
          saved.plans = plans;
          let backedUp = !migrated;
          if (migrated) {
            // Sao lưu bản cũ trước khi ghi bản đã chuyển đổi; sao lưu lỗi thì chỉ dùng bản chuyển đổi trong phiên, không ghi đè.
            try { await persistence.backupBeforeMigration(original); backedUp = true; } catch { readFailedRef.current = true; setPersistIssue({ kind: 'read_failed' }); }
          }
          setData(saved);
          dataRef.current = saved;
          // Vừa đọc từ bộ nhớ máy: không cần ghi lại, trừ khi vừa chuyển đổi (đã sao lưu) thì để hiệu ứng ghi nền ghi bản mới.
          persistedRef.current = migrated && backedUp ? null : saved;
        }
        if (sess) setMeId(sess);
        // Giai đoạn B (CN2 A1, XN-10): bỏ luồng "chụp trước, tạo hồ sơ sau", không còn ảnh chưa liên kết.
        // Ảnh chờ còn sót từ bản cũ được bỏ một lần: xóa tệp tạm và khóa lưu riêng. Dữ liệu chính (hồ sơ, ảnh đã lưu) không đổi.
        const held = await persistence.loadPending();
        if (held && typeof held === 'object') {
          for (const v of Object.values(held as Record<string, unknown>)) {
            if (!isPendingCapture(v)) continue;
            void removeImageFile(v.uri);
            void removeImageFile(v.capture.ar?.depth?.uri);
            void removeImageFile(v.capture.ar?.depth?.confidenceUri);
          }
          await persistence.clearPending().catch(() => {});
        }
      } catch {
        // Bộ nhớ không đọc được: dùng dữ liệu mô phỏng mặc định.
      }
      setReady(true);
    })();
  }, []);

  // Stage 9C (gói F): bản đã ghi bền gần nhất. commit() vừa ghi bản này thì hiệu ứng dưới không ghi lại lần hai
  // (trước đây mỗi lần lưu ghi toàn bộ dữ liệu 2 lần, đo bằng scripts/do-hieu-nang-9c.cjs). Nội dung ghi không đổi.
  const persistedRef = useRef<AppData | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (data === persistedRef.current || readFailedRef.current) return;
    // Ghi nền cho các thao tác không qua commit (mô phỏng IoMT, đăng nhập). Lỗi ghi không còn bị bỏ qua: ghi nhận để màn hình báo.
    persistence.saveData(data).then(() => { persistedRef.current = data; setPersistIssue((x) => (x?.kind === 'write_failed' ? null : x)); }, () => setPersistIssue({ kind: 'write_failed' }));
  }, [data, ready]);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    const next = fn(dataRef.current);
    dataRef.current = next;
    setData(next);
  }, []);
  /**
   * CR-01 (SV-01, AL-03): ghi bản dữ liệu mới vào bộ nhớ máy trước, chỉ khi ghi xong mới cập nhật màn hình.
   * Ghi lỗi thì ném PersistError và dữ liệu đang hiển thị giữ nguyên, để màn hình không báo "Đã lưu" khi chưa có bằng chứng.
   */
  // Stage 9B (S8-B06): các commit xếp hàng, mỗi commit tính từ bản mới nhất lúc tới lượt (src/lib/commitQueue.ts).
  const commitQueue = useRef<((fn: (d: AppData) => AppData) => Promise<AppData>) | null>(null);
  // Stage 9C (gói D): đường ghi ở src/lib/writePath.ts (xếp hàng, kiểm quan hệ, ghi bền rồi mới đổi màn hình).
  commitQueue.current ??= createWritePath<AppData>({
    read: () => dataRef.current,
    save: (next) => persistence.saveData(next),
    apply: (next) => update(() => next),
    // Từ chối bản mới nếu nó làm phát sinh lỗi quan hệ (mồ côi, gắn chéo bệnh nhân, trùng mã).
    check: (base, next) => {
      const added = newIntegrityIssues(base, next);
      return added.length ? new IntegrityError(added) : null;
    },
    blocked: () => (readFailedRef.current ? 'Chưa đọc được bộ nhớ máy nên chưa lưu, để không ghi đè dữ liệu cũ.' : null),
    onPersisted: (next) => { persistedRef.current = next; },
    wrapWriteError: (e) => new PersistError(e),
  });
  const commit = useCallback(async (fn: (d: AppData) => AppData) => {
    await commitQueue.current!(fn);
  }, []);
  const me = data.accounts.find((a) => a.id === meId && !a.locked && !a.pendingApproval) ?? null;
  const meRef = useRef(me);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const login = useCallback((id: string) => {
    setMeId(id);
    persistence.saveSession(id).catch(() => {});
  }, []);
  const logout = useCallback(() => {
    meRef.current = null;
    setMeId(null);
    persistence.clearSession().catch(() => {});
  }, []);
  const finishOnboarding = async () => {
    const actor = meRef.current;
    if (!actor) return;
    await commit(d => ({ ...d, accounts: d.accounts.map(a => a.id === actor.id ? { ...a, onboardingDoneAt: nowIso() } : a) }));
  };
  const resetDemo = () => {
    if (meRef.current?.role !== 'admin') throw new Error('Cần quyền quản trị.');
    update(() => createSeed()); logout();
  };
  // Chỉ hỏi đồng ý điều khoản khi tài khoản chưa đồng ý phiên bản hiện hành (đề xuất 4, rủi ro R8).
  const authenticate: Store['authenticate'] = async (username, password, agreed) => {
    const account = dataRef.current.accounts.find(a => a.username.toLowerCase() === normalizeUsername(username));
    if (account && isPendingActivation(account)) throw new Error('Tài khoản chưa kích hoạt. Hãy chọn "Kích hoạt tài khoản" và nhập mã bác sĩ đưa.');
    if (!account || !await verifyPassword(account, password)) throw new Error('Tên đăng nhập hoặc mật khẩu chưa đúng.');
    const current = dataRef.current.accounts.find(a => a.id === account.id)!;
    if (current.pendingApproval) throw new Error('Tài khoản đang chờ quản trị duyệt.');
    if (current.locked) throw new Error('Tài khoản đã bị khóa.');
    if (current.termsVersion !== TERMS_VERSION) {
      if (!agreed) throw new TermsRequiredError(current.termsVersion ? 'updated' : 'first');
      await commit(d => ({ ...d, accounts: d.accounts.map(a => a.id === account.id ? { ...a, termsVersion: TERMS_VERSION, termsAcceptedAt: nowIso() } : a) }));
    }
    login(account.id);
  };
  const register: Store['register'] = async (input) => {
    const username = normalizeUsername(input.username);
    if (!input.agreed) throw new Error('Bạn cần đồng ý điều khoản.');
    if (input.name.trim().length < 2) throw new Error('Hãy nhập họ và tên.');
    if (!/^[a-z0-9_.]{4,32}$/.test(username)) throw new Error('Tên đăng nhập gồm 4–32 chữ không dấu, số, dấu chấm hoặc gạch dưới.');
    if (isRecordUsername(username)) throw new Error('Tên đăng nhập dạng mã hồ sơ (bn...) dành cho tài khoản bác sĩ tạo. Nếu bác sĩ đã đưa mã kích hoạt, hãy dùng "Kích hoạt tài khoản".');
    if (input.password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
    if (!/^(0[0-9]{9}|\+84[0-9]{9})$/.test(input.phone.replace(/\s/g, ''))) throw new Error('Số điện thoại chưa đúng định dạng.');
    if (input.role === 'patient' && (!Number.isInteger(input.birthYear) || input.birthYear < 1900 || input.birthYear > new Date().getFullYear())) throw new Error('Năm sinh chưa hợp lệ.');
    const salt = Crypto.randomUUID();
    const passwordHash = await hashDemoPassword(input.password, salt);
    if (dataRef.current.accounts.some(a => a.username.toLowerCase() === username)) throw new Error('Tên đăng nhập đã được sử dụng.');
    const id = 'u-' + Crypto.randomUUID();
    const patientId = 'p-' + Crypto.randomUUID();
    const isPatient = input.role === 'patient';
    const account: Account = {
      id, name: input.name.trim(), username, role: input.role, locked: !isPatient, pendingApproval: !isPatient,
      passwordSalt: salt, passwordHash, patientId: isPatient ? patientId : undefined,
      researchAccess: false, termsAcceptedAt: nowIso(), termsVersion: TERMS_VERSION,
    };
    const researchCode = 'RS-' + Crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase();
    await commit(d => ({
      ...d, accounts: [...d.accounts, account],
      patients: isPatient ? [...d.patients, {
        id: patientId, code: 'BN' + String(d.counters.patient + 1).padStart(3, '0'),
        researchCode,
        name: account.name, phone: input.phone.trim(), birthYear: input.birthYear, sex: input.sex, doctorId: '',
        researchConsent: input.researchConsent, consentDate: input.researchConsent ? nowIso() : undefined, createdAt: todayIso(),
      }] : d.patients,
      counters: { ...d.counters, patient: d.counters.patient + (isPatient ? 1 : 0) },
    }));
  };
  // allowArchived: chỉ các thao tác được làm trên hồ sơ đã lưu trữ (khôi phục, thu hồi máy). Mặc định hồ sơ đã lưu trữ chỉ xem,
  // để không phát sinh ảnh, đánh giá, đợt điều trị, vết thương hay giao máy mới.
  const requireDoctor = (patientId: string, opts?: { allowArchived?: boolean }) => {
    const actor = dataRef.current.accounts.find(a => a.id === meRef.current?.id);
    const patient = dataRef.current.patients.find(p => p.id === patientId);
    if (!canManagePatient(actor, patient)) throw new Error('Chỉ bác sĩ phụ trách được thực hiện thao tác này.');
    if (!opts?.allowArchived && isArchived(patient)) throw new Error('Hồ sơ đã lưu trữ, chỉ xem được. Khôi phục hồ sơ trước khi thêm hoặc sửa dữ liệu.');
    return actor!;
  };
  const setResearchConsent: Store['setResearchConsent'] = async (consent) => {
    const actor = meRef.current;
    if (!actor || actor.locked || actor.role !== 'patient') throw new Error('Chỉ bệnh nhân cập nhật đồng ý của mình.');
    await commit(d => ({ ...d, patients: d.patients.map(p => p.id === actor.patientId ? { ...p, researchConsent: consent, consentDate: nowIso() } : p) }));
  };
  // Giai đoạn B (CN2): bỏ bước bác sĩ bấm chia sẻ từng ảnh (setResearchReady). Tập huấn luyện suy ra từ nhãn đã xác nhận
  // (imageLabel.trainingImages); bản PNG bỏ metadata tạo lúc xuất (export.ts). Trường researchReady, researchUri cũ giữ nguyên trong dữ liệu.

  // Tạo (hoặc làm mới) mã kích hoạt cho tài khoản bệnh nhân của hồ sơ.
  const newActivation = async (patient: Patient, existing: Account | undefined, accounts: Account[]) => {
    const code = generateActivationCode();
    const salt = Crypto.randomUUID();
    const expiresAt = new Date(Date.now() + ACTIVATION_DAYS * 86400000).toISOString();
    let username = existing?.username ?? patient.code.toLowerCase();
    if (!existing && accounts.some(a => a.username.toLowerCase() === username)) username += '.' + Crypto.randomUUID().slice(0, 4);
    const account: Account = {
      ...(existing ?? { id: 'u-' + Crypto.randomUUID(), role: 'patient' as const, name: patient.name, locked: false, patientId: patient.id }),
      username, activationSalt: salt, activationHash: await hashDemoPassword(code, salt), activationExpiresAt: expiresAt, activationAttempts: 0,
    };
    return { account, activation: { username, code, expiresAt } };
  };

  const addPatient: Store['addPatient'] = async (p, woundLocation, opts) => {
    if (meRef.current?.role !== 'doctor' || p.doctorId !== meRef.current.id) throw new Error('Cần quyền bác sĩ phụ trách.');
    // Giai đoạn B (CN1 H1, H3): kiểm lại ở kho, không chỉ ở màn. Ngày sinh nhận dạng yyyy-mm-dd.
    const check = validateNewPatient({ name: p.name, birthDate: isoToVn(p.birthDate), phone: p.phone }, dataRef.current.patients, todayIso());
    if (check.exact) throw new DuplicatePatientError(check.exact, `Đã có hồ sơ ${check.exact.code} trùng họ tên, ngày sinh và số điện thoại. Mở hồ sơ có sẵn thay vì tạo mới.`);
    if (!check.value) throw new Error(Object.values(check.errors).join(' '));
    if (check.phoneOnly.length && !opts?.allowPhoneDuplicate) throw new PhoneDuplicateWarning(check.phoneOnly);
    const n = dataRef.current.counters.patient + 1;
    const patient: Patient = {
      ...p, ...check.value,
      researchCode: 'RS-' + Crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase(),
      // Giai đoạn B (CN1): mã nội bộ ổn định, không dựa vào giờ máy.
      id: 'p-' + Crypto.randomUUID(), code: `BN${String(n).padStart(3, '0')}`, createdAt: todayIso(),
    };
    const wound: Wound | null = woundLocation
      ? { id: 'w-' + Crypto.randomUUID(), patientId: patient.id, code: 'VT01', location: woundLocation, startDate: todayIso(), status: 'active' }
      : null;
    const { account, activation } = await newActivation(patient, undefined, dataRef.current.accounts);
    await commit((d) => ({
      ...d,
      patients: [...d.patients, patient],
      accounts: [...d.accounts, account],
      wounds: wound ? [...d.wounds, wound] : d.wounds,
      counters: { ...d.counters, patient: n },
    }));
    return { patient, activation };
  };

  const issueActivation: Store['issueActivation'] = async (patientId) => {
    requireDoctor(patientId);
    const patient = dataRef.current.patients.find(p => p.id === patientId)!;
    const existing = dataRef.current.accounts.find(a => a.patientId === patientId);
    if (existing && !isPendingActivation(existing)) throw new Error('Tài khoản đã kích hoạt; bệnh nhân đăng nhập bằng mật khẩu của mình.');
    const { account, activation } = await newActivation(patient, existing, dataRef.current.accounts);
    await commit(d => ({ ...d, accounts: existing ? d.accounts.map(a => a.id === account.id ? account : a) : [...d.accounts, account] }));
    return activation;
  };

  const activateAccount: Store['activateAccount'] = async ({ username, code, password, agreed, researchConsent }) => {
    if (!agreed) throw new Error('Bạn cần đồng ý điều khoản.');
    if (password.length < 8) throw new Error('Mật khẩu cần ít nhất 8 ký tự.');
    const invalid = 'Mã kích hoạt không đúng hoặc đã hết hạn. Hãy nhờ bác sĩ cấp mã mới.';
    const account = dataRef.current.accounts.find(a => a.username.toLowerCase() === normalizeUsername(username));
    if (!account || !isPendingActivation(account) || !account.activationHash || !account.activationSalt) throw new Error(invalid);
    if (!account.activationExpiresAt || account.activationExpiresAt < nowIso()) throw new Error(invalid);
    const cleared = { activationHash: undefined, activationSalt: undefined, activationExpiresAt: undefined, activationAttempts: undefined };
    if (await hashDemoPassword(code.trim(), account.activationSalt) !== account.activationHash) {
      const attempts = (account.activationAttempts ?? 0) + 1;
      const spent = attempts >= MAX_ACTIVATION_ATTEMPTS;
      await commit(d => ({ ...d, accounts: d.accounts.map(a => a.id === account.id ? { ...a, ...(spent ? cleared : { activationAttempts: attempts }) } : a) }));
      throw new Error(spent ? 'Nhập sai quá nhiều lần, mã đã bị hủy. Hãy nhờ bác sĩ cấp mã mới.' : `Mã kích hoạt chưa đúng. Còn ${MAX_ACTIVATION_ATTEMPTS - attempts} lần thử.`);
    }
    const salt = Crypto.randomUUID();
    const passwordHash = await hashDemoPassword(password, salt);
    // Giai đoạn B (CN2 N10, C1): bệnh nhân tự chọn đồng ý dùng dữ liệu khi kích hoạt; không chọn vẫn dùng ứng dụng bình thường.
    const consentAt = nowIso();
    await commit(d => ({
      ...d,
      accounts: d.accounts.map(a => a.id === account.id
        ? { ...a, ...cleared, passwordSalt: salt, passwordHash, termsVersion: TERMS_VERSION, termsAcceptedAt: nowIso() }
        : a),
      patients: account.patientId && researchConsent !== undefined
        ? d.patients.map(p => p.id === account.patientId ? { ...p, researchConsent, consentDate: researchConsent ? consentAt : p.consentDate } : p)
        : d.patients,
    }));
    login(account.id);
  };

  const updatePatient: Store['updatePatient'] = (id, patch) => {
    const actor = meRef.current;
    if (actor?.role === 'admin' && !actor.locked) {
      // Q01 "Phân công": giữ nguyên hành vi cũ (cập nhật ngay, chỉ đổi doctorId).
      return commit(d => ({ ...d, patients: d.patients.map(p => p.id === id ? { ...p, doctorId: patch.doctorId ?? p.doctorId } : p) }));
    }
    return (async () => {
      requireDoctor(id);
      const { allowed, forbidden } = splitDoctorPatientPatch(patch);
      // Không dựa vào việc ẩn nút: bác sĩ không đổi được phân công, mã hồ sơ hay trạng thái lưu trữ qua hàm này.
      if (forbidden.length) throw new Error(`Bác sĩ không được sửa: ${forbidden.join(', ')}. Phân công bác sĩ do quản trị thực hiện ở Q01.`);
      const current = dataRef.current.patients.find(p => p.id === id)!;
      const demographic = 'name' in allowed || 'birthYear' in allowed || 'birthDate' in allowed || 'phone' in allowed;
      let profile: { name: string; birthDate: string; birthYear: number; phone: string } | undefined;
      if (demographic) {
        // Giai đoạn B (CN1 H8, XN-11): sửa thông tin hành chính phải có ngày sinh đầy đủ; hồ sơ cũ chỉ có năm phải bổ sung.
        const { errors, value } = validatePatientEdit({
          name: allowed.name ?? current.name, birthDate: isoToVn(allowed.birthDate ?? current.birthDate), phone: allowed.phone ?? current.phone,
        }, current, dataRef.current.patients, todayIso());
        if (!value) throw new Error(Object.values(errors).join(' '));
        profile = value;
      }
      const actorId = meRef.current!.id;
      const at = nowIso();
      const ids = Array.from({ length: 6 }, () => 'pe-' + Crypto.randomUUID());
      await commit(d => {
        const before = d.patients.find(p => p.id === id)!;
        const after: Patient = {
          ...before,
          ...(profile ?? {}),
        };
        // Nhật ký sửa hồ sơ: giá trị cũ, mới, người sửa, thời điểm (chỉ trường thực sự đổi).
        const entries = patientEditEntries(before, after, actorId, at, (i) => ids[i]);
        return { ...d, patients: d.patients.map(p => p.id === id ? after : p), patientEdits: [...(d.patientEdits ?? []), ...entries] };
      });
    })();
  };

  const setPatientArchived: Store['setPatientArchived'] = async (id, archived) => {
    const actor = requireDoctor(id, { allowArchived: true });
    const patient = dataRef.current.patients.find(p => p.id === id)!;
    if (archived) {
      const why = archiveBlocker(patient, dataRef.current.devices);
      if (why) throw new Error(why);
    } else if (!patient.archivedAt) throw new Error('Hồ sơ đang theo dõi, không cần khôi phục.');
    // Chỉ đổi hai trường lưu trữ; vết thương, ảnh, đánh giá, đợt, phiên, báo cáo và phân công giữ nguyên.
    await commit(d => ({ ...d, patients: d.patients.map(p => p.id !== id ? p : archived
      ? { ...p, archivedAt: nowIso(), archivedBy: actor.id }
      : { ...p, archivedAt: undefined, archivedBy: undefined }) }));
  };

  const addWound: Store['addWound'] = async (patientId, location, group) => {
    requireDoctor(patientId);
    // Giai đoạn B (CN1): mã nội bộ ổn định (UUID); mã VT lấy số lớn nhất đã dùng + 1 để vết đã xóa không làm trùng mã.
    const used = dataRef.current.wounds.filter((w) => w.patientId === patientId).map((w) => Number(w.code.replace(/\D/g, '')) || 0);
    const wound: Wound = {
      id: 'w-' + Crypto.randomUUID(), patientId, code: `VT${String(Math.max(0, ...used) + 1).padStart(2, '0')}`,
      location, group, startDate: todayIso(), status: 'active',
    };
    await commit((d) => ({ ...d, wounds: [...d.wounds, wound] }));
    return wound;
  };

  /** Giai đoạn B (CN1 H11): xóa vết nhập sai, chỉ khi chưa có ảnh, phác đồ, phiên, đánh giá. Ghi nhật ký. */
  const deleteWound: Store['deleteWound'] = async (woundId) => {
    const w = dataRef.current.wounds.find((x) => x.id === woundId);
    if (!w) throw new Error('Không tìm thấy vết thương.');
    const actor = requireDoctor(w.patientId);
    const entry: AuditEntry = { id: 'au-' + Crypto.randomUUID(), at: nowIso(), by: actor.id, action: 'wound_delete', patientId: w.patientId, targetId: w.id, detail: `Xóa vết ${w.code} (${w.location}) nhập sai, chưa có dữ liệu.` };
    await commit((d) => {
      const why = woundDeleteBlocker(woundId, d);
      if (why) throw new Error(why);
      return { ...d, wounds: d.wounds.filter((x) => x.id !== woundId), auditLog: [...(d.auditLog ?? []), entry] };
    });
  };

  /** Giai đoạn B (CN1 H7): bác sĩ đặt hoặc bỏ "Cần tái khám" thủ công. */
  const setWoundRevisit: Store['setWoundRevisit'] = async (woundId, on) => {
    const w = dataRef.current.wounds.find((x) => x.id === woundId);
    if (!w) throw new Error('Không tìm thấy vết thương.');
    requireDoctor(w.patientId);
    const at = nowIso();
    await commit((d) => ({ ...d, wounds: d.wounds.map((x) => (x.id === woundId ? { ...x, revisitAt: on ? at : undefined, updatedAt: at } : x)) }));
  };

  const updateWound: Store['updateWound'] = async (id, patch) => {
    const wound = dataRef.current.wounds.find(w => w.id === id);
    if (!wound) throw new Error('Không tìm thấy vết thương.');
    requireDoctor(wound.patientId);
    const forbidden = Object.keys(patch).filter(k => k !== 'location' && k !== 'group');
    // Trạng thái (kể cả đã lành) chỉ đổi qua recordClosure để giữ quy trình xác nhận hai lần; mã, bệnh nhân, ngày bắt đầu không đổi.
    if (forbidden.length) throw new Error(`Không sửa được ${forbidden.join(', ')} ở đây. Trạng thái vết thương đổi bằng các nút của đợt điều trị.`);
    let location = wound.location;
    if (patch.location !== undefined) {
      const r = validateWoundLocation(patch.location, wound);
      if (!r.value) throw new Error(r.error);
      location = r.value;
    }
    const at = nowIso();
    await commit(d => ({ ...d, wounds: d.wounds.map(w => w.id === id ? { ...w, location, group: patch.group !== undefined ? (patch.group.trim() || undefined) : w.group, updatedAt: at } : w) }));
  };

  const addImage: Store['addImage'] = async ({ woundId, uri, ext, captureDate, source, capture, sessionId }) => {
    const d0 = dataRef.current;
    const wound = d0.wounds.find((w) => w.id === woundId);
    if (!wound) throw new Error('Không tìm thấy vết thương.');
    // Giai đoạn B (A9): bệnh nhân gửi ảnh sau điều trị cho vết của chính mình, gắn một phiên đã ghi của máy mình.
    const me0 = meRef.current;
    const byPatient = source === 'patient';
    if (byPatient) {
      if (!me0 || me0.locked || me0.role !== 'patient' || me0.patientId !== wound.patientId) throw new Error('Bệnh nhân chỉ gửi ảnh cho vết thương của mình.');
      const ses = d0.sessions.find((x) => x.sessionId === sessionId);
      const ownDevice = d0.patients.find((p) => p.id === wound.patientId)?.deviceId;
      if (!ses || ses.deviceId !== ownDevice || (ses.woundId && ses.woundId !== woundId)) throw new Error('Ảnh sau điều trị phải gắn với một phiên điều trị của vết thương này.');
      if (capture) throw new Error('Ảnh bệnh nhân gửi không kèm dữ liệu đo.');
    }
    const actor = byPatient ? me0! : requireDoctor(wound.patientId);
    if (!byPatient && source !== 'doctor') throw new Error('Chỉ bác sĩ được chụp và tải ảnh.');
    if (capture && (capture.geometry !== null || (capture.automaticMeasurement.areaCm2 !== null && !capture.ar))) throw new Error('Diện tích tự động chỉ được lưu khi có dữ liệu phiên AR.');
    if (capture && capture.distance.valueM !== null && !capture.ar) throw new Error('Khoảng cách chỉ được lưu khi có dữ liệu phiên AR.');
    const patient = d0.patients.find((p) => p.id === wound.patientId)!;
    const n = d0.counters.image + 1;
    const id = `IMG${String(n).padStart(4, '0')}`;
    update(d => ({ ...d, counters: { ...d.counters, image: n } }));
    const stored = await persistImageFile(uri, id, ext);
    // Tệp chiều sâu AR đi cùng ảnh, lưu theo cùng mã ảnh.
    let storedCapture = capture;
    if (capture?.ar?.depth && Platform.OS !== 'web') {
      const depth = capture.ar.depth;
      const depthUri = await persistImageFile(depth.uri, `${id}-depth`, depth.format === 'uint16_mm_le' ? 'depth16' : 'depth32');
      const confidenceUri = depth.confidenceUri ? await persistImageFile(depth.confidenceUri, `${id}-confidence`, 'confidence8') : undefined;
      storedCapture = { ...capture, ar: { ...capture.ar, depth: { ...depth, uri: depthUri, ...(confidenceUri ? { confidenceUri } : {}) } } };
    }
    if (meRef.current?.id !== actor.id) throw new Error('Phiên đăng nhập đã thay đổi.');
    if (!byPatient) requireDoctor(patient.id);
    const image: WoundImage = {
      id, woundId, patientId: patient.id, uri: stored, ext,
      filename: buildFilename(patient.code, wound.code, id, null, ext),
      captureDate, uploadDate: todayIso(), uploadedBy: meRef.current?.id ?? 'unknown', source,
      areaCm2: null, status: 'unlabeled', history: [], capture: storedCapture,
      // A9: ảnh bệnh nhân gửi gắn phiên và mang sẵn loại "Ảnh sau điều trị" (bác sĩ vẫn sửa được khi gán nhãn).
      ...(byPatient ? { sessionId, label: { imageType: 'post_session' as const } } : {}),
    };
    // Confirm persistence before leaving review; quota errors must keep the selected photo retryable.
    // Stage 9C (gói D, D-R1): ghi qua hàng commit như các thao tác lâm sàng khác, tính trên bản mới nhất nên không đè thay đổi chạy xen.
    await commit((d) => ({ ...d, images: [...d.images, image], counters: { ...d.counters, image: Math.max(d.counters.image, n) } }));
    return image;
  };

  const labelImage: Store['labelImage'] = (imageId, area, method, note) =>
    commit((d) => ({
      ...d,
      images: d.images.map((im) => {
        if (im.id !== imageId) return im;
        requireDoctor(im.patientId);
        if (area !== null && (!Number.isFinite(area) || area < 0)) throw new Error('Diện tích không hợp lệ.');
        if (im.capture && area !== null && !method?.trim()) throw new Error('Hãy ghi phương pháp đo để truy xuất số đo tham chiếu.');
        const wound = d.wounds.find((w) => w.id === im.woundId)!;
        const patient = d.patients.find((p) => p.id === im.patientId)!;
        const toName = buildFilename(patient.code, wound.code, im.id, area, im.ext);
        return {
          ...im,
          // Tên tệp và trường diện tích luôn được cập nhật cùng lúc (đặc tả 4.4, 5.1).
          filename: toName,
          areaCm2: area,
          capture: im.capture ? { ...im.capture, manualReference: { areaCm2: area, method: area === null ? null : method!.trim(), confirmedBy: area === null ? null : meRef.current!.id, confirmedAt: area === null ? null : nowIso() } } : undefined,
          researchReady: false,
          measureMethod: method ?? im.measureMethod,
          status: im.status === 'excluded' ? 'excluded' : area === null ? 'unlabeled' : 'labeled',
          retakeRequested: undefined,
          history: [
            ...im.history,
            { at: nowIso(), by: meRef.current?.id ?? 'unknown', fromName: im.filename, toName, fromArea: im.areaCm2, toArea: area, note },
          ],
        };
      }),
    }));

  const setExcluded: Store['setExcluded'] = async (imageId, reason) => {
    const image = dataRef.current.images.find(i => i.id === imageId);
    if (!image) return;
    requireDoctor(image.patientId);
    await commit(d => ({ ...d, images: d.images.map(im => im.id !== imageId ? im : reason
      ? { ...im, status: 'excluded', excludeReason: reason, researchReady: false }
      : { ...im, status: im.areaCm2 === null ? 'unlabeled' : 'labeled', excludeReason: undefined }) }));
  };
  const requestRetake: Store['requestRetake'] = async (imageId, note) => {
    const image = dataRef.current.images.find(i => i.id === imageId);
    if (!image) return;
    requireDoctor(image.patientId);
    await commit(d => ({ ...d, images: d.images.map(im => im.id === imageId ? { ...im, retakeRequested: note ?? undefined, researchReady: note ? false : im.researchReady } : im) }));
  };

  const saveImageLabel: Store['saveImageLabel'] = async (imageId, patch) => {
    const im0 = dataRef.current.images.find((i) => i.id === imageId);
    if (!im0) throw new Error('Không tìm thấy ảnh.');
    const actor = requireDoctor(im0.patientId);
    if (patch.outline && (patch.outline.length < 3 || patch.outline.some(([x, y]) => !(x >= 0 && x <= 1 && y >= 0 && y <= 1)))) throw new Error('Vùng vết cần ít nhất 3 điểm nằm trong ảnh.');
    if (patch.quality === 'fail' && !patch.qualityReason?.trim()) throw new Error('Chọn lý do ảnh không đạt.');
    const at = nowIso();
    await commit((d) => ({
      ...d,
      images: d.images.map((im) => {
        if (im.id !== imageId) return im;
        const { label, events } = applyLabelPatch(im.label, patch, actor.id, at);
        return events.length ? { ...im, label, labelHistory: [...(im.labelHistory ?? []), ...events] } : im;
      }),
    }));
  };

  const confirmImageLabel: Store['confirmImageLabel'] = async (imageId) => {
    const im0 = dataRef.current.images.find((i) => i.id === imageId);
    if (!im0) throw new Error('Không tìm thấy ảnh.');
    const actor = requireDoctor(im0.patientId);
    if (im0.status === 'excluded') throw new Error('Ảnh đã đánh dấu Không sử dụng.');
    const missing = missingForConfirm(im0.label);
    if (missing.length) throw new Error(`Chưa xác nhận được, còn thiếu: ${missing.join('; ')}.`);
    if (im0.label?.confirmedAt) return;
    const at = nowIso();
    await commit((d) => ({
      ...d,
      images: d.images.map((im) => (im.id !== imageId ? im : {
        ...im,
        label: { ...im.label, confirmedAt: at, confirmedBy: actor.id },
        labelHistory: [...(im.labelHistory ?? []), { at, by: actor.id, action: 'confirm' as const, detail: 'Bác sĩ xác nhận nhãn.' }],
      })),
    }));
  };

  const addEvaluation: Store['addEvaluation'] = async (e) => {
    const w = dataRef.current.wounds.find(w => w.id === e.woundId);
    if (!w) throw new Error('Không tìm thấy vết thương.');
    const actor = requireDoctor(w.patientId);
    if (!e.severity || !['mild', 'moderate', 'severe'].includes(e.severity)) throw new Error('Hãy chọn mức độ vết thương.');
    // Gói D: ảnh dẫn chứng phải là ảnh của chính vết thương này (không gắn ảnh vết khác hay bệnh nhân khác).
    if (e.imageId && dataRef.current.images.find((i) => i.id === e.imageId)?.woundId !== e.woundId) throw new Error('Ảnh được chọn không thuộc vết thương này.');
    await commit(d => ({ ...d, evaluations: [...d.evaluations, { ...e, id: 'e-' + Crypto.randomUUID(), doctorId: actor.id }] }));
  };

  const savePlan: Store['savePlan'] = (p) => {
    // Mã phiên bản và mã phác đồ mới sinh ngoài hàm commit để commit chạy lại cho cùng kết quả.
    const planId = 'pl-' + Crypto.randomUUID();
    const freshProtocol = 'pr-' + Crypto.randomUUID();
    return commit((d) => {
      requireDoctor(p.patientId);
      // Gói D: đợt điều trị chỉ gắn với vết thương của chính bệnh nhân này.
      if (!p.woundId || d.wounds.find((w) => w.id === p.woundId)?.patientId !== p.patientId) throw new Error('Vết thương không thuộc hồ sơ này.');
      // Giai đoạn B (AU-01): mức năng lượng phải thuộc bảng mức của dòng máy, kể cả khi chưa giao máy. Kiểm cả ở kho, không chỉ ở màn.
      const model = d.devices.find((x) => x.id === d.patients.find((q) => q.id === p.patientId)?.deviceId)?.model;
      const caps = capabilitiesFor(model) ?? CAPABILITIES[SIM_MODEL];
      if (p.doseLevel != null && !caps.energyLevels.includes(p.doseLevel)) throw new Error(`Mức năng lượng phải là một trong ${caps.energyLevels.join(', ')}.`);
      if (p.treatmentMode && !caps.treatmentModes.some((m) => m.value === p.treatmentMode)) throw new Error('Chế độ điều trị không thuộc danh sách của dòng máy.');
      // Đợt điều trị gắn với vết thương: phiên bản đánh số riêng cho từng vết.
      const sameWound = (x: TreatmentPlan) => x.patientId === p.patientId && (x.woundId ?? null) === (p.woundId ?? null);
      const prev = d.plans.filter(sameWound);
      const version = prev.reduce((m, x) => Math.max(m, x.version), 0) + 1;
      if (!p.reason?.trim()) throw new Error('Nhập lý do thay đổi để lưu phiên bản.');
      // CN3 P2, P7: còn phác đồ mở thì nối tiếp phiên bản; không còn thì là phác đồ mới cho đợt khác.
      const open = openProtocolId(d.plans, p.patientId, p.woundId);
      const isNew = !open;
      let basis: Pick<TreatmentPlan, 'basisImageId' | 'suggestedBasisImageId'> = {};
      if (isNew) {
        // CN3 P1, P3 (AU-06): phác đồ mới cần ảnh của vết chụp hôm nay, chất lượng Đạt, không "Không sử dụng". Không cần AI.
        const candidates = planPhotoCandidates(d.images, p.woundId, todayIso());
        if (!candidates.length) throw new Error('Chưa đủ điều kiện tạo phác đồ mới: cần ít nhất một ảnh của vết chụp hôm nay, đã đánh giá chất lượng Đạt.');
        if (!p.basisImageId || !candidates.some((c) => c.id === p.basisImageId)) throw new Error('Ảnh căn cứ phải là một ảnh hợp lệ của vết chụp hôm nay.');
        basis = { suggestedBasisImageId: candidates[0].id, basisImageId: p.basisImageId };
      } else {
        // Phiên bản tiếp theo giữ ảnh căn cứ của phác đồ.
        const first = d.plans.filter((x) => x.protocolId === open).sort((a, b) => a.version - b.version)[0];
        basis = { suggestedBasisImageId: first?.suggestedBasisImageId, basisImageId: first?.basisImageId };
      }
      const protocolId = protocolIdFor(d.plans, p.patientId, p.woundId, isNew, () => freshProtocol);
      // Phiên bản mới luôn chờ bệnh nhân xác nhận đọc lại (AU-04).
      const plan: TreatmentPlan = { ...p, ...basis, id: planId, version, protocolId, patientAckAt: undefined, editedBy: meRef.current?.id ?? 'unknown', editedAt: nowIso() };
      // Lưu phiên bản mới, giữ các phiên bản cũ để truy vết (đặc tả 7.1).
      const plans = d.plans.map((x) =>
        sameWound(x) && (x.status === 'active' || x.status === 'paused') && plan.status === 'active' ? { ...x, status: 'ended' as const } : x,
      );
      return { ...d, plans: [...plans, plan] };
    });
  };

  const setPlanPaused: Store['setPlanPaused'] = async (planId, paused, reason) => {
    const plan0 = dataRef.current.plans.find((x) => x.id === planId);
    if (!plan0) throw new Error('Không tìm thấy phiên bản phác đồ.');
    const actor = requireDoctor(plan0.patientId);
    if (!reason.trim()) throw new Error(paused ? 'Nhập lý do tạm dừng.' : 'Nhập lý do tiếp tục.');
    const latest = dataRef.current.plans.filter((x) => x.protocolId === plan0.protocolId).sort((a, b) => b.version - a.version)[0];
    if (latest?.id !== planId) throw new Error('Chỉ tạm dừng hoặc tiếp tục phiên bản mới nhất của phác đồ.');
    if (paused && plan0.status !== 'active') throw new Error('Chỉ tạm dừng phác đồ đang áp dụng.');
    if (!paused && plan0.status !== 'paused') throw new Error('Phác đồ không ở trạng thái tạm dừng.');
    const w = dataRef.current.wounds.find((x) => x.id === plan0.woundId);
    // XN-05 giữ nguyên: đợt tạm dừng do ghi nhận lành lần 1 thì tiếp tục bằng "Chưa liền, tiếp tục đợt" ở màn vết thương.
    if (!paused && w?.status === 'awaiting_closure') throw new Error('Vết đang chờ xác nhận liền. Dùng "Chưa liền, tiếp tục đợt" ở màn vết thương.');
    const at = nowIso();
    const ev = { at, by: actor.id, action: paused ? 'pause' as const : 'resume' as const, reason: reason.trim() };
    await commit((d) => ({
      ...d,
      plans: d.plans.map((x) => (x.id === planId ? { ...x, status: paused ? 'paused' as const : 'active' as const, statusLog: [...(x.statusLog ?? []), ev] } : x)),
      // Dữ liệu cũ: vết bị tạm dừng theo cách cũ (trạng thái vết "Tạm dừng") được mở lại cùng phác đồ.
      wounds: !paused && w?.status === 'paused' ? d.wounds.map((x) => (x.id === w.id ? { ...x, status: 'active' as const } : x)) : d.wounds,
    }));
  };

  const deletePlan: Store['deletePlan'] = async (protocolId, reason) => {
    const d0 = dataRef.current;
    const versions = d0.plans.filter((x) => x.protocolId === protocolId);
    if (!versions.length) throw new Error('Không tìm thấy phác đồ.');
    const actor = requireDoctor(versions[0].patientId);
    if (!reason.trim()) throw new Error('Nhập lý do xóa phác đồ.');
    const entryId = 'au-' + Crypto.randomUUID();
    const at = nowIso();
    await commit((d) => {
      const blocker = planDeleteBlocker(d.plans, d.sessions, d.deviceLinks ?? [], protocolId);
      if (blocker) throw new Error(blocker);
      const vs = d.plans.filter((x) => x.protocolId === protocolId);
      const entry: AuditEntry = {
        id: entryId, at, by: actor.id, action: 'plan_delete', patientId: vs[0].patientId, targetId: protocolId,
        detail: `Xóa phác đồ ${protocolId} (${vs.length} phiên bản: ${vs.map((x) => `v${x.version} ${x.id}`).join(', ')}) của vết ${vs[0].woundId ?? '—'}. Lý do: ${reason.trim()}`,
      };
      return { ...d, plans: d.plans.filter((x) => x.protocolId !== protocolId), auditLog: [...(d.auditLog ?? []), entry] };
    });
  };

  const acknowledgePlan: Store['acknowledgePlan'] = async (planId) => {
    const actor = meRef.current;
    const plan = dataRef.current.plans.find((x) => x.id === planId);
    if (!actor || actor.locked || actor.role !== 'patient' || !plan || plan.patientId !== actor.patientId) throw new Error('Chỉ bệnh nhân của hồ sơ xác nhận được phiên bản này.');
    if (plan.status !== 'active' || !plan.confirmed) throw new Error('Phiên bản này không còn áp dụng.');
    if (plan.patientAckAt) return;
    const at = nowIso();
    await commit((d) => ({ ...d, plans: d.plans.map((x) => (x.id === planId && !x.patientAckAt ? { ...x, patientAckAt: at } : x)) }));
  };

  const setDevicePower: Store['setDevicePower'] = (deviceId, on) => {
    const dev = dataRef.current.devices.find((x) => x.id === deviceId);
    if (!dev) return;
    // Giai đoạn B (AU-03): bác sĩ không điều khiển thiết bị. Chỉ bệnh nhân đang giữ máy được gửi lệnh nguồn (mô phỏng).
    const actor = meRef.current;
    if (!actor || actor.locked || actor.role !== 'patient' || actor.patientId !== dev.patientId) throw new Error('Chỉ bệnh nhân đang giữ máy được điều khiển thiết bị.');
    update((d) => ({ ...d, devices: d.devices.map((x) => (x.id === deviceId ? { ...x, power: 'pending' } : x)) }));
    // Mô phỏng: chỉ cập nhật trạng thái khi "thiết bị" xác nhận; thiết bị offline thì không xác nhận.
    setTimeout(() => {
      update((d) => ({
        ...d,
        devices: d.devices.map((x) =>
          x.id !== deviceId ? x : x.online ? { ...x, power: on ? 'on' : 'off', lastSync: nowIso() } : { ...x, power: dev.power },
        ),
        syncErrors: dev.online
          ? d.syncErrors
          : [...d.syncErrors, { id: `s-${Date.now()}`, at: nowIso(), deviceId, message: `${dev.code} offline, lệnh ${on ? 'bật' : 'tắt'} nguồn không được xác nhận (mô phỏng).`, resolved: false }],
      }));
    }, 1500);
  };

  /**
   * Mô phỏng thiết bị IoMT gửi một phiên điều trị lên máy chủ. Thiết bị đọc liệu trình và
   * tự ngắt khi vượt số lần/ngày hoặc chưa đủ giãn cách (slide 24). Đôi khi gửi lại trùng
   * mã phiên để minh họa việc khử trùng (đặc tả 7.2).
   */
  const simulateSession: Store['simulateSession'] = (deviceId) => {
    const d0 = dataRef.current;
    const dev = d0.devices.find((x) => x.id === deviceId);
    if (!dev) return { ok: false, message: 'Không tìm thấy thiết bị.' };
    if (!dev.online) {
      update((d) => ({
        ...d,
        syncErrors: [...d.syncErrors, { id: `s-${Date.now()}`, at: nowIso(), deviceId, message: `${dev.code} offline, phiên điều trị chưa được đồng bộ (mô phỏng).`, resolved: false }],
      }));
      return { ok: false, message: `${dev.code} đang offline: phiên sẽ được gửi khi thiết bị kết nối lại.` };
    }
    // Giai đoạn B (AU-04): máy chỉ chạy phiên bản bệnh nhân đã xác nhận đọc.
    const plan = d0.plans
      .filter((p) => p.patientId === dev.patientId && canLoadPlan(p))
      .sort((a, b) => b.version - a.version)[0];
    const perVisit = plan?.sessionsPerDay ?? 1;
    const now = new Date();
    const today = localDay(now);
    const seen = new Set<string>();
    const mine = d0.sessions
      .filter((s) => s.deviceId === deviceId)
      .filter((s) => (seen.has(s.sessionId) ? false : (seen.add(s.sessionId), true)));
    const todayCount = mine.filter((s) => localDay(s.start) === today && s.status !== 'over_limit').length;
    const last = [...mine].sort((a, b) => b.start.localeCompare(a.start))[0];
    const gapMin = last ? (now.getTime() - new Date(last.start).getTime()) / 60000 - last.durationMin : Infinity;

    // Thiết bị tại nhà bị khóa thông số theo y lệnh (slide 24): không có đợt đang áp dụng, ngày nghỉ theo lịch
    // hoặc đã đủ số lần của buổi thì thiết bị không phát.
    let status: 'completed' | 'over_limit' = 'completed';
    let message = `Thiết bị đã điều trị ở mức ${plan?.doseLevel ?? '—'} trong ${plan?.durationSec != null ? Math.round(plan.durationSec / 6) / 10 : '—'} phút và gửi phiên hoàn tất.`;
    if (!plan) {
      status = 'over_limit';
      message = 'Chưa có đợt điều trị đang áp dụng mà bệnh nhân đã xác nhận đọc: thiết bị không phát.';
    } else if (!isScheduled(plan, today)) {
      status = 'over_limit';
      message = 'Hôm nay là ngày nghỉ theo lịch của đợt: thiết bị không phát.';
    } else if (todayCount >= perVisit) {
      status = 'over_limit';
      message = `Đã đủ ${perVisit} lần của buổi hôm nay: thiết bị không phát thêm.`;
    } else if (plan?.minIntervalMin != null && gapMin < plan.minIntervalMin) {
      status = 'over_limit';
      message = `Chưa đủ giãn cách ${plan.minIntervalMin} phút (mới ${Math.max(0, Math.round(gapMin))} phút): thiết bị ngắt nguồn.`;
    }
    const session: DeviceSession = {
      sessionId: `${dev.code}-${now.getTime()}`,
      deviceId,
      start: now.toISOString(),
      durationMin: status === 'completed' ? Math.round((plan?.durationSec ?? 180) / 6) / 10 : 0,
      energyWh: null,
      status,
      source: 'simulated',
      woundId: plan?.woundId,
      ...(plan ? { planId: plan.id, planVersion: plan.version, protocolId: plan.protocolId } : {}),
    };
    const resend = Math.random() < 0.3;
    update((d) => ({
      ...d,
      sessions: resend ? [...d.sessions, session, { ...session }] : [...d.sessions, session],
      devices: d.devices.map((x) => (x.id === deviceId ? { ...x, lastSync: nowIso(), power: 'off' } : x)),
    }));
    return { ok: status === 'completed', message: resend ? `${message} Thiết bị gửi lại bản ghi 2 lần; hệ thống chỉ đếm 1.` : message };
  };

  const requireAdmin = () => {
    if (meRef.current?.role !== 'admin' || meRef.current.locked) throw new Error('Cần quyền quản trị.');
  };

  // Giai đoạn B (CN4 XN-09): việc với máy không gắn bệnh nhân (khử khuẩn, chăm sóc, xử lý lỗi máy ở phòng khám) do bác sĩ bất kỳ làm.
  // Máy đang giao thì chỉ bác sĩ phụ trách bệnh nhân giữ máy. Chỉ là kiểm tra phía ứng dụng, không thay phân quyền máy chủ.
  const requireDeviceDoctor = (dev: Device) => {
    if (dev.patientId) return requireDoctor(dev.patientId, { allowArchived: true });
    const actor = dataRef.current.accounts.find((a) => a.id === meRef.current?.id);
    if (!actor || actor.locked || actor.role !== 'doctor') throw new Error('Chỉ bác sĩ thao tác với máy. Quản trị chỉ quản lý danh mục máy.');
    return actor;
  };
  const deviceEvent = (deviceId: string, kind: DeviceEvent['kind'], extra?: Pick<DeviceEvent, 'patientId' | 'detail'>): DeviceEvent =>
    ({ id: 'de-' + Crypto.randomUUID(), deviceId, at: nowIso(), by: meRef.current?.id ?? '', kind, ...extra });
  const withEvent = (d: AppData, e: DeviceEvent): AppData['deviceEvents'] => [...(d.deviceEvents ?? []), e];

  const registerDevice: Store['registerDevice'] = async (input) => {
    requireAdmin();
    const err = catalogErrors(input, dataRef.current.devices);
    const first = err.code ?? err.serial ?? err.model;
    if (first) throw new Error(first);
    const device: Device = { id: `d-${Date.now()}`, code: input.code.trim().toUpperCase(), serial: input.serial.trim(), model: input.model.trim(), online: false, lastSync: null, firmware: '—', power: 'off', simulated: true, lifecycle: 'ready' };
    const e = deviceEvent(device.id, 'register', { detail: `${device.code}, sê-ri ${device.serial}, ${device.model}` });
    await commit((d) => ({ ...d, devices: [...d.devices, device], deviceEvents: withEvent(d, e) }));
  };

  const updateDevice: Store['updateDevice'] = async (deviceId, input) => {
    requireAdmin();
    const dev = dataRef.current.devices.find((x) => x.id === deviceId);
    if (!dev) throw new Error('Không tìm thấy thiết bị.');
    const err = catalogErrors(input, dataRef.current.devices, deviceId);
    const first = err.code ?? err.serial ?? err.model;
    if (first) throw new Error(first);
    const next = { code: input.code.trim().toUpperCase(), serial: input.serial.trim(), model: input.model.trim() };
    const changes = ([['Mã', dev.code, next.code], ['Sê-ri', dev.serial ?? '', next.serial], ['Dòng máy', dev.model, next.model]] as const)
      .filter(([, a, b]) => a !== b).map(([k, a, b]) => `${k}: ${a || '—'} → ${b}`);
    if (!changes.length) return;
    const e = deviceEvent(deviceId, 'edit', { detail: changes.join('; ') });
    await commit((d) => ({ ...d, devices: d.devices.map((x) => (x.id === deviceId ? { ...x, ...next } : x)), deviceEvents: withEvent(d, e) }));
  };

  // Giai đoạn B (CN4 D2, D8, AU-26): giao máy thuộc bác sĩ phụ trách (UR11). Không tự gỡ máy cũ của bệnh nhân như trước:
  // bệnh nhân đang giữ máy khác thì phải thu hồi máy đó trước. Chỉ giao khi bệnh nhân có phác đồ đang hoạt động.
  const assignDevice: Store['assignDevice'] = async (deviceId, patientId) => {
    const dev = dataRef.current.devices.find((x) => x.id === deviceId);
    if (!dev) throw new Error('Không tìm thấy thiết bị.');
    if (!patientId) {
      if (!dev.patientId) return;
      return setLifecycle(deviceId, 'returned');
    }
    const actor = requireDoctor(patientId);
    const d0 = dataRef.current;
    const why = assignBlocker(dev, d0.patients.find((p) => p.id === patientId), d0.devices, d0.plans);
    if (why) throw new Error(why);
    if (dev.patientId === patientId) return;
    const at = nowIso();
    const e = deviceEvent(deviceId, 'assign', { patientId });
    await commit((d) => {
      const linked = reassignDevice(d.devices, d.patients, deviceId, patientId);
      // Giao thiết bị kèm một đầu phát mới dùng riêng cho bệnh nhân (slide 25).
      const n = d.devices.filter((x) => x.tip).length + 1;
      const devices = linked.devices.map((x) => (x.id === deviceId
        ? { ...x, lifecycle: 'in_use' as const, assignedAt: at, assignedBy: actor.id, tip: { code: `ĐP-${String(n).padStart(4, '0')}`, issuedAt: todayIso() } }
        : x));
      return { ...d, devices, patients: linked.patients, deviceEvents: withEvent(d, e) };
    });
  };

  // Giai đoạn B (CN4 D3, XN-09): bác sĩ phụ trách thu hồi (Đang giao → Đã thu hồi); bác sĩ đánh dấu Đã khử khuẩn (→ Sẵn sàng).
  // Quản trị không thao tác với máy. Máy cũ chưa có vòng đời mà đang giao được coi là Đang giao.
  const setLifecycle: Store['setLifecycle'] = async (deviceId, next) => {
    const dev = dataRef.current.devices.find((x) => x.id === deviceId);
    if (!dev) throw new Error('Không tìm thấy thiết bị.');
    const current = dev.lifecycle ?? (dev.patientId ? 'in_use' : 'ready');
    if (next === 'returned' && !dev.patientId) throw new Error('Thiết bị chưa giao cho bệnh nhân nào.');
    requireDeviceDoctor(dev);
    if (LIFECYCLE[current]?.next !== next) throw new Error('Bước này chưa làm được ở trạng thái hiện tại.');
    const e = deviceEvent(deviceId, next === 'returned' ? 'return' : 'disinfect', next === 'returned' ? { patientId: dev.patientId } : undefined);
    await commit((d) => {
      // Thu hồi: gỡ khỏi bệnh nhân, bỏ đầu phát cũ (đầu phát dùng riêng không cấp lại).
      const base = next === 'returned' ? reassignDevice(d.devices, d.patients, deviceId, null) : { devices: d.devices, patients: d.patients };
      return {
        ...d,
        patients: base.patients,
        devices: base.devices.map((x) => (x.id === deviceId
          ? { ...x, lifecycle: next, ...(next === 'returned' ? { tip: undefined, power: 'off' as const, assignedAt: undefined, assignedBy: undefined } : {}) }
          : x)),
        deviceEvents: withEvent(d, e),
      };
    });
  };

  // Giai đoạn B (CN4 D5): ghi đã xử lý lỗi máy. Chỉ ghi nhận việc bác sĩ đã làm ngoài ứng dụng; không gửi lệnh nào xuống máy.
  const clearDeviceFault: Store['clearDeviceFault'] = async (deviceId, note) => {
    const dev = dataRef.current.devices.find((x) => x.id === deviceId);
    if (!dev) throw new Error('Không tìm thấy thiết bị.');
    if (!dev.fault) throw new Error('Máy không có lỗi đang mở.');
    if (!note.trim()) throw new Error('Nhập ghi chú xử lý lỗi.');
    requireDeviceDoctor(dev);
    const e = deviceEvent(deviceId, 'fault_clear', { patientId: dev.patientId, detail: note.trim() });
    await commit((d) => ({ ...d, devices: d.devices.map((x) => (x.id === deviceId ? { ...x, fault: undefined } : x)), deviceEvents: withEvent(d, e) }));
  };

  const recordDeviceConnection: Store['recordDeviceConnection'] = async (kind, transport) => {
    const actor = meRef.current;
    if (!actor || actor.locked || actor.role !== 'patient') return;
    const p = dataRef.current.patients.find((x) => x.id === actor.patientId);
    const dev = dataRef.current.devices.find((x) => x.id === p?.deviceId);
    if (!p || !dev) return;
    const e = deviceEvent(dev.id, kind, { patientId: p.id, detail: transport });
    await commit((d) => ({ ...d, deviceEvents: withEvent(d, e) }));
  };

  const recordClosure: Store['recordClosure'] = async (woundId, step) => {
    const w = dataRef.current.wounds.find((x) => x.id === woundId);
    if (!w) throw new Error('Không tìm thấy vết thương.');
    requireDoctor(w.patientId);
    const today = todayIso();
    if (step === 'confirm' && (!w.closureCheck1 || today < addDays(w.closureCheck1, CLOSURE_CONFIRM_DAYS))) {
      throw new Error(`Xác nhận lần 2 cần cách lần 1 ít nhất ${CLOSURE_CONFIRM_DAYS} ngày.`);
    }
    const nextWound: Record<typeof step, Partial<Wound>> = {
      check1: { status: 'awaiting_closure', closureCheck1: today },
      confirm: { status: 'follow_up', followUpFrom: today },
      not_healed: { status: 'active', closureCheck1: undefined },
      reopen: { status: 'active', closureCheck1: undefined, followUpFrom: undefined },
      end_follow_up: { status: 'closed' },
      pause: { status: 'paused' },
      resume: { status: 'active' },
    };
    const planChange: Partial<Record<typeof step, Partial<TreatmentPlan>>> = {
      check1: { status: 'paused' },
      confirm: { status: 'ended', endReason: 'healed' },
      not_healed: { status: 'active' },
      pause: { status: 'paused' },
      resume: { status: 'active' },
    };
    await commit((d) => {
      const course = d.plans
        .filter((p) => p.patientId === w.patientId && (p.woundId ?? null) === woundId && p.status !== 'draft' && p.status !== 'ended')
        .sort((a, b) => b.version - a.version)[0];
      const pc = planChange[step];
      return {
        ...d,
        wounds: d.wounds.map((x) => (x.id === woundId ? { ...x, ...nextWound[step] } : x)),
        plans: pc && course ? d.plans.map((p) => (p.id === course.id ? { ...p, ...pc } : p)) : d.plans,
      };
    });
  };

  // Stage 9B (S8-B05): kiểm vai trò như các thao tác khác. Chính sách ở access.ts; chỉ là kiểm tra phía ứng dụng, không thay phân quyền máy chủ.
  const addReport: Store['addReport'] = async (r) => {
    const actor = dataRef.current.accounts.find((a) => a.id === meRef.current?.id);
    if (!canAddReport(actor, r.patientId)) throw new Error('Chỉ bệnh nhân gửi được báo cáo cho hồ sơ của mình.');
    // Mã và giờ tạo ngoài hàm commit: commit có thể chạy lại hàm trên bản mới nhất, kết quả phải như nhau.
    const report: SymptomReport = { ...r, id: `r-${Date.now()}`, date: nowIso(), handled: false };
    await commit((d) => ({ ...d, reports: [report, ...d.reports] }));
  };

  const setReportHandled: Store['setReportHandled'] = async (id) => {
    const report = dataRef.current.reports.find((r) => r.id === id);
    if (!report) throw new Error('Không tìm thấy báo cáo.');
    const actor = dataRef.current.accounts.find((a) => a.id === meRef.current?.id);
    // Giữ hành vi cũ với hồ sơ đã lưu trữ (B04 vẫn cho bác sĩ phụ trách đánh dấu): chỉ kiểm bác sĩ phụ trách, không chặn theo lưu trữ.
    if (!canHandleReport(actor, dataRef.current.patients.find((p) => p.id === report.patientId))) throw new Error('Chỉ bác sĩ phụ trách được đánh dấu báo cáo đã xử lý.');
    await commit((d) => ({ ...d, reports: d.reports.map((r) => (r.id === id ? { ...r, handled: true } : r)) }));
  };

  const updateAccount: Store['updateAccount'] = async (id, patch) => {
    if (meRef.current?.role !== 'admin' || meRef.current.locked) throw new Error('Cần quyền quản trị.');
    await commit(d => ({ ...d, accounts: d.accounts.map(a => a.id === id ? { ...a, locked: patch.locked ?? a.locked, pendingApproval: patch.pendingApproval ?? a.pendingApproval, researchAccess: patch.researchAccess ?? a.researchAccess } : a) }));
  };

  const resolveSyncError: Store['resolveSyncError'] = async (id) => {
    if (!canResolveSyncError(meRef.current)) throw new Error('Cần quyền quản trị.');
    await commit((d) => ({ ...d, syncErrors: d.syncErrors.map((s) => (s.id === id ? { ...s, resolved: true } : s)) }));
  };

  // Bệnh nhân ghi mức đau cho phiên của thiết bị mình đang được gán.
  const setSessionPain: Store['setSessionPain'] = async (sessionId, pain) => {
    const actor = meRef.current;
    const d0 = dataRef.current;
    const ses = d0.sessions.find((x) => x.sessionId === sessionId);
    const owner = d0.devices.find((x) => x.id === ses?.deviceId)?.patientId;
    if (!actor || actor.role !== 'patient' || !ses || owner !== actor.patientId) throw new Error('Không ghi được mức đau cho phiên này.');
    const ok = (v?: number) => v === undefined || (Number.isInteger(v) && v >= 0 && v <= 10);
    const prevNote = d0.sessionNotes.find((n) => n.sessionId === sessionId);
    if (!ok(pain.painBefore) || !ok(pain.painAfter)) throw new Error('Mức đau từ 0 đến 10.');
    await commit((d) => ({ ...d, sessionNotes: [...d.sessionNotes.filter((n) => n.sessionId !== sessionId), { ...prevNote, sessionId, ...pain, at: nowIso() }] }));
  };
  // Bệnh nhân chỉ đánh dấu mục tự làm trên thiết bị của mình; mục thay linh kiện do quản trị kỹ thuật.
  const markCareDone: Store['markCareDone'] = async (deviceId, itemId) => {
    const actor = meRef.current;
    const dev = dataRef.current.devices.find((x) => x.id === deviceId);
    const item = CARE_ITEMS.find((x) => x.id === itemId);
    if (!actor || !dev || !item) throw new Error('Không tìm thấy mục chăm sóc.');
    // Giai đoạn B (CN4 D3, XN-09): mục chăm sóc, thay linh kiện do bác sĩ; bệnh nhân tự làm mục của mình. Quản trị không thao tác với máy.
    if (actor.role === 'patient') {
      if (item.doneBy !== 'patient' || dev.patientId !== actor.patientId) throw new Error('Mục này do bác sĩ thực hiện.');
    } else requireDeviceDoctor(dev);
    const e = deviceEvent(deviceId, 'care', { patientId: dev.patientId, detail: item.label });
    // Bệnh nhân vệ sinh sau mỗi phiên: chỉ ghi mốc, không ghi nhật ký máy để lịch sử không bị lấp bởi việc lặp lại hằng ngày.
    await commit((d) => ({ ...d, devices: d.devices.map((x) => (x.id === deviceId ? { ...x, care: { ...x.care, [itemId]: nowIso() } } : x)), deviceEvents: actor.role === 'patient' ? d.deviceEvents : withEvent(d, e) }));
  };

  const recordDeviceLink: Store['recordDeviceLink'] = async (entry) => {
    const actor = meRef.current;
    if (!actor || actor.locked) throw new Error('Chưa đăng nhập.');
    if (actor.role === 'patient') {
      if (actor.patientId !== entry.patientId) throw new Error('Chỉ ghi được nhật ký cho hồ sơ của mình.');
    } else throw new Error('Chỉ bệnh nhân nạp liệu trình xuống máy của mình. Bác sĩ không điều khiển thiết bị.');
    // Giai đoạn B (AU-04): chỉ ghi lần nạp của phiên bản bệnh nhân đã xác nhận đọc.
    const loadedPlan = dataRef.current.plans.find((x) => x.id === entry.planId);
    if (!loadedPlan || loadedPlan.patientId !== entry.patientId || loadedPlan.version !== entry.planVersion) throw new Error('Phiên bản đợt điều trị không khớp hồ sơ.');
    if (!canLoadPlan(loadedPlan)) throw new Error('Phiên bản này chưa được bệnh nhân xác nhận đọc hoặc không còn áp dụng.');
    const log: DeviceLinkLog = { ...entry, id: 'dl-' + Crypto.randomUUID(), at: nowIso(), by: actor.id };
    await commit((d) => ({ ...d, deviceLinks: [...(d.deviceLinks ?? []), log] }));
  };

  const recordDeviceSession: Store['recordDeviceSession'] = async (entry) => {
    const actor = meRef.current;
    if (!actor || actor.locked) throw new Error('Chưa đăng nhập.');
    if (actor.role === 'patient') {
      if (actor.patientId !== entry.patientId) throw new Error('Chỉ ghi được phiên cho hồ sơ của mình.');
    } else throw new Error('Chỉ bệnh nhân ghi phiên điều trị từ máy của mình. Bác sĩ chỉ xem lịch sử phiên.');
    const d0 = dataRef.current;
    const dev = d0.devices.find((x) => x.id === d0.patients.find((p) => p.id === entry.patientId)?.deviceId);
    if (!dev) return false;
    // Gói D: phiên chỉ gắn vết thương khi vết đó thuộc chính hồ sơ này. Không tự gán vết khi không rõ (woundId để trống).
    if (entry.woundId && d0.wounds.find((w) => w.id === entry.woundId)?.patientId !== entry.patientId) throw new Error('Vết thương không thuộc hồ sơ này.');
    // ICD chưa có mã phiên của máy: ghép mã thiết bị với mốc bắt đầu, sessionsOf bỏ bản ghi trùng theo mã này.
    const session: DeviceSession = {
      sessionId: `${dev.code}-${new Date(entry.startedAt).getTime()}`,
      deviceId: dev.id,
      start: entry.startedAt,
      durationMin: Math.round(entry.durationSec / 6) / 10,
      energyWh: null,
      status: entry.outcome === 'done' ? 'completed' : 'interrupted',
      source: 'device',
      woundId: entry.woundId,
      // Giai đoạn B (AU-05): gắn phiên bản máy đang giữ (lần nạp gần nhất máy đã nhận). Không có thì để trống, phiên vẫn được ghi.
      ...(loadedPlanLink(d0.deviceLinks ?? [], d0.plans, entry.patientId, entry.woundId) ?? {}),
    };
    // Giai đoạn B (CN4 D5, D9, AU-28): máy báo lỗi thì máy tự chuyển Lỗi, lưu mã, mô tả, thời điểm, bệnh nhân đang giữ. Không gửi lệnh khắc phục.
    const isError = entry.outcome === 'error';
    const at = nowIso();
    const fault = isError ? { ...STA_ERROR_FAULT, at, patientId: entry.patientId, sessionId: session.sessionId } : undefined;
    const e = isError ? deviceEvent(dev.id, 'error', { patientId: entry.patientId, detail: STA_ERROR_FAULT.message }) : null;
    await commit((d) => {
      // Bản ghi gửi lại cùng mã phiên: không ghi phiên, lỗi hay nhật ký lần hai.
      const dup = d.sessions.some((x) => x.sessionId === session.sessionId);
      return {
        ...d,
        sessions: dup ? d.sessions : [...d.sessions, session],
        devices: d.devices.map((x) => (x.id === dev.id ? { ...x, lastSync: at, ...(fault && !dup ? { fault } : {}) } : x)),
        ...(e && !dup ? { deviceEvents: withEvent(d, e) } : {}),
      };
    });
    return true;
  };

  // Ghi lại bản đang hiển thị qua đúng hàng commit (hàm đồng nhất): lỗi ghi ném PersistError, thành công thì bỏ thông báo.
  const retryPersist = useCallback(async () => {
    await commit((d) => d);
    setPersistIssue((x) => (x?.kind === 'write_failed' ? null : x));
  }, [commit]);
  const dismissPersistIssue = () => setPersistIssue((x) => (x?.kind === 'unreadable' ? null : x));

  const value: Store = {
    ready, data, me, authenticate, register, setResearchConsent, logout, finishOnboarding, resetDemo, addPatient, issueActivation, activateAccount, updatePatient, setPatientArchived, addWound, updateWound, addImage, labelImage,
    setExcluded, requestRetake, addEvaluation, savePlan, setPlanPaused, deletePlan, acknowledgePlan, saveImageLabel, confirmImageLabel, deleteWound, setWoundRevisit, setDevicePower, simulateSession, registerDevice, updateDevice, assignDevice, clearDeviceFault, recordDeviceConnection, addReport,
    setReportHandled, updateAccount, resolveSyncError, setSessionPain, markCareDone, recordClosure, setLifecycle, recordDeviceLink, recordDeviceSession,
    persistIssue, retryPersist, dismissPersistIssue,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}

/** Truy vấn dùng chung giữa các màn hình. */
export function useLookups() {
  const { data } = useStore();
  return useMemo(() => {
    const patient = (id?: string) => data.patients.find((p) => p.id === id);
    const wound = (id?: string) => data.wounds.find((w) => w.id === id);
    const account = (id?: string) => data.accounts.find((a) => a.id === id);
    const device = (id?: string) => data.devices.find((x) => x.id === id);
    const woundsOf = (patientId: string) => data.wounds.filter((w) => w.patientId === patientId);
    const imagesOf = (woundId: string) =>
      data.images.filter((i) => i.woundId === woundId).sort((a, b) => a.captureDate.localeCompare(b.captureDate));
    const activePlan = (patientId: string) =>
      data.plans
        .filter((p) => p.patientId === patientId)
        .sort((a, b) => b.version - a.version)
        .find((p) => p.status !== 'draft') ??
      data.plans.filter((p) => p.patientId === patientId).sort((a, b) => b.version - a.version)[0];
    /** Phiên sử dụng đã loại bản ghi gửi trùng theo sessionId (đặc tả 7.2). */
    const sessionsOf = (deviceId: string) => {
      const seen = new Set<string>();
      return data.sessions
        .filter((s) => s.deviceId === deviceId)
        .filter((s) => (seen.has(s.sessionId) ? false : (seen.add(s.sessionId), true)))
        .sort((a, b) => b.start.localeCompare(a.start));
    };
    /** Đợt điều trị mới nhất (không tính nháp) của một vết thương. */
    const coursePlan = (woundId: string, opts?: { patientView?: boolean }) => {
      const w = data.wounds.find((x) => x.id === woundId);
      if (!w) return undefined;
      // Giai đoạn B (AU-05): phiên bản cũ không có woundId đã được gán khi đọc dữ liệu (migratePlans); không suy theo vị trí trong mảng.
      return data.plans
        .filter((p) => p.patientId === w.patientId && p.woundId === woundId && p.status !== 'draft' && (!opts?.patientView || p.confirmed))
        .sort((a, b) => b.version - a.version)[0];
    };
    return { patient, wound, account, device, woundsOf, imagesOf, activePlan, sessionsOf, coursePlan };
  }, [data]);
}
