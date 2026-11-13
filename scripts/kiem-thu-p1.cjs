// Kịch bản kiểm thử P1 Doctor Workflow, PR-P1-1 (B01, B02, B12). Playwright trên bản web.
// Chạy: node scripts/kiem-thu-p1.cjs <baseURL> <thư mục kết quả> [--chi-anh <nhãn>]
// Dựng web trước: npx expo export -p web, phục vụ thư mục dist với SPA fallback.
// Dữ liệu thêm cho ca kiểm (ảnh cần chụp lại, máy chưa đồng bộ, lần đo vừa làm) chỉ ghi vào bộ nhớ trình duyệt, không sửa seed.ts.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8501';
const OUT = process.argv[3] || '.';
const SHOTS = process.argv.includes('--chi-anh') ? process.argv[process.argv.indexOf('--chi-anh') + 1] || 'anh' : null;
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

// Ba ảnh của hai bệnh nhân được yêu cầu chụp lại; máy TB-001 cũng mất đồng bộ (cùng TB-002 trong dữ liệu mẫu là 2 máy).
const SETUP = `
  const pick = d.images.filter((i) => i.patientId === 'p-1').slice(0, 2).concat(d.images.filter((i) => i.patientId === 'p-2').slice(0, 1));
  for (const im of pick) im.retakeRequested = 'Ảnh mờ (kiểm thử P1)';
  const d1 = d.devices.find((x) => x.id === 'd-1'); d1.online = false;
`;

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390, h = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.dialogs = []; p.errors = [];
    p.on('dialog', (d) => { p.dialogs.push(d.message()); d.accept(); });
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
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const mutate = async (p, fn) => { await p.evaluate((src) => { const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2')); new Function('d', src)(d); localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d)); }, fn); };
  // Nhãn trợ năng của các thẻ bệnh nhân đang nhìn thấy (tab khác vẫn nằm trong DOM nên lọc theo điểm giữa).
  const cards = (p) => p.evaluate(() => {
    const out = [];
    for (const e of document.querySelectorAll('[role="button"]')) {
      const l = e.getAttribute('aria-label') || ''; if (!/, BN\d{3} · sinh /.test(l)) continue;
      const r0 = e.getBoundingClientRect(); if (!r0.width) continue;
      e.scrollIntoView({ block: 'center' });
      const r = e.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + Math.min(40, r.width / 2), r.y + Math.min(16, r.height / 2));
      if (hit && (e.contains(hit) || hit.contains(e))) out.push(l);
    }
    window.scrollTo(0, 0);
    return out;
  });
  const codeOf = (l) => (l.match(/BN\d{3}/) || [''])[0];
  const pageHeight = (p) => p.evaluate(() => { let best = document.documentElement.scrollHeight; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) best = Math.max(best, el.scrollHeight + (window.innerHeight - el.clientHeight)); } return Math.ceil(best); });
  const shot = async (p, file) => {
    const w = p.viewportSize().width; const H = await pageHeight(p);
    await p.setViewportSize({ width: w, height: Math.max(844, H) }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file) }); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
    return H;
  };
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });
  const small = (p) => p.evaluate(() => [...document.querySelectorAll('[role="button"],[role="radio"],[role="tab"]')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.bottom > 0 && (r.height < 44 || r.width < 44); }).map((e) => `${(e.getAttribute('aria-label') || e.textContent || '').slice(0, 30)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));

  // ===== Ảnh trước, sau =====
  if (SHOTS) {
    const heights = {};
    for (const w of [320, 360, 390, 768]) {
      const p = await newPage(w); await login(p); await mutate(p, SETUP);
      for (const [name, url] of [['b01', '/doctor'], ['b02', '/doctor/patients'], ['b12', '/doctor/dataset']]) { await go(p, url); heights[`${name}-${w}`] = await shot(p, `${name}-${SHOTS}-${w}.png`); }
      await p.context().close();
    }
    fs.writeFileSync(path.join(OUT, `chieu-cao-${SHOTS}.json`), JSON.stringify(heights, null, 1));
    console.log(JSON.stringify(heights));
    await b.close(); return;
  }

  // ===== TP1-01..03: tìm và lọc bệnh nhân (B02) =====
  {
    const p = await newPage(); await login(p); await mutate(p, SETUP);
    await go(p, '/doctor/patients');
    await p.getByPlaceholder('Tìm theo tên hoặc mã bệnh nhân…').fill('pham'); await p.waitForTimeout(400);
    const found = await cards(p);
    rec('TP1-01', 'B02 gõ "pham" (không dấu) chỉ còn Phạm Thị B', found.length === 1 && found[0].startsWith('Phạm Thị B'), found.map(codeOf).join(','));
    await p.getByPlaceholder('Tìm theo tên hoặc mã bệnh nhân…').fill(''); await p.waitForTimeout(400);
    const all = await cards(p);
    const allCodes = all.map(codeOf);
    const details = [];
    let ok = true;
    for (const [label, state] of [['Bỏ lỡ', 'Bỏ lỡ'], ['Chưa có dữ liệu', 'Chưa có dữ liệu'], ['Cần điều trị', 'Cần điều trị']]) {
      const expected = all.filter((l) => l.includes(`hôm nay ${state}`)).map(codeOf);
      await p.getByRole('radio', { name: new RegExp(`^Hôm nay: ${label},`) }).click(); await p.waitForTimeout(400);
      const got = (await cards(p)).map(codeOf);
      const countLbl = await p.getByRole('radio', { name: new RegExp(`^Hôm nay: ${label},`) }).getAttribute('aria-label');
      const n = Number((countLbl.match(/, (\d+) bệnh nhân/) || [])[1]);
      const same = got.join() === expected.join() && n === expected.length;
      const ordered = got.join() === allCodes.filter((c) => got.includes(c)).join();
      details.push(`${label}: ${got.join('+') || 'rỗng'} (đếm ${n})`);
      if (!same || !ordered) ok = false;
    }
    await p.getByRole('radio', { name: 'Hôm nay: mọi trạng thái' }).click(); await p.waitForTimeout(300);
    rec('TP1-02', 'B02 lọc "Hôm nay" cho đúng tập theo trạng thái trên thẻ (classifyToday), số đếm khớp', ok, details.join('; '));
    rec('TP1-03', 'Thứ tự trong mỗi bộ lọc giữ thứ tự xếp hạng của danh sách Tất cả', ok, `Tất cả: ${allCodes.join(',')}`);
    // Kết hợp hai hàng lọc
    await p.getByRole('radio', { name: /^Có báo cáo/ }).click(); await p.waitForTimeout(300);
    const comb = (await cards(p)).map(codeOf);
    rec('TP1-04', 'Hai hàng lọc kết hợp: "Có báo cáo" + "Mọi trạng thái" chỉ còn BN002', comb.join() === 'BN002', comb.join());
    // Định danh theo IA 2.1
    const idOk = all.every((l) => /BN\d{3} · sinh \d{4} · (Nam|Nữ)/.test(l));
    const idVisible = await p.getByText(/^BN\d{3} · sinh \d{4} · (Nam|Nữ)$/).count();
    rec('TP1-05', 'Thẻ bệnh nhân dùng định dạng định danh "BN001 · sinh 1958 · Nam", không còn mã máy trong dòng định danh', idOk && idVisible > 0 && !(await p.getByText(/^BN\d{3} · TB-\d{3}$/).count()), `${idVisible} dòng`);
    rec('TP1-06', 'Không lỗi JavaScript trên B02', p.errors.length === 0, p.errors.join(' | '));
    await p.context().close();
  }

  // ===== TP1-07..10: B01 ô việc nhiều mục, bệnh nhân cần xem, vừa xử lý =====
  {
    const p = await newPage(); await login(p); await mutate(p, SETUP);
    const d = await store(p);
    const retakeIds = d.images.filter((i) => i.retakeRequested).map((i) => i.id).sort();
    await go(p, '/doctor');
    await p.getByRole('button', { name: /Ảnh cần chụp lại/ }).first().click(); await p.waitForTimeout(1200);
    const tiles = (await p.getByRole('button', { name: /^Ảnh IMG\d{4},/ }).evaluateAll((els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.getAttribute('aria-label').slice(4, 11)))).sort();
    rec('TP1-07', `B01 ô "Ảnh cần chụp lại" (${retakeIds.length} ảnh, 2 bệnh nhân) mở B12 nhóm "Chụp lại" có đủ các ảnh`, p.url().includes('/doctor/dataset') && tiles.join() === retakeIds.join() && await p.getByRole('tab', { name: `Chụp lại (${retakeIds.length})` }).count() > 0, `${p.url().replace(BASE, '')} · thấy ${tiles.join(',')} · cần ${retakeIds.join(',')} · tab ${await p.getByRole('tab', { name: /^Chụp lại/ }).count()}`);
    // (Trạng thái chọn của tab, radio không có aria-checked trên bản web; nhóm đang chọn được kiểm bằng nội dung danh sách.)
    // Một ảnh: mở thẳng ảnh như cũ.
    await mutate(p, `let k = 0; for (const im of d.images) if (im.retakeRequested && k++ > 0) delete im.retakeRequested;`);
    const one = (await store(p)).images.find((i) => i.retakeRequested).id;
    await go(p, '/doctor');
    await p.getByRole('button', { name: /Ảnh cần chụp lại/ }).first().click(); await p.waitForTimeout(1200);
    rec('TP1-08', 'Chỉ 1 ảnh cần chụp lại: ô mở thẳng ảnh đó như trước', p.url().includes(`/images/${one}`), p.url().replace(BASE, ''));
    // Hai máy chưa đồng bộ: mở B02 lọc "Máy chưa đồng bộ".
    await go(p, '/doctor');
    await p.getByRole('button', { name: /Thiết bị chưa đồng bộ/ }).first().click(); await p.waitForTimeout(1200);
    const off = (await cards(p)).map(codeOf).sort();
    rec('TP1-09', 'B01 ô "Thiết bị chưa đồng bộ" (2 máy) mở B02 lọc "Máy chưa đồng bộ" đúng 2 bệnh nhân giữ máy', p.url().includes('/doctor/patients') && off.join() === 'BN001,BN002' && await p.getByRole('radio', { name: /^Máy chưa đồng bộ, 2/ }).count() > 0, `${p.url().replace(BASE, '')} · ${off.join(',')}`);
    // Bệnh nhân cần xem: tập score > 0, thứ tự như B02 Tất cả.
    await go(p, '/doctor/patients');
    await p.getByRole('radio', { name: 'Hôm nay: mọi trạng thái' }).click(); await p.waitForTimeout(300);
    const allCodes = (await cards(p)).map(codeOf);
    await go(p, '/doctor');
    const b01 = await cards(p);
    const b01Codes = b01.map(codeOf);
    const restLink = await p.getByRole('button', { name: /^Còn \d+ bệnh nhân không có việc chờ/ }).getAttribute('aria-label').catch(() => null);
    const rest = restLink ? Number(restLink.match(/Còn (\d+)/)[1]) : 0;
    const inOrder = b01Codes.join() === allCodes.filter((c) => b01Codes.includes(c)).join();
    // score > 0 khi và chỉ khi có ít nhất một lý do (attention.ts: mỗi lần cộng điểm đều thêm lý do).
    const allHaveReason = b01.every((l) => /báo cáo chưa xử lý|Mức độ|Bỏ lỡ \d+ buổi|Chưa có dữ liệu hôm nay/.test(l));
    rec('TP1-10', 'B01 chỉ hiện bệnh nhân có việc chờ (mỗi thẻ có lý do), giữ thứ tự xếp hạng; số "Còn n" cộng số thẻ bằng tổng', inOrder && allHaveReason && b01Codes.length + rest === allCodes.length && b01Codes.length > 0, `B01 ${b01Codes.join(',')} + còn ${rest} / tổng ${allCodes.length}`);
    // Vừa xử lý: thêm một lần ghi số đo của bác sĩ đang đăng nhập lúc này.
    const meId = (await store(p)).accounts.find((a) => a.username === 'bacsi').id;
    const target = (await store(p)).images.find((i) => i.patientId === 'p-1' && i.status === 'unlabeled') || (await store(p)).images.find((i) => i.patientId === 'p-1');
    await mutate(p, `const im = d.images.find((i) => i.id === '${target.id}'); im.history = [...im.history, { at: new Date().toISOString(), by: '${meId}', fromName: im.filename, toName: im.filename, fromArea: im.areaCm2, toArea: 7.7 }];`);
    await go(p, '/doctor');
    await p.getByText('Vừa xử lý', { exact: true }).click(); await p.waitForTimeout(400);
    const firstRecent = await p.getByRole('button', { name: /^(Số đo|Đánh giá) / }).first().getAttribute('aria-label').catch(() => '');
    rec('TP1-11', 'B01 "Vừa xử lý": lần ghi số đo vừa làm đứng đầu, chạm mở đúng ảnh', (firstRecent || '').startsWith(`Số đo ${target.id}: 7,7 cm²`) && await (async () => { await p.getByRole('button', { name: /^Số đo / }).first().click(); await p.waitForTimeout(1000); return p.url().includes(`/images/${target.id}`); })(), firstRecent);
    rec('TP1-12', 'Không lỗi JavaScript trên B01, B12', p.errors.length === 0, p.errors.join(' | '));
    await p.context().close();
  }

  // ===== Giao diện: tràn ngang, vùng chạm, ở 4 độ rộng =====
  for (const w of [320, 360, 390, 768]) {
    const p = await newPage(w); await login(p); await mutate(p, SETUP);
    const bad = []; const tiny = [];
    for (const url of ['/doctor', '/doctor/patients', '/doctor/dataset']) {
      await go(p, url);
      if (url === '/doctor') { await p.getByText('Vừa xử lý', { exact: true }).click().catch(() => {}); await p.waitForTimeout(300); }
      if (url === '/doctor/dataset') { await p.getByRole('tab', { name: /^Chụp lại/ }).click().catch(() => {}); await p.waitForTimeout(300); }
      const o = await overflow(p); if (o) bad.push(`${url}:${o}`);
      tiny.push(...(await small(p)).map((s) => `${url} ${s}`));
    }
    rec(`TP1-tran-${w}`, `B01, B02, B12 không tràn ngang ở ${w} px`, bad.length === 0, bad.join(', '));
    rec(`TP1-cham-${w}`, `Vùng chạm ≥ 44 px trên B01, B02, B12 ở ${w} px (ghi nhận, không chặn)`, 'note', tiny.slice(0, 8).join('; ') || 'không có phần tử dưới 44 px');
    await p.context().close();
  }

  fs.writeFileSync(path.join(OUT, 'ket-qua-p1.json'), JSON.stringify(results, null, 1));
  const tally = results.reduce((m, r) => ({ ...m, [r.result]: (m[r.result] || 0) + 1 }), {});
  console.log(JSON.stringify(tally));
  await b.close();
})();
