import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AreaLineChart, type ChartMarker, type MarkShape } from '@/components/AreaLineChart';
import { ImageTile } from '@/components/items';
import { Text } from '@/components/Text';
import { Button, Disclosure, Muted, Segmented, SimBadge, StatusChip, TextLink } from '@/components/ui';
import {
  dayDiff, excludedText, inRange, methodLabel, progressInput, progressSummary, rangeOptions, RANGE_LABEL, rangeStart, splitByMethod, summaryText,
  type AreaPoint, type RangeKey,
} from '@/lib/areaProgress';
import { fmtDate, fmtDateTime, TREND } from '@/lib/format';
import { measurementSource } from '@/lib/measurementSource';
import { formatAreaDisplay } from '@/lib/naming';
import type { Evaluation, WoundImage } from '@/lib/types';
import { C, T } from '@/theme';
import { SOURCE, TREND_ROLE } from '@/theme.status';

// Khoảng và nút "Hiện cả phương pháp khác" giữ theo vết trong phiên dùng (đặc tả mục 5, 7.6), không lưu bền.
const session = new Map<string, { range: RangeKey; others: boolean }>();
const SHAPES: MarkShape[] = ['square', 'triangle'];
const CAVEAT = 'Số đo cho biết kích thước vết thương. Việc vết thương hồi phục ra sao do bác sĩ đánh giá.';

/**
 * P2-02c, P2-02d: thẻ "Tiến triển diện tích" dùng chung cho N05 (bệnh nhân) và B05 (bác sĩ, QĐ-P2-5).
 * Điểm lấy từ số đo đã lưu trên ảnh (areaProgress.ts). Chỉ đọc; sửa số vẫn ở B11.
 * QĐ-P2-1 = C: chỉ vẽ phương pháp của lần đo gần nhất; nhóm khác ẩn sau nút; phần trăm luôn trong nhóm chính.
 * QĐ-P2-2 = A: nói thay đổi bằng chữ và mũi tên, một màu cho tăng và giảm; không câu khích lệ; chữ đánh giá chỉ từ bác sĩ.
 */
export function AreaProgress({ code, woundId, images, evaluations, today, isDoctor, markers = [], accountName }: {
  code: string; woundId: string; images: WoundImage[]; evaluations: Evaluation[]; today: string; isDoctor: boolean;
  markers?: ChartMarker[]; accountName: (id: string) => string | undefined;
}) {
  const saved = session.get(woundId) ?? { range: 'all' as RangeKey, others: false };
  const [range, setRangeState] = useState<RangeKey>(saved.range);
  const [others, setOthersState] = useState(saved.others);
  const [selected, setSelected] = useState<string | null>(null);
  const keep = (r: RangeKey, o: boolean) => session.set(woundId, { range: r, others: o });

  const input = progressInput(images, woundId, today, evaluations, measurementSource);
  const options = rangeOptions(input.points, today);
  const r = options.includes(range) ? range : 'all';
  const shown = inRange(input.points, r, today);
  const split = splitByMethod(shown);
  const summary = progressSummary(shown);
  const text = summaryText(summary);
  const hasOthers = split.others.length > 0;
  const drawn = others ? shown : split.main;
  const sel = drawn.find((p) => p.imageId === selected) ?? null;
  const mine = images.filter((i) => i.woundId === woundId);
  const demo = shown.some((p) => p.source === 'demo');
  const ev = !isDoctor ? evaluations.filter((e) => e.woundId === woundId && e.visibleToPatient).sort((a, b) => b.date.localeCompare(a.date))[0] : undefined;
  const newestUnmeasured = mine.filter((i) => i.status === 'unlabeled').sort((a, b) => b.captureDate.localeCompare(a.captureDate) || b.id.localeCompare(a.id))[0];

  const setRange = (v: RangeKey) => { setRangeState(v); keep(v, others); if (selected && !inRange(input.points, v, today).some((p) => p.imageId === selected)) setSelected(null); };
  const toggleOthers = () => { const v = !others; setOthersState(v); keep(r, v); if (!v && selected && !split.main.some((p) => p.imageId === selected)) setSelected(null); };

  if (mine.length === 0) return <Muted>{isDoctor ? 'Chưa có ảnh. Chụp ảnh rồi nhập diện tích.' : 'Chưa có ảnh vết thương. Bác sĩ sẽ chụp và đo ở lần khám.'}</Muted>;
  if (input.points.length === 0) {
    return (
      <View style={{ gap: 8 }}>
        <Muted>{`Chưa có lần đo diện tích. Ảnh đã chụp: ${mine.length}.`}</Muted>
        {isDoctor && newestUnmeasured && <TextLink label={`Đo ${input.excluded.unmeasured} ảnh chưa đo`} onPress={() => router.push({ pathname: '/images/[id]', params: { id: newestUnmeasured.id } })} />}
      </View>
    );
  }

  // Nhóm vẽ: nhóm chính (dấu tròn, đường liền) rồi các nhóm khác (vuông, tam giác, đường đứt) khi bật nút.
  const otherKeys = [...new Set(split.others.map((p) => p.methodKey))];
  const groups = [
    { key: split.mainKey!, label: split.mainLabel!, shape: 'circle' as MarkShape, points: split.main },
    ...(others ? otherKeys.map((k, i) => { const pts = split.others.filter((p) => p.methodKey === k); return { key: k, label: methodLabel(pts[0].method), shape: SHAPES[i % SHAPES.length], points: pts }; }) : []),
  ];
  const from = rangeStart(r, today) ?? drawn[0].date;
  const latest = split.main[split.main.length - 1];
  const prevOf = (p: AreaPoint) => { const k = drawn.indexOf(p); return k > 0 ? drawn[k - 1] : null; };
  const listed = [...drawn, ...input.sameDay.filter((p) => (others || p.methodKey === split.mainKey) && shown.some((s) => s.date === p.date))]
    .sort((a, b) => b.date.localeCompare(a.date) || a.imageId.localeCompare(b.imageId));
  const exText = excludedText(input.excluded);

  return (
    <View testID="tien-trien-dien-tich" style={{ gap: 12 }}>
      {demo && <View style={{ flexDirection: 'row' }}><SimBadge /></View>}
      {options.length > 1 && <Segmented value={r} onChange={setRange} options={options.map((o) => ({ value: o, label: RANGE_LABEL[o] }))} />}

      {/* Tóm tắt (mục 6): số gần nhất của nhóm chính, dòng thay đổi bằng chữ và mũi tên, cùng màu nhấn cho tăng và giảm. */}
      <View style={{ gap: 4 }}>
        {/* Màn bác sĩ đã có số lớn ở khối Hiện trạng; ở đây chỉ ghi ngày và số của lần đo gần nhất trong nhóm chính. */}
        {isDoctor ? <Muted>{`Lần đo gần nhất ${formatAreaDisplay(latest.areaCm2)}, chụp ${fmtDate(latest.date)}`}</Muted> : <>
          <Text style={{ color: C.textSoft, fontWeight: '600' }}>Lần đo gần nhất</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 32, fontWeight: '800', color: C.text }}>{formatAreaDisplay(latest.areaCm2)}</Text>
            <Muted>{fmtDate(latest.date)}</Muted>
          </View>
        </>}
        {text.headline && <Text style={{ color: C.primary, fontWeight: '700', fontSize: T.cardTitle }}>{text.headline}</Text>}
        {text.detail && <Text style={{ color: C.text }}>{text.detail}</Text>}
      </View>
      {ev && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
          <StatusChip status={TREND_ROLE[ev.trend]} label={TREND[ev.trend].label} />
          <Muted>{`Bác sĩ đánh giá ngày ${fmtDate(ev.date).slice(0, 5)}`}</Muted>
        </View>
      )}
      {!isDoctor && <Muted>{CAVEAT}</Muted>}

      {/* QĐ-P2-1 = C: nhóm phương pháp khác không giấu im lặng. */}
      {hasOthers && (
        <View style={{ gap: 4 }}>
          <Muted>{`Đang hiện ${split.main.length} lần đo bằng ${split.mainLabel}. ${others ? 'Các phương pháp khác vẽ bằng dấu vuông hoặc tam giác, đường đứt, không nối với phương pháp chính.' : `Ẩn ${split.others.length} lần đo bằng phương pháp khác.`}`}</Muted>
          <Button variant="secondary" label={others ? 'Chỉ hiện phương pháp chính' : 'Hiện cả phương pháp khác'} onPress={toggleOthers} />
        </View>
      )}

      {drawn.length >= 2 ? (
        <View style={{ gap: 6 }}>
          <Text style={{ color: C.textSoft, fontSize: T.small }}>Diện tích (cm²)</Text>
          <AreaLineChart code={code} groups={groups} from={from} to={today} unmeasuredDates={input.unmeasuredDates} markers={isDoctor ? markers : []} selectedId={sel?.imageId ?? null} onSelect={setSelected} />
          <Muted>{[
            'Chạm vào biểu đồ để xem từng lần đo.',
            input.unmeasuredDates.some((d) => d >= from) ? 'Vòng tròn rỗng sát trục là ảnh chưa có số đo.' : '',
            isDoctor && markers.some((m) => m.date >= from) ? 'Vạch đứt là ngày bắt đầu đợt điều trị.' : '',
            others && groups.length > 1 ? groups.map((g) => `${g.shape === 'circle' ? 'Tròn' : g.shape === 'square' ? 'Vuông' : 'Tam giác'}: ${g.label}`).join('. ') + '.' : '',
          ].filter(Boolean).join(' ')}</Muted>
        </View>
      ) : null}
      {exText && <Muted>{exText}</Muted>}
      {isDoctor && input.excluded.unmeasured > 0 && newestUnmeasured && (
        <TextLink label={`Đo ${input.excluded.unmeasured} ảnh chưa đo`} onPress={() => router.push({ pathname: '/images/[id]', params: { id: newestUnmeasured.id } })} />
      )}

      {/* Vùng chi tiết dưới biểu đồ (mục 9), không dùng tooltip nổi. */}
      {sel && (
        <View testID="chi-tiet-lan-do" style={{ gap: 6, padding: 12, borderRadius: 12, backgroundColor: C.surfaceMuted, borderWidth: 1, borderColor: C.border }}>
          <Text style={{ color: C.text, fontWeight: '700' }}>{`Ngày đo ${fmtDate(sel.date)}${prevOf(sel) ? ` · cách lần trước ${dayDiff(prevOf(sel)!.date, sel.date)} ngày` : ''}`}</Text>
          <Text style={{ color: C.text, fontSize: T.cardTitle, fontWeight: '700' }}>{formatAreaDisplay(sel.areaCm2)}</Text>
          <Text style={{ color: C.text }}>{`Phương pháp: ${methodLabel(sel.method)}`}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <StatusChip status={SOURCE.doctor} label={SOURCE.doctor.label} />
            {sel.source === 'demo' && <SimBadge />}
          </View>
          <Muted>{sel.enteredBy ? `Nhập bởi ${accountName(sel.enteredBy) ?? 'tài khoản không còn trong danh sách'}${sel.enteredAt ? ` lúc ${fmtDateTime(sel.enteredAt)}` : ''}` : 'Chưa ghi nhận người nhập.'}</Muted>
          {(() => { const im = mine.find((i) => i.id === sel.imageId); return im ? <ImageTile image={im} width={160} /> : null; })()}
          {sel.evaluationId && (() => { const e = evaluations.find((x) => x.id === sel.evaluationId); return e ? <Muted>{`Có nhận xét của bác sĩ ngày ${fmtDate(e.date).slice(0, 5)} (xem mục ${isDoctor ? 'Đánh giá gần nhất' : 'Nhận xét của bác sĩ'}).`}</Muted> : null; })()}
          <TextLink label={isDoctor ? 'Mở ảnh để xem hoặc sửa số đo' : 'Mở ảnh của lần đo này'} onPress={() => router.push({ pathname: '/images/[id]', params: { id: sel.imageId } })} />
        </View>
      )}

      {/* Danh sách các lần đo: mới trước; cũng là phương án thay thế biểu đồ cho trình đọc màn hình. */}
      <Disclosure icon="list-outline" title={`Các lần đo (${listed.length})`} summary={hasOthers && !others ? `Chỉ ${split.mainLabel}` : undefined}>
        {listed.map((p, i) => {
          const hidden = !drawn.includes(p);
          const prev = hidden ? null : prevOf(p);
          return (
            <Pressable key={p.imageId} accessibilityRole="button"
              accessibilityLabel={`${fmtDate(p.date)}, ${formatAreaDisplay(p.areaCm2)}, ${methodLabel(p.method)}${hidden ? ', cùng ngày, không vẽ, mở ảnh' : ''}`}
              accessibilityState={{ selected: p.imageId === sel?.imageId }}
              onPress={() => (hidden ? router.push({ pathname: '/images/[id]', params: { id: p.imageId } }) : setSelected(p.imageId))}
              style={[{ minHeight: 44, paddingVertical: 8, gap: 2 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }, p.imageId === sel?.imageId && { backgroundColor: C.primarySoft }]}>
              <Text style={{ color: C.text, fontWeight: '600' }}>{`${fmtDate(p.date)} · ${formatAreaDisplay(p.areaCm2)}`}</Text>
              <Text style={{ color: C.textSoft, fontSize: T.small }}>{[methodLabel(p.method), hidden ? 'cùng ngày, không vẽ' : prev ? `cách lần trước ${dayDiff(prev.date, p.date)} ngày` : 'lần đo đầu trong khoảng'].join(' · ')}</Text>
            </Pressable>
          );
        })}
      </Disclosure>
    </View>
  );
}
