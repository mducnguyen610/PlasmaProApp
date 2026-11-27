/**
 * Stage 9C (gói B, L-07): quy tắc chọn đợt và vết thương hiển thị ở trang chủ bệnh nhân (N02).
 * 27/11/2026 (FR6, UR1): bỏ quy tắc "lấy đợt active đầu tiên theo thứ tự mảng". Khi có nhiều vết đang điều trị, trang chủ liệt kê
 * tất cả (treatingAll), sắp theo mã vết để thứ tự ổn định; không tự chọn vết nào phải điều trị trước. Chỉ khi có đúng một vết đang
 * điều trị thì treating là vết đó (thẻ tiến độ một đợt như trước).
 */
export interface HomeCourse<W, P> {
  w: W;
  plan: P | null | undefined;
}

const byCode = <W extends { code?: string; id?: string }>(a: { w: W }, b: { w: W }) =>
  (a.w.code ?? '').localeCompare(b.w.code ?? '') || (a.w.id ?? '').localeCompare(b.w.id ?? '');

export function patientHomeCourses<W extends { status: string; code?: string; id?: string }, P extends { status: string }>(courses: HomeCourse<W, P>[]) {
  const sorted = [...courses].sort(byCode);
  const treatingAll = sorted.filter((c) => c.plan?.status === 'active');
  return {
    /** Mọi vết có đợt đang áp dụng, theo mã vết. */
    treatingAll,
    /** Vết đang điều trị khi chỉ có đúng một vết; nhiều vết thì undefined (trang chủ hiện danh sách). */
    treating: treatingAll.length === 1 ? treatingAll[0] : undefined,
    /** Vết thương đang theo dõi sau liền thương (mã vết nhỏ nhất). */
    followUp: sorted.find((c) => c.w.status === 'follow_up'),
    /** Vết thương chờ xác nhận lần 2 (mã vết nhỏ nhất). */
    awaiting: sorted.find((c) => c.w.status === 'awaiting_closure'),
  };
}
