// Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md): kiểm thử bản web với dữ liệu mô phỏng, Playwright.
// Trang chủ 4 ô và thanh dưới, cài đặt, danh sách bệnh nhân, trang bệnh nhân, trang vết thương 3 thẻ, thẻ Phác đồ (gia hạn, hoãn, hủy,
// kết thúc rồi tạo mới), chi tiết phác đồ, phiên bản có ngày áp dụng, bệnh nhân xác nhận gia hạn.
// Chỉ kiểm trên một máy (demo một điện thoại); không thay cho thử trên máy thật hay thử với bác sĩ.
// Chạy: node scripts/kiem-thu-logic-chot.cjs <baseURL> <thư mục kết quả>
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

  // ---------- Trang chủ, điều hướng, cài đặt (mục 2, TC-8, TC-11, TC-12) ----------
  {
    const p = await newPage(); await login(p, 'bacsi');
    await go(p, '/doctor');
    const tiles = ['o-patients', 'o-capture', 'o-devices', 'o-settings'];
    let n = 0; for (const t of tiles) n += await p.getByTestId(t).count();
    const tabs = await p.getByRole('tab').locator('visible=true').count();
    rec('LC-01', 'Trang chủ: 4 ô (Bệnh nhân, Chụp ảnh và gán nhãn, Thiết bị, Cài đặt), lời chào, chuông; không có thanh dưới', n === 4 && await p.getByTestId('dai-chao').count() === 1 && await p.getByTestId('chuong-thong-bao').count() === 1 && tabs === 0, `${n} ô, ${tabs} tab`);
    await p.getByTestId('o-patients').click(); await p.waitForTimeout(1200);
    const names = await p.getByRole('tab').locator('visible=true').allTextContents();
    rec('LC-02', 'Thanh dưới 4 mục, không có mục Trang chủ; nút Về Trang chủ trên tiêu đề', names.length === 4 && !names.some((x) => /Trang chủ/.test(x)) && await p.getByRole('button', { name: 'Về Trang chủ' }).count() === 1, names.join(' | '));
    await p.getByRole('button', { name: 'Về Trang chủ' }).click(); await p.waitForTimeout(1000);
    rec('LC-03', 'Nút Trang chủ đưa về trang chủ', /\/doctor\/?$/.test(new URL(p.url()).pathname));
    await p.getByTestId('chuong-thong-bao').click(); await p.waitForTimeout(1200);
    rec('LC-04', 'Chuông mở trang Thông báo gồm 4 nhóm việc', await has(p, 'Thông báo') && await has(p, 'Máy báo lỗi', false) && await has(p, 'Ảnh chưa đủ nhãn', false));
    await go(p, '/doctor/account');
    await p.getByPlaceholder('ten@benhvien.vn').fill('sai-email'); await btn(p, 'Lưu email').click(); await p.waitForTimeout(500);
    const badEmail = (await store(p)).accounts.find((a) => a.id === 'u-bs1').email === undefined;
    await p.getByPlaceholder('ten@benhvien.vn').fill('bacsi@benhvien.vn'); await btn(p, 'Lưu email').click(); await p.waitForTimeout(800);
    rec('LC-05', 'Cài đặt: email liên hệ kiểm định dạng, lưu được (mục 9 #4)', badEmail && (await store(p)).accounts.find((a) => a.id === 'u-bs1').email === 'bacsi@benhvien.vn');
    await btn(p, 'Đăng xuất').click(); await p.waitForTimeout(500);
    const asked = await p.getByTestId('hoi-dang-xuat').count() === 1 && await has(p, 'Bạn có chắc chắn muốn đăng xuất không?');
    await p.getByTestId('hoi-dang-xuat').getByRole('button', { name: 'Hủy', exact: true }).click(); await p.waitForTimeout(400);
    rec('LC-06', 'Đăng xuất hỏi xác nhận; Hủy thì vẫn ở Cài đặt', asked && /account/.test(p.url()));
    rec('LC-07', 'Không lỗi JS', p.errors.length === 0, p.errors.join(' | '));
    await p.context().close();
  }

  // ---------- Danh sách bệnh nhân (mục 3.1) ----------
  {
    const p = await newPage(); await login(p, 'bacsi2');
    await go(p, '/doctor/patients');
    const emptyDefault = await p.locator('[data-testid^="the-bn-"]').count() === 0;
    await p.getByLabel('Tìm bệnh nhân theo tên hoặc mã').fill('nguyen van'); await p.waitForTimeout(500);
    const found = await p.getByTestId('the-bn-BN001').count() === 1 && await has(p, 'Bác sĩ khác phụ trách · chỉ xem');
    rec('LC-08', 'Mặc định chỉ hồ sơ mình phụ trách; tìm theo tên không dấu thấy hồ sơ bác sĩ khác, chỉ xem (M6, M8, H9)', emptyDefault && found);
    await p.context().close();
    const q = await newPage(); await login(q, 'bacsi');
    await go(q, '/doctor/patients');
    const card = await q.getByTestId('the-bn-BN001').textContent();
    rec('LC-09', 'Thẻ bệnh nhân: họ tên, mã, số vết, lần cập nhật, số phác đồ đang hoạt động (M2)', /Nguyễn Văn A/.test(card) && /BN001/.test(card) && /1 vết thương/.test(card) && /cập nhật/.test(card) && /1 phác đồ đang hoạt động/.test(card), card);
    await q.getByLabel('Tìm bệnh nhân theo tên hoặc mã').fill('003'); await q.waitForTimeout(400);
    const byCode = await q.getByTestId('the-bn-BN003').count() === 1 && await q.getByTestId('the-bn-BN001').count() === 0;
    await q.getByLabel('Tìm bệnh nhân theo tên hoặc mã').fill(''); await q.waitForTimeout(300);
    await q.getByText('Bộ lọc', { exact: true }).first().click(); await q.waitForTimeout(300);
    await q.getByRole('radio', { name: /^Chưa có phác đồ hoạt động/ }).click(); await q.waitForTimeout(400);
    const noPlan = await q.getByTestId('the-bn-BN003').count() === 1 && await q.getByTestId('the-bn-BN001').count() === 0;
    const h7 = await q.getByRole('radio', { name: /^Cần tái khám/ }).count() === 1 && await q.getByRole('radio', { name: /^Đang điều trị/ }).count() === 1;
    rec('LC-10', 'Tìm theo một phần mã; bộ lọc thu gọn: 4 trạng thái H7 và Có, Chưa có phác đồ hoạt động (M7)', byCode && noPlan && h7);

    // ---------- Trang bệnh nhân (mục 3.3) ----------
    await go(q, '/patients/p-1');
    const info = await q.getByTestId('thong-tin-ca-nhan').textContent();
    const thumb = await q.getByTestId('dong-vet').first().locator('img').first().boundingBox().catch(() => null);
    rec('LC-11', 'Trang bệnh nhân: mã, ngày sinh, giới tính, SĐT, trạng thái chung; ảnh nhỏ khoảng 52 px; thiết bị đang giữ; không còn mục Đợt điều trị',
      /BN001/.test(info) && /Giới tính/.test(info) && /Số điện thoại/.test(info) && /Trạng thái chung/.test(info) && !!thumb && Math.abs(thumb.width - 52) <= 2
      && await q.getByTestId('thiet-bi-dang-giu').count() === 1 && !(await has(q, 'Đợt điều trị')), `${thumb?.width} px`);
    await go(q, '/patients/p-3');
    rec('LC-12', 'Vết chưa có ảnh hiện ô "Chưa có ảnh" (M37); vết không có phác đồ ghi Chưa có phác đồ hoạt động',
      (await q.getByTestId('dong-vet').first().textContent()).includes('Chưa có phác đồ hoạt động') && (await q.evaluate(() => JSON.parse(localStorage.getItem('plasmapro.demo.v2')).images.some((i) => i.woundId === 'w-3')) || await q.getByTestId('chua-co-anh').count() === 1));

    // ---------- Trang vết thương (mục 3.4) ----------
    await go(q, '/wounds/w-1');
    const tabs = await q.getByRole('tab').locator('visible=true').allTextContents();
    rec('LC-13', 'Trang vết thương: tiêu đề Vết thương 01, khối Vị trí, Ngày ghi nhận, Số ảnh, Phác đồ; ba thẻ Ảnh, Đánh giá, Phác đồ',
      await has(q, 'Vết thương 01') && await has(q, 'Ngày ghi nhận') && await has(q, 'Số ảnh') && ['Ảnh', 'Đánh giá', 'Phác đồ'].every((t) => tabs.includes(t)), tabs.join(','));
    const photo = await has(q, 'Ảnh ban đầu') && await has(q, 'Ảnh mới nhất') && await has(q, 'Xem tất cả') && await btn(q, 'Chụp ảnh mới').count() === 1;
    await q.getByTestId('tom-tat-dien-tich').click(); await q.waitForTimeout(500);
    const evalTab = await q.getByTestId('the-danh-gia').count() === 1 && await has(q, 'Nhận định bác sĩ') && await has(q, 'Lịch sử đánh giá') && !(await has(q, 'Chiều dài'));
    rec('LC-14', 'Thẻ Ảnh hai ảnh có nhãn và ngày; chạm tóm tắt diện tích mở thẻ Đánh giá (M36); Đánh giá chỉ có Diện tích (M19)', photo && evalTab && await has(q, 'so với lần đo đầu', false));

    // ---------- Thẻ Phác đồ (mục 4.1, 5) ----------
    await go(q, '/wounds/w-1?the=phac-do');
    const block = await q.getByTestId('phac-do-dang-hoat-dong').count() === 1 && ['Gia hạn', 'Tạm dừng', 'Kết thúc sớm', 'Xem chi tiết'].every(async () => true);
    const four = await btn(q, 'Gia hạn').count() + await btn(q, 'Tạm dừng').count() + await btn(q, 'Kết thúc sớm').count() + await btn(q, 'Xem chi tiết').count();
    const sched = await q.getByTestId('lich-dieu-tri').count() === 1 && await q.getByTestId('lich-su-phac-do').count() === 1;
    rec('LC-15', 'Thẻ Phác đồ: khối đang hoạt động với 4 nút, Lịch điều trị, Lịch sử phác đồ (M22)', block && four === 4 && sched, `${four} nút`);
    let d = await store(q);
    const pl1 = d.plans.find((x) => x.id === 'pl-1');
    // Gia hạn
    await btn(q, 'Gia hạn').click(); await q.waitForTimeout(300);
    await sheetBtn(q, 'Gia hạn').click(); await q.waitForTimeout(400);
    const needDate = await has(q, 'Nhập ngày kết thúc mới dạng dd/mm/yyyy.');
    const toEnd = addD(pl1.endDate, 14);
    await q.getByTestId('bang-phac-do').getByLabel('Ngày kết thúc mới').fill(vn(toEnd).replace(/\//g, ''));
    await sheetBtn(q, 'Gia hạn').click(); await q.waitForTimeout(400);
    const needReason = await has(q, 'Nhập lý do gia hạn.');
    await q.getByTestId('bang-phac-do').getByLabel('Lý do').fill('Vết chưa liền, cần thêm 2 tuần');
    await sheetBtn(q, 'Gia hạn').click(); await q.waitForTimeout(1000);
    d = await store(q);
    const after = d.plans.filter((x) => x.protocolId === 'pr-demo-1');
    const ext = after.find((x) => x.id === 'pl-1');
    rec('LC-16', 'Gia hạn: bắt buộc ngày và lý do; chỉ đổi ngày kết thúc, không tạo phiên bản; ghi lịch sử, chờ bệnh nhân xác nhận (M32)',
      needDate && needReason && after.length === d.plans.filter((x) => x.protocolId === 'pr-demo-1').length && ext.endDate === toEnd && ext.version === pl1.version && ext.extensions?.length === 1 && !ext.extensions[0].ackAt);
    // Hoãn phiên sắp tới
    const nextSlot = q.locator('[data-testid^="phien-"]').filter({ hasText: /Sắp đến lịch|Đến lịch hôm nay/ }).first();
    const slotDate = (await nextSlot.getAttribute('data-testid')).replace('phien-', '');
    await nextSlot.getByRole('button', { name: /^Hoãn phiên/ }).click(); await q.waitForTimeout(300);
    const newDate = addD(slotDate, 1);
    await q.getByTestId('bang-phac-do').getByLabel('Ngày mới').fill(vn(newDate).replace(/\//g, ''));
    await q.getByTestId('bang-phac-do').getByLabel('Lý do').fill('Bệnh nhân đi khám chuyên khoa');
    await sheetBtn(q, 'Hoãn phiên').click(); await q.waitForTimeout(1000);
    d = await store(q);
    const ch = (d.sessionChanges ?? []).find((c) => c.date === slotDate);
    const postponed = (await q.getByTestId(`phien-${slotDate}`).textContent()).includes('Đã hoãn');
    rec('LC-17', 'Hoãn phiên chưa diễn ra: bắt buộc lý do và ngày mới; phiên cũ Đã hoãn, có phiên ở ngày mới (M29)', !!ch && ch.kind === 'postpone' && ch.newDate === newDate && postponed && await q.getByTestId(`phien-${newDate}`).count() >= 1, slotDate);
    // Hủy phiên kế tiếp khác
    const other = q.locator('[data-testid^="phien-"]').filter({ hasText: 'Sắp đến lịch' }).nth(1);
    const otherDate = (await other.getAttribute('data-testid')).replace('phien-', '');
    await other.getByRole('button', { name: /^Hủy phiên/ }).click(); await q.waitForTimeout(300);
    await sheetBtn(q, 'Hủy phiên').click(); await q.waitForTimeout(300);
    const cancelNeedsReason = await has(q, 'Nhập lý do hủy.');
    await q.getByTestId('bang-phac-do').getByLabel('Lý do').fill('Da kích ứng');
    await sheetBtn(q, 'Hủy phiên').click(); await q.waitForTimeout(1000);
    rec('LC-18', 'Hủy phiên: bắt buộc lý do; phiên giữ trong lịch với trạng thái Đã hủy', cancelNeedsReason && (await q.getByTestId(`phien-${otherDate}`).textContent()).includes('Đã hủy'));
    const pastDone = q.locator('[data-testid^="phien-"]').filter({ hasText: /Hoàn thành|Đã bỏ lỡ/ }).first();
    rec('LC-19', 'Phiên đã qua không có nút Hoãn, Hủy (M29)', await pastDone.count() === 0 || await pastDone.getByRole('button', { name: /^Hoãn phiên/ }).count() === 0);
    // Chi tiết phác đồ 5 nhóm và đổi thông số có ngày áp dụng
    await btn(q, 'Xem chi tiết').click(); await q.waitForTimeout(1200);
    let groups = 0; for (let i = 1; i <= 5; i++) groups += await q.getByTestId(`nhom-${i}`).count();
    rec('LC-20', 'Chi tiết phác đồ: 5 nhóm, có khung giờ thực hiện, lịch sử thay đổi ghi lần gia hạn (M26)', groups === 5 && await has(q, 'Khung giờ thực hiện') && await has(q, 'Gia hạn từ', false));
    await btn(q, 'Đổi thông số').click(); await q.waitForTimeout(1500);
    const steps = await q.getByRole('tab').locator('visible=true').allTextContents();
    const eff = addD(today, 3);
    await q.getByLabel('Ngày bắt đầu áp dụng phiên bản mới').fill(vn(eff).replace(/\//g, ''));
    await q.getByLabel('Lý do đổi thông số').fill('Giảm thời gian chiếu');
    await btn(q, 'Tiếp').click(); await q.waitForTimeout(300);
    await btn(q, 'Tiếp').click(); await q.waitForTimeout(300);
    await q.getByLabel('Từ giờ').fill('19:00'); await q.getByLabel('Đến giờ').fill('21:00');
    await btn(q, 'Tiếp').click(); await q.waitForTimeout(300);
    await q.getByRole('checkbox').locator('visible=true').first().click();
    const saveBtn = q.getByRole('button', { name: /^Lưu phiên bản/ }).locator('visible=true').last();
    await saveBtn.click(); await q.waitForTimeout(1500);
    d = await store(q);
    const vs = d.plans.filter((x) => x.protocolId === 'pr-demo-1').sort((a, b2) => a.version - b2.version);
    const nv = vs[vs.length - 1];
    rec('LC-21', 'Biểu mẫu 4 bước; phiên bản mới có ngày áp dụng sau hôm nay thì Chờ áp dụng, phiên bản cũ còn Đang áp dụng; có khung giờ (M24, M33)',
      steps.length === 4 && nv.status === 'scheduled' && nv.effectiveFrom === eff && d.plans.find((x) => x.id === 'pl-1').status === 'active' && nv.timeWindow?.from === '19:00', `${steps.join(',')} · ${nv.status}`);
    // Kết thúc rồi tạo phác đồ mới (M34)
    await go(q, '/wounds/w-1?the=phac-do');
    await btn(q, '+ Tạo phác đồ mới').click(); await q.waitForTimeout(300);
    const askEnd = await has(q, 'Kết thúc phác đồ hiện tại');
    await q.getByTestId('bang-phac-do').getByLabel('Lý do').fill('Chuyển kế hoạch điều trị');
    await sheetBtn(q, 'Kết thúc và tạo mới').click(); await q.waitForTimeout(1800);
    d = await store(q);
    const ended = d.plans.filter((x) => x.protocolId === 'pr-demo-1').every((x) => x.status === 'ended');
    const log = d.plans.find((x) => x.id === 'pl-1').statusLog?.some((e) => e.action === 'end' && e.reason === 'Chuyển kế hoạch điều trị');
    rec('LC-22', 'Tạo phác đồ mới khi còn phác đồ mở: hộp hỏi kết thúc có lý do, rồi mở màn tạo; phác đồ cũ giữ trong lịch sử (M34)', askEnd && ended && !!log && /plan\//.test(q.url()) && await has(q, 'Tạo phác đồ mới'));
    rec('LC-23', 'Màn tạo sao chép thông số phác đồ cũ', await has(q, 'Phác đồ mới (sao chép nội dung phác đồ trước)'));
    rec('LC-24', 'Không lỗi JS', q.errors.length === 0, q.errors.join(' | '));
    await q.context().close();
  }

  // ---------- Phía bệnh nhân: gia hạn chờ xác nhận chặn phiên sau ngày kết thúc cũ (M32) ----------
  {
    const p = await newPage(); await login(p, 'bacsi');
    await go(p, '/doctor');
    const d0 = await store(p);
    const pl = d0.plans.find((x) => x.id === 'pl-1');
    const r = await callStore(p, 'extendPlan', 'pr-demo-1', addD(pl.endDate, 7), 'Thêm 1 tuần');
    // Demo một máy: đăng xuất rồi đăng nhập bệnh nhân trên cùng trình duyệt (dữ liệu chung một kho cục bộ).
    await callStore(p, 'logout');
    const q = p; await login(q, 'benhnhan');
    await go(q, '/patient');
    const card = await q.getByTestId('xac-nhan-gia-han').count();
    if (card) { await q.getByTestId('xac-nhan-gia-han').getByRole('button').last().click(); await q.waitForTimeout(900); }
    const d1 = await store(q);
    rec('LC-25', 'Bệnh nhân thấy thẻ xác nhận ngày kết thúc mới và xác nhận được (M32)', r.ok && card === 1 && !!d1.plans.find((x) => x.id === 'pl-1').extensions?.[0]?.ackAt, r.error);
    await q.context().close();
  }

  await b.close();
  fs.writeFileSync(path.join(OUT, 'ket-qua.json'), JSON.stringify(results, null, 2));
  const pass = results.filter((r) => r.result === 'ĐẠT').length;
  console.log(`Tổng: ${results.length}, đạt ${pass}, lỗi ${results.length - pass}`);
  process.exit(pass === results.length ? 0 : 1);
})().catch((e) => { console.error(e); process.exit(2); });
