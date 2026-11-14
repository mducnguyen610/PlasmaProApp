import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';

import { NoAccess, useCanView } from '@/components/Guard';
import { photoDay } from '@/components/history';
import { Button, Chip, Header } from '@/components/ui';
import { neighbourImages } from '@/lib/measurementSource';
import { formatAreaDisplay } from '@/lib/naming';
import { DEMO_ASSETS } from '@/lib/seed';
import { useLookups, useStore } from '@/lib/store';
import { C, T } from '@/theme';

// Giai đoạn 4 giao diện theo tác vụ: xem một ảnh của vết thương ở màn riêng (không dùng modal), ảnh gốc hiển thị đủ khung (contain),
// không cắt, không xử lý lại. Phóng to và kéo bằng hai ngón như ở B11 (ScrollView maximumZoomScale, iOS); trên Android và web
// ScrollView không hỗ trợ chụm, giống B11 hiện nay. "Ảnh trước"/"Ảnh sau" đi trong cùng vết (neighbourImages) bằng setParams
// nên Back luôn về màn đã mở trình xem (Lịch sử, chi tiết bản ghi hoặc So sánh), không đi lùi qua từng ảnh.
export default function PhotoViewer() {
  const { woundId, imageId } = useLocalSearchParams<{ woundId: string; imageId: string }>();
  const { me } = useStore();
  const { wound, patient, imagesOf } = useLookups();
  const insets = useSafeAreaInsets();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  const images = w ? imagesOf(w.id) : [];
  // Chỉ nhận ảnh thuộc đúng vết trong đường dẫn.
  const im = images.find((i) => i.id === imageId);
  if (!w || !p || (canView && !im)) return <NoAccess notFound />;
  if (!canView || !im) return <NoAccess />;

  const { prev, next } = neighbourImages(images, im);
  const source = im.uri ? { uri: im.uri } : DEMO_ASSETS[im.demoAsset ?? 1];
  const isDoctor = me?.role === 'doctor';

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <Header back title={`Ảnh ${im.id}`} subtitle={`${w.code} · ${photoDay(im)}`} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Chip label={im.areaCm2 === null ? 'Chưa đo' : `Bác sĩ đo ${formatAreaDisplay(im.areaCm2)}`} tone={im.areaCm2 === null ? 'amber' : 'green'} />
        {im.status === 'excluded' && <Chip label="Đã loại khỏi bộ dữ liệu" tone="gray" />}
      </View>
      <View style={{ flex: 1, backgroundColor: '#000' }} testID="trinh-xem-anh">
        <ScrollView maximumZoomScale={5} minimumZoomScale={1} centerContent contentContainerStyle={{ flexGrow: 1 }}>
          <Image source={source} style={{ flex: 1, width: '100%', minHeight: 240 }} contentFit="contain" accessibilityLabel={`Ảnh ${im.id}, ${photoDay(im)}`} />
        </ScrollView>
        <Text style={{ position: 'absolute', bottom: 8, alignSelf: 'center', color: C.onDarkSoft, fontSize: T.caption }}>Chụm hai ngón để phóng to</Text>
      </View>
      <View style={{ gap: 8, paddingHorizontal: 16, paddingTop: 10, paddingBottom: insets.bottom + 12, borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.card }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Button label="Ảnh trước" icon="chevron-back" variant="secondary" disabled={!prev} onPress={() => prev && router.setParams({ imageId: prev.id })} />
          </View>
          <View style={{ flex: 1 }}>
            <Button label="Ảnh sau" icon="chevron-forward" variant="secondary" disabled={!next} onPress={() => next && router.setParams({ imageId: next.id })} />
          </View>
        </View>
        {isDoctor && <Button label="Chi tiết ảnh và số đo" variant="ghost" onPress={() => router.push({ pathname: '/images/[id]', params: { id: im.id } })} />}
      </View>
    </View>
  );
}
