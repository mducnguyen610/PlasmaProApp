// Kiểm thử Stage 9B: các mục backlog Stage 8 đã sửa (S8-B04, S8-B05, S8-B07, S8-B10) trên giao diện web, THIẾT BỊ GIẢ LẬP, dữ liệu mô phỏng.
// S8-B05 (từ chối khi sai vai trò) và S8-B06 (ghi chồng nhau) kiểm bằng kiểm thử đơn vị (src/lib/access.test.ts, src/lib/commitQueue.test.ts);
// ở đây chỉ kiểm các luồng đúng vai trò vẫn chạy. Không thay cho thử máy thật, review lâm sàng hay review kỹ thuật thiết bị.
// Chạy: node scripts/kiem-thu-9b.cjs <baseURL> <thư mục kết quả>
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8600';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const PHOTO = path.join(__dirname, '..', 'assets', 'demo', 'demo_1.png');
const KEY = 'plasmapro.demo.v2';
const results = [];
const rec = (id, name, pass, detail = '') => {
  const result = pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT' : 'LỖI';
  results.push({ id, name, result, detail });
  console.log(result === 'ĐẠT' ? 'ĐẠT ' : result === 'LỖI' ? 'LỖI ' : result, id, name, detail ? `| ${detail}` : '');
};
const { ganNgayCoLich } = require('./ngay-co-lich.cjs');

(async () => {
  const b = await chromium.launch();
  const newPage = async () => {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'vi-VN', timezoneId: 'Asia/Ho_Chi_Minh' });
    await ganNgayCoLich(ctx);
    const p = await ctx.newPage();
    p.errors = [];
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
  const has = async (p, t, exact = true) => (await p.locator('body').getByText(t, { exact }).locator('visible=true').count()) > 0;
  const store = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  const patch = (p, fn) => p.evaluate(([k, src]) => { const d = JSON.parse(localStorage.getItem(k)); localStorage.setItem(k, JSON.stringify(new Function('d', src)(d))); }, [KEY, fn]);
  const btn = (p, name) => p.getByRole('button', { name, exact: typeof name === 'string' }).locator('visible=true');
  const click = async (loc, t = 400) => { await loc.first().click(); await loc.page().waitForTimeout(t); };
  const footer = (p) => p.locator('[data-testid="screen-footer"]:visible').last();
  const inFooter = (p, name) => footer(p).getByRole('button', { name, exact: typeof name === 'string' });
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900); };
  const ctxText = async (p) => ((await p.locator('[data-testid="clinical-context"]:visible').last().getAttribute('aria-label').catch(() => '')) || '');
  const histCount = async (p) => Number(/Lịch sử \((\d+)\)/.exec((await p.locator('body').innerText()).replace(/\s+/g, ' '))?.[1] ?? NaN);

  // ===== S8-B04 và S8-B07: bệnh nhân, một vết thương có đợt đang áp dụng =====
  {
    const p = await newPage();
    await login(p, 'benhnhan');
    await go(p, '/wounds/w-1');
    const h0 = await histCount(p);
    // Mở thẳng N07 (tải trang): máy giả lập mới, chưa có liệu trình.
    await go(p, '/patient/device');
    await click(btn(p, 'Theo dõi phiên điều trị'), 1500);
    const url1 = p.url().replace(BASE, '');
    const c1 = await ctxText(p);
    rec('9B-B04-01', 'N07 "Theo dõi phiên điều trị", một vết có đợt: mở T02 kèm woundId của đúng vết, thanh ngữ cảnh ghi VT01', /\/session-monitor\?.*woundId=w-1/.test(url1) && /Vết thương VT01/.test(c1) && !/Chưa chọn vết thương/.test(c1), `${url1} | ${c1}`);
    if (await inFooter(p, 'Kết nối').count()) await click(inFooter(p, 'Kết nối'), 2000);
    const noStart = (await btn(p, 'Bắt đầu điều trị').count()) === 0;
    const reason = await has(p, /^Máy giả lập chưa có liệu trình nên chưa bắt đầu được\./, false);
    rec('9B-B07-01', 'T02 sau khi tải lại (giả lập chưa có liệu trình): không có nút "Bắt đầu điều trị", có câu giải thích', noStart && reason, `không nút ${noStart}, câu ${reason}`);
    const stopShown = (await inFooter(p, 'Dừng điều trị').count()) > 0;
    rec('9B-B07-02', 'Chưa chạy phiên thì không có nút Dừng (không giả lập phiên)', !stopShown, '');

    // Điều hướng trong ứng dụng để giả lập giữ liệu trình: N07 → T01 nạp → quay lại N07 → T02.
    await go(p, '/patient/device');
    await click(btn(p, 'Nạp liệu trình vào máy'), 1500);
    await click(inFooter(p, 'Kết nối'), 2000);
    await click(inFooter(p, 'Nạp liệu trình vào máy'), 2500);
    const acked = await has(p, /^Máy đã nhận liệu trình\./, false);
    await back(p);
    await click(btn(p, 'Theo dõi phiên điều trị'), 1500);
    if (await inFooter(p, 'Kết nối').count()) await click(inFooter(p, 'Kết nối'), 2000);
    const startNow = (await btn(p, 'Bắt đầu điều trị').count()) > 0;
    const reasonGone = !(await has(p, /^Máy giả lập chưa có liệu trình/, false));
    rec('9B-B07-03', 'Đã nạp liệu trình: nút "Bắt đầu điều trị" (giả lập) hiện lại, không còn câu chưa có liệu trình', acked && startNow && reasonGone, `ACK ${acked}`);
    const s0 = (await store(p)).sessions.length;
    await click(btn(p, 'Bắt đầu điều trị'), 2200);
    await click(inFooter(p, 'Dừng điều trị'), 2500);
    const ses = (await store(p)).sessions;
    const last = ses[ses.length - 1];
    rec('9B-B04-02', 'Phiên mới từ N07 giữ đúng thiết bị của bệnh nhân (d-1) và vết thương w-1', ses.length === s0 + 1 && last?.deviceId === 'd-1' && last?.woundId === 'w-1', JSON.stringify(last).slice(0, 160));
    await go(p, '/wounds/w-1');
    const h1 = await histCount(p);
    rec('9B-B04-03', 'Phiên này hiện trong "Lịch sử" của VT01 ở N05', h1 === h0 + 1, `${h0}→${h1}`);
    rec('9B-B04-z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== S8-B04: hai vết thương có đợt đang áp dụng: không tự gán, mở T01 để chọn =====
  {
    const p = await newPage();
    await login(p, 'benhnhan');
    await go(p, '/patient');
    // Dữ liệu kiểm thử: thêm vết VT09 và đợt đã xác nhận (chép từ đợt đang áp dụng của VT01). Chỉ ở trình duyệt kiểm thử.
    await patch(p, `
      const pl = d.plans.filter((x) => x.patientId === 'p-1' && x.woundId === 'w-1' && x.status === 'active' && x.confirmed).sort((a, b) => b.version - a.version)[0];
      const w = d.wounds.find((x) => x.id === 'w-1');
      d.wounds.push({ ...w, id: 'w-9', code: 'VT09', location: 'Mu bàn chân phải' });
      d.plans.push({ ...pl, id: 'pl-9b', woundId: 'w-9' });
      return d;`);
    await go(p, '/patient/device');
    const s0 = (await store(p)).sessions.length;
    await click(btn(p, 'Theo dõi phiên điều trị'), 1500);
    const url = p.url().replace(BASE, '');
    const loadBtn = inFooter(p, 'Nạp liệu trình vào máy');
    if (await inFooter(p, 'Kết nối').count()) await click(inFooter(p, 'Kết nối'), 2000);
    // Danh sách chọn vết hiện ở bước nạp (sau khi kết nối).
    const choose = await has(p, 'Chọn vết thương để xem liệu trình sẽ nạp.');
    const both = (await p.getByRole('radio', { name: /^VT01: / }).locator('visible=true').count()) > 0 && (await p.getByRole('radio', { name: /^VT09: / }).locator('visible=true').count()) > 0;
    rec('9B-B04-04', 'N07, hai vết có đợt: mở T01 (không mở T02 với vết tự chọn), T01 cho chọn giữa VT01 và VT09', /\/connect-device/.test(url) && !/session-monitor/.test(url) && choose && both, `${url} | câu chọn ${choose}, hai lựa chọn ${both}`);
    const disabled = (await loadBtn.count()) === 0 || (await loadBtn.first().getAttribute('aria-disabled')) === 'true';
    rec('9B-B04-05', 'Chưa chọn vết thì chưa nạp được; không có phiên nào được ghi', disabled && (await store(p)).sessions.length === s0, `nút nạp khóa ${disabled}`);
    rec('9B-B04-z2', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== S8-B05: các luồng đúng vai trò vẫn chạy (bệnh nhân gửi báo cáo, bác sĩ đánh dấu, quản trị xử lý lỗi đồng bộ) =====
  {
    const p = await newPage();
    await login(p, 'benhnhan');
    await go(p, '/report');
    const r0 = (await store(p)).reports.length;
    await p.getByRole('textbox').locator('visible=true').first().fill('Kiểm thử 9B: đau nhẹ quanh vết');
    await click(inFooter(p, 'Gửi'), 1200);
    const d1 = await store(p);
    const mine = d1.reports[0];
    rec('9B-B05-01', 'Bệnh nhân gửi báo cáo cho hồ sơ của mình (N08): được ghi', d1.reports.length === r0 + 1 && mine?.patientId === 'p-1' && mine?.handled === false, JSON.stringify(mine).slice(0, 120));
    await go(p, '/patient/account'); await click(btn(p, 'Đăng xuất'), 1500);
    await login(p, 'bacsi');
    await go(p, '/patients/p-1');
    const link = p.getByText('Đánh dấu đã xử lý', { exact: true }).locator('visible=true');
    const n = await link.count();
    if (n) await click(link, 1000);
    const d2 = await store(p);
    const handled = d2.reports.find((r) => r.id === mine?.id)?.handled;
    const others = d2.reports.filter((r) => r.patientId === 'p-1' && r.handled).length;
    rec('9B-B05-02', 'Bác sĩ phụ trách đánh dấu báo cáo đã xử lý ở B04: được ghi', n > 0 && (handled === true || others > d1.reports.filter((r) => r.patientId === 'p-1' && r.handled).length), `liên kết ${n}, báo cáo mới handled ${handled}`);
    // Logic chốt 25/11/2026 (Cài đặt): đăng xuất hỏi xác nhận; bấm Đăng xuất trong bảng hỏi.
    await go(p, '/doctor/account'); await click(btn(p, 'Đăng xuất'), 600); await click(p.getByTestId('hoi-dang-xuat').getByRole('button', { name: 'Đăng xuất', exact: true }), 1500);
    await login(p, 'quantri');
    // Dữ liệu kiểm thử: một lỗi đồng bộ chưa xử lý.
    await patch(p, `d.syncErrors.push({ id: 's-9b', at: new Date().toISOString(), deviceId: 'd-2', message: 'Kiểm thử 9B (mô phỏng).', resolved: false }); return d;`);
    await go(p, '/admin-log/s-9b');
    await click(btn(p, 'Đánh dấu đã xử lý'), 1000);
    const resolved = (await store(p)).syncErrors.find((s) => s.id === 's-9b')?.resolved;
    rec('9B-B05-03', 'Quản trị viên đánh dấu lỗi đồng bộ đã xử lý (Q04b): được ghi', resolved === true, `resolved ${resolved}`);
    rec('9B-B05-z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  // ===== S8-B10: nhãn diện tích thống nhất giữa B10 và B11 =====
  {
    const p = await newPage();
    await login(p, 'bacsi');
    await go(p, '/guided-capture?woundId=w-1');
    const [fc] = await Promise.all([p.waitForEvent('filechooser'), btn(p, 'Chọn ảnh có sẵn').first().click()]);
    await fc.setFiles(PHOTO); await p.waitForTimeout(3000);
    // B10 có thể chia bước: đi tới bước có ô nhập số đo (tối đa 3 lần "Tiếp").
    for (let i = 0; i < 3 && !(await p.getByRole('textbox', { name: /^Diện tích bác sĩ đo/ }).locator('visible=true').count()); i++) {
      const cb = p.getByRole('checkbox').locator('visible=true'); if (await cb.count()) await click(cb, 300);
      const next = footer(p).getByRole('button', { name: /^Tiếp/ }); if (await next.count()) await click(next, 800); else break;
    }
    const b10 = await p.getByRole('textbox', { name: 'Diện tích bác sĩ đo (cm²)', exact: true }).locator('visible=true').count();
    rec('9B-B10-01', 'B10: ô số đo có nhãn "Diện tích bác sĩ đo (cm²)"', b10 > 0, `${b10}`);
    // IMG0003 đã có số đo: dòng giá trị; bấm "Sửa số đo" mở ô nhập. IMG0004 chưa đo: ô nhập mở sẵn.
    await go(p, '/images/IMG0003');
    const info = await has(p, 'Diện tích bác sĩ đo');
    const old = await has(p, 'Diện tích bác sĩ đã đo');
    await click(btn(p, 'Sửa số đo'), 800);
    const b11edit = await p.getByRole('textbox', { name: 'Diện tích bác sĩ đo (cm²)', exact: true }).locator('visible=true').count();
    await go(p, '/images/IMG0004');
    const b11 = Math.min(b11edit, await p.getByRole('textbox', { name: 'Diện tích bác sĩ đo (cm²)', exact: true }).locator('visible=true').count());
    await click(p.getByRole('tab', { name: 'mm² (quy đổi sang cm²)', exact: true }).locator('visible=true'), 300);
    const mm = await p.getByRole('textbox', { name: 'Diện tích bác sĩ đo (mm²)', exact: true }).locator('visible=true').count();
    rec('9B-B10-02', 'B11: dòng giá trị và ô nhập cùng nhãn với B10; không còn "Diện tích bác sĩ đã đo"', info && !old && b11 > 0, `dòng ${info}, nhãn cũ ${old}, ô ${b11}`);
    rec('9B-B10-03', 'B11: chọn mm² thì nhãn ô ghi đơn vị mm² (giá trị vẫn quy đổi sang cm² khi lưu)', mm > 0, `${mm}`);
    rec('9B-B10-z', 'Không có lỗi JS', p.errors.length === 0, p.errors.join(' | ').slice(0, 160));
    await p.context().close();
  }

  fs.writeFileSync(path.join(OUT, 'ket-qua-9b.json'), JSON.stringify(results, null, 2));
  const n = (r) => results.filter((x) => x.result === r).length;
  console.log(`TỔNG: ${n('ĐẠT')} đạt, ${n('LỖI')} lỗi, ${n('GHI NHẬN')} ghi nhận`);
  await b.close();
  process.exit(n('LỖI') ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
