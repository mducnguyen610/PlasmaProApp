import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { OutlineEditor } from '@/components/OutlineEditor';
import { Text } from '@/components/Text';
import { Button, Chip, Choices, Disclosure, Divider, Field, InfoRow, Muted, Notice, SectionTitle } from '@/components/ui';
import { confirm, notify } from '@/lib/dialog';
import { fmtDateTime } from '@/lib/format';
import {
  defaultOutline, IMAGE_TYPE_LABEL, IMAGE_TYPES, LABEL_STATE, labelState, missingForConfirm, missingLabelParts, QUALITY_REASONS, simplifyOutline,
  suggestImageType, TRAIT_LEVEL_LABEL, TRAIT_LEVELS, TRAITS, type ImageLabel, type ImageType, type Point, type TraitKey, type TraitLevel,
} from '@/lib/imageLabel';
import { useLookups, useStore } from '@/lib/store';
import type { Patient, WoundImage } from '@/lib/types';
import { C, T } from '@/theme';

type Draft = Omit<ImageLabel, 'confirmedAt' | 'confirmedBy' | 'updatedAt' | 'updatedBy'>;
const toDraft = (l: ImageLabel | undefined): Draft => {
  const { confirmedAt: _a, confirmedBy: _b, updatedAt: _c, updatedBy: _d, ...rest } = l ?? {};
  return { ...rest, traits: { ...rest.traits } };
};
const same = (a: Draft, b: Draft) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Giai đoạn B (CN2, N3..N9, K1..K4, XN-08, XN-14, XN-15): gán nhãn theo ảnh.
 * Loại ảnh, vùng vết (kéo điểm viền AI hoặc viền mặc định), 5 tính chất có ghi chú, ghi chú chung, mức tin cậy, chất lượng.
 * "Lưu nhãn" lưu bản đang gán; "Xác nhận nhãn" chỉ bật khi đủ điều kiện. Sửa nhãn đã xác nhận đưa về Đang gán (store ghi lịch sử).
 * Bác sĩ khác xem nhãn, không sửa.
 */
export function ImageLabelCard({ im, patient, canEdit, onDirty, onRetake }: {
  im: WoundImage; patient: Patient; canEdit: boolean; onDirty: (dirty: boolean) => void; onRetake: (reason: string) => void;
}) {
  const { data, saveImageLabel, confirmImageLabel } = useStore();
  const { account } = useLookups();
  const saved = toDraft(im.label);
  const [draft, setDraft] = useState<Draft>(saved);
  const [editingOutline, setEditingOutline] = useState(false);
  const busy = useRef(false);
  const [working, setWorking] = useState(false);
  const dirty = canEdit && !same(draft, saved);
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);

  const state = labelState(im);
  const st = LABEL_STATE[state];
  const aiHull = im.capture?.wound?.hull as Point[] | undefined;
  const sameWound = data.images.filter((x) => x.woundId === im.woundId);
  const suggested = suggestImageType(im, sameWound);
  const draftMissing = missingForConfirm(draft);
  const unused = im.status === 'excluded';
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  const setTrait = (k: TraitKey, patch: { level?: TraitLevel; note?: string }) => setDraft((d) => ({ ...d, traits: { ...d.traits, [k]: { ...d.traits?.[k], ...patch } } }));

  const run = async (op: () => Promise<void>, done?: string) => {
    if (busy.current) return;
    busy.current = true; setWorking(true);
    try { await op(); if (done) notify(done, ''); }
    catch (e) { notify('Chưa lưu được nhãn', e instanceof Error ? e.message : String(e)); }
    finally { busy.current = false; setWorking(false); }
  };
  const save = () => run(() => saveImageLabel(im.id, draft), 'Đã lưu nhãn');
  const doConfirm = () => confirm('Xác nhận nhãn',
    'Nhãn đã xác nhận sẽ vào tập huấn luyện nếu bệnh nhân đồng ý dùng dữ liệu. Bác sĩ đã kiểm tra ảnh không chứa khuôn mặt, tên, giấy tờ hoặc thông tin nhận dạng cá nhân?',
    () => run(async () => { if (!same(draft, saved)) await saveImageLabel(im.id, draft); await confirmImageLabel(im.id); }, 'Đã xác nhận nhãn'), 'Xác nhận nhãn');

  const outline = draft.outline ?? [];
  const startOutline = (from: 'ai' | 'manual') => {
    set({ outline: from === 'ai' && aiHull?.length ? simplifyOutline(aiHull) : defaultOutline(), outlineSource: from });
    setEditingOutline(true);
  };
  const moveOutline = (pts: Point[]) => set({ outline: pts, outlineSource: draft.outlineSource === 'ai' || draft.outlineSource === 'ai_edited' ? 'ai_edited' : 'manual' });

  const history = [...(im.labelHistory ?? [])].reverse();
  const by = (id?: string) => (id ? account(id)?.name ?? 'Tài khoản không còn trong danh sách' : '—');

  return (
    <View testID="the-gan-nhan" style={{ gap: 10 }}>
      <SectionTitle icon="pricetags-outline">Nhãn ảnh</SectionTitle>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        <Chip label={st.label} tone={st.tone} />
        {dirty && <Chip label="Có thay đổi chưa lưu" tone="amber" icon="create-outline" />}
        {im.label?.confirmedAt && <Chip label={`Xác nhận bởi ${by(im.label.confirmedBy)}`} tone="green" />}
      </View>
      {unused && <Notice tone="gray" icon="eye-off-outline">{`Ảnh đã đánh dấu Không sử dụng${im.excludeReason ? `: ${im.excludeReason}` : ''}. Ảnh được giữ lại nhưng không tính cho phác đồ, biểu đồ và tập huấn luyện.`}</Notice>}
      {!patient.researchConsent && <Muted>Bệnh nhân chưa đồng ý dùng dữ liệu: nhãn vẫn lưu cho hồ sơ, ảnh không vào tập huấn luyện.</Muted>}

      {/* L1 loại ảnh */}
      <Text style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>Loại ảnh</Text>
      {canEdit ? <>
        <Choices<ImageType> value={draft.imageType ?? ('' as ImageType)} onChange={(v) => set({ imageType: v })} options={IMAGE_TYPES} />
        {!draft.imageType && <Muted>{`Gợi ý: ${IMAGE_TYPE_LABEL[suggested]}.`}</Muted>}
      </> : <Muted>{draft.imageType ? IMAGE_TYPE_LABEL[draft.imageType] : 'Chưa chọn'}</Muted>}

      {/* N4, XN-08 vùng vết */}
      <Divider />
      <Text style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>Vùng vết</Text>
      {outline.length >= 3 || editingOutline ? (
        <OutlineEditor image={im} value={outline} aiHull={aiHull} readOnly={!canEdit || !editingOutline} onChange={moveOutline} />
      ) : <Muted>{aiHull?.length ? 'Chưa chốt vùng vết. Có thể bắt đầu từ viền AI rồi kéo điểm cho khớp bờ vết.' : 'Ảnh không có viền AI. Bắt đầu từ viền mặc định rồi kéo điểm vào bờ vết.'}</Muted>}
      {canEdit && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {outline.length >= 3 && !editingOutline && <Button label="Chỉnh viền" variant="secondary" icon="create-outline" onPress={() => setEditingOutline(true)} />}
          {!!aiHull?.length && <Button label={outline.length ? 'Lấy lại viền AI' : 'Dùng viền AI'} variant="secondary" icon="scan-outline" onPress={() => startOutline('ai')} />}
          {!outline.length && <Button label="Khoanh từ viền mặc định" variant="secondary" icon="shapes-outline" onPress={() => startOutline('manual')} />}
          {editingOutline && <Button label="Xong chỉnh viền" variant="ghost" onPress={() => setEditingOutline(false)} />}
        </View>
      )}
      {draft.outlineSource && outline.length >= 3 && <Muted>{`Nguồn viền: ${draft.outlineSource === 'ai' ? 'viền AI giữ nguyên' : draft.outlineSource === 'ai_edited' ? 'viền AI đã chỉnh' : 'bác sĩ khoanh'} · ${outline.length} điểm`}</Muted>}

      {/* G1, G2 năm tính chất */}
      <Divider />
      <Text style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>Tính chất vết</Text>
      {TRAITS.map((t) => {
        const v = draft.traits?.[t.key];
        return (
          <View key={t.key} style={{ gap: 6 }}>
            <Text style={{ color: C.text, fontSize: T.small }}>{t.label}</Text>
            {canEdit ? <>
              <Choices<TraitLevel> value={v?.level ?? ('' as TraitLevel)} onChange={(level) => setTrait(t.key, { level })}
                options={TRAIT_LEVELS.map((l) => ({ ...l, a11y: `${t.label}: ${l.label}` }))} />
              <Field label={`Ghi chú ${t.label.toLowerCase()}`} optional value={v?.note ?? ''} onChangeText={(note) => setTrait(t.key, { note })} />
            </> : <Muted>{`${v?.level ? TRAIT_LEVEL_LABEL[v.level] : 'Chưa gán'}${v?.note ? ` · ${v.note}` : ''}`}</Muted>}
          </View>
        );
      })}

      <Divider />
      {canEdit ? <Field label="Ghi chú chung" optional value={draft.note ?? ''} onChangeText={(note) => set({ note })} />
        : draft.note ? <InfoRow label="Ghi chú chung" value={draft.note} /> : null}

      {/* K4 mức tin cậy, K2 chất lượng */}
      <Text style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>Mức tin cậy của nhãn</Text>
      {canEdit ? <Choices<'certain' | 'uncertain'> value={draft.confidence ?? ('' as 'certain')} onChange={(confidence) => set({ confidence })}
        options={[{ value: 'certain', label: 'Chắc chắn' }, { value: 'uncertain', label: 'Không chắc' }]} />
        : <Muted>{draft.confidence === 'certain' ? 'Chắc chắn' : draft.confidence === 'uncertain' ? 'Không chắc' : 'Chưa chọn'}</Muted>}
      <Text style={{ color: C.text, fontSize: T.small, fontWeight: '600' }}>Chất lượng ảnh</Text>
      {canEdit ? <>
        <Choices<'pass' | 'fail'> value={draft.quality ?? ('' as 'pass')} onChange={(quality) => set({ quality, qualityReason: quality === 'pass' ? undefined : draft.qualityReason })}
          options={[{ value: 'pass', label: 'Đạt' }, { value: 'fail', label: 'Không đạt' }]} />
        {draft.quality === 'fail' && <>
          <Choices<string> value={draft.qualityReason ?? ''} onChange={(qualityReason) => set({ qualityReason })} options={QUALITY_REASONS.map((r) => ({ value: r, label: r }))} />
          {/* XN-14: ảnh không đạt thì gợi ý yêu cầu chụp lại; ảnh vẫn được giữ. */}
          <Notice icon="refresh-outline">{'Ảnh Không đạt không vào tập huấn luyện và không xác nhận được. Nên yêu cầu chụp lại.'}</Notice>
          {!im.retakeRequested && <Button label="Yêu cầu chụp lại" variant="secondary" icon="refresh" onPress={() => onRetake(draft.qualityReason ?? '')} />}
        </>}
      </> : <Muted>{draft.quality === 'pass' ? 'Đạt' : draft.quality === 'fail' ? `Không đạt${draft.qualityReason ? ` (${draft.qualityReason})` : ''}` : 'Chưa đánh giá'}</Muted>}

      {canEdit && !unused && (
        <View style={{ gap: 6 }}>
          <Divider />
          {missingLabelParts(draft).length > 0 && <Muted>{`Còn thiếu để đủ nhãn: ${missingLabelParts(draft).join('; ')}.`}</Muted>}
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
            <Button style={{ flex: 1, minWidth: 140 }} label="Lưu nhãn" variant="secondary" icon="save-outline" loading={working} disabled={!dirty} reason="Chưa có thay đổi để lưu." onPress={save} />
            <Button style={{ flex: 1, minWidth: 140 }} label={im.label?.confirmedAt && !dirty ? 'Đã xác nhận' : 'Xác nhận nhãn'} icon="checkmark-done-outline" loading={working}
              disabled={draftMissing.length > 0 || (!!im.label?.confirmedAt && !dirty)}
              reason={draftMissing.length ? `Còn thiếu: ${draftMissing.join('; ')}.` : 'Nhãn đã xác nhận.'} onPress={doConfirm} />
          </View>
          {im.label?.confirmedAt && <Muted>Sửa nhãn đã xác nhận sẽ đưa nhãn về Đang gán; cần bấm Xác nhận nhãn lại.</Muted>}
        </View>
      )}

      <Disclosure icon="time-outline" title="Lịch sử nhãn" summary={history.length ? `${history.length} thay đổi` : 'Chưa có thay đổi'}>
        {history.length === 0 && <Muted>Chưa có thay đổi.</Muted>}
        {history.map((h, i) => (
          <View key={i} style={{ gap: 2, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
            <Text style={{ color: C.text, fontWeight: '600', fontSize: T.small }}>{`${fmtDateTime(h.at)} · ${by(h.by)} · ${h.action === 'confirm' ? 'Xác nhận' : h.action === 'unconfirm' ? 'Bỏ xác nhận' : 'Lưu nhãn'}`}</Text>
            <Muted>{h.detail}</Muted>
          </View>
        ))}
      </Disclosure>
    </View>
  );
}
