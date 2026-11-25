// ĐÃ BỎ 25/11/2026: bộ lọc B02 theo mức độ, báo cáo, việc hôm nay được thay bằng 4 trạng thái H7 và Có, Chưa có phác đồ hoạt động
// (TONG-HOP-LOGIC-BAC-SI.md mục 3.1, M7). Ca thay thế: LC-10 trong scripts/kiem-thu-logic-chot.cjs.
// Kiểm thử bộ lọc thu gọn ở B02 (tab Bệnh nhân của bác sĩ), cùng kiểu mục "Bộ lọc" của tab Ảnh (B12).
// Bản web, dữ liệu mô phỏng, Playwright. Chạy: node scripts/kiem-thu-bo-loc-b02.cjs <baseURL> <thư mục kết quả>
// Giai đoạn B (CN1 H5): ô tìm bệnh nhân đổi nhãn thành "Tìm bệnh nhân theo mã" (chỉ tìm theo mã); kịch bản đổi theo nhãn mới.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8720';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => {
  results.push({ id, name, result: pass ? 'ĐẠT' : 'LỖI', detail });
  console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : '');
};

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390, h = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.errors = [];
    p.on('dialog', (d) => d.dismiss());
    p.on('pageerror', (e) => p.errors.push(e.message));
    return p;
  };
  const login = async (p, user) => {
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1500); };
  const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const shot = async (p, name) => { await p.screenshot({ path: path.join(OUT, `${name}.png`) }); };
  // Mục "Bộ lọc" (Disclosure, như tab Ảnh B12): nhãn đọc màn hình là "Bộ lọc, <tóm tắt>".
  const fbtn = (p) => p.getByRole('button', { name: /^Bộ lọc, / }).locator('visible=true').first();
  const toggle = async (p) => { await fbtn(p).click(); await p.waitForTimeout(500); };
  const isOpen = async (p) => (await p.getByRole('radio', { name: 'Hôm nay: mọi trạng thái' }).locator('visible=true').count()) > 0;
  const summary = async (p) => ((await fbtn(p).getAttribute('aria-label')) || '').replace(/^Bộ lọc, /, '');
  // Số kết quả lấy từ tiêu đề "Kết quả (n)" (dòng hồ sơ có thể nằm ngoài khung nhìn); 0 khi không có kết quả.
  const listed = async (p) => { const t = await p.getByText(/^Kết quả \(\d+\)$/).locator('visible=true').first().textContent({ timeout: 1500 }).catch(() => 'Kết quả (0)'); return Number(t.match(/\d+/)[0]); };
  const radio = (p, name) => p.getByRole('radio', { name }).locator('visible=true').first();
  const visibleText = async (p, t) => (await p.getByText(t, { exact: true }).locator('visible=true').count()) > 0;
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  {
    const p = await newPage();
    await login(p, 'bacsi');
    await go(p, '/doctor/patients');
    const all = await listed(p);
    rec('B02F-01', 'Mặc định đóng như tab Ảnh: mục "Bộ lọc" có tóm tắt "Tất cả hồ sơ · Hôm nay: Mọi trạng thái", hai hàng lọc ẩn, ô tìm kiếm vẫn ở đầu màn',
      await fbtn(p).isVisible() && !(await isOpen(p)) && (await summary(p)) === 'Tất cả hồ sơ · Hôm nay: Mọi trạng thái' && await p.locator('[aria-label="Tìm bệnh nhân theo mã"]:visible').count() > 0, `${all} hồ sơ`);
    await shot(p, 'b02-bo-loc-dong-390');
    await toggle(p);
    rec('B02F-02', 'Chạm "Bộ lọc": hiện hai hàng "Lọc theo hồ sơ" và "Hôm nay"; danh sách không đổi', await isOpen(p) && await radio(p, 'Tất cả').isVisible() && (await listed(p)) === all);
    await shot(p, 'b02-bo-loc-mo-390');
    await radio(p, /^Có báo cáo/).click(); await p.waitForTimeout(400);
    const rep = await listed(p);
    rec('B02F-03', 'Chọn "Có báo cáo": tóm tắt đổi thành "Có báo cáo · Hôm nay: Mọi trạng thái", kết quả lọc', (await summary(p)) === 'Có báo cáo · Hôm nay: Mọi trạng thái' && rep < all, `${rep}/${all}`);
    await toggle(p);
    rec('B02F-04', 'Đóng khi đang lọc: kết quả giữ, tóm tắt nêu bộ lọc đang dùng', !(await isOpen(p)) && (await listed(p)) === rep && await visibleText(p, 'Có báo cáo · Hôm nay: Mọi trạng thái'));
    await toggle(p);
    rec('B02F-05', 'Mở lại: "Có báo cáo" vẫn được chọn (kết quả không đổi)', await isOpen(p) && (await listed(p)) === rep);
    const todayOpt = p.getByRole('radio', { name: /^Hôm nay: (?!mọi)/ }).locator('visible=true').first();
    const todayLabel = ((await todayOpt.getAttribute('aria-label')) || '').replace(/^Hôm nay: /, '').replace(/, \d+ bệnh nhân$/, '');
    await todayOpt.click(); await p.waitForTimeout(400);
    const both = await listed(p);
    await toggle(p);
    rec('B02F-06', 'Hai hàng lọc cùng dùng: tóm tắt nêu cả hai, kết quả giữ khi đóng', (await summary(p)) === `Có báo cáo · Hôm nay: ${todayLabel}` && (await listed(p)) === both, todayLabel);
    await p.locator('[aria-label="Tìm bệnh nhân theo mã"]:visible').first().fill('zzzz'); await p.waitForTimeout(400);
    rec('B02F-07', 'Ô tìm kiếm dùng được khi bộ lọc đóng; không có kết quả thì báo "Không tìm thấy"', await visibleText(p, 'Không tìm thấy bệnh nhân phù hợp.') && !(await isOpen(p)));
    await p.locator('[aria-label="Tìm bệnh nhân theo mã"]:visible').first().fill(''); await p.waitForTimeout(300);
    rec('B02F-08', 'Vùng chạm của mục "Bộ lọc" cao tối thiểu 44 px', ((await fbtn(p).boundingBox()) || { height: 0 }).height >= 44);
    await go(p, '/doctor');
    const tile = p.getByRole('button', { name: /Báo cáo mới/ }).first();
    if (await tile.count()) {
      await tile.click(); await p.waitForTimeout(1200);
      rec('B02F-09', 'Mở từ ô "Báo cáo mới" ở B01: lọc sẵn "Có báo cáo" (luồng cũ giữ nguyên), tóm tắt nêu bộ lọc dù mục đang đóng',
        p.url().includes('/doctor/patients') && (await summary(p)) === 'Có báo cáo · Hôm nay: Mọi trạng thái' && (await listed(p)) === rep, p.url().replace(BASE, ''));
    } else rec('B02F-09', 'Ô "Báo cáo mới" ở B01', false, 'không thấy ô');
    rec('B02F-10', 'Không có lỗi trang', p.errors.length === 0, p.errors.join(' | '));
    await p.close();
  }
  for (const w of [320, 360, 390, 768]) {
    const p = await newPage(w, w === 768 ? 1024 : 800);
    await login(p, 'bacsi');
    await go(p, '/doctor/patients');
    const ok1 = (await overflow(p)) <= 0 && await fbtn(p).isVisible();
    await toggle(p);
    await radio(p, /^Có báo cáo/).click(); await p.waitForTimeout(300);
    const ok2 = (await overflow(p)) <= 0 && await isOpen(p);
    await toggle(p);
    const ok3 = (await overflow(p)) <= 0;
    if (w === 320) await shot(p, 'b02-bo-loc-320');
    rec(`B02F-RS-${w}`, `Màn ${w} px: B02 mở và đóng bộ lọc không tràn ngang`, ok1 && ok2 && ok3);
    await p.close();
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'ket-qua-bo-loc-b02.json'), JSON.stringify(results, null, 2));
  const bad = results.filter((r) => r.result === 'LỖI').length;
  console.log(`\nTổng: ${results.length}, đạt ${results.length - bad}, lỗi ${bad}`);
  process.exit(bad ? 1 : 0);
})();
