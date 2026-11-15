// Đo hiệu năng Stage 9C (gói F) trên bản web tĩnh, dữ liệu mô phỏng. Đo trước và sau khi sửa để có số so sánh.
// Đo: số lần ghi toàn bộ dữ liệu (localStorage.setItem khóa dữ liệu) và số byte ghi cho MỘT thao tác lưu (B11 lưu diện tích),
// thời gian mở trang chủ bác sĩ, kích thước dữ liệu. Số đo trên Chromium máy chạy kịch bản, không đại diện cho điện thoại thật.
// Chạy: node scripts/do-hieu-nang-9c.cjs <baseURL> <tệp JSON kết quả> [số lần lặp]
const { chromium } = require('playwright');
const fs = require('fs');
const BASE = process.argv[2] || 'http://localhost:8600';
const OUT = process.argv[3] || 'hieu-nang.json';
const N = Number(process.argv[4] || 5);
const KEY = 'plasmapro.demo.v2';

(async () => {
  const b = await chromium.launch();
  const runs = [];
  for (let i = 0; i < N; i++) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    // Đếm mọi lần ghi khóa dữ liệu, kèm số byte.
    await ctx.addInitScript((k) => {
      const orig = Storage.prototype.setItem;
      window.__writes = [];
      Storage.prototype.setItem = function (key, value) { if (key === k) window.__writes.push(String(value).length); return orig.call(this, key, value); };
    }, KEY);
    const p = await ctx.newPage();
    p.on('dialog', (d) => d.accept()); // hộp xác nhận số đo (nếu có): đồng ý
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill('bacsi');
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    // Thời gian mở trang chủ bác sĩ: từ lệnh mở tới khi thấy tiêu đề nhóm "Việc cần làm".
    const t0 = Date.now();
    await p.goto(BASE + '/doctor');
    await p.getByText('Việc cần làm', { exact: true }).first().waitFor({ state: 'visible' });
    const homeMs = Date.now() - t0;
    // Một thao tác lưu: B11, ảnh chưa đo IMG0004, nhập 4,2 cm², chọn phương pháp nếu có, bấm "Lưu diện tích".
    await p.goto(BASE + '/images/IMG0004'); await p.waitForTimeout(1500);
    await p.getByRole('textbox', { name: /^Diện tích bác sĩ (đã )?đo/ }).locator('visible=true').first().fill('4,2');
    const methods = p.getByRole('radio').locator('visible=true');
    if (await methods.count()) await methods.first().click();
    await p.waitForTimeout(300);
    await p.evaluate(() => { window.__writes = []; });
    await p.getByRole('button', { name: 'Lưu diện tích', exact: true }).locator('visible=true').first().click();
    await p.waitForTimeout(1500);
    const writes = await p.evaluate(() => window.__writes);
    const saved = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).images.find((x) => x.id === 'IMG0004')?.areaCm2, KEY);
    const bytes = await p.evaluate((k) => localStorage.getItem(k).length, KEY);
    runs.push({ homeMs, writesPerSave: writes.length, bytesWrittenPerSave: writes.reduce((a, x) => a + x, 0), saved, dataBytes: bytes });
    await ctx.close();
  }
  const med = (k) => { const v = runs.map((r) => r[k]).sort((a, b) => a - b); return v[Math.floor(v.length / 2)]; };
  const summary = { base: BASE, n: N, median: { homeMs: med('homeMs'), writesPerSave: med('writesPerSave'), bytesWrittenPerSave: med('bytesWrittenPerSave'), dataBytes: med('dataBytes') }, allSaved: runs.every((r) => r.saved === 4.2), runs };
  fs.writeFileSync(OUT, JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary.median), 'đã lưu đúng 4,2:', summary.allSaved);
  await b.close();
})().catch((e) => { console.error(e); process.exit(2); });
