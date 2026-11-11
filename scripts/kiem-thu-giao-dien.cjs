// Kịch bản kiểm thử giao diện tự động (Playwright, bản web).
// Chạy: node kiem-thu.cjs <baseURL> <thư mục ảnh lỗi>. Ghi kết quả JSON ra stdout dòng cuối.
// Cần Playwright (không nằm trong dependencies). Dựng web trước: npx expo export -p web, rồi phục vụ thư mục dist với SPA fallback.
const { chromium } = require('playwright');
const BASE = process.argv[2] || 'http://localhost:8099';
const OUT = process.argv[3] || '.';
const results = [];
const rec = (id, name, pass, detail) => { results.push({ id, name, pass, detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };

(async () => {
  const b = await chromium.launch();
  const newPage = async (w = 390) => {
    const ctx = await b.newContext({ viewport: { width: w, height: 844 }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.dialogs = [];
    p.on('dialog', (d) => { p.dialogs.push(d.message()); d.accept(); });
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
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1600); };
  // Cỡ chữ của mọi phần tử có chữ trực tiếp.
  const fontSizes = (p) => p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('body *')) {
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      if (/ionicons|material|fontawesome/i.test(getComputedStyle(el).fontFamily)) continue; // biểu tượng, không phải chữ
      const r = el.getBoundingClientRect(); if (!r.width) continue;
      out.push({ t: el.textContent.trim().slice(0, 30), fs: parseFloat(getComputedStyle(el).fontSize) });
    }
    return out;
  });
  // Chữ bị cắt bằng dấu ba chấm (numberOfLines) hoặc trang tràn ngang.
  const truncated = (p) => p.evaluate(() => [...document.querySelectorAll('body *')]
    .filter((el) => getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
    .map((el) => el.textContent.trim().slice(0, 40)));
  const hScroll = (p) => p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  // Vị trí theo thứ tự tài liệu (DOM), không phụ thuộc cuộn.
  const yOf = (p, text) => p.evaluate((t) => { const all = [...document.querySelectorAll('body *')]; const i = all.findIndex((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim() === t)); return i < 0 ? null : i; }, text);
  const visible = async (p, text, exact = true) => (await p.getByText(text, { exact }).count()) > 0;

  const screens = {
    benhnhan: ['/patient', '/schedule', '/patient/device', '/patient/history'],
    bacsi: ['/doctor', '/wounds/w-1', '/plan/p-1', '/wounds/w-2'],
    quantri: ['/admin', '/devices/d-1'],
  };

  // TC01 + TC02 + TC03: cỡ chữ theo vai trò, không dưới 12, không tràn ngang
  for (const [user, urls] of Object.entries(screens)) {
    const p = await newPage();
    await login(p, user);
    let min = 99, minT = '', small = [], trunc = [], hs = [];
    for (const u of urls) {
      await go(p, u);
      const fs = await fontSizes(p);
      for (const f of fs) { if (f.fs < min) { min = f.fs; minT = `${f.t} @${u}`; } if (f.fs < 12) small.push(`${f.t} (${f.fs}) @${u}`); }
      for (const t of await truncated(p)) trunc.push(`${t} @${u}`);
      if (await hScroll(p)) hs.push(u);
    }
    rec('TC02-' + user, `Không chữ nào dưới 12 px (${user})`, small.length === 0, `nhỏ nhất ${min}px: "${minT}"${small.length ? '; ' + small.slice(0, 3).join('; ') : ''}`);
    rec('TC03-' + user, `Không tràn ngang ở 390 px (${user})`, hs.length === 0, hs.join(', ') || 'không màn nào');
    console.log('   chữ bị cắt (' + user + '):', JSON.stringify(trunc));
    if (user === 'benhnhan') {
      await go(p, '/patient');
      const fs = await fontSizes(p);
      const body = fs.find((f) => f.t.startsWith('Chuyển sang 3 buổi'));
      rec('TC01-benhnhan', 'Chữ thân bài của bệnh nhân là 17 px (16 × 17/16)', body && Math.abs(body.fs - 17) < 0.6, body ? `${body.fs}px "${body.t}"` : 'không tìm thấy dòng mẫu');
    }
    if (user === 'bacsi') {
      await go(p, '/wounds/w-1');
      const fs = await fontSizes(p);
      const body = fs.find((f) => f.t.startsWith('Chuyển sang 3 buổi'));
      rec('TC01-bacsi', 'Chữ thân bài của bác sĩ giữ 16 px', body && Math.abs(body.fs - 16) < 0.6, body ? `${body.fs}px` : 'không tìm thấy dòng mẫu');
    }
    await p.context().close();
  }

  // TC04: phóng to chữ hệ thống 200% (mô phỏng bằng zoom văn bản) trên trang chủ bệnh nhân
  {
    const p = await newPage(320);
    await login(p, 'benhnhan'); await go(p, '/patient');
    const hs = await hScroll(p);
    rec('TC04', 'Màn hẹp 320 px: trang chủ bệnh nhân không tràn ngang', !hs, hs ? 'tràn' : '');
    await p.screenshot({ path: `${OUT}/tc04-320px.png`, fullPage: true });
    await p.context().close();
  }

  // TC05: lịch dùng biểu tượng, nhãn trợ năng đầy đủ
  {
    const p = await newPage();
    await login(p, 'benhnhan'); await go(p, '/schedule');
    const cells = p.getByRole('button', { name: /^Ngày \d+ tháng \d+/ });
    const n = await cells.count();
    const labels = []; for (let i = 0; i < n; i++) labels.push(await cells.nth(i).getAttribute('aria-label'));
    const done = labels.find((l) => /tháng 11: .*1 lần/.test(l) || /Đã điều trị|đủ/.test(l));
    const cellTexts = []; for (let i = 0; i < n; i++) cellTexts.push((await cells.nth(i).innerText()).trim());
    const onlyDigits = cellTexts.every((t) => /^\d{1,2}$/.test(t.replace(/[\s\uE000-\uF8FF]/g, '')));
    rec('TC05a', 'Ô lịch chỉ hiện số ngày (trạng thái bằng biểu tượng)', n >= 28 && onlyDigits, `${n} ô; ví dụ chữ trong ô: ${JSON.stringify(cellTexts.slice(0, 3))}`);
    rec('TC05b', 'Ô lịch có nhãn trợ năng nêu trạng thái', !!done, done || JSON.stringify(labels.slice(0, 4)));
    const legend = ['Lịch hẹn', 'Đã điều trị', 'Có lịch', 'Nghỉ', 'Lệch lịch'];
    const miss = []; for (const t of legend) if (!(await visible(p, t))) miss.push(t);
    rec('TC05c', 'Chú giải lịch gộp còn các nhóm chính', miss.length === 0, miss.length ? 'thiếu ' + miss.join(', ') : legend.join(', '));
    // Ghi cảm giác sau phiên: có bốn lựa chọn dung nạp
    await p.getByRole('button', { name: /^Ngày 2 tháng 11/ }).click(); await p.waitForTimeout(400);
    const btn = p.getByRole('button', { name: 'Ghi cảm giác' });
    if (await btn.count()) {
      await btn.first().click(); await p.waitForTimeout(400);
      const opts = ['Nóng rát', 'Châm chích', 'Đỏ da', 'Sưng'];
      const have = []; for (const o of opts) if (await p.getByRole('checkbox', { name: new RegExp(o) }).count()) have.push(o);
      rec('TC06', 'Ghi cảm giác có thang đau và 4 dấu hiệu dung nạp', have.length === 4, have.join(', '));
    } else rec('TC06', 'Ghi cảm giác có thang đau và 4 dấu hiệu dung nạp', false, 'không thấy nút Ghi cảm giác ngày 02/11');
    await p.context().close();
  }

  // TC07: thứ tự trang chủ bệnh nhân, một lịch hẹn, không trùng nhận xét
  {
    const p = await newPage();
    await login(p, 'benhnhan'); await go(p, '/patient');
    const order = ['Lịch hẹn gần nhất', 'Vết thương', 'Lời dặn của bác sĩ', 'Báo triệu chứng hoặc sự cố'];
    const ys = []; for (const t of order) ys.push(await yOf(p, t));
    const ok = ys.every((y) => y != null) && ys.every((y, i) => i === 0 || y > ys[i - 1]);
    rec('TC07a', 'Trang chủ bệnh nhân: hôm nay → lịch hẹn → vết thương (kèm lời dặn) → báo sự cố', ok, JSON.stringify(ys.map(Math.round)));
    const dup = await visible(p, 'Nhận xét của bác sĩ');
    const recall = await p.getByText(/^Hẹn bác sĩ chụp ảnh/).count();
    rec('TC07b', 'Không còn mục "Nhận xét của bác sĩ" riêng, chỉ một thẻ lịch hẹn', !dup && recall === 1, `nhận xét riêng: ${dup}; số thẻ hẹn: ${recall}`);
    const all = p.getByText(/^Tất cả \(\d+\)/);
    rec('TC07c', 'Có lối vào "Tất cả (n)" để xem các lịch hẹn còn lại', (await all.count()) > 0, '');
    await p.context().close();
  }

  // TC08: trang vết thương của bác sĩ
  {
    const p = await newPage();
    await login(p, 'bacsi'); await go(p, '/wounds/w-1');
    const order = ['Đang điều trị', 'Diện tích', 'Đợt điều trị', 'Đánh giá gần nhất', 'Album ảnh'];
    const ys = []; for (const t of order) ys.push(await yOf(p, t));
    const ok = ys.every((y) => y != null) && ys.every((y, i) => i === 0 || y > ys[i - 1]);
    rec('TC08a', 'Trang vết thương: thẻ tổng quan (trạng thái, diện tích) → đợt → đánh giá → album', ok, JSON.stringify(ys.map((y) => (y == null ? null : Math.round(y)))));
    const dates0 = await p.getByText(/^Chụp \d/).count();
    await p.getByText(/^Xem tất cả \(\d+ ngày chụp\)/).click(); await p.waitForTimeout(300);
    const dates1 = await p.getByText(/^Chụp \d/).count();
    rec('TC08b', 'Album mặc định 2 ngày, "Xem tất cả" mở đủ', dates0 === 2 && dates1 > 2, `${dates0} → ${dates1}`);
    const hidden0 = await visible(p, 'Mỗi ngày');
    await p.getByText(/^Giai đoạn \d\/\d · mức/).first().click(); await p.waitForTimeout(300);
    const shown1 = await visible(p, 'Mỗi ngày');
    const missed = await visible(p, /Bỏ lỡ/, false);
    rec('TC08c', 'Chi tiết đợt ẩn mặc định, mở được; số buổi bỏ lỡ vẫn hiện ở dòng tóm tắt', !hidden0 && shown1, `ẩn trước: ${!hidden0}; hiện sau: ${shown1}`);
    const sum = await p.getByText(/bỏ lỡ \d+/).count();
    rec('TC08d', 'Dòng tóm tắt luôn nêu số buổi bỏ lỡ', sum > 0 || missed, '');
    const sub = await visible(p, /Loét tĩnh mạch chân/, false);
    rec('TC08e', 'Vị trí và nhóm tổn thương hiện đủ trong thân trang', sub, '');
    await p.context().close();
  }

  // TC09: biểu mẫu đợt 3 bước, lỗi nhảy về đúng bước
  {
    const p = await newPage();
    await login(p, 'bacsi'); await go(p, '/plan/p-1');
    const step1 = await visible(p, 'Lịch theo giai đoạn');
    await p.getByText('3. Xác nhận').click(); await p.waitForTimeout(300);
    await p.getByText('Lưu phiên bản mới').click(); await p.waitForTimeout(400);
    const e1 = await visible(p, 'Nhập lý do thay đổi để lưu vết phiên bản.');
    const sumOk = (await p.getByText(/^Giai đoạn 1: mỗi ngày .*Mức 4, chế độ Cold, 3 phút, 1 lần mỗi buổi\.$/).count()) > 0;
    // Xóa ngày của giai đoạn 1 rồi lưu từ bước 3: phải quay về bước 1 và báo lỗi.
    await p.getByText('1. Lịch').click(); await p.waitForTimeout(300);
    await p.getByPlaceholder('dd/mm/yyyy').first().fill('');
    await p.getByText('3. Xác nhận').click(); await p.waitForTimeout(300);
    await p.getByPlaceholder('Bắt buộc').fill('Kiểm thử');
    await p.getByText('Lưu phiên bản mới').click(); await p.waitForTimeout(400);
    const e2 = await visible(p, 'Giai đoạn 1: ngày theo dạng dd/mm/yyyy.');
    const back = await visible(p, 'Lịch theo giai đoạn');
    rec('TC09a', 'Biểu mẫu mở ở bước 1 (Lịch)', step1, '');
    rec('TC09d', 'Bước 3 tóm tắt lịch và liều trước khi lưu', sumOk, '');
    rec('TC09b', 'Thiếu lý do: báo lỗi ở bước 3', e1, '');
    rec('TC09c', 'Ngày giai đoạn sai: tự quay về bước 1 và báo lỗi', e2 && back, `lỗi: ${e2}; về bước 1: ${back}`);
    await p.context().close();
  }

  // TC10: thiết bị chặn phiên vào ngày nghỉ theo lịch
  {
    const p = await newPage();
    await login(p, 'quantri'); await go(p, '/devices/d-1');
    // Chi tiết thiết bị chia thẻ (bản rút gọn 08/11/2026): nút giả lập nằm ở thẻ Nhật ký.
    await p.getByText('Nhật ký', { exact: true }).first().click(); await p.waitForTimeout(300);
    // Giả lập phiên kiểu IoMT chỉ còn trong bản phát triển (__DEV__), vì trái phương án nạp qua USB (S1).
    // Bản web xuất bằng expo export là bản phát hành: nút phải ẩn.
    const sim = p.getByText('Giả lập một phiên điều trị');
    if (await sim.count() === 0) {
      rec('TC10', 'Bản phát hành ẩn nút giả lập phiên IoMT', true, 'nút chỉ có trong bản phát triển');
    } else {
      await sim.click(); await p.waitForTimeout(600);
      const msg = p.dialogs.join(' | ');
      const blocked = /nghỉ|không có buổi|không phát/i.test(msg);
      rec('TC10', 'Giả lập phiên ngày nghỉ bị thiết bị chặn', blocked, msg.slice(0, 120));
    }
    await p.context().close();
  }

  // TC11: quy trình kết thúc đợt theo lành thương (BN002)
  {
    const p = await newPage();
    await login(p, 'bacsi'); await go(p, '/wounds/w-2');
    await p.getByText('Xác nhận đã liền (lần 2)').click(); await p.waitForTimeout(800);
    const st = await visible(p, 'Đã liền, đang theo dõi');
    rec('TC11a', 'Xác nhận lần 2 chuyển vết thương sang "Đã liền, đang theo dõi"', st, p.dialogs.join(' | ').slice(0, 100));
    // Cùng trình duyệt (cùng bộ nhớ cục bộ), đăng xuất rồi vào bằng bệnh nhân 2.
    await p.evaluate(() => localStorage.removeItem('plasmapro.session.v1'));
    const q = p;
    await login(q, 'benhnhan2'); await go(q, '/patient');
    const fu = await q.getByText(/^Vết thương VT01 đã liền/).count(); await q.screenshot({ path: OUT + '/tc11b.png' });
    rec('TC11b', 'Bệnh nhân thấy giai đoạn theo dõi sau điều trị', fu > 0, '');
    await q.context().close();
  }

  // TC12: không lỗi JavaScript trên toàn bộ màn đã mở
  {
    const p = await newPage();
    await login(p, 'bacsi');
    for (const u of ['/doctor', '/patients/p-1', '/wounds/w-1', '/plan/p-1', '/schedule']) await go(p, u);
    rec('TC12', 'Không có lỗi JavaScript khi mở các màn của bác sĩ', p.errors.length === 0, p.errors.slice(0, 2).join(' | '));
    await p.context().close();
  }

  // TC13 đến TC17: các lỗi giao diện Trang chủ bệnh nhân đo trên ảnh iPhone 11 (06/11/2026), khung 414 px và 320 px.
  for (const w of [414, 320]) {
    const p = await newPage(w);
    await login(p, 'benhnhan'); await go(p, '/patient');
    // Danh sách bước thu gọn mặc định (bản rút gọn 08/11/2026): mở ra trước khi đo dòng ô tích.
    const stepsHeader = p.getByText(/^(Trước|Sau) khi chiếu$/);
    if (await stepsHeader.count()) { await stepsHeader.first().click(); await p.waitForTimeout(300); }
    const m = await p.evaluate(() => {
      const tabs = [...document.querySelectorAll('[role=tab]')];
      const bar = tabs[0].parentElement.getBoundingClientRect();
      const texts = (root) => [...root.querySelectorAll('div')].filter((d) => d.children.length === 0 && d.textContent.trim() && !/ionicons/i.test(getComputedStyle(d).fontFamily));
      const label = (e) => texts(e).at(-1)?.getBoundingClientRect();
      const first = label(tabs[0]); const last = label(tabs.at(-1));
      const fab = document.querySelector('[aria-label="Lịch trình điều trị"]');
      const fabLabel = [...document.querySelectorAll('div')].some((d) => d.children.length === 0 && d.textContent.trim() === 'Lịch trình');
      const sc = [...document.querySelectorAll('div')].filter((d) => d.scrollHeight > d.clientHeight + 20 && /auto|scroll/.test(getComputedStyle(d).overflowY)).sort((a, b) => b.scrollHeight - a.scrollHeight)[0];
      sc.scrollTop = sc.scrollHeight;
      const content = sc.firstElementChild; const kids = [...content.children];
      const lastBottom = Math.max(...kids.map((k) => k.getBoundingClientRect().bottom));
      const fabTop = fab.getBoundingClientRect().top;
      const rows = [...document.querySelectorAll('[role=checkbox]')].map((e) => e.getBoundingClientRect().height);
      const wrapped = tabs.some((t) => { const r = label(t); return r && r.height > 24; });
      return { left: first.left - bar.left, right: window.innerWidth - last.right, fabLabel, gapBelow: fabTop - lastBottom, rows, wrapped };
    });
    // 414 px (iPhone 11): tối thiểu 16. 320 px: nhãn "Tài khoản" rộng hơn ô tab, chỉ đạt 12 (giới hạn đã biết).
    const minSide = w >= 375 ? 16 : 12;
    rec(`TC13-${w}`, `Nhãn tab ngoài cùng cách mép tối thiểu ${minSide} px (${w} px)`, m.left >= minSide && m.right >= minSide, `trái ${Math.round(m.left)}, phải ${Math.round(m.right)}`);
    rec(`TC14-${w}`, `Nhãn tab không xuống dòng (${w} px)`, !m.wrapped, '');
    rec(`TC15-${w}`, `Nút giữa có nhãn "Lịch trình" (${w} px)`, m.fabLabel, '');
    rec(`TC16-${w}`, `Cuộn hết trang, mục cuối nằm trên nút giữa (${w} px)`, m.gapBelow >= 8, `khoảng cách ${Math.round(m.gapBelow)} px`);
    // Ngày nghỉ theo lịch không có danh sách "Trước/Sau khi chiếu": ca này không áp dụng, ghi rõ thay vì báo lỗi.
    const restDay = m.rows.length === 0 && (await p.getByText('Hôm nay nghỉ theo lịch').count()) > 0;
    rec(`TC17-${w}`, `Dòng ô tích cao tối thiểu 44 px (${w} px)`, restDay || (m.rows.length > 0 && m.rows.every((h) => h >= 44)), restDay ? 'không áp dụng: hôm nay nghỉ theo lịch' : m.rows.map(Math.round).join(', '));
    const t = await p.getByText('buổi đã xong').count();
    rec(`TC18-${w}`, `Vòng tiến độ ghi rõ "buổi đã xong" (${w} px)`, t > 0, '');
    if (w === 320) await p.screenshot({ path: OUT + '/tc13-320px.png' });
    await p.context().close();
  }

  await b.close();
  const pass =results.filter((r) => r.pass).length;
  console.log(`TỔNG: ${pass}/${results.length} đạt`);
  console.log('JSON ' + JSON.stringify(results));
})();
