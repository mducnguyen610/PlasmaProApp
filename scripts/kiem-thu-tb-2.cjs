// Kiểm thử giao diện theo tác vụ, giai đoạn 2: B07 đánh giá vết thương chia bước (QĐ-TB-1 = B). Bản web, Playwright, mock test.
// Chạy: node scripts/kiem-thu-tb-2.cjs <baseURL> <thư mục kết quả>
// Hộp xác nhận trên web là window.confirm. Bản ghi đánh giá đếm trong bộ nhớ trình duyệt (plasmapro.demo.v2).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8502';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
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
  const heading = async (p) => (await p.getByTestId('tieu-de-buoc').count()) ? (await p.getByTestId('tieu-de-buoc').innerText()).replace(/\s+/g, ' ') : '';
  const radio = (p, name) => p.getByRole('radio', { name, exact: true }).first();
  // Bản web không xuất aria-checked cho Choices; lựa chọn đang chọn có nền màu chính (C.primary).
  const checked = async (p, name) => (await radio(p, name).evaluate((e) => getComputedStyle(e).backgroundColor)) === 'rgb(11, 107, 111)';
  const btn = (p, name) => p.getByRole('button', { name, exact: typeof name === 'string' });
  const click = async (loc, t = 350) => { await loc.click(); await loc.page().waitForTimeout(t); };
  const footerIn = (p) => p.evaluate(() => { const f = document.querySelector('[data-testid="screen-footer"]'); if (!f) return false; const r = f.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; });
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900); };

  // TB2-01..03: mở B07, tiến độ, nút ở chân màn, chặn "Tiếp" khi thiếu, câu hỏi điều kiện.
  {
    const p = await newPage(); await login(p); await go(p, '/evaluate/w-1');
    rec('TB2-01', 'Mở B07: bước 1 "Phân loại vết thương", thanh 4 bước, nút "Tiếp: Mức độ" ở chân màn trong khung nhìn',
      (await heading(p)).includes('Bước 1 trên 4') && (await heading(p)).includes('Phân loại vết thương') && (await p.getByRole('tab').count()) === 4 && await btn(p, 'Tiếp: Mức độ').isVisible() && await footerIn(p), await heading(p));
    rec('TB2-01b', 'Bước 1 không có "Bước trước"; mức độ, diễn biến chưa hiện (một bước một lúc)', (await btn(p, 'Bước trước').count()) === 0 && !(await has(p, 'Mức độ vết thương')) && !(await has(p, 'Ngày tái đánh giá')));
    await click(btn(p, 'Tiếp: Mức độ'));
    const errs = await p.getByRole('alert').allInnerTexts();
    rec('TB2-02', 'Thiếu mục bắt buộc ở bước 1: không sang bước 2, báo tại 3 trường (loại, dịch tiết, nhiễm trùng)',
      (await heading(p)).includes('Bước 1') && ['Hãy chọn loại vết thương.', 'Hãy chọn mức dịch tiết.', 'Hãy chọn dấu hiệu nhiễm trùng.'].every((m) => errs.includes(m)), errs.join(' | '));
    await click(radio(p, 'Loét do tì đè'));
    const stageShown = await has(p, 'Giai đoạn (NPIAP)');
    await click(radio(p, 'Giai đoạn 2'));
    await click(radio(p, 'Bỏng'));
    const stageHidden = !(await has(p, 'Giai đoạn (NPIAP)'));
    await click(radio(p, 'Loét do tì đè'));
    const stageCleared = !(await checked(p, 'Giai đoạn 2'));
    rec('TB2-03', 'Câu điều kiện: chọn "Loét do tì đè" hiện "Giai đoạn (NPIAP)"; đổi loại thì ẩn và xóa giai đoạn như cũ', stageShown && stageHidden && stageCleared, `hiện ${stageShown}, ẩn ${stageHidden}, xóa ${stageCleared}`);
    await click(btn(p, 'Tiếp: Mức độ'));
    rec('TB2-03b', 'Loét do tì đè chưa chọn giai đoạn: "Tiếp" báo "Loét do tì đè cần chọn giai đoạn."', (await heading(p)).includes('Bước 1') && await has(p, 'Loét do tì đè cần chọn giai đoạn.'));

    // TB2-04: điền bước 1, sang bước 2, quay lại giữ dữ liệu.
    await click(radio(p, 'Giai đoạn 3'));
    await click(radio(p, 'Ít')); await click(radio(p, 'Không có dấu hiệu'));
    await click(btn(p, 'Tiếp: Mức độ'), 600);
    const onStep2 = (await heading(p)).includes('Bước 2 trên 4') && await has(p, 'Mức độ vết thương');
    await click(btn(p, 'Tiếp: Diễn biến'));
    const sevBlocked = (await heading(p)).includes('Bước 2') && await has(p, 'Hãy chọn mức Nhẹ, Trung bình hoặc Nặng.');
    await click(radio(p, 'Trung bình'));
    await p.getByPlaceholder('Nền, bờ, da xung quanh, dịch tiết, mô hạt…').fill('Bờ đều, nền đỏ');
    await click(btn(p, 'Bước trước'), 600);
    const kept1 = await checked(p, 'Loét do tì đè') && await checked(p, 'Giai đoạn 3') && await checked(p, 'Ít') && await checked(p, 'Không có dấu hiệu');
    await click(btn(p, 'Tiếp: Mức độ'), 600);
    const kept2 = await checked(p, 'Trung bình') && (await p.getByPlaceholder('Nền, bờ, da xung quanh, dịch tiết, mô hạt…').inputValue()) === 'Bờ đều, nền đỏ';
    rec('TB2-04', 'Sang bước 2; thiếu mức độ thì chặn; "Bước trước" rồi "Tiếp" giữ nguyên mọi lựa chọn và chữ đã gõ', onStep2 && sevBlocked && kept1 && kept2, `bước 2 ${onStep2}, chặn ${sevBlocked}, giữ bước 1 ${kept1}, giữ bước 2 ${kept2}`);
    const markOk = (await p.getByRole('tab', { name: /^1\. Phân loại, đã đủ$/ }).count()) === 1;
    rec('TB2-04b', 'Thanh bước đánh dấu bước 1 "đã đủ" sau khi điền', markOk);

    // TB2-05: ngày sai ở bước 3.
    await click(btn(p, 'Tiếp: Diễn biến'), 600);
    await p.getByPlaceholder('dd/mm/yyyy').fill('31/02/2026');
    await click(btn(p, 'Tiếp: Xem lại'));
    const badDate = (await heading(p)).includes('Bước 3') && await has(p, 'Ngày tái đánh giá không tồn tại.');
    await p.getByPlaceholder('dd/mm/yyyy').fill('2026-12-15');
    await click(btn(p, 'Tiếp: Xem lại'));
    const badFmt = await has(p, 'Ngày tái đánh giá theo dạng dd/mm/yyyy.');
    await p.getByPlaceholder('dd/mm/yyyy').fill('15/12/2026');
    await click(btn(p, 'Tiếp: Xem lại'), 600);
    const onReview = await p.getByTestId('se-luu').isVisible();
    rec('TB2-05', 'Bước 3: ngày không tồn tại, sai dạng đều chặn với câu báo cũ; ngày đúng thì sang "Xem lại"', badDate && badFmt && onReview, `${badDate} ${badFmt} ${onReview}`);

    // TB2-06: xem lại và sửa.
    const sum = (await p.getByTestId('se-luu').innerText()).replace(/\s+/g, ' ');
    const showsAll = ['Loét do tì đè, Giai đoạn 3', 'Ít', 'Không có dấu hiệu', 'Trung bình', 'Bờ đều, nền đỏ', '15/12/2026'].every((t) => sum.includes(t));
    rec('TB2-06', 'Bước "Xem lại" hiện đủ giá trị đã nhập theo nhóm, có "Sửa" cho từng nhóm', showsAll && (await p.getByRole('button', { name: /^Sửa bước / }).count()) === 3, sum.slice(0, 200));
    await click(btn(p, 'Sửa mức độ'), 600);
    const editAt2 = (await heading(p)).includes('Bước 2') && await radio(p, 'Nặng').isVisible();
    await click(radio(p, 'Nặng'));
    await click(p.getByRole('tab', { name: /^4\. Xem lại/ }), 600);
    const updated = (await p.getByTestId('se-luu').innerText()).includes('Nặng');
    rec('TB2-07', '"Sửa mức độ" đưa về bước 2 tại trường; đổi sang Nặng, về "Xem lại" thấy giá trị mới', editAt2 && updated);
    rec('TB2-07b', 'Bước "Xem lại": nút lưu ở chân màn, trong khung nhìn', await btn(p, 'Lưu và công bố cho bệnh nhân').isVisible() && await footerIn(p));

    // TB2-08: lưu nhiều lần chỉ tạo một bản ghi.
    const ev0 = (await store(p)).evaluations.length;
    const save = btn(p, 'Lưu và công bố cho bệnh nhân');
    await Promise.all([save.click(), save.click({ force: true }).catch(() => {}), save.click({ force: true }).catch(() => {})]);
    await p.waitForTimeout(1500);
    const ev1 = (await store(p)).evaluations;
    const mine = ev1.slice(ev0);
    rec('TB2-08', 'Bấm lưu liên tiếp 3 lần: đúng 1 đánh giá mới, đủ trường đã nhập', ev1.length === ev0 + 1 && mine[0]?.severity === 'severe' && mine[0]?.assessment?.pressureStage === 'Giai đoạn 3' && mine[0]?.nextReview === '2026-12-15' && mine[0]?.characteristics === 'Bờ đều, nền đỏ',
      `trước ${ev0}, sau ${ev1.length}; ${JSON.stringify(mine[0] ?? {}).slice(0, 160)}`);
    rec('TB2-09', 'Không lỗi JS, không tràn ngang', p.errors.length === 0 && (await overflow(p)) === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // TB2-10: lưu thẳng từ "Xem lại" khi thiếu mục ở bước khác: đưa tới bước của mục đầu, liệt kê mục và bước.
  {
    const p = await newPage(360, 740); await login(p); await go(p, '/evaluate/w-2');
    await click(p.getByRole('tab', { name: /^4\. Xem lại/ }), 600);
    const ev0 = (await store(p)).evaluations.length;
    await click(btn(p, /^Lưu và công bố/), 800);
    const h = await heading(p);
    const links = await p.getByTestId('muc-can-sua').getByRole('button').allInnerTexts().catch(() => []);
    rec('TB2-10', 'Lưu khi thiếu: không lưu; đưa về bước 1; liên kết ghi rõ bước của từng mục (có "mức độ (bước 2)")',
      (await store(p)).evaluations.length === ev0 && h.includes('Bước 1') && links.some((l) => l.includes('mức độ (bước 2)')), `${h} | ${links.join(', ')}`);
    await click(p.getByRole('button', { name: /^Tới mục Mức độ, bước 2$/ }), 600);
    rec('TB2-11', 'Liên kết "Tới mức độ (bước 2)" mở bước 2 tại trường mức độ', (await heading(p)).includes('Bước 2') && await radio(p, 'Nhẹ').isVisible());
    rec('TB2-11b', 'Thanh bước đánh dấu bước 1 "còn mục bắt buộc"', (await p.getByRole('tab', { name: /^1\. Phân loại, còn mục bắt buộc$/ }).count()) === 1);
    await p.context().close();
  }

  // TB2-12: rời màn khi đang nhập dở: hỏi, ở lại giữ dữ liệu và bước; đồng ý thì rời, không lưu.
  {
    const p = await newPage(); await login(p);
    await go(p, '/wounds/w-1'); await click(btn(p, 'Ghi đánh giá'), 1200);
    await click(radio(p, 'Bỏng'));
    await click(p.getByRole('tab', { name: /^2\. Mức độ/ }), 500);
    await click(radio(p, 'Nặng'));
    const ev0 = (await store(p)).evaluations.length;
    p.answer = false; let n = p.dialogs.length; await back(p);
    const asked = p.dialogs.slice(n).some((d) => d.includes('Bỏ dữ liệu chưa lưu?'));
    const stayed = (await heading(p)).includes('Bước 2') && await checked(p, 'Nặng');
    p.answer = true; n = p.dialogs.length; await back(p);
    const left = p.url().includes('/wounds/w-1') && (await store(p)).evaluations.length === ev0;
    rec('TB2-12', 'Đang nhập dở bấm quay lại trên đầu: hỏi; "Ở lại" giữ bước 2 và lựa chọn; đồng ý thì rời, không lưu', asked && stayed && left, `hỏi ${asked}, ở lại ${stayed}, rời ${left}`);
    await go(p, '/evaluate/w-1');
    rec('TB2-13', 'Mở lại sau khi rời: biểu mẫu mới (không có lưu tạm, như trước)', !(await checked(p, 'Bỏng')) && (await heading(p)).includes('Bước 1'));
    await p.context().close();
  }

  // TB2-14: mọi bước ở 320, 360, 390, 768: không tràn ngang, chân màn trong khung nhìn.
  for (const w of [320, 360, 390, 768]) {
    const p = await newPage(w, 740); await login(p); await go(p, '/evaluate/w-1');
    let ok = true; const det = [];
    for (let i = 1; i <= 4; i++) {
      await click(p.getByRole('tab', { name: new RegExp(`^${i}\\. `) }), 400);
      const o = await overflow(p); const f = await footerIn(p);
      if (o || !f) { ok = false; det.push(`bước ${i}: tràn ${o}, chân ${f}`); }
    }
    rec(`TB2-14-${w}`, `${w}px: 4 bước không tràn ngang, nút chân màn luôn trong khung nhìn, không lỗi JS`, ok && p.errors.length === 0, det.join('; ') + p.errors.join(' | ').slice(0, 120));
    await p.context().close();
  }

  await b.close();
  const pass = results.filter((r) => r.result === 'ĐẠT').length;
  fs.writeFileSync(path.join(OUT, 'ket-qua-tb-2.json'), JSON.stringify(results, null, 2));
  console.log(`\nTổng: ${pass} đạt, ${results.length - pass} lỗi`);
  process.exit(pass === results.length ? 0 : 1);
})();
