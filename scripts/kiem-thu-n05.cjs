// Kiểm thử N05 trang tổng quan vết thương phía bệnh nhân (giao diện theo tác vụ).
// Bản web, Playwright, dữ liệu mô phỏng. Chạy: node scripts/kiem-thu-n05.cjs <baseURL> <thư mục kết quả>
// Dữ liệu thêm cho từng ca chỉ ghi vào localStorage của ngữ cảnh trình duyệt đó (không sửa kho mã).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8602';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };
const KEY = 'plasmapro.demo.v2';

(async () => {
  const b = await chromium.launch();
  const newPage = async ({ w = 390, h = 844 } = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.errors = []; p.dialogs = []; p.answer = true;
    p.on('dialog', (d) => { p.dialogs.push(d.message()); if (p.answer) d.accept(); else d.dismiss(); });
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
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1400); };
  const has = async (p, t, exact = true) => (await p.getByText(t, { exact }).count()) > 0;
  const visible = async (p, t) => { const l = p.getByText(t, { exact: true }); return (await l.count()) > 0 && await l.first().isVisible(); };
  const store = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  const mutate = async (p, fn) => { await p.evaluate(([k, src]) => { const d = JSON.parse(localStorage.getItem(k)); new Function('d', src)(d); localStorage.setItem(k, JSON.stringify(d)); }, [KEY, fn]); };
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(1000); };
  const yOf = async (p, t) => { const l = p.getByText(t, { exact: true }); if (!(await l.count())) return null; const bb = await l.first().boundingBox(); return bb ? bb.y : null; };
  const inFooter = (p, name) => p.locator('[data-testid="screen-footer"]').getByRole('button', { name, exact: true });
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed')) return false; for (let a = e.parentElement; a; a = a.parentElement) { const ox = getComputedStyle(a).overflowX; if (ox === 'auto' || ox === 'scroll' || ox === 'hidden') return false; } return true; }).length; });
  // Phần tử nằm trong vùng cuộn ngang có chủ đích (dải ảnh N05) hoặc vùng cắt không tính là tràn.
  const url = (p) => decodeURIComponent(p.url().replace(BASE, ''));
  const clinical = (d) => JSON.stringify({ images: d.images, evaluations: d.evaluations, plans: d.plans, sessions: d.sessions, sessionNotes: d.sessionNotes, wounds: d.wounds, patients: d.patients, reports: d.reports });

  const lbls = (p, re) => p.getByRole('button', { name: re }).evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
  const dmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const esc = (s) => s.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&');

  // N05-01: dữ liệu đầy đủ (VT01).
  {
    const p = await newPage(); await login(p, 'benhnhan');
    const st = await store(p);
    const d0 = clinical(st);
    await go(p, '/wounds/w-1');
    const sum = await has(p, 'Nguyễn Văn A · BN001') && await has(p, 'Cẳng chân trái, mặt trước') && await has(p, 'Đang điều trị') && await has(p, /^Mức độ /, false);
    const imgs = st.images.filter((i) => i.woundId === 'w-1');
    const labeled = imgs.filter((i) => i.status === 'labeled' && i.areaCm2 !== null && i.capture?.sourceDateKnown !== false).sort((a, b) => a.captureDate.localeCompare(b.captureDate));
    const last = labeled[labeled.length - 1], first = labeled[0];
    const capLine = await has(p, new RegExp(`^Ảnh chụp ngày ${esc(dmy(last.captureDate))}`), false);
    const firstLine = await has(p, new RegExp(`^Lần đo đầu: .*ảnh chụp ngày ${esc(dmy(first.captureDate))}$`), false);
    const chart = (await p.getByTestId('bieu-do-thu-gon').count()) === 1;
    const sim = await has(p, 'Dữ liệu mô phỏng');
    rec('N05-01', 'Tóm tắt một thẻ (tên, mã, vị trí, trạng thái, mức độ); lần đo gần nhất ghi ngày chụp ảnh; lần đo đầu; biểu đồ thu gọn; nhãn dữ liệu mô phỏng', sum && capLine && firstLine && chart && sim, `${sum}/${capLine}/${firstLine}/${chart}/${sim}`);
    // N05-02: mỗi ô ảnh ghi trạng thái đo của chính ảnh đó, mới trước.
    const tiles = await lbls(p, /^Ảnh chụp .*Chạm để mở ảnh$/);
    const expect = [...imgs].sort((a, b) => b.captureDate.localeCompare(a.captureDate) || a.id.localeCompare(b.id)).map((i) => {
      const date = i.capture?.sourceDateKnown === false ? 'Ngày chụp chưa rõ' : dmy(i.captureDate);
      const tag = i.status === 'labeled' && i.areaCm2 !== null ? `Có số đo: ${String(i.areaCm2).replace('.', ',')}` : i.status === 'excluded' ? 'Bác sĩ không dùng' : 'Chưa đo';
      return [date, tag];
    });
    const okTiles = tiles.length === expect.length && tiles.every((t, k) => t.includes(expect[k][0]) && t.includes(expect[k][1]));
    rec('N05-02', 'Dải ảnh: đủ ảnh của vết, mới trước, mỗi ô đúng ngày chụp và trạng thái, số đo của chính ảnh', okTiles, JSON.stringify(tiles.slice(0, 2)));
    const newer = imgs.filter((i) => i.captureDate > last.captureDate);
    rec('N05-03', 'Ảnh mới hơn lần đo gần nhất hiện "Chưa đo"; số lớn vẫn là của ảnh đã đo', newer.length > 0 && tiles[0].includes('Chưa đo') && await has(p, new RegExp(`^Ảnh chụp ngày ${esc(dmy(last.captureDate))}`), false), `${newer.length} ảnh mới hơn`);
    // N05-04: mở từng màn riêng và quay lại.
    const trips = [];
    const trip = async (name, act, check) => { await act(); await p.waitForTimeout(1300); const ok = await check(url(p)); await back(p); const backOk = url(p).startsWith('/wounds/w-1'); trips.push(`${name}:${ok}/${backOk}`); return ok && backOk; };
    const a1 = await trip('lich-su-do', () => p.getByText('Lịch sử đo', { exact: true }).click(), async (u) => u.includes('/wound-history/w-1') && u.includes('tab=dien-tich') && await has(p, 'Ảnh theo thời gian'));
    const a2 = await trip('so-sanh', () => p.getByText('So sánh', { exact: true }).click(), async (u) => u.startsWith('/compare/w-1'));
    const a3 = await trip('dot', () => p.getByTestId('dong-dot-dieu-tri').click(), async (u) => u.startsWith('/wound-history/w-1/dot-dieu-tri') && await has(p, 'Mức năng lượng') && await has(p, /^Giai đoạn \d+ trên \d+$/, false));
    const nTl = Number(((await p.getByText(/^Lịch sử vết thương \(\d+\)$/).innerText()).match(/\d+/) || [])[0]);
    const a4 = await trip('lich-su', () => p.getByTestId('dong-lich-su').click(), async (u) => u.startsWith('/wound-history/w-1/dong-thoi-gian') && (await p.getByTestId('muc-lich-su').count()) === Math.min(nTl, 10));
    const a5 = await trip('nhan-xet', () => p.getByText(/^Tất cả \(\d+\)$/).click(), async (u) => u.includes('loc=danh-gia'));
    const a6 = await trip('xem-day-du', () => p.getByText('Xem đầy đủ', { exact: true }).click(), async (u) => u.startsWith('/wound-history/w-1/ban-ghi/') && u.includes('loai=danh-gia'));
    const a7 = await trip('anh', () => p.getByTestId('o-anh').first().click(), async (u) => u.startsWith('/wound-history/w-1/anh/'));
    rec('N05-04', 'Mở và quay lại từng màn riêng: Lịch sử đo (có dải ảnh), So sánh, Đợt điều trị, Lịch sử vết thương, Nhận xét, Xem đầy đủ, Ảnh; Back về đúng N05 VT01', a1 && a2 && a3 && a4 && a5 && a6 && a7, trips.join(' '));
    await go(p, '/wounds/w-1');
    rec('N05-05', 'QĐ-1: N05 không có "Dùng số này", không hiện ước lượng AR', !(await has(p, 'Dùng số này', false)) && !(await has(p, /\bAR\b/, false)));
    rec('N05-06', 'Duyệt N05 và các màn riêng không đổi dữ liệu lâm sàng', clinical(await store(p)) === d0);
    // N05-07: vết không có ảnh; vết chỉ có ảnh chưa đo.
    await mutate(p, `d.wounds.push({ id: 'w-moi', patientId: 'p-1', code: 'VT09', location: 'Khuỷu tay (kiểm thử)', startDate: d.wounds[0].startDate, status: 'active' });
      d.wounds.push({ id: 'w-moi2', patientId: 'p-1', code: 'VT08', location: 'Gối (kiểm thử)', startDate: d.wounds[0].startDate, status: 'active' });
      const im = d.images.find((x) => x.woundId === 'w-1'); d.images.push({ ...im, id: 'IMG-KT1', woundId: 'w-moi2', status: 'unlabeled', areaCm2: null, history: [], retakeRequested: undefined });`);
    await go(p, '/wounds/w-moi');
    const noImg = await has(p, 'Chưa có ảnh vết thương. Bác sĩ sẽ chụp và đo ở lần khám.') && await has(p, 'Ảnh (0)') && !(await has(p, 'So sánh')) && await has(p, 'Chưa có đợt điều trị cho vết thương này');
    await go(p, '/wounds/w-moi2');
    const noMeas = await has(p, 'Chưa có lần đo diện tích. Ảnh đã chụp: 1.') && (await lbls(p, /^Ảnh chụp .*Chưa đo/)).length === 1 && (await p.getByTestId('bieu-do-thu-gon').count()) === 0;
    rec('N05-07', 'Vết chưa có ảnh và vết chỉ có ảnh chưa đo: báo đúng, không biểu đồ, không nút So sánh', noImg && noMeas, `${noImg}/${noMeas}`);
    rec('N05-08', 'Không lỗi JS phía bệnh nhân', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }
  // N05-09: phân quyền.
  {
    const p = await newPage(); await login(p, 'benhnhan2');
    const blocked = [];
    for (const u of ['/wounds/w-1', '/wound-history/w-1/dot-dieu-tri', '/wound-history/w-1/dong-thoi-gian']) { await go(p, u); blocked.push(!(await has(p, 'Cẳng chân trái, mặt trước', false)) && !(await has(p, 'Nguyễn Văn A', false))); }
    rec('N05-09', 'Bệnh nhân khác không xem được N05, Đợt điều trị, Lịch sử vết thương của BN001', blocked.every(Boolean), blocked.join('/'));
    await p.context().close();
  }
  // N05-10: B05 bác sĩ giữ nguyên.
  {
    const p = await newPage(); await login(p, 'bacsi');
    await go(p, '/wounds/w-1');
    const b05 = await has(p, 'Hiện trạng') && await has(p, 'Việc với vết thương') && (await inFooter(p, 'Ghi đánh giá').count()) === 1 && !(await has(p, /^Ảnh \(\d+\)$/, false)) && (await p.getByTestId('dong-lich-su').count()) === 0;
    await go(p, '/wound-history/w-1?tab=dien-tich');
    const noStrip = !(await has(p, 'Ảnh theo thời gian'));
    await go(p, '/wound-history/w-1/dot-dieu-tri');
    const docCourse = await has(p, 'Lập hoặc sửa phiên bản');
    rec('N05-10', 'B05 bác sĩ giữ bố cục cũ; Lịch sử đo của bác sĩ không có dải ảnh bệnh nhân; màn Đợt điều trị mở được với bác sĩ phụ trách', b05 && noStrip && docCourse, `${b05}/${noStrip}/${docCourse}`);
    rec('N05-11', 'Không lỗi JS phía bác sĩ', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
    await p.context().close();
  }
  for (const w of [320, 360, 390, 768]) {
    const bad = [];
    const p = await newPage({ w, h: 740 }); await login(p, 'benhnhan');
    for (const u of ['/wounds/w-1', '/wound-history/w-1/dot-dieu-tri', '/wound-history/w-1/dong-thoi-gian', '/wound-history/w-1?tab=dien-tich']) { await go(p, u); const o = await overflow(p); if (o) bad.push(`${u}:${o}`); }
    await go(p, '/wounds/w-1');
    const yArea = await yOf(p, 'Lần đo gần nhất');
    if (yArea == null || yArea > 740) bad.push(`diện tích ở ${yArea}`);
    if (p.errors.length) bad.push('JS ' + p.errors[0].slice(0, 80));
    rec(`N05-12-${w}`, `${w}px: không tràn ngang; "Lần đo gần nhất" trong màn đầu`, bad.length === 0, bad.join(', '));
    await p.context().close();
  }

  fs.writeFileSync(path.join(OUT, 'ket-qua-n05.json'), JSON.stringify(results, null, 2));
  const fail = results.filter((r) => r.result !== 'ĐẠT').length;
  console.log(`Tổng ${results.length}, đạt ${results.length - fail}, lỗi ${fail}`);
  await b.close();
  process.exit(fail ? 1 : 0);
})();
