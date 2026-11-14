// Kiểm thử P0 Clinical Workflow UX trên bản web (thiết bị giả lập), Playwright. Đây là mock test, không thay cho thử với máy thật.
// Chạy: node scripts/kiem-thu-p0.cjs <baseURL> <thư mục kết quả> [--chi-anh <nhãn>]
//   --chi-anh trước|sau: chỉ chụp các màn P0 ở 320, 360, 390, 768 px (dùng cho cả bản trước khi sửa).
// Dữ liệu kiểm thử thêm vào bộ nhớ trình duyệt khi cần (không đổi dữ liệu mẫu trong mã). Hộp xác nhận trên web là window.confirm.
// Kết quả ghi ĐẠT, LỖI, hoặc GHI NHẬN (bằng chứng cho hạng mục ngoài phạm vi UI, ví dụ CR-01).
const { chromium } = require('playwright');
const { ganNgayCoLich } = require('./ngay-co-lich.cjs');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8502';
const OUT = process.argv[3] || '.';
const SHOTS = process.argv.includes('--chi-anh') ? process.argv[process.argv.indexOf('--chi-anh') + 1] || 'anh' : null;
const PHOTO = path.join(__dirname, '..', 'assets', 'demo', 'demo_1.png');
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390, h = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
    await ganNgayCoLich(ctx); // Stage 8: không phụ thuộc thứ trong tuần (xem scripts/ngay-co-lich.cjs)
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
  const mutate = async (p, fn) => { await p.evaluate((src) => { const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2')); new Function('d', src)(d); localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d)); }, fn); };
  const ctxText = async (p) => (await p.getByTestId('clinical-context').count()) ? (await p.getByTestId('clinical-context').first().innerText()).replace(/\s+/g, ' ') : '';
  // Giai đoạn 2 giao diện theo tác vụ: B07 chia 4 bước; chạm thanh bước để tới bước n (4 là "Xem lại", có thẻ "Sẽ lưu" và nút lưu).
  const toStep = async (p, n) => { await p.getByRole('tab', { name: new RegExp(`^${n}\\. `) }).click(); await p.waitForTimeout(400); };
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900); };
  const pageHeight = (p) => p.evaluate(() => { let best = document.documentElement.scrollHeight; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) best = Math.max(best, el.scrollHeight + (window.innerHeight - el.clientHeight)); } return Math.ceil(best); });
  const shot = async (p, file) => {
    const w = p.viewportSize().width; const H = await pageHeight(p);
    await p.setViewportSize({ width: w, height: Math.max(844, H) }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file) }); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
  };
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });

  // ===== Chỉ chụp ảnh trước, sau =====
  if (SHOTS) {
    const ROUTES = [
      ['b05', '/wounds/w-1'], ['b06c', '/plan/p-1?woundId=w-1', async (p) => { for (let i = 0; i < 2; i++) { await p.getByText('Tiếp', { exact: true }).click(); await p.waitForTimeout(300); } }],
      ['b07', '/evaluate/w-1'], ['b08', '/compare/w-1'], ['b09', '/capture'], ['b11-chua-do', '/images/IMG0004'], ['b11-da-do', '/images/IMG0003'],
      ['t01', '/connect-device?patientId=p-1'], ['t02', '/session-monitor?patientId=p-1&woundId=w-1'],
    ];
    for (const w of [320, 360, 390, 768]) {
      const p = await newPage(w); await login(p);
      for (const [name, url, act] of ROUTES) { await go(p, url); if (act) await act(p); await shot(p, `${name}-${SHOTS}-${w}.png`); }
      await p.context().close();
    }
    await b.close(); return;
  }

  // ===== P0-01: đúng bệnh nhân, đúng vết thương =====
  {
    const p = await newPage(); await login(p);
    const checks = [];
    for (const [name, url] of [['B05', '/wounds/w-1'], ['B06', '/plan/p-1?woundId=w-1'], ['B07', '/evaluate/w-1'], ['B08', '/compare/w-1'], ['B10', '/guided-capture?woundId=w-1'], ['B11', '/images/IMG0003'], ['T01', '/connect-device?patientId=p-1'], ['T02', '/session-monitor?patientId=p-1&woundId=w-1']]) {
      await go(p, url); const t = await ctxText(p);
      const ok = t.includes('Nguyễn Văn A') && t.includes('BN001') && t.includes('sinh 1958') && (name === 'T01' ? t.includes('VT01') || t.includes('Chưa chọn vết thương') : t.includes('VT01'));
      checks.push(`${name}:${ok ? 'có' : `thiếu "${t.slice(0, 60)}"`}`);
    }
    rec('TP-ID-01', 'Thanh ngữ cảnh có họ tên, mã BN, năm sinh, mã vết ở B05, B06, B07, B08, B10, B11, T01, T02', checks.every((c) => c.endsWith(':có')), checks.join(', '));

    // ID-01: B11 chuyển sang ảnh chưa đo của bệnh nhân khác.
    await go(p, '/images/IMG0004');
    await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).fill('6,5');
    await p.getByRole('textbox', { name: /^Phương pháp đo/ }).fill('Thước giấy kẻ ô');
    await p.getByRole('button', { name: 'Lưu diện tích' }).click(); await p.waitForTimeout(600);
    const nextBtn = p.getByRole('button', { name: /^Ảnh chưa đo tiếp theo/ });
    const label = (await nextBtn.count()) ? await nextBtn.first().innerText() : '';
    await nextBtn.first().click(); await p.waitForTimeout(1200);
    const t2 = await ctxText(p);
    const focused = await p.evaluate(() => document.activeElement?.tagName);
    const box = await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).inputValue().catch(() => 'không có ô');
    rec('TP-ID-02', 'B11 ảnh kế tiếp thuộc bệnh nhân khác: nút nêu rõ; màn mới có "Đã chuyển sang bệnh nhân khác", ô trống, không tự lấy tiêu điểm',
      /bệnh nhân khác/.test(label) && t2.includes('Đã chuyển sang bệnh nhân khác') && t2.includes('BN002') && box === '' && focused !== 'INPUT', `nút "${label}", ô "${box}", tiêu điểm ${focused}`);
    await back(p);
    rec('TP-ID-04', 'Quay lại từ ảnh BN002: không hỏi (không có dữ liệu chưa lưu)', !p.dialogs.some((d) => d.includes('Bỏ dữ liệu chưa lưu')), p.dialogs.join(' | ').slice(0, 120));

    // ID-02, ID-03: VT02 của BN001 có bản nháp; B01 mở đúng vết; B09 không chọn sẵn vết.
    await mutate(p, `
      if (!d.wounds.some((w) => w.id === 'w-p0')) d.wounds.push({ id: 'w-p0', patientId: 'p-1', code: 'VT02', location: 'Gót chân phải (P0)', startDate: d.wounds[0].startDate, status: 'active' });
      d.plans = d.plans.filter((x) => x.status !== 'draft');
      const src = d.plans.find((x) => x.patientId === 'p-1');
      d.plans.push({ ...src, id: 'pl-p0-draft', woundId: 'w-p0', status: 'draft', version: 1, confirmed: false, reason: 'Bản nháp kiểm thử P0' });`);
    await go(p, '/doctor');
    await p.getByText('Đợt nháp chờ xác nhận', { exact: true }).click(); await p.waitForTimeout(1200);
    const t3 = await ctxText(p);
    rec('TP-ID-03a', 'B01 ô "Đợt nháp chờ xác nhận" mở B06 đúng vết có bản nháp (VT02)', t3.includes('VT02') && t3.includes('Gót chân phải (P0)'), t3.slice(0, 90));
    await go(p, '/capture');
    await p.getByRole('radio', { name: /BN001/ }).click(); await p.waitForTimeout(300);
    const capBtn = p.getByRole('button', { name: 'Chụp có hướng dẫn' });
    const noLast = !(await has(p, 'Ảnh gần nhất'));
    rec('TP-ID-03b', 'B09 bệnh nhân có 2 vết: không chọn sẵn vết (không có "Ảnh gần nhất"), nút chụp khóa với lý do "Chọn vết thương trước."', noLast && await capBtn.isDisabled() && await has(p, 'Chọn vết thương trước.'), '');
    await p.getByRole('radio', { name: /^VT02/ }).click(); await p.waitForTimeout(300);
    rec('TP-ID-03c', 'B09 chọn VT02 thì nút chụp mở', !(await capBtn.isDisabled()), '');

    // ID-05: B06 đổi vết khi đang nhập phải hỏi; Ở lại giữ nguyên.
    await go(p, '/plan/p-1?woundId=w-1');
    await p.getByRole('textbox', { name: 'Đến ngày', exact: true }).first().fill('31/12/2026'); await p.waitForTimeout(200);
    p.answer = false; let n = p.dialogs.length;
    await p.getByRole('radio', { name: /^VT02/ }).click(); await p.waitForTimeout(500);
    const askedSwitch = p.dialogs.slice(n).some((d) => d.includes('Đổi vết thương?'));
    const stayed = (await ctxText(p)).includes('VT01') && (await p.getByRole('textbox', { name: 'Đến ngày', exact: true }).first().inputValue()) === '31/12/2026';
    p.answer = true; n = p.dialogs.length;
    await p.getByRole('radio', { name: /^VT02/ }).click(); await p.waitForTimeout(700);
    const switched = (await ctxText(p)).includes('VT02');
    rec('TP-ID-05a', 'B06 đang nhập rồi chạm VT02: hỏi trước; chọn ở lại giữ dữ liệu; đồng ý thì sang VT02', askedSwitch && stayed && switched, `hỏi ${askedSwitch}, giữ ${stayed}, đổi ${switched}`);
    // Tới bước Xác nhận: có dòng vết thương và nhãn nút kèm mã vết.
    for (let i = 0; i < 2; i++) { await p.getByText('Tiếp', { exact: true }).click(); await p.waitForTimeout(250); }
    rec('TP-ID-05b', 'B06 bước Xác nhận nêu vết thương; nút "Lưu phiên bản n cho VT02"', await has(p, 'VT02 · Gót chân phải (P0)') && await has(p, /^Lưu phiên bản \d+ cho VT02$/), '');

    // SV-05, ID-05: B07 chọn mức độ rồi quay lại.
    await go(p, '/wounds/w-1'); await p.getByRole('button', { name: 'Ghi đánh giá', exact: true }).click(); await p.waitForTimeout(1200);
    await toStep(p, 2);
    await p.getByRole('radio', { name: 'Nặng', exact: true }).click(); await p.waitForTimeout(200);
    p.answer = false; n = p.dialogs.length; await back(p);
    const askedB07 = p.dialogs.slice(n).some((d) => d.includes('Bỏ dữ liệu chưa lưu?'));
    const stillB07 = await has(p, 'Mức độ vết thương');
    p.answer = true; n = p.dialogs.length; await back(p);
    const leftB07 = !(await has(p, 'Mức độ vết thương'));
    rec('TP-ID-05c', 'B07 có dữ liệu chưa lưu, bấm quay lại: hỏi; "Ở lại" giữ màn; đồng ý thì rời màn, không lưu', askedB07 && stillB07 && leftB07, `hỏi ${askedB07}, ở lại ${stillB07}, rời ${leftB07}`);

    // ID-06: ảnh không thuộc vết thương.
    await go(p, '/evaluate/w-1?imageId=IMG0005'); await toStep(p, 4);
    const saveBtn = p.getByRole('button', { name: /^Lưu và công bố|^Lưu đánh giá/ });
    rec('TP-ID-06', 'B07 với ảnh của vết khác: báo không thuộc, nút Lưu bị khóa', await has(p, /không thuộc VT01/, false) && await saveBtn.isDisabled(), '');
    rec('TP-ID-z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== P0-02: nguồn dữ liệu =====
  {
    const p = await newPage(); await login(p);
    await mutate(p, `const i = d.images.find((x) => x.id === 'IMG0002'); i.history = []; if (i.capture) i.capture.manualReference = { areaCm2: null, method: null, confirmedBy: null, confirmedAt: null };`);
    await go(p, '/images/IMG0002');
    rec('TP-DS-05a', 'B11 số đo không có lịch sử, không có người xác nhận: ghi "Chưa có thông tin người nhập", không bịa tên', await has(p, 'Chưa có thông tin người nhập'), '');
    await go(p, '/images/IMG0003');
    rec('TP-DS-05c', 'B11 số đo có lịch sử: "Nhập bởi" lấy đúng người và giờ trong lịch sử', await has(p, /^BS\. Trần Minh An lúc \d{1,2}:\d{2} \d{2}\/\d{2}\/\d{4}$/, false), '');
    await p.getByRole('button', { name: 'Sửa số đo' }).click(); await p.waitForTimeout(300);
    await p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true }).fill('7,9'); await p.waitForTimeout(200);
    const repl = await has(p, /^Số hiện tại 8,4 cm².* sẽ được thay bằng 7,9 cm²/, false);
    const btnNew = await p.getByRole('button', { name: 'Lưu số mới' }).count();
    rec('TP-SV-06a', 'B11 thay số đã có: hiện số cũ sẽ bị thay bằng số mới, nút "Lưu số mới"', repl && btnNew === 1, '');
    await p.getByRole('button', { name: 'Lưu số mới' }).click(); await p.waitForTimeout(700);
    const im = (await store(p)).images.find((x) => x.id === 'IMG0003');
    rec('TP-DS-02', 'B11 sau khi lưu: "Nhập bởi BS. Trần Minh An lúc …"; lịch sử giữ số cũ 8,4', await has(p, /^BS\. Trần Minh An lúc /, false) && im.history.some((h) => h.fromArea === 8.4 && h.toArea === 7.9), `lịch sử ${im.history.length}`);
    await go(p, '/wounds/w-1');
    rec('TP-DS-05b', 'B05 nhãn "Ảnh đo chụp ngày" thay cho "Ngày đo"', await has(p, 'Ảnh đo chụp ngày') && !(await has(p, 'Ngày đo')), '');
    // B07: loại vết thương điền sẵn có nguồn.
    await go(p, '/evaluate/w-1');
    const prevNote = await has(p, /^Lấy từ đánh giá ngày \d{2}\/\d{2}\/\d{4}/, false);
    const anyPrev = ((await store(p)).evaluations || []).some((e) => e.woundId === 'w-1' && e.assessment);
    rec('TP-DS-04a', 'B07 loại vết thương lấy từ đánh giá trước có dòng "Lấy từ đánh giá ngày …"', anyPrev ? prevNote : !prevNote, anyPrev ? '' : 'seed không có đánh giá có cấu trúc: không hiện dòng nguồn');
    // B08: phương pháp khác nhau, thứ tự ngày ngược.
    await mutate(p, `d.images.forEach((i) => { if (i.id === 'IMG0001') i.measureMethod = 'Thước giấy kẻ ô'; if (i.id === 'IMG0003') i.measureMethod = 'Phần mềm đo trên ảnh'; });`);
    await go(p, '/compare/w-1');
    // P1-04b: hai dãy chip thay bằng dòng "Đổi ảnh trước/sau" mở một danh sách.
    const pickB08 = async (side, id) => { await p.getByRole('button', { name: new RegExp(`^Đổi ảnh ${side}`) }).click(); await p.waitForTimeout(200); await p.getByRole('radio', { name: new RegExp(`^Ảnh ${id}`) }).click(); await p.waitForTimeout(300); };
    await pickB08('sau', 'IMG0003');
    const methodWarn = await has(p, /^Hai số đo dùng phương pháp khác nhau/, false);
    const srcChip = (await p.getByText('Bác sĩ nhập', { exact: true }).count()) >= 2;
    await pickB08('trước', 'IMG0003');
    await pickB08('sau', 'IMG0001');
    rec('TP-DS-04b', 'B08: nguồn "Bác sĩ nhập" và phương pháp mỗi ảnh; cảnh báo khác phương pháp; cảnh báo "Trước" chụp sau "Sau"', methodWarn && srcChip && await has(p, /^Ảnh "Trước" .* chụp sau ảnh "Sau"/, false), `cảnh báo PP ${methodWarn}, chip ${srcChip}`);
    // B10: không còn lựa chọn AR, không chọn sẵn, bắt buộc chọn khi có số.
    await go(p, '/guided-capture?woundId=w-1');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByText('Chọn ảnh có sẵn', { exact: true }).click()]);
    await fc.setFiles(PHOTO); await p.waitForTimeout(3000);
    const arOpt = await p.getByRole('radio', { name: 'Ước lượng AR, bác sĩ đã xem lại' }).count();
    const anyChecked = await p.getByRole('radio', { checked: true }).count();
    const n0 = (await store(p)).images.length;
    // Giai đoạn 3: ô diện tích ở bước "Nhập số đo", sau nút "Tiếp: nhập số đo".
    await p.getByRole('button', { name: 'Tiếp: nhập số đo', exact: true }).click(); await p.waitForTimeout(500);
    await p.getByRole('textbox').first().fill('9,5');
    await p.getByText('Lưu ảnh và số đo bác sĩ', { exact: true }).click(); await p.waitForTimeout(800);
    const blocked = (await store(p)).images.length === n0 && await has(p, 'Chọn phương pháp bác sĩ đã dùng để đo trước khi lưu số đo.');
    rec('TP-DS-02b', 'B10: tiêu đề "Nhập số đo" (giai đoạn 3 tách bước, trước là "Kiểm tra ảnh và nhập số đo"); không có lựa chọn AR; phương pháp không chọn sẵn; có số mà chưa chọn phương pháp thì không lưu',
      await has(p, 'Nhập số đo') && arOpt === 0 && anyChecked === 0 && blocked, `AR ${arOpt}, đang bật ${anyChecked}`);
    await p.getByRole('radio', { name: 'Thước đo trên vết thương' }).click();
    await p.getByText('Lưu ảnh và số đo bác sĩ', { exact: true }).click(); await p.waitForTimeout(2500);
    const after = (await store(p)).images; const last = after[after.length - 1];
    rec('TP-DS-03', 'B10 lưu số bác sĩ: 1 ảnh mới, số 9,5, phương pháp đúng; ô trống lúc bắt đầu (QĐ-1)', after.length === n0 + 1 && last.areaCm2 === 9.5 && last.measureMethod === 'Thước đo trên vết thương', `${n0}→${after.length}`);
    rec('TP-DS-z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== P0-03: lưu =====
  {
    const p = await newPage(); await login(p);
    await go(p, '/evaluate/w-1'); await toStep(p, 4);
    const sum0 = await has(p, 'Sẽ lưu') && (await p.getByTestId('se-luu').innerText()).includes('Chưa chọn');
    await p.getByRole('button', { name: 'Sửa mức độ' }).click(); await p.waitForTimeout(500);
    const opened = await p.getByRole('radio', { name: 'Nặng', exact: true }).isVisible();
    await p.getByRole('radio', { name: 'Nặng', exact: true }).click(); await p.waitForTimeout(200);
    await toStep(p, 4);
    const showsHeavy = (await p.getByTestId('se-luu').innerText()).includes('Nặng');
    await p.getByRole('button', { name: 'Sửa mức độ' }).click(); await p.waitForTimeout(500);
    await p.getByRole('radio', { name: 'Trung bình', exact: true }).click(); await p.waitForTimeout(200);
    await toStep(p, 4);
    const showsMid = (await p.getByTestId('se-luu').innerText()).includes('Trung bình');
    rec('TP-SV-05', 'B07 thẻ "Sẽ lưu": ghi "Chưa chọn"; "Sửa" mở đúng nhóm; đổi Nặng sang Trung bình thì thẻ cập nhật', sum0 && opened && showsHeavy && showsMid, `mở ${opened}`);
    // Thiếu trường bắt buộc: chặn như cũ.
    const ev0 = (await store(p)).evaluations.length;
    await p.getByRole('button', { name: /^Lưu và công bố/ }).click(); await p.waitForTimeout(600);
    rec('TP-SV-02', 'B07 thiếu loại vết thương: không lưu, báo tại trường', (await store(p)).evaluations.length === ev0 && await has(p, 'Hãy chọn loại vết thương.'), '');
    await p.context().close();

    const q = await newPage(); await login(q);
    // Điền đủ B07 qua dữ liệu đánh giá trước: dùng lựa chọn đầu tiên của mỗi câu bắt buộc.
    await go(q, '/evaluate/w-2');
    for (const name of ['Bỏng', 'Ít', 'Không có dấu hiệu']) { await q.getByRole('radio', { name, exact: true }).first().click(); await q.waitForTimeout(150); }
    await toStep(q, 2);
    await q.getByRole('radio', { name: 'Nhẹ', exact: true }).click(); await q.waitForTimeout(200);
    await toStep(q, 4);
    const ev1 = (await store(q)).evaluations.length;
    await q.evaluate(() => { const orig = localStorage.setItem.bind(localStorage); window.__origSet = orig; localStorage.setItem = (k, v) => { if (k === 'plasmapro.demo.v2') throw new Error('QuotaExceededError (giả lập)'); return orig(k, v); }; });
    const nd = q.dialogs.length;
    await q.getByRole('button', { name: /^Lưu và công bố/ }).click(); await q.waitForTimeout(1200);
    const saidSaved = q.dialogs.slice(nd).some((d) => d.includes('Đã lưu đánh giá')) || await has(q, /Đã lưu đánh giá/, false);
    const persisted = await q.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2')).evaluations.length);
    const failShown = await has(q, /^Chưa lưu được đánh giá: Không ghi được vào bộ nhớ máy/, false);
    rec('CR-01a', 'B07 ghi bộ nhớ lỗi: không báo "Đã lưu đánh giá", báo chưa lưu, trên đĩa không thêm', !saidSaved && failShown && persisted === ev1, `báo đã lưu: ${saidSaved}; báo lỗi: ${failShown}; trên đĩa ${persisted} (trước ${ev1})`);
    // Bộ nhớ ghi lại được: bấm Lưu lần nữa, dữ liệu đang nhập vẫn còn, lần này lưu thật.
    await q.evaluate(() => { localStorage.setItem = window.__origSet; });
    const nd2 = q.dialogs.length;
    await q.getByRole('button', { name: /^Lưu và công bố/ }).click(); await q.waitForTimeout(1200);
    const saved2 = q.dialogs.slice(nd2).some((d) => d.includes('Đã lưu đánh giá')) || await has(q, /Đã lưu đánh giá/, false);
    const persisted2 = await q.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2')).evaluations.length);
    rec('CR-01b', 'B07 sau khi bộ nhớ ghi lại được: lưu lại không cần nhập lại, đúng 1 đánh giá mới trên đĩa', saved2 && persisted2 === ev1 + 1, `báo đã lưu: ${saved2}; trên đĩa ${persisted2}`);
    await q.context().close();
  }
  {
    // CR-01: B11 sửa số đo khi ghi bộ nhớ lỗi.
    const p = await newPage(); await login(p);
    await go(p, '/images/IMG0004');
    await p.getByRole('button', { name: /Nhập diện tích|Sửa diện tích|Nhập số đo/ }).first().click().catch(() => {}); await p.waitForTimeout(300);
    const box = p.getByRole('textbox', { name: /^Diện tích bác sĩ đã đo/ });
    await box.fill('7,5'); await p.waitForTimeout(200);
    const methodBox = p.getByRole('textbox', { name: /^Phương pháp đo/ });
    if (await methodBox.count()) { await methodBox.fill('Thước giấy kẻ ô'); await p.waitForTimeout(150); }
    await p.evaluate(() => { const orig = localStorage.setItem.bind(localStorage); window.__origSet = orig; localStorage.setItem = (k, v) => { if (k === 'plasmapro.demo.v2') throw new Error('QuotaExceededError (giả lập)'); return orig(k, v); }; });
    const nd = p.dialogs.length;
    await p.getByRole('button', { name: /^Lưu (diện tích|số mới)$/ }).click(); await p.waitForTimeout(1000);
    const dl = p.dialogs.slice(nd).join(' | ');
    const disk = await p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2')).images.find((i) => i.id === 'IMG0004'));
    const stillEditing = (await box.count()) > 0 && (await box.inputValue()).includes('7,5');
    rec('CR-01c', 'B11 ghi bộ nhớ lỗi: báo "Chưa lưu được", số trên đĩa không đổi, ô nhập còn số 7,5', dl.includes('Chưa lưu được') && disk.areaCm2 === null && stillEditing, `hộp: ${dl.slice(0, 120)}; đĩa ${disk.areaCm2}; còn ô ${stillEditing}`);
    const uiUnlabeled = await has(p, 'Chưa có nhãn diện tích');
    rec('CR-01d', 'B11 ghi lỗi: màn vẫn hiện "Chưa có nhãn diện tích" (không hiển thị số chưa lưu như đã lưu)', uiUnlabeled, '');
    await p.context().close();
  }
  {
    // CR-01: B06 lưu phiên bản khi ghi bộ nhớ lỗi.
    const p = await newPage(); await login(p);
    await go(p, '/plan/p-1?woundId=w-1');
    for (let i = 0; i < 2; i++) { await p.getByText('Tiếp', { exact: true }).click(); await p.waitForTimeout(250); }
    await p.getByRole('textbox', { name: /^Lý do thay đổi/ }).fill('Kiểm thử CR-01'); await p.waitForTimeout(150);
    // Đợt "Đang áp dụng" cần dấu xác nhận của bác sĩ (quy tắc cũ, không đổi).
    const cf = p.getByRole('checkbox', { name: /xác nhận/i });
    if (await cf.count()) { await cf.first().click(); await p.waitForTimeout(200); }
    const before = await p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2')).plans.length);
    await p.evaluate(() => { const orig = localStorage.setItem.bind(localStorage); localStorage.setItem = (k, v) => { if (k === 'plasmapro.demo.v2') throw new Error('QuotaExceededError (giả lập)'); return orig(k, v); }; });
    const nd = p.dialogs.length;
    for (let i = 0; i < 3; i++) await p.getByRole('button', { name: /^Lưu phiên bản \d+/ }).click().catch(() => {});
    await p.waitForTimeout(1000);
    const after = await p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2')).plans.length);
    const okDialog = p.dialogs.slice(nd).some((d) => d.includes('Đã lưu phiên bản mới'));
    const err = await has(p, /^Chưa lưu được phiên bản: Không ghi được vào bộ nhớ máy/, false);
    const reasonKept = (await p.getByRole('textbox', { name: /^Lý do thay đổi/ }).inputValue()) === 'Kiểm thử CR-01';
    rec('CR-01e', 'B06 ghi bộ nhớ lỗi (bấm Lưu 3 lần): không báo đã lưu, báo lỗi, đĩa không thêm phiên bản, lý do còn nguyên', !okDialog && err && after === before && reasonKept, `báo đã lưu ${okDialog}; lỗi ${err}; đĩa ${before}→${after}; lý do còn ${reasonKept}`);
    await p.context().close();
  }
  {
    // SV-06: B06 lưu "Đang áp dụng" khi đã có phiên bản đang áp dụng.
    const p = await newPage(); await login(p);
    await go(p, '/plan/p-1?woundId=w-1');
    for (let i = 0; i < 2; i++) { await p.getByText('Tiếp', { exact: true }).click(); await p.waitForTimeout(250); }
    await p.getByRole('radio', { name: 'Đang áp dụng', exact: true }).click(); await p.waitForTimeout(200);
    rec('TP-SV-06b', 'B06 chọn "Đang áp dụng": nêu phiên bản đang áp dụng sẽ chuyển sang Kết thúc', await has(p, /^Phiên bản \d+ \(Đang áp dụng\).* sẽ chuyển sang Kết thúc khi lưu/, false), '');
    // Lưu xong rồi rời màn: không hỏi.
    await p.getByRole('textbox', { name: 'Lý do thay đổi', exact: true }).fill('Kiểm thử P0');
    await p.getByRole('checkbox').first().click();
    const v0 = (await store(p)).plans.length;
    await p.getByText(/^Lưu phiên bản \d+ cho VT01$/).click(); await p.waitForTimeout(700);
    const v1 = (await store(p)).plans.length;
    for (let i = 0; i < 3; i++) await p.getByText(/^Lưu phiên bản \d+ cho VT01$/).click();
    await p.waitForTimeout(500);
    const v2 = (await store(p)).plans.length;
    const n = p.dialogs.length; await back(p);
    rec('TP-SV-03', 'B06 lưu 1 lần tạo 1 phiên bản; bấm lưu 3 lần sau đó không tạo thêm; rời màn sau khi lưu không hỏi', v1 === v0 + 1 && v2 === v1 && !p.dialogs.slice(n).some((d) => d.includes('Bỏ dữ liệu')), `${v0}→${v1}→${v2}`);
    // SV-05 B11: gõ lý do chụp lại rồi rời màn.
    await go(p, '/images/IMG0005');
    if (!(await p.getByRole('textbox', { name: 'Yêu cầu chụp lại', exact: true }).count())) { await p.getByRole('button', { name: /^Yêu cầu chụp lại, loại ảnh/ }).click(); await p.waitForTimeout(200); }
    await p.getByRole('textbox', { name: 'Yêu cầu chụp lại', exact: true }).fill('Ảnh mờ');
    p.answer = false; const m = p.dialogs.length; await back(p);
    rec('TP-SV-05b', 'B11 đang gõ, bấm quay lại: hỏi "Bỏ dữ liệu chưa lưu?", chọn ở lại thì giữ nội dung', p.dialogs.slice(m).some((d) => d.includes('Bỏ dữ liệu chưa lưu?')) && (await p.getByRole('textbox', { name: 'Yêu cầu chụp lại', exact: true }).inputValue()) === 'Ảnh mờ', '');
    rec('TP-SV-z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== P0-04: T01, T02 (thiết bị giả lập) =====
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/patient');
    await p.getByText('Nạp liệu trình vào máy').first().click(); await p.waitForTimeout(1200);
    rec('TP-DV-01', 'T01 chưa kết nối: chữ "Chưa kết nối", không có thông báo máy đã nhận', await has(p, 'Chưa kết nối') && !(await has(p, /Máy đã nhận/, false)), '');
    await p.getByText('Kết nối', { exact: true }).click(); await p.waitForTimeout(1500);
    await p.getByText('Nạp liệu trình vào máy').last().click();
    let sawSending = false;
    for (let i = 0; i < 20 && !sawSending; i++) { sawSending = await has(p, 'Đang gửi liệu trình, chờ máy xác nhận…'); if (!sawSending) await p.waitForTimeout(50); }
    await p.waitForTimeout(2500);
    const acked = await has(p, /^Máy đã nhận liệu trình\..*\(lúc \d{1,2}:\d{2}:\d{2}\)/, false);
    rec('TP-DV-03', 'T01 sau ACK: "Máy đã nhận" kèm giờ nhận', acked, '');
    rec('TP-DV-03b', 'T01 chữ "Đang gửi…, chờ máy xác nhận" trong lúc chờ ACK', sawSending ? true : 'note', sawSending ? '' : 'NOT TESTED: thiết bị giả lập trả ACK nhanh hơn chu kỳ đọc 50 ms của kịch bản; cần máy thật hoặc giả lập có độ trễ');
    await p.getByText('Ngắt kết nối', { exact: true }).click(); await p.waitForTimeout(800);
    rec('TP-DV-06a', 'T01 mất kết nối sau ACK: cảnh báo "Đã mất kết nối sau khi máy nhận"', await has(p, /^Đã mất kết nối sau khi máy nhận/, false), '');
    await p.getByText('Kết nối', { exact: true }).click(); await p.waitForTimeout(1500);
    await p.getByText('Theo dõi phiên điều trị').last().click(); await p.waitForTimeout(1200);
    rec('TP-ID-01b', 'T02 có vết thương của phiên trong thanh ngữ cảnh', (await ctxText(p)).includes('VT01'), (await ctxText(p)).slice(0, 80));
    await p.getByText('Bắt đầu điều trị').click(); await p.waitForTimeout(2200);
    const running = await has(p, 'Đang điều trị, còn lại');
    const pos = [];
    for (const [w, h] of [[320, 640], [360, 740], [390, 844]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(300);
      const bb = await p.getByText('Dừng điều trị').boundingBox();
      pos.push(`${w}x${h}:${bb ? Math.round(bb.y + bb.height) : 'không thấy'}${bb && bb.y + bb.height <= h ? ' trong màn đầu' : ' cần cuộn'}`);
    }
    await p.setViewportSize({ width: 390, height: 844 });
    rec('TP-DV-08a', 'T02 đang điều trị: nút Dừng còn hiện; vị trí đáy nút ở các khổ (ghi lại)', running && await p.getByText('Dừng điều trị').isVisible(), pos.join(', '));
    await shot(p, 't02-dang-dieu-tri-sau-390.png');
    const n = p.dialogs.length;
    await p.getByText('Dừng điều trị').click(); await p.waitForTimeout(1600);
    rec('TP-DV-09', 'Dừng (giả lập): không hỏi lại; "Máy báo: Đã dừng" và "Nhật ký ứng dụng: Đã ghi (gián đoạn)"', p.dialogs.length === n && await has(p, 'Máy báo') && await has(p, 'Đã ghi (gián đoạn)'), '');
    rec('TP-DV-06b', 'Mất kết nối giữa phiên trên giao diện T02', 'note', 'NOT TESTED trên giao diện: T02 không có nút ngắt, không tiêm được lỗi mà không sửa src/lib/device; hành vi kiểm bằng unit test sessionDisplay.test.ts');
    rec('TP-DV-z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== Tràn ngang ở 4 độ rộng =====
  {
    const bad = [];
    for (const w of [320, 360, 390, 768]) {
      const p = await newPage(w); await login(p);
      for (const url of ['/wounds/w-1', '/plan/p-1?woundId=w-1', '/evaluate/w-1', '/compare/w-1', '/capture', '/images/IMG0003', '/connect-device?patientId=p-1', '/session-monitor?patientId=p-1&woundId=w-1']) {
        await go(p, url); const o = await overflow(p); if (o) bad.push(`${url}@${w}:${o}`);
      }
      await p.context().close();
    }
    rec('TP-AL-02', 'Không tràn ngang ở 320, 360, 390, 768 px trên 8 màn P0', bad.length === 0, bad.join(', '));
  }

  {
    // P0 bổ sung PX-01: B04 dòng "Đợt điều trị" mở B06 đúng vết của đợt đang tóm tắt.
    const p = await newPage(); await login(p);
    await go(p, '/doctor');
    await mutate(p, `
      if (!d.wounds.some((w) => w.id === 'w-px')) d.wounds.push({ id: 'w-px', patientId: 'p-1', code: 'VT02', location: 'Mu bàn chân phải (PX)', startDate: d.wounds[0].startDate, status: 'active' });
      const src = d.plans.filter((x) => x.patientId === 'p-1').sort((a, b) => b.version - a.version)[0];
      d.plans.push({ ...src, id: 'pl-px', woundId: 'w-px', status: 'paused', version: 9, reason: 'Kiểm thử PX-01' });`);
    await go(p, '/patients/p-1');
    // Từ P1-02, B04 có một dòng đợt cho mỗi vết: dòng của VT02 ghi tiến độ hoặc phiên bản của đợt VT02.
    const rowPx = p.getByRole('button', { name: /VT02 · Mu bàn chân phải \(PX\).*(\d+\/\d+ buổi|Phiên bản)/ });
    const subShowsVt02 = (await rowPx.count()) > 0;
    for (const wd of [320, 390]) { await p.setViewportSize({ width: wd, height: 844 }); await p.waitForTimeout(200); await p.screenshot({ path: path.join(OUT, `px01-b04-${wd}.png`), fullPage: true }); }
    await p.setViewportSize({ width: 390, height: 844 });
    await rowPx.first().click(); await p.waitForTimeout(1500);
    const url = p.url();
    const ctx = await p.getByTestId('clinical-context').innerText();
    rec('PX-01', 'B04 có 2 vết, đợt mới nhất thuộc VT02: dòng ghi VT02, mở B06 kèm woundId của VT02, thanh ngữ cảnh ghi VT02', subShowsVt02 && url.includes('woundId=w-px') && ctx.includes('VT02'), `dòng ${subShowsVt02}; url ${url.split('/').pop()}; ngữ cảnh ${ctx.replace(/\n/g, ' ').slice(0, 80)}`);
    await p.context().close();
  }
  {
    // P0 bổ sung PX-02: B10 hỏi trước khi bỏ ảnh chưa lưu.
    const p = await newPage(); await login(p);
    await go(p, '/wounds/w-1');
    await go(p, '/guided-capture?woundId=w-1');
    const pick = async () => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByText('Chọn ảnh có sẵn', { exact: true }).click()]); await fc.setFiles(PHOTO); await p.waitForTimeout(3000); };
    await pick();
    // Giai đoạn 3: nhập số ở bước 3, "Chụp / chọn lại" ở bước 2 ("Bước trước").
    const toInput = async () => { await p.getByRole('button', { name: 'Tiếp: nhập số đo', exact: true }).click(); await p.waitForTimeout(400); };
    const toReview = async () => { await p.getByRole('button', { name: 'Bước trước', exact: true }).click(); await p.waitForTimeout(400); };
    await toInput();
    await p.getByRole('textbox').first().fill('6,1');
    await toReview();
    // Chụp / chọn lại, chọn "Ở lại": ảnh và số còn nguyên.
    p.answer = false; let n = p.dialogs.length;
    await p.getByText('Chụp / chọn lại', { exact: true }).click(); await p.waitForTimeout(500);
    const asked = p.dialogs.slice(n).some((d) => d.includes('Bỏ ảnh vừa chụp?') && d.includes('số đo đang nhập'));
    const stillReview = await has(p, 'Kiểm tra ảnh');
    await toInput();
    const kept = stillReview && await has(p, 'Nhập số đo') && (await p.getByRole('textbox').first().inputValue()) === '6,1';
    rec('PX-02a', 'B10 có ảnh và số chưa lưu, bấm "Chụp / chọn lại", chọn Ở lại: có hỏi, ảnh và số còn nguyên', asked && kept, `hỏi ${asked}; còn ${kept}`);
    // Quay lại, chọn "Ở lại": vẫn ở B10.
    n = p.dialogs.length;
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(800);
    const askedBack = p.dialogs.slice(n).some((d) => d.includes('Bỏ dữ liệu chưa lưu?'));
    const stayed = await has(p, 'Nhập số đo') && (await p.getByRole('textbox').first().inputValue()) === '6,1';
    rec('PX-02b', 'B10 có ảnh chưa lưu, bấm quay lại, chọn Ở lại: có hỏi, vẫn ở B10', askedBack && stayed, `hỏi ${askedBack}; ở lại ${stayed}`);
    // Chụp / chọn lại, đồng ý bỏ: về màn chụp.
    p.answer = true;
    await toReview();
    await p.getByText('Chụp / chọn lại', { exact: true }).click(); await p.waitForTimeout(500);
    const reset = await has(p, 'Chọn ảnh có sẵn');
    rec('PX-02c', 'B10 đồng ý bỏ: về bước chụp', reset, '');
    // Chọn ảnh, lưu: sang B11, không hỏi bỏ dữ liệu.
    await pick();
    n = p.dialogs.length;
    const n0 = (await store(p)).images.length;
    await toInput();
    await p.getByText('Lưu ảnh (chưa có số đo)', { exact: true }).click(); await p.waitForTimeout(2500);
    const noAsk = !p.dialogs.slice(n).some((d) => d.includes('Bỏ dữ liệu chưa lưu?') || d.includes('Bỏ ảnh vừa chụp?'));
    const savedOne = (await store(p)).images.length === n0 + 1 && /\/images\//.test(p.url());
    rec('PX-02d', 'B10 lưu ảnh: sang B11, không hiện hộp hỏi bỏ dữ liệu, đúng 1 ảnh mới', noAsk && savedOne, `không hỏi ${noAsk}; lưu ${savedOne}`);
    // Ảnh chưa chụp: quay lại không hỏi.
    await go(p, '/wounds/w-1'); await go(p, '/guided-capture?woundId=w-1');
    n = p.dialogs.length;
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(800);
    rec('PX-02e', 'B10 chưa có ảnh: quay lại không hỏi', !p.dialogs.slice(n).some((d) => d.includes('Bỏ')), '');
    rec('PX-02z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  fs.writeFileSync(path.join(OUT, 'ket-qua-p0.json'), JSON.stringify(results, null, 2));
  const c = (r) => results.filter((x) => x.result === r).length;
  console.log(`\nTổng: ĐẠT ${c('ĐẠT')}, LỖI ${c('LỖI')}, GHI NHẬN ${c('GHI NHẬN')}`);
  await b.close();
  process.exit(c('LỖI') ? 1 : 0);
})();
