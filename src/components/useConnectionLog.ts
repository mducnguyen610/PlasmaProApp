import { useEffect, useRef } from 'react';

import { useStore } from '@/lib/store';

// Trạng thái đã ghi gần nhất, dùng chung mọi màn: đường truyền là một kết nối chung (useDeviceLink), nên khi hai màn cùng mở
// (Nạp liệu trình nằm dưới Theo dõi phiên) mỗi lần kết nối, ngắt kết nối chỉ được ghi một lần.
let logged: 'connected' | 'other' = 'other';

/**
 * Giai đoạn B (CN4 D4, AU-27): ghi nhật ký kết nối, ngắt kết nối máy từ trạng thái đường truyền màn đang thấy.
 * Chỉ đọc trạng thái, không gửi lệnh, không đổi lớp USB/UART. Store chỉ nhận từ bệnh nhân có máy; lỗi ghi không làm phiền bệnh nhân.
 */
export function useConnectionLog(state: string, transport: string) {
  const { recordDeviceConnection } = useStore();
  const rec = useRef(recordDeviceConnection);
  const kind = useRef(transport);
  useEffect(() => {
    rec.current = recordDeviceConnection;
    kind.current = transport;
  });
  useEffect(() => {
    const now = state === 'connected' ? 'connected' : 'other';
    if (now === logged) return;
    // Lần đầu thấy "chưa kết nối" khi chưa từng ghi kết nối thì không có gì để ghi.
    logged = now;
    rec.current(now === 'connected' ? 'connect' : 'disconnect', kind.current).catch(() => {});
  }, [state]);
}
