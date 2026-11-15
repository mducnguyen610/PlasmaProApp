import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { InfoRow, type IconName } from '@/components/ui';
import { DEVICE_STATUS_LABEL, type DeviceStatusKey } from '@/lib/deviceStatusView';
import { LINK_LABEL } from '@/lib/device/labels';
import type { LinkState } from '@/lib/device/transport';
import { C, radius, semantic, T, typeScale, type Semantic } from '@/theme';

/**
 * Stage 7: thanh trạng thái thiết bị cố định dưới tiêu đề T01 và T02 (không cuộn theo nội dung),
 * để người dùng luôn biết máy đang ở trạng thái nào. Chỉ hiển thị, không gọi lệnh nào tới máy.
 * Màu không đứng một mình: luôn có biểu tượng và chữ.
 */
const STYLE: Record<DeviceStatusKey, { role: Semantic; icon: IconName }> = {
  disconnected: { role: 'neutral', icon: 'unlink-outline' },
  connecting: { role: 'info', icon: 'sync-outline' },
  connected: { role: 'info', icon: 'link-outline' },
  ready: { role: 'success', icon: 'checkmark-circle-outline' },
  busy: { role: 'info', icon: 'radio-button-on-outline' },
  error: { role: 'danger', icon: 'alert-circle-outline' },
  unknown: { role: 'warning', icon: 'help-circle-outline' },
};

// Giờ Việt Nam (UTC+7) như fmtDateTime, để thanh trạng thái khớp dòng "Nhận lần cuối" ở T02.
const time = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 420 * 60000).toISOString().slice(11, 19) : null);

export function DeviceStatusBar({ status, deviceCode, linkState, simulated, sessionText, updatedAt }: {
  status: DeviceStatusKey;
  /** Mã máy đã giao trên hồ sơ; null khi chưa giao. */
  deviceCode: string | null;
  linkState: LinkState;
  simulated?: boolean;
  /** Trạng thái phiên đã trình bày theo dữ liệu nhận được (ví dụ "Đang điều trị", "Chưa nhận trạng thái"). */
  sessionText: string;
  /** Lần cập nhật gần nhất (bản tin STA hoặc đổi trạng thái cáp), ISO. */
  updatedAt: string | null;
}) {
  const st = STYLE[status];
  const label = DEVICE_STATUS_LABEL[status];
  const at = time(updatedAt);
  const line = `${deviceCode ?? 'Chưa giao máy'} · Cáp USB: ${LINK_LABEL[linkState]} · Phiên: ${sessionText} · ${at ? `Cập nhật ${at}` : 'Chưa có cập nhật'}`;
  return (
    <View testID="device-status-bar" accessible accessibilityRole="summary" accessibilityLiveRegion="polite"
      accessibilityLabel={`Trạng thái thiết bị: ${label}. Máy ${deviceCode ?? 'chưa giao'}. Cáp USB: ${LINK_LABEL[linkState]}. Phiên: ${sessionText}.${at ? ` Cập nhật lúc ${at}.` : ''}${simulated ? ' Thiết bị giả lập.' : ''}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8, paddingVertical: 8, paddingRight: 10, paddingLeft: 10, borderRadius: radius.m, backgroundColor: semantic[st.role].bg, borderLeftWidth: 4, borderLeftColor: semantic[st.role].bar }}>
      <Ionicons name={st.icon} size={22} color={semantic[st.role].fg} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: typeScale.body.size, lineHeight: 22, fontWeight: '700', color: semantic[st.role].fg }}>
          {label}
          {simulated ? <Text style={{ fontSize: typeScale.caption.size, fontWeight: '400', color: C.textSoft }}>{'  · Thiết bị giả lập'}</Text> : null}
        </Text>
        <Text style={{ fontSize: typeScale.caption.size, color: C.textSoft }}>{line}</Text>
      </View>
    </View>
  );
}

/** Bảng tổng quan thiết bị trong thân màn T01 (bước kết nối): đủ sáu mục theo đặc tả Stage 7, chỉ dữ liệu đang có. */
export function DeviceOverviewRows({ deviceCode, linkState, readyText, sessionText, errorText, updatedAt }: {
  deviceCode: string | null;
  linkState: LinkState;
  readyText: string;
  sessionText: string;
  errorText: string | null;
  updatedAt: string | null;
}) {
  return (
    <View testID="device-overview" style={{ gap: 2 }}>
      <InfoRow label="Thiết bị" value={deviceCode ?? 'Chưa giao máy'} />
      <InfoRow label="Kết nối cáp USB" value={LINK_LABEL[linkState]} />
      <InfoRow label="Sẵn sàng nạp" value={readyText} />
      <InfoRow label="Phiên trên máy" value={sessionText} />
      {errorText && <InfoRow label="Lỗi" value={errorText} />}
      <InfoRow label="Cập nhật gần nhất" value={time(updatedAt) ?? 'Chưa có'} />
    </View>
  );
}

/**
 * Sơ đồ đường nối điện thoại và máy (Stage 9A, T01): hai ô biểu tượng nối bằng một vạch theo trạng thái cáp.
 * Đã kết nối: vạch liền màu thành công; đang kết nối: vạch màu thông tin; còn lại: vạch đứt xám. Luôn kèm chữ (không chỉ màu).
 * Chỉ hiển thị, không gọi lệnh nào tới máy.
 */
export function LinkDiagram({ linkState, deviceCode }: { linkState: LinkState; deviceCode: string | null }) {
  const on = linkState === 'connected';
  const busy = linkState === 'connecting';
  const role: Semantic = on ? 'success' : busy ? 'info' : 'neutral';
  const tile = (icon: IconName, label: string) => (
    <View style={{ alignItems: 'center', gap: 4, width: 84 }}>
      <View style={{ width: 52, height: 52, borderRadius: radius.m + 2, backgroundColor: on ? C.navy : C.surfaceMuted, borderWidth: 1, borderColor: on ? C.navy : C.border, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={24} color={on ? C.onPrimary : C.textSoft} />
      </View>
      <Text numberOfLines={1} style={{ fontSize: T.caption, color: C.textBody, fontWeight: '600' }}>{label}</Text>
    </View>
  );
  return (
    <View testID="so-do-ket-noi" accessible accessibilityLabel={`Điện thoại và máy ${deviceCode ?? 'chưa giao'}: ${LINK_LABEL[linkState]}`}
      style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingVertical: 4 }}>
      {tile('phone-portrait-outline', 'Điện thoại')}
      <View style={{ flex: 1, maxWidth: 140, alignItems: 'center', paddingTop: 16, gap: 6 }}>
        <View style={{ alignSelf: 'stretch', height: 0, borderTopWidth: 3, borderStyle: on || busy ? 'solid' : 'dashed', borderColor: semantic[role].bar }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name={on ? 'checkmark-circle' : busy ? 'sync-outline' : 'unlink-outline'} size={14} color={semantic[role].fg} />
          <Text style={{ fontSize: T.caption, fontWeight: '700', color: semantic[role].fg }}>{LINK_LABEL[linkState]}</Text>
        </View>
      </View>
      {tile('hardware-chip-outline', deviceCode ?? 'Chưa giao máy')}
    </View>
  );
}
