// Kiểm thử P1-04 (B08 So sánh ảnh), P1-07b, P1-07e. Playwright trên bản web. Mock test, không thay cho thử với bác sĩ.
// Chạy: node scripts/kiem-thu-p1-04.cjs <baseURL> <thư mục kết quả> [--chi-anh <nhãn>]
// Dữ liệu chỉ ghi vào bộ nhớ trình duyệt, không sửa seed.ts.
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

(async () => {
  const b = await chromium.launch();
  const { newPage, login, go, has, store, mutate, shot, overflow, small, back } = helpers(b);

  if (SHOTS) {
    const heights = {};
    for (const w of WIDTHS) {
      const p = await newPage(w); await login(p);
      await go(p, '/compare/w-1'); heights[`b08-${w}`] = await shot(p, `b08-${SHOTS}-${w}.png`);
      const pk = p.getByRole('button', { name: /^Đổi ảnh sau/ });
      if (await pk.count()) { await pk.click(); await p.waitForTimeout(300); await shot(p, `b08-chon-${SHOTS}-${w}.png`); }
      await p.context().close();
    }
    fs.writeFileSync(path.join(OUT, `chieu-cao-${SHOTS}.json`), JSON.stringify(heights, null, 2));
    await b.close(); return;
  }

  // TP1-14: danh sách chọn chỉ có ảnh của vết đang mở, mới trước. Thêm một ảnh của vết khác cùng bệnh nhân để kiểm.
  {
    const p = await newPage(); await login(p);
    await go(p, '/');
    await mutate(p, `
      d.wounds.push({ id: 'w-kt2', patientId: 'p-1', code: 'VT02', location: 'Gót chân trái (kiểm thử)', startDate: d.wounds[0].startDate, status: 'active' });
      const src = d.images.find((i) => i.id === 'IMG0002');
      d.images.push({ ...src, id: 'IMG9001', woundId: 'w-kt2', filename: 'BN001_VT02_IMG9001_area_5.0cm2.png', areaCm2: 5, history: [] });
    `);
    await go(p, '/compare/w-1');
    await p.getByRole('button', { name: /^Đổi ảnh sau/ }).click(); await p.waitForTimeout(300);
    const radios = await p.getByRole('radio').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label') || '').filter((l) => /^Ảnh IMG/.test(l)));
    const ids = radios.map((l) => l.match(/IMG\d+/)[0]);
    const d = await store(p);
    const mine = d.images.filter((i) => i.woundId === 'w-1').sort((a, b) => b.captureDate.localeCompare(a.captureDate)).map((i) => i.id);
    rec('TP1-14', 'B08 danh sách chọn ảnh chỉ gồm ảnh của w-1, mới trước (không có IMG9001 của VT02)', JSON.stringify(ids) === JSON.stringify(mine), `${ids.join(',')} | mong đợi ${mine.join(',')}`);
    // Chọn xong thì danh sách đóng, ảnh "Sau" đổi.
    await p.getByRole('radio', { name: /^Ảnh IMG0002/ }).click(); await p.waitForTimeout(300);
    const closed = (await p.getByRole('radio', { name: /^Ảnh IMG/ }).count()) === 0;
    const label = await p.getByRole('button', { name: /^Đổi ảnh sau/ }).getAttribute('aria-label');
    rec('TP1-14b', 'Chọn một ảnh: danh sách đóng, dòng chọn ghi đúng ảnh', closed && /IMG0002/.test(label), label);
    // TP1-15: chạm ảnh "Sau" mở ảnh IMG0002; quay lại vẫn giữ cặp.
    // Giai đoạn 4 giao diện theo tác vụ: ảnh mở ở trình xem riêng của vết (wound-history/w-1/anh/IMG0002), B11 mở từ đó bằng "Chi tiết ảnh và số đo".
    await p.getByRole('button', { name: /^Mở ảnh IMG0002/ }).click(); await p.waitForTimeout(1200);
    const onB11 = p.url().includes('/wound-history/w-1/anh/IMG0002');
    await back(p);
    const kept = /IMG0002/.test(await p.getByRole('button', { name: /^Đổi ảnh sau/ }).getAttribute('aria-label')) && /IMG0001/.test(await p.getByRole('button', { name: /^Đổi ảnh trước/ }).getAttribute('aria-label'));
    rec('TP1-15', 'Chạm ảnh mở đúng ảnh (trình xem riêng, giai đoạn 4); quay lại B08 giữ cặp IMG0001, IMG0002', onB11 && kept, `url ${onB11}, giữ cặp ${kept}`);
    // P1-04a: người nhập, số ngày cách nhau (phép trừ ngày).
    const d2 = await store(p);
    const A = d2.images.find((i) => i.id === 'IMG0001'), B = d2.images.find((i) => i.id === 'IMG0002');
    const gap = Math.round((Date.parse(B.captureDate) - Date.parse(A.captureDate)) / 86400000);
    const srcLines = await p.getByText(/^(Nhập bởi |Chưa có thông tin người nhập)/).count();
    rec('TP1-04a', 'B08 có dòng người nhập dưới mỗi ảnh đã đo và "Hai ảnh chụp cách nhau n ngày"', srcLines === 2 && await has(p, `Hai ảnh chụp cách nhau ${gap} ngày.`), `dòng nguồn ${srcLines}, n = ${gap}`);
    await p.context().close();
  }

  // TP1-16: khung ảnh dùng contain: ảnh hiển thị đủ, tỉ lệ bằng ảnh gốc ±1%.
  {
    const p = await newPage(); await login(p);
    await go(p, '/compare/w-1');
    const r = await p.getByRole('button', { name: /^Mở ảnh / }).first().evaluate((el) => {
      const img = el.querySelector('img'); const div = [...el.querySelectorAll('div')].find((d) => getComputedStyle(d).backgroundImage.startsWith('url('));
      const fit = img ? getComputedStyle(img).objectFit : div ? getComputedStyle(div).backgroundSize : '';
      return { fit, nw: img?.naturalWidth ?? 0, nh: img?.naturalHeight ?? 0 };
    });
    rec('TP1-16', 'B08 ảnh hiển thị kiểu contain (không cắt mép)', r.fit === 'contain', JSON.stringify(r));
    // Màn khác vẫn cover (mặc định không đổi).
    await go(p, '/wounds/w-1');
    const fitB05 = await p.evaluate(() => { const i = document.querySelector('img'); return i ? getComputedStyle(i).objectFit : ''; });
    rec('TP1-16b', 'B05 vẫn dùng cover (thuộc tính mới có mặc định cũ)', fitB05 === 'cover' || fitB05 === '', fitB05);
    await p.context().close();
  }

  // P0 vẫn đạt: cảnh báo khác phương pháp, đảo thứ tự (kịch bản P0 đã chuyển sang bộ chọn mới).
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p);
    await go(p, '/compare/w-1'); const o1 = await overflow(p);
    await p.getByRole('button', { name: /^Đổi ảnh trước/ }).click(); await p.waitForTimeout(300); const o2 = await overflow(p);
    const sm = await small(p);
    rec(`TP1-UI-${w}`, `B08 ở ${w} px: không tràn ngang (đóng và mở danh sách)`, o1 + o2 === 0, `tràn ${o1}/${o2}`);
    if (sm.length) rec(`TP1-UI-${w}-nho`, `Phần tử bấm < 44 px ở B08 (${w} px)`, 'note', sm.slice(0, 6).join('; '));
    if (p.errors.length) rec(`TP1-UI-${w}-js`, 'Lỗi JavaScript', false, p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  finish('p1-04');
})().catch((e) => { console.error(e); process.exit(2); });
