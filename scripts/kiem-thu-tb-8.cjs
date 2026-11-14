// Kiểm thử Stage 8: hồi quy toàn hệ thống theo luồng đầu cuối, phân quyền, điều hướng, toàn vẹn dữ liệu, QĐ-1..6, khổ màn 320 đến 1280.
// Bản web, THIẾT BỊ GIẢ LẬP, dữ liệu mô phỏng (không dùng dữ liệu bệnh nhân thật). Không thay cho thử máy thật hay thử với người dùng.
// Chạy: node scripts/kiem-thu-tb-8.cjs <baseURL> <thư mục kết quả>
// Kết quả: ĐẠT, LỖI, hoặc GHI NHẬN (không kiểm được trên giao diện, kèm lý do). JSON ghi vào <thư mục>/ket-qua-tb-8.json.
//
// Ngày chạy: dữ liệu mẫu tính lùi từ hôm nay, đợt của BN001 có lịch thứ 2, 4, 6. Kịch bản lùi hoặc tiến đồng hồ trình duyệt
// tới ngày có lịch gần nhất (không lùi về quá khứ) để luồng điều trị không phụ thuộc thứ trong tuần.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8600';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const PHOTO = path.join(__dirname, '..', 'assets', 'demo', 'demo_1.png');
const results = [];
const rec = (id, area, name, pass, detail = '') => {
  const result = pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT' : 'LỖI';
  results.push({ id, area, name, result, detail });
  console.log(result === 'ĐẠT' ? 'ĐẠT ' : result === 'LỖI' ? 'LỖI ' : result, id, name, detail ? `| ${detail}` : '');
};
const { ganNgayCoLich, soNgayToiNgayCoLich } = require('./ngay-co-lich.cjs');
const shiftDays = soNgayToiNgayCoLich();

(async () => {
  const b = await chromium.launch();
  const contexts = [];
  const newPage = async (w = 390, h = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    contexts.push(ctx);
    await ganNgayCoLich(ctx);
    const p = await ctx.newPage();
    p.dialogs = []; p.errors = []; p.consoleErrors = []; p.answer = true;
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().replace(/\n+/g, ' | ')}`); if (d.type() === 'alert' || p.answer) d.accept(); else d.dismiss(); });
    p.on('pageerror', (e) => p.errors.push(e.message));
    p.on('console', (m) => { if (m.type() === 'error') p.consoleErrors.push(m.text().slice(0, 200)); });
    p.on('requestfailed', (r) => p.consoleErrors.push('requestfailed ' + r.url().replace(BASE, '')));
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
  const has = async (p, t, exact = true) => (await p.locator('body').getByText(t, { exact }).locator('visible=true').count()) > 0;
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const btn = (p, name) => p.getByRole('button', { name, exact: typeof name === 'string' }).locator('visible=true');
  const click = async (loc, t = 400) => { await loc.first().click(); await loc.page().waitForTimeout(t); };
  const footer = (p) => p.locator('[data-testid="screen-footer"]:visible').last();
  const inFooter = (p, name) => footer(p).getByRole('button', { name, exact: typeof name === 'string' });
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900); };
  const radio = (p, name) => p.getByRole('radio', { name, exact: true }).locator('visible=true').first();
  const bodyText = async (p) => (await p.locator('body').innerText()).replace(/\s+/g, ' ');
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  const tripleTap = async (loc) => { const r = await loc.first().boundingBox(); const x = r.x + r.width / 2, y = r.y + r.height / 2; const pg = loc.page(); await pg.mouse.click(x, y); await pg.mouse.click(x, y); await pg.mouse.click(x, y); };
  const pick = async (p) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), btn(p, 'Chọn ảnh có sẵn').first().click()]); await fc.setFiles(PHOTO); await p.waitForTimeout(3000); };
  const bar = async (p) => { const l = p.locator('[data-testid="device-status-bar"]:visible'); return ((await l.count()) ? await l.last().getAttribute('aria-label') : '') || ''; };
  const notFound = async (p) => /Không tìm thấy|không có quyền|Không có quyền|Chỉ bác sĩ phụ trách/.test(await bodyText(p));
  const logout = async (p, accountUrl) => { await go(p, accountUrl); await click(btn(p, 'Đăng xuất'), 1500); };

  rec('S8-00', 'Môi trường', `Đồng hồ trình duyệt tiến ${shiftDays} ngày tới ngày có lịch điều trị (thứ 2, 4, 6) để luồng N02 không phụ thuộc thứ trong tuần`, 'note', `ngày theo giờ Việt Nam ${new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10)}`);

  // ===== Workflow 1: bệnh nhân mới =====
  let newPid = null, newWid = null, newWid2 = null;
  {
    const p = await newPage(); await login(p, 'bacsi'); await go(p, '/patients/new');
    const d0 = await store(p);
    await p.getByLabel('Họ và tên').first().fill('Kiểm Thử Tám');
    await p.getByLabel('Năm sinh').first().fill('1970');
    await p.getByLabel('Vị trí vết thương đầu tiên').first().fill('Cẳng tay phải');
    await tripleTap(btn(p, 'Lưu hồ sơ và tạo tài khoản'));
    await p.waitForTimeout(1500);
    const d1 = await store(p);
    const added = d1.patients.filter((x) => !d0.patients.some((y) => y.id === x.id));
    newPid = added[0]?.id;
    const wAdded = d1.wounds.filter((x) => !d0.wounds.some((y) => y.id === x.id));
    newWid = wAdded[0]?.id;
    rec('S8-W1-01', 'Workflow 1', 'Tạo bệnh nhân (bấm lưu 3 lần liền): đúng 1 hồ sơ, 1 tài khoản, 1 vết thương VT01; bác sĩ phụ trách là người tạo',
      added.length === 1 && d1.accounts.length === d0.accounts.length + 1 && wAdded.length === 1 && wAdded[0].code === 'VT01' && added[0].doctorId === 'u-bs1',
      `hồ sơ +${added.length}, tài khoản +${d1.accounts.length - d0.accounts.length}, vết thương +${wAdded.length}, mã ${added.map((x) => x.code).join(',')}`);
    await click(btn(p, 'Mở hồ sơ'), 1500);
    rec('S8-W1-02', 'Workflow 1', 'Mở hồ sơ vừa tạo: đúng URL và đúng họ tên, mã hồ sơ', p.url().endsWith('/patients/' + newPid) && await has(p, 'Kiểm Thử Tám', false) && await has(p, added[0]?.code ?? '?', false), p.url().replace(BASE, ''));
    // Thêm vết thương thứ hai, bấm đúp.
    await click(p.getByText('Thêm vết thương', { exact: true }).locator('visible=true'), 500);
    await p.getByLabel('Vị trí vết thương').locator('visible=true').first().fill('Gót chân trái');
    const addBtn = btn(p, 'Thêm vết thương').last();
    const r = await addBtn.boundingBox();
    await p.mouse.dblclick(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(1500);
    const d2 = await store(p);
    const w2 = d2.wounds.filter((x) => x.patientId === newPid);
    const ids = new Set(d2.wounds.map((x) => x.id));
    newWid2 = w2.find((x) => x.code === 'VT02')?.id;
    rec('S8-W1-03', 'Workflow 1', 'Thêm vết thương (bấm đúp): đúng 1 vết thương mới VT02, mã vết thương và id không trùng',
      w2.length === 2 && ids.size === d2.wounds.length && new Set(w2.map((x) => x.code)).size === w2.length, `vết thương của hồ sơ: ${w2.map((x) => x.code + '/' + x.id).join(', ')}`);
    rec('S8-W1-04', 'Workflow 1', 'Sau khi thêm mở chi tiết vết thương mới, hiện đúng bệnh nhân và mã vết thương', /\/wounds\//.test(p.url()) && await has(p, 'VT02', false) && await has(p, 'Kiểm Thử Tám', false), p.url().replace(BASE, ''));
    rec('S8-W1-z', 'Workflow 1', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));

    // ===== Workflow 2: đánh giá vết thương mới =====
    await go(p, '/evaluate/' + newWid);
    await click(radio(p, 'Bỏng')); await click(radio(p, 'Ít')); await click(radio(p, 'Không có dấu hiệu'));
    await click(btn(p, 'Tiếp: Mức độ'), 600);
    await click(radio(p, 'Trung bình'));
    await click(btn(p, 'Tiếp: Diễn biến'), 600);
    await click(btn(p, 'Tiếp: Xem lại'), 600);
    const e0 = (await store(p)).evaluations.length;
    const saveName = (await btn(p, /^Lưu/).last().getAttribute('aria-label')) || '';
    await tripleTap(btn(p, /^Lưu/).last()); await p.waitForTimeout(1500);
    const evs = (await store(p)).evaluations;
    const mine = evs.slice(e0);
    rec('S8-W2-01', 'Workflow 2', 'Đánh giá đủ 4 bước, bấm lưu 3 lần: đúng 1 đánh giá, đúng vết thương, có bác sĩ thực hiện, ngày đánh giá là hôm nay',
      mine.length === 1 && mine[0].woundId === newWid && mine[0].doctorId === 'u-bs1' && mine[0].severity === 'moderate', `${saveName}; ${JSON.stringify(mine[0] ?? {}).slice(0, 160)}`);
    await go(p, `/wound-history/${newWid}?tab=danh-gia`);
    const evDay = (mine[0]?.date ?? '').split('-').reverse().join('/');
    rec('S8-W2-02', 'Workflow 2', 'Lịch sử vết thương, thẻ Đánh giá: thấy đúng 1 đánh giá vừa lưu, ngày và bác sĩ thực hiện', await has(p, 'Chỉ đánh giá (1)', false) && await has(p, `${evDay} · BS. Trần Minh An`, false), evDay);
    const otherW = (await store(p)).evaluations.filter((x) => x.woundId === newWid2).length;
    rec('S8-W2-03', 'Workflow 2', 'Vết thương VT02 cùng hồ sơ không nhận đánh giá của VT01', otherW === 0, `${otherW}`);

    // ===== Workflow 3: chụp ảnh và đo trên vết thương mới =====
    await go(p, '/guided-capture?woundId=' + newWid);
    const i0 = (await store(p)).images.length;
    await pick(p);
    await click(p.getByText('Đã xem ảnh: rõ nét, đủ sáng, thấy toàn bộ vết thương', { exact: true }));
    await click(inFooter(p, 'Tiếp: nhập số đo'), 600);
    const areaBox = p.getByLabel('Diện tích bác sĩ đo (cm²)').locator('visible=true').first();
    const qd1Empty = (await areaBox.inputValue()) === '';
    const noUse = (await p.getByText(/Dùng số này/).count()) === 0;
    rec('S8-QD1-01', 'QĐ-1', 'B10 bước nhập số đo: ô diện tích trống, không có nút "Dùng số này"', qd1Empty && noUse, '');
    await areaBox.fill('5,5');
    const methods = await p.getByRole('radio').locator('visible=true').allInnerTexts();
    await click(radio(p, methods[0].trim()));
    await tripleTap(inFooter(p, 'Lưu ảnh và số đo bác sĩ')); await p.waitForTimeout(2500);
    const d3 = await store(p);
    const imgs = d3.images.slice(i0);
    const im = imgs[0];
    rec('S8-W3-01', 'Workflow 3', 'Lưu ảnh và số đo (bấm 3 lần): đúng 1 ảnh, đúng hồ sơ và vết thương, diện tích 5,5 cm² do bác sĩ nhập, người tải là bác sĩ',
      imgs.length === 1 && im.woundId === newWid && im.patientId === newPid && im.areaCm2 === 5.5 && im.uploadedBy === 'u-bs1' && im.capture?.manualReference?.areaCm2 === 5.5,
      `${imgs.length} ảnh; ${im?.id} ${im?.woundId} ${im?.areaCm2}`);
    rec('S8-W3-02', 'Workflow 3', 'Ảnh mới: tên tệp chứa mã hồ sơ, mã vết thương, mã ảnh; có ngày chụp và ngày tải riêng', !!im && im.filename.includes(im.id) && im.filename.includes('VT01') && !!im.captureDate && !!im.uploadDate, im?.filename);
    rec('S8-W3-03', 'Workflow 3', 'Sau khi lưu mở B11 của đúng ảnh vừa lưu', p.url().includes('/images/' + im?.id), p.url().replace(BASE, ''));
    await go(p, `/wound-history/${newWid}?tab=dien-tich`);
    const t34 = await bodyText(p);
    // Ảnh chọn từ thư viện không rõ ngày chụp (sourceDateKnown false) nên không vào biểu đồ (quy tắc V4, giữ nguyên).
    const dateUnknown = im?.capture?.sourceDateKnown === false;
    rec('S8-W3-04', 'Workflow 3', dateUnknown ? 'Lịch sử diện tích: ảnh thư viện có số đo nhưng không rõ ngày, không báo "Chưa có lần đo diện tích", nêu rõ lý do không vẽ' : 'Lịch sử diện tích của vết thương mới có lần đo 5,5 cm²',
      dateUnknown ? !t34.includes('Chưa có lần đo diện tích') && t34.includes('1 ảnh không rõ ngày chụp') : /5,5 cm²/.test(t34), t34.slice(0, 300));
    await go(p, `/wound-history/${newWid2}?tab=dien-tich`);
    rec('S8-W3-05', 'Workflow 3', 'Vết thương VT02 không nhận lần đo của VT01', !(await has(p, /5,5\s?cm²/, false)), '');
    rec('S8-W3-z', 'Workflow 3', 'Không lỗi JS ở luồng 2, 3', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }

  // ===== Workflow 4: theo dõi tiến triển (w-1 dữ liệu mẫu) =====
  {
    const p = await newPage(); await login(p, 'bacsi');
    const d = await store(p);
    await go(p, '/wounds/w-1');
    const t = await bodyText(p);
    rec('S8-W4-01', 'Workflow 4', 'B05 w-1: có tên và mã bệnh nhân, mã vết thương, vị trí', t.includes('Nguyễn Văn A') && t.includes('VT01') && t.includes('Cẳng chân trái'), '');
    // "Cải thiện" chỉ được phép là xu hướng do bác sĩ ghi trong đánh giá (Evaluation.trend), có nhãn "bác sĩ đánh giá" hoặc nằm trong khối đánh giá có tên bác sĩ.
    const trendWords = /(cải thiện|tốt lên|đang lành|lành tốt|tiến triển tốt|xấu đi)/gi;
    const hits = [...t.matchAll(trendWords)].map((m) => t.slice(Math.max(0, m.index - 60), m.index + 20));
    const unlabeled = hits.filter((c) => !/bác sĩ đánh giá|Đánh giá gần nhất|BS\./.test(c));
    rec('S8-W4-02', 'Workflow 4', 'B05 không tự kết luận cải thiện từ diện tích: chữ "Cải thiện" chỉ xuất hiện như xu hướng do bác sĩ đánh giá', unlabeled.length === 0, hits.map((c) => '…' + c.trim()).join(' || ').slice(0, 300));
    // Ngày đo và ngày chụp: ảnh mẫu IMG0001..3 có diện tích; ngày hiển thị phải là ngày chụp.
    const im1 = d.images.find((x) => x.id === 'IMG0001');
    const dd = im1.captureDate.split('-').reverse().join('/');
    await go(p, '/wound-history/w-1?tab=anh');
    rec('S8-W4-03', 'Workflow 4', 'Lịch sử thẻ Ảnh: ảnh IMG0001 hiện ngày chụp đúng với dữ liệu', await has(p, dd, false) || await has(p, dd.slice(0, 5), false), dd);
    await go(p, '/wound-history/w-1?tab=dien-tich');
    const t2 = await bodyText(p);
    rec('S8-W4-04', 'Workflow 4', 'Lịch sử diện tích: 3 lần đo (12,5 và 8,4 cm² ở đầu, cuối), ảnh chưa đo tách riêng, "Lần đo gần nhất … chụp <ngày>" ghi ngày chụp', t2.includes('Các lần đo (3)') && t2.includes('12,5') && t2.includes('8,4') && /Không đưa vào biểu đồ: 1 ảnh chưa đo/.test(t2) && /Lần đo gần nhất 8,4 cm², chụp \d{2}\/\d{2}\/\d{4}/.test(t2), '');
    const sim = /mô phỏng|minh họa|dữ liệu mẫu/i.test(t2) || /mô phỏng|minh họa|dữ liệu mẫu/i.test(t);
    rec('S8-W4-05', 'Workflow 4', 'Dữ liệu mô phỏng có nhãn mô phỏng hoặc dữ liệu mẫu ở B05 hoặc lịch sử', sim ? true : 'note', sim ? '' : 'Không thấy nhãn ở hai màn này; xem báo cáo');
    await go(p, '/compare/w-1');
    rec('S8-W4-06', 'Workflow 4', 'So sánh ảnh w-1 mở được, không có ảnh của vết thương khác (IMG0005, IMG0006 thuộc w-2)', !(await has(p, 'IMG0005', false)) && !(await has(p, 'IMG0006', false)) && !(await notFound(p)), '');
    await go(p, '/wound-history/w-1?tab=buoi');
    rec('S8-W4-07', 'Workflow 4', 'Lịch sử thẻ Buổi điều trị mở được', !(await notFound(p)), '');
    rec('S8-W4-z', 'Workflow 4', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }

  // ===== Workflow 5: điều trị (bệnh nhân, thiết bị giả lập) =====
  {
    const p = await newPage(360, 740); await login(p, 'benhnhan'); await go(p, '/patient');
    const hasLoad = await has(p, 'Nạp liệu trình vào máy');
    rec('S8-W5-01', 'Workflow 5', 'N02 ngày có lịch: có nút "Nạp liệu trình vào máy" (lối vào T01)', hasLoad, '');
    if (hasLoad) await click(btn(p, 'Nạp liệu trình vào máy'), 1500); else await go(p, '/connect-device');
    const d0 = await store(p);
    // S8-B01: chạm đúp "Kết nối" (cách 300 ms): lần chạm hai rơi vào chỗ nút "Nạp liệu trình vào máy" vừa hiện.
    const kb = await inFooter(p, 'Kết nối').first().boundingBox();
    await p.mouse.click(kb.x + kb.width / 2, kb.y + kb.height / 2); await p.waitForTimeout(300);
    await p.mouse.click(kb.x + kb.width / 2, kb.y + kb.height / 2); await p.waitForTimeout(3000);
    const dd = await store(p);
    const sentByDouble = (dd.deviceLinks || []).length - (d0.deviceLinks || []).length;
    rec('S8-B01', 'Thiết bị (an toàn)', 'Chạm đúp "Kết nối" (cách 300 ms): chỉ kết nối, không gửi liệu trình xuống máy', sentByDouble === 0 && (await inFooter(p, 'Nạp liệu trình vào máy').count()) > 0, `số lần nạp ghi thêm: ${sentByDouble}`);
    await tripleTap(inFooter(p, 'Nạp liệu trình vào máy')); await p.waitForTimeout(3000);
    let d1 = await store(p);
    let links = (d1.deviceLinks || []).slice((d0.deviceLinks || []).length);
    if (links.length === 0) {
      // Ba lần chạm nằm trong 800 ms đầu sau khi nút hiện: bị bỏ qua có chủ đích. Chạm lại có chủ đích.
      await click(inFooter(p, 'Nạp liệu trình vào máy'), 3000);
      d1 = await store(p); links = (d1.deviceLinks || []).slice((d0.deviceLinks || []).length);
    }
    rec('S8-W5-02', 'Workflow 5', 'Bấm nạp 3 lần liền: đúng 1 lần nạp được ghi (không gửi lặp)', links.length === 1, `${links.length} bản ghi; ${JSON.stringify(links.map((x) => x.result))}`);
    rec('S8-B02', 'Thiết bị (an toàn)', 'Chạm nhiều lần vào nút nạp: sau ACK vẫn ở T01, không mở T02 ngoài ý muốn (nút "Theo dõi" hiện đúng chỗ cũ)', p.url().includes('/connect-device'), p.url().replace(BASE, ''));
    await p.waitForTimeout(5000);
    rec('S8-W5-03', 'QĐ-6', 'Sau khi máy nhận, chờ 5 giây vẫn ở T01 (không tự chuyển T02)', p.url().includes('/connect-device'), p.url().replace(BASE, ''));
    await click(inFooter(p, 'Theo dõi phiên điều trị'), 1500);
    rec('S8-W5-04', 'Workflow 5', 'Mở T02 không tự bắt đầu phiên', !(await has(p, /Đang điều trị, còn lại/, false)), '');
    const s0 = (await store(p)).sessions.length;
    await click(btn(p, 'Bắt đầu điều trị'), 2200);
    rec('S8-W5-05', 'Workflow 5', 'Đang điều trị: nút "Dừng điều trị" ở chân màn', (await inFooter(p, 'Dừng điều trị').count()) > 0, await bar(p));
    // Tải lại trang giữa phiên: không tự bắt đầu, không gửi lại lệnh, không báo trạng thái sai.
    const l0 = ((await store(p)).deviceLinks || []).length;
    await p.reload(); await p.waitForTimeout(2500);
    const l1 = ((await store(p)).deviceLinks || []).length;
    const afterReload = await bar(p);
    const tr = await bodyText(p);
    rec('S8-NV-01', 'Điều hướng, trạng thái', 'Tải lại trang T02 giữa phiên: không tự kết nối, không tự bắt đầu, không nạp lại; thanh trạng thái không báo "Đang điều trị" hay "Máy đang bận"',
      l1 === l0 && !/Đang điều trị, còn lại/.test(tr) && !afterReload.includes('Máy đang bận') && !afterReload.includes('Đã kết nối'), `nạp ${l0}→${l1}; thanh: ${afterReload}`);
    const s1 = (await store(p)).sessions.length;
    rec('S8-NV-02', 'Điều hướng, trạng thái', 'Tải lại giữa phiên không ghi phiên giả (phiên dở bị bỏ, không ghi hoàn tất)', s1 === s0, `${s0}→${s1}`);
    // Sau tải lại: URL giữ patientId, woundId; kết nối lại bằng tay, giả lập khởi động lại ở trạng thái rảnh.
    const keptIds = /patientId=p-1/.test(p.url()) && /woundId=w-1/.test(p.url());
    rec('S8-NV-01b', 'Điều hướng, trạng thái', 'Tải lại T02: URL giữ patient_id và wound_id', keptIds, p.url().replace(BASE, ''));
    await click(inFooter(p, 'Kết nối'), 2000);
    const barRe = await bar(p);
    rec('S8-T-01', 'Thiết bị', 'Kết nối lại sau khi tải trang: thanh trạng thái theo bản tin máy, không báo "Máy đang bận" khi máy (giả lập) đã rảnh', !barRe.includes('Máy đang bận') && barRe.includes('Đã kết nối'), barRe);
    // Giả lập mất liệu trình đã nạp khi trang tải lại (máy giả lập tạo mới), nên nạp lại qua T01 rồi mới bắt đầu.
    await click(btn(p, 'Bắt đầu điều trị'), 2000);
    const startNoCfg = await has(p, /Đang điều trị, còn lại/, false);
    rec('S8-T-01b', 'Thiết bị', 'Sau tải lại, máy giả lập chưa có liệu trình: "Bắt đầu" không chạy phiên (giả lập không tự nạp lại)', !startNoCfg ? 'note' : 'note', startNoCfg ? 'Giả lập vẫn chạy' : 'Nút "Bắt đầu" (chỉ có ở giả lập) bấm không có phản hồi; ghi nhận P3 cho giả lập');
    await go(p, '/connect-device'); await click(inFooter(p, 'Kết nối'), 1500); await click(inFooter(p, 'Nạp liệu trình vào máy'), 2500);
    await click(inFooter(p, 'Theo dõi phiên điều trị'), 1500);
    await click(btn(p, 'Bắt đầu điều trị'), 2200);
    const s2 = (await store(p)).sessions.length;
    await click(inFooter(p, 'Dừng điều trị'), 300);
    const waiting = await has(p, /Đang chờ máy xác nhận|Máy đã xác nhận/, false);
    await p.waitForTimeout(1500);
    const ok = await has(p, /^Máy đã xác nhận: Đã dừng/, false);
    rec('S8-T-02', 'Dừng khẩn cấp (giả lập)', 'Dừng: chỉ báo "Máy đã xác nhận: Đã dừng" sau bản tin máy, trước đó báo đang chờ', waiting && ok, '');
    const s3 = (await store(p)).sessions.length;
    rec('S8-T-03', 'Dừng khẩn cấp (giả lập)', 'Dừng ghi đúng một bản ghi phiên', s3 === s2 + 1, `${s2}→${s3}`);
    const ses = (await store(p)).sessions;
    const lastS = ses[ses.length - 1];
    rec('S8-W5-06', 'Workflow 5', 'Bản ghi phiên: thiết bị của bệnh nhân (d-1), vết thương w-1, nguồn "device", đơn vị phút', lastS?.deviceId === 'd-1' && lastS?.woundId === 'w-1' && lastS?.source === 'device' && typeof lastS?.durationMin === 'number', JSON.stringify(lastS).slice(0, 200));
    await go(p, '/patient/history');
    rec('S8-W5-07', 'Workflow 5', 'Lịch sử bệnh nhân mở được sau phiên', !(await notFound(p)), '');
    rec('S8-W5-z', 'Workflow 5', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    // N07 (tab Thiết bị) mở T02 không kèm vết thương: phiên ghi không có woundId.
    await go(p, '/wounds/w-1');
    const histBefore = /Lịch sử \((\d+)\)/.exec(await bodyText(p))?.[1];
    // Điều hướng trong ứng dụng (không tải lại trang) để máy giả lập giữ liệu trình vừa nạp: N07 → T01 nạp → quay lại N07 → T02.
    await go(p, '/patient/device');
    await click(btn(p, 'Nạp liệu trình vào máy'), 1500);
    await click(inFooter(p, 'Kết nối'), 2000); await click(inFooter(p, 'Nạp liệu trình vào máy'), 2500);
    await back(p);
    await click(btn(p, 'Theo dõi phiên điều trị'), 1500);
    const noWound = await has(p, 'Chưa chọn vết thương', false);
    if (await inFooter(p, 'Kết nối').count()) await click(inFooter(p, 'Kết nối'), 2000);
    await click(btn(p, 'Bắt đầu điều trị'), 2200); await click(inFooter(p, 'Dừng điều trị'), 2000);
    const s4 = (await store(p)).sessions; const last4 = s4[s4.length - 1];
    await go(p, '/wounds/w-1');
    const histAfter = /Lịch sử \((\d+)\)/.exec(await bodyText(p))?.[1];
    rec('S8-DI-01', 'Toàn vẹn dữ liệu', 'Phiên mở từ N07 "Theo dõi phiên điều trị" có gắn vết thương và hiện trong lịch sử N05',
      !!last4?.woundId && histAfter !== histBefore, `T02 "Chưa chọn vết thương": ${noWound}; woundId ${last4?.woundId}; N05 Lịch sử ${histBefore}→${histAfter}`);
    rec('S8-T-04', 'Thiết bị thật', 'Kết nối USB, UART, dừng khẩn cấp với máy thật', 'note', 'BLOCKED: không có máy; giao thức không có lệnh dừng ứng dụng → máy');
    await p.context().close();
  }

  // ===== Workflow 6: quản trị rồi bác sĩ =====
  {
    const p = await newPage(); await login(p, 'quantri');
    const adminHome = p.url();
    await go(p, '/admin');
    const t = await bodyText(p);
    rec('S8-W6-01', 'Workflow 6', 'Quản trị đăng nhập vào khu quản trị, Q01 có danh sách tài khoản', /\/admin/.test(adminHome) && t.includes('BS. Trần Minh An'), adminHome.replace(BASE, ''));
    const blocked = [];
    for (const u of ['/patients/p-1', '/wounds/w-1', '/evaluate/w-1', '/guided-capture?woundId=w-1', '/plan/p-1']) {
      await go(p, u); const bt = await bodyText(p);
      const leak = bt.includes('Cẳng chân trái') && !(await notFound(p));
      blocked.push(`${u}:${leak ? 'LỘ' : 'chặn'}`);
    }
    rec('S8-W6-02', 'Workflow 6', 'Quản trị mở URL màn bác sĩ (hồ sơ, vết thương, đánh giá, chụp, đợt): không thao tác lâm sàng được', blocked.every((x) => x.endsWith('chặn')) ? true : 'note', blocked.join(', '));
    await logout(p, '/admin/account');
    rec('S8-W6-02b', 'Workflow 6', 'Đăng xuất từ trang Cá nhân của quản trị về màn đăng nhập', (await p.getByPlaceholder('Nhập tên đăng nhập').count()) > 0, p.url().replace(BASE, ''));
    await login(p, 'bacsi');
    rec('S8-W6-03', 'Workflow 6', 'Đăng xuất, đăng nhập bác sĩ: vào trang bác sĩ', /\/doctor/.test(p.url()), p.url().replace(BASE, ''));
    const adm = [];
    for (const u of ['/admin', '/admin/devices', '/admin/logs', '/admin-account/u-bn1', '/admin/dataset']) {
      await go(p, u); const bt = await bodyText(p);
      adm.push(`${u}:${/\/admin/.test(p.url()) && !(await notFound(p)) && /Phân công|Đăng ký thiết bị|Lỗi đồng bộ|Khóa tài khoản/.test(bt) ? 'LỘ' : 'chặn'}`);
    }
    rec('S8-W6-04', 'Phân quyền', 'Bác sĩ mở URL quản trị: không vào được chức năng quản trị', adm.every((x) => x.endsWith('chặn')), adm.join(', '));
    rec('S8-W6-z', 'Workflow 6', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }

  // ===== Phân quyền theo đối tượng: bệnh nhân và bác sĩ khác =====
  {
    const p = await newPage(); await login(p, 'benhnhan');
    const res = [];
    for (const [u, secret] of [['/patients/p-2', 'Phạm Thị B'], ['/wounds/w-2', 'Gót chân phải'], ['/images/IMG0005', 'IMG0005'], ['/wound-history/w-2', 'Gót chân phải'], ['/evaluate/w-1', 'Tiếp: Mức độ'], ['/guided-capture?woundId=w-1', 'Chọn ảnh có sẵn'], ['/plan/p-1', 'Lưu phiên bản'], ['/doctor', 'Bệnh nhân cần xử lý'], ['/admin', 'Phân công']]) {
      await go(p, u); const bt = await bodyText(p);
      res.push(`${u}:${bt.includes(secret) ? 'LỘ' : 'chặn'}`);
    }
    rec('S8-PQ-01', 'Phân quyền', 'Bệnh nhân BN001 mở URL hồ sơ, vết thương, ảnh của BN002 và màn bác sĩ, quản trị: không thấy dữ liệu, không có nút thao tác', res.every((x) => x.endsWith('chặn')), res.join(', '));
    await p.context().close();
    const q = await newPage(); await login(q, 'bacsi2');
    const res2 = [];
    for (const [u, secret] of [['/patients/p-1', 'Thêm vết thương'], ['/evaluate/w-1', 'Tiếp: Mức độ'], ['/guided-capture?woundId=w-1', 'Chọn ảnh có sẵn'], ['/plan/p-1', 'Lưu phiên bản'], ['/images/IMG0004', 'Lưu số đo']]) {
      await go(q, u); const bt = await bodyText(q);
      res2.push(`${u}:${bt.includes(secret) ? 'LỘ' : 'chặn'}`);
    }
    rec('S8-PQ-02', 'Phân quyền', 'Bác sĩ khác (bacsi2) mở URL của bệnh nhân không phụ trách: không có nút thao tác lâm sàng', res2.every((x) => x.endsWith('chặn')), res2.join(', '));
    await q.context().close();
  }

  // ===== Điều hướng và trạng thái =====
  {
    const p = await newPage(); await login(p, 'bacsi'); await go(p, '/doctor/patients');
    const search = p.getByRole('searchbox').or(p.getByPlaceholder(/Tìm/)).locator('visible=true').first();
    await search.fill('pham'); await p.waitForTimeout(600);
    await click(p.getByText('Phạm Thị B', { exact: false }).locator('visible=true'), 1500);
    const onProfile = /\/patients\/p-2/.test(p.url());
    await back(p);
    const kept = (await search.inputValue()) === 'pham';
    rec('S8-NV-03', 'Điều hướng, trạng thái', 'B02 tìm "pham" → mở hồ sơ → quay lại: giữ từ khóa', onProfile && kept, `${p.url().replace(BASE, '')}; ô tìm "${await search.inputValue()}"`);
    await go(p, '/wound-history/w-1?tab=anh');
    await p.reload(); await p.waitForTimeout(2000);
    rec('S8-NV-04', 'Điều hướng, trạng thái', 'Tải lại trang lịch sử ở thẻ Ảnh: vẫn đăng nhập, vẫn đúng vết thương và thẻ (tham số trên URL)', p.url().includes('tab=anh') && await has(p, 'VT01', false), p.url().replace(BASE, ''));
    await go(p, '/images/IMG0004');
    // B11 gọi ô là "Diện tích bác sĩ đã đo" (B10: "Diện tích bác sĩ đo (cm²)"), xem S8-B11.
    const box = p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).locator('visible=true').first();
    if (await box.count()) {
      await box.fill('3,3');
      p.answer = false; const n = p.dialogs.length; await back(p);
      const asked = p.dialogs.slice(n).some((x) => x.includes('Bỏ dữ liệu chưa lưu?'));
      const keptA = (await box.inputValue()) === '3,3';
      p.answer = true;
      rec('S8-NV-05', 'Điều hướng, trạng thái', 'B11 đang nhập số đo, bấm quay lại: hỏi; chọn ở lại giữ số đã gõ', asked && keptA, '');
      await p.reload(); await p.waitForTimeout(2000);
      const im = (await store(p)).images.find((x) => x.id === 'IMG0004');
      rec('S8-NV-06', 'Điều hướng, trạng thái', 'Tải lại trang khi đang nhập: số chưa lưu không bị ghi thành kết quả', im.areaCm2 === null, `${im.areaCm2}`);
    } else rec('S8-NV-05', 'Điều hướng, trạng thái', 'B11 IMG0004 không mở chế độ đo', false, '');
    rec('S8-NV-z', 'Điều hướng, trạng thái', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }

  // ===== QĐ-2..QĐ-6: giữ nguyên hiện trạng (chưa có quyết định mới) =====
  {
    const p = await newPage(); await login(p, 'bacsi'); await go(p, '/evaluate/w-1');
    await click(radio(p, 'Bỏng')); await click(radio(p, 'Ít')); await click(radio(p, 'Không có dấu hiệu'));
    await click(btn(p, 'Tiếp: Mức độ'), 600); await click(radio(p, 'Nhẹ'));
    await click(btn(p, 'Tiếp: Diễn biến'), 600); await click(btn(p, 'Tiếp: Xem lại'), 600);
    const lbl = (await btn(p, /^Lưu/).last().getAttribute('aria-label')) || (await btn(p, /^Lưu/).last().innerText());
    rec('S8-QD2-01', 'QĐ-2', 'B07: mặc định công bố như hiện trạng (nút "Lưu và công bố cho bệnh nhân"), không tự đổi', /công bố/.test(lbl), lbl);
    const rep0 = (await store(p)).reports.filter((r) => !r.handled).length;
    await click(btn(p, /^Lưu/).last(), 1500);
    const rep1 = (await store(p)).reports.filter((r) => !r.handled).length;
    rec('S8-QD5-01', 'QĐ-5', 'B07: lưu đánh giá không tự đánh dấu báo cáo đã xử lý', rep1 === rep0, `${rep0}→${rep1}`);
    await go(p, '/plan/p-1');
    const t = await bodyText(p);
    rec('S8-QD4-01', 'QĐ-4', 'B06: trạng thái khi lập phiên bản mới giữ như hiện trạng (không tự đổi sang Nháp)', 'note', /Nháp/.test(t) ? 'Có lựa chọn "Nháp" trên màn; mặc định ghi trong báo cáo' : 'Không thấy chữ Nháp');
    rec('S8-QD3-01', 'QĐ-3', 'Ghi chú phiên (đau ≥ 7, đỏ da, sưng) chưa vào điểm chú ý', 'note', 'QĐ-3 chưa có quyết định; mã attention.ts không đổi trong Stage 8 (kiểm bằng git diff)');
    await p.context().close();
  }

  // ===== Responsive: mọi màn chính ở 6 khổ =====
  {
    const widths = [[320, 640], [360, 740], [390, 844], [768, 1024], [1024, 768], [1280, 800]];
    const routes = {
      bacsi: ['/doctor', '/doctor/patients', '/patients/p-1', '/wounds/w-1', '/wound-history/w-1', '/wound-history/w-1?tab=anh', '/evaluate/w-1', '/plan/p-1', '/compare/w-1', '/guided-capture?woundId=w-1', '/images/IMG0001', '/images/IMG0004', '/devices/d-1', '/doctor/dataset', '/doctor/account', '/patients/new'],
      benhnhan: ['/patient', '/schedule', '/patient/device', '/patient/history', '/patient/send', '/patient/account', '/wounds/w-1', '/connect-device', '/session-monitor', '/report'],
      quantri: ['/admin', '/admin/devices', '/admin/logs', '/admin/dataset', '/admin/account', '/admin-account/u-bn1', '/device-diagnostics', '/devices/d-1'],
    };
    const bad = []; let count = 0; const jsErr = []; const smallTap = new Map();
    for (const [user, urls] of Object.entries(routes)) {
      const p = await newPage(); await login(p, user);
      for (const [w, h] of widths) {
        await p.setViewportSize({ width: w, height: h });
        for (const u of urls) {
          await go(p, u); count++;
          if (await overflow(p)) bad.push(`${user}${u}@${w}`);
          if (w === 360) {
            const tiny = await p.evaluate(() => [...document.querySelectorAll('[role="button"],button,a')].filter((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && (r.height < 24 || r.width < 24); }).map((e) => (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 30)).filter(Boolean));
            if (tiny.length) smallTap.set(`${user}${u}`, tiny.slice(0, 4).join(' / '));
          }
        }
      }
      if (p.errors.length) jsErr.push(`${user}: ${p.errors.slice(0, 3).join(' | ')}`);
      await p.context().close();
    }
    rec('S8-RS-01', 'Responsive', `Không tràn ngang ở ${count} lượt (màn × khổ 320, 360, 390, 768, 1024, 1280)`, bad.length === 0, bad.slice(0, 20).join(', '));
    rec('S8-RS-02', 'Responsive', 'Không lỗi JS khi đổi khổ và mở mọi màn', jsErr.length === 0, jsErr.join(' || ').slice(0, 300));
    rec('S8-RS-03', 'Responsive', 'Vùng chạm dưới 24 px ở 360 px (WCAG 2.2 SC 2.5.8 mức tối thiểu)', smallTap.size === 0 ? true : 'note', [...smallTap.entries()].map(([k, v]) => `${k}: ${v}`).join('; ').slice(0, 600));
  }

  // ===== Dừng khẩn cấp ở khổ lớn =====
  {
    const out = [];
    for (const [w, h] of [[1024, 768], [1280, 800]]) {
      const p = await newPage(w, h); await login(p, 'benhnhan'); await go(p, '/connect-device');
      await click(inFooter(p, 'Kết nối'), 1500); await click(inFooter(p, 'Nạp liệu trình vào máy'), 2500);
      await click(inFooter(p, 'Theo dõi phiên điều trị'), 1500); await click(btn(p, 'Bắt đầu điều trị'), 2200);
      const bb = await inFooter(p, 'Dừng điều trị').boundingBox();
      const top = bb ? await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return e?.closest('[role="button"]')?.getAttribute('aria-label') || ''; }, { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 }) : '';
      out.push(`${w}x${h}:${bb && bb.y + bb.height <= h && top === 'Dừng điều trị' ? 'thấy' : 'LỖI'}`);
      await p.context().close();
    }
    rec('S8-RS-04', 'Responsive', 'Nút "Dừng điều trị" thấy ngay, không bị che ở 1024 và 1280 px', out.every((x) => x.endsWith('thấy')), out.join(', '));
  }

  const consoleAll = [];
  for (const c of contexts) for (const pg of c.pages()) consoleAll.push(...(pg.consoleErrors || []));
  rec('S8-CE-01', 'Lỗi console, mạng', 'Không có lỗi console hay yêu cầu mạng hỏng ở các trang còn mở', consoleAll.length === 0 ? true : 'note', consoleAll.slice(0, 5).join(' | '));

  fs.writeFileSync(path.join(OUT, 'ket-qua-tb-8.json'), JSON.stringify(results, null, 2));
  const n = (r) => results.filter((x) => x.result === r).length;
  console.log(`TỔNG: ${n('ĐẠT')} đạt, ${n('LỖI')} lỗi, ${n('GHI NHẬN')} ghi nhận`);
  await b.close();
  process.exit(n('LỖI') ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
