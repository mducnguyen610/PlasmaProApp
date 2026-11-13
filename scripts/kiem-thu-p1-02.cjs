// Kiểm thử P1-02 (B04 Hồ sơ bệnh nhân, B05 Chi tiết vết thương). Playwright trên bản web. Mock test.
// Chạy: node scripts/kiem-thu-p1-02.cjs <baseURL> <thư mục kết quả> [--chi-anh <nhãn>]
// Dữ liệu thêm (vết VT02, ảnh, đánh giá, báo cáo) chỉ ghi vào bộ nhớ trình duyệt, không sửa seed.ts.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8501';
const OUT = process.argv[3] || '.';
const SHOTS = process.argv.includes('--chi-anh') ? process.argv[process.argv.indexOf('--chi-anh') + 1] || 'anh' : null;
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };
const WIDTHS = [320, 360, 390, 768];

const helpers = (b) => {
  const newPage = async (w = 390, h = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
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
  const pageHeight = (p) => p.evaluate(() => { let best = document.documentElement.scrollHeight; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) best = Math.max(best, el.scrollHeight + (window.innerHeight - el.clientHeight)); } return Math.ceil(best); });
  const shot = async (p, file) => {
    const w = p.viewportSize().width; const H = await pageHeight(p);
    await p.setViewportSize({ width: w, height: Math.max(844, H) }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file) }); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
    return H;
  };
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });
  // Phần tử bấm được nhỏ hơn 44 px trên màn đang xem (bỏ qua phần tử ẩn của tab khác).
  const small = (p) => p.evaluate(() => [...document.querySelectorAll('[role="button"],[role="radio"],[role="tab"],[role="link"]')].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false; const hit = document.elementFromPoint(Math.min(window.innerWidth - 1, r.x + r.width / 2), Math.max(0, Math.min(window.innerHeight - 1, r.y + r.height / 2))); return r.y >= 0 && r.bottom <= window.innerHeight && hit && (e.contains(hit) || hit.contains(e)) && (r.height < 44 || r.width < 44); }).map((e) => `${(e.getAttribute('aria-label') || e.textContent || '').slice(0, 30)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  const inView = (p, loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight + 1; });
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900); };
  return { newPage, login, go, has, store, mutate, pageHeight, shot, overflow, small, inView, back };
};
const finish = (tag) => {
  fs.writeFileSync(path.join(OUT, `ket-qua-${tag}.json`), JSON.stringify(results, null, 2));
  const n = (r) => results.filter((x) => x.result === r).length;
  console.log(`\nTổng: ${n('ĐẠT')} đạt, ${n('LỖI')} lỗi, ${n('GHI NHẬN')} ghi nhận`);
  process.exitCode = n('LỖI') ? 1 : 0;
};

// VT02 cho BN001: một ảnh đã đo 5 cm², một đánh giá "Xấu đi", một đợt nháp riêng.
const VT02 = `
  if (!d.wounds.some((w) => w.id === 'w-kt2')) {
    d.wounds.push({ id: 'w-kt2', patientId: 'p-1', code: 'VT02', location: 'Gót chân trái (kiểm thử)', startDate: d.wounds[0].startDate, status: 'active' });
    const src = d.images.find((i) => i.id === 'IMG0003');
    d.images.push({ ...src, id: 'IMG9001', woundId: 'w-kt2', filename: 'BN001_VT02_IMG9001_area_5.0cm2.png', areaCm2: 5, history: [{ at: src.captureDate + 'T09:00:00Z', by: 'u-bs2', fromName: '', toName: '', fromArea: null, toArea: 5 }] });
    d.evaluations.push({ id: 'e-kt2', woundId: 'w-kt2', date: src.captureDate, doctorId: 'u-bs1', areaCm2: 5, characteristics: '', symptoms: '', symptomSource: '', trend: 'worsening', instructions: '', visibleToPatient: true });
  }
`;

(async () => {
  const b = await chromium.launch();
  const { newPage, login, go, has, store, mutate, shot, overflow, small } = helpers(b);

  if (SHOTS) {
    const heights = {};
    for (const w of WIDTHS) {
      const p = await newPage(w); await login(p);
      await go(p, '/patients/p-1'); heights[`b04-${w}`] = await shot(p, `b04-${SHOTS}-${w}.png`);
      await go(p, '/wounds/w-1'); heights[`b05-${w}`] = await shot(p, `b05-${SHOTS}-${w}.png`);
      await mutate(p, VT02); await go(p, '/patients/p-1'); await shot(p, `b04-hai-vet-${SHOTS}-${w}.png`);
      await p.context().close();
    }
    fs.writeFileSync(path.join(OUT, `chieu-cao-${SHOTS}.json`), JSON.stringify(heights, null, 2));
    await b.close(); return;
  }

  // TP1-05 (P1-02a): B04 hai vết, mỗi dòng đúng số đo, ngày, đánh giá của chính vết; dòng đợt mở đúng vết.
  {
    const p = await newPage(); await login(p);
    await go(p, '/'); await mutate(p, VT02);
    await go(p, '/patients/p-1');
    const rows = await p.getByTestId('dong-vet').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    const d = await store(p);
    const lab = (wid) => d.images.filter((i) => i.woundId === wid && i.status === 'labeled' && i.areaCm2 !== null).sort((a, b) => a.captureDate.localeCompare(b.captureDate)).pop();
    const l1 = lab('w-1'), l2 = lab('w-kt2');
    const a1 = rows.find((r) => r.startsWith('VT01')) || '', a2 = rows.find((r) => r.startsWith('VT02')) || '';
    const ok1 = a1.includes(`Diện tích ${String(l1.areaCm2).replace('.', ',')}`) && a1.includes('Có 1 ảnh mới chưa đo') && !a1.includes('Diễn biến bất lợi');
    const ok2 = a2.includes('Diện tích 5') && a2.includes('Diễn biến bất lợi (bác sĩ đánh giá)') && !a2.includes('ảnh mới chưa đo');
    rec('TP1-05', 'B04 hai vết: mỗi dòng có số đo, đánh giá, ảnh chưa đo của chính vết đó', rows.length === 2 && ok1 && ok2, `VT01: ${a1.slice(0, 140)} | VT02: ${a2.slice(0, 140)}`);
    // Dòng đợt của VT02 mở B06 với thanh ngữ cảnh VT02.
    await p.getByText('VT02 · Gót chân trái (kiểm thử)', { exact: true }).last().click(); await p.waitForTimeout(1200);
    const ctx = (await p.getByTestId('clinical-context').first().innerText()).replace(/\s+/g, ' ');
    rec('TP1-05b', 'B04 dòng đợt của VT02 mở B06 có thanh ngữ cảnh VT02 (không mở VT01)', p.url().includes('woundId=w-kt2') && ctx.includes('VT02'), `${p.url().replace(BASE, '')} | ${ctx.slice(0, 80)}`);
    // Thứ tự lâm sàng: vết thương, báo cáo, đợt, rồi thiết bị và tài khoản.
    await go(p, '/patients/p-1');
    const y = async (t) => (await p.getByText(t, { exact: true }).first().boundingBox())?.y ?? -1;
    const ys = [await y('Vết thương đang quản lý'), await y('Triệu chứng và sự cố bệnh nhân báo'), await y('Đợt điều trị'), await y('Thiết bị và tài khoản')];
    rec('TP1-02a-thu-tu', 'B04 thứ tự: Vết thương, Triệu chứng/sự cố, Đợt điều trị, Thiết bị và tài khoản', ys.every((v, i) => v > 0 && (i === 0 || v > ys[i - 1])), ys.join(' < '));
    rec('TP1-07a-b04', 'B04 định danh "BN001 · sinh 1958 · Nam"', await has(p, 'BN001 · sinh 1958 · Nam'));
    await p.context().close();
  }

  // TP1-04: chuyển B04 bệnh nhân A rồi B: không còn thông tin vết của A.
  {
    const p = await newPage(); await login(p);
    await go(p, '/patients/p-1'); const a = await p.getByTestId('dong-vet').count();
    await go(p, '/patients/p-2');
    const rows = await p.getByTestId('dong-vet').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    rec('TP1-04', 'B04 BN001 rồi BN002: chỉ còn vết của BN002 (Gót chân phải), không có Cẳng chân trái', a >= 1 && rows.length === 1 && rows[0].includes('Gót chân phải') && !(await has(p, /Cẳng chân trái/, false)), rows.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // A-11: báo cáo chưa xử lý trước, đã xử lý thu gọn.
  {
    const p = await newPage(); await login(p);
    await go(p, '/');
    await mutate(p, `d.reports.push({ id: 'r-kt-1', patientId: 'p-1', date: new Date().toISOString(), kind: 'symptom', content: 'Đau rát (kiểm thử, chưa xử lý)', handled: false }, { id: 'r-kt-2', patientId: 'p-1', date: new Date().toISOString(), kind: 'device', content: 'Máy kêu (kiểm thử, đã xử lý)', handled: true });`);
    await go(p, '/patients/p-1');
    const openVis = await p.getByText('Đau rát (kiểm thử, chưa xử lý)', { exact: true }).isVisible();
    const doneHidden = !(await p.getByText('Máy kêu (kiểm thử, đã xử lý)', { exact: true }).isVisible().catch(() => false));
    const d = await store(p); const nDone = d.reports.filter((r) => r.patientId === 'p-1' && r.handled).length;
    const disc = await p.getByRole('button', { name: new RegExp(`^Đã xử lý \\(${nDone}\\)`) }).count();
    rec('TP1-02a-bao-cao', 'B04 báo cáo chưa xử lý hiện sẵn; đã xử lý nằm trong mục thu gọn "Đã xử lý (n)"', openVis && doneHidden && disc === 1, `chưa xử lý hiện ${openVis}, đã xử lý ẩn ${doneHidden}, mục ${disc}`);
    await p.context().close();
  }

  // TP1-06, TP1-07 (P1-02b): B05 "Lần đo trước" trùng cột áp chót của biểu đồ; người nhập trùng B11; ảnh mới chưa đo hiện đúng điều kiện.
  {
    const p = await newPage(); await login(p);
    await go(p, '/wounds/w-1');
    const d = await store(p);
    const pts = d.images.filter((i) => i.woundId === 'w-1' && i.status === 'labeled' && i.areaCm2 !== null && i.capture?.sourceDateKnown !== false).sort((a, b) => a.captureDate.localeCompare(b.captureDate));
    const prev = pts[pts.length - 2];
    const prevTxt = `${String(prev.areaCm2).replace('.', ',')}`;
    const prevRow = await p.getByText(new RegExp(`^${prevTxt}\\d* cm² · chụp \\d{2}/\\d{2}/\\d{4}$`)).count();
    const by = (await p.locator('text=Nhập bởi').first().locator('xpath=..').innerText()).replace(/\s+/g, ' ');
    const notice = await has(p, /^Có 1 ảnh mới hơn chưa đo \(IMG0004, chụp \d{2}\/\d{2}\/\d{4}\)/, false);
    // P2-02: biểu đồ đường chỉ ghi số trên điểm đầu và cuối; kiểm "Lần đo trước" là dòng thứ hai (mới trước) của danh sách "Các lần đo".
    // Giai đoạn 1 giao diện theo tác vụ: biểu đồ của bác sĩ ở màn "Tiến triển và lịch sử" (wound-history), thẻ Diện tích.
    await go(p, '/wound-history/w-1?tab=dien-tich');
    await p.getByText(/^Các lần đo \(\d+\)$/).last().click(); await p.waitForTimeout(300);
    const rows = await p.getByRole('button', { name: /^\d\d\/\d\d\/\d{4}, \d+,\d cm², / }).evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    const bars = rows[1]?.startsWith(`${prev.captureDate.slice(8, 10)}/${prev.captureDate.slice(5, 7)}/${prev.captureDate.slice(0, 4)}, ${prevTxt}`) ? 2 : 0;
    rec('TP1-06', 'B05 "Lần đo trước" là điểm áp chót của biểu đồ (số và ngày; so với danh sách Các lần đo ở màn Tiến triển và lịch sử)', prevRow === 1 && bars >= 2, `${prev.id} ${prev.areaCm2}; dòng ${prevRow}, xuất hiện ${bars}`);
    await go(p, '/images/IMG0003');
    const by11 = (await p.locator('text=Nhập bởi').first().locator('xpath=..').innerText()).replace(/\s+/g, ' ');
    rec('TP1-02b-nguoi-nhap', 'B05 "Nhập bởi" trùng dòng "Nhập bởi" của B11 cùng ảnh', by === by11 && by.length > 9, `${by} | ${by11}`);
    rec('TP1-07', 'B05 "Có 1 ảnh mới hơn chưa đo (IMG0004 …)" khi IMG0004 chưa đo', notice);
    // Đo IMG0004 thì thông báo biến mất.
    await mutate(p, `const i = d.images.find((x) => x.id === 'IMG0004'); i.areaCm2 = 7.1; i.status = 'labeled'; i.history = [{ at: new Date().toISOString(), by: 'u-bs1', fromName: '', toName: '', fromArea: null, toArea: 7.1 }];`);
    await go(p, '/wounds/w-1');
    rec('TP1-07b', 'Sau khi IMG0004 có số đo: thông báo ảnh mới chưa đo không còn', !(await has(p, /^Có \d+ ảnh mới hơn chưa đo/, false)));
    await p.context().close();
  }

  // P1-02c: buổi điều trị của vết w-1 trùng sessionsForWound; không có buổi của vết khác.
  {
    const p = await newPage(); await login(p);
    await go(p, '/');
    await mutate(p, `
      d.wounds.push({ id: 'w-kt2', patientId: 'p-1', code: 'VT02', location: 'Gót chân trái (kiểm thử)', startDate: d.wounds[0].startDate, status: 'active' });
      d.sessions.push({ sessionId: 'S-KT-VT02', deviceId: 'd-1', start: new Date().toISOString(), durationMin: 9, energyWh: null, status: 'completed', source: 'simulated', woundId: 'w-kt2' });
    `);
    await go(p, '/wounds/w-1');
    const d = await store(p);
    const seen = new Set(); const all = d.sessions.filter((s) => s.deviceId === 'd-1' && !seen.has(s.sessionId) && seen.add(s.sessionId));
    const expect = all.filter((s) => !s.woundId || s.woundId === 'w-1').length;
    // Giai đoạn 1 giao diện theo tác vụ: B05 có lối vào "Lịch sử điều trị, n buổi"; danh sách ở thẻ "Buổi điều trị" của wound-history.
    const head = p.getByRole('button', { name: /^Lịch sử điều trị, \d+ buổi/ });
    const label = await head.getAttribute('aria-label');
    await head.click(); await p.waitForTimeout(1200);
    const onTab = p.url().includes('/wound-history/w-1') && p.url().includes('tab=buoi');
    const shown = await p.getByTestId('buoi-dieu-tri').count();
    const has9 = await has(p, '9 phút');
    rec('TP1-02c', 'B05 "Lịch sử điều trị, n buổi": n bằng số buổi của vết (sessionsForWound); thẻ Buổi điều trị hiện tối đa 30, không có buổi 9 phút của VT02', label.startsWith(`Lịch sử điều trị, ${expect} buổi`) && onTab && shown === Math.min(30, expect) && !has9, `${label}; mong đợi ${expect}; hiện ${shown}; ${p.url().replace(BASE, '')}`);
    await p.context().close();
  }

  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p);
    await go(p, '/'); await mutate(p, VT02);
    await go(p, '/patients/p-1'); const o1 = await overflow(p); const s1 = await small(p);
    await go(p, '/wounds/w-1'); const o2 = await overflow(p);
    await go(p, '/patients/p-3'); const o3 = await overflow(p);
    rec(`TP1-UI-${w}`, `B04 (2 vết, bệnh nhân chưa giao máy), B05 ở ${w} px: không tràn ngang`, o1 + o2 + o3 === 0, `tràn ${o1}/${o2}/${o3}`);
    if (s1.length) rec(`TP1-UI-${w}-nho`, `Phần tử bấm < 44 px ở B04 (${w} px, màn đầu)`, 'note', s1.slice(0, 6).join('; '));
    if (p.errors.length) rec(`TP1-UI-${w}-js`, 'Lỗi JavaScript', false, p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  finish('p1-02');
})().catch((e) => { console.error(e); process.exit(2); });
