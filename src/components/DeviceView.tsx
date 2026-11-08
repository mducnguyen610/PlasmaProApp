import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Chip, Empty, InfoRow, Muted, Notice, SectionTitle, SimBadge, Stat } from '@/components/ui';
import { noteText } from '@/components/AdherenceCalendar';
import { ProgressRows } from '@/components/CourseCard';
import { courseProgress, isScheduled, localDay } from '@/lib/course';
import { CARE_ITEMS, careStatus, LIFECYCLE } from '@/lib/maintenance';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import type { Device } from '@/lib/types';
import { bar, C } from '@/theme';

const SOURCE = { device: 'Thiết bị gửi', manual: 'Nhập tay', simulated: 'Mô phỏng' } as const;
const STATUS = { completed: 'Hoàn tất', interrupted: 'Bị ngắt', over_limit: 'Ngắt do vượt ngưỡng' } as const;

function lastDays(n: number, end: string): string[] {
  const out: string[] = [];
  const d = new Date(`${end}T00:00:00Z`);
  for (let i = 0; i < n; i++) {
    out.push(new Date(d.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  return out;
}

/**
 * Mức chi tiết theo vai trò:
 * - patient: trạng thái kết nối, số lần hôm nay, 7 ngày gần nhất.
 * - doctor: thêm tuân thủ liệu trình, điều khiển nguồn, danh sách phiên rút gọn.
 * - tech: đầy đủ thông số (mẫu, firmware, mã phiên, năng lượng, nguồn bản ghi) và mô phỏng thiết bị.
 */
export type DeviceViewLevel = 'patient' | 'doctor' | 'tech';

/** Nhật ký thiết bị: online/offline, đồng bộ, phiên sử dụng đã bỏ trùng lặp, điều khiển nguồn có xác nhận. */
export function DeviceView({ device, level }: { device: Device; level: DeviceViewLevel }) {
  const tech = level === 'tech';
  const patientView = level === 'patient';
  const canControl = level === 'doctor';
  const { data, setDevicePower, simulateSession, markCareDone, setLifecycle } = useStore();
  const { sessionsOf, patient, woundsOf, coursePlan } = useLookups();
  const sessions = sessionsOf(device.id);
  const rawCount = data.sessions.filter((s) => s.deviceId === device.id).length;
  const owner = patient(device.patientId);
  // Đợt đang áp dụng của bệnh nhân giữ thiết bị (thiết bị tại nhà khóa theo đợt này).
  const plan = owner ? woundsOf(owner.id).map((w) => coursePlan(w.id)).find((x) => x?.status === 'active') : undefined;
  const lastSyncDay = (device.lastSync ? localDay(device.lastSync) : null);
  const days = lastDays(7, localDay());
  const perDay = days.map((d) => ({ d, n: sessions.filter((s) => localDay(s.start) === d && s.status === 'completed').length }));
  const today = days[0];
  const pr = plan ? courseProgress(plan, sessions.filter((s) => !s.woundId || s.woundId === plan.woundId), today, lastSyncDay) : null;
  const restToday = plan ? !isScheduled(plan, today) : false;
  const maxN = Math.max(1, ...perDay.map((x) => x.n));
  const totalMin = sessions.reduce((s, x) => s + x.durationMin, 0);
  const todayN = perDay[0]?.n ?? 0;
  const care = CARE_ITEMS.map((it) => careStatus(it, sessions, device.care?.[it.id]));
  const patientDue = care.filter((c) => c.due);
  const doCare = (itemId: string, label: string) =>
    confirm(label, 'Ghi nhận đã làm xong; bộ đếm của mục này bắt đầu lại từ 0.', () => {
      try { markCareDone(device.id, itemId); } catch (e) { notify('Chưa ghi được', e instanceof Error ? e.message : String(e)); }
    }, 'Đã làm xong');
  const unsyncedDays = perDay.filter((x) => !lastSyncDay || x.d > lastSyncDay);
  const syncedDays = perDay.filter((x) => lastSyncDay && x.d <= lastSyncDay);
  const oldest = unsyncedDays[unsyncedDays.length - 1]?.d;
  const unsyncedText =
    unsyncedDays.length === perDay.length
      ? patientView
        ? `Thiết bị chưa gửi dữ liệu ${perDay.length} ngày qua. Hãy bật thiết bị ở nơi có Wi-Fi để thiết bị gửi số lần điều trị.`
        : `Chưa có dữ liệu ${perDay.length} ngày qua (${device.lastSync ? `đồng bộ lần cuối ${fmtDateTime(device.lastSync)}` : 'chưa từng đồng bộ'}). Không tính là không sử dụng.`
      : unsyncedDays.length === 1
        ? patientView
          ? 'Hôm nay thiết bị chưa gửi dữ liệu.'
          : 'Hôm nay chưa có dữ liệu đồng bộ.'
        : patientView
          ? `Thiết bị chưa gửi dữ liệu từ ngày ${fmtDate(oldest).slice(0, 5)} đến nay. Hãy bật thiết bị ở nơi có Wi-Fi.`
          : `Chưa có dữ liệu từ ${fmtDate(oldest).slice(0, 5)} đến nay (chưa đồng bộ). Không tính là không sử dụng.`;

  const powerLabel = device.power === 'pending' ? 'Đang chờ thiết bị xác nhận…' : device.power === 'on' ? 'Đang bật' : 'Đang tắt';

  return (
    <>
      {device.simulated && <SimBadge />}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, flex: 1 }}>{device.code}</Text>
          <Chip label={device.online ? 'Đang kết nối' : 'Mất kết nối'} tone={device.online ? 'green' : 'gray'} icon={device.online ? 'wifi' : 'cloud-offline-outline'} />
        </View>
        {patientView && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: C.primary }}>{restToday ? 'Nghỉ' : plan ? `${todayN}/${plan.sessionsPerDay ?? 1}` : todayN}</Text>
            <Text style={{ fontSize: 16, color: C.textSoft, marginBottom: 6 }}>{restToday ? 'theo lịch hôm nay' : lastSyncDay === today ? 'lần chiếu hôm nay' : 'lần chiếu đã nhận hôm nay'}</Text>
          </View>
        )}
        {device.tip
          ? <InfoRow label="Đầu phát dùng riêng" value={`${device.tip.code} · cấp ${fmtDate(device.tip.issuedAt)}`} />
          : !patientView && <InfoRow label="Đầu phát dùng riêng" value="Chưa cấp" />}
        {patientView && device.tip && <Muted>Đầu phát chỉ dùng cho bạn, không dùng chung. Thay khi hết đợt hoặc khi hỏng.</Muted>}
        {!patientView && <InfoRow label="Vòng đời" value={LIFECYCLE[device.lifecycle ?? 'ready'].label} />}
        {tech && <InfoRow label="Mẫu" value={device.model} />}
        {tech && <InfoRow label="Firmware" value={device.firmware} />}
        <InfoRow label="Đồng bộ gần nhất" value={device.lastSync ? fmtDateTime(device.lastSync) : 'Chưa từng đồng bộ'} />
        {!patientView && <InfoRow label="Gán cho" value={owner ? `${owner.code}` : 'Chưa gán'} />}
        {!patientView && <InfoRow label="Trạng thái nguồn" value={powerLabel} />}
        {patientView && !device.online && <Muted>Thiết bị đang offline. Số liệu sẽ cập nhật khi thiết bị kết nối lại.</Muted>}
        {canControl && (
          <Button
            label={device.power === 'on' ? 'Ngắt nguồn thiết bị' : 'Bật nguồn thiết bị'}
            icon="power"
            variant={device.power === 'on' ? 'danger' : 'primary'}
            loading={device.power === 'pending'}
            onPress={() =>
              confirm(
                device.power === 'on' ? 'Ngắt nguồn' : 'Bật nguồn',
                'Lệnh được gửi tới thiết bị; trạng thái chỉ đổi khi thiết bị xác nhận. Thiết bị offline sẽ không nhận lệnh.',
                () => setDevicePower(device.id, device.power !== 'on'),
                'Gửi lệnh',
              )
            }
          />
        )}
        {canControl && <Muted>Phạm vi điều khiển theo khả năng phần cứng thực tế và thống nhất với nhóm thiết bị.</Muted>}
      </Card>

      {/* Chăm sóc thiết bị (mẫu myAir). Bệnh nhân chỉ thấy mục đến hạn; kỹ thuật thấy đủ thanh tuổi thọ. */}
      {patientView && patientDue.map((c) => (
        <Card key={c.item.id} style={{ borderWidth: 1.5, borderColor: C.amber }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Ionicons name="construct-outline" size={22} color={C.amber} />
            <Text style={{ flex: 1, fontWeight: '700', color: C.text }}>
              {c.item.doneBy === 'patient' ? `Đến lúc ${c.item.label.toLowerCase()}` : `Cần ${c.item.label.toLowerCase()}`}
            </Text>
          </View>
          <Muted>{c.item.everySessions === 1 ? 'Sau mỗi lần chiếu.' : c.remaining > 0 ? `Còn khoảng ${c.remaining} lần dùng.` : 'Đã đến hạn.'} {c.item.howTo}</Muted>
          {c.item.doneBy === 'patient'
            ? <Button label="Tôi đã làm xong" icon="checkmark" variant="secondary" onPress={() => doCare(c.item.id, c.item.label)} />
            : <Muted>Kỹ thuật viên sẽ làm khi tái khám. Bạn vẫn dùng thiết bị bình thường.</Muted>}
        </Card>
      ))}
      {tech && <Card>
        <SectionTitle icon="construct-outline">Chăm sóc thiết bị</SectionTitle>
        {care.map((c) => {
          const pct = Math.max(0, Math.min(1, c.remaining / c.item.everySessions));
          const color = c.due ? bar.red : pct < 0.5 ? bar.amber : bar.green;
          return (
            <View key={c.item.id} style={{ gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontWeight: '600', color: C.text }}>{c.item.label}</Text>
                <Text style={{ color: c.due ? C.red : C.textSoft, fontWeight: c.due ? '700' : '400' }}>
                  {c.item.everySessions === 1 ? (c.due ? `chưa vệ sinh sau ${c.used} phiên` : 'đã vệ sinh sau phiên gần nhất') : c.remaining > 0 ? `còn ~${c.remaining} lần` : `quá ${-c.remaining} lần`}
                </Text>
              </View>
              <View accessible accessibilityRole="progressbar" accessibilityLabel={`${c.item.label}: còn ${Math.max(0, c.remaining)} trên ${c.item.everySessions} lần`} style={{ height: 6, borderRadius: 3, backgroundColor: C.surfaceMuted, overflow: 'hidden' }}>
                <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color }} />
              </View>
              <Text style={{ fontSize: 13, color: C.textFaint }}>
                {c.item.everySessions === 1 ? 'Sau mỗi phiên' : `Chu kỳ ${c.item.everySessions} phiên`} · {c.item.doneBy === 'patient' ? 'bệnh nhân tự làm' : 'kỹ thuật làm'} · lần gần nhất {c.lastDone ? fmtDate(c.lastDone) : 'chưa ghi nhận'}
              </Text>
              <Button label="Đánh dấu đã làm" variant="ghost" icon="checkmark-done-outline" onPress={() => doCare(c.item.id, c.item.label)} />
            </View>
          );
        })}
        <Muted>Vệ sinh đầu phát sau mỗi phiên vì vết thương có thể nhiễm khuẩn đa kháng; đầu phát dùng riêng cho từng bệnh nhân. Cách vệ sinh là giả định cho demo, phải theo hướng dẫn của nhà sản xuất.</Muted>
      </Card>}

      {tech && LIFECYCLE[device.lifecycle ?? 'ready'].next && <Card>
        <SectionTitle icon="sync-outline">Vòng đời thiết bị cho thuê</SectionTitle>
        <Muted>Thiết bị cho thuê theo đợt (slide 24): thu hồi khi hết đợt, khử khuẩn, kiểm tra rồi mới cấp cho bệnh nhân khác. Đầu phát cũ không cấp lại.</Muted>
        <Button
          label={LIFECYCLE[device.lifecycle ?? 'ready'].action!}
          icon="arrow-forward-circle-outline"
          variant="secondary"
          onPress={() => confirm(LIFECYCLE[device.lifecycle ?? 'ready'].action!, device.lifecycle === 'in_use' ? 'Gỡ thiết bị khỏi bệnh nhân và bỏ đầu phát đang dùng.' : 'Ghi nhận bước này đã làm xong.', () => {
            try { setLifecycle(device.id, LIFECYCLE[device.lifecycle ?? 'ready'].next as NonNullable<Device['lifecycle']>); } catch (e) { notify('Chưa ghi được', e instanceof Error ? e.message : String(e)); }
          }, 'Xác nhận')}
        />
      </Card>}

      {tech && <Card>
        <SectionTitle icon="pulse-outline">Mô phỏng thiết bị IoMT</SectionTitle>
        <Muted>
          Chưa có kết nối ESP32/máy chủ thật. Nút dưới đây giả lập thiết bị chạy một phiên rồi gửi nhật ký lên. Thiết bị tại nhà bị khóa theo đợt: không phát khi chưa có đợt đang áp dụng, vào ngày nghỉ theo lịch, hoặc khi đã đủ số lần của buổi.
        </Muted>
        <Button
          label="Giả lập một phiên điều trị"
          icon="play-circle-outline"
          variant="secondary"
          onPress={() => {
            const r = simulateSession(device.id);
            notify(r.ok ? 'Phiên hoàn tất (mô phỏng)' : 'Thiết bị ngắt / chưa đồng bộ (mô phỏng)', r.message);
          }}
        />
      </Card>}

      {!patientView && <Card>
        <SectionTitle icon="ribbon-outline">Tiến độ đợt điều trị</SectionTitle>
        {!pr ? (
          <Muted>Bệnh nhân chưa có đợt điều trị đang áp dụng.</Muted>
        ) : (
          <>
            <ProgressRows pr={pr} />
            <Muted>Tính theo ngày có buổi của đợt, ngày nghỉ theo lịch không bị tính là bỏ lỡ. Đây là chỉ số tuân thủ, không phải đánh giá vết thương.</Muted>
          </>
        )}
      </Card>}

      {!patientView && <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat value={sessions.length} label={tech ? 'Phiên (đã bỏ trùng lặp)' : 'Số phiên'} />
        <Stat value={`${totalMin}′`} label="Tổng thời gian" tone="violet" />
        <Stat value={pr ? `${pr.done}/${pr.total}` : '—'} label="Buổi của đợt" tone="teal" />
      </View>}
      {tech && rawCount !== sessions.length && (
        <Muted>Đã bỏ {rawCount - sessions.length} bản ghi thiết bị gửi lại trùng mã phiên.</Muted>
      )}

      <Card>
        <SectionTitle icon="calendar-outline">{patientView ? 'Số lần điều trị 7 ngày qua' : '7 ngày gần nhất'}</SectionTitle>
        {/* Ngày sau lần đồng bộ cuối là "chưa có dữ liệu", không phải "không sử dụng" (đặc tả 7.2).
            Các ngày này luôn liền nhau ở cuối khoảng, nên gộp thành một câu thay vì lặp từng dòng. */}
        {unsyncedDays.length > 0 && (
          <Notice icon="cloud-offline-outline">{unsyncedText}</Notice>
        )}
        {syncedDays.map(({ d, n }) => (
          <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={{ width: 46, color: C.textSoft, fontSize: 13 }}>{fmtDate(d).slice(0, 5)}</Text>
            <View style={{ flex: 1, height: 22, backgroundColor: C.surfaceMuted, borderRadius: 8, overflow: 'hidden', justifyContent: 'center' }}>
              {n > 0 && <View style={{ width: `${(n / maxN) * 100}%`, height: '100%', backgroundColor: C.primary, borderRadius: 8 }} />}
              {n === 0 && <Text style={{ fontSize: 13, color: C.textFaint, marginLeft: 8 }}>{plan && !isScheduled(plan, d) ? 'Nghỉ theo lịch' : plan ? 'Bỏ lỡ' : 'Không sử dụng'}</Text>}
            </View>
            <Text style={{ width: 28, textAlign: 'right', fontWeight: '700', color: C.text }}>{n > 0 ? `${n}×` : ''}</Text>
          </View>
        ))}
      </Card>

      {!patientView && <Card>
        <SectionTitle icon="list-outline">Phiên sử dụng</SectionTitle>
        {sessions.length === 0 && <Empty text="Chưa có phiên nào được ghi nhận." />}
        {sessions.slice(0, tech ? 15 : 5).map((s) => (
          <View key={s.sessionId} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '600', color: C.text }}>{fmtDateTime(s.start)}</Text>
              <Text style={{ color: C.textSoft }}>{s.durationMin} phút</Text>
            </View>
            <Text style={{ fontSize: 13, color: C.textFaint }}>
              {tech
                ? `Mã phiên ${s.sessionId} · ${STATUS[s.status]} · ${SOURCE[s.source]}${s.energyWh !== null ? ` · ${s.energyWh} Wh` : ''}`
                : STATUS[s.status]}
              {(() => {
                const n = data.sessionNotes.find((x) => x.sessionId === s.sessionId);
                return n ? ` · ${noteText(n)}` : '';
              })()}
            </Text>
          </View>
        ))}
      </Card>}
    </>
  );
}
