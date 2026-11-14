import Ionicons from '@expo/vector-icons/Ionicons';
import type { ReactNode } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/Text';
import { C, radius, size, T } from '@/theme';

/**
 * Bảng trượt từ đáy cho thao tác phụ ngắn (Stage 6, quản trị). Một lớp duy nhất: không mở hộp thoại khác bên trong.
 * Dữ liệu nhập do màn cha giữ, nên đóng bảng (chạm nền, nút Đóng, Back Android) không làm mất phần đang nhập.
 * Hiện chỉ màn quản trị dùng; màn bác sĩ, bệnh nhân không đổi.
 */
export function Sheet({ visible, title, onClose, children, testID }: { visible: boolean; title: string; onClose: () => void; children: ReactNode; testID?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Đóng bảng" onPress={onClose} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.45)' }} />
        <View testID={testID} accessibilityViewIsModal style={{ backgroundColor: C.card, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, width: '100%', maxWidth: size.maxContent + 40, alignSelf: 'center', maxHeight: '85%' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 20, paddingRight: 8, paddingTop: 8 }}>
            <Text accessibilityRole="header" style={{ flex: 1, fontSize: T.cardTitle, fontWeight: '700', color: C.text }}>{title}</Text>
            <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng" style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close" size={24} color={C.textSoft} />
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: insets.bottom + 20, gap: 14 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
