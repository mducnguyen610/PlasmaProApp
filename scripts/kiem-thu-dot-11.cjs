// Kiểm thử tình huống Đợt 11 (R-07: màn bệnh nhân) trên bản web, Playwright.
// Chạy: node scripts/kiem-thu-dot-11.cjs <baseURL> <thư mục ảnh> [nhãn ảnh] [--chi-anh]
// Dữ liệu mẫu chỉ có một vết thương mỗi bệnh nhân. Để kiểm UX-20, UX-24, kịch bản thêm vào bộ nhớ trình duyệt một vết thương thứ hai
// cho BN001 cùng một đợt đã xác nhận và một đánh giá đã công bố (dữ liệu kiểm thử, chép từ bản ghi sẵn có của VT01).
const { chromium } = require('playwright');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8401';
const OUT = process.argv[3] || '.';
const TAG = process.argv[4] || 'sau';
const ONLY_SHOTS = process.argv.includes('--chi-anh');
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, pass, detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390, clock = false) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    if (clock) await p.clock.install();
    p.dialogs = []; p.errors = [];
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().split('\n')[0]} || ${d.message().split('\n').slice(1).join(' ')}`); d.accept(); });
    p.on('pageerror', (e) => p.errors.push(e.message));
    return p;
  };
  const login = async (p, user) => {
    await p.evaluate(() => localStorage.removeItem('plasmapro.session.v1')).catch(() => {});
    await p.goto(BASE + '/'); await p.waitForTimeout(1000);
    await p.getByPlaceholder('Nhập tên đăng nhập').fill(user);
    await p.getByPlaceholder('Nhập mật khẩu').fill('Demo@123');
    await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1000);
    const cb = p.getByRole('checkbox');
    if (await cb.count()) { await cb.first().click(); await p.getByText('Đăng nhập', { exact: true }).last().click(); await p.waitForTimeout(1200); }
    const skip = p.getByText('Bỏ qua'); if (await skip.count()) { await skip.first().click(); await p.waitForTimeout(600); }
  };
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1600); };
  const has = async (p, t, exact = true) => (await p.getByText(t, { exact }).count()) > 0;
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  const shot = async (p, file) => {
    const w = p.viewportSize().width;
    const H = await p.evaluate(() => { let best = document.documentElement.scrollHeight; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) best = Math.max(best, el.scrollHeight + (window.innerHeight - el.clientHeight)); } return Math.ceil(best); });
    await p.setViewportSize({ width: w, height: Math.max(844, H) }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file) }); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
  };
  // Tràn ngang: phần tử chữ vượt mép phải khung nhìn.
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });
  // Thêm VT02 cho BN001 (dữ liệu kiểm thử), rồi tải lại.
  const addSecondWound = async (p) => {
    await p.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2'));
      if (d.wounds.some((w) => w.id === 'w-test2')) return;
      const w1 = d.wounds.find((w) => w.id === 'w-1');
      d.wounds.push({ ...w1, id: 'w-test2', code: 'VT02', location: 'Mu bàn chân phải' });
      const pl = d.plans.find((x) => x.woundId === 'w-1' && x.status === 'active');
      d.plans.push({ ...pl, id: 'pl-test2', woundId: 'w-test2', version: 1, doseLevel: 3 });
      const ev = d.evaluations.filter((e) => e.woundId === 'w-1' && e.visibleToPatient).slice(-1)[0];
      d.evaluations.push({ ...ev, id: 'e-test2', woundId: 'w-test2', instructions: 'Giữ băng khô. Thay băng mỗi ngày sau khi tắm. Kê cao chân khi ngồi. Tái khám khi thấy chảy dịch nhiều hoặc đau tăng.' });
      localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d));
    });
    await p.reload(); await p.waitForTimeout(1500);
  };

  // ===== Ảnh trước/sau ở 4 khổ =====
  for (const w of [320, 360, 390, 768]) {
    const p = await newPage(w); await login(p, 'benhnhan');
    await go(p, '/patient'); await shot(p, `n02-${TAG}-${w}.png`);
    if (!ONLY_SHOTS) rec(`D11-tran-n02-${w}`, `N02 không tràn ngang ở ${w} px`, (await overflow(p)) === 0);
    await go(p, '/patient/history'); await shot(p, `n04-${TAG}-${w}.png`);
    if (!ONLY_SHOTS) rec(`D11-tran-n04-${w}`, `N04 không tràn ngang ở ${w} px`, (await overflow(p)) === 0);
    const sid = ((await store(p)).sessions || []).filter((s) => s.deviceId === 'd-1').sort((a, b) => b.start.localeCompare(a.start))[0]?.sessionId;
    await go(p, `/schedule?sessionId=${encodeURIComponent(sid)}`); await shot(p, `n03-${TAG}-${w}.png`);
    if (!ONLY_SHOTS) rec(`D11-tran-n03-${w}`, `N03 không tràn ngang ở ${w} px`, (await overflow(p)) === 0);
    await addSecondWound(p);
    await go(p, '/plan/p-1'); await shot(p, `n06-${TAG}-${w}.png`);
    await login(p, 'bacsi'); await go(p, '/patients/p-1'); await shot(p, `b04-${TAG}-${w}.png`);
    if (!ONLY_SHOTS) rec(`D11-tran-b04-${w}`, `B04 không tràn ngang ở ${w} px`, (await overflow(p)) === 0);
    await p.context().close();
  }
  if (ONLY_SHOTS) { await b.close(); return; }

  // ===== N02: UX-21 =====
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/patient');
    const treatDay = await has(p, 'Trước khi điều trị');
    const lb = await p.getByText('Nạp liệu trình vào máy', { exact: true }).first().boundingBox();
    const sb = treatDay ? await p.getByText('Trước khi điều trị').first().boundingBox() : null;
    rec('D11-01', 'Ngày có điều trị: "Trước khi điều trị" đứng trên nút nạp, thu gọn, có 0/3 và câu ngắn "Làm xong các bước này rồi hãy nạp vào máy."',
      treatDay && !!lb && !!sb && sb.y < lb.y && await has(p, '0/3') && await has(p, 'Làm xong các bước này rồi hãy nạp vào máy.') && !(await has(p, 'Không lau khô hẳn vết thương')),
      `ngày điều trị ${treatDay}, y danh sách ${sb?.y}, y nút ${lb?.y}`);
    await p.getByText('Trước khi điều trị').first().click(); await p.waitForTimeout(200);
    const allThree = await has(p, 'Rửa tay, thay băng và làm sạch vết thương theo dặn') && await has(p, 'Không lau khô hẳn vết thương') && await has(p, 'Lắp đầu phát riêng của mình') && await has(p, 'Theo hướng dẫn chung, bác sĩ có thể dặn khác.');
    await p.getByRole('checkbox', { name: 'Không lau khô hẳn vết thương' }).click(); await p.waitForTimeout(150);
    rec('D11-02', 'Mở danh sách: đủ 3 bước và câu "bác sĩ có thể dặn khác" giữ nguyên; tích 1 bước thành 1/3', allThree && await has(p, '1/3'));
    // Bỏ qua danh sách: nút nạp vẫn dùng được (không thêm chặn).
    await p.getByText('Nạp liệu trình vào máy', { exact: true }).first().click(); await p.waitForTimeout(1200);
    rec('D11-03', 'Chưa làm đủ bước vẫn bấm được "Nạp liệu trình vào máy" (không thêm bước chặn), mở T01', await has(p, 'Kết nối'));
    // Quay lại N02: dấu tích không lưu (như trước).
    await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900);
    rec('D11-04', 'Quay lại trang chủ: màn vẫn đúng thứ tự, không lỗi', await has(p, 'Trước khi điều trị') && p.errors.length === 0, p.errors.join('|').slice(0, 120));
    await p.context().close();
  }
  // ===== T02 → ghi cảm giác (UX-19, UX-09 b) và B04 (UX-09 a) =====
  {
    const p = await newPage(390); await login(p, 'benhnhan'); await go(p, '/patient');
    const n0 = ((await store(p)).sessionNotes || []).length;
    await p.getByText('Nạp liệu trình vào máy', { exact: true }).first().click(); await p.waitForTimeout(1200);
    await p.getByText('Kết nối', { exact: true }).click(); await p.waitForTimeout(2500);
    await p.getByText('Nạp liệu trình vào máy').last().click(); await p.waitForTimeout(4000);
    await p.getByText('Theo dõi phiên điều trị').last().click(); await p.waitForTimeout(800);
    await p.clock.install(); // chỉ tua nhanh phiên 180 s
    await p.getByText('Bắt đầu điều trị').click(); await p.clock.runFor(2000);
    await p.clock.runFor(200000); await p.waitForTimeout(800);
    const doneShown = await has(p, /^Đã xong buổi điều trị hôm nay/, false);
    await p.getByText('Ghi cảm giác sau khi điều trị').click(); await p.waitForTimeout(1200);
    const formTop = await has(p, 'Ghi cảm giác buổi điều trị') && await has(p, 'Đau sau phiên');
    const fb = await p.getByText('Ghi cảm giác buổi điều trị').boundingBox(); const cal = await p.getByText(/^Tháng \d+\/\d{4}$/).boundingBox();
    rec('D11-05', 'T02 xong buổi → "Ghi cảm giác sau khi điều trị" mở thẳng biểu mẫu của buổi vừa xong, nằm trên lịch tháng', doneShown && formTop && !!fb && !!cal && fb.y < cal.y, `xong ${doneShown}, biểu mẫu ${formTop}`);
    await p.getByRole('radio', { name: 'Đau sau phiên 8' }).click();
    await p.getByRole('checkbox', { name: 'Đỏ da' }).click();
    const nd = p.dialogs.length;
    await p.getByText('Lưu', { exact: true }).first().click(); await p.waitForTimeout(800);
    const dl = p.dialogs.slice(nd).join(' ## ');
    const notes = (await store(p)).sessionNotes || [];
    const last = notes.find((n) => n.painAfter === 8 && n.rednessNextDay);
    rec('D11-06', 'Lưu: đúng 1 ghi chú mới (đau sau 8, đỏ da) gắn phiên vừa ghi; câu báo nói rõ "trong hồ sơ của bạn"; cảnh báo đau cao và câu gọi 115 giữ nguyên',
      notes.length === n0 + 1 && !!last && dl.includes('Bác sĩ sẽ thấy ghi chú này trong hồ sơ của bạn') && dl.includes('Mức đau cao') && dl.includes('115') && await has(p, 'Đã lưu cảm giác của buổi điều trị. Có thể sửa lại trong lịch tháng bên dưới.'),
      `ghi chú ${n0}→${notes.length}`);
    // Mã phiên lạ hoặc của người khác: không mở biểu mẫu.
    await go(p, '/schedule?sessionId=khong-co');
    rec('D11-07', 'Mã phiên không thuộc máy của bệnh nhân: không hiện biểu mẫu', !(await has(p, 'Ghi cảm giác buổi điều trị')));
    // Mở biểu mẫu rồi Hủy: không lưu.
    const sid2 = ((await store(p)).sessions || []).filter((s) => s.deviceId === 'd-1' && !notes.some((n) => n.sessionId === s.sessionId))[0]?.sessionId;
    await go(p, `/schedule?sessionId=${encodeURIComponent(sid2)}`);
    await p.getByRole('radio', { name: 'Đau trước phiên 2' }).click();
    await p.getByText('Hủy', { exact: true }).first().click(); await p.waitForTimeout(300);
    rec('D11-08', 'Bỏ dở: chọn đau rồi Hủy, biểu mẫu đóng, không lưu', !(await has(p, 'Ghi cảm giác buổi điều trị')) && ((await store(p)).sessionNotes || []).length === n0 + 1);
    rec('D11-09', 'Không có lỗi JS (luồng bệnh nhân)', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    // B04: bác sĩ thấy ghi chú cần chú ý.
    await login(p, 'bacsi'); await go(p, '/patients/p-1');
    const chips = await p.getByText(/^Ghi sau buổi điều trị \d{2}\/\d{2}$/).count();
    rec('D11-10', 'B04: ghi chú đau ≥ 7 hoặc đỏ da, sưng hiện trong khối "Triệu chứng và sự cố", có nhãn "Ghi sau buổi điều trị dd/mm", ghi rõ chỉ hiển thị',
      chips >= 2 && await has(p, /Đau – → 8\/10/, false) && await has(p, 'Nguồn: bệnh nhân ghi cảm giác sau buổi điều trị. Chỉ hiển thị, không phải báo cáo cần đánh dấu.'), `${chips} dòng`);
    const ghiNhe = (await p.getByText(/^Đau 3 → 2\/10$/).count()) === 0;
    rec('D11-11', 'B04: ghi chú không có dấu hiệu cần chú ý (đau 3 → 2) không hiện', ghiNhe);
    await p.context().close();
  }
  // ===== N04 (UX-19) =====
  {
    const p = await newPage(); await login(p, 'benhnhan'); await go(p, '/patient/history');
    const rows = await p.getByRole('button', { name: /^Buổi \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}/ }).count();
    const labels = await p.getByRole('button', { name: /^Buổi \d{2}:\d{2} \d{2}\/\d{2}\/\d{4}/ }).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    const key = (l) => { const m = l.match(/^Buổi (\d{2}):(\d{2}) (\d{2})\/(\d{2})\/(\d{4})/); return `${m[5]}${m[4]}${m[3]}${m[1]}${m[2]}`; };
    const sorted = labels.every((l, i) => i === 0 || key(labels[i - 1]) >= key(l));
    rec('D11-12', 'N04 có "Các buổi điều trị gần đây", tối đa 5 buổi, mới nhất trước', await has(p, 'Các buổi điều trị gần đây') && rows > 0 && rows <= 5 && sorted, `${rows} buổi, thứ tự ${sorted}`);
    const noNote = p.getByRole('button', { name: /Chưa ghi cảm giác/ }).first();
    if (await noNote.count()) {
      await noNote.click(); await p.waitForTimeout(1200);
      rec('D11-13', 'Chạm buổi chưa ghi cảm giác: mở Lịch trình với biểu mẫu của buổi đó', await has(p, 'Ghi cảm giác buổi điều trị'));
      await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900);
      rec('D11-14', 'Quay lại: về Lịch sử', await has(p, 'Các buổi điều trị gần đây'));
    } else rec('D11-13', 'Có buổi chưa ghi cảm giác để thử', false, 'không có');
    await p.context().close();
  }
  {
    const p = await newPage(); await login(p, 'benhnhan2');
    await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2')); d.patients = d.patients.map((x) => x.id === 'p-2' ? { ...x, deviceId: undefined } : x); localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d)); });
    await go(p, '/patient/history');
    rec('D11-15', 'Thiếu dữ liệu: bệnh nhân chưa được giao máy thấy câu "Chưa được giao máy điều trị nên chưa có buổi nào."', await has(p, 'Chưa được giao máy điều trị nên chưa có buổi nào.'));
    await p.context().close();
  }
  // ===== N06 (UX-20), N02 (UX-24) với hai vết thương =====
  {
    const p = await newPage(); await login(p, 'benhnhan'); await addSecondWound(p);
    await go(p, '/plan/p-1');
    rec('D11-16', 'N06: mỗi vết thương một thẻ có tên vết (VT01, VT02)', (await p.getByText(/^Phiên bản \d+$/).count()) === 2 && await has(p, /^VT01: /, false) && await has(p, 'VT02: Mu bàn chân phải'));
    await go(p, '/patient');
    const reads = p.getByText('Đọc hết', { exact: true });
    const n = await reads.count();
    await p.getByRole('button', { name: 'Đọc hết lời dặn VT02' }).click(); await p.waitForTimeout(200);
    rec('D11-17', 'N02: "Đọc hết" ở VT02 chỉ mở lời dặn VT02, VT01 vẫn thu gọn', n === 2 && (await p.getByText('Thu gọn', { exact: true }).count()) === 1 && (await p.getByText('Đọc hết', { exact: true }).count()) === 1);
    rec('D11-18', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  await b.close();
  const ok = results.filter((r) => r.pass).length;
  console.log(`\n${ok}/${results.length} đạt`);
  process.exit(ok === results.length ? 0 : 1);
})();
