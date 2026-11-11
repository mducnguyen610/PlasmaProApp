import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { latestEvaluation, SEVERITY } from '@/lib/access';
import { areaReview, courseProgress, courseStatus, followUpDates, localDay } from '@/lib/course';
import { DateBadge } from '@/components/DateBadge';
import { DateTile, TaskRow } from '@/components/items';
import { Text } from '@/components/Text';
import { Button, Card, Chip, Divider, Header, Muted, Ring, Screen, SectionTitle, SimBadge, WoundPhoto } from '@/components/ui';
import { notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime, TREND } from '@/lib/format';
import { formatAreaForName } from '@/lib/naming';
import { computeReminders, scheduleReminders } from '@/lib/reminders';
import { useLookups, useStore } from '@/lib/store';
import { C, radius } from '@/theme';

// Việc trước và sau mỗi lần chiếu (slide 34: chiếu sau chăm sóc thường quy; S2k 2022: loại dịch tiết, không làm khô vết).
// Nội dung là bản nháp cho demo, cần bác sĩ trong nhóm duyệt.
const BEFORE = ['Rửa tay, thay băng và làm sạch vết thương theo dặn', 'Không lau khô hẳn vết thương', 'Lắp đầu phát riêng của mình'];
const AFTER = ['Vệ sinh đầu phát rồi đậy nắp', 'Băng lại hoặc bôi thuốc theo dặn', 'Ghi cảm giác của lần chiếu trong Lịch trình'];

// Trang chủ bệnh nhân (đặc tả mục 6): một cột, theo thứ tự việc bệnh nhân cần biết trong ngày.
// Điều hướng sang Lịch trình, Lịch sử, Thiết bị nằm ở thanh tab, không lặp lại bằng thẻ gradient.
export default function PatientHome() {
  const { data, me, addReport } = useStore();
  const { patient, account, woundsOf, sessionsOf, device, coursePlan, imagesOf } = useLookups();
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [openSteps, setOpenSteps] = useState(false);
  const [openNote, setOpenNote] = useState(false);
  const p = patient(me?.patientId);
  if (!p) return null;
  const today = localDay();
  const reminders = computeReminders(data, p.id, today);
  const upcoming = reminders.filter((r) => r.date >= today);
  const next = upcoming[0];
  const wounds = woundsOf(p.id);
  const courses = wounds.map((w) => ({ w, plan: coursePlan(w.id, { patientView: true }) }));
  const treating = courses.find((c) => c.plan?.status === 'active');
  const plan = treating?.plan;
  const followUp = courses.find((c) => c.w.status === 'follow_up');
  const awaiting = courses.find((c) => c.w.status === 'awaiting_closure');
  const retakes = data.images.filter((i) => i.patientId === p.id && i.retakeRequested);
  const sessions = p.deviceId ? sessionsOf(p.deviceId) : [];
  const dev = device(p.deviceId);
  const lastSyncDay = (dev?.lastSync ? localDay(dev.lastSync) : null);
  const woundSessions = plan ? sessions.filter((s) => !s.woundId || s.woundId === treating!.w.id) : [];
  const pr = plan ? courseProgress(plan, woundSessions, today, lastSyncDay) : null;
  const status = pr ? courseStatus(pr, fmtDate) : null;
  const statusColor = status?.kind === 'done' ? C.green : status?.kind === 'over' ? C.amber : status?.kind === 'rest' ? C.textSoft : C.primary;
  const review = plan && treating ? areaReview(imagesOf(treating.w.id), plan, today) : null;
  const nextCheck = followUp?.w.followUpFrom ? followUpDates(followUp.w.followUpFrom).find((x) => x.date >= today) : undefined;
  const steps = status?.kind === 'treat' ? BEFORE : status?.kind === 'done' ? AFTER : [];

  return (
    <Screen header={<Header title="Trang chủ" subtitle={`${p.name} · ${p.code}`} right={<DateBadge />} />}>
      {/* Bản rút gọn (08/11/2026): mỗi thẻ một điểm neo thị giác (vòng tiến độ, ô ngày hẹn, số diện tích),
          chữ phụ đưa vào chạm để xem hoặc sang Lịch trình. */}
      <Card hero style={{ padding: 20, gap: 14 }}>
        {treating && (
          <Pressable onPress={() => router.push('/schedule')} accessibilityRole="button" accessibilityLabel="Xem lịch trình của đợt" hitSlop={8} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}>
            <Text style={{ flex: 1, color: C.textSoft, fontSize: 14, fontWeight: '600' }} numberOfLines={1}>Đợt điều trị · {treating.w.code}</Text>
            <Text style={{ color: C.primary, fontSize: 14 }}>Lịch trình</Text>
            <Ionicons name="chevron-forward" size={16} color={C.primary} />
          </Pressable>
        )}
        {plan && pr && status ? (
          <>
            {/* Điểm neo: vòng tiến độ lớn bên trái, câu chính bên phải. Giai đoạn, liều, mốc xem lại nằm ở Lịch trình. */}
            <View accessible accessibilityRole="summary" accessibilityLabel={`${status.title}. ${status.detail}. Đã xong ${pr.done} trên ${pr.total} buổi.`} style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
              <Ring size={120} value={pr.done} max={pr.total} label={`${pr.done}/${pr.total}`} sub="buổi đã xong" color={statusColor === C.textSoft ? C.primary : statusColor} />
              <View style={{ flex: 1, gap: 6 }}>
                <Ionicons name={status.kind === 'done' ? 'checkmark-circle' : status.kind === 'over' ? 'alert-circle' : status.kind === 'rest' ? 'moon' : 'flash'} size={28} color={statusColor} />
                <Text style={{ fontSize: 22, lineHeight: 28, fontWeight: '700', color: statusColor }}>{status.title}</Text>
                <Text style={{ color: C.textSoft }}>{status.detail}</Text>
              </View>
            </View>
            {/* Cảnh báo đồng bộ thu thành một chip; chạm để đọc giải thích. Ngày nghỉ không cần cảnh báo. */}
            {dev && lastSyncDay !== today && status.kind !== 'rest' && (
              <Pressable
                onPress={() => notify('Chưa nhận dữ liệu hôm nay', dev.lastSync ? `Thiết bị gửi dữ liệu lần cuối ${fmtDateTime(dev.lastSync)}. Số buổi sẽ cập nhật khi thiết bị bật ở nơi có Wi-Fi.` : 'Thiết bị chưa gửi dữ liệu lần nào.')}
                accessibilityRole="button"
                accessibilityLabel="Chưa đồng bộ hôm nay. Chạm để xem chi tiết"
                style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 999, backgroundColor: C.amberSoft }}>
                <Ionicons name="cloud-offline-outline" size={18} color={C.amber} />
                <Text style={{ color: C.amber, fontWeight: '600', fontSize: 14 }}>Chưa đồng bộ hôm nay</Text>
                <Ionicons name="information-circle-outline" size={18} color={C.amber} />
              </Pressable>
            )}
            {/* Lối tắt vào luồng chính tại nhà: N02 sang T01, không phải vòng qua tab Thiết bị. */}
            {status.kind === 'treat' && p.deviceId && (
              <Button label="Nạp liệu trình vào máy" icon="arrow-down-circle-outline" onPress={() => router.push('/connect-device')} />
            )}
          </>
        ) : followUp ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="checkmark-done-circle" size={30} color={C.green} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.green }}>Vết thương {followUp.w.code} đã liền</Text>
                <Text style={{ color: C.textSoft }}>Đợt điều trị đã kết thúc. Không cần chiếu plasma nữa.</Text>
              </View>
            </View>
            <Muted>{nextCheck ? `Lần kiểm tra tiếp theo: ${fmtDate(nextCheck.date)} (${nextCheck.days} ngày sau khi liền). Bác sĩ sẽ chụp ảnh để chắc vết thương không mở lại.` : 'Đã qua các mốc theo dõi.'}</Muted>
            <Button
              label="Báo vết thương mở lại"
              icon="alert-circle-outline"
              variant="secondary"
              onPress={() => {
                addReport({ patientId: p.id, kind: 'symptom', content: `Vết thương ${followUp.w.code} (${followUp.w.location}) có dấu hiệu mở lại.` });
                notify('Đã ghi nhận', 'Bác sĩ phụ trách sẽ xem khi mở ứng dụng. Hãy gọi cho bác sĩ để hẹn khám. Nếu chảy máu, có mủ hoặc sốt, hãy gọi 115 hoặc đến cơ sở y tế, không chờ phản hồi trong ứng dụng.');
              }}
            />
          </>
        ) : awaiting ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="hourglass-outline" size={30} color={C.primary} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 22, fontWeight: '700', color: C.primary }}>Đã dừng chiếu, chờ bác sĩ xác nhận liền</Text>
                <Text style={{ color: C.textSoft }}>Bác sĩ ghi nhận vết thương {awaiting.w.code} đã khép ngày {fmtDate(awaiting.w.closureCheck1)}. Cần một lần khám nữa sau 2 tuần để xác nhận.</Text>
              </View>
            </View>
          </>
        ) : (
          <Muted>Chưa có đợt điều trị được bác sĩ xác nhận.</Muted>
        )}
        {steps.length > 0 && (
        <View style={{ gap: 10 }}>
          <Divider />
          {/* Gộp vào thẻ Hôm nay. Thu gọn mặc định: một dòng có số bước đã tích. Mở ra khi cần. */}
          <Pressable onPress={() => setOpenSteps(!openSteps)} accessibilityRole="button" accessibilityState={{ expanded: openSteps }} accessibilityLabel={`${status?.kind === 'treat' ? 'Trước khi chiếu' : 'Sau khi chiếu'}, đã làm ${steps.filter((t) => checked[t]).length} trên ${steps.length} bước`} style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Ionicons name="list" size={26} color={C.primary} />
            <Text style={{ flex: 1, fontSize: 18, fontWeight: '700', color: C.text }}>{status?.kind === 'treat' ? 'Trước khi chiếu' : 'Sau khi chiếu'}</Text>
            <Text style={{ color: steps.every((t) => checked[t]) ? C.green : C.textSoft, fontWeight: '700' }}>{steps.filter((t) => checked[t]).length}/{steps.length}</Text>
            <Ionicons name={openSteps ? 'chevron-up' : 'chevron-down'} size={22} color={C.textSoft} />
          </Pressable>
          {openSteps && steps.map((t) => {
            const on = !!checked[t];
            return (
              // Cả dòng là vùng bấm, cao tối thiểu 48 pt (Apple HIG 44 pt, Material 48 dp), có phản hồi khi chạm.
              <Pressable key={t} onPress={() => setChecked({ ...checked, [t]: !on })} accessibilityRole="checkbox" accessibilityLabel={t} accessibilityState={{ checked: on }} style={({ pressed }) => ({ minHeight: 48, paddingVertical: 6, marginHorizontal: -8, paddingHorizontal: 8, borderRadius: radius.s, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pressed ? C.surfaceMuted : 'transparent' })}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={28} color={on ? C.green : C.textSoft} />
                <Text style={{ flex: 1, color: C.text }}>{t}</Text>
              </Pressable>
            );
          })}
          {openSteps && <Muted>Theo hướng dẫn chung, bác sĩ có thể dặn khác.</Muted>}
        </View>
        )}
        {/* Lịch hẹn gần nhất gộp vào thẻ Hôm nay thay cho một thẻ riêng; danh sách đầy đủ ở Lịch trình. */}
        <Divider />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ flex: 1, color: C.textSoft, fontSize: 14, fontWeight: '600' }}>Lịch hẹn gần nhất</Text>
          {upcoming.length > 1 && <Text onPress={() => router.push('/schedule')} accessibilityRole="link" style={{ color: C.primary, fontWeight: '600', fontSize: 14, paddingVertical: 8 }}>Tất cả ({upcoming.length}) ›</Text>}
        </View>
        {next ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <DateTile date={next.date} today={today} />
            <Text style={{ flex: 1, color: C.text, fontWeight: '600', fontSize: 17 }}>{next.title}</Text>
            {/* Nút chuông thay cho nút chữ "Bật nhắc trên điện thoại". */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Bật nhắc lịch hẹn trên điện thoại"
              disabled={busy}
              style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? C.primarySoft : C.surfaceMuted })}
              onPress={async () => {
              setBusy(true);
              try {
                const r = await scheduleReminders(reminders);
                notify(
                  r.denied ? 'Chưa bật được nhắc' : 'Đã đặt nhắc',
                  r.denied ? 'Cần cho phép thông báo trong Cài đặt (trình duyệt không hỗ trợ).' : `${r.scheduled} thông báo lúc 8:00 các ngày hẹn.`,
                );
              } catch (e) {
                notify('Chưa bật được nhắc', String(e));
              } finally {
                setBusy(false);
              }
            }}>
              <Ionicons name="notifications-outline" size={24} color={C.primary} />
            </Pressable>
          </View>
        ) : (
          <Muted>Chưa có lịch hẹn.</Muted>
        )}
      </Card>

      {/* Một thẻ cho mỗi vết thương: diện tích, ảnh, mức độ và lời dặn của bác sĩ. Trước đây lời dặn lặp ở hai thẻ (đề xuất 4). */}
      <SectionTitle action="Lịch sử" onAction={() => router.navigate('/patient/history')}>Vết thương</SectionTitle>
      {wounds.length === 0 && <Card><Muted>Hồ sơ mới đang chờ bác sĩ phụ trách tiếp nhận và đánh giá.</Muted></Card>}
      {wounds.map((w) => {
        const ev = latestEvaluation(data, w.id, true);
        const img = data.images
          .filter((i) => i.woundId === w.id && i.areaCm2 !== null && i.status === 'labeled')
          .sort((a, b) => b.captureDate.localeCompare(a.captureDate))[0];
        const rv = treating && treating.w.id === w.id ? review : null;
        return (
          <Card key={w.id}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: C.text }}>{w.code} · {w.location}</Text>
            {/* Yêu cầu chụp lại nằm trong thẻ vết thương thay cho một thẻ viền đỏ riêng. */}
            {retakes.filter((im) => im.woundId === w.id).map((im) => (
              <TaskRow key={im.id} icon="camera-outline" tone="red" title={`Cần hẹn bác sĩ chụp lại ảnh ${im.capture?.sourceDateKnown === false ? 'chưa rõ ngày' : fmtDate(im.captureDate)}`} detail={im.retakeRequested!} onPress={() => router.push('/schedule')} />
            ))}
            {img ? (
              <View style={{ flexDirection: 'row', gap: 16, alignItems: 'center' }}>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                    <Text style={{ fontSize: 32, fontWeight: '600', color: C.primary }}>{formatAreaForName(img.areaCm2!).replace('.', ',')}</Text>
                    <Text style={{ fontSize: 18, fontWeight: '500', color: C.primary, marginBottom: 5 }}>cm²</Text>
                  </View>
                  {rv && rv.state !== 'no_data' && rv.reduction != null ? (
                    <View style={{ flexDirection: 'row' }}>
                      <Chip icon={rv.reduction >= 0 ? 'trending-down' : 'trending-up'} tone={rv.reduction >= 0 ? 'green' : 'amber'} label={`${rv.reduction >= 0 ? 'Giảm' : 'Tăng'} ${Math.round(Math.abs(rv.reduction) * 100)}% từ đầu đợt`} />
                    </View>
                  ) : null}
                  <Muted>{img.capture?.sourceDateKnown === false ? 'Ngày chụp chưa xác định' : 'Đo ' + fmtDate(img.captureDate).slice(0, 5)}</Muted>
                </View>
                <WoundPhoto image={img} style={{ width: 110, height: 82, borderRadius: radius.m }} />
              </View>
            ) : <Muted>Chưa có số đo do bác sĩ nhập.</Muted>}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {ev?.severity && <Chip label={`Mức độ: ${SEVERITY[ev.severity].label}`} tone={SEVERITY[ev.severity].tone} />}
              {ev && !(rv && rv.state !== 'no_data') && <Chip label={TREND[ev.trend].label} tone={TREND[ev.trend].tone} />}
            </View>
            {ev ? (
              <View style={{ gap: 4, padding: 12, borderRadius: radius.m, backgroundColor: C.surfaceMuted }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="chatbubble-ellipses" size={20} color={C.primary} />
                  <Text style={{ flex: 1, color: C.text, fontWeight: '600' }}>Lời dặn của bác sĩ</Text>
                  <Text style={{ color: C.textSoft, fontSize: 14 }}>{fmtDate(ev.date).slice(0, 5)}</Text>
                </View>
                {/* Hai dòng đầu, chạm để đọc hết. */}
                <Text onPress={() => setOpenNote(!openNote)} numberOfLines={openNote ? undefined : 2} style={{ color: C.text, lineHeight: 24 }}>{ev.instructions || ev.characteristics}</Text>
                {openNote && <Muted>{account(ev.doctorId)?.name ?? 'Bác sĩ phụ trách'}{ev.nextReview && ev.nextReview >= today ? ` · tái đánh giá ${fmtDate(ev.nextReview)}` : ''}</Muted>}
                <Text onPress={() => setOpenNote(!openNote)} accessibilityRole="button" style={{ color: C.primary, fontWeight: '600', paddingVertical: 8 }}>{openNote ? 'Thu gọn' : 'Đọc hết'}</Text>
              </View>
            ) : <Muted>Chưa có đánh giá được công bố. Không suy ra mức độ từ diện tích.</Muted>}
          </Card>
        );
      })}

      <Button label="Báo triệu chứng hoặc sự cố" icon="medkit-outline" variant="secondary" onPress={() => router.push('/report')} />
      <SimBadge />
    </Screen>
  );
}
