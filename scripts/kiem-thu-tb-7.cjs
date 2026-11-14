// Kiểm thử Stage 7 giao diện theo tác vụ (T01, T02, lối vào B13) trên bản web với THIẾT BỊ GIẢ LẬP, Playwright.
// Đây là mock test: không thay cho thử với máy thật, không chứng minh máy thật hoạt động đúng.
// Chạy: node scripts/kiem-thu-tb-7.cjs <baseURL> <thư mục kết quả>
// Kết quả ghi ĐẠT, LỖI, hoặc GHI NHẬN (hạng mục không kiểm được trên giao diện, kèm lý do).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8602';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390, h = 844) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.dialogs = []; p.errors = [];
    p.on('dialog', (d) => { p.dialogs.push(`${d.type()}: ${d.message().replace(/\n+/g, ' | ')}`); d.dismiss(); });
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
  const has = async (p, t, exact = true) => (await p.getByText(t, { exact }).count()) > 0;
  const store = (p) => p.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2') || '{}'));
  // Web giữ màn trước trong ngăn xếp (ẩn), nên chỉ lấy phần tử đang hiện.
  const bar = async (p) => { const l = p.locator('[data-testid="device-status-bar"]:visible'); return ((await l.count()) ? await l.last().getAttribute('aria-label') : '') || ''; };
  const footer = (p) => p.locator('[data-testid="screen-footer"]:visible').last();
  const inFooter = async (p, t) => (await footer(p).getByText(t, { exact: true }).count()) > 0;
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(800); };
  // Nút nằm trọn trong màn đầu và điểm giữa nút không bị phần tử khác che.
  const visibleNoCover = async (p, t) => {
    const loc = p.getByText(t, { exact: true }).last();
    const bb = await loc.boundingBox(); const vh = p.viewportSize().height;
    if (!bb) return { ok: false, why: 'không thấy' };
    const cover = await p.evaluate(({ x, y, t }) => { const e = document.elementFromPoint(x, y); const btn = e && e.closest('[role="button"]'); return btn ? btn.getAttribute('aria-label') === t : false; }, { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2, t });
    return { ok: bb.y >= 0 && bb.y + bb.height <= vh && cover, why: `đáy ${Math.round(bb.y + bb.height)}/${vh}${cover ? '' : ', bị che'}` };
  };

  // ===== T01 bệnh nhân: kết nối, nạp, không tự chuyển T02 =====
  {
    const p = await newPage(360, 740); await login(p, 'benhnhan'); await go(p, '/connect-device');
    const b0 = await bar(p);
    rec('TB7-01', 'T01 chưa kết nối: thanh trạng thái "Chưa kết nối", chân màn có "Kết nối", chưa hiện liệu trình và nút nạp', b0.includes('Trạng thái thiết bị: Chưa kết nối') && await inFooter(p, 'Kết nối') && !(await has(p, 'Nạp liệu trình vào máy')) && !(await has(p, 'Liệu trình sẽ nạp xuống máy')), b0);
    rec('TB7-02', 'T01 tổng quan thiết bị có đủ mục: thiết bị, kết nối, sẵn sàng, phiên, cập nhật', (await p.getByTestId('device-overview').count()) > 0 && await has(p, 'Thiết bị') && await has(p, 'Kết nối cáp USB') && await has(p, 'Sẵn sàng nạp') && await has(p, 'Phiên trên máy') && await has(p, 'Cập nhật gần nhất'), '');
    rec('TB7-03', 'Chưa kết nối thì không hiện "Sẵn sàng" và không hiện "Đã kết nối" trên thanh trạng thái', !b0.includes('Sẵn sàng') && !b0.includes('Đã kết nối'), b0);
    await footer(p).getByText('Kết nối', { exact: true }).click(); await p.waitForTimeout(1500);
    const b1 = await bar(p);
    const pos = [];
    for (const [w, h] of [[320, 640], [360, 740], [390, 844], [768, 1024]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); const r = await visibleNoCover(p, 'Nạp liệu trình vào máy'); pos.push(`${w}x${h}:${r.ok ? 'thấy' : 'LỖI'} ${r.why}`); }
    await p.setViewportSize({ width: 360, height: 740 });
    rec('TB7-04', 'Đã kết nối, đợt hợp lệ: thanh "Sẵn sàng nạp"; nút nạp ở chân màn, thấy ngay ở 4 khổ', b1.includes('Sẵn sàng nạp') && await inFooter(p, 'Nạp liệu trình vào máy') && pos.every((x) => x.includes('thấy')), `${b1} | ${pos.join(', ')}`);
    await footer(p).getByText('Nạp liệu trình vào máy', { exact: true }).click(); await p.waitForTimeout(2500);
    const ackFooter = (await footer(p).getByText(/^Máy đã nhận liệu trình\..*\(lúc \d{1,2}:\d{2}:\d{2}\)/).count()) > 0;
    rec('TB7-05', 'Sau ACK: thông báo "Máy đã nhận… (lúc …)" nằm trong chân màn cùng nút "Theo dõi phiên điều trị"', ackFooter && await inFooter(p, 'Theo dõi phiên điều trị'), '');
    await p.waitForTimeout(5000);
    rec('TB7-06', 'QĐ-6: chờ 5 giây sau ACK vẫn ở T01, không tự mở T02', await has(p, 'Bước tiếp theo') && !(await has(p, 'Nhận lần cuối')), '');
    await p.getByText('Ngắt kết nối', { exact: true }).click(); await p.waitForTimeout(800);
    const b2 = await bar(p);
    rec('TB7-07', 'Ngắt kết nối: thanh không còn "Đã kết nối"/"Sẵn sàng"; cảnh báo mất kết nối sau khi máy nhận; nút Kết nối ở chân màn', !b2.includes('Đã kết nối') && !b2.includes('Sẵn sàng') && await has(p, /^Đã mất kết nối sau khi máy nhận/, false) && await inFooter(p, 'Kết nối'), b2);
    await footer(p).getByText('Kết nối', { exact: true }).click(); await p.waitForTimeout(1500);
    rec('TB7-08', 'Kết nối lại: thanh trở lại "Sẵn sàng nạp", vẫn giữ kết quả ACK và nút Theo dõi', (await bar(p)).includes('Sẵn sàng nạp') && await inFooter(p, 'Theo dõi phiên điều trị'), await bar(p));

    // ===== T02: phiên, dừng, rời màn =====
    const s0 = (await store(p)).sessions.length;
    await footer(p).getByText('Theo dõi phiên điều trị', { exact: true }).click(); await p.waitForTimeout(1200);
    const b3 = await bar(p);
    rec('TB7-09', 'T02 mở từ T01: thanh trạng thái có, không hiện "Sẵn sàng" (T02 không xét điều kiện nạp); có thiết bị và liệu trình', (await p.getByTestId('device-status-bar').count()) > 0 && !b3.includes('Sẵn sàng') && await has(p, 'Thiết bị và liệu trình') && await has(p, 'Mức năng lượng'), b3);
    rec('TB7-10', 'Mở T02 không tự bắt đầu phiên (không có "Đang điều trị" khi chưa bấm)', !(await has(p, 'Đang điều trị, còn lại')), '');
    await p.getByText('Bắt đầu điều trị', { exact: true }).click(); await p.waitForTimeout(2200);
    const b4 = await bar(p);
    const stopPos = [];
    for (const [w, h] of [[320, 640], [360, 740], [390, 844], [768, 1024]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); const r = await visibleNoCover(p, 'Dừng điều trị'); stopPos.push(`${w}x${h}:${r.ok ? 'thấy' : 'LỖI'} ${r.why}`); }
    await p.setViewportSize({ width: 360, height: 740 });
    rec('TB7-11', 'Đang điều trị: thanh "Máy đang bận"; "Dừng điều trị" ở chân màn, thấy ngay, không bị che ở 4 khổ', b4.includes('Máy đang bận') && await inFooter(p, 'Dừng điều trị') && stopPos.every((x) => x.includes('thấy')), `${b4} | ${stopPos.join(', ')}`);
    rec('TB7-12', '"Bắt đầu điều trị" không nằm ở chân màn (khác chỗ nút Dừng)', !(await inFooter(p, 'Bắt đầu điều trị')), '');
    // Rời màn khi đang chạy: hỏi ngay trong chân màn, không có hộp thoại; nút Dừng vẫn thấy và không bị che.
    const d0 = p.dialogs.length;
    await back(p);
    const askShown = (await p.getByTestId('leave-ask').count()) > 0 && await has(p, 'Rời màn theo dõi?');
    const stopAfterAsk = [];
    for (const [w, h] of [[320, 640], [360, 740], [390, 844]]) { await p.setViewportSize({ width: w, height: h }); await p.waitForTimeout(250); const r = await visibleNoCover(p, 'Dừng điều trị'); stopAfterAsk.push(`${w}x${h}:${r.ok ? 'thấy' : 'LỖI'} ${r.why}`); }
    await p.setViewportSize({ width: 360, height: 740 });
    rec('TB7-13', 'Bấm quay lại khi đang điều trị: câu hỏi "Rời màn theo dõi?" hiện trong chân màn, không có hộp thoại; nút Dừng vẫn thấy, không bị che', askShown && p.dialogs.length === d0 && stopAfterAsk.every((x) => x.includes('thấy')), stopAfterAsk.join(', '));
    await p.getByText('Ở lại màn theo dõi', { exact: true }).click(); await p.waitForTimeout(500);
    rec('TB7-14', 'Chọn "Ở lại": câu hỏi đóng, vẫn ở T02, đồng hồ vẫn chạy', (await p.getByTestId('leave-ask').count()) === 0 && await has(p, 'Đang điều trị, còn lại'), '');
    // Dừng: phản hồi chỉ theo bản tin máy gửi về.
    const stopBox = await p.getByText('Dừng điều trị', { exact: true }).last().boundingBox();
    await p.getByText('Dừng điều trị', { exact: true }).last().click(); await p.waitForTimeout(400);
    const confirmed = await has(p, /^Máy đã xác nhận: Đã dừng/, false);
    // Bấm lần hai đúng chỗ cũ (thao tác nhầm): không được bắt đầu phiên mới.
    await p.mouse.click(stopBox.x + stopBox.width / 2, stopBox.y + stopBox.height / 2); await p.waitForTimeout(1500);
    rec('TB7-15', 'Bấm Dừng: "Máy đã xác nhận: Đã dừng" chỉ sau khi máy gửi STA stopped; "Máy báo: Đã dừng"', confirmed && await has(p, 'Máy báo') && await has(p, 'Đã ghi (gián đoạn)'), '');
    rec('TB7-16', 'Bấm thêm một lần vào chỗ nút Dừng cũ: không bắt đầu phiên mới, không rời T02', !(await has(p, 'Đang điều trị, còn lại')) && await p.getByText('Nhận lần cuối').last().isVisible(), '');
    const s1 = (await store(p)).sessions.length;
    rec('TB7-17', 'Một phiên dừng giữa chừng ghi đúng một bản ghi (không trùng)', s1 === s0 + 1, `${s0}→${s1}`);
    const b5 = await bar(p);
    rec('TB7-18', 'Sau khi dừng: thanh không còn "Máy đang bận"', !b5.includes('Máy đang bận'), b5);
    // Chạy lại, chọn "Vẫn rời màn": rời đúng một lần, không hộp thoại. Phiên trên máy giả lập vẫn chạy.
    await p.getByText('Bắt đầu điều trị', { exact: true }).click(); await p.waitForTimeout(1500);
    const d1 = p.dialogs.length;
    await back(p);
    await p.getByText('Vẫn rời màn', { exact: true }).click(); await p.waitForTimeout(1200);
    rec('TB7-19', 'Chọn "Vẫn rời màn": rời T02 một lần, không hỏi lần hai, không hộp thoại', !(await has(p, 'Nhận lần cuối')) && p.dialogs.length === d1, '');
    // Mở lại màn phiên khi máy (giả lập) vẫn chạy: hiện lại trạng thái từ bản tin mới, không tự bắt đầu, không tạo phiên trùng.
    await footer(p).getByText('Theo dõi phiên điều trị', { exact: true }).click(); await p.waitForTimeout(2200);
    const reopenRunning = await has(p, 'Đang điều trị, còn lại');
    rec('TB7-20', 'Quay lại màn phiên: hiện trạng thái theo bản tin máy gửi, có nút Dừng ở chân màn', reopenRunning && await inFooter(p, 'Dừng điều trị'), '');
    const s2 = (await store(p)).sessions.length;
    await p.getByText('Dừng điều trị', { exact: true }).last().click(); await p.waitForTimeout(1200);
    const s3 = (await store(p)).sessions.length;
    rec('TB7-21', 'Dừng sau khi mở lại: ghi đúng một bản ghi cho phiên này', s3 === s2 + 1, `${s2}→${s3}`);
    rec('TB7-z1', 'Không có lỗi JS (bệnh nhân)', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== Phiên chạy đủ thời gian (đồng hồ giả của Playwright) =====
  {
    const p = await newPage(360, 740); await p.clock.install(); await login(p, 'benhnhan'); await go(p, '/connect-device');
    await footer(p).getByText('Kết nối', { exact: true }).click(); await p.clock.runFor(1500);
    await footer(p).getByText('Nạp liệu trình vào máy', { exact: true }).click(); await p.clock.runFor(2500);
    await footer(p).getByText('Theo dõi phiên điều trị', { exact: true }).click(); await p.clock.runFor(1500);
    const s0 = (await store(p)).sessions.length;
    await p.getByText('Bắt đầu điều trị', { exact: true }).click(); await p.clock.runFor(2000);
    await p.clock.runFor(30 * 60 * 1000); await p.waitForTimeout(500);
    const s1 = (await store(p)).sessions.length;
    rec('TB7-22', 'Kết thúc phiên đủ thời gian: "Đã xong", ghi một bản ghi, nút "Ghi cảm giác" ở chân màn', await has(p, 'Đã xong') && s1 === s0 + 1 && await inFooter(p, 'Ghi cảm giác sau khi điều trị'), `${s0}→${s1}`);
    rec('TB7-z2', 'Không có lỗi JS (phiên đủ thời gian)', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== Bác sĩ: T01 thông tin kỹ thuật, B13 lối vào ở chân màn; quản trị không có lối vào =====
  {
    const p = await newPage(360, 740); await login(p, 'bacsi');
    await go(p, '/connect-device?patientId=p-1');
    await footer(p).getByText('Kết nối', { exact: true }).click(); await p.waitForTimeout(1500);
    rec('TB7-23', 'Bác sĩ T01 sau kết nối: thanh trạng thái, dòng giao thức, firmware; nút "Ngắt" trong thẻ thiết bị, không ở chân màn', (await bar(p)).includes('Trạng thái thiết bị') && await has(p, 'Giao thức của máy') && await has(p, 'Ngắt') && !(await inFooter(p, 'Ngắt')), await bar(p));
    await p.getByText('Ngắt', { exact: true }).click(); await p.waitForTimeout(600);
    const pos = [];
    for (const [w, h] of [[320, 640], [360, 740], [390, 844], [768, 1024]]) { await p.setViewportSize({ width: w, height: h }); await go(p, '/devices/d-1'); const r = await visibleNoCover(p, 'Kết nối máy và nạp liệu trình'); pos.push(`${w}x${h}:${r.ok ? 'thấy' : 'LỖI'} ${r.why}`); }
    await p.setViewportSize({ width: 360, height: 740 });
    rec('TB7-24', 'B13 bác sĩ phụ trách: hai lối vào T01, T02 ở chân màn, thấy ngay ở 4 khổ', await inFooter(p, 'Kết nối máy và nạp liệu trình') && await inFooter(p, 'Theo dõi phiên điều trị') && pos.every((x) => x.includes('thấy')), pos.join(', '));
    await footer(p).getByText('Theo dõi phiên điều trị', { exact: true }).click(); await p.waitForTimeout(1200);
    rec('TB7-25', 'B13 mở T02 đúng bệnh nhân của máy (thanh ngữ cảnh có tên bệnh nhân)', (await p.getByTestId('clinical-context').count()) > 0, '');
    rec('TB7-z3', 'Không có lỗi JS (bác sĩ)', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }
  {
    const p = await newPage(360, 740); await login(p, 'quantri'); await go(p, '/devices/d-1');
    rec('TB7-26', 'Q06 quản trị: không có lối vào T01, T02, không có chân màn', !(await has(p, 'Kết nối máy và nạp liệu trình')) && (await footer(p).count()) === 0, '');
    await p.context().close();
  }

  // ===== Tràn ngang =====
  {
    const bad = [];
    for (const w of [320, 360, 390, 768]) {
      const p = await newPage(w); await login(p, 'bacsi');
      for (const url of ['/connect-device?patientId=p-1', '/session-monitor?patientId=p-1&woundId=w-1', '/devices/d-1']) {
        await go(p, url); const o = await p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });
        if (o) bad.push(`${url}@${w}:${o}`);
      }
      await p.context().close();
    }
    rec('TB7-27', 'Không tràn ngang ở 320, 360, 390, 768 px (T01, T02, B13)', bad.length === 0, bad.join(', '));
  }

  rec('TB7-N1', 'Không tìm thấy thiết bị, kết nối thất bại trên giao diện', 'note', 'NOT TESTED trên giao diện: thiết bị giả lập luôn mở được cổng; lỗi mở cổng USB kiểm ở usb-android.test.cjs; chân màn hiện thông báo lỗi và nút Kết nối khi trạng thái error');
  rec('TB7-N2', 'Mất kết nối giữa phiên, quá ngưỡng không có STA (Unknown) trên giao diện', 'note', 'NOT TESTED trên giao diện: T02 không có nút ngắt và không tiêm lỗi được nếu không sửa src/lib/device; kiểm bằng deviceStatusView.test.ts và sessionDisplay.test.ts');
  rec('TB7-N3', 'Hai thiết bị trở lên', 'note', 'Không áp dụng: ứng dụng dùng một đường truyền chung, mỗi hồ sơ một máy');
  rec('TB7-N4', 'Thiết bị thật', 'note', 'BLOCKED: không có máy thật; mọi ca trên chạy bằng thiết bị giả lập');
  fs.writeFileSync(path.join(OUT, 'ket-qua-tb-7.json'), JSON.stringify(results, null, 2));
  await b.close();
})();
