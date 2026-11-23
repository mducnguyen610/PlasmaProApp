// Giai đoạn B, CN2 (chụp ảnh và gán nhãn): kiểm thử bản web với dữ liệu mô phỏng, Playwright.
// Gồm: gán nhãn theo ảnh (loại ảnh, viền kéo điểm, 5 tính chất, tin cậy, chất lượng), xác nhận, bỏ xác nhận khi sửa, lịch sử,
// tab Ảnh lọc "Chưa gán đủ nhãn", chụp theo bệnh nhân (bỏ ảnh chờ), đồng ý dữ liệu khi kích hoạt, tập huấn luyện của quản trị,
// ảnh sau điều trị bệnh nhân gửi, phân quyền ở tầng store, dữ liệu còn sau tải lại và đăng xuất.
// Không thay cho thử trên máy thật hay thử với bác sĩ. Chạy: node scripts/kiem-thu-gd-b-cn2.cjs <baseURL> <thư mục kết quả>
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
    p.dialogs = []; p.errors = []; p.accept = true;
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
  const radio = (p, name) => p.getByRole('radio', { name, exact: true }).locator('visible=true').first();
  const btn = (p, name) => p.getByRole('button', { name, exact: true }).locator('visible=true').last();
  const callStore = async (p, fn, ...args) => {
    const res = await p.evaluate(async ({ fn, args }) => {
      let v = null;
      for (const el of document.querySelectorAll('*')) {
        const k = Object.keys(el).find((x) => x.startsWith('__reactFiber'));
        if (!k) continue;
        let f = el[k];
        while (f) { const val = f.memoizedProps && f.memoizedProps.value; if (val && typeof val.saveImageLabel === 'function') { v = val; break; } f = f.return; }
        if (v) break;
      }
      if (!v) return { noStore: true };
      try { const r = await v[fn](...args); return { ok: true, r: r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    }, { fn, args });
    if (res.noStore) throw new Error(`Không tìm thấy store khi gọi ${fn}`);
    await p.waitForTimeout(300);
    return res;
  };
  const img = (d, id) => d.images.find((i) => i.id === id);

  // ---------- Bác sĩ gán nhãn ảnh IMG0004 (chưa đo, chưa nhãn) ----------
  {
    const p = await newPage(); await login(p, 'bacsi');
    const before = img(await store(p), 'IMG0004');
    await go(p, '/images/IMG0004');
    // Ảnh chưa đo mở sẵn biểu mẫu đo: hủy để thấy thẻ gán nhãn.
    if (await has(p, 'Hủy')) { await btn(p, 'Hủy').click(); await p.waitForTimeout(500); }
    const card = p.getByTestId('the-gan-nhan');
    rec('CN2-01', 'B11 có thẻ "Nhãn ảnh", trạng thái Chưa gán nhãn, nút Xác nhận khóa', await card.count() === 1 && await has(p, 'Chưa gán nhãn') && await btn(p, 'Xác nhận nhãn').isDisabled());
    await radio(p, 'Ảnh theo dõi trong điều trị').click();
    const hasAi = await has(p, 'Dùng viền AI');
    await btn(p, hasAi ? 'Dùng viền AI' : 'Khoanh từ viền mặc định').click(); await p.waitForTimeout(500);
    const handles = p.getByLabel(/^Điểm viền \d+$/);
    const nh = await handles.count();
    // Kéo điểm 1 sang phải 30 px.
    const box = await handles.first().boundingBox();
    await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down();
    await p.mouse.move(box.x + box.width / 2 + 15, box.y + box.height / 2, { steps: 4 }); await p.mouse.move(box.x + box.width / 2 + 30, box.y + box.height / 2, { steps: 4 }); await p.mouse.up();
    await p.waitForTimeout(300);
    const box2 = await handles.first().boundingBox();
    rec('CN2-02', 'Vùng vết: có điểm kéo được trên ảnh (XN-08)', nh >= 3 && box2.x > box.x + 15, `${nh} điểm, dời ${Math.round(box2.x - box.x)} px`);
    for (const t of ['Mô hạt', 'Mô hoại tử', 'Dịch tiết', 'Da quanh vết', 'Dấu hiệu nhiễm khuẩn']) await radio(p, `${t}: ${t === 'Mô hạt' ? 'Trung bình' : 'Không có'}`).click();
    await p.getByLabel('Ghi chú dịch tiết').fill('dịch trong');
    rec('CN2-03', 'Thang 4 mức "Không có, Thấp, Trung bình, Cao" (XN-15)', await radio(p, 'Mô hạt: Thấp').count() === 1 && await radio(p, 'Mô hạt: Cao').count() === 1);
    const lockedNoConfidence = await btn(p, 'Xác nhận nhãn').isDisabled();
    await radio(p, 'Chắc chắn').click();
    await radio(p, 'Không đạt').click(); await p.waitForTimeout(200);
    const failHint = await has(p, 'Ảnh Không đạt không vào tập huấn luyện và không xác nhận được. Nên yêu cầu chụp lại.') && await btn(p, 'Yêu cầu chụp lại').count() === 1;
    const lockedFail = await btn(p, 'Xác nhận nhãn').isDisabled();
    await radio(p, 'Đạt').click(); await p.waitForTimeout(200);
    rec('CN2-04', 'Chưa chọn tin cậy hoặc chất lượng Không đạt thì khóa Xác nhận; Không đạt gợi ý chụp lại (K1, K2, XN-14)', lockedNoConfidence && lockedFail && failHint);
    await btn(p, 'Lưu nhãn').click(); await p.waitForTimeout(800);
    let d = await store(p); let im = img(d, 'IMG0004');
    rec('CN2-05', 'Lưu nhãn: đủ 5 tính chất, viền, loại ảnh; trạng thái Đủ nhãn; ảnh gốc và AI gốc không đổi (N4, N5)',
      im.label?.imageType === 'follow_up' && im.label.outline.length >= 3 && im.label.traits.exudate.note === 'dịch trong' && !im.label.confirmedAt
      && im.uri === before.uri && JSON.stringify(im.capture ?? null) === JSON.stringify(before.capture ?? null) && await has(p, 'Đủ nhãn'),
      `${im.label?.outlineSource}, ${im.labelHistory?.length} dòng lịch sử`);
    await btn(p, 'Xác nhận nhãn').click(); await p.waitForTimeout(900);
    d = await store(p); im = img(d, 'IMG0004');
    rec('CN2-06', 'Xác nhận nhãn: có người, thời điểm xác nhận; hộp xác nhận nhắc kiểm tra thông tin nhận dạng', !!im.label.confirmedAt && im.label.confirmedBy === 'u-bs1' && p.dialogs.some((x) => x.includes('thông tin nhận dạng')));
    // Sửa sau xác nhận → về Đang gán
    await radio(p, 'Dịch tiết: Cao').click(); await btn(p, 'Lưu nhãn').click(); await p.waitForTimeout(900);
    d = await store(p); im = img(d, 'IMG0004');
    rec('CN2-07', 'Sửa nhãn đã xác nhận thì bỏ xác nhận, ghi lịch sử "Bỏ xác nhận" (N6)', !im.label.confirmedAt && im.labelHistory.some((h) => h.action === 'unconfirm'), im.labelHistory.map((h) => h.action).join(','));
    // Tải lại và đăng xuất: dữ liệu còn
    await p.reload(); await p.waitForTimeout(1500);
    if (await has(p, 'Hủy')) { await btn(p, 'Hủy').click(); await p.waitForTimeout(500); }
    const kept = img(await store(p), 'IMG0004').label?.traits?.exudate?.level === 'high';
    await btn(p, 'Xác nhận nhãn').click(); await p.waitForTimeout(900);
    rec('CN2-08', 'Nhãn còn sau tải lại; xác nhận lại được', kept && !!img(await store(p), 'IMG0004').label.confirmedAt);
    rec('CN2-09', 'Không lỗi JS ở B11', p.errors.length === 0, p.errors.join(' | '));

    // Tab Ảnh
    await go(p, '/doctor/dataset');
    const needs = await p.getByRole('radio', { name: /^Chưa gán đủ nhãn \(\d+\)$/ }).count();
    const dsBefore = await store(p);
    const mine = new Set(dsBefore.patients.filter((x) => x.doctorId === 'u-bs1' && !x.archivedAt).map((x) => x.id));
    const expectNeeds = dsBefore.images.filter((i) => mine.has(i.patientId) && i.status !== 'excluded' && !(i.label?.quality === 'fail') && !i.label?.confirmedAt
      && !(i.label?.imageType && (i.label?.outline?.length ?? 0) >= 3 && ['granulation', 'necrosis', 'exudate', 'periwound', 'infection'].every((k) => i.label?.traits?.[k]?.level))).length;
    const label = await p.getByRole('radio', { name: /^Chưa gán đủ nhãn/ }).first().textContent();
    rec('CN2-10', 'Tab Ảnh: lọc "Chưa gán đủ nhãn" mặc định, số đếm đúng (T1)', needs === 1 && label.includes(`(${expectNeeds})`), label);
    await p.getByText('Bộ lọc', { exact: true }).first().click(); await p.waitForTimeout(300);
    rec('CN2-11', 'Bộ lọc thời gian có 7, 30, 90 ngày, Tất cả, Tùy chọn', await radio(p, '90 ngày').count() === 1 && await radio(p, 'Tùy chọn').count() === 1);
    await radio(p, 'Tùy chọn').click(); await p.getByLabel('Chụp từ ngày').fill('31/02/2026'); await p.waitForTimeout(300);
    rec('CN2-12', 'Ngày tùy chọn không có thật thì báo lỗi', await has(p, 'Ngày không có thật.'));
    await p.context().close();
  }

  // ---------- Chụp theo bệnh nhân (A1), không còn ảnh chờ ----------
  {
    const p = await newPage(); await login(p, 'bacsi');
    await go(p, '/capture');
    const modes = await p.getByRole('tab', { name: 'Bệnh nhân có sẵn' }).count() === 1 && await p.getByRole('tab', { name: 'Bệnh nhân mới' }).count() === 1;
    await p.getByPlaceholder('Tìm theo mã bệnh nhân, ví dụ BN001').fill('Nguyễn'); await p.waitForTimeout(300);
    const byName = await has(p, 'Không có mã bệnh nhân phù hợp. Chỉ tìm theo mã hồ sơ.');
    await p.getByPlaceholder('Tìm theo mã bệnh nhân, ví dụ BN001').fill('002'); await p.waitForTimeout(300);
    await p.getByRole('radio', { name: /BN002/ }).first().click(); await p.waitForTimeout(300);
    const n0 = (await store(p)).wounds.length;
    await p.getByLabel('Thêm vết thương mới').fill('Gót chân phải'); await btn(p, 'Thêm vết').click(); await p.waitForTimeout(900);
    const d = await store(p);
    const nw = d.wounds.find((w) => w.patientId === 'p-2' && w.location === 'Gót chân phải');
    rec('CN2-13', 'B09: hai lối Bệnh nhân có sẵn/mới; tìm theo mã, không theo tên; thêm vết ngay tại màn chụp (A1)', modes && byName && !!nw && d.wounds.length === n0 + 1 && !(await btn(p, 'Chụp có hướng dẫn').isDisabled()));
    await go(p, '/capture-new-patient');
    const gone = await has(p, 'Không tìm thấy', false) || (await p.locator('text=Ảnh chờ').count()) === 0;
    await go(p, '/capture'); await p.getByRole('tab', { name: 'Bệnh nhân mới' }).click(); await p.waitForTimeout(300);
    await btn(p, 'Tạo hồ sơ bệnh nhân mới').click(); await p.waitForTimeout(1200);
    const onNew = p.url().includes('/patients/new') && p.url().includes('chup=1');
    await p.getByLabel('Họ và tên').fill('Đỗ Văn Kiểm'); await p.getByLabel('Ngày sinh').fill('01021970'); await p.getByLabel('Số điện thoại').fill('0909000111');
    await btn(p, 'Lưu hồ sơ và tạo tài khoản').click(); await p.waitForTimeout(700);
    const needLoc = await has(p, 'Nhập vị trí vết thương để chụp ảnh cho vết này.');
    await p.getByLabel('Vị trí vết thương đầu tiên').fill('Mu bàn chân trái'); await btn(p, 'Lưu hồ sơ và tạo tài khoản').click(); await p.waitForTimeout(1500);
    const toCapture = await btn(p, 'Chụp ảnh VT01').count() === 1;
    const created = (await store(p)).patients.find((x) => x.name === 'Đỗ Văn Kiểm');
    rec('CN2-14', 'Bệnh nhân mới: tạo hồ sơ (bắt buộc vị trí vết) rồi mới chụp; không có ô bác sĩ tích đồng ý; hồ sơ mới chưa đồng ý (A1, N10)',
      onNew && needLoc && toCapture && created?.researchConsent === false && gone, `gone ${gone}`);
    await btn(p, 'Chụp ảnh VT01').click(); await p.waitForTimeout(1500);
    rec('CN2-15', 'Từ hồ sơ mới mở thẳng màn chụp của VT01', p.url().includes('/guided-capture') && await has(p, 'Đỗ Văn Kiểm', false));
    // Đồng ý trong hồ sơ: bác sĩ chỉ xem
    await go(p, `/patients/${created.id}`);
    await p.getByText('Thông tin hồ sơ', { exact: true }).first().click(); await p.waitForTimeout(300);
    const r = await callStore(p, 'updatePatient', created.id, { researchConsent: true });
    rec('CN2-16', 'Bác sĩ không bật đồng ý thay bệnh nhân (giao diện chỉ xem, store từ chối)', (await p.getByRole('switch').count()) === 0 && await has(p, 'Đồng ý dùng dữ liệu') && !r.ok, r.error);
    // Phân quyền ở store: bác sĩ khác
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'bacsi2');
    await go(p, '/images/IMG0002');
    const ro = await p.getByTestId('the-gan-nhan').count() === 1 && await btn(p, 'Lưu nhãn').count() === 0 && await btn(p, 'Xác nhận nhãn').count() === 0;
    const r1 = await callStore(p, 'saveImageLabel', 'IMG0002', { note: 'x' });
    const r2 = await callStore(p, 'confirmImageLabel', 'IMG0002');
    rec('CN2-17', 'Bác sĩ khác: xem nhãn, không sửa; store từ chối lưu và xác nhận', ro && !r1.ok && !r2.ok, `${r1.error} / ${r2.error}`);
    await p.context().close();
  }

  // ---------- Quản trị: tập huấn luyện ----------
  {
    const p = await newPage(); await login(p, 'quantri');
    await go(p, '/admin/dataset');
    const d = await store(p);
    const consent = new Set(d.patients.filter((x) => x.researchConsent).map((x) => x.id));
    const expected = d.images.filter((i) => consent.has(i.patientId) && i.label?.confirmedAt && i.label?.quality === 'pass' && i.status !== 'excluded').length;
    rec('CN2-18', 'Kho dữ liệu của quản trị đếm đúng ảnh đã xác nhận, Đạt, bệnh nhân đồng ý (N9, C1)', await has(p, `${expected} ảnh sẵn sàng`), `kỳ vọng ${expected}`);
    await p.getByText('Xem trước labels.csv', { exact: true }).click(); await p.waitForTimeout(300);
    const csvHead = await has(p, 'image_id,filename,subject_code', false);
    const noName = !(await has(p, 'Nguyễn Văn A', false)) && !(await has(p, 'BN001', false));
    rec('CN2-19', 'labels.csv có cột nhãn mới; không có họ tên, mã hồ sơ lâm sàng (P3)', csvHead && noName && await has(p, 'image_type', false));
    const dl = p.waitForEvent('download', { timeout: 20000 }).catch(() => null);
    await btn(p, `Tải bộ dữ liệu (${expected} ảnh)`).click();
    const file = await dl;
    let zipOk = false, detail = '';
    if (file) {
      const fp = path.join(OUT, 'dataset.zip'); await file.saveAs(fp);
      const JSZip = require('jszip');
      const z = await JSZip.loadAsync(fs.readFileSync(fp));
      const names = Object.keys(z.files);
      const labels = JSON.parse(await z.file('labels.json').async('string'));
      const raw = await z.file('labels.json').async('string') + await z.file('labels.csv').async('string');
      zipOk = names.filter((n) => n.startsWith('images/') && n.endsWith('.png')).length === expected && labels.length === expected
        && labels.every((x) => x.outline.length >= 3 && x.traits.granulation) && !raw.includes('Nguyễn') && !raw.includes('BN00') && !raw.includes('u-bs1');
      detail = `${names.length} tệp`;
    }
    rec('CN2-20', 'Tải ZIP: ảnh PNG, labels.csv, labels.json (viền, tính chất); không có định danh (S3, P3)', zipOk, detail);
    await p.context().close();
  }

  // ---------- Bệnh nhân: ảnh sau điều trị (A9), đồng ý dữ liệu ----------
  {
    const p = await newPage(); await login(p, 'benhnhan');
    const d = await store(p);
    const ses = d.sessions.filter((s) => s.deviceId === 'd-1').sort((a, b) => b.start.localeCompare(a.start))[0];
    await go(p, `/patient-photo?sessionId=${encodeURIComponent(ses.sessionId)}`);
    const screen = await has(p, 'Ảnh sau điều trị') && await btn(p, 'Chụp ảnh').count() === 1;
    const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const ok = await callStore(p, 'addImage', { woundId: ses.woundId ?? 'w-1', uri: png, ext: 'png', captureDate: ses.start.slice(0, 10), source: 'patient', sessionId: ses.sessionId });
    const other = await callStore(p, 'addImage', { woundId: 'w-2', uri: png, ext: 'png', captureDate: ses.start.slice(0, 10), source: 'patient', sessionId: ses.sessionId });
    const noSes = await callStore(p, 'addImage', { woundId: ses.woundId ?? 'w-1', uri: png, ext: 'png', captureDate: ses.start.slice(0, 10), source: 'patient', sessionId: 'khong-co' });
    const saved = ok.ok ? img(await store(p), ok.r.id) : null;
    rec('CN2-21', 'Bệnh nhân gửi ảnh sau phiên: gắn phiên, loại "Ảnh sau điều trị"; vết người khác hoặc phiên không có thì bị từ chối (A9)',
      screen && !!saved && saved.sessionId === ses.sessionId && saved.label?.imageType === 'post_session' && saved.source === 'patient' && !other.ok && !noSes.ok, `${other.error} / ${noSes.error}`);
    const r = await callStore(p, 'saveImageLabel', ok.r?.id, { note: 'x' });
    rec('CN2-22', 'Bệnh nhân không gán nhãn được', !r.ok);
    // Cùng trình duyệt (cùng bộ nhớ máy): đăng xuất rồi đăng nhập bác sĩ.
    await callStore(p, 'logout');
    const q = p; await login(q, 'bacsi');
    await go(q, `/images/${ok.r.id}`);
    if (await has(q, 'Hủy')) { await btn(q, 'Hủy').click(); await q.waitForTimeout(400); }
    // Choices trên web không xuất aria-checked: kiểm bằng dữ liệu đã lưu và việc không còn dòng "Gợi ý" loại ảnh (chỉ hiện khi chưa chọn).
    const lab = img(await store(q), ok.r.id).label;
    rec('CN2-23', 'Bác sĩ mở được ảnh bệnh nhân gửi, thẻ nhãn hiện với loại "Ảnh sau điều trị" đã chọn sẵn', await q.getByTestId('the-gan-nhan').count() === 1 && lab?.imageType === 'post_session' && !(await has(q, 'Gợi ý:', false)));
    await q.context().close();
  }
  {
    // Kích hoạt có ô đồng ý dữ liệu, không bắt buộc
    const p = await newPage(); await login(p, 'bacsi');
    const r = await callStore(p, 'addPatient', { name: 'Kích Hoạt Thử', birthDate: '1980-01-01', sex: 'Nam', phone: '0909111222', doctorId: 'u-bs1', researchConsent: false }, 'Cẳng tay');
    const code = r.r?.activation?.code, username = r.r?.activation?.username;
    await callStore(p, 'logout');
    const q = p; await go(q, '/activate');
    await q.getByLabel('Tên đăng nhập').fill(username); await q.getByLabel('Mã kích hoạt').fill(code);
    await q.getByLabel('Mật khẩu mới').fill('Matkhau@1'); await q.getByLabel('Nhập lại mật khẩu').fill('Matkhau@1');
    const cbs = q.getByRole('checkbox');
    await cbs.first().click();
    const box = q.getByTestId('dong-y-du-lieu');
    const optional = !(await btn(q, 'Kích hoạt và đăng nhập').isDisabled());
    await box.click(); await q.waitForTimeout(200);
    await btn(q, 'Kích hoạt và đăng nhập').click(); await q.waitForTimeout(1800);
    const pt = (await store(q)).patients.find((x) => x.id === r.r.patient.id);
    rec('CN2-24', 'Kích hoạt: ô đồng ý dữ liệu không bắt buộc; tích thì ghi đồng ý và ngày (N10)', !!code && optional && pt?.researchConsent === true && !!pt.consentDate, username);
    await q.context().close();
  }

  // ---------- Dọn ảnh chờ cũ (XN-10) ----------
  {
    const p = await newPage(); await login(p, 'bacsi');
    const held = { 'u-bs1': { id: 'CHO-1', doctorId: 'u-bs1', uri: 'data:image/png;base64,iVBORw0KGgo=', ext: 'png', captureDate: '2026-11-20', capture: { captureId: 'CAP-1' }, form: { name: 'Ảnh chờ cũ' } } };
    await p.evaluate((v) => localStorage.setItem('plasmapro.anh-cho-ho-so.v1', JSON.stringify(v)), held);
    const before = await p.evaluate(() => localStorage.getItem('plasmapro.demo.v2'));
    await p.reload(); await p.waitForTimeout(1800);
    const left = await p.evaluate(() => localStorage.getItem('plasmapro.anh-cho-ho-so.v1'));
    const after = JSON.parse(await p.evaluate(() => localStorage.getItem('plasmapro.demo.v2')));
    rec('CN2-25', 'Mở ứng dụng: bỏ ảnh chờ còn sót của bản cũ; dữ liệu chính giữ nguyên (XN-10)', left === null && after.images.length === JSON.parse(before).images.length && after.patients.length === JSON.parse(before).patients.length);
    await p.context().close();
  }

  await b.close();
  fs.writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.result === 'ĐẠT').length;
  console.log(`Tổng: ${results.length}, đạt ${pass}, lỗi ${results.length - pass}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
