// Trạng thái Hết hạn (TONG-HOP-LOGIC-BAC-SI.md mục 4.3; người dùng chốt 25/11/2026 làm theo mục 4.3 thay vì bỏ AU-07 ở mục 10).
// Phác đồ Đang hoạt động qua ngày kết thúc tự chuyển Hết hạn; bệnh nhân không chạy được phiên; bác sĩ gia hạn hoặc kết thúc.
// Chỉ kiểm trên một máy (demo một điện thoại); không thay cho thử trên máy thật hay thử với bác sĩ.
// Chạy: node scripts/kiem-thu-het-han.cjs <baseURL> <thư mục kết quả>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8710';
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
    p.dialogs = []; p.errors = []; p.accept = true;
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().replace(/\n+/g, ' | ')}`); if (p.accept && d.type() === 'confirm') d.accept(); else d.dismiss(); });
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
  const has = async (p, t, exact = true) => (await p.locator(`text=${exact ? `"${t}"` : t}`).locator('visible=true').count()) > 0;
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const radio = (p, name) => p.getByRole('radio', { name, exact: true }).locator('visible=true').first();
  const btn = (p, name) => p.getByRole('button', { name, exact: true }).locator('visible=true').last();
  const callStore = async (p, fn, ...args) => {
    const res = await p.evaluate(async ({ fn, args }) => {
      let v = null;
      for (const el of document.querySelectorAll('*')) {
        const k = Object.keys(el).find((x) => x.startsWith('__reactFiber'));
        if (!k) continue;
        let f = el[k];
        while (f) { const val = f.memoizedProps && f.memoizedProps.value; if (val && typeof val.saveImageLabel === 'function') { v = val; break; } f = f.return; }
        if (v) break;
      }
      if (!v) return { noStore: true };
      try { const r = await v[fn](...args); return { ok: true, r: r && typeof r === 'object' ? JSON.parse(JSON.stringify(r)) : r }; } catch (e) { return { ok: false, error: String(e && e.message || e) }; }
    }, { fn, args });
    if (res.noStore) throw new Error(`Không tìm thấy store khi gọi ${fn}`);
    await p.waitForTimeout(300);
    return res;
  };

  const vn = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const addD = (iso, n) => new Date(new Date(`${iso}T00:00:00Z`).getTime() + n * 86400000).toISOString().slice(0, 10);
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
  const sheetBtn = (p, name) => p.getByTestId('bang-phac-do').getByRole('button', { name, exact: true });


  const p = await newPage(); await login(p, 'bacsi');
  await go(p, '/doctor');
  // Dữ liệu mẫu pl-1 (Đang hoạt động): lùi ngày kết thúc về hôm qua rồi mở lại ứng dụng.
  const yest = addD(today, -1);
  await p.evaluate((end) => {
    const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2'));
    const pl = d.plans.find((x) => x.id === 'pl-1');
    pl.endDate = end; if (pl.phases && pl.phases.length) pl.phases[pl.phases.length - 1].to = end;
    localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d));
  }, yest);
  await go(p, '/wounds/w-1?the=phac-do'); await p.waitForTimeout(800);
  let d = await store(p);
  let pl = d.plans.find((x) => x.id === 'pl-1');
  const log = (pl.statusLog || []).filter((x) => x.action === 'expire');
  rec('HH-01', 'Qua ngày kết thúc: phác đồ tự chuyển Hết hạn, ghi nhật ký do hệ thống (mục 4.3)', pl.status === 'expired' && log.length === 1 && log[0].by === 'system', `${pl.status}, ${log.length} dòng`);
  const card = p.getByTestId('phac-do-dang-hoat-dong');
  const chip = await card.getByText('Hết hạn', { exact: true }).count();
  const note = await has(p, 'Bệnh nhân không chạy được phiên', false);
  const okBtns = await btn(p, 'Gia hạn').count() === 1 && await btn(p, 'Kết thúc phác đồ').count() === 1 && await btn(p, 'Xem chi tiết').count() === 1;
  const noPause = await btn(p, 'Tạm dừng').count() === 0 && await btn(p, 'Tiếp tục').count() === 0 && await btn(p, 'Kết thúc sớm').count() === 0;
  rec('HH-02', 'Thẻ Phác đồ: chip Hết hạn, câu báo bệnh nhân không chạy được phiên; nút Gia hạn, Kết thúc phác đồ, Xem chi tiết; không Tạm dừng', chip > 0 && note && okBtns && noPause, `chip ${chip}, câu ${note}, nút ${okBtns}, không tạm dừng ${noPause}`);
  await go(p, '/plan-detail/pr-demo-1');
  const g1 = p.getByTestId('nhom-1');
  rec('HH-03', 'Chi tiết phác đồ: trạng thái Hết hạn, lịch sử ghi "Hết hạn (tự động...)" người "Tự động"; không có nút Đổi thông số',
    await g1.getByText('Hết hạn', { exact: true }).count() > 0 && await has(p, 'Hết hạn (tự động khi qua ngày kết thúc)', false) && await has(p, 'Tự động', false) && await btn(p, 'Đổi thông số').count() === 0);
  // Bệnh nhân (demo một máy): đăng xuất, đăng nhập bệnh nhân.
  await callStore(p, 'logout');
  await login(p, 'benhnhan');
  await go(p, '/schedule');
  const pt = await has(p, 'Đợt hết hạn', false);
  await go(p, '/patient');
  const start = p.getByRole('button', { name: /Bắt đầu điều trị/ }).locator('visible=true');
  const startable = (await start.count()) > 0 && !(await start.first().isDisabled().catch(() => true)) && (await start.first().getAttribute('aria-disabled')) !== 'true';
  rec('HH-04', 'Phía bệnh nhân: lịch ghi Đợt hết hạn; không bắt đầu được phiên (P5)', pt && !startable, `lịch ${pt}, nút bắt đầu dùng được ${startable}`);
  await callStore(p, 'logout');
  await login(p, 'bacsi');
  await go(p, '/wounds/w-1?the=phac-do');
  await btn(p, 'Gia hạn').click(); await p.waitForTimeout(300);
  const toEnd = addD(today, 14);
  await p.getByTestId('bang-phac-do').getByLabel('Ngày kết thúc mới').fill(vn(toEnd).replace(/\//g, ''));
  await p.getByTestId('bang-phac-do').getByLabel('Lý do').fill('Vết chưa liền, gia hạn 2 tuần');
  await sheetBtn(p, 'Gia hạn').click(); await p.waitForTimeout(1200);
  d = await store(p);
  pl = d.plans.find((x) => x.id === 'pl-1');
  rec('HH-05', 'Gia hạn phác đồ hết hạn: hoạt động lại, ngày kết thúc mới, chờ bệnh nhân xác nhận, không tạo phiên bản (M32)',
    pl.status === 'active' && pl.endDate === toEnd && pl.extensions?.length === 1 && !pl.extensions[0].ackAt && d.plans.filter((x) => x.protocolId === 'pr-demo-1').length === 1 && await btn(p, 'Tạm dừng').count() === 1, `${pl.status} ${pl.endDate}`);
  rec('HH-06', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 200));
  await p.context().close();

  await b.close();
  fs.writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.result === 'ĐẠT').length;
  console.log(`Tổng: ${results.length}, đạt ${pass}, lỗi ${results.length - pass}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
