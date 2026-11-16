import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';

import { NoAccess } from '@/components/Guard';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Choices, Field, Header, InfoRow, Muted, Notice, Screen, SectionTitle, Segmented, TextLink } from '@/components/ui';
import { confirm } from '@/lib/dialog';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { parseArea } from '@/lib/naming';
import { duplicateView, EMPTY_PENDING_FORM, validateNewPatientForm, type NewPatientErrors, type PendingPatientForm } from '@/lib/pendingCapture';
import { DuplicatePatientError, useLookups, useStore } from '@/lib/store';
import type { Patient, Wound, WoundImage } from '@/lib/types';
import { C, T } from '@/theme';


/**
 * B09b – Tạo hồ sơ từ ảnh vừa chụp (chỉ bác sĩ). Mở từ B10 ở luồng "Chụp cho bệnh nhân mới", hoặc từ thẻ "Ảnh chờ tạo hồ sơ" ở B09.
 * Trường, điều kiện và thứ tự giống màn Thêm bệnh nhân (B03); khác B03 ở chỗ vị trí vết thương bắt buộc vì ảnh phải thuộc một vết.
 * Ảnh chờ hiện ở đầu màn để bác sĩ đối chiếu. Hồ sơ, tài khoản, vết thương và ảnh được ghi trong một lần (commitPendingCapture).
 */
export default function CaptureNewPatient() {
  const { me, pendingCapture: held, updatePendingForm, discardPendingCapture, commitPendingCapture, labelImage } = useStore();
  const { woundsOf } = useLookups();
  const [form, setForm] = useState<PendingPatientForm>(held?.form ?? EMPTY_PENDING_FORM);
  const [errors, setErrors] = useState<NewPatientErrors>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [done, setDone] = useState(false);
  const [dup, setDup] = useState<Patient | null>(null);
  const [dupWound, setDupWound] = useState('');

  // Ghi thông tin đang nhập vào ảnh chờ (chậm 400 ms) để quay lại B10, sang màn khác hoặc mở lại ứng dụng không mất.
  const heldId = held?.id;
  useEffect(() => {
    if (!heldId || done) return;
    const t = setTimeout(() => { void updatePendingForm(form).catch(() => {}); }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, heldId, done]);

  if (me?.role !== 'doctor') return <NoAccess />;

  if (!held) {
    return (
      <Screen header={<Header back title="Tạo hồ sơ từ ảnh" />}>
        <Notice tone="gray" icon="image-outline">Không có ảnh chờ tạo hồ sơ. Ảnh có thể đã được gắn vào hồ sơ hoặc đã bị bỏ.</Notice>
        <Button label="Về màn Chụp ảnh" variant="secondary" onPress={() => router.dismissTo('/capture')} />
      </Screen>
    );
  }

  const set = <K extends keyof PendingPatientForm>(k: K, v: PendingPatientForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (k === 'phone') setDup(null);
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  // Số đo nhập ở B10: lưu sau khi có ảnh, bằng đúng hàm ghi số đo của B10 (labelImage). Lỗi thì mở B11 để nhập lại như B10.
  const applyLabel = async (image: WoundImage): Promise<string | undefined> => {
    if (!held.areaText) return undefined;
    const area = parseArea(held.areaText);
    if (!area.ok) return area.error;
    try { await labelImage(image.id, area.value, held.method); return undefined; }
    catch (e) { return e instanceof Error ? e.message : String(e); }
  };

  // Lưu xong (hồ sơ, vết, ảnh đã ghi và đã kiểm liên kết): mở thẳng B05 của vết thương (đặc tả bước 10, người dùng chọn 16/11/2026).
  // Ghi số đo lỗi thì mở B11 của đúng ảnh, điền sẵn số đo để lưu lại (như B10). Mã kích hoạt không hiện ở luồng này;
  // tài khoản bệnh nhân vẫn được tạo như B03, bác sĩ cấp mã ở hồ sơ (B04, "Cấp mã kích hoạt").
  const finish = (r: { wound: Wound; image: WoundImage }, labelError?: string) => {
    setDone(true);
    if (labelError) router.replace({ pathname: '/images/[id]', params: { id: r.image.id, nhapLai: held.areaText, phuongPhap: held.method, loi: labelError } });
    else router.replace({ pathname: '/wounds/[id]', params: { id: r.wound.id } });
  };

  const create = async () => {
    if (lock.current || busy) return;
    const v = validateNewPatientForm(form);
    if (!v.value) { setErrors(v.errors); setErr('Kiểm tra lại các ô được đánh dấu.'); return; }
    lock.current = true; setBusy(true); setErr(null); setErrors({});
    try {
      await updatePendingForm(form).catch(() => {});
      const r = await commitPendingCapture({ kind: 'new', form });
      const labelError = r.reused ? undefined : await applyLabel(r.image);
      finish(r, labelError);
    } catch (e) {
      if (e instanceof DuplicatePatientError) { setDup(e.duplicate); setDupWound(''); setErr(null); }
      else setErr(`${e instanceof Error ? e.message : String(e)} Ảnh và thông tin đã nhập vẫn giữ nguyên, có thể bấm lưu lại.`);
    } finally { lock.current = false; setBusy(false); }
  };

  const dv = dup ? duplicateView(dup, me.id) : null;
  const dupWounds = dup && dv?.own && !dv.archived ? woundsOf(dup.id).filter((w) => w.status !== 'closed') : [];
  const newLoc = form.woundLocation.trim();
  const dupOptions = [
    ...dupWounds.map((w) => ({ value: w.id, label: `${w.code} · ${w.location}` })),
    ...(newLoc ? [{ value: 'new', label: `Vết thương mới: ${newLoc}` }] : []),
  ];
  const attach = () => {
    if (!dup || !dupWound || lock.current || busy) return;
    const target = dupWound === 'new' ? `vết thương mới "${newLoc}"` : dupOptions.find((o) => o.value === dupWound)?.label ?? '';
    // Gắn ảnh vào hồ sơ có sẵn chỉ sau khi bác sĩ xác nhận; không tạo hồ sơ mới, thông tin hồ sơ có sẵn không đổi.
    confirm(`Gắn ảnh vào hồ sơ ${dup.code}?`, `Ảnh sẽ thuộc ${dup.code} · ${dup.name}, ${target}. Không tạo hồ sơ mới và không đổi thông tin hồ sơ ${dup.code}.`, () => {
      void (async () => {
        if (lock.current) return;
        lock.current = true; setBusy(true); setErr(null);
        try {
          const r = await commitPendingCapture(dupWound === 'new' ? { kind: 'existing', patientId: dup.id, woundLocation: newLoc } : { kind: 'existing', patientId: dup.id, woundId: dupWound });
          const labelError = r.reused ? undefined : await applyLabel(r.image);
          finish(r, labelError);
        } catch (e) { setErr(`${e instanceof Error ? e.message : String(e)} Ảnh vẫn chờ, chưa gắn vào hồ sơ nào.`); }
        finally { lock.current = false; setBusy(false); }
      })();
    }, 'Gắn ảnh', 'Xem lại');
  };

  const cancel = () => confirm('Hủy và bỏ ảnh?', 'Ảnh vừa chụp chưa thuộc hồ sơ nào và sẽ bị xóa, thông tin đã nhập cũng bỏ. Chưa có hồ sơ nào được tạo.', () => {
    void discardPendingCapture().finally(() => router.dismissTo('/capture'));
  }, 'Bỏ ảnh', 'Ở lại');

  const area = held.areaText ? `${held.areaText} cm² · ${held.method || 'chưa chọn phương pháp'} (lưu sau khi tạo hồ sơ)` : 'Chưa nhập';
  return (
    <Screen header={<Header back title="Tạo hồ sơ từ ảnh" subtitle="Ảnh chưa thuộc hồ sơ nào cho tới khi lưu" />}
      footer={<View style={{ gap: 8 }}>
        {err ? <Text accessibilityRole="alert" style={{ color: C.red, fontWeight: '600' }}>{err}</Text> : null}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Button label="Hủy" variant="secondary" disabled={busy} onPress={cancel} style={{ flexShrink: 0 }} />
          <Button label="Tạo hồ sơ và gắn ảnh" icon="save-outline" loading={busy} disabled={!!dup} onPress={create} style={{ flex: 1 }} />
        </View>
      </View>}>
      {/* Ảnh chờ để bác sĩ đối chiếu đúng ảnh sẽ gắn. */}
      <Card>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <View style={{ width: 104, aspectRatio: held.width && held.height ? held.width / held.height : 4 / 3, maxHeight: 104, backgroundColor: C.text, borderRadius: 10, overflow: 'hidden' }}>
            <Image source={{ uri: held.uri }} style={{ width: '100%', height: '100%' }} contentFit="contain" accessibilityLabel="Ảnh vết thương vừa chụp, chờ tạo hồ sơ" />
          </View>
          <View style={{ flex: 1, gap: 4 }}>
            <View style={{ flexDirection: 'row' }}><Chip label="Ảnh chờ tạo hồ sơ" tone="amber" icon="time-outline" /></View>
            <Text style={{ color: C.textSoft, fontSize: T.small }}>{held.capture.capturedAt ? `Chụp ${fmtDateTime(held.capture.capturedAt)}` : `Ảnh thư viện · ${held.sourceDateKnown ? fmtDate(held.captureDate) : 'không rõ ngày chụp'}`}</Text>
            <Text style={{ color: C.textSoft, fontSize: T.small }}>{`Số đo: ${area}`}</Text>
          </View>
        </View>
        <TextLink label="Xem lại ảnh ở bước trước" onPress={() => (router.canGoBack() ? router.back() : router.dismissTo('/capture'))} />
      </Card>
      {!held.durable ? <Notice tone="amber">Chưa ghi được ảnh chờ vào bộ nhớ máy. Ảnh chỉ giữ trong lần mở ứng dụng này; đóng ứng dụng trước khi lưu hồ sơ thì ảnh sẽ mất.</Notice> : null}

      {dup && dv ? (
        <Card style={{ gap: 10, borderColor: C.amber }}>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <Ionicons name="people-outline" size={20} color={C.amber} />
            <Text style={{ flex: 1, color: C.text, fontWeight: '700' }}>{`Có thể trùng hồ sơ ${dv.code}`}</Text>
          </View>
          <Muted>{`Số điện thoại ${form.phone.trim()} đã có ở hồ sơ ${dv.code}. Chưa tạo hồ sơ mới; ảnh vẫn chờ.`}</Muted>
          {dv.own ? <>
            <InfoRow label="Hồ sơ có sẵn" value={`${dv.code} · ${dv.name} · sinh ${dv.birthYear}`} />
            <TextLink label={`Xem hồ sơ ${dv.code}`} onPress={() => router.push({ pathname: '/patients/[id]', params: { id: dup.id } })} />
            {dv.archived
              ? <Muted>Hồ sơ này đã lưu trữ nên không thêm ảnh được. Khôi phục hồ sơ trước, hoặc sửa số điện thoại nếu là người khác.</Muted>
              : <>
                <Text style={{ color: C.text, fontWeight: '600' }}>{`Nếu đúng là bệnh nhân này, chọn vết thương để gắn ảnh vào ${dv.code}:`}</Text>
                {dupOptions.length ? <Choices value={dupWound} onChange={setDupWound} options={dupOptions} /> : <Muted>Hồ sơ chưa có vết thương đang theo dõi. Nhập vị trí vết thương ở trên để tạo vết mới trong hồ sơ này.</Muted>}
                <Button label={`Gắn ảnh vào hồ sơ ${dv.code}`} icon="link-outline" variant="secondary" disabled={!dupWound || busy} reason="Chọn vết thương trước." onPress={attach} />
              </>}
          </> : <Muted>Hồ sơ này không do bạn phụ trách. Nếu bệnh nhân đã tự đăng ký, nhờ quản trị phân công hồ sơ đó cho bạn; ảnh vẫn chờ ở màn Chụp ảnh.</Muted>}
          <Text style={{ color: C.textSoft, fontSize: T.small }}>{'Nếu là người khác, sửa số điện thoại rồi bấm "Tạo hồ sơ và gắn ảnh".'}</Text>
        </Card>
      ) : null}

      <SectionTitle>Thông tin bệnh nhân</SectionTitle>
      <Card style={{ gap: 14 }}>
        <Field label="Họ và tên" value={form.name} onChangeText={(t) => set('name', t)} error={errors.name} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flexGrow: 1, flexBasis: 120 }}><Field label="Năm sinh" value={form.birthYear} onChangeText={(t) => set('birthYear', t)} keyboardType="number-pad" error={errors.birthYear} /></View>
          <View style={{ flexGrow: 1, flexBasis: 160, gap: 6 }}>
            <Text style={{ color: C.textBody, fontSize: T.small, fontWeight: '600' }}>Giới tính</Text>
            <Segmented value={form.sex} onChange={(v) => set('sex', v)} options={[{ value: 'Nam', label: 'Nam' }, { value: 'Nữ', label: 'Nữ' }]} />
          </View>
        </View>
        <Field label="Số điện thoại" value={form.phone} onChangeText={(t) => set('phone', t)} keyboardType="phone-pad" />
        <Field label="Vị trí vết thương trong ảnh" value={form.woundLocation} onChangeText={(t) => set('woundLocation', t)} placeholder="Ví dụ: Cẳng chân trái" hint="Tạo vết thương VT01 và gắn ảnh vào vết này" error={errors.woundLocation} />
      </Card>
      <Card>
        <Pressable onPress={() => set('consent', !form.consent)} accessibilityRole="checkbox" accessibilityState={{ checked: form.consent }} style={{ flexDirection: 'row', gap: 10, minHeight: 44 }}>
          <Ionicons name={form.consent ? 'checkbox' : 'square-outline'} size={22} color={form.consent ? C.primary : C.textFaint} />
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={{ fontWeight: '600', color: C.text }}>Bệnh nhân đồng ý dùng ảnh cho nghiên cứu</Text>
            <Muted>Ảnh được xuất bằng mã hồ sơ, không kèm họ tên. Có thể rút lại đồng ý trong hồ sơ; ảnh khi đó không còn được xuất.</Muted>
          </View>
        </Pressable>
      </Card>
      <TextLink label="Để sau, giữ ảnh chờ ở màn Chụp ảnh" onPress={() => { void updatePendingForm(form).catch(() => {}); router.dismissTo('/capture'); }} />
    </Screen>
  );
}
