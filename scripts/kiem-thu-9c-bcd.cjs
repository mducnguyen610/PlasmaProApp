// Kiểm thử Stage 9C gói D (tích hợp, web tĩnh, THIẾT BỊ GIẢ LẬP, dữ liệu mô phỏng): ghi lỗi, giữ bản nháp, báo lỗi ghi nền,
// dữ liệu hỏng được giữ bản sao, kho không đọc được thì không ghi. Lỗi ghi được giả lập bằng cách làm localStorage.setItem ném lỗi.
// Chạy: node scripts/kiem-thu-9c-bcd.cjs <baseURL> <thư mục kết quả>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8600';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'plasmapro.demo.v2';
const results = [];
const rec = (id, name, pass, detail = '') => {
  results.push({ id, name, result: pass ? 'ĐẠT' : 'LỖI', detail });
  console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : '');
};

(async () => {
  const b = await chromium.launch();
  const newPage = async (init) => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    // Công tắc lỗi ghi: window.__failWrites = true thì mọi lần ghi khóa dữ liệu ném lỗi như hết dung lượng.
    await ctx.addInitScript((k) => {
      const orig = Storage.prototype.setItem;
      window.__writes = 0;
      Storage.prototype.setItem = function (key, value) {
        if (key === k) { if (window.__failWrites) throw new DOMException('Giả lập hết dung lượng', 'QuotaExceededError'); window.__writes++; }
        return orig.call(this, key, value);
      };
    }, KEY);
    if (init) await ctx.addInitScript(init, KEY);
    const p = await ctx.newPage();
    p.errors = []; p.dialogs = [];
    p.on('pageerror', (e) => p.errors.push(e.message));
    p.on('dialog', (d) => { p.dialogs.push(d.message()); d.accept(); });
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
  const store = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  const fail = (p, on) => p.evaluate((v) => { window.__failWrites = v; }, on);
  const btn = (p, name) => p.getByRole('button', { name, exact: typeof name === 'string' }).locator('visible=true');
  const click = async (loc, t = 400) => { await loc.first().click(); await loc.page().waitForTimeout(t); };
  const banner = (p) => p.locator('[data-testid="persist-banner"]:visible');

  // ===== D-01: B11 lưu diện tích khi ghi lỗi: không lưu, giữ số đang nhập, thử lại thì lưu =====
  {
    const p = await newPage();
    await login(p, 'bacsi');
    await go(p, '/images/IMG0004');
    const box = p.getByRole('textbox', { name: /^Diện tích bác sĩ (đã )?đo/ }).locator('visible=true').first();
    await box.fill('4,2');
    const m = p.getByRole('radio').locator('visible=true'); if (await m.count()) await m.first().click();
    await fail(p, true);
    p.dialogs.length = 0;
    await click(btn(p, 'Lưu diện tích'), 1500);
    const s1 = await store(p);
    const kept = await box.inputValue().catch(() => '');
    rec('9C-D-01', 'B11 ghi lỗi: bộ nhớ máy không có số đo mới', s1.images.find((x) => x.id === 'IMG0004')?.areaCm2 == null, String(s1.images.find((x) => x.id === 'IMG0004')?.areaCm2));
    rec('9C-D-02', 'B11 ghi lỗi: ô nhập giữ nguyên số vừa nhập (bản nháp)', kept === '4,2', kept);
    const txt = (await p.locator('body').innerText()) + ' ' + p.dialogs.join(' ');
    rec('9C-D-03', 'B11 ghi lỗi: có báo chưa lưu được, không báo đã lưu', /chưa lưu|không lưu|lưu không được|chưa ghi/i.test(txt) && !/Đã lưu diện tích/.test(txt), (p.dialogs.join(' | ') || txt.slice(0, 120)).slice(0, 160));
    await fail(p, false);
    await click(btn(p, 'Lưu diện tích'), 1500);
    const s2 = await store(p);
    rec('9C-D-04', 'B11 thử lại sau khi hết lỗi: lưu đúng 4,2', s2.images.find((x) => x.id === 'IMG0004')?.areaCm2 === 4.2, String(s2.images.find((x) => x.id === 'IMG0004')?.areaCm2));
    rec('9C-D-z1', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== D-05: bệnh nhân gửi báo cáo khi ghi lỗi: ở lại màn, giữ nội dung, không có báo cáo giả =====
  {
    const p = await newPage();
    await login(p, 'benhnhan');
    await go(p, '/report');
    const r0 = (await store(p)).reports.length;
    const box = p.getByRole('textbox').locator('visible=true').first();
    await box.fill('Kiểm thử 9C: đau nhẹ');
    await fail(p, true);
    p.dialogs.length = 0;
    await click(p.locator('[data-testid="screen-footer"]:visible').last().getByRole('button', { name: 'Gửi', exact: true }), 1500);
    const r1 = (await store(p)).reports.length;
    rec('9C-D-05', 'N08 ghi lỗi: không có báo cáo mới trong bộ nhớ máy', r1 === r0, `${r0} → ${r1}`);
    rec('9C-D-06', 'N08 ghi lỗi: ở lại màn báo cáo, nội dung đang nhập còn nguyên', p.url().includes('/report') && (await box.inputValue().catch(() => '')) === 'Kiểm thử 9C: đau nhẹ', p.url());
    rec('9C-D-07', 'N08 ghi lỗi: báo "Chưa gửi được" kèm hướng dẫn gọi 115', p.dialogs.some((x) => /Chưa gửi được/.test(x) && /115/.test(x)), p.dialogs.join(' | ').slice(0, 160));
    await fail(p, false);
    await click(p.locator('[data-testid="screen-footer"]:visible').last().getByRole('button', { name: 'Gửi', exact: true }), 1500);
    rec('9C-D-08', 'N08 thử lại sau khi hết lỗi: gửi được đúng một báo cáo', (await store(p)).reports.length === r0 + 1, String((await store(p)).reports.length - r0));
    rec('9C-D-z2', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== D-09: ghi nền lỗi (khôi phục dữ liệu mô phỏng của quản trị, đường ghi nền còn lại trong bản phát hành):
  // hiện thông báo ở đầu màn, Thử lưu lại thì hết =====
  {
    const p = await newPage();
    await login(p, 'quantri');
    // Đổi một giá trị để biết bản khôi phục đã được ghi.
    await p.evaluate((k) => { const d = JSON.parse(localStorage.getItem(k)); d.patients[0].name = 'Tên tạm 9C'; localStorage.setItem(k, JSON.stringify(d)); }, KEY);
    await go(p, '/admin/account');
    await fail(p, true);
    const reset = btn(p, 'Khôi phục dữ liệu mô phỏng');
    const hasReset = await reset.count();
    if (hasReset) await click(reset, 2000);
    const shown = await banner(p).count();
    rec('9C-D-09', 'Ghi nền lỗi: thông báo "Chưa lưu được" hiện ở đầu màn', hasReset > 0 && shown > 0 && /Chưa lưu được/.test(await banner(p).first().innerText().catch(() => '')), `nút ${hasReset}, thông báo ${shown}`);
    rec('9C-D-09b', 'Ghi nền lỗi: bộ nhớ máy vẫn là bản cũ (không có bản ghi dở)', (await store(p)).patients?.[0]?.name === 'Tên tạm 9C', (await store(p)).patients?.[0]?.name);
    await fail(p, false);
    if (shown) await click(banner(p).getByRole('button', { name: 'Thử lưu lại', exact: true }), 1200);
    const after = await banner(p).count();
    const name = (await store(p)).patients?.[0]?.name;
    rec('9C-D-10', 'Thử lưu lại: thông báo mất, bộ nhớ máy có bản đang hiển thị', after === 0 && name !== 'Tên tạm 9C', `thông báo ${after}, tên ${name}`);
    rec('9C-D-z3', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== D-11: dữ liệu trên máy hỏng: giữ bản sao nguyên văn, báo cho người dùng =====
  {
    const p = await newPage((k) => { if (!sessionStorage.getItem('__seeded')) { sessionStorage.setItem('__seeded', '1'); localStorage.setItem(k, '{du-lieu-hong'); } });
    await p.goto(BASE + '/'); await p.waitForTimeout(1500);
    const backups = await p.evaluate(() => Object.keys(localStorage).filter((x) => x.startsWith('plasmapro.demo.v2.khong-doc-duoc.')).map((x) => localStorage.getItem(x)));
    rec('9C-D-11', 'Dữ liệu hỏng: bản gốc được chép sang khóa sao lưu nguyên văn', backups.length === 1 && backups[0] === '{du-lieu-hong', JSON.stringify(backups));
    const t = await banner(p).first().innerText().catch(() => '');
    rec('9C-D-12', 'Dữ liệu hỏng: báo đang dùng dữ liệu mẫu và bản cũ được giữ', /không đọc được/.test(t) && /giữ lại/.test(t), t.slice(0, 120));
    await click(banner(p).getByRole('button', { name: 'Đã hiểu', exact: true }), 500);
    rec('9C-D-13', 'Đã hiểu: ẩn thông báo, bản sao vẫn còn', (await banner(p).count()) === 0 && (await p.evaluate(() => Object.keys(localStorage).some((x) => x.startsWith('plasmapro.demo.v2.khong-doc-duoc.')))), '');
    await p.context().close();
  }

  // ===== D-14: kho không đọc được: không ghi đè dữ liệu cũ =====
  {
    const p = await newPage((k) => {
      localStorage.setItem(k + '.goc', 'giu-nguyen');
      const orig = Storage.prototype.getItem;
      Storage.prototype.getItem = function (key) { if (key === k) throw new Error('Giả lập lỗi đọc'); return orig.call(this, key); };
    });
    await p.goto(BASE + '/'); await p.waitForTimeout(2500);
    const writes = await p.evaluate(() => window.__writes);
    const t = await banner(p).first().innerText().catch(() => '');
    rec('9C-D-14', 'Kho không đọc được: không ghi khóa dữ liệu, báo tạm không lưu', writes === 0 && /Không đọc được bộ nhớ máy/.test(t), `ghi ${writes}; ${t.slice(0, 80)}`);
    await p.context().close();
  }

  // ===== C-01..C-03: T01 bấm nạp hai lần liền; T02 có thông báo lưu trữ ở đầu màn vẫn thấy và bấm được nút Dừng =====
  {
    // Làm hỏng dữ liệu ngay trước khi mở T01 (vẫn giữ phiên đăng nhập) để thông báo lưu trữ hiện suốt luồng T01, T02.
    const p = await newPage((k) => { if (sessionStorage.getItem('__corrupt') === '1') { sessionStorage.setItem('__corrupt', '0'); localStorage.setItem(k, '{hong'); } });
    await login(p, 'benhnhan');
    await p.evaluate(() => sessionStorage.setItem('__corrupt', '1'));
    await go(p, '/connect-device');
    const footer = () => p.locator('[data-testid="screen-footer"]:visible').last();
    await footer().getByText('Kết nối', { exact: true }).click(); await p.waitForTimeout(1500);
    const l0 = ((await store(p)).deviceLinks ?? []).length;
    const load = footer().getByRole('button', { name: 'Nạp liệu trình vào máy', exact: true });
    const canLoad = await load.count();
    if (canLoad) await load.dblclick();
    await p.waitForTimeout(2500);
    const l1 = ((await store(p)).deviceLinks ?? []).length;
    rec('9C-C-01', 'T01 bấm "Nạp liệu trình vào máy" hai lần liền: chỉ một lần nạp được ghi', canLoad > 0 && l1 - l0 === 1, `nút ${canLoad}, ghi thêm ${l1 - l0}`);
    const mon = footer().getByText('Theo dõi phiên điều trị', { exact: true });
    if (await mon.count()) { await mon.click(); await p.waitForTimeout(1200); }
    const startBtn = p.getByText('Bắt đầu điều trị', { exact: true });
    if (await startBtn.count()) { await startBtn.click(); await p.waitForTimeout(2200); }
    const pos = [];
    for (const [w, h] of [[320, 640], [360, 740], [390, 844]]) {
      await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250);
      const loc = p.getByText('Dừng điều trị', { exact: true }).last();
      const bb = await loc.boundingBox();
      const vh = h;
      const ok = !!bb && bb.y >= 0 && bb.y + bb.height <= vh && await p.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); const b = e && e.closest('[role="button"]'); return !!b && b.getAttribute('aria-label') === 'Dừng điều trị'; }, bb ? { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 } : { x: 0, y: 0 });
      pos.push(`${w}x${h}:${ok ? 'thấy' : 'LỖI'}`);
    }
    const bannerOn = (await banner(p).count()) > 0;
    rec('9C-C-02', 'T02 đang điều trị, có thông báo lưu trữ: "Dừng điều trị" vẫn trong màn đầu, không bị che', bannerOn && pos.every((x) => x.includes('thấy')), `thông báo ${bannerOn}, ${pos.join(', ')}`);
    rec('9C-C-03', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  fs.writeFileSync(path.join(OUT, 'ket-qua-9c-bcd.json'), JSON.stringify(results, null, 2));
  const n = (r) => results.filter((x) => x.result === r).length;
  console.log(`TỔNG: ${n('ĐẠT')} đạt, ${n('LỖI')} lỗi`);
  await b.close();
  process.exit(n('LỖI') ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
