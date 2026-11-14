// Kiểm thử P2 (trải nghiệm bệnh nhân, biểu đồ tiến triển). Playwright trên bản web.
// Chạy: node scripts/kiem-thu-p2.cjs <baseURL> <thư mục kết quả> [--chi-anh <nhãn>] [--nhom <tên nhóm>]
// Dữ liệu thêm cho kiểm thử chỉ ghi vào bộ nhớ trình duyệt (localStorage) và gắn chữ "(minh họa)"; không sửa seed.ts.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8601';
const OUT = process.argv[3] || '.';
const arg = (k) => (process.argv.includes(k) ? process.argv[process.argv.indexOf(k) + 1] : null);
const SHOTS = arg('--chi-anh');
const GROUP = arg('--nhom');
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
  // Bỏ qua phần tử nằm trong vùng cuộn ngang có chủ đích (dải ảnh), chỉ tính tràn của trang.
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; const inHScroll = (e) => { for (let a = e.parentElement; a; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if ((ox === 'auto' || ox === 'scroll') && a.getBoundingClientRect().right <= W + 1) return true; } return false; }; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed' && !inHScroll(e); }).length; });
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


const SCREENS = {
  benhnhan: [['n02', '/patient'], ['n03', '/schedule'], ['n04', '/patient/history'], ['n05', '/wounds/w-1'], ['n06', '/plan/p-1'], ['n08', '/report'], ['n09', '/patient/account']],
  bacsi: [['b05', '/wounds/w-1']],
};
const GROUPS = {};
// Vị trí theo thứ tự tài liệu (DOM) của chữ khớp đúng; null nếu không có.
const yOf = (p, text) => p.evaluate((t) => { const all = [...document.querySelectorAll('body *')]; const i = all.findIndex((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === t)); return i < 0 ? null : i; }, text);
const TWO_WOUNDS = `
  if (!d.wounds.some((w) => w.id === 'w-kt2')) {
    d.wounds.push({ id: 'w-kt2', patientId: 'p-1', code: 'VT02', location: 'Gót chân trái (minh họa)', startDate: d.wounds[0].startDate, status: 'active' });
  }
`;

// PR-P2-1: trang chủ, lời dặn, hướng dẫn chung, cần chú ý.
GROUPS['p2-1'] = async (b, h) => {
  const { newPage, login, go, has, mutate, overflow } = h;
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p, 'benhnhan'); await go(p, '/patient');
    const ys = []; for (const t of ['Lịch hẹn gần nhất', 'Vết thương', 'Lời dặn của bác sĩ', 'Báo triệu chứng hoặc sự cố']) ys.push(await yOf(p, t));
    const order = ys.every((y) => y != null) && ys.every((y, i) => i === 0 || y > ys[i - 1]);
    rec(`P21-01-${w}`, `N02 ${w}px: hôm nay → vết thương → mục Lời dặn của bác sĩ → báo sự cố`, order, JSON.stringify(ys));
    rec(`P21-02-${w}`, `N02 ${w}px: lời dặn hiện ngày và tên bác sĩ mà không cần mở`, await has(p, /^\d{2}\/\d{2}\/\d{4} · BS\./, false));
    rec(`P21-03-${w}`, `N02 ${w}px: không tràn ngang`, (await overflow(p)) === 0);
    rec(`P21-04-${w}`, `N02 ${w}px: không có mục Cần chú ý khi không có yêu cầu chụp lại`, !(await has(p, 'Cần chú ý')));
    rec(`P21-05-${w}`, `N02 ${w}px: không lỗi JS`, p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/patient');
    const steps = await has(p, /^(Trước|Sau) khi điều trị$/, false);
    rec('P21-06', 'Danh sách Trước/Sau khi điều trị luôn ghi "Hướng dẫn chung (tham khảo)…" khi đang thu gọn', steps ? await has(p, 'Hướng dẫn chung (tham khảo), không thay lời dặn của bác sĩ.') : 'note', steps ? '' : 'Hôm nay không có danh sách bước (ngày nghỉ)');
    await mutate(p, `const im = d.images.find((i) => i.id === 'IMG0003'); im.retakeRequested = 'Ảnh mờ, cần chụp lại (minh họa)';`);
    await go(p, '/patient');
    const yA = await yOf(p, 'Cần chú ý'), yW = await yOf(p, 'Vết thương');
    rec('P21-07', 'Có yêu cầu chụp lại: mục Cần chú ý đứng trước mục Vết thương, ghi mã vết', yA != null && yW != null && yA < yW && await has(p, /^VT01: cần hẹn bác sĩ chụp lại ảnh/, false));
    await mutate(p, TWO_WOUNDS); await go(p, '/patient');
    rec('P21-08', 'Hai vết: mỗi vết một khối lời dặn có tên vết; vết chưa có đánh giá ghi "Bác sĩ chưa công bố lời dặn…"', await has(p, 'VT02: Gót chân trái (minh họa)') && await has(p, 'Bác sĩ chưa công bố lời dặn cho vết thương này.'));
    await mutate(p, `const e = d.evaluations.find((x) => x.woundId === 'w-1'); d.evaluations.push({ ...e, id: 'e-kt-old', date: '2026-10-01', instructions: 'Lời dặn cũ (minh họa)' });`);
    await go(p, '/patient');
    const link = p.getByRole('button', { name: 'Xem 1 lời dặn trước đó của VT01' });
    rec('P21-09', 'Có đánh giá cũ: hiện "Lời dặn trước đó (1)", chạm mở N05', (await link.count()) === 1);
    if (await link.count()) { await link.click(); await p.waitForTimeout(1200); rec('P21-10', 'Mở đúng N05 của VT01', p.url().includes('/wounds/w-1')); }
    rec('P21-11', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
};

// PR-P2-5: lịch trình (mốc dự kiến, mốc đã qua, ghi chú của bác sĩ về đợt).
GROUPS['p2-5'] = async (b, h) => {
  const { newPage, login, go, has, mutate, overflow } = h;
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p, 'benhnhan'); await go(p, '/schedule');
    rec(`P25-01-${w}`, `N03 ${w}px: mục "Mốc dự kiến" kèm câu "Ngày do ứng dụng tính…"`, await has(p, 'Mốc dự kiến') && await has(p, 'Ngày do ứng dụng tính từ lịch bác sĩ đặt. Hãy xác nhận với bác sĩ.'));
    rec(`P25-02-${w}`, `N03 ${w}px: không còn chữ "Lịch hẹn sắp tới"`, !(await has(p, 'Lịch hẹn sắp tới')));
    rec(`P25-03-${w}`, `N03 ${w}px: không tràn ngang`, (await overflow(p)) === 0);
    rec(`P25-04-${w}`, `N03 ${w}px: không lỗi JS`, p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/schedule');
    const st = await h.store(p);
    const plan = (st.plans || []).find((x) => x.patientId === 'p-1' && x.status === 'confirmed') || (st.plans || []).find((x) => x.patientId === 'p-1');
    if (plan) {
      await mutate(p, `const pl = d.plans.find((x) => x.id === '${plan.id}'); pl.notes = 'Ghi chú đợt (minh họa)';`);
      await go(p, '/schedule');
      const v = p.getByText('Ghi chú đợt (minh họa)', { exact: true });
      rec('P25-05', 'Ghi chú của bác sĩ về đợt hiện ngay, không cần mở "Các giai đoạn"', (await v.count()) > 0 && await v.first().isVisible() && await has(p, 'Ghi chú của bác sĩ về đợt'));
    } else rec('P25-05', 'Ghi chú của bác sĩ về đợt', 'note', 'Không có đợt của p-1');
    const before = await has(p, 'Mốc đã qua');
    await mutate(p, `const e = d.evaluations.find((x) => x.woundId === 'w-1' && x.visibleToPatient); d.evaluations.push({ ...e, id: 'e-kt-past', date: '2026-09-01', nextReview: '2026-09-15', instructions: 'Lời dặn cũ (minh họa)' });`);
    await go(p, '/schedule');
    const dis = p.getByText('Mốc đã qua', { exact: true });
    rec('P25-06', 'Có ngày tái đánh giá đã qua: hiện mục "Mốc đã qua" (thu gọn)', (await dis.count()) > 0, `trước khi thêm: ${before}`);
    if (await dis.count()) {
      await dis.first().click(); await p.waitForTimeout(500);
      rec('P25-07', 'Mở "Mốc đã qua": có dòng "Tái đánh giá với bác sĩ VT01" và câu không ghi đã khám', await has(p, 'Tái đánh giá với bác sĩ VT01') && await has(p, 'Ứng dụng chỉ ghi ngày dự kiến, không ghi đã khám hay chưa.'));
    }
    await mutate(p, `d.evaluations = d.evaluations.map((x) => x.id === 'e-kt-past' ? { ...x, visibleToPatient: false } : x);`);
    await go(p, '/schedule');
    await has(p, 'Mốc đã qua') && await p.getByText('Mốc đã qua', { exact: true }).first().click();
    rec('P25-08', 'Đánh giá chưa công bố không tạo mốc đã qua', !(await has(p, /15\/09\/2026/, false)) && !(await p.getByLabel(/^15\/09\/2026: /).count()));
    rec('P25-09', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
};

// PR-P2-6: báo triệu chứng (nhóm câu hỏi, hỏi trước khi bỏ dữ liệu, mục Đã gửi).
GROUPS['p2-6'] = async (b, h) => {
  const { newPage, login, go, has, mutate, overflow, back } = h;
  const open = async (p) => { await go(p, '/patient'); await p.getByText('Báo triệu chứng hoặc sự cố', { exact: true }).last().click(); await p.waitForTimeout(1200); };
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p, 'benhnhan'); await go(p, '/report');
    rec(`P26-01-${w}`, `N08 ${w}px: hai nhóm "Mức đau (0 là không đau, 10 là đau nhất)" và "Mô tả thêm (không bắt buộc)"`, await has(p, 'Mức đau (0 là không đau, 10 là đau nhất)') && await has(p, 'Mô tả thêm (không bắt buộc)'));
    rec(`P26-02-${w}`, `N08 ${w}px: giữ 11 mức đau 0..10 và nhãn hai đầu thang`, (await p.getByRole('radio').count()) === 11 && await has(p, '0: không đau') && await has(p, '10: đau nhất'));
    rec(`P26-03-${w}`, `N08 ${w}px: không tràn ngang`, (await overflow(p)) === 0);
    rec(`P26-04-${w}`, `N08 ${w}px: không lỗi JS`, p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'benhnhan');
    const n0 = (await h.store(p)).reports.length;
    await open(p);
    const mine0 = (await h.store(p)).reports.filter((r) => r.patientId === 'p-1').length;
    rec('P26-05', 'Mục "Đã gửi" hiện khi và chỉ khi bệnh nhân có báo cáo đã gửi', (await has(p, 'Đã gửi')) === mine0 > 0, `báo cáo của p-1 trong dữ liệu mẫu: ${mine0}`);
    await p.getByRole('radio', { name: /^Mức đau 8/ }).click(); await p.waitForTimeout(300);
    rec('P26-06', 'Ngưỡng 7 giữ nguyên: chọn 8 hiện câu cảnh báo cũ', await has(p, 'Mức đau 8/10 là cao. Hãy gọi bác sĩ hoặc đến cơ sở y tế ngay. Đồng thời, gửi báo cáo này.'));
    p.answer = false; await back(p);
    rec('P26-07', 'Đã chọn mức đau mà bấm Quay lại: hỏi "Bỏ dữ liệu chưa lưu?", chọn Ở lại thì còn ở N08', p.dialogs.some((d) => d.includes('Bỏ dữ liệu chưa lưu?')) && p.url().includes('/report'), p.dialogs.join(' / ').slice(0, 120));
    await p.getByText('Gửi', { exact: true }).last().click(); await p.waitForTimeout(1200);
    const st = await h.store(p);
    rec('P26-08', 'Gửi: lưu 1 báo cáo, quay lại không hỏi bỏ dữ liệu', st.reports.length === n0 + 1 && !p.url().includes('/report') && p.dialogs.filter((d) => d.includes('Bỏ dữ liệu chưa lưu?')).length === 1, p.url());
    await open(p);
    const dis = p.getByText('Đã gửi', { exact: true });
    rec('P26-09', 'Mở lại N08: có mục "Đã gửi"', (await dis.count()) > 0);
    if (await dis.count()) { await dis.first().click(); await p.waitForTimeout(400); }
    rec('P26-10', 'Báo cáo vừa gửi hiện mức đau 8/10 và "Chưa được xử lý"', await has(p, /Triệu chứng · Mức đau 8\/10$/, false) && await has(p, 'Chưa được xử lý'));
    await mutate(p, `d.reports = d.reports.map((r, i) => i === 0 ? { ...r, handled: true } : r);`);
    await go(p, '/report'); await p.getByText('Đã gửi', { exact: true }).first().click(); await p.waitForTimeout(400);
    rec('P26-11', 'Bác sĩ đánh dấu đã xử lý: hiện "Bác sĩ đã đánh dấu đã xử lý"', await has(p, 'Bác sĩ đã đánh dấu đã xử lý'));
    await mutate(p, `d.reports.unshift({ id: 'r-kt-khac', patientId: 'p-khac', date: new Date().toISOString(), kind: 'symptom', content: 'Báo cáo người khác (minh họa)', handled: false });`);
    await go(p, '/report'); await p.getByText('Đã gửi', { exact: true }).first().click(); await p.waitForTimeout(400);
    rec('P26-12', 'Không hiện báo cáo của bệnh nhân khác', !(await has(p, 'Báo cáo người khác (minh họa)')));
    rec('P26-13', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
};

// PR-P2-2: biểu đồ đường tiến triển diện tích (N05 bệnh nhân, B05 bác sĩ). Ca G01 đến G22 trong Test Plan.
const BAN = ['lành', 'hồi phục', 'tốt lên', 'xấu đi', 'dự kiến lành'];
const CAVEAT = 'Số đo cho biết kích thước vết thương. Việc vết thương hồi phục ra sao do bác sĩ đánh giá.';
// Điểm trên biểu đồ: tâm các dấu (tròn r 5 hoặc 7; tròn rỗng r 4 là ảnh chưa đo; vuông, tam giác là phương pháp khác).
const marks = (p) => p.evaluate(() => {
  const svg = document.querySelector('[data-testid="bieu-do-dien-tich"] svg'); if (!svg) return null;
  const c = [...svg.querySelectorAll('circle')].map((e) => ({ x: +e.getAttribute('cx'), y: +e.getAttribute('cy'), r: +e.getAttribute('r') }));
  return { pts: c.filter((e) => e.r >= 5).sort((a, b) => a.x - b.x), hollow: c.filter((e) => e.r === 4).length, rects: svg.querySelectorAll('rect').length, tris: svg.querySelectorAll('polygon').length, lines: svg.querySelectorAll('polyline').length, labels: [...svg.querySelectorAll('text')].map((t) => t.textContent) };
});
const cardText = (p) => p.evaluate(() => document.querySelector('[data-testid="tien-trien-dien-tich"]')?.innerText ?? '');
// Ảnh minh họa cho kiểm thử: chép một ảnh có sẵn, chỉ ghi vào localStorage của trình duyệt.
const addImg = (id, woundId, daysAgo, area, method, status = 'labeled') => `
  const src = d.images.find((i) => i.id === 'IMG0003'); const t = new Date(); t.setDate(t.getDate() - ${daysAgo});
  const day = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
  d.images.push({ ...src, id: '${id}', woundId: '${woundId}', captureDate: day, areaCm2: ${area}, measureMethod: ${JSON.stringify(method)}, status: '${status}', retakeRequested: undefined,
    history: ${area === null ? '[]' : `[{ at: day + 'T09:00:00.000Z', by: src.history[0]?.by ?? 'u-bs', fromStatus: 'unlabeled', toStatus: 'labeled', fromArea: null, toArea: ${area} }]`}, capture: { ...(src.capture || {}), sourceDateKnown: true, manualReference: undefined } });
`;
GROUPS['p2-2'] = async (b, h) => {
  // N05 trang tổng quan: biểu đồ đầy đủ của bệnh nhân chuyển sang màn riêng "Lịch sử đo" (wound-history, thẻ Số đo), cùng AreaProgress.
  // Các ca giữ nguyên, chỉ đổi màn kiểm. Nhãn "N05" trong tên ca giữ để đối chiếu với kết quả cũ.
  const { newPage, login, go, has, mutate, overflow } = h;
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p, 'benhnhan'); await go(p, '/wound-history/w-1?tab=dien-tich');
    const m = await marks(p); const txt = await cardText(p);
    rec(`P22-01-${w}`, `N05 ${w}px (G04): biểu đồ đường, 3 dấu điểm, 1 đường, không còn cột`, !!m && m.pts.length === 3 && m.lines === 1, JSON.stringify(m && { n: m.pts.length, l: m.lines }));
    rec(`P22-02-${w}`, `N05 ${w}px (G05, C15): "↓ Giảm 32,8% so với lần đo đầu", câu có ngày hai mốc`, txt.includes('↓ Giảm 32,8% so với lần đo đầu') && /Diện tích giảm từ 12,5 cm² \(\d\d\/\d\d\) xuống 8,4 cm² \(\d\d\/\d\d\), sau 14 ngày\./.test(txt));
    rec(`P22-03-${w}`, `N05 ${w}px (QĐ-P2-2): không còn chip "Giảm 33% từ đầu đợt"`, !(await has(p, 'Giảm 33% từ đầu đợt')));
    const xs = m ? m.pts.map((q) => q.x) : [];
    rec(`P22-04-${w}`, `N05 ${w}px (G08): trục X tỉ lệ ngày (3 lần đo cách 7 ngày, khoảng cách bằng nhau)`, xs.length === 3 && Math.abs((xs[1] - xs[0]) - (xs[2] - xs[1])) <= 1, xs.map(Math.round).join(','));
    const dates = m ? m.labels.filter((t) => /^\d\d\/\d\d$/.test(t)) : [];
    rec(`P22-05-${w}`, `N05 ${w}px (G17): tối đa ${w >= 600 ? 6 : 4} nhãn ngày, có nhãn đầu và cuối`, dates.length >= 2 && dates.length <= (w >= 600 ? 6 : 4), dates.join(' '));
    rec(`P22-06-${w}`, `N05 ${w}px (G18): không từ đánh giá tự sinh trong thẻ (trừ câu nhắc cố định)`, !BAN.some((x) => txt.replace(CAVEAT, '').toLowerCase().includes(x)) && txt.includes(CAVEAT));
    rec(`P22-07-${w}`, `N05 ${w}px: không tràn ngang`, (await overflow(p)) === 0);
    rec(`P22-08-${w}`, `N05 ${w}px: không lỗi JS`, p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/wound-history/w-1?tab=dien-tich');
    const head = p.getByText('↓ Giảm 32,8% so với lần đo đầu', { exact: true });
    const color = await head.evaluate((e) => getComputedStyle(e).color);
    rec('P22-09', 'G05: dòng giảm dùng màu nhấn của ứng dụng (#0B6B6F), không xanh lá', color === 'rgb(11, 107, 111)', color);
    const label = await p.getByTestId('bieu-do-dien-tich').getAttribute('aria-label');
    rec('P22-10', 'G16: nhãn trợ năng tóm tắt, ngày viết đầy đủ, không từ chủ quan', /^Biểu đồ đường diện tích vết thương VT01\. 3 lần đo từ ngày \d+ tháng \d+ năm \d{4} đến ngày \d+ tháng \d+ năm \d{4}\. Trục dọc từ 0 đến 15 xăng ti mét vuông\. Lần đầu 12,5; gần nhất 8,4\.$/.test(label || '') && !BAN.some((x) => (label || '').includes(x)), label);
    const m = await marks(p);
    rec('P22-11', 'G09: ảnh chưa đo có ngày rõ hiện dấu tròn rỗng; có dòng "Không đưa vào biểu đồ: 1 ảnh chưa đo."', m.hollow === 1 && await has(p, 'Không đưa vào biểu đồ: 1 ảnh chưa đo.'), `rỗng ${m.hollow}`);
    // G12: chạm đúng X của từng điểm.
    await p.getByTestId('bieu-do-dien-tich').scrollIntoViewIfNeeded();
    const box = await p.getByTestId('bieu-do-dien-tich').boundingBox();
    const got = [];
    for (const q of m.pts) { await p.mouse.click(box.x + q.x, box.y + 100); await p.waitForTimeout(250); got.push(await p.getByTestId('chi-tiet-lan-do').evaluate((e) => e.innerText.split('\n')[0]).catch(() => '')); }
    rec('P22-12', 'G12: chạm vùng vẽ tại X của từng điểm mở đúng ngày ở vùng chi tiết', got.length === 3 && got.every((g) => /^Ngày đo \d\d\/\d\d\/\d{4}/.test(g)) && new Set(got).size === 3, got.join(' | '));
    const det = await p.getByTestId('chi-tiet-lan-do').innerText();
    rec('P22-13', 'G12: vùng chi tiết có diện tích, phương pháp, nguồn, người nhập, ảnh', det.includes('8,4 cm²') && det.includes('Phương pháp:') && det.includes('Bác sĩ nhập') && /Nhập bởi BS\./.test(det) && det.includes('IMG0003'), det.replace(/\n/g, ' / ').slice(0, 200));
    await p.getByText('Các lần đo (3)', { exact: true }).click(); await p.waitForTimeout(300);
    const rows = p.getByRole('button', { name: /^\d\d\/\d\d\/\d{4}, \d+,\d cm², / });
    rec('P22-14', 'Danh sách các lần đo: 3 dòng, mới trước', (await rows.count()) === 3);
    await rows.nth(2).click(); await p.waitForTimeout(300);
    rec('P22-15', 'G12: chạm dòng cũ nhất chọn điểm đầu', (await p.getByTestId('chi-tiet-lan-do').innerText()).includes('12,5 cm²'));
    await p.getByRole('button', { name: 'Mở ảnh của lần đo này' }).click(); await p.waitForTimeout(1200);
    rec('P22-16', 'G13: "Mở ảnh của lần đo này" mở đúng ảnh IMG0001', /\/images\/IMG0001/.test(p.url()), p.url());
    rec('P22-17', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  // G11, G22: hai phương pháp. Lần đo gần nhất bằng phần mềm thì phần mềm là nhóm chính.
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/wound-history/w-1?tab=dien-tich');
    await mutate(p, `d.images.find((i) => i.id === 'IMG0003').measureMethod = 'Phần mềm đo trên ảnh';` + addImg('IMG-KT01', 'w-1', 5, 7.9, 'Phần mềm đo trên ảnh'));
    await go(p, '/wound-history/w-1?tab=dien-tich');
    const off = await marks(p); const t0 = await cardText(p);
    rec('P22-18', 'G11 tắt: chỉ vẽ nhóm chính (2 điểm), dòng "Ẩn 2 lần đo bằng phương pháp khác."', off.pts.length === 2 && off.rects === 0 && t0.includes('Đang hiện 2 lần đo bằng Phần mềm đo trên ảnh. Ẩn 2 lần đo bằng phương pháp khác.'), JSON.stringify({ n: off.pts.length }));
    const pct0 = (t0.match(/[↓↑] (Giảm|Tăng) [\d,]+%/) || [])[0];
    rec('P22-19', 'C11: % tính trong nhóm chính (8,4 → 7,9 = 6,0%)', pct0 === '↓ Giảm 6,0%', pct0);
    await p.getByRole('button', { name: 'Hiện cả phương pháp khác' }).click(); await p.waitForTimeout(400);
    const on = await marks(p); const t1 = await cardText(p);
    rec('P22-20', 'G11 bật: phương pháp khác vẽ dấu vuông, đường riêng, có chú thích; % không đổi', on.rects === 2 && on.lines === 2 && t1.includes('Vuông: Thước giấy kẻ ô vô trùng (mô phỏng)') && (t1.match(/[↓↑] (Giảm|Tăng) [\d,]+%/) || [])[0] === pct0, JSON.stringify({ r: on.rects, l: on.lines }));
    rec('P22-21', 'G11: nút đổi thành "Chỉ hiện phương pháp chính"', (await p.getByRole('button', { name: 'Chỉ hiện phương pháp chính' }).count()) === 1);
    // G22: chỉ một phương pháp thì không có dòng ẩn, nút, chú thích.
    await mutate(p, `d.images.forEach((i) => { if (i.woundId === 'w-1' && i.areaCm2 !== null) i.measureMethod = 'Phần mềm đo trên ảnh'; });`);
    await go(p, '/wound-history/w-1?tab=dien-tich');
    const one = await marks(p); const t2 = await cardText(p);
    rec('P22-22', 'G22: một phương pháp: một đường liền, không nút, không chú thích phương pháp', one.lines === 1 && one.pts.length === 4 && !t2.includes('Hiện cả phương pháp khác') && !t2.includes('Đang hiện'));
    // G08: 7 ngày rồi 7 ngày rồi khoảng tới IMG-KT01; khoảng cách tỉ lệ số ngày.
    const xs = one.pts.map((q) => q.x);
    const st = await h.store(p); const ds = st.images.filter((i) => i.woundId === 'w-1' && i.areaCm2 !== null && i.status === 'labeled').map((i) => i.captureDate).sort();
    const day = (s) => Date.parse(s + 'T00:00:00Z') / 864e5;
    const ratio = (xs[3] - xs[2]) / (xs[1] - xs[0]), want = (day(ds[3]) - day(ds[2])) / (day(ds[1]) - day(ds[0]));
    rec('P22-23', 'G08: khoảng cách X tỉ lệ số ngày giữa các lần đo', Math.abs(ratio - want) < 0.05, `đo ${ratio.toFixed(2)}, cần ${want.toFixed(2)}`);
    // G14: thêm lần đo cũ 200 ngày: có bộ chọn khoảng; "1 tháng" lọc bớt.
    await mutate(p, addImg('IMG-KT02', 'w-1', 200, 15, 'Phần mềm đo trên ảnh'));
    await go(p, '/wound-history/w-1?tab=dien-tich');
    const tabs = await p.getByRole('tab').allInnerTexts();
    rec('P22-24', 'G14: có lần đo ngoài 6 tháng thì hiện bộ chọn 1/3/6 tháng và Toàn bộ', ['1 tháng', '3 tháng', '6 tháng', 'Toàn bộ'].every((x) => tabs.includes(x)), tabs.join(','));
    const nAll = (await marks(p)).pts.length;
    await p.getByRole('tab', { name: '1 tháng' }).click(); await p.waitForTimeout(400);
    const n1 = (await marks(p)).pts.length; const t3 = await cardText(p);
    rec('P22-25', 'G14: chọn 1 tháng bỏ lần đo cũ, tóm tắt và danh sách theo khoảng', nAll === 5 && n1 === 4 && t3.includes('Các lần đo (4)'), `${nAll} → ${n1}`);
    await p.getByRole('button', { name: /^Ảnh IMG/ }).count();
    await p.goto(BASE + '/patient'); await p.waitForTimeout(800);
    await p.evaluate(() => history.back()); await p.waitForTimeout(1500);
    rec('P22-26', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  // G01, G02, G06: vết không ảnh, vết một lần đo, vết tăng.
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/patient');
    await mutate(p, TWO_WOUNDS); await go(p, '/wound-history/w-kt2?tab=dien-tich');
    rec('P22-27', 'G01: vết chưa có ảnh: câu trạng thái, không vẽ trục', await has(p, 'Chưa có ảnh vết thương. Bác sĩ sẽ chụp và đo ở lần khám.') && !(await marks(p)));
    await mutate(p, addImg('IMG-KT03', 'w-kt2', 10, null, '', 'unlabeled')); await go(p, '/wound-history/w-kt2?tab=dien-tich');
    rec('P22-28', 'G01: có ảnh chưa đo: "Chưa có lần đo diện tích. Ảnh đã chụp: 1."', await has(p, 'Chưa có lần đo diện tích. Ảnh đã chụp: 1.') && !(await marks(p)));
    await mutate(p, addImg('IMG-KT04', 'w-kt2', 8, 6, 'Phần mềm đo trên ảnh')); await go(p, '/wound-history/w-kt2?tab=dien-tich');
    rec('P22-29', 'G02: một lần đo: thẻ số, câu cần thêm lần đo, không đường', await has(p, 'Mới có 1 lần đo. Cần thêm lần đo để thấy sự thay đổi.') && !(await marks(p)));
    await mutate(p, addImg('IMG-KT05', 'w-kt2', 1, 6.75, 'Phần mềm đo trên ảnh')); await go(p, '/wound-history/w-kt2?tab=dien-tich');
    const up = p.getByText('↑ Tăng 12,5% so với lần đo đầu', { exact: true });
    const c = (await up.count()) ? await up.evaluate((e) => getComputedStyle(e).color) : '';
    rec('P22-30', 'G06: tăng: "↑ Tăng 12,5%", cùng màu nhấn, không cảnh báo', c === 'rgb(11, 107, 111)' && !(await has(p, /chậm|cảnh báo|bất thường/i, false)), c);
    rec('P22-31', 'G21: vết chưa có đánh giá công bố: không chip xu hướng, không chữ "Cải thiện"', !(await cardText(p)).includes('Cải thiện'));
    rec('P22-32', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  // G20: B05 bác sĩ cùng biểu đồ đường, vạch đợt, ReviewNote và chip đầu đợt giữ nguyên.
  // Giao diện theo tác vụ, giai đoạn 1: biểu đồ bác sĩ chuyển từ B05 sang "Tiến triển và lịch sử" (wound-history, thẻ Diện tích);
  // chip đầu đợt và mốc 50% vẫn ở B05. Cùng các ca, chỉ đổi màn kiểm.
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p, 'bacsi'); await go(p, '/wounds/w-1');
    rec(`P22-34-${w}`, `B05 ${w}px: chip "Giảm 33% từ đầu đợt" và mốc 50% của bác sĩ giữ nguyên`, await has(p, 'Giảm 33% từ đầu đợt') && await has(p, /^Mốc \d\d\/\d\d\/\d{4}: chưa tới 50%$/, false));
    rec(`P22-35-${w}`, `B05 ${w}px: không tràn ngang, không lỗi JS`, (await overflow(p)) === 0 && p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    if (w === 390) {
      // ReviewNote nằm trong thẻ đợt điều trị, vẫn ở B05.
      await p.getByText(/^Giai đoạn \d trên \d$/).first().click(); await p.waitForTimeout(300);
      rec('P22-36', 'G20: ReviewNote cùng chữ, cùng số như trước', await has(p, 'Diện tích 12,5 → 8,4 cm², giảm 33% so với đầu đợt.'));
    }
    await go(p, '/wound-history/w-1?tab=dien-tich');
    const m = await marks(p);
    rec(`P22-33-${w}`, `Lịch sử VT01 ${w}px (G20): biểu đồ đường 3 điểm, vạch "Đợt 1"`, !!m && m.pts.length === 3 && m.labels.includes('Đợt 1'));
    if (w === 390) {
      rec('P22-37', 'Lịch sử VT01: "Đo 1 ảnh chưa đo" mở ảnh chưa đo mới nhất', (await p.getByRole('button', { name: 'Đo 1 ảnh chưa đo' }).count()) === 1);
      await p.getByTestId('bieu-do-dien-tich').scrollIntoViewIfNeeded();
      const box = await p.getByTestId('bieu-do-dien-tich').boundingBox();
      await p.mouse.click(box.x + m.pts[2].x, box.y + 100); await p.waitForTimeout(300);
      await p.getByRole('button', { name: 'Mở ảnh để xem hoặc sửa số đo' }).click(); await p.waitForTimeout(1200);
      rec('P22-38', 'G20: "Mở ảnh để xem hoặc sửa số đo" mở B11 của điểm chọn', /\/images\/IMG0003/.test(p.url()), p.url());
    }
    await p.context().close();
  }
};

// PR-P2-3: ảnh theo thời gian nối với điểm biểu đồ, lịch sử vết thương ở N05, N04 sắp lại.
GROUPS['p2-3'] = async (b, h) => {
  const { newPage, login, go, has, mutate, overflow } = h;
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p, 'benhnhan'); await go(p, '/wound-history/w-1?tab=dien-tich');
    const tiles = await p.getByRole('button', { name: /^Ảnh chụp / }).evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    const ds = tiles.map((l) => (l.match(/(\d\d)\/(\d\d)\/(\d{4})/) || []).slice(1).reverse().join(''));
    rec(`P23-01-${w}`, `N05 ${w}px: "Ảnh theo thời gian" có đủ 4 ảnh, mới trước, ghi "Có số đo" hoặc "Chưa đo"`, await has(p, 'Ảnh theo thời gian') && tiles.length === 4 && ds.every((d, i) => i === 0 || ds[i - 1] >= d) && tiles.filter((l) => l.includes('Có số đo:')).length === 3 && tiles.filter((l) => l.includes('Chưa đo')).length === 1, tiles.length + ' ảnh');
    rec(`P23-02-${w}`, `N05 ${w}px: phía bệnh nhân không còn mục Album ảnh`, !(await has(p, 'Album ảnh')));
    rec(`P23-03-${w}`, `N05 ${w}px: không tràn ngang, không lỗi JS`, (await overflow(p)) === 0 && p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/wound-history/w-1?tab=dien-tich');
    await p.getByRole('button', { name: /^Ảnh chụp .*Có số đo: 10,2 cm²/ }).click(); await p.waitForTimeout(300);
    const det = await p.getByTestId('chi-tiet-lan-do').innerText().catch(() => '');
    rec('P23-04', 'G13: chạm ảnh có số đo trong dải chọn đúng điểm của chính ảnh đó (IMG0002, 10,2 cm²)', det.includes('10,2 cm²') && det.includes('IMG0002'), det.split('\n')[0]);
    const m = await marks(p); const sel = m.pts.find((q) => q.r === 7);
    rec('P23-05', 'Điểm được chọn trên biểu đồ là điểm giữa (vòng to hơn)', !!sel && sel.x === m.pts[1].x);
    await p.getByRole('button', { name: /^Ảnh chụp .*Chưa đo/ }).click(); await p.waitForTimeout(1200);
    rec('P23-06', 'Chạm ảnh chưa đo mở ảnh đó (IMG0004)', /\/images\/IMG0004/.test(p.url()), p.url());
    await go(p, '/wounds/w-1');
    // N05: mục "Ảnh và lịch sử vết thương" hai thẻ; danh sách P2-07a nằm ở thẻ Lịch sử (mặc định thẻ Ảnh), giữ nguyên.
    const tl = p.getByRole('tab', { name: /^Lịch sử \(\d+\)$/ });
    rec('P23-07', 'N05 có thẻ "Lịch sử (n)", mặc định thẻ Ảnh nên danh sách chưa hiện', (await tl.count()) === 1 && (await p.getByTestId('muc-lich-su').count()) === 0);
    await tl.click(); await p.waitForTimeout(1200);
    // N05 hiện 5 mục đầu; mở đủ để kiểm nội dung như trước.
    const more = p.getByText(/^Xem thêm \(\d+\)$/); if (await more.count()) { await more.first().click(); await p.waitForTimeout(400); }
    const items = await p.getByTestId('muc-lich-su').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    rec('P23-08', 'Lịch sử: lần đo "Đo 8,4 cm²", ảnh chưa đo, nhận xét đã công bố; mới trước', items.some((l) => l.startsWith('Lần đo: Đo 8,4 cm²')) && items.some((l) => l.startsWith('Ảnh: Ảnh, chưa có số đo')) && items.some((l) => l.startsWith('Nhận xét: ')), items.slice(0, 3).join(' / ').slice(0, 200));
    // Đánh giá chưa công bố không vào lịch sử của bệnh nhân; buổi có woundId đúng vết thì vào.
    await mutate(p, `const e = d.evaluations.find((x) => x.woundId === 'w-1'); d.evaluations.push({ ...e, id: 'e-kt-noi-bo', date: '2026-11-12', visibleToPatient: false });
      const pt = d.patients.find((x) => x.id === 'p-1'); const s0 = d.sessions.find((x) => x.deviceId === pt.deviceId); d.sessions.push({ ...s0, sessionId: 'kt-gan-vet', start: '2026-11-12T08:00:00.000Z', woundId: 'w-1' }); d.sessions.push({ ...s0, sessionId: 'kt-khong-gan', start: '2026-11-12T09:00:00.000Z', durationMin: 7, woundId: undefined });`);
    await go(p, '/wound-history/w-1?tab=lich-su');
    const items2 = await p.getByTestId('muc-lich-su').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    rec('P23-09', 'Buổi không gắn vết (7 phút, minh họa) không đưa vào lịch sử của vết (A26)', !items2.some((l) => l.includes('Buổi điều trị 7 phút')));
    rec('P23-10', 'Buổi có woundId đúng vết vào lịch sử; đánh giá nội bộ không vào', items2.some((l) => l.includes('16:00 12/11/2026') || l.includes('15:00 12/11/2026') || l.includes('08:00 12/11/2026')) && items2.filter((l) => l.startsWith('Nhận xét')).length === items.filter((l) => l.startsWith('Nhận xét')).length, `${items.length} → ${items2.length}`);
    rec('P23-11', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p, 'benhnhan'); await go(p, '/patient/history');
    const ys = []; for (const t of ['Vết thương đang theo dõi', 'Các buổi điều trị gần đây', 'Thông tin cá nhân']) ys.push(await yOf(p, t));
    rec(`P23-12-${w}`, `N04 ${w}px: vết thương lên đầu, rồi buổi điều trị, thông tin cá nhân cuối`, ys.every((y) => y != null) && ys[0] < ys[1] && ys[1] < ys[2], JSON.stringify(ys));
    rec(`P23-13-${w}`, `N04 ${w}px: không tràn ngang, không lỗi JS`, (await overflow(p)) === 0 && p.errors.length === 0);
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/patient');
    await mutate(p, TWO_WOUNDS + `const pt = d.patients.find((x) => x.id === 'p-1'); const s0 = d.sessions.find((x) => x.deviceId === pt.deviceId); d.sessions.push({ ...s0, sessionId: 'kt-khong-gan', start: new Date().toISOString(), woundId: undefined });`); await go(p, '/patient/history');
    rec('P23-14', 'N04 hai vết: buổi không gắn vết ghi "Chưa gắn vết thương", buổi gắn vết ghi mã vết', (await p.getByRole('button', { name: /^Buổi .*Chưa gắn vết thương\./ }).count()) === 1 && (await p.getByRole('button', { name: /^Buổi .*, VT01\./ }).count()) > 0);
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'bacsi'); await go(p, '/wounds/w-1');
    // Giai đoạn 1 giao diện theo tác vụ: album bác sĩ chuyển sang wound-history thẻ Ảnh; B05 vẫn không có dải ảnh và lịch sử của bệnh nhân.
    rec('P23-15', 'B05 bác sĩ không có dải ảnh và lịch sử bệnh nhân; album ở "Tiến triển và lịch sử"', !(await has(p, 'Ảnh theo thời gian')) && !(await p.getByText(/^Lịch sử vết thương/).count()) && (await p.getByRole('button', { name: /^Ảnh và số đo, / }).count()) === 1);
    await p.context().close();
  }
};

// PR-P2-4: thẻ vết thương ở trang chủ (N02) rút gọn, dòng thay đổi trung tính, chip mức độ và xu hướng chuyển sang N05.
GROUPS['p2-4'] = async (b, h) => {
  const { newPage, login, go, has, mutate, overflow } = h;
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p, 'benhnhan'); await go(p, '/patient');
    const card = p.getByRole('button', { name: /^VT01: .*Xem tiến triển$/ });
    rec(`P24-01-${w}`, `N02 ${w}px: cả thẻ VT01 chạm được, nhãn kết thúc "Xem tiến triển"`, (await card.count()) === 1);
    rec(`P24-02-${w}`, `N02 ${w}px: "Lần đo gần nhất: 8,4 cm², ngày dd/MM" và "↓ Giảm 32,8% so với lần đo dd/MM"`, await has(p, /^Lần đo gần nhất: 8,4 cm², ngày \d\d\/\d\d$/, false) && await has(p, /^↓ Giảm 32,8% so với lần đo \d\d\/\d\d$/, false));
    rec(`P24-03-${w}`, `N02 ${w}px (QĐ-P2-3, QĐ-P2-2): không chip mức độ, không chip "từ đầu đợt"`, !(await has(p, /^Mức độ: /, false)) && !(await has(p, /từ đầu đợt$/, false)));
    rec(`P24-04-${w}`, `N02 ${w}px: nhận định của bác sĩ ghi bằng chữ kèm ngày`, await has(p, /^Bác sĩ đánh giá \d\d\/\d\d: Cải thiện$/, false));
    rec(`P24-05-${w}`, `N02 ${w}px: không tràn ngang, không lỗi JS`, (await overflow(p)) === 0 && p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/patient');
    const color = await p.getByText(/^↓ Giảm 32,8%/).first().evaluate((e) => getComputedStyle(e).color);
    rec('P24-06', 'Dòng thay đổi dùng màu nhấn của ứng dụng, không xanh lá', color === 'rgb(11, 107, 111)', color);
    await p.getByRole('button', { name: /^VT01: .*Xem tiến triển$/ }).click(); await p.waitForTimeout(1200);
    rec('P24-07', 'Chạm thẻ mở N05 của VT01, có chip mức độ ở N05', p.url().includes('/wounds/w-1') && await has(p, /^Mức độ /, false));
    await go(p, '/patient'); await mutate(p, TWO_WOUNDS); await go(p, '/patient');
    rec('P24-08', 'Vết chưa có số đo, chưa đánh giá: "Chưa có số đo do bác sĩ nhập." và câu không suy ra mức độ', await has(p, 'Chưa có số đo do bác sĩ nhập.') && await has(p, 'Chưa có đánh giá được công bố. Không suy ra mức độ từ diện tích.'));
    rec('P24-09', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
};

// PR-P2-7: điều hướng và trợ năng, kiểm mọi màn bệnh nhân ở 320 đến 768 px.
GROUPS['p2-7'] = async (b, h) => {
  const { newPage, login, go, has, overflow } = h;
  // Đích chạm nhỏ hơn 44 px, bỏ qua phần tử trong vùng aria-hidden (chỉ để nhìn).
  const tiny = (p) => p.evaluate(() => [...document.querySelectorAll('[role="button"],[role="radio"],[role="tab"],[role="link"],[role="switch"],[role="checkbox"]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && (r.height < 44 || r.width < 44) && !e.closest('[aria-hidden="true"]'); }).map((e) => `${(e.getAttribute('aria-label') || e.textContent || '').slice(0, 30)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  const minFont = (p) => p.evaluate(() => Math.min(...[...document.querySelectorAll('div,span')].filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && !/ionicons/i.test(getComputedStyle(e).fontFamily)).map((e) => parseFloat(getComputedStyle(e).fontSize))));
  const cut = (p) => p.evaluate(() => [...document.querySelectorAll('[role="heading"]')].filter((e) => e.scrollWidth > e.clientWidth + 1).map((e) => e.textContent.slice(0, 30)));
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p, 'benhnhan');
    await go(p, '/patient/history');
    rec(`P27-01-${w}`, `N04 ${w}px: tiêu đề "Lịch sử và hồ sơ" (khớp tab Lịch sử)`, await has(p, 'Lịch sử và hồ sơ') && !(await has(p, 'Hồ sơ và lịch sử')));
    await go(p, '/patient/account');
    const t9 = await tiny(p);
    rec(`P27-02-${w}`, `N09 ${w}px (A29): không còn đích chạm 40×20`, t9.length === 0, t9.join(', '));
    for (const [code, url] of SCREENS.benhnhan) {
      await go(p, url);
      const o = await overflow(p), f = await minFont(p), c = await cut(p), t = code === 'n03' ? [] : await tiny(p);
      rec(`P27-03-${code}-${w}`, `${code.toUpperCase()} ${w}px: không tràn ngang, chữ ≥ 12 px, tiêu đề không cắt, đích chạm ≥ 44 px`, o === 0 && f >= 12 && c.length === 0 && t.length === 0, `tràn ${o}, chữ nhỏ nhất ${f}, cắt ${c.join('/')}, nhỏ ${t.slice(0, 3).join(', ')}`);
    }
    rec(`P27-04-${w}`, `${w}px: không lỗi JS`, p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  {
    const p = await newPage(320); await login(p, 'benhnhan'); await go(p, '/schedule');
    const days = await p.evaluate(() => [...document.querySelectorAll('[role="button"]')].filter((e) => /^Ngày \d+ tháng/.test(e.getAttribute('aria-label') || '')).map((e) => Math.round(e.getBoundingClientRect().width)));
    rec('P27-05', 'N03 320 px: ô ngày của lịch tháng (có sẵn từ trước P2) rộng dưới 44 px, ghi nhận để xử lý sau', 'note', `rộng ${Math.min(...days)} px, cao 52 px`);
    await go(p, '/patient/account');
    const sw = p.getByRole('switch', { name: 'Dùng ảnh cho nghiên cứu' });
    const on = () => p.evaluate(() => document.querySelector('input[role="switch"]')?.checked);
    const before = await on(); await sw.click(); await p.waitForTimeout(500);
    const after = await on();
    rec('P27-06', 'N09: công tắc vẫn bật tắt được bằng chạm cả dòng (dòng cao ≥ 48 px)', (await sw.boundingBox()).height >= 48 && (p.dialogs.length > 0 || after !== before), `${before} → ${after}; hộp thoại ${p.dialogs.join(' / ').slice(0, 80)}`);
    await p.context().close();
  }
};

(async () => {
  const b = await chromium.launch();
  const h = helpers(b);
  if (SHOTS) {
    for (const w of WIDTHS) for (const [user, list] of Object.entries(SCREENS)) {
      const p = await h.newPage(w); await h.login(p, user);
      for (const [code, url] of list) { await h.go(p, url); await h.shot(p, `${code}-${SHOTS}-${w}.png`); }
      await p.context().close();
    }
  }
  for (const [name, fn] of Object.entries(GROUPS)) if (!GROUP || GROUP === name) await fn(b, h);
  await b.close();
  finish(SHOTS ? 'anh-' + SHOTS : GROUP || 'p2');
})();
