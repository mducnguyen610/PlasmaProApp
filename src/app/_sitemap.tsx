import { Redirect } from 'expo-router';

/**
 * Stage 9A: chặn trang Sitemap mặc định của Expo Router (liệt kê mọi route, kể cả màn quản trị) bằng cách chuyển về màn đầu.
 * Màn đầu tự chuyển tới trang chủ đúng vai trò, nên không lộ thêm route và không đổi quyền truy cập.
 */
export default function Sitemap() {
  return <Redirect href="/" />;
}
