// Kiểm thử tình huống Đợt 9 (UX-01, QĐ-1 phương án A) trên bản web, Playwright.
// Bản web không có phiên AR. Để hiện được nhánh "có ước lượng AR" ở B10, dựng một bản kiểm thử riêng sau khi chạy
// `node scripts/tiem-ar-kiem-thu.cjs` (chỉ sửa bản sao làm việc, không commit), rồi `npx expo export -p web`.
// Kịch bản đặt window.__TEST_AR__ trước khi tải trang; bản dựng thường bỏ qua biến này.
// Chạy: node scripts/kiem-thu-dot-9.cjs <baseURL bản có tiêm AR> <thư mục ảnh> [nhãn ảnh]
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8202';
const OUT = process.argv[3] || '.';
const TAG = process.argv[4] || 'sau';
const PHOTO = path.join(__dirname, '..', 'assets', 'demo', 'demo_1.png');
const AREA = 11.8;
const TEST_AR = {
  ar: { framework: 'arcore', sessionId: 'TEST', frameTimestampNs: 1, trackingState: 'normal', imageRotationDeg: 0,
    sensorIntrinsics: { fx: 1000, fy: 1000, cx: 500, cy: 500, width: 1000, height: 1000 },
    intrinsics: { fx: 1000, fy: 1000, cx: 500, cy: 500, width: 1000, height: 1000 },
    cameraPose: {}, viewMatrix: [], projectionMatrix: [], planesTracked: 1, depthEnabled: false,
    centerHit: { centerDistanceM: 0.3, centerSource: 'plane' } },
  est: { areaCm2: AREA, depthM: 0.3, cosTilt: null },
};
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, pass, detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390, withAr = true) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, locale: 'vi-VN' });
    if (withAr) await ctx.addInitScript((t) => { window.__TEST_AR__ = t; }, TEST_AR);
    const p = await ctx.newPage();
    p.errors = []; p.on('pageerror', (e) => p.errors.push(e.message));
    p.on('dialog', (d) => d.accept());
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
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const imgs = async (p) => ((await store(p)).images || []).filter((i) => i.woundId === 'w-1');
  const openB10 = async (p) => { await p.goto(BASE + '/guided-capture?woundId=w-1'); await p.waitForTimeout(1500); };
  const pick = async (p) => {
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByText('Chọn ảnh có sẵn', { exact: true }).click()]);
    await fc.setFiles(PHOTO); await p.waitForTimeout(3000);
  };
  const areaBox = (p) => p.getByRole('textbox').filter({ hasNot: p.locator('[type=password]') }).first();
  const areaVal = async (p) => (await areaBox(p).inputValue());
  const has = async (p, t, exact = true) => (await p.getByText(t, { exact }).count()) > 0;
  const shot = async (p, file) => {
    const w = p.viewportSize().width;
    const H = await p.evaluate(() => { let best = document.documentElement.scrollHeight; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) best = Math.max(best, el.scrollHeight + (window.innerHeight - el.clientHeight)); } return Math.ceil(best); });
    await p.setViewportSize({ width: w, height: Math.max(844, H) }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file) }); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
  };
  const save = async (p) => { await p.getByText(/^Lưu ảnh/).first().click(); await p.waitForTimeout(2000); };

  // Ảnh B10 ở 4 khổ.
  for (const w of [320, 360, 390, 768]) {
    const p = await newPage(w); await login(p); await openB10(p); await pick(p);
    await shot(p, `b10-${TAG}-${w}.png`); await p.context().close();
  }

  {
    const p = await newPage(); await login(p);
    const n0 = (await imgs(p)).length;
    await openB10(p); await pick(p);
    rec('D9-01', 'Mở B10 có AR: số AR hiện, có nhãn tham khảo, ô diện tích trống',
      await has(p, 'Ước lượng AR (tham khảo)') && await has(p, '11,8 cm²') && await has(p, 'AI ước lượng · chưa kiểm chứng') && (await areaVal(p)) === '',
      `ô "${await areaVal(p)}"`);
    await p.waitForTimeout(3000);
    rec('D9-02', 'Chờ thêm 3 giây sau khi phân tích xong: số AR không bị chép vào ô', (await areaVal(p)) === '');
    rec('D9-03', 'Nút chính là "Lưu ảnh (chưa có số đo)" khi ô trống (P0 DS-06 đổi nhãn)', await has(p, 'Lưu ảnh (chưa có số đo)'));
    // Rời màn không lưu.
    await p.goBack(); await p.waitForTimeout(1200);
    rec('D9-04', 'Rời B10 không lưu: không phát sinh ảnh hoặc bản ghi đo', (await imgs(p)).length === n0);
    // Mở lại quy trình.
    await openB10(p); await pick(p);
    rec('D9-05', 'Mở lại quy trình: ô diện tích vẫn trống', (await areaVal(p)) === '');
    // Nhập không hợp lệ.
    await areaBox(p).fill('abc'); await save(p);
    const e1 = (await imgs(p)).length === n0 && (await p.getByText(/^Lưu ảnh/).count()) > 0;
    await areaBox(p).fill('0'); await save(p);
    rec('D9-06', 'Nhập "abc" rồi "0": bị chặn như luồng cũ, không tạo ảnh', e1 && (await imgs(p)).length === n0 && await has(p, 'Diện tích phải lớn hơn 0. Để trống nếu chưa đo.'));
    // Chụp / chọn lại sau khi nhập.
    await areaBox(p).fill('7'); await p.getByText('Chụp / chọn lại', { exact: true }).click(); await p.waitForTimeout(800); await pick(p);
    rec('D9-07', 'Gõ số rồi "Chụp / chọn lại": ô về trống, không mang số AR', (await areaVal(p)) === '');
    // Lưu không nhập số.
    await save(p);
    const a = await imgs(p); const im = a.find((x) => !a.slice(0, n0).includes(x)) || a[a.length - 1];
    rec('D9-08', 'Lưu khi ô trống: đúng 1 ảnh mới, diện tích bác sĩ trống, AR giữ riêng là "chưa kiểm chứng"',
      a.length === n0 + 1 && im.areaCm2 === null && im.capture?.manualReference?.areaCm2 === null && im.capture?.automaticMeasurement?.areaCm2 === AREA && im.capture?.automaticMeasurement?.status === 'estimated_unvalidated' && !im.measureMethod,
      `ảnh ${n0}→${a.length}, areaCm2 ${im.areaCm2}, manual ${im.capture?.manualReference?.areaCm2}, auto ${im.capture?.automaticMeasurement?.areaCm2}/${im.capture?.automaticMeasurement?.status}`);
    rec('D9-09', 'B11 sau khi lưu: không có chip "Bác sĩ nhập", AR ghi "chưa kiểm chứng"', !(await has(p, 'Bác sĩ nhập')) && await has(p, /chưa kiểm chứng/, false));
    await shot(p, `b11-${TAG}-luu-trong-390.png`);
    // Bác sĩ nhập số đo.
    await openB10(p); await pick(p);
    await areaBox(p).fill('9,5'); await p.getByRole('radio', { name: 'Thước đo trên vết thương' }).click(); await p.waitForTimeout(200);
    await save(p);
    const c = await imgs(p); const im2 = c[c.length - 1];
    rec('D9-10', 'Bác sĩ gõ 9,5, chọn "Thước đo": lưu đúng số và phương pháp bác sĩ, AR vẫn riêng',
      c.length === n0 + 2 && im2.areaCm2 === 9.5 && im2.capture?.manualReference?.method === 'Thước đo trên vết thương' && !!im2.capture?.manualReference?.confirmedBy && im2.capture?.automaticMeasurement?.areaCm2 === AREA,
      `area ${im2.areaCm2}, method ${im2.capture?.manualReference?.method}`);
    rec('D9-11', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  {
    const p = await newPage(390, false); await login(p);
    await openB10(p); await pick(p);
    rec('D9-12', 'Ảnh không có AR: không có số AR, câu "Không có dữ liệu AR…", ô trống',
      !(await has(p, 'Ước lượng AR (tham khảo)')) && await has(p, /Không có dữ liệu AR/, false) && (await areaVal(p)) === '');
    rec('D9-13', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  await b.close();
  const ok = results.filter((r) => r.pass).length;
  console.log(`\n${ok}/${results.length} đạt`);
  process.exit(ok === results.length ? 0 : 1);
})();
