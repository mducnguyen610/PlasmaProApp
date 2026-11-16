/* global __dirname */
// Chạy: node src/lib/writePath.test.cjs
// Stage 9C (gói D): đường ghi thật của store (writePath + commitQueue + persistence + newIntegrityIssues) với kho giả:
// ghi đồng thời, ghi lỗi, từ chối gắn chéo bệnh nhân, giữ trường không liên quan, chặn ghi khi kho chưa đọc được.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const cache = {};
function load(file) {
  if (/\.(png|jpe?g)$/.test(file)) return 1;
  const full = path.resolve(__dirname, file.replace(/\.ts$/, '') + '.ts');
  if (cache[full]) return cache[full];
  const mod = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', code)((name) => load(path.relative(__dirname, path.resolve(path.dirname(full), name))), mod, mod.exports);
  cache[full] = mod.exports;
  return mod.exports;
}
const { createWritePath } = load('writePath');
const { createPersistence, STORAGE_KEY } = load('persistence');
const { newIntegrityIssues } = load('integrity');
const { createSeed } = load('seed');

class PersistError extends Error {}
function setup(opts = {}) {
  const mem = new Map();
  let writes = 0;
  const kv = {
    async getItem(k) { return mem.get(k) ?? null; },
    async setItem(k, v) { const i = writes++; await new Promise((r) => setTimeout(r, opts.delay?.(i) ?? 0)); if (opts.fail?.(i)) throw new Error('quota'); mem.set(k, v); },
    async removeItem(k) { mem.delete(k); },
  };
  const persistence = createPersistence(kv);
  const state = { data: createSeed(), blocked: null };
  const commit = createWritePath({
    read: () => state.data,
    save: (next) => persistence.saveData(next),
    apply: (next) => { state.data = next; },
    check: (base, next) => { const added = newIntegrityIssues(base, next); return added.length ? new Error('integrity:' + added.map((x) => x.code).join(',')) : null; },
    blocked: () => state.blocked,
    wrapWriteError: (e) => new PersistError(String(e)),
  });
  const saved = () => JSON.parse(mem.get(STORAGE_KEY) ?? 'null');
  return { state, commit, saved, mem };
}
const json = (x) => JSON.parse(JSON.stringify(x));
const rename = (id, name) => (d) => ({ ...d, patients: d.patients.map((p) => (p.id === id ? { ...p, name } : p)) });

(async () => {
  // 1. Hai commit đồng thời sửa hai hồ sơ: giữ cả hai, bộ nhớ máy khớp màn hình.
  {
    const { state, commit, saved } = setup({ delay: (i) => (i === 0 ? 30 : 0) });
    const [a, b] = state.data.patients;
    await Promise.all([commit(rename(a.id, 'Tên A')), commit(rename(b.id, 'Tên B'))]);
    assert.equal(state.data.patients.find((p) => p.id === a.id).name, 'Tên A');
    assert.equal(state.data.patients.find((p) => p.id === b.id).name, 'Tên B');
    assert.deepEqual(saved(), json(state.data), 'bộ nhớ máy khớp màn hình');
  }
  // 2. Dữ liệu đổi ngoài hàng (ghi nền) trong lúc commit đang ghi: commit tính lại, giữ cả hai thay đổi.
  {
    const { state, commit, saved } = setup({ delay: (i) => (i === 0 ? 20 : 0) });
    const [a, b] = state.data.patients;
    const p = commit(rename(a.id, 'Trong hàng'));
    await new Promise((r) => setTimeout(r, 5));
    state.data = rename(b.id, 'Ngoài hàng')(state.data);
    await p;
    assert.equal(state.data.patients.find((x) => x.id === a.id).name, 'Trong hàng');
    assert.equal(state.data.patients.find((x) => x.id === b.id).name, 'Ngoài hàng');
    assert.deepEqual(saved(), json(state.data));
  }
  // 3. Ghi lỗi: ném PersistError, màn hình và bộ nhớ máy giữ bản cũ; lần sau ghi được.
  {
    const { state, commit, saved } = setup({ fail: (i) => i === 0 });
    const before = state.data;
    const [a] = before.patients;
    await assert.rejects(commit(rename(a.id, 'Lỗi')), PersistError);
    assert.equal(state.data, before, 'màn hình không đổi');
    assert.equal(saved(), null, 'bộ nhớ máy không có bản lỗi');
    await commit(rename(a.id, 'Lần 2'));
    assert.equal(saved().patients.find((x) => x.id === a.id).name, 'Lần 2');
  }
  // 4. Gắn ảnh vào vết thương của bệnh nhân khác: từ chối trước khi ghi, không ghi gì.
  {
    const { state, commit, saved } = setup();
    const im = state.data.images[0];
    const other = state.data.wounds.find((w) => w.patientId !== im.patientId);
    await assert.rejects(commit((d) => ({ ...d, images: d.images.map((x) => (x.id === im.id ? { ...x, woundId: other.id } : x)) })), /integrity:cross_patient/);
    assert.equal(saved(), null);
    assert.equal(state.data.images[0].woundId, im.woundId);
  }
  // 5. Tạo vết thương mồ côi (hồ sơ không có) hoặc trùng mã: từ chối.
  {
    const { state, commit } = setup();
    const w = state.data.wounds[0];
    await assert.rejects(commit((d) => ({ ...d, wounds: [...d.wounds, { ...w, id: 'w-moi', patientId: 'p-khong-co' }] })), /integrity:orphan/);
    await assert.rejects(commit((d) => ({ ...d, wounds: [...d.wounds, { ...w }] })), /integrity:duplicate_id/);
  }
  // 6. Lỗi quan hệ có từ trước không chặn lần ghi không liên quan.
  {
    const { state, commit, saved } = setup();
    state.data = { ...state.data, wounds: [...state.data.wounds, { ...state.data.wounds[0], id: 'w-cu', patientId: 'p-khong-co' }] };
    const [a] = state.data.patients;
    await commit(rename(a.id, 'Vẫn lưu được'));
    assert.equal(saved().patients.find((x) => x.id === a.id).name, 'Vẫn lưu được');
  }
  // 7. Giữ trường không liên quan: đổi tên không đổi trường khác của hồ sơ, không đổi tập khác.
  {
    const { state, commit } = setup();
    const before = state.data;
    const [a] = before.patients;
    await commit(rename(a.id, 'Chỉ đổi tên'));
    const after = state.data.patients.find((x) => x.id === a.id);
    assert.deepEqual({ ...after, name: a.name }, a);
    assert.equal(state.data.wounds, before.wounds);
    assert.equal(state.data.images, before.images);
  }
  // 8. Kho chưa đọc được: từ chối ghi, không ghi gì.
  {
    const { state, commit, saved } = setup();
    state.blocked = 'Chưa đọc được bộ nhớ máy.';
    await assert.rejects(commit(rename(state.data.patients[0].id, 'X')), PersistError);
    assert.equal(saved(), null);
  }
  // 9. Bệnh nhân tự đăng ký chưa có bác sĩ (doctorId rỗng) không bị coi là mồ côi.
  {
    const { state, commit } = setup();
    const p = state.data.patients[0];
    await commit((d) => ({ ...d, patients: [...d.patients, { ...p, id: 'p-tu-dang-ky', code: 'BN999', doctorId: '', deviceId: undefined }] }));
    assert.ok(state.data.patients.some((x) => x.id === 'p-tu-dang-ky'));
  }
  console.log('writePath.test: đạt');
})().catch((e) => { console.error(e); process.exit(1); });
