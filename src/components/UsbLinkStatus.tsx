import { View } from 'react-native';

import { Text } from '@/components/Text';
import { Chip, IconBadge, type IconName } from '@/components/ui';
import { LINK_LABEL } from '@/lib/device/labels';
import type { LinkState } from '@/lib/device/transport';
import { C, semantic, typeScale } from '@/theme';
import { USB_LINK } from '@/theme.status';

/**
 * Dòng trạng thái kênh 1 (cáp USB/UART) dùng chung cho T01, T02, Q05 (A01, audit lần 2).
 * Màu và biểu tượng lấy từ USB_LINK; chữ giữ LINK_LABEL. Màu không đứng một mình: luôn có biểu tượng và chữ.
 * Chip "Thiết bị giả lập" để neutral để không nổi hơn trạng thái cáp.
 */
export function UsbLinkStatus({ state, simulated }: { state: LinkState; simulated?: boolean }) {
  const st = USB_LINK[state];
  return (
    <View accessible accessibilityRole="text" accessibilityLabel={`Cáp USB: ${LINK_LABEL[state]}${simulated ? ', thiết bị giả lập' : ''}`}
      style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <IconBadge icon={st.icon as IconName} tone={semantic[st.role].tone} size={36} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: typeScale.cardTitle.size, lineHeight: typeScale.cardTitle.line, fontWeight: '700', color: semantic[st.role].fg }}>{LINK_LABEL[state]}</Text>
        {/* Chip giả lập nằm dưới nhãn để nhãn trạng thái không bị xuống dòng ở máy 360 px. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <Text style={{ fontSize: typeScale.caption.size, color: C.textSoft }}>Cáp USB</Text>
          {simulated && <Chip label="Thiết bị giả lập" tone="gray" icon="flask-outline" />}
        </View>
      </View>
    </View>
  );
}
