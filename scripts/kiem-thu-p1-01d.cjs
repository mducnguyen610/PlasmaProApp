// Kiểm thử P1-01d (ô "Đợt nháp chờ xác nhận" ở B01). Playwright trên bản web. Mock test.
// Chạy: node scripts/kiem-thu-p1-01d.cjs <baseURL> <thư mục kết quả>
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
const draftOf = (pid, wid, id) => `{ const base = d.plans.filter((x) => x.patientId === '${pid}').sort((a, b) => b.version - a.version)[0]; d.plans.push({ ...base, id: '${id}', woundId: '${wid}', status: 'draft', confirmed: false, version: base.version + 1 }); }`;

(async () => {
  const b = await chromium.launch();
  const { newPage, login, go, mutate, overflow } = helpers(b);
  const tile = (p) => p.getByRole('button', { name: /Đợt nháp chờ xác nhận/ }).first();
  // Một nháp: mở thẳng B06 đúng vết (hành vi P0 giữ nguyên).
  {
    const p = await newPage(); await login(p);
    await go(p, '/'); await mutate(p, `d.plans = d.plans.filter((x) => x.status !== 'draft'); ${draftOf('p-2', 'w-2', 'pl-kt-1')}`);
    await go(p, '/doctor'); await tile(p).click(); await p.waitForTimeout(1200);
    rec('TP1-01d-a', 'Một đợt nháp: ô mở B06 của BN002, đúng vết w-2', /\/plan\/p-2/.test(p.url()) && p.url().includes('woundId=w-2'), p.url().replace(BASE, ''));
    await p.context().close();
  }
  // Nháp của 2 vết: mở B02 lọc "Có đợt nháp", đúng tập bệnh nhân.
  for (const w of [390, 320]) {
    const p = await newPage(w); await login(p);
    await go(p, '/'); await mutate(p, `d.plans = d.plans.filter((x) => x.status !== 'draft'); ${draftOf('p-1', 'w-1', 'pl-kt-1')} ${draftOf('p-2', 'w-2', 'pl-kt-2')}`);
    await go(p, '/doctor'); await tile(p).click(); await p.waitForTimeout(1200);
    const codes = await p.evaluate(() => [...document.querySelectorAll('[role="button"]')].map((e) => e.getAttribute('aria-label') || '').filter((l) => /, BN\d{3} · sinh /.test(l)).filter((l, i, a) => a.indexOf(l) === i).map((l) => l.match(/BN\d{3}/)[0]));
    const chip = await p.getByText('Có đợt nháp (2)', { exact: true }).count();
    const uniq = [...new Set(codes)].sort();
    rec(`TP1-01d-b-${w}`, `Nháp của 2 vết (${w} px): ô mở B02 lọc "Có đợt nháp (2)", danh sách BN001, BN002; không tràn ngang`, p.url().includes('/doctor/patients') && chip > 0 && JSON.stringify(uniq) === '["BN001","BN002"]' && (await overflow(p)) === 0, `${p.url().replace(BASE, '')}; ${uniq.join(',')}`);
    await p.context().close();
  }
  await b.close();
  finish('p1-01d');
})().catch((e) => { console.error(e); process.exit(2); });
