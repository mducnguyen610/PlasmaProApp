// Dữ liệu mẫu tính lùi từ hôm nay; đợt của BN001 (giai đoạn 2) có lịch thứ 2, 4, 6 (WEEK_DAYS[3] trong src/lib/course.ts).
// Ngày nghỉ theo lịch thì N02 không hiện nút "Nạp liệu trình vào máy", nên kịch bản đi qua N02 sẽ dừng sớm vào thứ 3, 5, 7, CN.
// Hàm này tiến đồng hồ trình duyệt của context tới ngày có lịch gần nhất (0 đến 2 ngày), đồng hồ vẫn chạy bình thường.
// Chỉ đổi Date trong trình duyệt kiểm thử, không đổi mã ứng dụng hay dữ liệu.
// Ứng dụng tính "hôm nay" theo giờ Việt Nam UTC+7 (localDay, src/lib/course.ts), không theo múi giờ máy chạy kịch bản.
const soNgayToiNgayCoLich = (now = new Date()) => [1, 0, 1, 0, 1, 0, 2][new Date(now.getTime() + 7 * 3600000).getUTCDay()];
async function ganNgayCoLich(ctx) {
  const days = soNgayToiNgayCoLich();
  if (days) await ctx.addInitScript((ms) => { const R = Date; class D extends R { constructor(...a) { if (a.length === 0) super(R.now() + ms); else super(...a); } static now() { return R.now() + ms; } } globalThis.Date = D; }, days * 86400000);
  return days;
}
module.exports = { ganNgayCoLich, soNgayToiNgayCoLich };
