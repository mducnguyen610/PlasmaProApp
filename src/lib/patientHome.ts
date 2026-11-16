/**
 * Stage 9C (gói B, L-07): quy tắc chọn đợt và vết thương hiển thị ở trang chủ bệnh nhân (N02), trước đây viết trong màn.
 * Giữ đúng hành vi cũ: lấy mục ĐẦU TIÊN theo thứ tự vết thương cho mỗi loại. Khi bệnh nhân có nhiều đợt đang áp dụng,
 * trang chủ chỉ nói về đợt đầu tiên; quy tắc này chờ bác sĩ chốt (xem báo cáo 9C), chưa đổi.
 */
export interface HomeCourse<W, P> {
  w: W;
  plan: P | null | undefined;
}

export function patientHomeCourses<W extends { status: string }, P extends { status: string }>(courses: HomeCourse<W, P>[]) {
  return {
    /** Đợt đang áp dụng đầu tiên. */
    treating: courses.find((c) => c.plan?.status === 'active'),
    /** Vết thương đầu tiên đang theo dõi sau liền thương. */
    followUp: courses.find((c) => c.w.status === 'follow_up'),
    /** Vết thương đầu tiên chờ xác nhận lần 2. */
    awaiting: courses.find((c) => c.w.status === 'awaiting_closure'),
  };
}
