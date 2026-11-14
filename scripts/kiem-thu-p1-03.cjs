// Kiểm thử P1-03 (B07 Đánh giá, B06 Đợt điều trị), Playwright trên bản web. Mock test, không thay cho thử với bác sĩ.
// Chạy: node scripts/kiem-thu-p1-03.cjs <baseURL> <thư mục kết quả> [--chi-anh <nhãn>]
// Dữ liệu chỉ ghi vào bộ nhớ trình duyệt, không sửa seed.ts.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8501';
const OUT = process.argv[3] || '.';
const SHOTS = process.argv.includes('--chi-anh') ? process.argv[process.argv.indexOf('--chi-anh') + 1] || 'anh' : null;
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass === 'note' ? 'GHI NHẬN' : pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };
const WIDTHS = [320, 360, 390, 768];

const helpers = (b) => {
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
  const mutate = async (p, fn) => { await p.evaluate((src) => { const d = JSON.parse(localStorage.getItem('plasmapro.demo.v2')); new Function('d', src)(d); localStorage.setItem('plasmapro.demo.v2', JSON.stringify(d)); }, fn); };
  const pageHeight = (p) => p.evaluate(() => { let best = document.documentElement.scrollHeight; for (const el of document.querySelectorAll('body *')) { const cs = getComputedStyle(el); if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight) best = Math.max(best, el.scrollHeight + (window.innerHeight - el.clientHeight)); } return Math.ceil(best); });
  const shot = async (p, file) => {
    const w = p.viewportSize().width; const H = await pageHeight(p);
    await p.setViewportSize({ width: w, height: Math.max(844, H) }); await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, file) }); await p.setViewportSize({ width: w, height: 844 }); await p.waitForTimeout(200);
    return H;
  };
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });
  // Phần tử bấm được nhỏ hơn 44 px trên màn đang xem (bỏ qua phần tử ẩn của tab khác).
  const small = (p) => p.evaluate(() => [...document.querySelectorAll('[role="button"],[role="radio"],[role="tab"],[role="link"]')].filter((e) => { const r = e.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false; const hit = document.elementFromPoint(Math.min(window.innerWidth - 1, r.x + r.width / 2), Math.max(0, Math.min(window.innerHeight - 1, r.y + r.height / 2))); return r.y >= 0 && r.bottom <= window.innerHeight && hit && (e.contains(hit) || hit.contains(e)) && (r.height < 44 || r.width < 44); }).map((e) => `${(e.getAttribute('aria-label') || e.textContent || '').slice(0, 30)} ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`));
  const inView = (p, loc) => loc.evaluate((e) => { const r = e.getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight + 1; });
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(900); };
  return { newPage, login, go, has, store, mutate, pageHeight, shot, overflow, small, inView, back };
};
const finish = (tag) => {
  fs.writeFileSync(path.join(OUT, `ket-qua-${tag}.json`), JSON.stringify(results, null, 2));
  const n = (r) => results.filter((x) => x.result === r).length;
  console.log(`\nTổng: ${n('ĐẠT')} đạt, ${n('LỖI')} lỗi, ${n('GHI NHẬN')} ghi nhận`);
  process.exitCode = n('LỖI') ? 1 : 0;
};

(async () => {
  const b = await chromium.launch();
  const { newPage, login, go, has, store, mutate, shot, overflow, small, inView } = helpers(b);
  // Giai đoạn 2 giao diện theo tác vụ: B07 chia 4 bước; nút lưu ở bước 4 "Xem lại", chạm thanh bước để tới bước n.
  const toStep = async (p, n) => { await p.getByRole('tab', { name: new RegExp(`^${n}\\. `) }).click(); await p.waitForTimeout(400); };
  const saveB07 = async (p) => { await toStep(p, 4); await p.getByRole('button', { name: /^Lưu (và công bố cho bệnh nhân|đánh giá \(chỉ bác sĩ\))$/ }).click(); };

  if (SHOTS) {
    const heights = {};
    for (const w of WIDTHS) {
      const p = await newPage(w); await login(p);
      await go(p, '/evaluate/w-2'); heights[`b07-${w}`] = await shot(p, `b07-${SHOTS}-${w}.png`);
      await saveB07(p); await p.waitForTimeout(500); await shot(p, `b07-thieu-${SHOTS}-${w}.png`);
      await go(p, '/evaluate/w-1');
      const prev = p.getByRole('button', { name: /^Lần đánh giá trước/ });
      if (await prev.count()) { await prev.click(); await p.waitForTimeout(300); }
      await shot(p, `b07-lan-truoc-${SHOTS}-${w}.png`);
      await go(p, '/plan/p-1?woundId=w-1');
      await p.getByRole('textbox', { name: 'Từ ngày' }).first().fill('');
      for (let i = 0; i < 2; i++) { await p.getByText('Tiếp', { exact: true }).click(); await p.waitForTimeout(300); }
      const sv = p.getByRole('button', { name: /^Lưu phiên bản/ }); if (await sv.count()) { await sv.click(); await p.waitForTimeout(500); }
      await shot(p, `b06-loi-${SHOTS}-${w}.png`);
      await p.context().close();
    }
    fs.writeFileSync(path.join(OUT, `chieu-cao-${SHOTS}.json`), JSON.stringify(heights, null, 2));
    await b.close(); return;
  }

  // TP1-09, TP1-10: thiếu 4 mục bắt buộc, một lần Lưu báo đủ 4; liên kết đưa tới đúng trường; điền đủ thì Lưu một lần thành công.
  {
    const p = await newPage(); await login(p);
    await go(p, '/evaluate/w-2');
    const n0 = ((await store(p)).evaluations || []).length;
    await saveB07(p); await p.waitForTimeout(600);
    // Giai đoạn 2: câu báo ghi thêm bước của từng mục; màn đưa về bước 1 (bước của mục đầu), lỗi mức độ hiện khi tới bước 2.
    const msg = 'Còn 4 mục cần sửa trước khi lưu: Loại vết thương (bước 1), Dịch tiết (bước 1), Dấu hiệu nhiễm trùng (bước 1), Mức độ (bước 2).';
    const links = await p.getByTestId('muc-can-sua').getByRole('button').allInnerTexts().catch(() => []);
    const fieldErrs = await Promise.all(['Hãy chọn loại vết thương.', 'Hãy chọn mức dịch tiết.', 'Hãy chọn dấu hiệu nhiễm trùng.'].map((t) => has(p, t)));
    // Liên kết "Tới mức độ": sang bước 2, trường Mức độ nằm trong màn hình, lỗi hiện tại trường.
    await p.getByRole('button', { name: /^Tới mục Mức độ/ }).click(); await p.waitForTimeout(900);
    fieldErrs.push(await has(p, 'Hãy chọn mức Nhẹ, Trung bình hoặc Nặng.'));
    rec('TP1-09', 'B07 thiếu 4 mục: một lần Lưu nêu đủ 4, lỗi hiện tại từng trường, không lưu', await has(p, msg) && links.length === 4 && fieldErrs.every(Boolean) && ((await store(p)).evaluations || []).length === n0, `liên kết: ${links.join(', ')}; lỗi tại trường: ${fieldErrs}`);
    const sev = p.getByText('Mức độ vết thương', { exact: true });
    const sevIn = await inView(p, sev);
    await p.getByRole('button', { name: /^Tới mục Loại vết thương/ }).click(); await p.waitForTimeout(900);
    const typeIn = await inView(p, p.getByText('Loại vết thương', { exact: true }).first());
    rec('TP1-10', 'Liên kết từng mục cuộn tới đúng trường (Mức độ, Loại vết thương)', sevIn && typeIn, `mức độ ${sevIn}, loại ${typeIn}`);
    // Điền đủ 4 mục rồi Lưu một lần.
    await p.getByRole('radio', { name: 'Bỏng', exact: true }).click();
    await p.getByRole('radio', { name: 'Ít', exact: true }).click();
    await p.getByRole('radio', { name: 'Nghi ngờ', exact: true }).click();
    await toStep(p, 2);
    await p.getByRole('radio', { name: 'Nhẹ', exact: true }).click();
    const noErrLeft = !(await has(p, 'Hãy chọn loại vết thương.')) && !(await has(p, 'Hãy chọn mức Nhẹ, Trung bình hoặc Nặng.'));
    await saveB07(p); await p.waitForTimeout(1200);
    const n1 = ((await store(p)).evaluations || []).length;
    rec('TP1-09b', 'Điền đủ 4 mục: lỗi tại trường tự gỡ, Lưu một lần thành công (thêm đúng 1 đánh giá)', noErrLeft && n1 === n0 + 1, `trước ${n0}, sau ${n1}`);
    await p.context().close();
  }

  // TP1-11: lần đánh giá trước chỉ đọc, của đúng vết; không giá trị nào chép vào biểu mẫu.
  {
    const p = await newPage(); await login(p);
    await go(p, '/evaluate/w-1');
    const d = await store(p);
    const last = (d.evaluations || []).filter((e) => e.woundId === 'w-1').sort((a, b) => b.date.localeCompare(a.date))[0];
    const head = p.getByRole('button', { name: /^Lần đánh giá trước \d{2}\/\d{2}\/\d{4}, BS\. Trần Minh An · chỉ để tham khảo, không tự điền$/ });
    const hasHead = (await head.count()) === 1;
    if (hasHead) { await head.click(); await p.waitForTimeout(300); }
    const body = hasHead ? (await p.getByTestId('lan-danh-gia-truoc').innerText()).replace(/\s+/g, ' ') : '';
    await toStep(p, 4);
    const sumSev = (await p.getByTestId('se-luu').innerText()).replace(/\s+/g, ' ');
    // Sang bước 3 để đọc ô hướng dẫn.
    await toStep(p, 3);
    const instr = await p.getByRole('textbox', { name: /^Hướng dẫn tiếp theo/ }).inputValue();
    const ok = hasHead && !!last && body.includes(last.instructions.slice(0, 20)) && /Mức độ Chưa chọn/.test(sumSev) && /Nhiễm trùng Chưa chọn/.test(sumSev) && instr === '';
    rec('TP1-11', 'B07 "Lần đánh giá trước" chỉ đọc, đúng vết w-1; mức độ, nhiễm trùng, hướng dẫn trong biểu mẫu vẫn trống', ok, `có mục ${hasHead}; Sẽ lưu: ${sumSev.slice(0, 120)}; ô hướng dẫn "${instr}"`);
    // Vết thứ hai của cùng bệnh nhân, chưa có đánh giá (thêm vào bộ nhớ trình duyệt): không hiện mục, không lấy đánh giá của VT01.
    await mutate(p, `d.wounds.push({ id: 'w-kt2', patientId: 'p-1', code: 'VT02', location: 'Gót chân trái (kiểm thử)', startDate: d.wounds[0].startDate, status: 'active' });`);
    await go(p, '/evaluate/w-kt2');
    const none = (await p.getByRole('button', { name: /^Lần đánh giá trước/ }).count()) === 0 && (await p.getByTestId('clinical-context').innerText()).includes('VT02');
    rec('TP1-11b', 'VT02 cùng bệnh nhân, chưa có đánh giá: không có mục "Lần đánh giá trước" (không lấy của VT01)', none);
    await p.context().close();
  }

  // P1-03c: cụm Bắt buộc trên, Bổ sung dưới; câu chữ giữ nguyên. Bộ đếm nhóm 2 không tính ô nguồn điền sẵn.
  {
    const p = await newPage(); await login(p);
    await go(p, '/evaluate/w-1');
    const y = async (t) => (await p.getByText(t, { exact: typeof t === 'string' }).first().boundingBox())?.y ?? -1;
    const [yInf, yBs, yGr, yEp] = [await y('Dấu hiệu nhiễm trùng'), await y('Bổ sung (không bắt buộc)'), await y(/^Mô hạt/), await y(/^Biểu mô hóa/)];
    rec('TP1-03c', 'Nhóm Phân loại: Dịch tiết, Nhiễm trùng (bắt buộc) đứng trước cụm "Bổ sung" có Mô hạt, Biểu mô hóa', yInf > 0 && yInf < yBs && yBs < yGr && yGr < yEp, `y ${yInf}, ${yBs}, ${yGr}, ${yEp}`);
    const d = await store(p);
    const prefilled = (d.reports || []).some((r) => r.patientId === 'p-1' && r.kind === 'symptom' && !r.handled && r.content.trim());
    const expect = `Mức độ và triệu chứng, Đã điền ${prefilled ? 1 : 0}/4 · còn 1 mục bắt buộc`;
    // Giai đoạn 2: bộ đếm nằm ở đầu bước 2 (cùng chữ với dòng tóm tắt nhóm cũ).
    await toStep(p, 2);
    const got = await p.getByTestId('tieu-de-buoc').getAttribute('aria-label');
    rec('TP1-03c-b', 'Bộ đếm nhóm 2 không tính ô "Nguồn thông tin triệu chứng" điền sẵn', got === `Bước 2 trên 4: ${expect}`, `"${got}" (mong đợi "Bước 2 trên 4: ${expect}")`);
    await p.context().close();
  }

  // P1-03d: B06 nêu mọi lỗi của bước có lỗi đầu tiên và số lỗi còn ở bước khác; không lưu.
  {
    const p = await newPage(); await login(p);
    await go(p, '/plan/p-1?woundId=w-1');
    const n0 = ((await store(p)).plans || []).length;
    await p.getByRole('textbox', { name: 'Từ ngày' }).first().fill('');
    for (let i = 0; i < 2; i++) { await p.getByText('Tiếp', { exact: true }).click(); await p.waitForTimeout(300); }
    await p.getByRole('button', { name: /^Lưu phiên bản/ }).click(); await p.waitForTimeout(600);
    const alert = (await p.getByRole('alert').allInnerTexts()).join(' | ');
    const backToStep0 = (await p.getByRole('textbox', { name: 'Từ ngày' }).count()) > 0;
    const ok = /Giai đoạn 1: ngày theo dạng dd\/mm\/yyyy\./.test(alert) && /Bước Xác nhận còn \d lỗi\./.test(alert) && backToStep0 && ((await store(p)).plans || []).length === n0;
    rec('TP1-03d', 'B06 lỗi ở bước Lịch và bước Xác nhận: về bước Lịch, nêu lỗi Lịch và "Bước Xác nhận còn n lỗi", không lưu', ok, alert.slice(0, 200));
    await p.context().close();
  }

  // Giao diện ở 4 cỡ màn: không tràn ngang; vùng chạm mới (liên kết "Tới …") không dưới 44 px.
  for (const w of WIDTHS) {
    const p = await newPage(w); await login(p);
    await go(p, '/evaluate/w-2'); await saveB07(p); await p.waitForTimeout(500);
    const o1 = await overflow(p);
    const linkSizes = await p.getByTestId('muc-can-sua').getByRole('button').evaluateAll((es) => es.map((e) => { const r = e.getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }));
    await go(p, '/evaluate/w-1'); const o2 = await overflow(p);
    await go(p, '/plan/p-1?woundId=w-1'); const o3 = await overflow(p);
    rec(`TP1-UI-${w}`, `B07, B06 ở ${w} px: không tràn ngang; liên kết "Tới …" ≥ 44 px`, o1 + o2 + o3 === 0 && linkSizes.every((s) => s >= 44), `tràn ${o1}/${o2}/${o3}; liên kết ${linkSizes.join(',')}`);
    const sm = await small(p); if (sm.length) rec(`TP1-UI-${w}-nho`, `Phần tử bấm < 44 px ở B06 (${w} px, màn đầu)`, 'note', sm.slice(0, 6).join('; '));
    if (p.errors.length) rec(`TP1-UI-${w}-js`, 'Lỗi JavaScript', false, p.errors.join(' | '));
    await p.context().close();
  }
  await b.close();
  finish('p1-03');
})().catch((e) => { console.error(e); process.exit(2); });
