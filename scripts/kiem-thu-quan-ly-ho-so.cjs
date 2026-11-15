// Kiểm thử gói "Bác sĩ quản lý hồ sơ bệnh nhân và vết thương": sửa hồ sơ, lưu trữ hồ sơ, sửa vị trí vết thương, đánh dấu đã lành, phân quyền.
// Bản web, dữ liệu mô phỏng, Playwright. Không thay cho thử trên máy thật hay thử với bác sĩ.
// Chạy: node scripts/kiem-thu-quan-ly-ho-so.cjs <baseURL> <thư mục kết quả>
// Ca phân quyền gọi thẳng hàm của store (lấy từ cây React trên bản web) để kiểm tầng store, không chỉ kiểm việc ẩn nút.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8710';
const OUT = process.argv[3] || '.';
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
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().replace(/\n+/g, ' | ')}`); if (p.accept && d.type() === 'confirm') d.accept(); else d.dismiss(); });
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
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1500); };
  const has = async (p, t, exact = true) => (await p.locator(`text=${exact ? `"${t}"` : t}`).locator('visible=true').count()) > 0;
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const click = async (p, t) => { await p.getByText(t, { exact: true }).locator('visible=true').last().click(); await p.waitForTimeout(900); };
  const input = (p, label) => p.locator(`[aria-label="${label}"]:visible`).last();
  // Gọi hàm store trên bản web: tìm giá trị Provider của store trong cây fiber React.
  // Không tìm thấy store thì dừng kịch bản (không để ca "bị từ chối" đạt nhầm).
  const callStore = async (p, fn, ...args) => {
    const res = await p.evaluate(async ({ fn, args }) => {
      let v = null;
      for (const el of document.querySelectorAll('*')) {
        const k = Object.keys(el).find((x) => x.startsWith('__reactFiber'));
        if (!k) continue;
        let f = el[k];
        while (f) { const val = f.memoizedProps && f.memoizedProps.value; if (val && typeof val.updatePatient === 'function') { v = val; break; } f = f.return; }
        if (v) break;
      }
      if (!v) return { noStore: true };
      try { const r = await v[fn](...args); return { ok: true, r: r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    }, { fn, args });
    if (res.noStore) throw new Error(`Không tìm thấy store khi gọi ${fn}`);
    await p.waitForTimeout(300);
    return res;
  };
  // Ảnh chụp dữ liệu lâm sàng của một bệnh nhân để so trước và sau thao tác.
  const clinical = (d, pid) => JSON.stringify({
    wounds: d.wounds.filter((w) => w.patientId === pid).map((w) => [w.id, w.code, w.patientId, w.startDate]),
    images: d.images.filter((i) => i.patientId === pid).map((i) => [i.id, i.woundId, i.filename, i.areaCm2, i.status, i.history.length]),
    evals: d.evaluations.filter((e) => d.wounds.some((w) => w.id === e.woundId && w.patientId === pid)).map((e) => e.id),
    plans: d.plans.filter((x) => x.patientId === pid).map((x) => [x.id, x.version, x.status]),
    sessions: d.sessions.length, notes: d.sessionNotes.length, reports: d.reports.filter((r) => r.patientId === pid).length,
    links: (d.deviceLinks || []).length,
  });
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, `${name}.png`) }); };

  // ===== A. Sửa hồ sơ bệnh nhân =====
  {
    const p = await newPage(); await login(p, 'bacsi');
    await go(p, '/patients/p-1');
    rec('PE-01', 'B04 có nút "Chỉnh sửa hồ sơ" và chip "Đang theo dõi"', await has(p, 'Chỉnh sửa hồ sơ') && await has(p, 'Đang theo dõi'));
    const d0 = await store(p); const before = d0.patients.find((x) => x.id === 'p-1'); const clin0 = clinical(d0, 'p-1');
    await click(p, 'Chỉnh sửa hồ sơ');
    rec('PE-02', 'Biểu mẫu hiện giá trị đang lưu', (await input(p, 'Họ và tên').inputValue()) === before.name && (await input(p, 'Năm sinh').inputValue()) === String(before.birthYear) && (await input(p, 'Số điện thoại, không bắt buộc').inputValue()) === before.phone);
    await input(p, 'Họ và tên').fill(''); await input(p, 'Năm sinh').fill('1800'); await input(p, 'Số điện thoại, không bắt buộc').fill('123');
    await click(p, 'Lưu');
    const errs = [await has(p, 'Nhập họ tên bệnh nhân.'), await has(p, 'Năm sinh là số có 4 chữ số', false), await has(p, 'Số điện thoại gồm 10 số', false)];
    const d1 = await store(p);
    rec('PE-03', 'Dữ liệu sai bị từ chối, báo lỗi theo từng ô, dữ liệu không đổi, nội dung đang nhập giữ nguyên', errs.every(Boolean) && JSON.stringify(d1.patients.find((x) => x.id === 'p-1')) === JSON.stringify(before) && (await input(p, 'Năm sinh').inputValue()) === '1800', errs.join(','));
    // Hủy khi đã sửa: hỏi trước khi bỏ; đồng ý bỏ thì dữ liệu không đổi.
    await input(p, 'Họ và tên').fill('Tên tạm không lưu');
    p.dialogs = []; p.accept = true; await click(p, 'Hủy'); p.accept = false;
    const d2 = await store(p);
    rec('PE-04', 'Hủy không đổi dữ liệu (có hỏi bỏ dữ liệu chưa lưu)', p.dialogs.some((x) => x.includes('Bỏ dữ liệu chưa lưu')) && JSON.stringify(d2.patients.find((x) => x.id === 'p-1')) === JSON.stringify(before), p.dialogs.join(' / '));
    // Lưu hợp lệ: họ tên, năm sinh, số điện thoại.
    await go(p, '/patient-edit/p-1');
    await input(p, 'Họ và tên').fill('Nguyễn Văn An'); await input(p, 'Năm sinh').fill('1959'); await input(p, 'Số điện thoại, không bắt buộc').fill('0912 000 111');
    p.dialogs = [];
    const btn = p.getByText('Lưu', { exact: true }).locator('visible=true').last();
    await btn.click(); await btn.click({ force: true, timeout: 500 }).catch(() => {}); await p.waitForTimeout(1500);
    const d3 = await store(p); const after = d3.patients.find((x) => x.id === 'p-1');
    rec('PE-05', 'Lưu họ tên, năm sinh, số điện thoại', after.name === 'Nguyễn Văn An' && after.birthYear === 1959 && after.phone === '0912 000 111', `${after.name}, ${after.birthYear}, ${after.phone}`);
    const keep = ['id', 'code', 'doctorId', 'deviceId', 'researchCode', 'researchConsent', 'consentDate', 'createdAt', 'sex'].every((k) => after[k] === before[k]);
    rec('PE-06', 'Giữ mã hồ sơ, bác sĩ phụ trách, thiết bị, đồng ý nghiên cứu; không tạo hồ sơ mới; lịch sử lâm sàng không đổi', keep && d3.patients.length === d0.patients.length && clinical(d3, 'p-1') === clin0);
    rec('PE-07', 'Chạm Lưu hai lần chỉ lưu một lần (một thông báo "Đã lưu hồ sơ")', p.dialogs.filter((x) => x.includes('Đã lưu hồ sơ')).length === 1, p.dialogs.join(' / '));
    rec('PE-08', 'Sau lưu quay về B04, B04 hiện tên mới', p.url().includes('/patients/p-1') && await has(p, 'Nguyễn Văn An'), p.url());
    // Đồng ý nghiên cứu giữ cách cũ.
    p.accept = true;
    await p.getByRole('button', { name: /Thông tin hồ sơ/ }).locator('visible=true').last().click(); await p.waitForTimeout(500);
    await p.getByRole('switch').locator('visible=true').last().click(); await p.waitForTimeout(1200);
    const d4 = await store(p); const c1 = d4.patients.find((x) => x.id === 'p-1');
    await p.getByRole('switch').locator('visible=true').last().click(); await p.waitForTimeout(1200);
    const d5 = await store(p); const c2 = d5.patients.find((x) => x.id === 'p-1');
    p.accept = false;
    rec('PE-09', 'Rút lại rồi ghi nhận đồng ý nghiên cứu vẫn chạy như cũ (rút: bỏ ngày; ghi nhận: có ngày), họ tên không đổi', c1.researchConsent === false && c1.consentDate === undefined && c2.researchConsent === true && !!c2.consentDate && c2.name === 'Nguyễn Văn An', `${c1.researchConsent}/${c1.consentDate} → ${c2.researchConsent}/${c2.consentDate}`);
    // Trùng số điện thoại với hồ sơ khác.
    await go(p, '/patient-edit/p-2');
    await input(p, 'Số điện thoại, không bắt buộc').fill('0912000111'); await click(p, 'Lưu');
    rec('PE-10', 'Số điện thoại trùng hồ sơ khác bị từ chối', await has(p, 'Số điện thoại đã có ở hồ sơ BN001.') && (await store(p)).patients.find((x) => x.id === 'p-2').phone !== '0912000111');
    // Store: bác sĩ không đổi được phân công hay trường định danh, kể cả gọi thẳng hàm.
    const r1 = await callStore(p, 'updatePatient', 'p-1', { doctorId: 'u-bs2' });
    const r2 = await callStore(p, 'updatePatient', 'p-1', { name: 'X', code: 'BN999' });
    const r3 = await callStore(p, 'updatePatient', 'p-1', { birthYear: 1800 });
    const d6 = await store(p); const c3 = d6.patients.find((x) => x.id === 'p-1');
    rec('PM-01', 'Store từ chối bác sĩ đổi doctorId (phân công)', !r1.ok && c3.doctorId === 'u-bs1', r1.error);
    rec('PM-02', 'Store từ chối bác sĩ đổi mã hồ sơ, cả lời gọi lẫn trường được phép (không lưu một phần)', !r2.ok && c3.code === 'BN001' && c3.name === 'Nguyễn Văn An', r2.error);
    rec('PM-03', 'Store từ chối năm sinh sai khi gọi thẳng', !r3.ok && c3.birthYear === 1959, r3.error);
    const r4 = await callStore(p, 'updateWound', 'w-1', { status: 'follow_up' });
    rec('PM-04', 'Store từ chối đổi trạng thái vết qua updateWound (chỉ qua quy trình liền thương)', !r4.ok && (await store(p)).wounds.find((w) => w.id === 'w-1').status === d0.wounds.find((w) => w.id === 'w-1').status, r4.error);
    rec('PM-05', 'Giao diện bác sĩ không có điều khiển phân công', !(await has(p, 'Phân công')) && !(await has(p, 'Đổi bác sĩ phụ trách')));
    rec('PE-11', 'Không lỗi trang', p.errors.length === 0, p.errors.join(' / '));
  }

  // ===== B. Lưu trữ hồ sơ =====
  {
    const p = await newPage(); await login(p, 'bacsi');
    await go(p, '/patients/p-1');
    rec('AR-01', 'Bệnh nhân còn giữ máy: nút lưu trữ khóa, nêu lý do thu hồi máy', await has(p, 'Thu hồi máy trước khi lưu trữ hồ sơ', false));
    const rr = await callStore(p, 'setPatientArchived', 'p-1', true);
    rec('AR-02', 'Store cũng từ chối lưu trữ khi còn giữ máy', !rr.ok && !(await store(p)).patients.find((x) => x.id === 'p-1').archivedAt, rr.error);
    await go(p, '/patients/p-3');
    const d0 = await store(p); const clin0 = clinical(d0, 'p-3'); const name = d0.patients.find((x) => x.id === 'p-3').name;
    p.dialogs = []; await click(p, 'Lưu trữ hồ sơ');
    const msg = p.dialogs.join(' ');
    rec('AR-03', 'Hộp xác nhận nêu tên bệnh nhân, giải thích lưu trữ, cảnh báo lịch sử được giữ; Hủy không đổi', msg.includes(name) && msg.includes('được lưu trữ, không bị xóa') && msg.includes('giữ nguyên') && !(await store(p)).patients.find((x) => x.id === 'p-3').archivedAt, msg.slice(0, 160));
    p.accept = true; await click(p, 'Lưu trữ hồ sơ'); await p.waitForTimeout(800); p.accept = false;
    const d1 = await store(p); const a = d1.patients.find((x) => x.id === 'p-3');
    rec('AR-04', 'Lưu trữ ghi thời điểm và người thực hiện, không xóa hồ sơ', !!a.archivedAt && a.archivedBy === 'u-bs1' && d1.patients.length === d0.patients.length && a.doctorId === 'u-bs1', `${a.archivedAt} ${a.archivedBy}`);
    rec('AR-05', 'Vết thương, ảnh, đánh giá, đợt, phiên, báo cáo giữ nguyên', clinical(d1, 'p-3') === clin0);
    rec('AR-06', 'B04 hiện trạng thái đã lưu trữ, nút khôi phục; ẩn sửa hồ sơ, thêm vết thương, giao máy', await has(p, 'Đã lưu trữ', false) && await has(p, 'Khôi phục hồ sơ') && !(await has(p, 'Chỉnh sửa hồ sơ')) && !(await has(p, 'Thêm vết thương')) && !(await has(p, 'Giao máy')));
    await shot(p, 'ar-b04-da-luu-tru-390');
    await go(p, '/doctor/patients');
    const activeHas = await p.getByText('BN003', { exact: false }).locator('visible=true').count();
    rec('AR-07', 'B02 mặc định không còn hồ sơ đã lưu trữ, có lối vào "Hồ sơ đã lưu trữ (1)"', activeHas === 0 && await has(p, 'Hồ sơ đã lưu trữ (1)'));
    await click(p, 'Hồ sơ đã lưu trữ (1)');
    rec('AR-08', 'Danh sách đã lưu trữ có BN003', (await p.getByText('BN003', { exact: false }).locator('visible=true').count()) > 0);
    await shot(p, 'ar-b02-danh-sach-luu-tru-390');
    await go(p, '/doctor');
    rec('AR-09', 'B01 không còn hồ sơ đã lưu trữ', (await p.getByText('BN003', { exact: false }).locator('visible=true').count()) === 0);
    await go(p, '/capture');
    rec('AR-10', 'Màn chọn hồ sơ chụp ảnh (B09) không còn hồ sơ đã lưu trữ', (await p.getByText('BN003', { exact: false }).locator('visible=true').count()) === 0);
    // Store chặn tạo dữ liệu điều trị mới cho hồ sơ đã lưu trữ.
    const w3 = d1.wounds.find((w) => w.patientId === 'p-3');
    const tries = {
      addWound: await callStore(p, 'addWound', 'p-3', 'Thử'),
      addEvaluation: w3 ? await callStore(p, 'addEvaluation', { woundId: w3.id, date: '2026-11-15', areaCm2: 1, characteristics: '', symptoms: '', symptomSource: '', trend: 'stable', severity: 'mild', instructions: '', visibleToPatient: false }) : { ok: false, error: 'không có vết' },
      savePlan: await callStore(p, 'savePlan', { patientId: 'p-3', woundId: w3 && w3.id, status: 'draft', phases: [], sessionsPerDay: 1, minIntervalMin: null, targetEnergyWh: null, startDate: '2026-11-15', endDate: '2026-12-15', reviewSchedule: '', notes: '', reason: 'thử', confirmed: false }),
      assignDevice: await callStore(p, 'assignDevice', d1.devices.find((x) => !x.patientId)?.id || 'd-x', 'p-3'),
      recordClosure: w3 ? await callStore(p, 'recordClosure', w3.id, 'check1') : { ok: false, error: 'không có vết' },
      updateWound: w3 ? await callStore(p, 'updateWound', w3.id, { location: 'Chỗ khác' }) : { ok: false, error: 'không có vết' },
      updatePatient: await callStore(p, 'updatePatient', 'p-3', { name: 'Đổi tên' }),
      issueActivation: await callStore(p, 'issueActivation', 'p-3'),
    };
    const d2 = await store(p);
    rec('AR-11', 'Store từ chối thêm vết, đánh giá, đợt, giao máy, đổi trạng thái vết, sửa vị trí, sửa hồ sơ, cấp mã cho hồ sơ đã lưu trữ', Object.values(tries).every((x) => !x.ok) && clinical(d2, 'p-3') === clin0 && d2.patients.find((x) => x.id === 'p-3').name === name,
      Object.entries(tries).map(([k, v]) => `${k}:${v.ok ? 'CHẠY' : 'chặn'}`).join(', '));
    if (w3) {
      await go(p, `/wounds/${w3.id}`);
      rec('AR-12', 'B05 của hồ sơ đã lưu trữ: chỉ xem (không "Chụp ảnh", "Ghi đánh giá", "Đánh dấu đã lành", "Chỉnh sửa vị trí")', !(await has(p, 'Chụp ảnh')) && !(await has(p, 'Ghi đánh giá')) && !(await has(p, 'Đánh dấu đã lành')) && !(await has(p, 'Chỉnh sửa vị trí')) && await has(p, 'Lịch sử đánh giá'));
    } else rec('AR-12', 'B05 của hồ sơ đã lưu trữ chỉ xem', false, 'BN003 không có vết');
    // Bác sĩ khác không lưu trữ hoặc khôi phục được.
    const p2 = await newPage(); await login(p2, 'bacsi2');
    await p2.evaluate((d) => localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d)), d2); await go(p2, '/doctor');
    const o1 = await callStore(p2, 'setPatientArchived', 'p-3', false);
    const o2 = await callStore(p2, 'setPatientArchived', 'p-2', true);
    const o3 = await callStore(p2, 'updatePatient', 'p-2', { name: 'Bác sĩ khác sửa' });
    const o4 = await callStore(p2, 'updateWound', d2.wounds.find((w) => w.patientId === 'p-2').id, { location: 'Bác sĩ khác sửa' });
    rec('AR-13', 'Bác sĩ khác không lưu trữ, khôi phục, sửa hồ sơ hay sửa vết của bệnh nhân không được phân công', [o1, o2, o3, o4].every((x) => !x.ok), [o1, o2, o3, o4].map((x) => x.error).join(' / '));
    await go(p2, '/patient-edit/p-2');
    rec('AR-14', 'Bác sĩ khác mở đường dẫn sửa hồ sơ thì thấy "Không có quyền"', await has(p2, 'Không có quyền'));
    await go(p2, '/wound-edit/' + d2.wounds.find((w) => w.patientId === 'p-2').id);
    rec('AR-15', 'Bác sĩ khác mở đường dẫn sửa vị trí thì thấy "Không có quyền"', await has(p2, 'Không có quyền'));
    // Khôi phục.
    await go(p, '/patients/p-3');
    p.accept = true; await click(p, 'Khôi phục hồ sơ'); await p.waitForTimeout(800); p.accept = false;
    const d3 = await store(p); const r = d3.patients.find((x) => x.id === 'p-3');
    await go(p, '/doctor/patients');
    rec('AR-16', 'Khôi phục: bỏ trạng thái lưu trữ, hồ sơ trở lại danh sách, lịch sử giữ nguyên', !r.archivedAt && !r.archivedBy && (await p.getByText('BN003', { exact: false }).locator('visible=true').count()) > 0 && clinical(d3, 'p-3') === clin0);
    // Bệnh nhân không gọi được các hàm của bác sĩ.
    const p3 = await newPage(); await login(p3, 'benhnhan');
    const b1 = await callStore(p3, 'updatePatient', 'p-1', { name: 'Bệnh nhân tự sửa' });
    const b2 = await callStore(p3, 'setPatientArchived', 'p-1', true);
    const b3 = await callStore(p3, 'updateWound', 'w-1', { location: 'Bệnh nhân sửa' });
    rec('PM-06', 'Tài khoản bệnh nhân không sửa hồ sơ, không lưu trữ, không sửa vết', [b1, b2, b3].every((x) => !x.ok), [b1, b2, b3].map((x) => x.error).join(' / '));
    // Quản trị: Q01 "Phân công" giữ nguyên.
    const p4 = await newPage(); await login(p4, 'quantri');
    await go(p4, '/admin');
    const q1 = await has(p4, 'Phân công');
    const qa = await callStore(p4, 'updatePatient', 'p-3', { doctorId: 'u-bs2' });
    const dq = await store(p4);
    const qb = await callStore(p4, 'updatePatient', 'p-3', { doctorId: 'u-bs1' });
    const dq2 = await store(p4);
    rec('PM-07', 'Quản trị vẫn phân công qua updatePatient (Q01) như cũ; quản trị không sửa được họ tên qua đường này', q1 && qa.ok && qb.ok && dq.patients.find((x) => x.id === 'p-3').doctorId === 'u-bs2' && dq2.patients.find((x) => x.id === 'p-3').doctorId === 'u-bs1', `tab Phân công: ${q1}`);
    const qn = await callStore(p4, 'updatePatient', 'p-3', { name: 'Quản trị đổi tên' });
    rec('PM-08', 'Nhánh quản trị bỏ qua trường khác doctorId (giữ hành vi cũ)', qn.ok && (await store(p4)).patients.find((x) => x.id === 'p-3').name === name);
    const qr = await callStore(p4, 'setPatientArchived', 'p-3', true);
    rec('PM-09', 'Lưu trữ là việc của bác sĩ phụ trách, quản trị không lưu trữ (Q01 không đổi)', !qr.ok, qr.error);
    rec('AR-17', 'Không lỗi trang', [p, p2, p3, p4].every((x) => x.errors.length === 0), [p, p2, p3, p4].flatMap((x) => x.errors).join(' / '));
  }

  // ===== C. Vết thương: sửa vị trí, đánh dấu đã lành =====
  {
    const p = await newPage(); await login(p, 'bacsi');
    const d0 = await store(p);
    const w = d0.wounds.find((x) => x.patientId === 'p-1' && x.status === 'active');
    const clin0 = clinical(d0, 'p-1');
    const statuses0 = JSON.stringify(d0.wounds.map((x) => [x.id, x.status]));
    await go(p, `/wounds/${w.id}`);
    rec('WD-01', 'B05 có "Chỉnh sửa vị trí" và "Đánh dấu đã lành", hiện trạng thái vết', await has(p, 'Chỉnh sửa vị trí') && await has(p, 'Đánh dấu đã lành') && await has(p, 'Đang điều trị'));
    await shot(p, 'wd-b05-390');
    await click(p, 'Chỉnh sửa vị trí');
    rec('WD-02', 'Màn sửa vị trí hiện vị trí đang lưu', await has(p, w.location) && (await input(p, 'Vị trí mới').inputValue()) === w.location);
    await input(p, 'Vị trí mới').fill('   '); await click(p, 'Lưu');
    rec('WD-03', 'Vị trí trống bị từ chối, báo lỗi ở ô', await has(p, 'Nhập vị trí vết thương.'));
    await input(p, 'Vị trí mới').fill('Mắt cá trong chân phải');
    p.dialogs = []; await click(p, 'Lưu');
    const askMsg = p.dialogs.join(' ');
    rec('WD-04', 'Lưu cần xác nhận, nêu vị trí cũ và mới; Hủy không đổi', askMsg.includes(w.location) && askMsg.includes('Mắt cá trong chân phải') && (await store(p)).wounds.find((x) => x.id === w.id).location === w.location, askMsg.slice(0, 140));
    p.accept = true; await click(p, 'Lưu'); await p.waitForTimeout(800); p.accept = false;
    const d1 = await store(p); const w1 = d1.wounds.find((x) => x.id === w.id);
    rec('WD-05', 'Vị trí đổi, giữ woundId, mã vết, patientId, ngày bắt đầu, trạng thái; không tạo vết mới', w1.location === 'Mắt cá trong chân phải' && w1.code === w.code && w1.patientId === w.patientId && w1.startDate === w.startDate && w1.status === w.status && d1.wounds.length === d0.wounds.length);
    rec('WD-06', 'Ảnh (tên tệp, diện tích), đánh giá, đợt, phiên của vết không đổi', clinical(d1, 'p-1') === clin0);
    rec('WD-07', 'Về B05, B05 hiện vị trí mới', p.url().includes(`/wounds/${w.id}`) && await has(p, 'Mắt cá trong chân phải'), p.url());
    // Đánh dấu đã lành: xác nhận, Hủy không đổi; đồng ý ghi lần 1 theo quy trình hiện có.
    p.dialogs = []; await click(p, 'Đánh dấu đã lành');
    const hm = p.dialogs.join(' ');
    rec('WD-08', 'Hộp xác nhận "Đánh dấu đã lành" giải thích đổi trạng thái và lần 2 sau 14 ngày; Hủy không đổi', hm.includes('Đánh dấu đã lành') && hm.includes('lần 2') && hm.includes('14 ngày') && (await store(p)).wounds.find((x) => x.id === w.id).status === 'active', hm.slice(0, 160));
    p.accept = true; await click(p, 'Đánh dấu đã lành'); await p.waitForTimeout(800); p.accept = false;
    const d2 = await store(p); const w2 = d2.wounds.find((x) => x.id === w.id);
    const today = await p.evaluate(() => new Date(Date.now() + 420 * 60000).toISOString().slice(0, 10));
    rec('WD-09', 'Ghi lần 1: trạng thái "Chờ xác nhận liền", ngày lần 1 là hôm nay; vết không bị xóa', w2.status === 'awaiting_closure' && w2.closureCheck1 === today && d2.wounds.length === d0.wounds.length, `${w2.status} ${w2.closureCheck1}`);
    const imgsSame = JSON.stringify(d2.images.filter((i) => i.woundId === w.id)) === JSON.stringify(d1.images.filter((i) => i.woundId === w.id));
    rec('WD-10', 'Ảnh, số đo, đánh giá, phiên điều trị giữ nguyên sau khi đánh dấu', imgsSame && JSON.stringify(d2.evaluations) === JSON.stringify(d1.evaluations) && d2.sessions.length === d1.sessions.length);
    rec('WD-11', 'B05 hiện rõ trạng thái mới và nút xác nhận lần 2 (chưa bấm được trước 14 ngày)', await has(p, 'Chờ xác nhận liền') && await has(p, 'Xác nhận đã liền (lần 2)'));
    const early = await callStore(p, 'recordClosure', w.id, 'confirm');
    rec('WD-12', 'Không bỏ qua mốc 14 ngày (store từ chối xác nhận lần 2 sớm)', !early.ok && (await store(p)).wounds.find((x) => x.id === w.id).status === 'awaiting_closure', early.error);
    const otherStatuses = JSON.stringify((await store(p)).wounds.filter((x) => x.id !== w.id).map((x) => [x.id, x.status]));
    rec('WD-13', 'Không tự suy ra đã lành: các vết khác giữ nguyên trạng thái sau khi mở các màn', otherStatuses === JSON.stringify(JSON.parse(statuses0).filter((x) => x[0] !== w.id)));
    rec('WD-14', 'Không lỗi trang', p.errors.length === 0, p.errors.join(' / '));
  }

  // ===== D. Khổ màn 320, 360, 390, 768: không tràn ngang, nút chính thấy được =====
  {
    for (const [wd, h] of [[320, 640], [360, 740], [390, 844], [768, 1024]]) {
      const p = await newPage(wd, h); await login(p, 'bacsi');
      const out = [];
      for (const [name, url] of [['b04', '/patients/p-1'], ['b04a-sua-ho-so', '/patient-edit/p-1'], ['b05', '/wounds/w-1'], ['b05a-sua-vi-tri', '/wound-edit/w-1'], ['b02', '/doctor/patients']]) {
        await go(p, url);
        const ov = await overflow(p);
        out.push(`${name}:${ov <= 0 ? 'ok' : `tràn ${ov}px`}`);
        await shot(p, `${name}-${wd}`);
      }
      // Chân màn sửa hồ sơ: hai nút trọn trong màn đầu.
      await go(p, '/patient-edit/p-1');
      const bb = await p.getByText('Lưu', { exact: true }).locator('visible=true').last().boundingBox();
      rec(`RS-${wd}`, `Khổ ${wd}px: không tràn ngang; nút "Lưu" trong màn đầu`, out.every((x) => x.endsWith('ok')) && !!bb && bb.y + bb.height <= h, `${out.join(', ')}; nút đáy ${bb ? Math.round(bb.y + bb.height) : '—'}/${h}`);
      await p.context().close();
    }
  }

  await b.close();
  fs.writeFileSync(path.join(OUT, 'ket-qua-quan-ly-ho-so.json'), JSON.stringify(results, null, 2));
  const fail = results.filter((r) => r.result === 'LỖI').length;
  console.log(`Tổng ${results.length} ca: ${results.length - fail} đạt, ${fail} lỗi`);
  process.exit(fail ? 1 : 0);
})();
