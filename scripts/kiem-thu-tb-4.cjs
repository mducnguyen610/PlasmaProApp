// Kiểm thử giao diện theo tác vụ, giai đoạn 4: B08 Lịch sử vết thương và so sánh ảnh. Bản web, Playwright, dữ liệu mô phỏng.
// Chạy: node scripts/kiem-thu-tb-4.cjs <baseURL> <thư mục kết quả>
// Dữ liệu thêm cho từng ca chỉ ghi vào localStorage của ngữ cảnh trình duyệt đó (không sửa kho mã).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2] || 'http://localhost:8602';
const OUT = process.argv[3] || '.';
fs.mkdirSync(OUT, { recursive: true });
const results = [];
const rec = (id, name, pass, detail = '') => { results.push({ id, name, result: pass ? 'ĐẠT' : 'LỖI', detail }); console.log(pass ? 'ĐẠT ' : 'LỖI ', id, name, detail ? `| ${detail}` : ''); };
const KEY = 'plasmapro.demo.v2';

(async () => {
  const b = await chromium.launch();
  const newPage = async ({ w = 390, h = 844 } = {}) => {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: 'vi-VN' });
    const p = await ctx.newPage();
    p.errors = [];
    p.on('dialog', (d) => d.accept());
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
  const go = async (p, url) => { await p.goto(BASE + url); await p.waitForTimeout(1400); };
  const has = async (p, t, exact = true) => (await p.getByText(t, { exact }).count()) > 0;
  const store = (p) => p.evaluate((k) => JSON.parse(localStorage.getItem(k) || '{}'), KEY);
  const mutate = async (p, fn) => { await p.evaluate(([k, src]) => { const d = JSON.parse(localStorage.getItem(k)); new Function('d', src)(d); localStorage.setItem(k, JSON.stringify(d)); }, [KEY, fn]); };
  const btn = (p, name) => p.getByRole('button', { name, exact: typeof name === 'string' });
  const click = async (loc, t = 900) => { await loc.click(); await loc.page().waitForTimeout(t); };
  const back = async (p) => { await p.locator('[aria-label="Quay lại"]:visible').first().click(); await p.waitForTimeout(1000); };
  const title = async (p) => ((await p.locator('[aria-label="Quay lại"]:visible').first().locator('xpath=following-sibling::*[1]').innerText()).split('\n')[0] || '').trim();
  const footerIn = (p) => p.evaluate(() => { const f = document.querySelector('[data-testid="screen-footer"]'); if (!f) return false; const r = f.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight + 1; });
  const inFooter = (p, name) => p.locator('[data-testid="screen-footer"]').getByRole('button', { name, exact: typeof name === 'string' });
  const overflow = (p) => p.evaluate(() => { const W = window.innerWidth; return [...document.querySelectorAll('div,span')].filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && r.right > W + 1 && getComputedStyle(e).position !== 'fixed'; }).length; });
  const url = (p) => decodeURIComponent(p.url().replace(BASE, ''));
  const q = (p, k) => new URL(p.url()).searchParams.get(k);
  const rowLabels = (p, re) => p.getByRole('button', { name: re }).evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
  const dmy = (iso) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
  const clinical = (d) => JSON.stringify({ images: d.images, evaluations: d.evaluations, plans: d.plans, sessions: d.sessions, wounds: d.wounds, patients: d.patients });

  // TB4-01: vết thương chưa có lịch sử (vết mới của BN001, không ảnh, không đánh giá, không đợt).
  {
    const p = await newPage(); await login(p); await go(p, '/');
    await mutate(p, `d.wounds.push({ id: 'w-moi', patientId: 'p-1', code: 'VT09', location: 'Khuỷu tay (kiểm thử)', startDate: d.wounds[0].startDate, status: 'active' });`);
    await go(p, '/wound-history/w-moi');
    const empty = await has(p, 'Vết thương này chưa có lịch sử khám, ảnh hoặc đợt điều trị.');
    const t = await title(p);
    await click(p.getByRole('tab', { name: /^Ảnh \(0\)/ }).or(p.getByText('Ảnh (0)', { exact: true })).first());
    const noImg = await has(p, 'Chưa có ảnh. Chụp hoặc tải ảnh lên để bắt đầu.');
    const noSel = (await btn(p, 'Chọn 2 ảnh để so sánh').count()) === 0;
    await go(p, '/wound-history/w-moi?tab=dien-tich&xem=danh-sach');
    const noM = await has(p, 'Chưa có kết quả đo nào được lưu cho vết thương này.');
    await go(p, '/compare/w-moi');
    const noCmp = await has(p, 'VT09 chưa có ảnh nào để so sánh.');
    rec('TB4-01', 'Vết chưa có lịch sử: tiêu đề "Lịch sử vết thương", báo trống ở Lịch sử, Ảnh, Số đo; không có nút chọn so sánh; B08 báo chưa có ảnh (không báo "Không có quyền")',
      t === 'Lịch sử vết thương' && empty && noImg && noSel && noM && noCmp && p.errors.length === 0, `tiêu đề "${t}", ${[empty, noImg, noSel, noM, noCmp].join('/')}`);
    // Một ảnh: B08 báo cần ít nhất 2 ảnh.
    await mutate(p, `const s = d.images.find((i) => i.id === 'IMG0001'); d.images.push({ ...s, id: 'IMG7001', woundId: 'w-moi', history: [] });`);
    await go(p, '/compare/w-moi');
    rec('TB4-01b', 'Vết có 1 ảnh: B08 báo "Cần ít nhất 2 ảnh để so sánh"', await has(p, 'VT09 mới có 1 ảnh. Cần ít nhất 2 ảnh để so sánh.'));
    await p.context().close();
  }

  // TB4-02..03: vết có nhiều lần khám; dòng thời gian mới trước, có trạng thái lưu, chỉ của w-1; mở chi tiết rồi quay lại.
  {
    const p = await newPage(); await login(p); await go(p, '/');
    const before = clinical(await store(p));
    await go(p, '/wounds/w-1');
    await click(p.getByRole('button', { name: /^Lịch sử đánh giá, / }), 1300);
    const legacy = url(p).includes('/wound-history/w-1') && q(p, 'tab') === 'danh-gia';
    const evalRows = await p.getByTestId('danh-gia-lich-su').count();
    const d = await store(p);
    const nEval = d.evaluations.filter((e) => e.woundId === 'w-1').length;
    rec('TB4-02a', 'B05 "Lịch sử đánh giá" mở Lịch sử vết thương, lọc "Chỉ đánh giá", đủ số đánh giá của w-1', legacy && evalRows === nEval && nEval >= 1, `${url(p)}; ${evalRows}/${nEval}`);
    await click(p.getByRole('radio', { name: 'Khám và đánh giá' }), 600);
    const labels = await rowLabels(p, /Mở chi tiết$/);
    const dates = labels.map((l) => (l.match(/(\d\d)\/(\d\d)\/(\d{4})/) || []).slice(1).reverse().join('-')).filter(Boolean);
    const sorted = dates.every((x, i) => i === 0 || x <= dates[i - 1]);
    const imgsW1 = d.images.filter((i) => i.woundId === 'w-1').map((i) => i.id);
    const imgRows = labels.filter((l) => /^Ảnh chụp IMG/.test(l)).map((l) => l.match(/IMG\d+/)[0]);
    const foreign = labels.some((l) => /IMG0005|IMG0006/.test(l));
    const hasPlan = labels.some((l) => /^Đợt điều trị · phiên bản 2/.test(l));
    const states = await p.getByText(/^(Đã lưu|Đã lưu, có số đo bác sĩ|Đã lưu, chưa đo|Bác sĩ đã xác nhận)$/).count();
    rec('TB4-02', 'Lịch sử w-1: mới trước theo ngày, có đánh giá, 4 ảnh, phiên bản đợt; mỗi dòng có trạng thái lưu; không có ảnh của w-2',
      sorted && imgRows.length === imgsW1.length && !foreign && hasPlan && states >= labels.length, `${labels.length} dòng, ngày ${dates.join(',')}, ảnh ${imgRows.join(',')}, trạng thái ${states}`);
    // Mở chi tiết lần đánh giá.
    await click(p.getByRole('button', { name: /^Đánh giá · .*Mở chi tiết$/ }).first(), 1200);
    const onDetail = /\/wound-history\/w-1\/ban-ghi\/e-1/.test(url(p)) && q(p, 'loai') === 'danh-gia';
    const fields = await has(p, 'Diện tích ghi trong đánh giá') && await has(p, 'Ảnh dùng cho lần đánh giá');
    const dt = await title(p);
    await back(p);
    const backOk = /\/wound-history\/w-1$/.test(new URL(p.url()).pathname) && q(p, 'tab') === 'lich-su' && q(p, 'loc') === 'kham';
    rec('TB4-03', 'Chạm dòng đánh giá mở màn chi tiết riêng (woundId, recordId, loai); Quay lại về đúng Lịch sử, giữ bộ lọc', onDetail && fields && /^Đánh giá \d\d\/\d\d\/\d{4}$/.test(dt) && backOk, `${onDetail} ${fields} "${dt}" | về ${url(p)}`);
    // Ảnh liên kết trong chi tiết đánh giá mở trình xem.
    await click(p.getByRole('button', { name: /^Đánh giá · .*Mở chi tiết$/ }).first(), 1200);
    await click(p.getByRole('button', { name: /^Xem ảnh IMG0003/ }), 1200);
    const viewer = /\/wound-history\/w-1\/anh\/IMG0003/.test(url(p));
    await back(p);
    rec('TB4-03b', 'Chi tiết đánh giá: ảnh dùng cho lần đánh giá mở trình xem ảnh; Quay lại về chi tiết', viewer && /ban-ghi\/e-1/.test(url(p)), url(p));
    // Chi tiết ảnh và chi tiết đợt.
    await go(p, '/wound-history/w-1');
    await click(p.getByRole('button', { name: /^Ảnh chụp IMG0004/ }), 1200);
    const imgDetail = await has(p, 'Ảnh này chưa có số đo của bác sĩ.') && await has(p, 'Đã lưu, chưa đo');
    await back(p);
    await click(p.getByRole('button', { name: /^Đợt điều trị · phiên bản 2/ }), 1200);
    const planDetail = await has(p, 'Bác sĩ đã xác nhận') && await has(p, 'Đang áp dụng') && await has(p, 'Mở Đợt điều trị');
    rec('TB4-03c', 'Chi tiết ảnh chưa đo ghi "chưa có số đo"; chi tiết đợt có trạng thái và lối sang B06', imgDetail && planDetail, `${imgDetail} ${planDetail}`);
    // Buổi điều trị (lối vào cũ tab=buoi): mở chi tiết một buổi.
    await go(p, '/wound-history/w-1?tab=buoi');
    const sessRows = await p.getByTestId('buoi-dieu-tri').count();
    await click(p.getByTestId('buoi-dieu-tri').first().getByRole('button').first().or(p.getByRole('button', { name: /^Buổi điều trị · / }).first()), 1200);
    const sessDetail = /ban-ghi\//.test(url(p)) && q(p, 'loai') === 'buoi' && await has(p, 'Mã phiên');
    rec('TB4-03d', 'Lối vào cũ tab=buoi: lọc "Buổi điều trị" (tối đa 30 dòng), mở được chi tiết một buổi', sessRows > 0 && sessRows <= 30 && sessDetail, `${sessRows} dòng, ${url(p)}`);
    rec('TB4-11a', 'Sau khi xem lịch sử và chi tiết: dữ liệu lâm sàng không đổi (ảnh, đánh giá, đợt, buổi)', clinical(await store(p)) === before);
    await p.context().close();
  }

  // TB4-04..06: nhiều ảnh trong một lần khám; trình xem ảnh; chọn 2 ảnh để so sánh, quay lại giữ lựa chọn.
  {
    const p = await newPage(); await login(p); await go(p, '/');
    await mutate(p, `const s = d.images.find((i) => i.id === 'IMG0003');
      d.images.push({ ...s, id: 'IMG8001', areaCm2: null, status: 'unlabeled', history: [], measureMethod: undefined });
      d.images.push({ ...s, id: 'IMG8002', areaCm2: null, status: 'unlabeled', history: [], measureMethod: undefined });`);
    const before = clinical(await store(p));
    const d = await store(p);
    const day3 = dmy(d.images.find((i) => i.id === 'IMG0003').captureDate);
    await go(p, '/wound-history/w-1?tab=anh');
    const head = await has(p, `Chụp ${day3} · 3 ảnh`);
    const groups = await p.getByText(/^Chụp \d\d\/\d\d\/\d{4} · \d+ ảnh$/).allInnerTexts();
    const gDates = groups.map((g) => g.slice(5, 15).split('/').reverse().join('-'));
    rec('TB4-04', 'Ảnh nhóm theo ngày chụp (mới trước); ngày có 3 ảnh hiện "· 3 ảnh" và đủ 3 ô', head && gDates.every((x, i) => i === 0 || x < gDates[i - 1]) && (await p.getByRole('button', { name: /^Xem ảnh IMG(0003|8001|8002),/ }).count()) === 3, groups.join(' | '));
    // Trình xem ảnh riêng.
    await click(p.getByRole('button', { name: /^Xem ảnh IMG0002,/ }), 1200);
    const vUrl = /\/wound-history\/w-1\/anh\/IMG0002/.test(url(p));
    const fit = await p.getByTestId('trinh-xem-anh').evaluate((el) => { const i = el.querySelector('img'); const dv = [...el.querySelectorAll('div')].find((x) => getComputedStyle(x).backgroundImage.startsWith('url(')); return i ? getComputedStyle(i).objectFit : dv ? getComputedStyle(dv).backgroundSize : ''; });
    const vt = await title(p);
    await click(btn(p, 'Ảnh sau'), 900);
    const next = /anh\/IMG0003/.test(url(p));
    await back(p);
    const backAlbum = /\/wound-history\/w-1/.test(url(p)) && !/anh\//.test(url(p)) && q(p, 'tab') === 'anh';
    rec('TB4-05', 'Chạm ảnh mở trình xem riêng (ảnh contain, không cắt); "Ảnh sau" sang ảnh kế cùng vết; Quay lại về đúng thẻ Ảnh (không lùi qua từng ảnh)', vUrl && fit === 'contain' && vt === 'Ảnh IMG0002' && next && backAlbum, `${vUrl} fit=${fit} "${vt}" next=${next} về ${url(p)}`);
    // Chọn 2 ảnh để so sánh.
    await click(btn(p, 'Chọn 2 ảnh để so sánh'), 700);
    const off = await inFooter(p, 'Chọn thêm 2 ảnh').isDisabled().catch(() => (inFooter(p, 'Chọn thêm 2 ảnh').getAttribute('aria-disabled')).then((x) => x === 'true'));
    await click(p.getByRole('checkbox', { name: /^Ảnh IMG0003,/ }), 500);
    await click(p.getByRole('checkbox', { name: /^Ảnh IMG0001,/ }), 500);
    const sel = q(p, 'chon');
    const roles = (await p.getByRole('checkbox', { name: /đang chọn làm ảnh/ }).evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')))).join(' | ');
    const footer = await footerIn(p);
    await click(inFooter(p, 'So sánh 2 ảnh'), 1300);
    const cmp = /\/compare\/w-1/.test(url(p)) && q(p, 'truoc') === 'IMG0001' && q(p, 'sau') === 'IMG0003';
    const lab = await btn(p, /^Đổi ảnh sau/).getAttribute('aria-label');
    await back(p);
    const kept = q(p, 'chonAnh') === '1' && q(p, 'chon') === sel && (await p.getByRole('checkbox', { name: /đang chọn làm ảnh/ }).count()) === 2;
    rec('TB4-06', 'Chọn 2 ảnh: chân màn "So sánh 2 ảnh" (khóa khi chưa đủ); ảnh sớm hơn là "Trước"; mở B08 đúng cặp; Quay lại vẫn giữ lựa chọn',
      off && footer && /IMG0001.*trước/.test(roles) && /IMG0003.*sau/.test(roles) && cmp && /IMG0003/.test(lab) && kept, `chọn ${sel}; ${roles}; ${url(p)}`);
    // Chọn ảnh thứ ba thay ảnh chọn sớm nhất.
    await click(p.getByRole('checkbox', { name: /^Ảnh IMG0002,/ }), 500);
    rec('TB4-06b', 'Chọn ảnh thứ ba: thay ảnh chọn đầu tiên, vẫn chỉ 2 ảnh', q(p, 'chon') === 'IMG0001,IMG0002', q(p, 'chon'));
    await click(inFooter(p, 'Hủy chọn'), 500);
    rec('TB4-06c', '"Hủy chọn" thoát chế độ chọn, không còn chân màn', !q(p, 'chonAnh') && (await p.locator('[data-testid="screen-footer"]').count()) === 0);
    rec('TB4-11b', 'Sau khi xem ảnh, chọn và so sánh: dữ liệu lâm sàng không đổi', clinical(await store(p)) === before);
    await p.context().close();
  }

  // TB4-07..09: B08 với ảnh không hợp lệ, thiếu dữ liệu; chọn ảnh trong B08; quay lại từ trình xem.
  {
    const p = await newPage(); await login(p); await go(p, '/');
    await go(p, '/compare/w-1?truoc=IMG0005&sau=IMG0002');
    const n1 = await has(p, /^Ảnh được chỉ định không thuộc VT01/, false);
    const l1 = await btn(p, /^Đổi ảnh trước/).getAttribute('aria-label');
    const no5 = (await p.getByRole('button', { name: /^Mở ảnh IMG0005/ }).count()) === 0;
    rec('TB4-07', 'B08 với ảnh của vết khác (IMG0005 thuộc w-2): không hiện, báo rõ, dùng ảnh mặc định IMG0001', n1 && /IMG0001/.test(l1) && no5, l1);
    await go(p, '/compare/w-1?sau=KHONG-CO');
    rec('TB4-07b', 'B08 với mã ảnh không tồn tại: báo, dùng ảnh mới nhất', await has(p, /^Ảnh được chỉ định không thuộc VT01/, false) && /IMG0004/.test(await btn(p, /^Đổi ảnh sau/).getAttribute('aria-label')));
    await go(p, '/compare/w-1?truoc=IMG0002&sau=IMG0002');
    rec('TB4-07c', 'Hai bên cùng một ảnh: báo, không tính chênh lệch', await has(p, 'Hai bên đang là cùng một ảnh. Đổi một bên để so sánh.') && await has(p, 'Chọn hai ảnh khác nhau để xem chênh lệch.') && !(await has(p, /^Chênh lệch:/, false)));
    await go(p, '/compare/w-1?truoc=IMG0003&sau=IMG0004');
    rec('TB4-07d', 'Thiếu số đo (IMG0004 chưa đo): "Chưa đủ số đo để so sánh diện tích", vẫn hiện ngày chụp của từng ảnh', await has(p, 'Chưa đủ số đo để so sánh diện tích.') && (await p.getByText(/^\d\d\/\d\d\/\d{4}$/).count()) >= 2);
    await mutate(p, `const i = d.images.find((x) => x.id === 'IMG0002'); i.capture = { ...(i.capture || {}), sourceDateKnown: false };`);
    await go(p, '/compare/w-1?truoc=IMG0002&sau=IMG0003');
    rec('TB4-07e', 'Ảnh chưa rõ ngày chụp: ghi "Ngày chụp chưa xác định", không tính số ngày cách nhau', await has(p, 'Ngày chụp chưa xác định') && await has(p, 'Một ảnh chưa rõ ngày chụp nên không tính số ngày cách nhau.') && !(await has(p, /^Hai ảnh chụp cách nhau/, false)));
    await mutate(p, `const i = d.images.find((x) => x.id === 'IMG0002'); i.capture.sourceDateKnown = true;`);
    // Chọn ảnh trong B08: nội dung màn thành danh sách (không modal), đúng vết, mới trước; chọn xong về cặp mới.
    await go(p, '/compare/w-1');
    await click(btn(p, /^Đổi ảnh sau/), 600);
    const t = await title(p);
    const radios = await p.getByRole('radio', { name: /^Ảnh IMG/ }).evaluateAll((es) => es.map((e) => e.getAttribute('aria-label').match(/IMG\d+/)[0]));
    const noModal = (await p.locator('[aria-modal="true"]').count()) === 0;
    await click(p.getByRole('radio', { name: /^Ảnh IMG0002/ }), 800);
    const pair = q(p, 'truoc') === 'IMG0001' && q(p, 'sau') === 'IMG0002' && !q(p, 'chon');
    rec('TB4-08', 'B08 "Đổi ảnh sau": màn chọn "Chọn ảnh sau" (không modal), chỉ ảnh w-1 mới trước; chọn xong về so sánh với cặp mới', t === 'Chọn ảnh sau' && radios.join(',') === 'IMG0004,IMG0003,IMG0002,IMG0001' && noModal && pair, `"${t}" ${radios.join(',')} ${url(p)}`);
    // Quay lại từ trình xem ảnh giữ cặp.
    await click(p.getByRole('button', { name: /^Mở ảnh IMG0002/ }), 1200);
    const inViewer = /\/wound-history\/w-1\/anh\/IMG0002/.test(url(p));
    await back(p);
    const kept = /IMG0001/.test(await btn(p, /^Đổi ảnh trước/).getAttribute('aria-label')) && /IMG0002/.test(await btn(p, /^Đổi ảnh sau/).getAttribute('aria-label'));
    rec('TB4-09', 'Từ B08 chạm ảnh mở trình xem riêng; Quay lại về B08 vẫn giữ cặp IMG0001, IMG0002', inViewer && kept, url(p));
    // Quay lại từ B08 về đúng màn trước (Lịch sử, thẻ Số đo).
    await go(p, '/wound-history/w-1?tab=dien-tich');
    await click(btn(p, 'So sánh'), 1200);
    await click(btn(p, /^Đổi ảnh trước/), 500);
    await click(p.getByRole('radio', { name: /^Ảnh IMG0002/ }), 600);
    await back(p);
    rec('TB4-09b', 'Đổi ảnh trong B08 không tạo thêm bước lùi: Quay lại từ B08 về Lịch sử thẻ Số đo', /\/wound-history\/w-1/.test(url(p)) && q(p, 'tab') === 'dien-tich', url(p));
    await p.context().close();
  }

  // TB4-10: chuyển giữa bệnh nhân và vết thương; không hiện nhầm dữ liệu; quyền.
  {
    const p = await newPage(); await login(p); await go(p, '/');
    await go(p, '/wound-history/w-1?tab=anh');
    const a1 = await p.getByRole('button', { name: /^Xem ảnh IMG/ }).evaluateAll((es) => es.map((e) => e.getAttribute('aria-label').match(/IMG\d+/)[0]));
    await go(p, '/wound-history/w-2?tab=anh');
    const a2 = await p.getByRole('button', { name: /^Xem ảnh IMG/ }).evaluateAll((es) => es.map((e) => e.getAttribute('aria-label').match(/IMG\d+/)[0]));
    const ctx2 = await has(p, 'BN002', false);
    await go(p, '/wound-history/w-2');
    const l2 = (await rowLabels(p, /Mở chi tiết$/)).join(' | ');
    rec('TB4-10', 'Chuyển BN001/VT01 sang BN002/VT01: ảnh và lịch sử chỉ của vết đang mở', a1.join(',') === 'IMG0004,IMG0003,IMG0002,IMG0001' && a2.join(',') === 'IMG0006,IMG0005' && ctx2 && !/IMG000[1-4]|e-1/.test(l2), `${a1} | ${a2}`);
    await go(p, '/wound-history/w-1/ban-ghi/e-demo2?loai=danh-gia');
    const nf1 = await title(p);
    await go(p, '/wound-history/w-1/ban-ghi/e-1?loai=anh');
    const nf2 = await title(p);
    await go(p, '/wound-history/w-1/anh/IMG0005');
    const nf3 = await title(p);
    await go(p, '/wound-history/w-khong-co');
    const nf4 = await title(p);
    rec('TB4-10b', 'Đường dẫn chéo vết: đánh giá của w-2 dưới w-1, sai loại bản ghi, ảnh của w-2 dưới w-1, vết không tồn tại đều báo "Không tìm thấy"', [nf1, nf2, nf3, nf4].every((x) => x === 'Không tìm thấy'), [nf1, nf2, nf3, nf4].join(' / '));
    await p.context().close();
    const p2 = await newPage(); await login(p2, 'bacsi2');
    const out = [];
    for (const u of ['/wound-history/w-1', '/wound-history/w-1/ban-ghi/e-1?loai=danh-gia', '/wound-history/w-1/anh/IMG0001', '/compare/w-1']) { await go(p2, u); out.push(await title(p2)); }
    rec('TB4-10c', 'Bác sĩ không phụ trách BN001: Lịch sử, chi tiết, trình xem ảnh, B08 đều "Không có quyền"', out.every((x) => x === 'Không có quyền'), out.join(' / '));
    await p2.context().close();
  }

  // TB4-12..13: kết quả đo; số AR chỉ tham khảo, không thành số đo; bệnh nhân không thấy nháp, nội bộ, số AR.
  {
    const p = await newPage(); await login(p); await go(p, '/');
    await mutate(p, `
      const i = d.images.find((x) => x.id === 'IMG0004');
      i.capture = { sourceDateKnown: true, automaticMeasurement: { areaCm2: 11.8, status: 'estimated_unvalidated', method: 'ar_pinhole_color_mask', reasonCodes: [] }, manualReference: { areaCm2: null, method: null, confirmedBy: null, confirmedAt: null } };
      const j = d.images.find((x) => x.id === 'IMG0002');
      j.history.push({ at: new Date().toISOString(), by: 'u-bs1', fromName: j.filename, toName: j.filename, fromArea: 10.2, toArea: 10.4 }); j.areaCm2 = 10.4;
      const pl = d.plans.find((x) => x.id === 'pl-1');
      d.plans.push({ ...pl, id: 'pl-nhap', version: 3, status: 'draft', confirmed: false, editedAt: new Date().toISOString() });
      d.evaluations.push({ ...d.evaluations.find((e) => e.id === 'e-1'), id: 'e-noibo', visibleToPatient: false, areaCm2: null, date: d.evaluations.find((e) => e.id === 'e-1').date });
    `);
    const before = clinical(await store(p));
    await go(p, '/wound-history/w-1?tab=dien-tich');
    const chart = (await p.getByTestId('bieu-do-dien-tich').count()) === 1;
    await click(p.getByRole('tab', { name: 'Kết quả đã lưu' }).or(p.getByText('Kết quả đã lưu', { exact: true })).first(), 700);
    const doc = await p.getByTestId('ket-qua-do-bac-si').count();
    const ev = await p.getByTestId('ket-qua-do-danh-gia').count();
    const ref = await p.getByTestId('ket-qua-do-tham-khao').count();
    const arLabel = await has(p, 'Ước lượng AR (tham khảo)') && await has(p, '11,8 cm² (chưa kiểm chứng)');
    const replaced = await has(p, 'Đã sửa 1 lần, số trước đó vẫn lưu: 10,2 cm²');
    const units = (await p.getByText(/^\d+(,\d+)? cm²/).count()) >= 4;
    const after = await store(p);
    const im4 = after.images.find((x) => x.id === 'IMG0004');
    rec('TB4-12', 'Số đo: biểu đồ giữ nguyên; "Kết quả đã lưu" tách số bác sĩ (3), số trong đánh giá (1), ước lượng AR tham khảo (1, ghi "chưa kiểm chứng"); số cũ đã sửa vẫn hiện; đơn vị cm²',
      chart && doc === 3 && ev === 1 && ref === 1 && arLabel && replaced && units, `bác sĩ ${doc}, đánh giá ${ev}, tham khảo ${ref}, AR ${arLabel}, sửa ${replaced}`);
    rec('TB4-12b', 'QĐ-1: số AR không thành số đo (IMG0004 areaCm2 null, manualReference null), không có nút "Dùng số này"',
      im4.areaCm2 === null && im4.capture.manualReference.areaCm2 === null && !(await has(p, /Dùng số này/, false)) && clinical(after) === before);
    await go(p, '/wound-history/w-1');
    const draft = await has(p, 'Nháp, chưa áp dụng') && (await p.getByRole('button', { name: /^Đợt điều trị · phiên bản 3/ }).count()) === 1;
    const internal = await has(p, 'Chỉ nội bộ');
    rec('TB4-13a', 'Bác sĩ: phiên bản đợt nháp hiện "Nháp, chưa áp dụng"; đánh giá nội bộ có chip "Chỉ nội bộ"', draft && internal);
    await p.context().close();
    const p2 = await newPage(); await login(p2, 'benhnhan');
    await p2.evaluate(([k, d]) => localStorage.setItem(k, JSON.stringify(d)), [KEY, after]);
    await go(p2, '/wound-history/w-1');
    const labels = (await rowLabels(p2, /Mở chi tiết$/)).join(' | ');
    const noDraft = !/phiên bản 3/.test(labels) && !(await has(p2, 'Nháp, chưa áp dụng'));
    const evalN = (labels.match(/^Đánh giá|\| Đánh giá/g) || []).length;
    const noSessFilter = (await p2.getByRole('radio', { name: /^Buổi điều trị/ }).count()) === 0;
    await go(p2, '/wound-history/w-1/ban-ghi/e-noibo?loai=danh-gia');
    const hiddenEval = await title(p2);
    await go(p2, '/wound-history/w-1?tab=dien-tich&xem=danh-sach');
    const noRef = (await p2.getByTestId('ket-qua-do-tham-khao').count()) === 0;
    rec('TB4-13', 'Bệnh nhân: không thấy đợt nháp, đánh giá nội bộ (kể cả qua đường dẫn), buổi điều trị, số AR tham khảo', noDraft && evalN === 1 && noSessFilter && hiddenEval === 'Không tìm thấy' && noRef, `${labels}; nội bộ: ${hiddenEval}`);
    await p2.context().close();
  }

  // TB4-14: bố cục ở 320, 360, 390, 768 px.
  {
    const rows = [];
    for (const w of [320, 360, 390, 768]) {
      const p = await newPage({ w, h: 740 }); await login(p);
      const res = [];
      for (const u of ['/wound-history/w-1', '/wound-history/w-1?tab=anh', '/wound-history/w-1?tab=anh&chonAnh=1&chon=IMG0001,IMG0003', '/wound-history/w-1?tab=dien-tich&xem=danh-sach', '/wound-history/w-1/ban-ghi/e-1?loai=danh-gia', '/wound-history/w-1/ban-ghi/IMG0003?loai=anh', '/wound-history/w-1/anh/IMG0003', '/compare/w-1', '/compare/w-1?chon=truoc']) {
        await go(p, u);
        const o = await overflow(p);
        const needFoot = /chonAnh|compare/.test(u);
        const f = needFoot ? await footerIn(p) : true;
        res.push(o === 0 && f);
        if (o || !f) rows.push(`${w} ${u}: tràn ${o}, chân màn ${f}`);
      }
      // Trình xem ảnh: hai nút đổi ảnh nằm trong khung nhìn.
      await go(p, '/wound-history/w-1/anh/IMG0003');
      const navIn = await btn(p, 'Ảnh sau').evaluate((e) => e.getBoundingClientRect().bottom <= innerHeight + 1);
      if (!navIn) rows.push(`${w} trình xem: nút ngoài khung`);
      if (p.errors.length) rows.push(`${w} lỗi JS: ${p.errors.join(' | ').slice(0, 120)}`);
      await p.context().close();
    }
    rec('TB4-14', 'Ở 320, 360, 390, 768 px: 9 màn và trạng thái không tràn ngang, chân màn trong khung nhìn, không lỗi JS', rows.length === 0, rows.join(' ; '));
  }

  fs.writeFileSync(path.join(OUT, 'ket-qua-tb-4.json'), JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.result === 'ĐẠT').length;
  console.log(`\nTổng: ${pass}/${results.length} đạt`);
  await b.close();
  process.exit(pass === results.length ? 0 : 1);
})();
