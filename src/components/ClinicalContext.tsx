import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import type { Patient, Wound } from '@/lib/types';
import { PatientAvatar } from '@/components/ui';
import { C, numeric, radius, semantic, space, T } from '@/theme';
import { birthShort } from '@/lib/patientIdentity';

/**
 * P0 G1 (ID-04, ID-07): thanh ngữ cảnh lâm sàng đặt đầu nội dung các màn thao tác lâm sàng.
 * Luôn có hai định danh bệnh nhân (họ tên và mã hồ sơ) cùng năm sinh, giới; dòng vết thương khi màn gắn với một vết.
 * Chỉ dùng trường đã có trong model, không thêm trường định danh mới (AHRQ PSNet 2023: không dựa vào một định danh đơn lẻ).
 * Không cố định khi cuộn, để không che nội dung hay nút Dừng ở T02.
 * - wound === null: màn cần vết thương nhưng chưa chọn, ghi rõ "Chưa chọn vết thương".
 * - wound === undefined: màn không gắn với một vết (không hiện dòng vết thương).
 * - patientChanged: vừa chuyển sang bệnh nhân khác trong cùng chuỗi thao tác (ID-01), hiện dải cảnh báo có chữ và biểu tượng.
 */
export function ClinicalContext({ patient, wound, patientChanged }: { patient: Patient; wound?: Wound | null; patientChanged?: boolean }) {
  const warn = semantic.warning;
  const idLine = `${patient.code} · sinh ${birthShort(patient)} · ${patient.sex}`;
  const woundLine = wound ? `${wound.code} · ${wound.location}` : 'Chưa chọn vết thương';
  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${patientChanged ? 'Đã chuyển sang bệnh nhân khác. ' : ''}Bệnh nhân ${patient.name}, ${idLine}${wound !== undefined ? `. Vết thương ${woundLine}` : ''}`}
      testID="clinical-context"
      style={{ borderWidth: 1, borderColor: patientChanged ? warn.fg : C.border, borderRadius: radius.m, backgroundColor: C.card, overflow: 'hidden' }}>
      {patientChanged && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.m, paddingVertical: space.s, backgroundColor: warn.bg }}>
          <Ionicons name="swap-horizontal" size={18} color={warn.fg} />
          <Text style={{ flex: 1, color: C.text, fontWeight: '700', fontSize: T.small }}>Đã chuyển sang bệnh nhân khác</Text>
        </View>
      )}
      {/* Stage 9A: hàng định danh có ký hiệu chữ cái đầu, họ tên đậm, dòng mã; vết thương là dải riêng phía dưới (nền nhạt). */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.m, paddingHorizontal: space.m, paddingVertical: 10 }}>
        <PatientAvatar name={patient.name} size={36} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>{patient.name}</Text>
          <Text style={[{ color: C.textSoft, fontSize: T.small }, numeric]}>{idLine}</Text>
        </View>
      </View>
      {wound !== undefined && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s, paddingHorizontal: space.m, paddingVertical: 8, backgroundColor: wound ? C.surfaceMuted : warn.bg, borderTopWidth: 1, borderTopColor: C.divider }}>
          <Ionicons name="bandage-outline" size={16} color={wound ? C.textSoft : warn.fg} />
          <Text style={{ flex: 1, color: wound ? C.text : warn.fg, fontWeight: '600', fontSize: T.small }}>{woundLine}</Text>
        </View>
      )}
    </View>
  );
}
