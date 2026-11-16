// Kiểm thử luồng "Chụp cho bệnh nhân mới" (B09, B10, B09b) và bộ lọc thu gọn ở B09.
// Bản web, dữ liệu mô phỏng, Playwright. Không thay cho thử trên máy thật (camera, tệp ảnh trong thư mục ứng dụng) hay thử với bác sĩ.
// Chạy: node scripts/kiem-thu-benh-nhan-moi-tu-anh.cjs <baseURL> <thư mục kết quả>
// Quan hệ dữ liệu được kiểm trên dữ liệu thật của store (đọc từ cây React) và trên bản đã ghi bền (localStorage), không chỉ trên giao diện.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8720';
const OUT = process.argv[3] || '.';
const PHOTO = path.join(__dirname, '..', 'assets', 'demo', 'demo_1.png');
const DATA_KEY = 'plasmapro.demo.v2';
const PENDING_KEY = 'plasmapro.anh-cho-ho-so.v1';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => {
  results.push({ id, name, result: pass ? 'ĐẠT' : 'LỖI', detail });
  console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : '');
};

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390, h = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.dialogs = []; p.errors = []; p.accept = false;
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().replace(/\n+/g, ' | ')}`); if (d.type() === 'beforeunload' || (p.accept && d.type() === 'confirm')) d.accept(); else d.dismiss(); });
    p.on('pageerror', (e) => p.errors.push(e.message));
    return p;
  };
  const login = async (p, user) => {
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const logout = async (p) => { await p.evaluate(() => { localStorage.removeItem('plasmapro.session.v1'); }); await p.goto(BASE + '/'); await p.waitForTimeout(1000); };
  // Màn có biểu mẫu chưa lưu (B11 điền sẵn số đo) có thể chặn lần điều hướng đầu: thử lại một lần.
  const go = async (p, url) => { try { await p.goto(BASE + url); } catch { await p.waitForTimeout(500); await p.goto(BASE + url); } await p.waitForTimeout(1500); };
  const has = async (p, t, exact = true) => (await p.locator(`text=${exact ? `"${t}"` : t}`).locator('visible=true').count()) > 0;
  const saved = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), DATA_KEY);
  const savedPending = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || 'null'), PENDING_KEY);
  const btn = (p, name) => p.getByRole('button', { name, exact: true }).locator('visible=true').last();
  const click = async (p, name, wait = 900) => { await btn(p, name).click(); await p.waitForTimeout(wait); };
  const input = (p, label) => p.locator(`[aria-label="${label}"]:visible`).last();
  const title = (p) => p.locator('[role="heading"]:visible').first().textContent().catch(() => '');
  // Giá trị Provider của store trong cây fiber React (bản web).
  const evalStore = (p, body, arg) => p.evaluate(async ({ body, arg }) => {
    let v = null;
    for (const el of document.querySelectorAll('*')) {
      const k = Object.keys(el).find((x) => x.startsWith('__reactFiber'));
      if (!k) continue;
      let f = el[k];
      while (f) { const val = f.memoizedProps && f.memoizedProps.value; if (val && typeof val.commitPendingCapture === 'function') { v = val; break; } f = f.return; }
      if (v) break;
    }
    if (!v) return { noStore: true };
    const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;
    return await new AsyncFn('store', 'arg', body)(v, arg);
  }, { body, arg });
  const callStore = async (p, fn, ...args) => {
    const res = await evalStore(p, `return (async () => { try { const r = await store[${JSON.stringify(fn)}](...arg); return { ok: true, r: r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; } })();`, args);
    if (res.noStore) throw new Error(`Không tìm thấy store khi gọi ${fn}`);
    await p.waitForTimeout(300);
    return res;
  };
  const live = async (p) => {
    const r = await evalStore(p, 'return JSON.parse(JSON.stringify({ data: store.data, pending: store.pendingCapture }));');
    if (r.noStore) throw new Error('Không tìm thấy store');
    return r;
  };
  const counts = (d) => ({ patients: d.patients.length, accounts: d.accounts.length, wounds: d.wounds.length, images: d.images.length });
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  // Kiểm quan hệ như src/lib/integrity.ts (phần liên quan): ảnh, vết, hồ sơ, tài khoản.
  const relIssues = (d) => {
    const P = new Set(d.patients.map((x) => x.id)), W = new Map(d.wounds.map((x) => [x.id, x]));
    const out = [];
    for (const w of d.wounds) if (!P.has(w.patientId)) out.push(`vết ${w.id} mồ côi`);
    for (const im of d.images) { const w = W.get(im.woundId); if (!w) out.push(`ảnh ${im.id} mồ côi`); else if (w.patientId !== im.patientId) out.push(`ảnh ${im.id} gắn chéo`); if (!P.has(im.patientId)) out.push(`ảnh ${im.id} không có hồ sơ`); }
    for (const a of d.accounts) if (a.role === 'patient' && !P.has(a.patientId)) out.push(`tài khoản ${a.id} mồ côi`);
    const ids = (xs) => xs.length !== new Set(xs.map((x) => x.id)).size;
    if (ids(d.patients) || ids(d.wounds) || ids(d.images) || ids(d.accounts)) out.push('trùng mã');
    if (d.patients.length !== new Set(d.patients.map((x) => x.code)).size) out.push('trùng mã hồ sơ');
    return out;
  };
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, `${name}.png`) }); };
  const fbtn = (p, open) => p.getByRole('button', { name: open ? /^Đóng bộ lọc/ : /^Mở bộ lọc/ }).locator('visible=true').first();
  const ftoggle = async (p, open) => { await fbtn(p, open).click(); await p.waitForTimeout(500); };
  const tab = (p, name) => p.getByRole('tab', { name, exact: true }).locator('visible=true').first();

  // Từ B09 tới B09b: chọn "Chụp cho bệnh nhân mới", chọn ảnh có sẵn, sang bước nhập số đo, (tùy chọn) nhập số đo, chuyển sang biểu mẫu.
  const toForm = async (p, { area } = {}) => {
    await go(p, '/capture');
    await tab(p, 'Chụp cho bệnh nhân mới').click(); await p.waitForTimeout(500);
    await click(p, 'Chụp cho bệnh nhân mới', 1500);
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), btn(p, 'Chọn ảnh có sẵn').click()]);
    await fc.setFiles(PHOTO); await p.waitForTimeout(3500);
    await click(p, 'Tiếp: nhập số đo', 700);
    if (area) {
      await input(p, 'Diện tích bác sĩ đo (cm²)').fill(area);
      await p.getByRole('radio', { name: 'Thước đo trên vết thương', exact: true }).click(); await p.waitForTimeout(300);
    }
    await click(p, 'Tiếp: tạo hồ sơ bệnh nhân', 1500);
  };
  const fillForm = async (p, f) => {
    if (f.name !== undefined) await input(p, 'Họ và tên').fill(f.name);
    if (f.year !== undefined) await input(p, 'Năm sinh').fill(f.year);
    if (f.phone !== undefined) await input(p, 'Số điện thoại').fill(f.phone);
    if (f.loc !== undefined) await input(p, 'Vị trí vết thương trong ảnh').fill(f.loc);
    await p.waitForTimeout(700);
  };

  // ===== A. B09: hai lối vào, luồng cũ giữ nguyên =====
  {
    const p = await newPage(); await login(p, 'bacsi');
    await go(p, '/capture');
    // Segmented trên web không xuất aria-selected (thành phần dùng chung có sẵn); xét lựa chọn đang chọn theo chữ đậm 700 của mục.
    const weight = (n) => tab(p, n).locator('div[dir="auto"]').first().evaluate((x) => `${getComputedStyle(x).fontWeight}|${getComputedStyle(x).fontFamily}`);
    rec('NP-01', 'B09 có hai lựa chọn "Chọn bệnh nhân hiện có" (mặc định) và "Chụp cho bệnh nhân mới"',
      /700|Bold/.test(await weight('Chọn bệnh nhân hiện có')) && !/700|Bold/.test(await weight('Chụp cho bệnh nhân mới')) && await tab(p, 'Chụp cho bệnh nhân mới').isVisible(), `${await weight('Chọn bệnh nhân hiện có')}/${await weight('Chụp cho bệnh nhân mới')}`);
    rec('NP-02', 'Lối "Chọn bệnh nhân hiện có": vẫn có bước 1 Bệnh nhân, 2 Vết thương và nút "Chụp có hướng dẫn" khóa khi chưa chọn',
      await has(p, '1. Bệnh nhân') && await has(p, '2. Vết thương') && (await btn(p, 'Chụp có hướng dẫn').getAttribute('aria-disabled')) === 'true');
    await shot(p, 'b09-hien-co-390');
    await tab(p, 'Chụp cho bệnh nhân mới').click(); await p.waitForTimeout(500);
    rec('NP-03', 'Lối "Chụp cho bệnh nhân mới": có các bước và nút "Chụp cho bệnh nhân mới" ở chân màn', await has(p, 'Các bước') && await btn(p, 'Chụp cho bệnh nhân mới').isVisible());
    await shot(p, 'b09-benh-nhan-moi-390');
    await click(p, 'Chụp cho bệnh nhân mới', 1500);
    rec('NP-04', 'B10 ở luồng mới: thông báo "Chụp cho bệnh nhân mới", không có thanh bệnh nhân (chưa có hồ sơ)',
      await has(p, 'Chụp cho bệnh nhân mới. Ảnh chưa thuộc hồ sơ nào', false) && (await p.locator('[data-testid="clinical-context"]').count()) === 0);
    await shot(p, 'b10-benh-nhan-moi-390');
    await p.close();
  }

  // ===== B. Luồng thành công, quan hệ dữ liệu =====
  let created = null;
  {
    const p = await newPage(); await login(p, 'bacsi');
    const d0 = await saved(p); const c0 = counts(d0);
    await toForm(p, { area: '12,5' });
    const t = await title(p);
    const pend = await savedPending(p);
    const mine = pend && pend['u-bs1'] ? pend['u-bs1'] : pend && Object.values(pend)[0];
    const d1 = await saved(p);
    rec('NP-05', 'Chuyển sang B09b "Tạo hồ sơ từ ảnh": ảnh chờ hiện ở đầu biểu mẫu (chip "Ảnh chờ tạo hồ sơ"), số đo đang chờ',
      /Tạo hồ sơ từ ảnh/.test(t) && await has(p, 'Ảnh chờ tạo hồ sơ') && (await p.locator('img:visible').count()) > 0 && await has(p, 'Số đo: 12,5 cm²', false), `tiêu đề "${t}", chip ${await has(p, 'Ảnh chờ tạo hồ sơ')}, ảnh ${await p.locator('img:visible').count()}, số đo ${await has(p, 'Số đo: 12,5 cm²', false)}`);
    rec('NP-06', 'Ảnh ở trạng thái chờ: ghi ở khóa riêng, không có image_id, chưa có hồ sơ, vết hay ảnh mới trong dữ liệu chính',
      !!mine && !mine.patientId && !mine.woundId && !('imageId' in mine) && same(counts(d1), c0) && !!mine.capture.captureId, mine ? `captureId ${mine.capture.captureId}` : 'không có ảnh chờ');
    await shot(p, 'b09b-bieu-mau-390');
    // Kiểm biểu mẫu: thiếu họ tên và vị trí.
    await click(p, 'Tạo hồ sơ và gắn ảnh', 1200);
    rec('NP-07', 'Thiếu họ tên, năm sinh, vị trí: báo lỗi từng ô, không tạo gì, ảnh vẫn chờ',
      await has(p, 'Nhập họ tên bệnh nhân.') && await has(p, 'Năm sinh không hợp lệ.') && await has(p, 'Nhập vị trí vết thương trong ảnh. Ảnh sẽ thuộc vết thương này.') && same(counts(await saved(p)), c0) && !!(await live(p)).pending);
    await fillForm(p, { name: 'Lê Văn Thử', year: '1970', phone: '0912 000 111', loc: 'Mu bàn chân phải' });
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2500);
    const d2 = await saved(p); const L = await live(p);
    const np = d2.patients.find((x) => x.name === 'Lê Văn Thử');
    const nw = np && d2.wounds.filter((w) => w.patientId === np.id);
    const ni = np && d2.images.filter((i) => i.patientId === np.id);
    const acc = np && d2.accounts.filter((a) => a.patientId === np.id);
    rec('NP-08', 'Lưu thành công: đúng 1 hồ sơ, 1 tài khoản, 1 vết VT01, 1 ảnh mới; mở thẳng B05 (không còn màn trung gian)',
      !!np && same(counts(d2), { patients: c0.patients + 1, accounts: c0.accounts + 1, wounds: c0.wounds + 1, images: c0.images + 1 }) && nw.length === 1 && nw[0].code === 'VT01' && ni.length === 1 && acc.length === 1
      && /\/wounds\//.test(p.url()) && !(await has(p, 'Đã tạo hồ sơ')), np ? `${np.code} ${nw.map((w) => w.id)} ${ni.map((i) => i.id)}` : 'không thấy hồ sơ');
    if (np) {
      const im = ni[0];
      created = { pid: np.id, wid: nw[0].id, iid: im.id, code: np.code, captureId: mine && mine.capture.captureId };
      rec('NP-09', 'Quan hệ: wound.patientId = hồ sơ mới; image.woundId = vết mới, image.patientId = hồ sơ mới; tên tệp theo mã hồ sơ, vết',
        nw[0].patientId === np.id && im.woundId === nw[0].id && im.patientId === np.id && im.filename.startsWith(`${np.code}_VT01_${im.id}`), im.filename);
      rec('NP-10', 'Siêu dữ liệu chụp giữ nguyên: captureId, ngày chụp, nguồn ảnh, khoanh vùng; bác sĩ tải lên là bác sĩ đang đăng nhập',
        !!mine && im.capture.captureId === mine.capture.captureId && im.captureDate === mine.captureDate && im.capture.imageSource === mine.capture.imageSource && im.capture.capturedAt === mine.capture.capturedAt
        && same(im.capture.roi, mine.capture.roi) && im.uploadedBy === 'u-bs1' && im.source === 'doctor', `ngày chụp ${im.captureDate}, nguồn ${im.capture.imageSource}`);
      rec('NP-11', 'Số đo bác sĩ nhập ở B10 được ghi sau khi có ảnh (labelImage): 12,5 cm², phương pháp đã chọn; không có số đo nào khác được tạo',
        im.areaCm2 === 12.5 && im.status === 'labeled' && im.measureMethod === 'Thước đo trên vết thương' && im.capture.manualReference.areaCm2 === 12.5 && im.history.length === 1, `${im.areaCm2} ${im.measureMethod}`);
      rec('NP-12', 'Không bịa thông tin: đánh giá, đợt điều trị, thiết bị không được tạo cho hồ sơ mới; ô AR tự động giữ nguyên trạng thái đã có',
        !d2.evaluations.some((e) => e.woundId === nw[0].id) && !d2.plans.some((x) => x.patientId === np.id) && !np.deviceId && im.capture.automaticMeasurement.areaCm2 === null);
      rec('NP-13', 'Ảnh chờ đã xóa (bộ nhớ máy và store); dữ liệu không có lỗi quan hệ', (await savedPending(p)) === null && L.pending === null && relIssues(d2).length === 0, relIssues(d2).join('; '));
    }
    rec('NP-14', 'Điều hướng thẳng: B05 của đúng VT01 thuộc hồ sơ mới, chỉ sau khi ảnh chờ đã xóa', /\/wounds\//.test(p.url()) && await has(p, 'Lê Văn Thử', false) && (created ? p.url().includes(created.wid) : false), p.url());
    await shot(p, 'b05-sau-tao-390');
    // Quay lại: B10 đã về bước 1, không còn ảnh cũ.
    await p.goBack(); await p.waitForTimeout(1200);
    rec('NP-15', 'Quay lại từ B05: B10 về bước 1, không giữ ảnh đã gắn (không lưu lặp được)', await has(p, 'Chọn ảnh có sẵn') && !(await has(p, 'Ảnh chờ tạo hồ sơ')));
    rec('NP-16', 'Không có lỗi trang', p.errors.length === 0, p.errors.join(' | '));
    await p.close();
  }

  // ===== C. Quay lại bước trước, giữ ảnh và thông tin =====
  {
    const p = await newPage(); await login(p, 'bacsi');
    await toForm(p, { area: '3' });
    await fillForm(p, { name: 'Bệnh Nhân Quay Lại', year: '1980' });
    await p.locator('[aria-label="Quay lại"]:visible').first().click().catch(async () => { await p.goBack(); });
    await p.waitForTimeout(1200);
    const t = await title(p);
    rec('NP-17', 'Quay lại B10 từ biểu mẫu: vẫn ở bước "Nhập số đo", ảnh và số đo giữ nguyên, chip "Ảnh chờ tạo hồ sơ"',
      /Nhập số đo/.test(t) && (await input(p, 'Diện tích bác sĩ đo (cm²)').inputValue()) === '3' && await has(p, 'Ảnh chờ tạo hồ sơ'), `tiêu đề "${t}"`);
    await click(p, 'Tiếp: tạo hồ sơ bệnh nhân', 1500);
    rec('NP-18', 'Sang lại biểu mẫu: họ tên, năm sinh đã nhập còn nguyên; vẫn đúng một ảnh chờ', (await input(p, 'Họ và tên').inputValue()) === 'Bệnh Nhân Quay Lại' && (await input(p, 'Năm sinh').inputValue()) === '1980' && Object.keys(await savedPending(p) || {}).length === 1);
    // Rời hẳn B10 về B09 (ảnh đã ở trạng thái chờ: không hỏi bỏ dữ liệu), B09 hiện thẻ ảnh chờ.
    await btn(p, 'Để sau, giữ ảnh chờ ở màn Chụp ảnh').click(); await p.waitForTimeout(1500);
    rec('NP-19', '"Để sau": về B09, thẻ "Ảnh chờ tạo hồ sơ" có họ tên đang nhập, nút "Tiếp tục tạo hồ sơ" và "Bỏ ảnh"; không hộp thoại bỏ dữ liệu',
      /\/capture$/.test(p.url()) && await has(p, 'Ảnh chờ tạo hồ sơ') && await has(p, 'Bệnh Nhân Quay Lại', false) && await btn(p, 'Tiếp tục tạo hồ sơ').isVisible() && p.dialogs.length === 0, p.dialogs.join(' / '));
    await tab(p, 'Chụp cho bệnh nhân mới').click(); await p.waitForTimeout(500);
    rec('NP-20', 'Đang có ảnh chờ: nút "Chụp cho bệnh nhân mới" khóa, nêu lý do (không âm thầm thay ảnh chờ)',
      (await btn(p, 'Chụp cho bệnh nhân mới').getAttribute('aria-disabled')) === 'true' && await has(p, 'Đang có ảnh chờ tạo hồ sơ. Tiếp tục hoặc bỏ ảnh đó trước.'));
    await shot(p, 'b09-anh-cho-390');
    const st = await callStore(p, 'holdPendingCapture', { uri: 'data:image/png;base64,iVBORw0KGgo=', ext: 'png', width: 1, height: 1, captureDate: '2026-11-16', sourceDateKnown: true, areaText: '', method: '',
      capture: { schemaVersion: '1.0', captureId: 'CAP-khac', sessionId: 's', selectedFrameId: 'f', imageSource: 'gallery', mode: 'guided_photo', width: 1, height: 1, capturedAt: null, recordedAt: '2026-11-16T00:00:00Z', sourceDateKnown: true, roi: { x: 0, y: 0, width: 1, height: 1 }, roiCoordinates: 'saved_image_normalized', previewGuideMapped: false, distance: { valueM: null, source: 'none', status: 'unavailable' }, automaticMeasurement: { areaCm2: null, status: 'unavailable', method: null, reasonCodes: [] }, manualReference: { areaCm2: null, method: null, confirmedBy: null, confirmedAt: null }, geometry: null } });
    rec('NP-21', 'Tầng store: giữ ảnh chờ thứ hai khi đã có một ảnh chờ bị từ chối, ảnh chờ cũ không đổi', !st.ok && (await live(p)).pending.form.name === 'Bệnh Nhân Quay Lại', st.error);
    // Mở lại ứng dụng (tải lại trang): ảnh chờ và thông tin còn.
    await p.reload(); await p.waitForTimeout(2500);
    await go(p, '/capture');
    rec('NP-22', 'Thoát rồi mở lại ứng dụng: B09 vẫn có ảnh chờ cùng họ tên đã nhập', await has(p, 'Ảnh chờ tạo hồ sơ') && await has(p, 'Bệnh Nhân Quay Lại', false));
    await click(p, 'Tiếp tục tạo hồ sơ', 1500);
    rec('NP-23', 'Tiếp tục: biểu mẫu khôi phục họ tên, năm sinh; ảnh chờ hiện ở đầu', (await input(p, 'Họ và tên').inputValue()) === 'Bệnh Nhân Quay Lại' && (await input(p, 'Năm sinh').inputValue()) === '1980' && await has(p, 'Ảnh chờ tạo hồ sơ'));
    // Hủy: hỏi, bấm "Ở lại" thì không gì đổi; xác nhận thì bỏ ảnh, không tạo hồ sơ.
    const c0 = counts(await saved(p));
    await click(p, 'Hủy', 800);
    rec('NP-24', 'Hủy, chọn "Ở lại": ảnh chờ còn, vẫn ở biểu mẫu', !!(await live(p)).pending && p.dialogs.some((x) => /Hủy và bỏ ảnh/.test(x)), p.dialogs.at(-1));
    p.accept = true; await click(p, 'Hủy', 1500); p.accept = false;
    rec('NP-25', 'Hủy, xác nhận: ảnh chờ bị bỏ (store, bộ nhớ máy), về B09, không tạo hồ sơ, vết hay ảnh nào',
      (await live(p)).pending === null && (await savedPending(p)) === null && /\/capture$/.test(p.url()) && same(counts(await saved(p)), c0) && !(await has(p, 'Ảnh chờ tạo hồ sơ')));
    await p.close();
  }

  // ===== D. Bấm lặp, lỗi ghi, lỗi một phần, ghi lặp sau khi mở lại =====
  {
    const p = await newPage(); await login(p, 'bacsi');
    await toForm(p);
    await fillForm(p, { name: 'Bấm Nhiều Lần', year: '1990', loc: 'Gót chân trái' });
    const c0 = counts(await saved(p));
    // Năm lần chạm liên tiếp vào nút lưu (không chờ vẽ lại giữa các lần).
    await p.evaluate(() => { const el = [...document.querySelectorAll('[role="button"]')].filter((x) => x.getAttribute('aria-label') === 'Tạo hồ sơ và gắn ảnh').pop(); for (let i = 0; i < 5; i++) el.click(); });
    await p.waitForTimeout(2500);
    const d = await saved(p);
    rec('NP-26', 'Chạm 5 lần liền vào "Tạo hồ sơ và gắn ảnh": chỉ 1 hồ sơ, 1 vết, 1 ảnh', d.patients.filter((x) => x.name === 'Bấm Nhiều Lần').length === 1 && same(counts(d), { patients: c0.patients + 1, accounts: c0.accounts + 1, wounds: c0.wounds + 1, images: c0.images + 1 }));
    // Tầng store: hai lời gọi chồng nhau.
    await toForm(p);
    await fillForm(p, { name: 'Gọi Chồng Nhau', year: '1991', loc: 'Cổ tay' });
    const c1 = counts(await saved(p));
    const both = await evalStore(p, `const f = { name: 'Gọi Chồng Nhau', birthYear: '1991', sex: 'Nam', phone: '', woundLocation: 'Cổ tay', consent: false };
      const rs = await Promise.allSettled([store.commitPendingCapture({ kind: 'new', form: f }), store.commitPendingCapture({ kind: 'new', form: f })]);
      return rs.map((r) => r.status === 'fulfilled' ? 'ok' : String(r.reason && r.reason.message));`);
    await p.waitForTimeout(800);
    const d1 = await saved(p);
    rec('NP-27', 'Tầng store: hai lời gọi commitPendingCapture cùng lúc, một thành công, một bị từ chối; chỉ 1 hồ sơ',
      both.filter((x) => x === 'ok').length === 1 && d1.patients.filter((x) => x.name === 'Gọi Chồng Nhau').length === 1 && same(counts(d1), { patients: c1.patients + 1, accounts: c1.accounts + 1, wounds: c1.wounds + 1, images: c1.images + 1 }), both.join(' / '));

    // Lỗi ghi bộ nhớ máy khi lưu hồ sơ (đầy bộ nhớ): không có gì được ghi, ảnh và thông tin giữ nguyên, thử lại được.
    await toForm(p);
    await fillForm(p, { name: 'Lỗi Bộ Nhớ', year: '1985', loc: 'Đùi phải' });
    const c2 = counts(await saved(p)); const pend2 = await savedPending(p);
    await p.evaluate((k) => { const o = Storage.prototype.setItem; window.__oset = o; Storage.prototype.setItem = function (key, v) { if (key === k) throw new DOMException('QuotaExceededError', 'QuotaExceededError'); return o.call(this, key, v); }; }, DATA_KEY);
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2000);
    const L2 = await live(p);
    rec('NP-28', 'Lỗi ghi bộ nhớ máy khi lưu: báo lỗi kèm "Ảnh và thông tin đã nhập vẫn giữ nguyên"; không có hồ sơ, vết, ảnh nào (cả trong store lẫn bộ nhớ máy); không báo thành công',
      await has(p, 'Ảnh và thông tin đã nhập vẫn giữ nguyên', false) && p.url().includes('capture-new-patient') && same(counts(L2.data), c2) && same(counts(await saved(p)), c2) && !L2.data.patients.some((x) => x.name === 'Lỗi Bộ Nhớ'));
    rec('NP-29', 'Sau lỗi: ảnh chờ còn nguyên (cùng captureId), họ tên còn trong ô', !!L2.pending && L2.pending.capture.captureId === Object.values(pend2)[0].capture.captureId && (await input(p, 'Họ và tên').inputValue()) === 'Lỗi Bộ Nhớ');
    await shot(p, 'b09b-loi-ghi-390');
    await p.evaluate(() => { Storage.prototype.setItem = window.__oset; });
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2500);
    const d3 = await saved(p);
    rec('NP-30', 'Hết lỗi, bấm lưu lại: đúng 1 hồ sơ "Lỗi Bộ Nhớ", không trùng, không mồ côi', d3.patients.filter((x) => x.name === 'Lỗi Bộ Nhớ').length === 1 && same(counts(d3), { patients: c2.patients + 1, accounts: c2.accounts + 1, wounds: c2.wounds + 1, images: c2.images + 1 }) && relIssues(d3).length === 0);

    // Lỗi một phần: hồ sơ, vết, ảnh đã ghi (một lần) nhưng ghi số đo lỗi. Không báo "đã lưu số đo", mở B11 để nhập lại, không tạo ảnh trùng.
    await toForm(p, { area: '7,5' });
    await fillForm(p, { name: 'Lỗi Số Đo', year: '1975', loc: 'Bắp chân trái' });
    const c4 = counts(await saved(p));
    await p.evaluate((k) => { const o = Storage.prototype.setItem; window.__oset = o; let n = 0; Storage.prototype.setItem = function (key, v) { if (key === k && ++n > 1) throw new DOMException('QuotaExceededError', 'QuotaExceededError'); return o.call(this, key, v); }; }, DATA_KEY);
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2500);
    const d4 = await saved(p);
    const p4 = d4.patients.find((x) => x.name === 'Lỗi Số Đo');
    const i4 = p4 && d4.images.find((i) => i.patientId === p4.id);
    rec('NP-31', 'Ghi số đo lỗi sau khi đã tạo hồ sơ và ảnh: mở B11 của ảnh, báo rõ "số đo chưa lưu"; hồ sơ, vết, ảnh có đủ và đúng quan hệ, ảnh chưa có số đo',
      await has(p, 'số đo chưa lưu', false) && !!i4 && i4.areaCm2 === null && same(counts(d4), { patients: c4.patients + 1, accounts: c4.accounts + 1, wounds: c4.wounds + 1, images: c4.images + 1 }) && relIssues(d4).length === 0);
    await shot(p, 'b09b-loi-so-do-390');
    await p.evaluate(() => { Storage.prototype.setItem = window.__oset; });
    rec('NP-32', 'B11 là của đúng ảnh vừa gắn, số đo 7,5 điền sẵn để lưu lại', !!i4 && p.url().includes(`/images/${i4.id}`) && (await p.locator('input:visible').evaluateAll((xs) => xs.map((x) => x.value))).includes('7,5'), p.url());

    // Ghi lặp sau khi mở lại: dữ liệu đã có ảnh của lần chụp này nhưng ảnh chờ còn sót (ví dụ ứng dụng tắt trước khi xóa ảnh chờ).
    await toForm(p);
    await fillForm(p, { name: 'Ảnh Chờ Sót', year: '1966', loc: 'Khuỷu tay' });
    const stale = await savedPending(p);
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2500);
    const c5 = counts(await saved(p));
    await p.evaluate(({ k, v }) => localStorage.setItem(k, JSON.stringify(v)), { k: PENDING_KEY, v: stale });
    await p.reload(); await p.waitForTimeout(2500);
    await go(p, '/capture-new-patient');
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2500);
    const d5 = await saved(p);
    rec('NP-33', 'Ảnh chờ còn sót của lần đã ghi: bấm lưu không tạo hồ sơ thứ hai (nhận ra theo captureId), trả về hồ sơ đã có, xóa ảnh chờ',
      same(counts(d5), c5) && d5.patients.filter((x) => x.name === 'Ảnh Chờ Sót').length === 1 && (await savedPending(p)) === null && /\/wounds\//.test(p.url()));

    // Kiểm trước khi xóa ảnh chờ: dữ liệu có ảnh của lần chụp này nhưng liên kết sai (vết không tồn tại). Ảnh chờ phải giữ, không ghi thêm.
    await toForm(p);
    await fillForm(p, { name: 'Liên Kết Hỏng', year: '1961', loc: 'Gót chân' });
    const stale6 = await savedPending(p);
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2500);
    await p.evaluate(({ k, kp, v, cid }) => {
      const d = JSON.parse(localStorage.getItem(k)); const im = d.images.find((i) => i.capture && i.capture.captureId === cid);
      im.__w = im.woundId; im.woundId = 'w-khong-ton-tai'; localStorage.setItem(k, JSON.stringify(d)); localStorage.setItem(kp, JSON.stringify(v));
    }, { k: DATA_KEY, kp: PENDING_KEY, v: stale6, cid: Object.values(stale6)[0].capture.captureId });
    await p.reload(); await p.waitForTimeout(2500);
    await go(p, '/capture-new-patient');
    const c6 = counts(await saved(p));
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2500);
    const d6 = await saved(p); const L6 = await live(p);
    rec('NP-33b', 'Ảnh của lần chụp đã có nhưng liên kết sai: báo lỗi, giữ ảnh chờ (bộ nhớ máy và store), không ghi thêm bản nào, không rời biểu mẫu',
      await has(p, 'liên kết hồ sơ, vết thương chưa đúng', false) && same(counts(d6), c6) && !!(await savedPending(p)) && !!L6.pending && p.url().includes('capture-new-patient'));
    // Trả dữ liệu về đúng để các ca sau không bị ảnh hưởng.
    await p.evaluate(({ k, cid }) => { const d = JSON.parse(localStorage.getItem(k)); const im = d.images.find((i) => i.capture && i.capture.captureId === cid); im.woundId = im.__w; delete im.__w; localStorage.setItem(k, JSON.stringify(d)); }, { k: DATA_KEY, cid: Object.values(stale6)[0].capture.captureId });
    await p.reload(); await p.waitForTimeout(2500);
    await go(p, '/capture-new-patient');
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2500);
    rec('NP-33c', 'Sửa lại liên kết rồi bấm lưu: nhận ảnh đã có theo captureId, xóa ảnh chờ, mở B05; vẫn đúng 1 hồ sơ "Liên Kết Hỏng"',
      (await savedPending(p)) === null && /\/wounds\//.test(p.url()) && (await saved(p)).patients.filter((x) => x.name === 'Liên Kết Hỏng').length === 1 && same(counts(await saved(p)), c6));
    rec('NP-34', 'Không có lỗi trang ở nhóm D', p.errors.length === 0, p.errors.join(' | '));
    await p.close();
  }

  // ===== E. Hồ sơ có thể trùng =====
  {
    // Hồ sơ của bác sĩ khác có số 0933 444 555.
    const q = await newPage(); await login(q, 'bacsi2');
    await go(q, '/patients/new');
    await input(q, 'Họ và tên').fill('Hồ Sơ Bác Sĩ Hai'); await input(q, 'Năm sinh').fill('1960'); await input(q, 'Số điện thoại').fill('0933444555');
    await click(q, 'Lưu hồ sơ và tạo tài khoản', 2000);
    const otherOk = await has(q, 'Đã tạo hồ sơ');
    const store2 = await saved(q);
    await q.close();

    const p = await newPage();
    await p.goto(BASE + '/'); await p.evaluate(({ k, v }) => localStorage.setItem(k, v), { k: DATA_KEY, v: JSON.stringify(store2) });
    await login(p, 'bacsi');
    await toForm(p);
    await fillForm(p, { name: 'Nguyễn Văn A', year: '1958', phone: '09xx xxx 001', loc: 'Cẳng chân phải' });
    const c0 = counts(await saved(p));
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2000);
    rec('NP-35', 'Trùng số điện thoại với hồ sơ của bác sĩ: hiện "Có thể trùng hồ sơ BN001" kèm họ tên, năm sinh; không tạo hồ sơ; nút tạo khóa',
      await has(p, 'Có thể trùng hồ sơ BN001') && await has(p, 'BN001 · Nguyễn Văn A · sinh 1958') && same(counts(await saved(p)), c0) && (await btn(p, 'Tạo hồ sơ và gắn ảnh').getAttribute('aria-disabled')) === 'true');
    await shot(p, 'b09b-trung-ho-so-390');
    rec('NP-36', 'Không tự gắn: nút "Gắn ảnh vào hồ sơ BN001" khóa tới khi chọn vết thương', (await btn(p, 'Gắn ảnh vào hồ sơ BN001').getAttribute('aria-disabled')) === 'true');
    await p.getByRole('radio', { name: /^VT01/ }).first().click(); await p.waitForTimeout(400);
    await click(p, 'Gắn ảnh vào hồ sơ BN001', 1200);
    rec('NP-37', 'Chọn vết rồi bấm gắn: hỏi xác nhận; chọn "Xem lại" thì không ghi gì', p.dialogs.some((x) => /Gắn ảnh vào hồ sơ BN001/.test(x)) && same(counts(await saved(p)), c0));
    const pend = (await live(p)).pending;
    const w1 = (await saved(p)).wounds.find((w) => w.patientId === 'p-1' && w.code === 'VT01');
    p.accept = true; await click(p, 'Gắn ảnh vào hồ sơ BN001', 2500); p.accept = false;
    const d = await saved(p);
    const im = d.images.find((i) => i.capture && i.capture.captureId === pend.capture.captureId);
    rec('NP-38', 'Xác nhận: ảnh gắn vào BN001 · VT01 (đúng vết đã chọn); không tạo hồ sơ, tài khoản hay vết mới; thông tin BN001 không đổi',
      !!im && im.patientId === 'p-1' && im.woundId === w1.id && same(counts(d), { ...c0, images: c0.images + 1 }) && same(d.patients.find((x) => x.id === 'p-1'), (await saved(p)).patients.find((x) => x.id === 'p-1')) && /\/wounds\//.test(p.url()) && p.url().includes(w1.id));
    // Trùng với hồ sơ của bác sĩ khác: chỉ hiện mã hồ sơ, không cho gắn.
    await toForm(p);
    await fillForm(p, { name: 'Người Khác', year: '1960', phone: '0933 444 555', loc: 'Lưng' });
    await click(p, 'Tạo hồ sơ và gắn ảnh', 2000);
    const dupOther = (await saved(p)).patients.find((x) => x.phone.replace(/\s/g, '') === '0933444555');
    rec('NP-39', 'Trùng hồ sơ của bác sĩ khác: chỉ hiện mã hồ sơ, không hiện họ tên, không có nút gắn ảnh; ảnh vẫn chờ',
      otherOk && !!dupOther && await has(p, `Có thể trùng hồ sơ ${dupOther.code}`) && !(await has(p, 'Hồ Sơ Bác Sĩ Hai', false)) && (await p.getByRole('button', { name: /^Gắn ảnh vào hồ sơ/ }).count()) === 0 && !!(await live(p)).pending);
    await shot(p, 'b09b-trung-bac-si-khac-390');
    // Sửa số điện thoại thì hết cảnh báo, tạo được.
    await fillForm(p, { phone: '0933 444 556' });
    rec('NP-40', 'Sửa số điện thoại: cảnh báo trùng biến mất, nút tạo mở lại', !(await has(p, `Có thể trùng hồ sơ ${dupOther ? dupOther.code : ''}`)) && (await btn(p, 'Tạo hồ sơ và gắn ảnh').getAttribute('aria-disabled')) !== 'true');
    await p.close();
  }

  // ===== F. Phân quyền (tầng store, không chỉ ẩn nút) =====
  {
    const p = await newPage(); await login(p, 'bacsi');
    await toForm(p);
    await fillForm(p, { name: 'Ảnh Của Bác Sĩ Một', year: '1950', loc: 'Mắt cá' });
    const raw = await savedPending(p);
    await logout(p); await login(p, 'bacsi2');
    await go(p, '/capture');
    rec('NP-41', 'Bác sĩ khác đăng nhập cùng máy: B09 không thấy ảnh chờ của bác sĩ trước', !(await has(p, 'Ảnh chờ tạo hồ sơ')));
    const r1 = await callStore(p, 'commitPendingCapture', { kind: 'new', form: { name: 'X', birthYear: '1950', sex: 'Nam', phone: '', woundLocation: 'Y', consent: false } });
    rec('NP-42', 'Bác sĩ khác gọi commitPendingCapture: bị từ chối (không có ảnh chờ của mình), ảnh chờ của bác sĩ một còn nguyên', !r1.ok && same(await savedPending(p), raw), r1.error);
    const r1b = await callStore(p, 'commitPendingCapture', { kind: 'existing', patientId: 'p-1', woundId: 'w-1' });
    rec('NP-43', 'Bác sĩ khác không gắn được vào hồ sơ không phụ trách', !r1b.ok, r1b.error);
    await logout(p); await login(p, 'benhnhan');
    for (const u of ['/capture', '/capture-new-patient', '/guided-capture?moi=1']) { await go(p, u); rec(`NP-44${u}`, `Bệnh nhân mở ${u}: màn "Không có quyền"`, await has(p, 'Không có quyền')); }
    const r2 = await callStore(p, 'commitPendingCapture', { kind: 'new', form: { name: 'X', birthYear: '1950', sex: 'Nam', phone: '', woundLocation: 'Y', consent: false } });
    const r3 = await callStore(p, 'discardPendingCapture');
    rec('NP-45', 'Bệnh nhân gọi commitPendingCapture, discardPendingCapture: bị từ chối; ảnh chờ của bác sĩ không đổi', !r2.ok && !r3.ok && same(await savedPending(p), raw), `${r2.error} / ${r3.error}`);
    await logout(p); await login(p, 'quantri');
    for (const u of ['/capture', '/capture-new-patient']) { await go(p, u); rec(`NP-46${u}`, `Quản trị mở ${u}: màn "Không có quyền"`, await has(p, 'Không có quyền')); }
    const r4 = await callStore(p, 'holdPendingCapture', { uri: 'data:,', ext: 'png', width: 1, height: 1, captureDate: '2026-11-16', sourceDateKnown: true, areaText: '', method: '', capture: { captureId: 'x', geometry: null, automaticMeasurement: { areaCm2: null }, distance: { valueM: null } } });
    rec('NP-47', 'Quản trị gọi holdPendingCapture: bị từ chối', !r4.ok, r4.error);
    await logout(p); await login(p, 'bacsi');
    await go(p, '/capture');
    rec('NP-48', 'Bác sĩ một đăng nhập lại: ảnh chờ và họ tên vẫn còn', await has(p, 'Ảnh chờ tạo hồ sơ') && await has(p, 'Ảnh Của Bác Sĩ Một', false));
    await p.close();
  }

  // ===== G. Bộ lọc thu gọn ở B09 =====
  {
    const p = await newPage(); await login(p, 'bacsi');
    await go(p, '/capture');
    // Chỉ các ô chọn bệnh nhân (nhãn bắt đầu bằng mã hồ sơ), không tính ô chọn vết thương ở bước 2.
    const radios = async () => (await p.getByRole('radio').locator('visible=true').evaluateAll((xs) => xs.map((x) => x.getAttribute('aria-label')))).filter((x) => /^BN\d/.test(x || ''));
    // react-native-web không xuất aria-checked; bệnh nhân đã chọn thì bước 2 hiện ô chọn vết thay cho câu "Chọn bệnh nhân trước."
    const picked = async () => !(await has(p, 'Chọn bệnh nhân trước.')) && (await p.getByRole('radio', { name: /^VT\d/ }).locator('visible=true').count()) > 0;
    const all = await radios();
    rec('FL-01', 'Mặc định mở: nút "Đóng bộ lọc" và ô tìm kiếm hiện', await fbtn(p, true).isVisible() && await input(p, 'Tìm bệnh nhân').isVisible());
    await ftoggle(p, true);
    rec('FL-02', 'Bấm "Đóng bộ lọc": ô tìm kiếm ẩn, nút đổi thành "Mở bộ lọc", danh sách không đổi', await fbtn(p, false).isVisible() && (await p.locator('[aria-label="Tìm bệnh nhân"]:visible').count()) === 0 && same(await radios(), all));
    await ftoggle(p, false);
    await input(p, 'Tìm bệnh nhân').fill('pham'); await p.waitForTimeout(400);
    const filtered = await radios();
    await p.getByRole('radio', { name: /Phạm Thị B/ }).click(); await p.waitForTimeout(300);
    await ftoggle(p, true);
    rec('FL-03', 'Đóng khi đang lọc: kết quả giữ nguyên, hiện "1 đang dùng", "Đang lọc: tên hoặc mã có "pham"" và số hồ sơ',
      same(await radios(), filtered) && filtered.length === 1 && await has(p, '1 đang dùng') && (await p.getByText('Đang lọc: tên hoặc mã có "pham"', { exact: true }).count()) > 0 && await has(p, `1/${all.length} hồ sơ`));
    await shot(p, 'b09-bo-loc-dong-390');
    rec('FL-04', 'Bệnh nhân đã chọn vẫn chọn sau khi đóng bộ lọc', await picked());
    await ftoggle(p, false);
    rec('FL-05', 'Mở lại: ô tìm kiếm còn "pham", kết quả như trước', (await input(p, 'Tìm bệnh nhân').inputValue()) === 'pham' && same(await radios(), filtered));
    await input(p, 'Tìm bệnh nhân').fill('BN001'); await p.waitForTimeout(400);
    rec('FL-06', 'Tìm theo mã vẫn đúng (BN001)', same(await radios(), ['BN001 · Nguyễn Văn A']), (await radios()).join(','));
    await input(p, 'Tìm bệnh nhân').fill('zzzz'); await p.waitForTimeout(400);
    await ftoggle(p, true);
    rec('FL-07', 'Không có kết quả: khi đóng bộ lọc vẫn báo "Không tìm thấy bệnh nhân phù hợp."', await has(p, 'Không tìm thấy bệnh nhân phù hợp.') && await has(p, `0/${all.length} hồ sơ`));
    rec('FL-08', 'Khi đóng bộ lọc, lối "Chụp cho bệnh nhân mới" vẫn thấy và bấm được', await tab(p, 'Chụp cho bệnh nhân mới').isVisible());
    await tab(p, 'Chụp cho bệnh nhân mới').click(); await p.waitForTimeout(300);
    await tab(p, 'Chọn bệnh nhân hiện có').click(); await p.waitForTimeout(300);
    rec('FL-09', 'Chuyển lối vào rồi quay lại: bộ lọc vẫn đóng, giá trị lọc giữ', await fbtn(p, false).isVisible() && (await p.getByText('Đang lọc: tên hoặc mã có "zzzz"', { exact: true }).count()) > 0);
    rec('FL-10', 'Nút bộ lọc có trạng thái mở/đóng cho trình đọc màn hình (aria-expanded)', (await fbtn(p, false).getAttribute('aria-expanded')) === 'false' && (await fbtn(p, false).getAttribute('aria-label')) === 'Mở bộ lọc, 1 bộ lọc đang dùng');
    await p.close();
    for (const [w, h] of [[320, 640], [360, 780], [390, 844], [768, 1024]]) {
      const r = await newPage(w, h); await login(r, 'bacsi'); await go(r, '/capture');
      const ok1 = (await overflow(r)) <= 0 && await fbtn(r, true).isVisible() && await tab(r, 'Chụp cho bệnh nhân mới').isVisible();
      await shot(r, `b09-${w}`);
      await ftoggle(r, true);
      const ok2 = (await overflow(r)) <= 0 && await fbtn(r, false).isVisible();
      await tab(r, 'Chụp cho bệnh nhân mới').click(); await r.waitForTimeout(400);
      const ok3 = (await overflow(r)) <= 0 && await btn(r, 'Chụp cho bệnh nhân mới').isVisible();
      await shot(r, `b09-moi-${w}`);
      await click(r, 'Chụp cho bệnh nhân mới', 1500);
      const [fc] = await Promise.all([r.waitForEvent('filechooser'), btn(r, 'Chọn ảnh có sẵn').click()]);
      await fc.setFiles(PHOTO); await r.waitForTimeout(3500);
      await click(r, 'Tiếp: nhập số đo', 700);
      await click(r, 'Tiếp: tạo hồ sơ bệnh nhân', 1500);
      const ok4 = (await overflow(r)) <= 0 && await btn(r, 'Tạo hồ sơ và gắn ảnh').isVisible() && await btn(r, 'Hủy').isVisible();
      await shot(r, `b09b-${w}`);
      rec(`RS-${w}`, `Màn ${w}×${h}: B09 (mở, đóng bộ lọc, lối bệnh nhân mới) và B09b không tràn ngang, nút chính trong khung`, ok1 && ok2 && ok3 && ok4, `${ok1}/${ok2}/${ok3}/${ok4}`);
      await r.close();
    }
  }

  await b.close();
  fs.writeFileSync(path.join(OUT, 'ket-qua-benh-nhan-moi-tu-anh.json'), JSON.stringify(results, null, 2));
  const fail = results.filter((r) => r.result !== 'ĐẠT').length;
  console.log(`\nTổng: ${results.length}, đạt ${results.length - fail}, lỗi ${fail}`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
