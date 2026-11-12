import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Chip, Divider, Empty, InfoRow, Muted, Notice, SectionTitle, Segmented, SimBadge, StatusChip, NumberTile } from '@/components/ui';
import { noteText } from '@/components/AdherenceCalendar';
import { ProgressRows } from '@/components/CourseCard';
import { courseProgress, isScheduled, localDay } from '@/lib/course';
import { CARE_ITEMS, careStatus, LIFECYCLE } from '@/lib/maintenance';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import type { Device } from '@/lib/types';
import { bar, C, T, space } from '@/theme';
import { CLOUD_LINK, cloudState } from '@/theme.status';

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
  // Bật tắt nguồn từ xa trái phương án S1 (nạp qua USB tại nhà); chỉ giữ trong bản phát triển để minh họa.
  const canControl = level === 'doctor' && __DEV__;
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
  // Kỹ thuật: chia ba thẻ để mỗi lần chỉ đọc một nhóm (bản rút gọn 08/11/2026). Vai trò khác thấy một trang.
  const [tab, setTab] = useState<'overview' | 'care' | 'log'>('overview');
  const [allSessions, setAllSessions] = useState(false);
  const [now] = useState(() => Date.now());
  const cloud = CLOUD_LINK[cloudState(device.online, device.lastSync, now)];
  const show = (t: typeof tab) => !tech || tab === t;
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
      {tech && <Segmented value={tab} onChange={setTab} options={[{ value: 'overview', label: 'Tổng quan' }, { value: 'care', label: 'Bảo trì' }, { value: 'log', label: 'Nhật ký' }]} />}
      {show('overview') && <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
          <Text style={{ fontSize: T.cardTitle, fontWeight: '800', color: C.text, flex: 1 }}>{device.code}</Text>
          {/* Kênh Wi-Fi tới máy chủ, tách chữ với kênh cáp USB ở T01 (V02). */}
          <StatusChip status={cloud} label={cloud.label} />
        </View>
        {patientView && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ fontSize: T.display, fontWeight: '700', color: C.primary }}>{restToday ? 'Nghỉ' : plan ? `${todayN}/${plan.sessionsPerDay ?? 1}` : todayN}</Text>
            <Text style={{ fontSize: T.body, color: C.textSoft, marginBottom: 6 }}>{restToday ? 'theo lịch hôm nay' : lastSyncDay === today ? 'lần chiếu hôm nay' : 'lần chiếu đã nhận hôm nay'}</Text>
          </View>
        )}
        {patientView
          ? device.tip ? <View style={{ flexDirection: 'row' }}><Chip icon="finger-print-outline" tone="teal" label={`Đầu phát riêng ${device.tip.code}`} /></View> : null
          : <InfoRow label="Đầu phát dùng riêng" value={device.tip ? `${device.tip.code} · cấp ${fmtDate(device.tip.issuedAt)}` : 'Chưa cấp'} />}
        {!patientView && <InfoRow label="Vòng đời" value={LIFECYCLE[device.lifecycle ?? 'ready'].label} />}
        {tech && <InfoRow label="Mẫu" value={device.model} />}
        {tech && <InfoRow label="Firmware" value={device.firmware} />}
        <InfoRow label="Đồng bộ gần nhất" value={device.lastSync ? fmtDateTime(device.lastSync) : 'Chưa từng đồng bộ'} />
        {!patientView && <InfoRow label="Gán cho" value={owner ? `${owner.code}` : 'Chưa gán'} />}
        {!patientView && <InfoRow label="Trạng thái nguồn" value={powerLabel} />}
        {patientView && !device.online && <Muted>Số liệu cập nhật khi thiết bị trực tuyến trở lại.</Muted>}
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
        {!patientView && <>
        <Divider />
        <SectionTitle icon="ribbon-outline">Tiến độ đợt điều trị</SectionTitle>
        {!pr ? (
          <Muted>Bệnh nhân chưa có đợt điều trị đang áp dụng.</Muted>
        ) : (
          <>
            <ProgressRows pr={pr} />
            <Muted>Chỉ số tuân thủ, không phải đánh giá vết thương. Ngày nghỉ không tính là bỏ lỡ.</Muted>
          </>
        )}
        </>}
      </Card>}

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
      {tech && tab === 'care' && <Card>
        <SectionTitle icon="construct-outline">Chăm sóc thiết bị</SectionTitle>
        {care.map((c) => {
          const pct = Math.max(0, Math.min(1, c.remaining / c.item.everySessions));
          const color = c.due ? bar.red : pct < 0.5 ? bar.amber : bar.green;
          return (
            <View key={c.item.id} style={{ gap: space.xs, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ flex: 1, fontWeight: '600', color: C.text }}>{c.item.label}</Text>
                <Text style={{ color: c.due ? C.red : C.textSoft, fontWeight: c.due ? '700' : '400' }}>
                  {c.item.everySessions === 1 ? (c.due ? `chưa vệ sinh sau ${c.used} phiên` : 'đã vệ sinh sau phiên gần nhất') : c.remaining > 0 ? `còn ~${c.remaining} lần` : `quá ${-c.remaining} lần`}
                </Text>
              </View>
              <View accessible accessibilityRole="progressbar" accessibilityLabel={`${c.item.label}: còn ${Math.max(0, c.remaining)} trên ${c.item.everySessions} lần`} style={{ height: 6, borderRadius: 3, backgroundColor: C.surfaceMuted, overflow: 'hidden' }}>
                <View style={{ width: `${pct * 100}%`, height: '100%', backgroundColor: color }} />
              </View>
              <Text style={{ fontSize: T.caption, color: C.textFaint }}>
                {c.item.everySessions === 1 ? 'Sau mỗi phiên' : `Chu kỳ ${c.item.everySessions} phiên`}, {c.item.doneBy === 'patient' ? 'bệnh nhân tự làm' : 'kỹ thuật làm'}.{'\n'}Lần gần nhất: {c.lastDone ? fmtDate(c.lastDone) : 'chưa ghi nhận'}
              </Text>
              <Button label="Đánh dấu đã làm" variant="ghost" icon="checkmark-done-outline" onPress={() => doCare(c.item.id, c.item.label)} />
            </View>
          );
        })}
        <Muted>Cách vệ sinh là giả định cho demo, theo hướng dẫn nhà sản xuất khi có.</Muted>
        {device.lifecycle === 'in_use' && <>
        <Divider />
        <Muted>Máy đang giao cho bệnh nhân. Bác sĩ phụ trách thu hồi trên hồ sơ bệnh nhân.</Muted>
        </>}
        {device.lifecycle !== 'in_use' && LIFECYCLE[device.lifecycle ?? 'ready'].next && <>
        <Divider />
        <SectionTitle icon="sync-outline">Vòng đời thiết bị cho thuê</SectionTitle>
        <Muted>Thu hồi, khử khuẩn, kiểm tra rồi mới cấp lại. Đầu phát cũ không cấp lại.</Muted>
        <Button
          label={LIFECYCLE[device.lifecycle ?? 'ready'].action!}
          icon="arrow-forward-circle-outline"
          variant="secondary"
          onPress={() => confirm(LIFECYCLE[device.lifecycle ?? 'ready'].action!, device.lifecycle === 'in_use' ? 'Gỡ thiết bị khỏi bệnh nhân và bỏ đầu phát đang dùng.' : 'Ghi nhận bước này đã làm xong.', () => {
            try { setLifecycle(device.id, LIFECYCLE[device.lifecycle ?? 'ready'].next as NonNullable<Device['lifecycle']>); } catch (e) { notify('Chưa ghi được', e instanceof Error ? e.message : String(e)); }
          }, 'Xác nhận')}
        />
        </>}
      </Card>}

      {/* Mô phỏng phiên kiểu IoMT cũ, trái phương án S1; chỉ hiện trong bản phát triển. */}
      {__DEV__ && tech && tab === 'log' && <Card>
        <SectionTitle icon="pulse-outline">Mô phỏng thiết bị IoMT (bản phát triển)</SectionTitle>
        <Muted>Chưa có ESP32 thật. Thiết bị không phát khi chưa có đợt, vào ngày nghỉ hoặc khi đã đủ số lần.</Muted>
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


      {!patientView && show('overview') && <View style={{ flexDirection: 'row', gap: 10 }}>
        <NumberTile value={sessions.length} label={tech ? 'Số phiên (đã bỏ bản trùng)' : 'Số phiên'} tone="gray" icon="pulse-outline" />
        <NumberTile value={`${totalMin} phút`} label="Tổng thời gian" tone="gray" icon="time-outline" />
      </View>}
      {tech && tab === 'log' && rawCount !== sessions.length && (
        <Muted>Đã bỏ {rawCount - sessions.length} bản ghi thiết bị gửi lại trùng mã phiên.</Muted>
      )}

      {show('log') && <Card>
        <SectionTitle icon="calendar-outline">{patientView ? 'Số lần điều trị 7 ngày qua' : '7 ngày gần nhất'}</SectionTitle>
        {/* Ngày sau lần đồng bộ cuối là "chưa có dữ liệu", không phải "không sử dụng" (đặc tả 7.2).
            Các ngày này luôn liền nhau ở cuối khoảng, nên gộp thành một câu thay vì lặp từng dòng. */}
        {unsyncedDays.length > 0 && (
          <Notice icon="cloud-offline-outline">{unsyncedText}</Notice>
        )}
        {/* Ô biểu tượng thay chữ lặp từng dòng: thanh màu = đã chiếu, trăng = nghỉ theo lịch, chấm than = bỏ lỡ. */}
        {syncedDays.map(({ d, n }) => {
          const rest = !!plan && !isScheduled(plan, d);
          const kind = n > 0 ? `${n} lần` : rest ? 'Nghỉ theo lịch' : plan ? 'Bỏ lỡ' : 'Không sử dụng';
          return (
            <View key={d} accessible accessibilityLabel={`${fmtDate(d)}: ${kind}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ width: 46, color: C.textSoft, fontSize: T.caption }}>{fmtDate(d).slice(0, 5)}</Text>
              <View style={{ flex: 1, height: 22, backgroundColor: C.surfaceMuted, borderRadius: 8, overflow: 'hidden', justifyContent: 'center' }}>
                {n > 0 && <View style={{ width: `${(n / maxN) * 100}%`, height: '100%', backgroundColor: C.primary, borderRadius: 8 }} />}
                {n === 0 && <Ionicons name={rest ? 'moon-outline' : 'alert-circle'} size={16} color={rest ? C.textFaint : C.amber} style={{ marginLeft: 8 }} />}
              </View>
              <Text style={{ width: 28, textAlign: 'right', fontWeight: '700', color: C.text }}>{n > 0 ? `${n}×` : ''}</Text>
            </View>
          );
        })}
        <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}><View style={{ width: 14, height: 10, borderRadius: 3, backgroundColor: C.primary }} /><Text style={{ fontSize: T.caption, color: C.textSoft }}>Đã chiếu</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}><Ionicons name="moon-outline" size={14} color={C.textFaint} /><Text style={{ fontSize: T.caption, color: C.textSoft }}>Nghỉ</Text></View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.xs }}><Ionicons name="alert-circle" size={14} color={C.amber} /><Text style={{ fontSize: T.caption, color: C.textSoft }}>Bỏ lỡ</Text></View>
        </View>
        {!patientView && <>
        <Divider />
        <SectionTitle icon="list-outline">Phiên sử dụng</SectionTitle>
        {sessions.length === 0 && <Empty text="Chưa có phiên nào được ghi nhận." />}
        {sessions.slice(0, allSessions ? 30 : 5).map((s) => (
          <View key={s.sessionId} style={{ paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: C.border, gap: space.xxs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontWeight: '600', color: C.text }}>{fmtDateTime(s.start)}</Text>
              <Text style={{ color: C.textSoft }}>{s.durationMin} phút</Text>
            </View>
            <Text style={{ fontSize: T.caption, color: C.textFaint }}>
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
        {sessions.length > 5 && <Button label={allSessions ? 'Thu gọn' : `Xem thêm (${Math.min(sessions.length, 30) - 5})`} variant="ghost" onPress={() => setAllSessions(!allSessions)} />}
        </>}
      </Card>}
    </>
  );
}
