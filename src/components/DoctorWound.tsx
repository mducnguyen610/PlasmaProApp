/**
 * Logic chốt 25/11/2026 (TONG-HOP-LOGIC-BAC-SI.md mục 3.4; M11, M12, M17..M21, M36): trang vết thương của bác sĩ.
 * Tổng quan (tiêu đề, khối thông tin, tóm tắt diện tích không có biểu đồ nhỏ) và ba thẻ Ảnh, Đánh giá, Phác đồ.
 * Ảnh, đánh giá và phác đồ trên trang này chỉ thuộc riêng vết đó. Các thao tác cũ (sửa vị trí, Cần tái khám, xóa vết nhập sai,
 * ghi nhận liền thương) giữ nguyên.
 */
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AreaChart } from '@/components/AreaChart';
import { ClosureActions } from '@/components/ClosureActions';
import { ProtocolTab } from '@/components/ProtocolTab';
import { Text } from '@/components/Text';
import { Button, Card, Chip, InfoRow, Muted, Notice, SectionTitle, Segmented, StatusChip, TextLink, WoundPhoto } from '@/components/ui';
import { localDay } from '@/lib/course';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, PLAN_STATUS, WOUND_STATUS } from '@/lib/format';
import { formatAreaDisplay } from '@/lib/naming';
import { protocolsOfWound } from '@/lib/planLifecycle';
import { useLookups, useStore } from '@/lib/store';
import type { Patient, Wound, WoundImage } from '@/lib/types';
import { CARE_STATUS, woundCareStatus, woundDeleteBlocker } from '@/lib/woundStatus';
import { chartPoints } from '@/lib/woundSummary';
import { C, numeric, radius, T } from '@/theme';
import { WOUND } from '@/theme.status';

export type WoundTab = 'anh' | 'danh-gia' | 'phac-do';
const TABS: { value: WoundTab; label: string }[] = [{ value: 'anh', label: 'Ảnh' }, { value: 'danh-gia', label: 'Đánh giá' }, { value: 'phac-do', label: 'Phác đồ' }];

/** "VT01" thành "Vết thương 01". */
export const woundTitle = (code: string) => `Vết thương ${code.replace(/^VT/i, '')}`;

const byCapture = (a: WoundImage, b: WoundImage) => (a.captureDate || a.uploadDate).localeCompare(b.captureDate || b.uploadDate) || a.id.localeCompare(b.id);

export function DoctorWound({ patient: p, wound: w, initialTab }: { patient: Patient; wound: Wound; initialTab?: string }) {
  const { data, me, setWoundRevisit, deleteWound } = useStore();
  const { imagesOf } = useLookups();
  const [tab, setTab] = useState<WoundTab>(TABS.some((t) => t.value === initialTab) ? (initialTab as WoundTab) : 'anh');
  const archived = !!p.archivedAt;
  const canEdit = p.doctorId === me?.id && !archived;
  const care = CARE_STATUS[woundCareStatus(w, data.plans)];
  const images = [...imagesOf(w.id)].sort(byCapture);
  const points = chartPoints(images);
  const first = points[0];
  const latest = points[points.length - 1];
  const pct = first && latest && first !== latest && first.areaCm2 ? Math.round(((latest.areaCm2! - first.areaCm2) / first.areaCm2) * 100) : null;
  const views = protocolsOfWound(data.plans, p.id, w.id);
  const open = views.find((v) => v.current.status === 'active' || v.current.status === 'paused');
  const planText = open ? PLAN_STATUS[open.current.status].label === 'Đang áp dụng' ? 'Đang hoạt động' : PLAN_STATUS[open.current.status].label : 'Chưa có';
  const deleteWhy = woundDeleteBlocker(w.id, data);
  const retakes = images.filter((i) => i.retakeRequested);
  const today = localDay();

  return (
    <View style={{ gap: 12 }}>
      {archived && <Notice icon="archive-outline" tone="gray">Hồ sơ bệnh nhân đã lưu trữ. Vết thương và lịch sử chỉ xem được.</Notice>}
      <Card testID="tong-quan-vet">
        <View style={{ gap: 2 }}>
          <Text accessibilityRole="header" style={{ fontWeight: '700', fontSize: T.titleM, lineHeight: 26, color: C.text }}>{woundTitle(w.code)}</Text>
          <Text style={{ color: C.textSoft }}>{`${p.name} · ${p.code}`}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Chip label={care.label} tone={care.tone} icon="medkit-outline" />
          {w.status === 'awaiting_closure' && <StatusChip status={WOUND[w.status]} label={WOUND_STATUS[w.status].label} />}
          {retakes.length > 0 && (
            <Pressable accessibilityRole="button" hitSlop={10} onPress={() => notify(`Đã yêu cầu chụp lại ${retakes.length} ảnh`, retakes.map((im) => `${im.id}: ${im.retakeRequested}`).join('\n'))}>
              <Chip icon="camera-reverse-outline" tone="amber" label={`Chụp lại ${retakes.length} ảnh`} />
            </Pressable>
          )}
        </View>
        <View testID="khoi-thong-tin">
          <InfoRow label="Vị trí" value={`${w.location}${w.group ? ` · ${w.group}` : ''}`} />
          <InfoRow label="Ngày ghi nhận" value={fmtDate(w.startDate)} />
          <InfoRow label="Số ảnh" value={String(images.length)} />
          <InfoRow label="Phác đồ" value={planText} />
        </View>
        {canEdit && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
            <TextLink label="Chỉnh sửa vị trí" accessibilityLabel={`Chỉnh sửa vị trí ${w.code}`} onPress={() => router.push({ pathname: '/wound-edit/[id]', params: { id: w.id } })} />
            <TextLink label={w.revisitAt ? 'Bỏ "Cần tái khám"' : 'Đặt "Cần tái khám"'} onPress={() => {
              setWoundRevisit(w.id, !w.revisitAt).catch((e) => notify('Chưa lưu được', e instanceof Error ? e.message : String(e)));
            }} />
            {!deleteWhy && <TextLink label="Xóa vết nhập sai" onPress={() => confirm(`Xóa ${w.code}?`, `Vết ${w.code} (${w.location}) chưa có ảnh, phác đồ hay phiên điều trị. Thao tác được ghi nhật ký và không hoàn tác.`, async () => {
              try { await deleteWound(w.id); router.back(); } catch (e) { notify('Chưa xóa được', e instanceof Error ? e.message : String(e)); }
            }, 'Xóa vết')} />}
          </View>
        )}
        {w.revisitAt && <Muted>{`Bác sĩ đặt "Cần tái khám" lúc ${fmtDateTime(w.revisitAt)}.`}</Muted>}
        {canEdit && <ClosureActions woundId={w.id} status={w.status} check1={w.closureCheck1} followUpFrom={w.followUpFrom} today={today} hasPlan={!!open} onNewCourse={() => setTab('phac-do')} />}
      </Card>

      {/* M36: tóm tắt diện tích không có biểu đồ nhỏ; chạm vào thì mở thẻ Đánh giá. */}
      <Card testID="tom-tat-dien-tich" onPress={() => setTab('danh-gia')} accessibilityLabel={latest ? `Diện tích mới nhất ${formatAreaDisplay(latest.areaCm2)}, đo ngày ${fmtDate(latest.captureDate)}${pct !== null ? `, ${pct <= 0 ? 'giảm' : 'tăng'} ${Math.abs(pct)}% so với lần đo đầu ${formatAreaDisplay(first!.areaCm2)}` : ''}. Mở thẻ Đánh giá` : 'Chưa có số đo. Mở thẻ Đánh giá'}>
        <Text style={{ color: C.textSoft, fontWeight: '600', fontSize: T.caption }}>Diện tích</Text>
        {latest ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[{ fontSize: T.clinical, lineHeight: 40, fontWeight: '700', color: C.navy }, numeric]}>{formatAreaDisplay(latest.areaCm2)}</Text>
              <Muted>{`đo ngày ${fmtDate(latest.captureDate)}`}</Muted>
            </View>
            {pct !== null
              ? <Text style={[{ color: pct <= 0 ? C.green : C.amber, fontWeight: '600' }, numeric]}>{`${pct <= 0 ? 'Giảm' : 'Tăng'} ${Math.abs(pct)}% so với lần đo đầu (${formatAreaDisplay(first!.areaCm2)}, ${fmtDate(first!.captureDate)})`}</Text>
              : <Muted>Mới có một lần đo.</Muted>}
          </>
        ) : <Muted>Chưa có số đo. Chụp ảnh rồi nhập diện tích.</Muted>}
      </Card>

      <Segmented<WoundTab> value={tab} onChange={setTab} options={TABS} />
      {tab === 'anh' && <PhotoTab wound={w} images={images} canEdit={canEdit} />}
      {tab === 'danh-gia' && <EvalTab wound={w} images={images} />}
      {tab === 'phac-do' && <ProtocolTab patient={p} wound={w} canEdit={canEdit} />}
    </View>
  );
}

function PhotoCell({ label, image }: { label: string; image: WoundImage }) {
  return (
    <Pressable style={{ flex: 1, gap: 6 }} accessibilityRole="button" accessibilityLabel={`${label}, chụp ngày ${fmtDate(image.captureDate)}`}
      onPress={() => router.push({ pathname: '/images/[id]', params: { id: image.id } })}>
      <Text style={{ color: C.text, fontWeight: '600', fontSize: T.small }}>{label}</Text>
      <WoundPhoto image={image} style={{ width: '100%', aspectRatio: 1, borderRadius: radius.s + 2 }} />
      <Text style={[{ color: C.textSoft, fontSize: T.caption }, numeric]}>{fmtDate(image.captureDate)}</Text>
    </Pressable>
  );
}

/** M20, M18, M17 (giả định 2): ảnh ban đầu bên trái, ảnh mới nhất bên phải; một ảnh thì một ô. */
function PhotoTab({ wound: w, images, canEdit }: { wound: Wound; images: WoundImage[]; canEdit: boolean }) {
  const first = images[0];
  const last = images[images.length - 1];
  return (
    <Card testID="the-anh">
      <SectionTitle right={images.length ? <TextLink label="Xem tất cả" onPress={() => router.push({ pathname: '/wound-history/[woundId]', params: { woundId: w.id, tab: 'anh' } })} /> : undefined}>Hình ảnh vết thương</SectionTitle>
      {!first ? (
        <View testID="chua-co-anh" style={{ aspectRatio: 2, borderRadius: radius.s + 2, backgroundColor: C.photoPlaceholder, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: C.textSoft }}>Chưa có ảnh</Text>
        </View>
      ) : (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <PhotoCell label="Ảnh ban đầu" image={first} />
          {last !== first ? <PhotoCell label="Ảnh mới nhất" image={last} /> : <View style={{ flex: 1 }} />}
        </View>
      )}
      {canEdit && <Button label="Chụp ảnh mới" icon="camera-outline" onPress={() => router.push({ pathname: '/guided-capture', params: { woundId: w.id } })} />}
    </Card>
  );
}

/** M19, M21: đánh giá gần nhất (chỉ ngày), biểu đồ diện tích, kết quả đo (chỉ Diện tích), nhận định, lịch sử đánh giá. */
function EvalTab({ wound: w, images }: { wound: Wound; images: WoundImage[] }) {
  const { data } = useStore();
  const { account } = useLookups();
  const evals = data.evaluations.filter((e) => e.woundId === w.id).sort((a, b) => b.date.localeCompare(a.date) || data.evaluations.indexOf(b) - data.evaluations.indexOf(a));
  const points = chartPoints(images);
  const latest = points[points.length - 1];
  const tag = (i: number) => (i === 0 ? 'Mới nhất' : i === evals.length - 1 ? 'Ban đầu' : 'Trước đó');
  return (
    <View testID="the-danh-gia" style={{ gap: 12 }}>
      <Card>
        <SectionTitle>Đánh giá gần nhất</SectionTitle>
        <Text style={[{ color: C.text, fontWeight: '600' }, numeric]}>{evals[0] ? fmtDate(evals[0].date) : 'Chưa có đánh giá'}</Text>
      </Card>
      <Card>
        <SectionTitle caption="Trục dọc cm², trục ngang thời gian. Chỉ dùng số đo bác sĩ đã nhập.">Biểu đồ diện tích</SectionTitle>
        <AreaChart images={images} />
      </Card>
      <Card>
        <SectionTitle>Kết quả đo lường</SectionTitle>
        <InfoRow label="Diện tích" value={latest ? `${formatAreaDisplay(latest.areaCm2)} · ${fmtDate(latest.captureDate)}` : 'Chưa có số đo'} />
      </Card>
      <Card>
        <SectionTitle>Nhận định bác sĩ</SectionTitle>
        <Text style={{ color: evals[0]?.characteristics?.trim() ? C.text : C.textSoft }}>{evals[0]?.characteristics?.trim() || 'Chưa có nhận định'}</Text>
      </Card>
      <Card>
        <SectionTitle>Lịch sử đánh giá</SectionTitle>
        {evals.length === 0 && <Muted>Chưa có đánh giá.</Muted>}
        {evals.map((e, i) => (
          <View key={e.id} style={{ gap: 2, paddingVertical: 8, borderTopWidth: i ? 1 : 0, borderTopColor: C.divider }}>
            <Text style={[{ color: C.text, fontWeight: '600' }, numeric]}>{`${fmtDate(e.date)} · ${tag(i)}`}</Text>
            <Muted>{`${account(e.doctorId)?.name ?? 'Bác sĩ'}${e.areaCm2 != null ? ` · Diện tích ${formatAreaDisplay(e.areaCm2)}` : ''}`}</Muted>
            {e.characteristics ? <Text style={{ color: C.textBody }}>{e.characteristics}</Text> : null}
          </View>
        ))}
      </Card>
    </View>
  );
}
