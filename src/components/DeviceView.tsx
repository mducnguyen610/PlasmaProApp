import { View } from 'react-native';
import { Text } from '@/components/Text';

import { Button, Card, Chip, Empty, InfoRow, Muted, SectionTitle, SimBadge, Stat } from '@/components/ui';
import { computeAdherence } from '@/lib/adherence';
import { confirm, notify } from '@/lib/dialog';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';
import type { Device } from '@/lib/types';
import { C } from '@/theme';

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
  const { data, setDevicePower, simulateSession } = useStore();
  const { sessionsOf, patient, activePlan } = useLookups();
  const sessions = sessionsOf(device.id);
  const rawCount = data.sessions.filter((s) => s.deviceId === device.id).length;
  const owner = patient(device.patientId);
  const plan = owner ? activePlan(owner.id) : undefined;
  const lastSyncDay = device.lastSync?.slice(0, 10) ?? null;
  const days = lastDays(7, new Date().toISOString().slice(0, 10));
  const perDay = days.map((d) => ({ d, n: sessions.filter((s) => s.start.slice(0, 10) === d && s.status === 'completed').length }));
  const adh = computeAdherence(sessions, plan?.status === 'active' ? plan : undefined, days, lastSyncDay);
  const pct = (a: number, b: number) => (b === 0 ? '—' : `${Math.round((a / b) * 100)}%`);
  const maxN = Math.max(1, ...perDay.map((x) => x.n));
  const totalMin = sessions.reduce((s, x) => s + x.durationMin, 0);
  const todayN = perDay[0]?.n ?? 0;

  const powerLabel = device.power === 'pending' ? 'Đang chờ thiết bị xác nhận…' : device.power === 'on' ? 'Đang bật' : 'Đang tắt';

  return (
    <>
      {device.simulated && <SimBadge />}
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={{ fontSize: 18, fontWeight: '800', color: C.text, flex: 1 }}>{device.code}</Text>
          <Chip label={device.online ? 'Online' : 'Offline'} tone={device.online ? 'green' : 'gray'} icon={device.online ? 'wifi' : 'cloud-offline-outline'} />
        </View>
        {patientView && (
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
            <Text style={{ fontSize: 32, fontWeight: '700', color: C.primary }}>{plan?.sessionsPerDay != null ? `${todayN}/${plan.sessionsPerDay}` : todayN}</Text>
            <Text style={{ fontSize: 16, color: C.textSoft, marginBottom: 6 }}>lần điều trị hôm nay</Text>
          </View>
        )}
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

      {tech && <Card>
        <SectionTitle icon="pulse-outline">Mô phỏng thiết bị IoMT</SectionTitle>
        <Muted>
          Chưa có kết nối ESP32/máy chủ thật. Nút dưới đây giả lập thiết bị chạy một phiên rồi gửi nhật ký lên; thiết bị tự ngắt nếu vượt số lần/ngày hoặc chưa đủ giãn cách theo liệu trình.
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
        <SectionTitle icon="ribbon-outline">Tuân thủ liệu trình (7 ngày)</SectionTitle>
        {!plan || plan.status !== 'active' || (plan.sessionsPerDay == null && plan.minIntervalMin == null) ? (
          <Muted>Liệu trình đang áp dụng chưa đặt số lần/ngày hoặc giãn cách nên chưa đánh giá được.</Muted>
        ) : (
          <>
            <InfoRow label="Ngày có dữ liệu đồng bộ" value={`${adh.daysWithData}/7`} />
            {plan.sessionsPerDay != null && <InfoRow label={`Ngày đủ ${plan.sessionsPerDay} lần`} value={`${adh.daysMet}/${adh.daysWithData} (${pct(adh.daysMet, adh.daysWithData)})`} />}
            {plan.minIntervalMin != null && (
              <InfoRow label={`Giãn cách ≥ ${plan.minIntervalMin} phút`} value={`${adh.intervalPairs - adh.intervalViolations}/${adh.intervalPairs} (${pct(adh.intervalPairs - adh.intervalViolations, adh.intervalPairs)})`} />
            )}
            <InfoRow label="Phiên bị thiết bị ngắt do vượt ngưỡng" value={String(adh.blocked)} />
            <Muted>Chỉ số tuân thủ từ nhật ký thiết bị, không phải đánh giá tình trạng vết thương.</Muted>
          </>
        )}
      </Card>}

      {!patientView && <View style={{ flexDirection: 'row', gap: 10 }}>
        <Stat value={sessions.length} label={tech ? 'Phiên (đã bỏ trùng lặp)' : 'Số phiên'} />
        <Stat value={`${totalMin}′`} label="Tổng thời gian" tone="violet" />
        <Stat value={plan?.sessionsPerDay ?? '—'} label="Mục tiêu / ngày" tone="teal" />
      </View>}
      {tech && rawCount !== sessions.length && (
        <Muted>Đã bỏ {rawCount - sessions.length} bản ghi thiết bị gửi lại trùng mã phiên.</Muted>
      )}

      <Card>
        <SectionTitle icon="calendar-outline">{patientView ? 'Số lần điều trị 7 ngày qua' : '7 ngày gần nhất'}</SectionTitle>
        {perDay.map(({ d, n }) => {
          // Phân biệt "không sử dụng" với "chưa có dữ liệu/chưa đồng bộ" (đặc tả 7.2).
          const unsynced = n === 0 && (!lastSyncDay || d > lastSyncDay);
          return (
            <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ width: 46, color: C.textSoft, fontSize: 12 }}>{fmtDate(d).slice(0, 5)}</Text>
              <View style={{ flex: 1, height: 22, backgroundColor: C.surfaceMuted, borderRadius: 8, overflow: 'hidden', justifyContent: 'center' }}>
                {n > 0 && <View style={{ width: `${(n / maxN) * 100}%`, height: '100%', backgroundColor: C.primary, borderRadius: 8 }} />}
                {n === 0 && <Text style={{ fontSize: 12, color: unsynced ? C.amber : C.textFaint, marginLeft: 8 }}>{unsynced ? (patientView ? 'Chưa có dữ liệu' : 'Chưa có dữ liệu / chưa đồng bộ') : 'Không sử dụng'}</Text>}
              </View>
              <Text style={{ width: 28, textAlign: 'right', fontWeight: '700', color: C.text }}>{n > 0 ? `${n}×` : ''}</Text>
            </View>
          );
        })}
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
            <Text style={{ fontSize: 12, color: C.textFaint }}>
              {tech
                ? `Mã phiên ${s.sessionId} · ${STATUS[s.status]} · ${SOURCE[s.source]}${s.energyWh !== null ? ` · ${s.energyWh} Wh` : ''}`
                : STATUS[s.status]}
            </Text>
          </View>
        ))}
      </Card>}
    </>
  );
}
