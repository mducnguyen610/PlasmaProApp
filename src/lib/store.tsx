import * as Crypto from 'expo-crypto';
import { Asset } from 'expo-asset';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { canManagePatient, TERMS_VERSION } from './access';
import { ACTIVATION_DAYS, generateActivationCode, hashDemoPassword, isPendingActivation, isRecordUsername, MAX_ACTIVATION_ATTEMPTS, normalizeUsername, verifyPassword } from './auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { reassignDevice } from './devices';
import { CARE_ITEMS } from './maintenance';
import { buildFilename } from './naming';
import { createSeed, DEMO_ASSETS } from './seed';
import type {
  Account, AppData, Device, DeviceSession, Evaluation, Patient, SessionNote, SymptomReport, TreatmentPlan, Wound, WoundImage,
} from './types';

const STORAGE_KEY = 'plasmapro.demo.v1';
const SESSION_KEY = 'plasmapro.session.v1';

export const nowIso = () => new Date().toISOString();
export const todayIso = () => new Date().toISOString().slice(0, 10);

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

interface Store {
  ready: boolean;
  data: AppData;
  me: Account | null;
  authenticate: (username: string, password: string, agreed: boolean) => Promise<void>;
  register: (input: { name: string; username: string; password: string; role: Account['role']; phone: string; birthYear: number; sex: Patient['sex']; agreed: boolean; researchConsent: boolean }) => Promise<void>;
  setResearchReady: (imageId: string, ready: boolean) => Promise<void>;
  setResearchConsent: (consent: boolean) => void;
  logout: () => void;
  finishOnboarding: () => void;
  resetDemo: () => void;
  addPatient: (p: Omit<Patient, 'id' | 'code' | 'createdAt' | 'researchCode'>, woundLocation?: string) => Promise<{ patient: Patient; activation: Activation }>;
  issueActivation: (patientId: string) => Promise<Activation>;
  activateAccount: (input: { username: string; code: string; password: string; agreed: boolean }) => Promise<void>;
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  addWound: (patientId: string, location: string, group?: string) => Wound;
  updateWound: (id: string, patch: Partial<Wound>) => void;
  addImage: (args: { woundId: string; uri: string; ext: WoundImage['ext']; captureDate: string; source: 'doctor' | 'patient'; capture?: WoundImage['capture'] }) => Promise<WoundImage>;
  labelImage: (imageId: string, area: number | null, method: string | undefined, note?: string) => void;
  setExcluded: (imageId: string, reason: string | null) => void;
  requestRetake: (imageId: string, note: string | null) => void;
  addEvaluation: (e: Omit<Evaluation, 'id' | 'doctorId'>) => void;
  savePlan: (p: Omit<TreatmentPlan, 'id' | 'version' | 'editedBy' | 'editedAt'> & { id?: string }) => void;
  setDevicePower: (deviceId: string, on: boolean) => void;
  simulateSession: (deviceId: string) => { ok: boolean; message: string };
  registerDevice: (code: string) => void;
  assignDevice: (deviceId: string, patientId: string | null) => void;
  addReport: (r: Omit<SymptomReport, 'id' | 'date' | 'handled'>) => void;
  setReportHandled: (id: string) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  resolveSyncError: (id: string) => void;
  setSessionPain: (sessionId: string, pain: Pick<SessionNote, 'painBefore' | 'painAfter'>) => void;
  markCareDone: (deviceId: string, itemId: string) => void;
}

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

/** Mã kích hoạt chỉ trả về một lần cho bác sĩ; trong dữ liệu chỉ lưu bản băm. */
export interface Activation { username: string; code: string; expiresAt: string }

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(createSeed);
  const [meId, setMeId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    (async () => {
      try {
        const [raw, sess] = await Promise.all([AsyncStorage.getItem(STORAGE_KEY), AsyncStorage.getItem(SESSION_KEY)]);
        if (raw) {
          const saved: AppData = JSON.parse(raw);
          saved.sessionNotes ??= [];
          saved.patients = saved.patients.map(p => ({ ...p, researchCode: p.researchCode ?? 'RS-' + Crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase() }));
          setData(saved);
          dataRef.current = saved;
        }
        if (sess) setMeId(sess);
      } catch {
        // Bộ nhớ không đọc được: dùng dữ liệu mô phỏng mặc định.
      }
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data)).catch(() => {});
  }, [data, ready]);

  const update = useCallback((fn: (d: AppData) => AppData) => {
    const next = fn(dataRef.current);
    dataRef.current = next;
    setData(next);
  }, []);
  const me = data.accounts.find((a) => a.id === meId && !a.locked && !a.pendingApproval) ?? null;
  const meRef = useRef(me);
  useEffect(() => {
    meRef.current = me;
  }, [me]);

  const login = useCallback((id: string) => {
    setMeId(id);
    AsyncStorage.setItem(SESSION_KEY, id).catch(() => {});
  }, []);
  const logout = useCallback(() => {
    meRef.current = null;
    setMeId(null);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);
  const finishOnboarding = () => {
    const actor = meRef.current;
    if (!actor) return;
    update(d => ({ ...d, accounts: d.accounts.map(a => a.id === actor.id ? { ...a, onboardingDoneAt: nowIso() } : a) }));
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
      update(d => ({ ...d, accounts: d.accounts.map(a => a.id === account.id ? { ...a, termsVersion: TERMS_VERSION, termsAcceptedAt: nowIso() } : a) }));
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
    update(d => ({
      ...d, accounts: [...d.accounts, account],
      patients: isPatient ? [...d.patients, {
        id: patientId, code: 'BN' + String(d.counters.patient + 1).padStart(3, '0'),
        researchCode: 'RS-' + Crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase(),
        name: account.name, phone: input.phone.trim(), birthYear: input.birthYear, sex: input.sex, doctorId: '',
        researchConsent: input.researchConsent, consentDate: input.researchConsent ? nowIso() : undefined, createdAt: todayIso(),
      }] : d.patients,
      counters: { ...d.counters, patient: d.counters.patient + (isPatient ? 1 : 0) },
    }));
  };
  const requireDoctor = (patientId: string) => {
    const actor = dataRef.current.accounts.find(a => a.id === meRef.current?.id);
    if (!canManagePatient(actor, dataRef.current.patients.find(p => p.id === patientId))) throw new Error('Chỉ bác sĩ phụ trách được thực hiện thao tác này.');
    return actor!;
  };
  const setResearchConsent: Store['setResearchConsent'] = (consent) => {
    const actor = meRef.current;
    if (!actor || actor.locked || actor.role !== 'patient') throw new Error('Chỉ bệnh nhân cập nhật đồng ý của mình.');
    update(d => ({ ...d, patients: d.patients.map(p => p.id === actor.patientId ? { ...p, researchConsent: consent, consentDate: nowIso() } : p) }));
  };
  const setResearchReady: Store['setResearchReady'] = async (imageId, ready) => {
    const im = dataRef.current.images.find(i => i.id === imageId);
    if (!im) throw new Error('Không tìm thấy ảnh.');
    const actor = requireDoctor(im.patientId);
    if (ready && (im.status !== 'labeled' || im.areaCm2 === null || !dataRef.current.patients.find(p => p.id === im.patientId)?.researchConsent)) throw new Error('Cần có diện tích và đồng ý nghiên cứu trước khi chia sẻ.');
    if (ready && im.source === 'patient') throw new Error('Chỉ ảnh do bác sĩ thu thập được đưa vào bộ dữ liệu.');
    let researchUri: string | undefined;
    if (ready) {
      const asset = im.uri ? null : await Asset.fromModule(DEMO_ASSETS[im.demoAsset ?? 1]).downloadAsync();
      const context = ImageManipulator.manipulate(im.uri ?? asset!.localUri ?? asset!.uri);
      const rendered = await context.renderAsync();
      const result = await rendered.saveAsync({ format: SaveFormat.PNG, compress: 1 });
      researchUri = await persistImageFile(result.uri, 'research-' + im.id, 'png');
    }
    if (meRef.current?.id !== actor.id) throw new Error('Phiên đăng nhập đã thay đổi.');
    requireDoctor(im.patientId);
    if (ready && !dataRef.current.patients.find(p => p.id === im.patientId)?.researchConsent) throw new Error('Đồng ý nghiên cứu đã thay đổi.');
    update(d => ({ ...d, images: d.images.map(i => i.id === imageId ? { ...i, researchReady: ready, researchUri: ready ? researchUri : undefined, researchReviewedBy: actor.id, researchReviewedAt: nowIso() } : i) }));
  };

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

  const addPatient: Store['addPatient'] = async (p, woundLocation) => {
    if (meRef.current?.role !== 'doctor' || p.doctorId !== meRef.current.id) throw new Error('Cần quyền bác sĩ phụ trách.');
    const phone = p.phone.replace(/\s/g, '');
    const dup = phone ? dataRef.current.patients.find(x => x.phone.replace(/\s/g, '') === phone) : undefined;
    if (dup) throw new Error(`Số điện thoại đã có hồ sơ ${dup.code}. Nếu bệnh nhân đã tự đăng ký, nhờ quản trị phân công hồ sơ đó cho bạn thay vì tạo hồ sơ mới.`);
    const n = dataRef.current.counters.patient + 1;
    const patient: Patient = { ...p, researchCode: 'RS-' + Crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase(), id: `p-${Date.now()}`, code: `BN${String(n).padStart(3, '0')}`, createdAt: todayIso() };
    const wound: Wound | null = woundLocation
      ? { id: `w-${Date.now()}`, patientId: patient.id, code: 'VT01', location: woundLocation, startDate: todayIso(), status: 'active' }
      : null;
    const { account, activation } = await newActivation(patient, undefined, dataRef.current.accounts);
    update((d) => ({
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
    update(d => ({ ...d, accounts: existing ? d.accounts.map(a => a.id === account.id ? account : a) : [...d.accounts, account] }));
    return activation;
  };

  const activateAccount: Store['activateAccount'] = async ({ username, code, password, agreed }) => {
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
      update(d => ({ ...d, accounts: d.accounts.map(a => a.id === account.id ? { ...a, ...(spent ? cleared : { activationAttempts: attempts }) } : a) }));
      throw new Error(spent ? 'Nhập sai quá nhiều lần, mã đã bị hủy. Hãy nhờ bác sĩ cấp mã mới.' : `Mã kích hoạt chưa đúng. Còn ${MAX_ACTIVATION_ATTEMPTS - attempts} lần thử.`);
    }
    const salt = Crypto.randomUUID();
    const passwordHash = await hashDemoPassword(password, salt);
    update(d => ({ ...d, accounts: d.accounts.map(a => a.id === account.id
      ? { ...a, ...cleared, passwordSalt: salt, passwordHash, termsVersion: TERMS_VERSION, termsAcceptedAt: nowIso() }
      : a) }));
    login(account.id);
  };

  const updatePatient: Store['updatePatient'] = (id, patch) => {
    const actor = meRef.current;
    if (actor?.role === 'admin' && !actor.locked) {
      update(d => ({ ...d, patients: d.patients.map(p => p.id === id ? { ...p, doctorId: patch.doctorId ?? p.doctorId } : p) }));
    } else {
      requireDoctor(id);
      update(d => ({ ...d, patients: d.patients.map(p => p.id === id ? { ...p, researchConsent: patch.researchConsent ?? p.researchConsent, consentDate: patch.consentDate } : p) }));
    }
  };

  const addWound: Store['addWound'] = (patientId, location, group) => {
    requireDoctor(patientId);
    const existing = dataRef.current.wounds.filter((w) => w.patientId === patientId).length;
    const wound: Wound = {
      id: `w-${Date.now()}`, patientId, code: `VT${String(existing + 1).padStart(2, '0')}`,
      location, group, startDate: todayIso(), status: 'active',
    };
    update((d) => ({ ...d, wounds: [...d.wounds, wound] }));
    return wound;
  };

  const updateWound: Store['updateWound'] = (id, patch) => {
    const wound = dataRef.current.wounds.find(w => w.id === id);
    if (!wound) return;
    requireDoctor(wound.patientId);
    update(d => ({ ...d, wounds: d.wounds.map(w => w.id === id ? { ...w, status: patch.status ?? w.status, location: patch.location ?? w.location, group: patch.group ?? w.group } : w) }));
  };

  const addImage: Store['addImage'] = async ({ woundId, uri, ext, captureDate, source, capture }) => {
    const d0 = dataRef.current;
    const wound = d0.wounds.find((w) => w.id === woundId);
    if (!wound) throw new Error('Không tìm thấy vết thương.');
    const actor = requireDoctor(wound.patientId);
    if (source !== 'doctor') throw new Error('Chỉ bác sĩ được chụp và tải ảnh.');
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
    requireDoctor(patient.id);
    const image: WoundImage = {
      id, woundId, patientId: patient.id, uri: stored, ext,
      filename: buildFilename(patient.code, wound.code, id, null, ext),
      captureDate, uploadDate: todayIso(), uploadedBy: meRef.current?.id ?? 'unknown', source,
      areaCm2: null, status: 'unlabeled', history: [], capture: storedCapture,
    };
    // Confirm persistence before leaving review; quota errors must keep the selected photo retryable.
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ ...dataRef.current, images: [...dataRef.current.images, image] }));
    update((d) => ({ ...d, images: [...d.images, image], counters: { ...d.counters, image: Math.max(d.counters.image, n) } }));
    return image;
  };

  const labelImage: Store['labelImage'] = (imageId, area, method, note) =>
    update((d) => ({
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

  const setExcluded: Store['setExcluded'] = (imageId, reason) => {
    const image = dataRef.current.images.find(i => i.id === imageId);
    if (!image) return;
    requireDoctor(image.patientId);
    update(d => ({ ...d, images: d.images.map(im => im.id !== imageId ? im : reason
      ? { ...im, status: 'excluded', excludeReason: reason, researchReady: false }
      : { ...im, status: im.areaCm2 === null ? 'unlabeled' : 'labeled', excludeReason: undefined }) }));
  };
  const requestRetake: Store['requestRetake'] = (imageId, note) => {
    const image = dataRef.current.images.find(i => i.id === imageId);
    if (!image) return;
    requireDoctor(image.patientId);
    update(d => ({ ...d, images: d.images.map(im => im.id === imageId ? { ...im, retakeRequested: note ?? undefined, researchReady: note ? false : im.researchReady } : im) }));
  };

  const addEvaluation: Store['addEvaluation'] = (e) => {
    const w = dataRef.current.wounds.find(w => w.id === e.woundId);
    if (!w) throw new Error('Không tìm thấy vết thương.');
    const actor = requireDoctor(w.patientId);
    if (!e.severity || !['mild', 'moderate', 'severe'].includes(e.severity)) throw new Error('Hãy chọn mức độ vết thương.');
    update(d => ({ ...d, evaluations: [...d.evaluations, { ...e, id: 'e-' + Crypto.randomUUID(), doctorId: actor.id }] }));
  };

  const savePlan: Store['savePlan'] = (p) =>
    update((d) => {
      requireDoctor(p.patientId);
      const prev = d.plans.filter((x) => x.patientId === p.patientId);
      const version = prev.reduce((m, x) => Math.max(m, x.version), 0) + 1;
      const plan: TreatmentPlan = { ...p, id: `pl-${Date.now()}`, version, editedBy: meRef.current?.id ?? 'unknown', editedAt: nowIso() };
      // Lưu phiên bản mới, giữ các phiên bản cũ để truy vết (đặc tả 7.1).
      const plans = d.plans.map((x) =>
        x.patientId === p.patientId && x.status === 'active' && plan.status === 'active' ? { ...x, status: 'ended' as const } : x,
      );
      return { ...d, plans: [...plans, plan] };
    });

  const setDevicePower: Store['setDevicePower'] = (deviceId, on) => {
    const dev = dataRef.current.devices.find((x) => x.id === deviceId);
    if (!dev) return;
    // Chỉ bác sĩ phụ trách bệnh nhân đang dùng thiết bị được gửi lệnh nguồn.
    requireDoctor(dev.patientId ?? '');
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
    const plan = d0.plans
      .filter((p) => p.patientId === dev.patientId && p.status === 'active' && p.confirmed)
      .sort((a, b) => b.version - a.version)[0];
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    const seen = new Set<string>();
    const mine = d0.sessions
      .filter((s) => s.deviceId === deviceId)
      .filter((s) => (seen.has(s.sessionId) ? false : (seen.add(s.sessionId), true)));
    const todayCount = mine.filter((s) => s.start.slice(0, 10) === today && s.status !== 'over_limit').length;
    const last = [...mine].sort((a, b) => b.start.localeCompare(a.start))[0];
    const gapMin = last ? (now.getTime() - new Date(last.start).getTime()) / 60000 - last.durationMin : Infinity;

    let status: 'completed' | 'over_limit' = 'completed';
    let message = 'Thiết bị đã gửi phiên điều trị hoàn tất.';
    if (plan?.sessionsPerDay != null && todayCount >= plan.sessionsPerDay) {
      status = 'over_limit';
      message = `Đã đủ ${plan.sessionsPerDay} lần/ngày theo liệu trình: thiết bị ngắt nguồn.`;
    } else if (plan?.minIntervalMin != null && gapMin < plan.minIntervalMin) {
      status = 'over_limit';
      message = `Chưa đủ giãn cách ${plan.minIntervalMin} phút (mới ${Math.max(0, Math.round(gapMin))} phút): thiết bị ngắt nguồn.`;
    }
    const session: DeviceSession = {
      sessionId: `${dev.code}-${now.getTime()}`,
      deviceId,
      start: now.toISOString(),
      durationMin: status === 'completed' ? 15 : 0,
      energyWh: null,
      status,
      source: 'simulated',
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

  const registerDevice: Store['registerDevice'] = (code) => {
    requireAdmin();
    update((d) => ({
      ...d,
      devices: [...d.devices, { id: `d-${Date.now()}`, code, model: 'Plasma Pro + mô-đun IoMT ESP32', online: false, lastSync: null, firmware: '—', power: 'off', simulated: true } satisfies Device],
    }));
  };

  // Mỗi bệnh nhân giữ tối đa một thiết bị: gán thiết bị mới thì thiết bị cũ của bệnh nhân đó được gỡ,
  // tránh hai thiết bị cùng trỏ vào một hồ sơ (nhật ký điều trị bị tách đôi).
  const assignDevice: Store['assignDevice'] = (deviceId, patientId) => {
    requireAdmin();
    update((d) => ({ ...d, ...reassignDevice(d.devices, d.patients, deviceId, patientId) }));
  };

  const addReport: Store['addReport'] = (r) =>
    update((d) => ({ ...d, reports: [{ ...r, id: `r-${Date.now()}`, date: nowIso(), handled: false }, ...d.reports] }));

  const setReportHandled: Store['setReportHandled'] = (id) =>
    update((d) => ({ ...d, reports: d.reports.map((r) => (r.id === id ? { ...r, handled: true } : r)) }));

  const updateAccount: Store['updateAccount'] = (id, patch) => {
    if (meRef.current?.role !== 'admin' || meRef.current.locked) throw new Error('Cần quyền quản trị.');
    update(d => ({ ...d, accounts: d.accounts.map(a => a.id === id ? { ...a, locked: patch.locked ?? a.locked, pendingApproval: patch.pendingApproval ?? a.pendingApproval, researchAccess: patch.researchAccess ?? a.researchAccess } : a) }));
  };

  const resolveSyncError: Store['resolveSyncError'] = (id) =>
    update((d) => ({ ...d, syncErrors: d.syncErrors.map((s) => (s.id === id ? { ...s, resolved: true } : s)) }));

  // Bệnh nhân ghi mức đau cho phiên của thiết bị mình đang được gán.
  const setSessionPain: Store['setSessionPain'] = (sessionId, pain) => {
    const actor = meRef.current;
    const d0 = dataRef.current;
    const ses = d0.sessions.find((x) => x.sessionId === sessionId);
    const owner = d0.devices.find((x) => x.id === ses?.deviceId)?.patientId;
    if (!actor || actor.role !== 'patient' || !ses || owner !== actor.patientId) throw new Error('Không ghi được mức đau cho phiên này.');
    const ok = (v?: number) => v === undefined || (Number.isInteger(v) && v >= 0 && v <= 10);
    if (!ok(pain.painBefore) || !ok(pain.painAfter)) throw new Error('Mức đau từ 0 đến 10.');
    update((d) => ({ ...d, sessionNotes: [...d.sessionNotes.filter((n) => n.sessionId !== sessionId), { sessionId, ...pain, at: nowIso() }] }));
  };
  // Bệnh nhân chỉ đánh dấu mục tự làm trên thiết bị của mình; mục thay linh kiện do quản trị kỹ thuật.
  const markCareDone: Store['markCareDone'] = (deviceId, itemId) => {
    const actor = meRef.current;
    const dev = dataRef.current.devices.find((x) => x.id === deviceId);
    const item = CARE_ITEMS.find((x) => x.id === itemId);
    if (!actor || !dev || !item) throw new Error('Không tìm thấy mục chăm sóc.');
    const allowed = actor.role === 'admin' || (actor.role === 'patient' && item.doneBy === 'patient' && dev.patientId === actor.patientId);
    if (!allowed) throw new Error('Mục này do kỹ thuật viên thực hiện.');
    update((d) => ({ ...d, devices: d.devices.map((x) => (x.id === deviceId ? { ...x, care: { ...x.care, [itemId]: nowIso() } } : x)) }));
  };

  const value: Store = {
    ready, data, me, authenticate, register, setResearchReady, setResearchConsent, logout, finishOnboarding, resetDemo, addPatient, issueActivation, activateAccount, updatePatient, addWound, updateWound, addImage, labelImage,
    setExcluded, requestRetake, addEvaluation, savePlan, setDevicePower, simulateSession, registerDevice, assignDevice, addReport,
    setReportHandled, updateAccount, resolveSyncError, setSessionPain, markCareDone,
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
    return { patient, wound, account, device, woundsOf, imagesOf, activePlan, sessionsOf };
  }, [data]);
}
