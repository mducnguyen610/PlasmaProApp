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
