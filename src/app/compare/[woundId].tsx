import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/Text';

import { ClinicalContext } from '@/components/ClinicalContext';
import { NoAccess, useCanView } from '@/components/Guard';
import { HistoryPhotoTile } from '@/components/history';
import { Button, Card, Chip, Empty, Header, Muted, Notice, Screen, StatusChip, WoundPhoto } from '@/components/ui';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { daysBetween, measurementSource } from '@/lib/measurementSource';
import { formatAreaDisplay } from '@/lib/naming';
import { useLookups } from '@/lib/store';
import { groupImagesByDay, resolvePair } from '@/lib/woundHistory';
import { C, T } from '@/theme';
import { SOURCE } from '@/theme.status';

// B08 So sánh ảnh trước và sau của cùng một vết thương (đặc tả mục 8). Giai đoạn 4 giao diện theo tác vụ: tác vụ toàn màn.
// - Cặp ảnh nằm trong đường dẫn (truoc, sau); "sau" giữ tương thích lối vào từ B11 (P1-06b). Đổi ảnh dùng setParams nên
//   quay lại từ trình xem ảnh hoặc B11 vẫn giữ cặp, và Back hệ thống rời B08 về màn trước (không đi lùi qua từng lần đổi).
// - Chọn ảnh: nội dung màn đổi thành danh sách ảnh của vết, nhóm theo ngày (không modal, không lớp chồng).
// - Chỉ nhận ảnh của đúng woundId; id lạ hoặc của vết khác bị bỏ và báo rõ.
// - Không căn chỉnh, không biến đổi ảnh, không suy luận tiến triển từ ảnh. Chênh lệch chỉ là phép trừ hai số bác sĩ đã nhập (như trước).
export default function Compare() {
  const { woundId, truoc, sau, chon } = useLocalSearchParams<{ woundId: string; truoc?: string; sau?: string; chon?: string }>();
  const { wound, patient, imagesOf, account } = useLookups();
  const { width } = useWindowDimensions();
  const w = wound(woundId);
  const p = patient(w?.patientId);
  const canView = useCanView(p);
  if (!w || !p) return <NoAccess notFound />;
  if (!canView) return <NoAccess />;

  const images = imagesOf(w.id);
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  if (images.length < 2) {
    return (
      <Screen header={<Header back title="So sánh trước / sau" subtitle={`Vết thương ${w.code}`} />}>
        <ClinicalContext patient={p} wound={w} />
        <Empty icon="images-outline" text={images.length === 0 ? `${w.code} chưa có ảnh nào để so sánh.` : `${w.code} mới có 1 ảnh. Cần ít nhất 2 ảnh để so sánh.`} />
        <Button label="Quay lại" variant="secondary" onPress={back} />
      </Screen>
    );
  }

  const { A, B, issues } = resolvePair(images, w.id, truoc, sau);
  if (!A || !B) return <NoAccess notFound />;
  const picking: 0 | 1 | null = chon === 'truoc' ? 0 : chon === 'sau' ? 1 : null;
  const pick = (side: 0 | 1, id: string) => router.setParams(side === 0 ? { truoc: id, sau: B.id, chon: undefined } : { truoc: A.id, sau: id, chon: undefined });
  const dayText = (i: typeof A) => (i.capture?.sourceDateKnown === false ? 'Chưa rõ ngày' : fmtDate(i.captureDate));
  const changeLabel = (side: 0 | 1, im: typeof A) => `Đổi ảnh ${side === 0 ? 'trước' : 'sau'}, đang chọn ${im.id}, ${dayText(im)}`;

  if (picking !== null) {
    const current = picking === 0 ? A : B;
    const other = picking === 0 ? B : A;
    const content = Math.min(width, 720) - 40;
    const cols = content >= 600 ? 4 : content >= 420 ? 3 : 2;
    const tileW = Math.floor((content - 12 * (cols - 1)) / cols);
    return (
      <Screen
        header={<Header back title={picking === 0 ? 'Chọn ảnh trước' : 'Chọn ảnh sau'} subtitle={`Vết thương ${w.code}, mới trước`} />}
        footer={<Button label="Hủy chọn" variant="secondary" onPress={() => router.setParams({ chon: undefined })} />}>
        <Muted>{`Đang so ${A.id} (${dayText(A)}) với ${B.id} (${dayText(B)}). Chạm một ảnh để chọn làm ảnh ${picking === 0 ? '"Trước"' : '"Sau"'}. Chỉ hiện ảnh của ${w.code}.`}</Muted>
        {/* P1-07e: mới trước, như album. Nhóm theo ngày chụp; ảnh ngày chưa rõ ở cuối. */}
        {groupImagesByDay(images, w.id).map((g) => (
          <View key={g.key} style={{ gap: 8 }}>
            <Text style={{ color: C.textSoft, fontWeight: '700', fontSize: T.small }}>{g.date ? `Chụp ${fmtDate(g.date)}` : 'Ngày chụp chưa rõ'} · {g.images.length} ảnh</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              {g.images.map((im) => (
                <HistoryPhotoTile key={im.id} image={im} width={tileW} selecting role="radio"
                  pick={im.id === current.id ? (picking === 0 ? 'Trước' : 'Sau') : null}
                  disabledNote={im.id === other.id ? `đang là ảnh ${picking === 0 ? '"Sau"' : '"Trước"'}` : undefined}
                  onPress={() => pick(picking, im.id)} />
              ))}
            </View>
          </View>
        ))}
      </Screen>
    );
  }

  const same = A.id === B.id;
  const diff = !same && A.areaCm2 !== null && B.areaCm2 !== null ? B.areaCm2 - A.areaCm2 : null;
  // P0 DS-05: chỉ nêu điều đọc được từ dữ liệu, không đổi cách tính chênh lệch.
  const methodOf = (i: typeof A) => i.measureMethod?.trim() || null;
  const methodsDiffer = diff !== null && methodOf(A) !== methodOf(B);
  const dateKnown = (i: typeof A) => i.capture?.sourceDateKnown !== false;
  const reversed = !same && dateKnown(A) && dateKnown(B) && A.captureDate > B.captureDate;
  const gapDays = !same && dateKnown(A) && dateKnown(B) ? daysBetween(A.captureDate, B.captureDate) : null;
  // P1-04a: người nhập số đo, cùng hàm với B11.
  const sourceText = (i: typeof A) => {
    const src = measurementSource(i);
    return src ? `Nhập bởi ${account(src.by)?.name ?? 'tài khoản không còn trong danh sách'}${src.at ? ` lúc ${fmtDateTime(src.at)}` : ''}` : 'Chưa có thông tin người nhập';
  };
  const invalid = issues.includes('truoc-khong-hop-le') || issues.includes('sau-khong-hop-le');

  return (
    <Screen
      header={<Header back title="So sánh trước / sau" subtitle={`Vết thương ${w.code}`} />}
      footer={
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[A, B].map((im, i) => (
            <View key={i} style={{ flex: 1 }}>
              <Pressable onPress={() => router.setParams({ truoc: A.id, sau: B.id, chon: i === 0 ? 'truoc' : 'sau' })} accessibilityRole="button" accessibilityLabel={changeLabel(i as 0 | 1, im)}
                style={({ pressed }) => ({ minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: C.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ color: C.primary, fontWeight: '700' }}>{`Đổi ảnh ${i === 0 ? 'trước' : 'sau'}`}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      }>
      {/* P0 G1: bệnh nhân và vết thương của hai ảnh. */}
      <ClinicalContext patient={p} wound={w} />
      {invalid && <Notice icon="alert-circle-outline">{`Ảnh được chỉ định không thuộc ${w.code} hoặc không còn trong dữ liệu nên không hiện. Đang dùng ảnh mặc định của ${w.code}.`}</Notice>}
      {same && <Notice icon="copy-outline">Hai bên đang là cùng một ảnh. Đổi một bên để so sánh.</Notice>}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {[A, B].map((im, i) => (
          <View key={i} style={{ flex: 1, gap: 6 }}>
            <Text style={{ fontWeight: '700', color: C.text }}>{i === 0 ? 'Trước' : 'Sau'}</Text>
            {/* Ngày chụp ngay trên ảnh để luôn thấy cùng ảnh. */}
            <Text style={{ color: C.text, fontWeight: '600' }}>{dateKnown(im) ? fmtDate(im.captureDate) : 'Ngày chụp chưa xác định'}</Text>
            {/* Chạm ảnh mở trình xem riêng (phóng to, ảnh gốc); quay lại vẫn giữ cặp. P1-04b: contain để không cắt mép ảnh gốc. */}
            <Pressable onPress={() => router.push({ pathname: '/wound-history/[woundId]/anh/[imageId]', params: { woundId: w.id, imageId: im.id } })} accessibilityRole="button" accessibilityLabel={`Mở ảnh ${im.id}, ${dayText(im)}`}>
              <WoundPhoto image={im} fit="contain" style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 14 }} />
            </Pressable>
            <Text style={{ fontSize: T.caption, color: C.textSoft }}>{im.id}</Text>
            <Muted>{im.areaCm2 === null ? 'Chưa đo' : formatAreaDisplay(im.areaCm2)}</Muted>
            {im.areaCm2 !== null && <View style={{ flexDirection: 'row' }}><StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} /></View>}
            {im.areaCm2 !== null && <Muted>{`Phương pháp: ${methodOf(im) ?? 'chưa ghi'}`}</Muted>}
            {im.areaCm2 !== null && <Muted>{sourceText(im)}</Muted>}
            {im.status === 'excluded' && <View style={{ flexDirection: 'row' }}><Chip label="Đã loại khỏi bộ dữ liệu" tone="gray" /></View>}
          </View>
        ))}
      </View>
      {reversed && <Notice icon="swap-vertical-outline">{`Ảnh "Trước" (${fmtDate(A.captureDate)}) chụp sau ảnh "Sau" (${fmtDate(B.captureDate)}). Chênh lệch bên dưới đang tính ngược thời gian.`}</Notice>}
      {methodsDiffer && <Notice icon="alert-circle-outline">{`Hai số đo dùng phương pháp khác nhau (${methodOf(A) ?? 'chưa ghi'} và ${methodOf(B) ?? 'chưa ghi'}). Chênh lệch có thể do cách đo.`}</Notice>}
      <Card>
        <Text style={{ fontWeight: '700', color: C.text }}>
          {same ? 'Chọn hai ảnh khác nhau để xem chênh lệch.' : diff === null ? 'Chưa đủ số đo để so sánh diện tích.' : `Chênh lệch: ${diff > 0 ? '+' : ''}${formatAreaDisplay(Math.round(diff * 1000) / 1000)}`}
        </Text>
        {gapDays !== null && <Muted>{`Hai ảnh chụp cách nhau ${gapDays} ngày.`}</Muted>}
        {!same && (!dateKnown(A) || !dateKnown(B)) && <Muted>Một ảnh chưa rõ ngày chụp nên không tính số ngày cách nhau.</Muted>}
        <Muted>Số đo do bác sĩ nhập; nếu phương pháp đo thay đổi giữa hai lần, cần lưu ý khi so sánh. Hệ thống không đánh giá tiến triển từ hình ảnh.</Muted>
      </Card>
    </Screen>
  );
}
