// Kiểm thử giao diện theo tác vụ, giai đoạn 3: B10 chụp ảnh chia bước và B11 chế độ đo. Bản web, Playwright, mock test.
// Chạy: node scripts/kiem-thu-tb-3.cjs <baseURL> <thư mục kết quả>
// Camera giả: Chromium với --use-fake-device-for-media-stream. Không có quyền: ngữ cảnh không cấp quyền camera.
// Không có camera: getUserMedia trả NotFoundError. Hộp xác nhận trên web là window.confirm.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8502';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const PHOTO = path.join(__dirname, '..', 'assets', 'demo', 'demo_1.png');
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
  const bCam = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const newPage = async ({ w = 390, h = 844, browser = b, camera = false, noDevice = false } = {}) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN', permissions: camera ? ['camera'] : [] });
    if (noDevice) await ctx.addInitScript(() => { const md = navigator.mediaDevices; if (md) { md.getUserMedia = () => Promise.reject(new DOMException('Requested device not found', 'NotFoundError')); md.enumerateDevices = () => Promise.resolve([]); } });
    const p = await ctx.newPage();
    p.dialogs = []; p.errors = []; p.answer = true;
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().replace(/\n+/g, ' | ')}`); if (d.type() === 'alert' || p.answer) d.accept(); else d.dismiss(); });
    p.on('pageerror', (e) => p.errors.push(e.message));
    return p;
  };
  const login = async (p, user = 'bacsi') => {
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1500); };
  const has = async (p, t, exact = true) => (await p.getByText(t, { exact }).count()) > 0;
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const images = async (p, woundId) => ((await store(p)).images || []).filter((i) => i.woundId === woundId);
  const btn = (p, name) => p.getByRole('button', { name, exact: typeof name === 'string' });
  const click = async (loc, t = 400) => { await loc.click(); await loc.page().waitForTimeout(t); };
  // Tiêu đề màn: dòng đầu của khối chữ ngay sau nút "Quay lại" trên đầu màn.
  const title = async (p) => ((await p.locator('[aria-label="Quay lại"]:visible').first().locator('xpath=following-sibling::*[1]').innerText()).split('\n')[0] || '').trim();
  const footerIn = (p) => p.evaluate(() => { const f = document.querySelector('[data-testid="screen-footer"]'); if (!f) return false; const r = f.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; });
  const inFooter = (p, name) => p.locator('[data-testid="screen-footer"]').getByRole('button', { name, exact: typeof name === 'string' });
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900); };
  const pick = async (p, file = PHOTO) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), btn(p, 'Chọn ảnh có sẵn').click()]); await fc.setFiles(file); await p.waitForTimeout(3000); };
  // Bấm 3 lần liền vào cùng toạ độ nút (nút đổi sang trạng thái đang lưu sau lần đầu nên không chờ nút ổn định).
  const tripleTap = async (loc) => { const r = await loc.boundingBox(); const x = r.x + r.width / 2, y = r.y + r.height / 2; const pg = loc.page(); await pg.mouse.click(x, y); await pg.mouse.click(x, y); await pg.mouse.click(x, y); };
  const radio = (p, name) => p.getByRole('radio', { name, exact: true }).first();
  const checked = async (p, name) => (await radio(p, name).evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(11, 107, 111)';
  const areaBox = (p) => p.getByLabel('Diện tích bác sĩ đo (cm²)').first();

  // Ảnh tối để kiểm báo chất lượng (tạo tại chỗ, không thêm tệp vào kho).
  const DARK = path.join(OUT, 'anh-toi-tb3.png');
  { const p = await (await b.newContext({ viewport: { width: 640, height: 480 } })).newPage(); await p.setContent('<body style="margin:0;background:#060606"><div style="position:absolute;left:260px;top:180px;width:120px;height:90px;background:#1a0505;border-radius:40px"></div></body>'); await p.screenshot({ path: DARK }); await p.context().close(); }

  // TB3-01..03: quyền camera, không có camera, chụp bằng camera.
  {
    const p = await newPage(); await login(p); await go(p, '/guided-capture?woundId=w-1');
    const t = await title(p);
    const ctxOk = await has(p, 'VT01', false) && (await p.getByText(/BN\d+/).count()) > 0;
    rec('TB3-01', 'Mở B10: tiêu đề "Chụp vết thương", hiện bệnh nhân và vết thương, thanh tiến độ 3 bước (bước 1 Chụp), "Mở camera" và "Chọn ảnh có sẵn" ở chân màn trong khung nhìn',
      t === 'Chụp vết thương' && ctxOk && (await p.getByRole('progressbar', { name: 'Bước 1 trên 3: Chụp' }).count()) === 1 && await inFooter(p, 'Mở camera').isVisible() && await inFooter(p, 'Chọn ảnh có sẵn').isVisible() && await footerIn(p), `tiêu đề "${t}", ngữ cảnh ${ctxOk}`);
    await click(inFooter(p, 'Mở camera'), 2500);
    const msg = (await p.getByRole('alert').allInnerTexts()).join(' | ');
    rec('TB3-02', 'Không cấp quyền camera: báo "Chưa có quyền camera…", không mở khung camera, vẫn chọn được ảnh có sẵn',
      msg.includes('Chưa có quyền camera') && (await p.locator('video').count()) === 0 && await inFooter(p, 'Chọn ảnh có sẵn').isEnabled(), msg);
    await p.context().close();
  }
  {
    const p = await newPage({ camera: true, noDevice: true }); await login(p); await go(p, '/guided-capture?woundId=w-1');
    await click(inFooter(p, 'Mở camera'), 3000);
    const msg = (await p.getByRole('alert').allInnerTexts()).join(' | ');
    rec('TB3-03', 'Máy không có camera: báo "Không mở được camera…", nút trở lại "Mở camera", chọn ảnh có sẵn vẫn dùng được',
      /Không mở được camera|Chưa mở được camera/.test(msg) && await inFooter(p, 'Mở camera').isVisible() && await inFooter(p, 'Chọn ảnh có sẵn').isEnabled(), msg);
    await p.context().close();
  }
  {
    const p = await newPage({ browser: bCam, camera: true }); await login(p); await go(p, '/guided-capture?woundId=w-1');
    await click(inFooter(p, 'Mở camera'), 3500);
    const liveOk = (await p.locator('video').count()) === 1 && await inFooter(p, /Chụp ảnh|Chờ đạt yêu cầu/).isVisible() && await footerIn(p);
    const override = btn(p, 'Vẫn chụp (bỏ qua kiểm tra)');
    if (await override.count()) await click(override, 3500); else await click(inFooter(p, 'Chụp ảnh'), 3500);
    const t = await title(p);
    const ok = t === 'Kiểm tra ảnh' && await has(p, 'Ảnh chưa lưu') && await has(p, 'Đã xem ảnh: rõ nét, đủ sáng, thấy toàn bộ vết thương') && (await p.locator('video').count()) === 0;
    rec('TB3-04', 'Chụp bằng camera (camera giả): khung camera mở, nút chụp ở chân màn; chụp xong sang "Kiểm tra ảnh", có chip "Ảnh chưa lưu", chưa tạo bản ghi',
      liveOk && ok && (await images(p, 'w-1')).filter((i) => i.source === 'doctor').length === 0, `camera ${liveOk}, tiêu đề "${t}"`);
    await p.context().close();
  }

  // TB3-05..11: chọn ảnh, kiểm tra ảnh, chụp lại, nhập số đo, lùi tiến giữ dữ liệu, QĐ-1, lưu một lần.
  {
    const p = await newPage(); await login(p); await go(p, '/guided-capture?woundId=w-1');
    const before = (await images(p, 'w-1')).length;
    await pick(p);
    const t2 = await title(p);
    rec('TB3-05', 'Chọn ảnh có sẵn: sang bước 2 "Kiểm tra ảnh", thẻ chất lượng ảnh hiện, chân màn có "Chụp / chọn lại" và "Tiếp: nhập số đo"',
      t2 === 'Kiểm tra ảnh' && await has(p, 'Ảnh chưa lưu') && await inFooter(p, 'Chụp / chọn lại').isVisible() && await inFooter(p, 'Tiếp: nhập số đo').isVisible() && await footerIn(p), `tiêu đề "${t2}"`);

    // Chụp lại: hỏi, chọn "Ở lại" giữ ảnh; đồng ý thì về bước 1.
    p.answer = false; p.dialogs = [];
    await click(inFooter(p, 'Chụp / chọn lại'));
    const keep = (await title(p)) === 'Kiểm tra ảnh';
    const asked = p.dialogs.some((d) => d.includes('Bỏ ảnh vừa chụp?'));
    p.answer = true;
    await click(inFooter(p, 'Chụp / chọn lại'), 800);
    const reset = (await title(p)) === 'Chụp vết thương' && !(await has(p, 'Ảnh chưa lưu')) && await inFooter(p, 'Mở camera').isVisible();
    rec('TB3-06', 'Chụp lại: hỏi "Bỏ ảnh vừa chụp?"; "Ở lại" giữ ảnh, đồng ý thì về bước "Chụp", không tạo bản ghi', asked && keep && reset && (await images(p, 'w-1')).length === before, `hỏi ${asked}, giữ ${keep}, về bước 1 ${reset}`);

    // Ảnh tối: thẻ chất lượng báo vấn đề, vẫn sang được bước nhập (như trước: cảnh báo, không chặn).
    await pick(p, DARK);
    const qText = (await p.locator('body').innerText());
    const darkFlag = /tối|thiếu sáng|chưa đạt|Chưa đạt|Cần chụp lại|kém/i.test(qText);
    await click(inFooter(p, 'Tiếp: nhập số đo'), 600);
    rec('TB3-07', 'Ảnh không đạt chất lượng (ảnh tối): thẻ chất lượng báo vấn đề; "Tiếp: nhập số đo" vẫn mở như trước (cảnh báo, không chặn)', darkFlag && (await title(p)) === 'Nhập số đo', `báo ${darkFlag}`);
    await click(inFooter(p, 'Bước trước'));
    p.answer = true; await click(inFooter(p, 'Chụp / chọn lại'), 800);

    await pick(p);
    await click(p.getByText('Đã xem ảnh: rõ nét, đủ sáng, thấy toàn bộ vết thương', { exact: true }));
    await click(inFooter(p, 'Tiếp: nhập số đo'), 600);
    const t3 = await title(p);
    const empty = (await areaBox(p).inputValue()) === '';
    const noPreselect = !(await Promise.all(['Thước đo trên vết thương', 'Phần mềm đo trên ảnh'].map(async (m) => (await radio(p, m).count()) ? checked(p, m) : false))).some(Boolean);
    const noUse = (await p.getByText(/Dùng số này|Dùng giá trị này|Use this value/).count()) === 0;
    rec('TB3-08', 'Bước 3 "Nhập số đo": QĐ-1 ô diện tích trống, phương pháp không chọn sẵn, không có nút "Dùng số này"; nút lưu ở chân màn ghi "Lưu ảnh (chưa có số đo)"',
      t3 === 'Nhập số đo' && empty && noPreselect && noUse && await inFooter(p, 'Lưu ảnh (chưa có số đo)').isVisible() && await footerIn(p), `tiêu đề "${t3}", trống ${empty}, không chọn sẵn ${noPreselect}, không nút dùng số ${noUse}`);

    await areaBox(p).fill('7,4');
    const methods = await p.getByRole('radio').allInnerTexts();
    await click(radio(p, methods[0].trim()));
    await click(inFooter(p, 'Bước trước'), 600);
    const backOk = (await title(p)) === 'Kiểm tra ảnh' && await has(p, 'Ảnh chưa lưu');
    await click(inFooter(p, 'Tiếp: nhập số đo'), 600);
    const kept = (await areaBox(p).inputValue()) === '7,4' && await checked(p, methods[0].trim()) && await has(p, 'Đã xem ảnh');
    const progress = (await p.getByRole('progressbar', { name: 'Bước 3 trên 3: Nhập số đo' }).count()) === 1;
    rec('TB3-09', '"Bước trước" rồi "Tiếp: nhập số đo" giữ ảnh, ô "Đã xem ảnh", số đã gõ và phương pháp; thanh tiến độ báo bước 3 trên 3',
      backOk && kept && progress, `lùi ${backOk}, giữ ${kept}, tiến độ ${progress}`);

    // Rời màn khi chưa lưu: hỏi; "Ở lại" giữ nguyên.
    p.answer = false; p.dialogs = [];
    await back(p);
    const guard = p.dialogs.some((d) => d.includes('Bỏ dữ liệu chưa lưu?')) && (await title(p)) === 'Nhập số đo' && (await areaBox(p).inputValue()) === '7,4';
    p.answer = true;
    rec('TB3-10', 'Nút quay lại khi ảnh chưa lưu: hỏi "Bỏ dữ liệu chưa lưu?"; "Ở lại" giữ bước 3 và số đã gõ', guard, p.dialogs.join(' | '));

    // Bấm lưu 3 lần liền: chỉ một ảnh, có số đo bác sĩ, sang B11.
    const save = inFooter(p, 'Lưu ảnh và số đo bác sĩ');
    await tripleTap(save);
    await p.waitForTimeout(2500);
    const after = await images(p, 'w-1');
    const added = after.filter((i) => !i.demo && i.source === 'doctor');
    const last = added[added.length - 1];
    rec('TB3-11', 'Bấm lưu 3 lần liền: thêm đúng 1 ảnh, diện tích 7,4 cm² do bác sĩ nhập, số tham chiếu là số bác sĩ xác nhận, ước lượng tự động giữ riêng; mở B11 của ảnh vừa lưu',
      after.length === before + 1 && last?.areaCm2 === 7.4 && last?.capture?.manualReference?.areaCm2 === 7.4 && !!last?.capture?.manualReference?.confirmedBy && last?.capture?.automaticMeasurement?.status !== 'confirmed' && p.url().includes('/images/' + last?.id),
      `trước ${before}, sau ${after.length}, diện tích ${last?.areaCm2}, url ${p.url().replace(BASE, '')}`);
    rec('TB3-11b', 'Không lỗi JS ở luồng B10', p.errors.length === 0, p.errors.join(' | '));
    await p.context().close();
  }

  // TB3-12..17: B11 chế độ đo.
  {
    const p = await newPage(); await login(p); await go(p, '/images/IMG0004');
    const st = await store(p); const im4 = (st.images || []).find((i) => i.id === 'IMG0004');
    const t = await title(p);
    const hidden = (await p.getByTestId('anh-cung-vet').count()) === 0 && !(await has(p, 'So sánh với ảnh khác')) && (await p.getByRole('button', { name: 'Ghi đánh giá với ảnh này' }).count()) === 0;
    const footerOk = await inFooter(p, 'Hủy').isVisible() && await inFooter(p, 'Lưu diện tích').isVisible() && !(await inFooter(p, 'Lưu diện tích').isEnabled()) && await footerIn(p);
    rec('TB3-12', 'B11 ảnh chưa đo: mở thẳng chế độ đo "Đo ảnh IMG0004", chip "Đang nhập, chưa lưu", ẩn liên kết ảnh cùng vết, so sánh và mục phụ; Hủy và Lưu ở chân màn (Lưu khóa khi chưa nhập)',
      im4?.areaCm2 === null && t === 'Đo ảnh IMG0004' && await has(p, 'Đang nhập, chưa lưu') && hidden && footerOk, `tiêu đề "${t}", ẩn ${hidden}, chân màn ${footerOk}`);
    const noUse = (await p.getByText(/Dùng số này|Dùng giá trị này|Use this value/).count()) === 0;
    const areaInput = p.getByLabel('Diện tích bác sĩ đã đo').first();
    rec('TB3-13', 'B11 QĐ-1: ô diện tích trống khi mở, không có nút "Dùng số này"', (await areaInput.inputValue()) === '' && noUse);

    // Hủy: thoát chế độ đo, không ghi gì.
    await areaInput.fill('5,5'); await p.waitForTimeout(300);
    const hist0 = JSON.stringify((await store(p)).images.find((i) => i.id === 'IMG0004'));
    await click(inFooter(p, 'Hủy'), 600);
    const im4b = (await store(p)).images.find((i) => i.id === 'IMG0004');
    rec('TB3-14', 'B11 Hủy: rời chế độ đo, chân màn ẩn, liên kết điều hướng hiện lại; ảnh không đổi (chưa có số đo)',
      im4b.areaCm2 === null && JSON.stringify(im4b) === hist0 && (await p.locator('[data-testid="screen-footer"]').count()) === 0 && (await p.getByTestId('anh-cung-vet').count()) === 1 && (await title(p)) === 'Ảnh IMG0004');
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p); await go(p, '/images/IMG0004');
    const areaInput = p.getByLabel('Diện tích bác sĩ đã đo').first();
    await areaInput.fill('6,2'); await p.waitForTimeout(300);
    p.answer = false; p.dialogs = [];
    await back(p);
    const guard = p.dialogs.some((d) => d.includes('Bỏ dữ liệu chưa lưu?')) && (await areaInput.inputValue()) === '6,2';
    p.answer = true;
    rec('TB3-15', 'B11 đang nhập rồi bấm quay lại: hỏi "Bỏ dữ liệu chưa lưu?"; "Ở lại" giữ số đã gõ', guard, p.dialogs.join(' | '));
    const opts = await p.getByRole('radio').allInnerTexts();
    if (opts.length) await click(radio(p, opts[0].trim()));
    const save = inFooter(p, 'Lưu diện tích');
    await tripleTap(save);
    await p.waitForTimeout(1800);
    const im = (await store(p)).images.find((i) => i.id === 'IMG0004');
    const hist = (im.areaHistory || []).length;
    const notice = await has(p, 'Đã lưu diện tích 6,2 cm² cho ảnh IMG0004.');
    rec('TB3-16', 'B11 lưu (bấm 3 lần): diện tích 6,2 cm², đúng một lần ghi; báo xanh "Đã lưu diện tích…", rời chế độ đo',
      im.areaCm2 === 6.2 && hist <= 1 && notice && (await p.locator('[data-testid="screen-footer"]').count()) === 0, `diện tích ${im.areaCm2}, lịch sử ${hist}, báo ${notice}, dialogs ${p.dialogs.join(' | ')}`);
    rec('TB3-16b', 'Không lỗi JS ở B11', p.errors.length === 0, p.errors.join(' | '));
    await p.context().close();
  }
  {
    // Ảnh đã đo: xem trước, "Sửa số đo" vào chế độ đo, Hủy giữ số cũ.
    const p = await newPage(); await login(p); await go(p, '/images/IMG0003');
    const im3 = (await store(p)).images.find((i) => i.id === 'IMG0003');
    const viewOk = (await title(p)) === 'Ảnh IMG0003' && (await p.getByTestId('anh-cung-vet').count()) === 1 && (await p.locator('[data-testid="screen-footer"]').count()) === 0;
    await click(p.getByRole('button', { name: /Sửa số đo/ }).first(), 600);
    const editTitle = (await title(p)) === 'Đo ảnh IMG0003';
    await p.getByLabel('Diện tích bác sĩ đã đo').first().fill('9,9'); await p.waitForTimeout(300);
    const editOk = editTitle && await inFooter(p, 'Lưu số mới').isVisible();
    await click(inFooter(p, 'Hủy'), 600);
    const im3b = (await store(p)).images.find((i) => i.id === 'IMG0003');
    rec('TB3-17', 'B11 ảnh đã đo: chế độ xem không có chân màn; "Sửa số đo" vào chế độ đo, gõ số khác thì nút đổi thành "Lưu số mới"; Hủy giữ số cũ, không thêm lịch sử',
      viewOk && editOk && im3b.areaCm2 === im3.areaCm2 && (im3b.areaHistory || []).length === (im3.areaHistory || []).length, `xem ${viewOk}, sửa ${editOk}, số ${im3.areaCm2} → ${im3b.areaCm2}`);
    await p.context().close();
  }

  // TB3-18: 4 cỡ màn, nút chính luôn trong khung nhìn, không tràn ngang.
  {
    const rows = [];
    for (const [w, h] of [[320, 640], [360, 740], [390, 844], [768, 1024]]) {
      const p = await newPage({ w, h }); await login(p);
      await go(p, '/guided-capture?woundId=w-1'); const a = (await footerIn(p)) && (await overflow(p)) === 0;
      await pick(p); const c = (await footerIn(p)) && (await overflow(p)) === 0;
      await click(inFooter(p, 'Tiếp: nhập số đo'), 600); const d = (await footerIn(p)) && (await overflow(p)) === 0;
      await go(p, '/images/IMG0004'); const e = (await footerIn(p)) && (await overflow(p)) === 0;
      rows.push(`${w}: chụp ${a}, kiểm tra ${c}, nhập ${d}, B11 đo ${e}${p.errors.length ? ' lỗi JS' : ''}`);
      if (!(a && c && d && e) || p.errors.length) rows.push('LỖI');
      await p.context().close();
    }
    rec('TB3-18', 'Ở 320, 360, 390, 768 px: chân màn trong khung nhìn ở cả 3 bước B10 và chế độ đo B11, không tràn ngang, không lỗi JS', !rows.includes('LỖI'), rows.join(' ; '));
  }

  fs.writeFileSync(path.join(OUT, 'ket-qua-tb-3.json'), JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.result === 'ĐẠT').length;
  console.log(`\nTổng: ${pass}/${results.length} đạt`);
  await b.close(); await bCam.close();
  process.exit(pass === results.length ? 0 : 1);
})();
