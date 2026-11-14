// Kiểm thử P1-05 (B10), P1-06 (B11), P1-07c, P1-07d. Playwright trên bản web. Mock test, không thay cho thử với máy thật.
// Chạy: node scripts/kiem-thu-p1-05-06.cjs <baseURL> <thư mục kết quả> [--chi-anh <nhãn>]
// Bản web không có camera, không có AR: vị trí nút Chụp khi camera mở (P1-05b) và thứ tự danh sách khi camera chạy là NOT TESTED.
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
const PHOTO = path.join(__dirname, '..', 'assets', 'demo', 'demo_1.png');

(async () => {
  const b = await chromium.launch();
  const { newPage, login, go, has, store, mutate, shot, overflow, small } = helpers(b);
  const pickLibrary = async (p) => { const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByText('Chọn ảnh có sẵn', { exact: true }).click()]); await fc.setFiles(PHOTO); await p.waitForTimeout(3000); };
  const areaB10 = (p) => p.getByRole('textbox', { name: /^Diện tích bác sĩ đo/ });
  const areaB11 = (p) => p.getByRole('textbox', { name: 'Diện tích bác sĩ đã đo', exact: true });
  const methodB11 = (p) => p.getByRole('textbox', { name: /^Phương pháp đo/ });

  if (SHOTS) {
    const heights = {};
    for (const w of WIDTHS) {
      for (const h of w === 360 ? [740, 844] : [844]) {
        const p = await newPage(w, h); await login(p);
        await go(p, '/guided-capture?woundId=w-1');
        const btn = p.getByRole('button', { name: /^Mở camera/ });
        heights[`b10-mo-camera-day-${w}x${h}`] = Math.round(((await btn.boundingBox()) || { y: -1, height: 0 }).y + ((await btn.boundingBox()) || { height: 0 }).height);
        await p.screenshot({ path: path.join(OUT, `b10-man-dau-${SHOTS}-${w}x${h}.png`) });
        if (h === 844) {
          await shot(p, `b10-${SHOTS}-${w}.png`);
          await pickLibrary(p); heights[`b10-sau-chup-${w}`] = await shot(p, `b10-sau-chup-${SHOTS}-${w}.png`);
        }
        await p.context().close();
      }
      const p = await newPage(w); await login(p);
      await go(p, '/images/IMG0004'); heights[`b11-chua-do-${w}`] = await shot(p, `b11-chua-do-${SHOTS}-${w}.png`);
      await go(p, '/images/IMG0003'); heights[`b11-da-do-${w}`] = await shot(p, `b11-da-do-${SHOTS}-${w}.png`);
      await p.context().close();
    }
    fs.writeFileSync(path.join(OUT, `chieu-cao-${SHOTS}.json`), JSON.stringify(heights, null, 2));
    await b.close(); return;
  }

  // TP1-17: B10 sau khi chọn ảnh thư viện: thanh bước, thẻ chất lượng trước thẻ diện tích, ô trống, không có "Dùng số này".
  {
    const p = await newPage(); await login(p);
    await go(p, '/guided-capture?woundId=w-1');
    // Giai đoạn 3: thanh bước luôn hiện (bước 1 "Chụp"); bước 2 kiểm ảnh, bước 3 nhập số sau nút "Tiếp: nhập số đo" (trước: sau khi tích "Đã xem ảnh").
    const step1 = (await p.getByRole('progressbar', { name: 'Bước 1 trên 3: Chụp' }).count()) === 1;
    await pickLibrary(p);
    const step2 = await p.getByRole('progressbar', { name: 'Bước 2 trên 3: Kiểm tra ảnh' }).count();
    const qOn2 = (await p.getByText('Đã xem ảnh: rõ nét, đủ sáng, thấy toàn bộ vết thương', { exact: true }).count()) === 1 && (await p.getByText('Diện tích vết thương', { exact: true }).count()) === 0;
    await p.getByRole('checkbox', { name: /^Đã xem ảnh/ }).click(); await p.waitForTimeout(300);
    await p.getByRole('button', { name: 'Tiếp: nhập số đo', exact: true }).click(); await p.waitForTimeout(500);
    const step3 = await p.getByRole('progressbar', { name: 'Bước 3 trên 3: Nhập số đo' }).count();
    const aOn3 = (await p.getByText('Diện tích vết thương', { exact: true }).count()) === 1;
    const empty = (await areaB10(p).inputValue()) === '';
    const noUse = !(await has(p, 'Dùng số này'));
    rec('TP1-17', 'B10: thanh bước luôn hiện, bước 1 "Chụp"; bước 2 sau khi chọn ảnh (kiểm ảnh, chưa có thẻ diện tích); bước 3 sau "Tiếp: nhập số đo" (thẻ diện tích); ô diện tích trống; không có "Dùng số này"',
      step1 && step2 && step3 && qOn2 && aOn3 && empty && noUse, `bước ${step1}/${step2}/${step3}, kiểm ảnh ở bước 2 ${qOn2}, diện tích ở bước 3 ${aOn3}, ô trống ${empty}`);
    // QĐ-1, P0 DS-01: phương pháp không chọn sẵn, không có lựa chọn AR; có số mà chưa chọn phương pháp thì không lưu.
    const n0 = (await store(p)).images.length;
    await areaB10(p).fill('9,5');
    await p.getByText('Lưu ảnh và số đo bác sĩ', { exact: true }).click(); await p.waitForTimeout(800);
    const blocked = (await store(p)).images.length === n0 && await has(p, 'Chọn phương pháp bác sĩ đã dùng để đo trước khi lưu số đo.');
    rec('TP1-17b', 'B10 vẫn chặn lưu số khi chưa chọn phương pháp; không có lựa chọn AR', blocked && (await p.getByRole('radio', { name: /Ước lượng AR/ }).count()) === 0, `chặn ${blocked}`);
    // PX-02 (PR 34) vẫn đạt: rời màn khi có ảnh chưa lưu thì hỏi.
    p.answer = false; p.dialogs = [];
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(800);
    rec('TP1-17c', 'B10 có ảnh chưa lưu: rời màn có hộp hỏi, chọn Ở lại thì ảnh và số còn', p.dialogs.length > 0 && (await areaB10(p).inputValue()) === '9,5', p.dialogs.join(' / ').slice(0, 120));
    await p.context().close();
  }

  // P1-05b (bố cục khi camera đóng): nút "Mở camera" nằm trong màn đầu ở 360x740 và 390x844.
  for (const [w, h] of [[360, 740], [390, 844], [320, 640]]) {
    const p = await newPage(w, h); await login(p);
    await go(p, '/guided-capture?woundId=w-1');
    const bb = await p.getByRole('button', { name: /^Mở camera/ }).boundingBox();
    rec(`TP1-05b-${w}x${h}`, `B10 ${w}x${h}: nút "Mở camera" nằm trong màn đầu (camera đóng; khi camera mở cần máy thật)`, !!bb && bb.y + bb.height <= h, bb ? `đáy nút ${Math.round(bb.y + bb.height)} / ${h}` : 'không thấy nút');
    await p.context().close();
  }
  rec('TP1-05b-may-that', 'Vị trí dòng "Chưa đạt" và nút Chụp khi camera mở, thứ tự danh sách khi camera, AR chạy thật', 'note', 'NOT TESTED: bản web không có camera, chưa có APK SDK 58 và thiết bị');

  // TP1-18 (P1-06a): B11 ảnh chưa đo có dòng "Lần đo trước" của cùng vết; ô số trống.
  {
    const p = await newPage(); await login(p);
    await go(p, '/images/IMG0004');
    const d = await store(p);
    const prev = d.images.filter((i) => i.woundId === 'w-1' && i.id !== 'IMG0004' && i.areaCm2 !== null && i.status === 'labeled').sort((a, b) => b.captureDate.localeCompare(a.captureDate))[0];
    const want = new RegExp(`^Lần đo trước của VT01: ${String(prev.areaCm2).replace('.', ',')}\\d* cm² · chụp \\d{2}/\\d{2}/\\d{4}`);
    rec('TP1-18', 'B11 IMG0004: "Lần đo trước của VT01" đúng số của ảnh đo gần nhất cùng vết; ô diện tích trống', await has(p, want, false) && (await areaB11(p).inputValue()) === '', `ảnh trước ${prev.id} ${prev.areaCm2}`);
    await go(p, '/images/IMG0001');
    await p.getByRole('button', { name: 'Sửa số đo' }).click(); await p.waitForTimeout(300);
    rec('TP1-18b', 'B11 ảnh đo đầu tiên của vết: "Chưa có lần đo trước của VT01."', await has(p, 'Chưa có lần đo trước của VT01.'));
    await p.context().close();
  }

  // TP1-08 (P1-06b): liên kết ảnh trước, sau chỉ trong cùng vết; thêm VT02 cho p-1 để kiểm không lẫn.
  {
    const p = await newPage(); await login(p);
    await go(p, '/');
    await mutate(p, `
      d.wounds.push({ id: 'w-kt2', patientId: 'p-1', code: 'VT02', location: 'Gót chân trái (kiểm thử)', startDate: d.wounds[0].startDate, status: 'active' });
      const src = d.images.find((i) => i.id === 'IMG0003');
      d.images.push({ ...src, id: 'IMG9001', woundId: 'w-kt2', filename: 'BN001_VT02_IMG9001_area_5.0cm2.png', areaCm2: 5, history: [] });
    `);
    const chain = [];
    await go(p, '/images/IMG0001');
    for (let i = 0; i < 6; i++) {
      chain.push(p.url().match(/IMG\d+/)[0]);
      const nx = p.getByRole('button', { name: /^Ảnh sau của VT01/ });
      // Giai đoạn 3: ảnh chưa đo mở ở chế độ đo (ẩn liên kết); bấm "Hủy" ở chân màn để về chế độ xem rồi mới đi tiếp.
      if (!(await nx.count()) && (await p.getByRole('button', { name: 'Hủy', exact: true }).count())) { await p.getByRole('button', { name: 'Hủy', exact: true }).click(); await p.waitForTimeout(400); }
      if (!(await nx.count())) break;
      await nx.click(); await p.waitForTimeout(1000);
    }
    if (!(await p.getByRole('button', { name: /^Ảnh trước của VT01/ }).count())) { await p.getByRole('button', { name: 'Hủy', exact: true }).click(); await p.waitForTimeout(400); }
    const back1 = p.getByRole('button', { name: /^Ảnh trước của VT01/ });
    await back1.click(); await p.waitForTimeout(1000);
    const afterBack = p.url().match(/IMG\d+/)[0];
    rec('TP1-08', 'B11 "Ảnh sau của VT01" đi IMG0001 → 0002 → 0003 → 0004, không sang IMG9001 (VT02); "Ảnh trước" quay về', chain.join(',') === 'IMG0001,IMG0002,IMG0003,IMG0004' && afterBack === 'IMG0003', `${chain.join(' → ')}; lùi về ${afterBack}`);
    await go(p, '/images/IMG9001');
    const alone = !(await p.getByRole('button', { name: /^Ảnh (trước|sau) của/ }).count()) && await has(p, 'Ảnh đầu tiên của VT02') && await has(p, 'Ảnh mới nhất của VT02');
    rec('TP1-08b', 'Ảnh duy nhất của VT02: không có liên kết sang ảnh của VT01', alone);
    // "So sánh với ảnh khác" mở B08 với ảnh này làm "Sau".
    await go(p, '/images/IMG0002');
    await p.getByRole('button', { name: /^So sánh ảnh IMG0002/ }).click(); await p.waitForTimeout(1200);
    const lab = await p.getByRole('button', { name: /^Đổi ảnh sau/ }).getAttribute('aria-label').catch(() => '');
    rec('TP1-08c', 'B11 "So sánh với ảnh khác" mở B08 của w-1 với IMG0002 là ảnh "Sau"', p.url().includes('/compare/w-1') && /IMG0002/.test(lab || ''), lab);
    await p.context().close();
  }

  // TP1-13: B11 sửa dở, bấm "Ảnh sau của VT01": có hộp hỏi; Ở lại thì số còn; không tự lưu.
  {
    const p = await newPage(); await login(p);
    await go(p, '/images/IMG0003');
    await p.getByRole('button', { name: 'Sửa số đo' }).click(); await p.waitForTimeout(300);
    await areaB11(p).fill('7,7');
    p.answer = false; p.dialogs = [];
    // Giai đoạn 3: khi đang sửa (chế độ đo), liên kết ảnh cùng vết ẩn; lối rời màn còn lại là nút quay lại trên đầu màn, phải hỏi trước.
    const linksHidden = (await p.getByRole('button', { name: /^Ảnh (trước|sau) của VT01/ }).count()) === 0;
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900);
    const stay = p.url().includes('IMG0003') && (await areaB11(p).inputValue()) === '7,7';
    const notSaved = (await store(p)).images.find((i) => i.id === 'IMG0003').areaCm2 !== 7.7;
    rec('TP1-13', 'B11 đang sửa: liên kết cùng vết ẩn (chế độ đo); nút quay lại hỏi trước; Ở lại thì dữ liệu còn, không tự lưu', linksHidden && p.dialogs.length > 0 && stay && notSaved, p.dialogs.join(' / ').slice(0, 100));
    // P1-06c: lưu thay số thì thông báo ghi số cũ và số mới.
    p.answer = true;
    await p.getByRole('radio', { name: 'Thước đo trên vết thương', exact: true }).click(); await p.waitForTimeout(200);
    const methodVal = await methodB11(p).inputValue();
    const before = (await store(p)).images.find((i) => i.id === 'IMG0003').areaCm2;
    await p.getByRole('button', { name: /^Lưu số mới$/ }).click(); await p.waitForTimeout(1200);
    const msg = `Đã thay ${String(before).replace('.', ',')} cm² bằng 7,7 cm² cho ảnh IMG0003.`;
    rec('TP1-06c', 'B11 thay số: thông báo "Đã thay … bằng …"', await has(p, new RegExp(`^Đã thay ${String(before).replace('.', ',')}\\d* cm² bằng 7,7\\d* cm² cho ảnh IMG0003\\.$`), false), msg);
    rec('TP1-07c', 'B11 chọn "Thước đo trên vết thương": ô phương pháp nhận đúng chuỗi của B10', methodVal === 'Thước đo trên vết thương', `"${methodVal}"`);
    const saved = (await store(p)).images.find((i) => i.id === 'IMG0003');
    rec('TP1-07c-b', 'Phương pháp lưu đúng chuỗi danh sách chung', saved.measureMethod === 'Thước đo trên vết thương', saved.measureMethod);
    await p.context().close();
  }

  // P1-07c: giá trị cũ ghi chữ tự do giữ nguyên; chọn "Khác (ghi rõ)" xóa chuỗi chuẩn để ghi cách khác.
  {
    const p = await newPage(); await login(p);
    await go(p, '/');
    await mutate(p, `d.images.find((i) => i.id === 'IMG0002').measureMethod = 'Thước giấy kẻ ô (ghi cũ)';`);
    await go(p, '/images/IMG0002');
    await p.getByRole('button', { name: 'Sửa số đo' }).click(); await p.waitForTimeout(300);
    const old = await methodB11(p).inputValue();
    await p.getByRole('radio', { name: 'Phần mềm đo trên ảnh', exact: true }).click(); await p.waitForTimeout(200);
    const std = await methodB11(p).inputValue();
    await p.getByRole('radio', { name: 'Khác (ghi rõ)', exact: true }).click(); await p.waitForTimeout(200);
    const other = await methodB11(p).inputValue();
    rec('TP1-07c-c', 'B11: giá trị cũ ngoài danh sách giữ nguyên; chọn chuẩn thì điền chuỗi chuẩn; chọn "Khác" thì ô trống để ghi rõ', old === 'Thước giấy kẻ ô (ghi cũ)' && std === 'Phần mềm đo trên ảnh' && other === '', `"${old}" / "${std}" / "${other}"`);
    await p.context().close();
  }

  // Giao diện ở 4 cỡ màn.
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p);
    await go(p, '/guided-capture?woundId=w-1'); const o1 = await overflow(p);
    await pickLibrary(p); const o2 = await overflow(p);
    await go(p, '/images/IMG0004'); const o3 = await overflow(p);
    // Giai đoạn 3: IMG0004 chưa đo mở ở chế độ đo (ẩn liên kết ảnh cùng vết); kiểm liên kết ở IMG0003 (chế độ xem).
    await go(p, '/images/IMG0003'); const o4 = await overflow(p);
    const links = await p.getByTestId('anh-cung-vet').getByRole('button').evaluateAll((es) => es.map((e) => Math.round(e.getBoundingClientRect().height)));
    rec(`TP1-UI-${w}`, `B10, B11 ở ${w} px: không tràn ngang; liên kết ảnh cùng vết cao ≥ 44 px`, o1 + o2 + o3 + o4 === 0 && links.length > 0 && links.every((x) => x >= 44), `tràn ${o1}/${o2}/${o3}/${o4}; liên kết ${links.join(',')}`);
    const sm = await small(p); if (sm.length) rec(`TP1-UI-${w}-nho`, `Phần tử bấm < 44 px ở B11 (${w} px, màn đầu)`, 'note', sm.slice(0, 6).join('; '));
    if (p.errors.length) rec(`TP1-UI-${w}-js`, 'Lỗi JavaScript', false, p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  finish('p1-05-06');
})().catch((e) => { console.error(e); process.exit(2); });
