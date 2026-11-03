import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/Text';
import { Button, Card, HeaderButton, Muted } from '@/components/ui';
import { monthCells, type DayCell, type DayKind } from '@/lib/adherence';
import { notify } from '@/lib/dialog';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Reminder } from '@/lib/reminders';
import type { DeviceSession, TreatmentPlan } from '@/lib/types';
import { C } from '@/theme';

// Ngưỡng cảnh báo đau giống màn Báo triệu chứng; đề xuất cho demo, cần bác sĩ xác nhận.
const HIGH_PAIN = 7;
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Mỗi trạng thái có biểu tượng và chữ riêng, không chỉ dựa vào màu (khác bản Nerivio). */
const KIND: Record<Exclude<DayKind, 'outside'>, { label: string; color: string; bg: string; icon?: 'checkmark' | 'alert' }> = {
  met: { label: 'Đủ', color: C.green, bg: C.greenSoft, icon: 'checkmark' },
  partial: { label: 'Thiếu', color: C.amber, bg: C.amberSoft },
  over: { label: 'Quá số lần', color: C.amber, bg: C.amberSoft, icon: 'alert' },
  none: { label: 'Không dùng', color: C.red, bg: C.redSoft },
  unsynced: { label: 'Chưa có dữ liệu', color: C.textSoft, bg: C.neutralSoft },
  today: { label: 'Hôm nay', color: C.primary, bg: C.primarySoft },
};

const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
const time = (iso: string) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

function cellText(c: DayCell, target: number | null | undefined) {
  if (c.kind === 'unsynced') return '?';
  if (c.kind === 'met' && target == null) return `${c.count}`;
  return target != null ? `${c.count}/${target}` : `${c.count}`;
}

/**
 * Lịch tuân thủ theo tháng (mẫu "Migraine diary" của Nerivio): mỗi ngày một ô có trạng thái,
 * chạm vào ngày để xem các phiên và ghi mức đau trước/sau phiên.
 */
export function AdherenceCalendar({ sessions, plan, lastSyncDay, canEdit, reminders = [] }: { sessions: DeviceSession[]; plan?: TreatmentPlan; lastSyncDay: string | null; canEdit: boolean; reminders?: Reminder[] }) {
  const { data, setSessionPain } = useStore();
  const today = new Date().toISOString().slice(0, 10);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(today);
  const [editing, setEditing] = useState<string | null>(null);
  const [before, setBefore] = useState<number | undefined>();
  const [after, setAfter] = useState<number | undefined>();
  const target = plan?.status === 'active' ? plan.sessionsPerDay : null;
  const cells = monthCells(month, sessions, target, lastSyncDay, plan?.startDate ?? null, plan?.endDate ?? null, today);
  const daySessions = selected ? sessions.filter((s) => s.start.slice(0, 10) === selected).sort((a, b) => a.start.localeCompare(b.start)) : [];
  const note = (id: string) => data.sessionNotes.find((n) => n.sessionId === id);
  const [y, m] = month.split('-');
  const selectedCell = cells.find((c) => c.date === selected);

  const startEdit = (id: string) => {
    const n = note(id);
    setEditing(id); setBefore(n?.painBefore); setAfter(n?.painAfter);
  };
  const save = () => {
    try {
      setSessionPain(editing!, { painBefore: before, painAfter: after });
      setEditing(null);
      if ((after ?? 0) >= HIGH_PAIN || (before ?? 0) >= HIGH_PAIN) {
        notify('Mức đau cao', 'Nếu đau tăng, sốt, chảy máu hoặc mủ nhiều, hãy gọi 115 hoặc đến cơ sở y tế. Có thể gửi thêm báo cáo triệu chứng cho bác sĩ.');
      }
    } catch (e) {
      notify('Chưa lưu được', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <NavBtn icon="chevron-back" label="Tháng trước" onPress={() => { setMonth(shiftMonth(month, -1)); setSelected(null); }} />
          <Text accessibilityRole="header" style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.text }}>Tháng {Number(m)}/{y}</Text>
          <NavBtn icon="chevron-forward" label="Tháng sau" onPress={() => { setMonth(shiftMonth(month, 1)); setSelected(null); }} />
        </View>
        <View style={{ flexDirection: 'row' }}>
          {WEEKDAYS.map((w) => <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: 12, color: C.textSoft, fontWeight: '600' }}>{w}</Text>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {cells.map((c, i) => {
            if (!c.date) return <View key={`pad-${i}`} style={{ width: `${100 / 7}%`, height: 52 }} />;
            const k = c.kind === 'outside' ? null : KIND[c.kind];
            const on = selected === c.date;
            const day = Number(c.date.slice(8));
            const hasReminder = reminders.some((r) => r.date === c.date);
            return (
              <Pressable
                key={c.date}
                onPress={() => { setSelected(c.date); setEditing(null); }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`Ngày ${day} tháng ${Number(m)}${k ? `: ${k.label}${c.kind !== 'unsynced' ? `, ${c.count} lần` : ''}` : ''}${hasReminder ? ', có lịch hẹn' : ''}`}
                style={{ width: `${100 / 7}%`, height: 52, padding: 2 }}>
                <View style={{ flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: k ? k.bg : 'transparent', borderWidth: on ? 2 : 0, borderColor: C.primary }}>
                  {hasReminder && <Ionicons name="calendar" size={10} color={C.violet} style={{ position: 'absolute', top: 3, right: 4 }} />}
                  <Text style={{ fontSize: 14, fontWeight: '700', color: k ? C.text : C.textFaint }}>{day}</Text>
                  {k && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                      {k.icon && <Ionicons name={k.icon} size={10} color={k.color} />}
                      <Text style={{ fontSize: 10, fontWeight: '700', color: k.color }}>{cellText(c, target)}</Text>
                    </View>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {reminders.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="calendar" size={12} color={C.violet} />
              <Text style={{ fontSize: 12, color: C.textSoft }}>Lịch hẹn</Text>
            </View>
          )}
          {(['met', 'partial', 'none', 'unsynced'] as const).map((kind) => (
            <View key={kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: KIND[kind].bg, borderWidth: 1, borderColor: KIND[kind].color }} />
              <Text style={{ fontSize: 12, color: C.textSoft }}>{KIND[kind].label}</Text>
            </View>
          ))}
        </View>
        {target == null && <Muted>Liệu trình chưa đặt số lần mỗi ngày, lịch chỉ hiện số lần đã làm.</Muted>}
      </Card>

      {selected && (
        <Card>
          <Text style={{ fontWeight: '700', fontSize: 16, color: C.text }}>{fmtDate(selected)}</Text>
          {reminders.filter((r) => r.date === selected).map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.violetSoft, borderRadius: 8, padding: 10 }}>
              <Ionicons name="calendar" size={18} color={C.violet} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{r.title}</Text>
                <Text style={{ color: C.textSoft, fontSize: 13 }}>{r.body}</Text>
              </View>
            </View>
          ))}
          {selected > today && !reminders.some((r) => r.date === selected) && <Muted>Chưa có lịch hẹn ngày này.</Muted>}
          {selectedCell?.kind === 'unsynced' && <Muted>Thiết bị chưa gửi dữ liệu ngày này. Số phiên sẽ hiện khi thiết bị kết nối Wi-Fi.</Muted>}
          {daySessions.length === 0 && selectedCell?.kind !== 'unsynced' && selected <= today && <Muted>Không có phiên điều trị.</Muted>}
          {daySessions.map((s) => {
            const n = note(s.sessionId);
            const done = s.status === 'completed';
            return (
              <View key={s.sessionId} style={{ gap: 8, paddingVertical: 8, borderTopWidth: 1, borderTopColor: C.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ minWidth: 58, paddingVertical: 8, borderRadius: 12, backgroundColor: done ? C.primarySoft : C.amberSoft, alignItems: 'center' }}>
                    <Text style={{ fontWeight: '700', color: done ? C.primary : C.amber }}>{time(s.start)}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: C.text }}>{done ? 'Phiên điều trị' : 'Phiên bị ngắt'} · {s.durationMin} phút</Text>
                    <Text style={{ color: C.textSoft, fontSize: 13 }}>
                      {n && (n.painBefore !== undefined || n.painAfter !== undefined)
                        ? `Đau trước ${n.painBefore ?? '–'}/10 → sau ${n.painAfter ?? '–'}/10`
                        : 'Chưa ghi mức đau'}
                    </Text>
                  </View>
                  {canEdit && editing !== s.sessionId && (
                    <HeaderButton icon="create-outline" label={n ? 'Sửa' : 'Ghi đau'} onPress={() => startEdit(s.sessionId)} />
                  )}
                </View>
                {editing === s.sessionId && (
                  <View style={{ gap: 8 }}>
                    <PainRow label="Đau trước phiên" value={before} onChange={setBefore} />
                    <PainRow label="Đau sau phiên" value={after} onChange={setAfter} />
                    <Muted>0 = không đau, 10 = đau nhất. Có thể bỏ trống một trong hai.</Muted>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}><Button label="Hủy" variant="ghost" onPress={() => setEditing(null)} /></View>
                      <View style={{ flex: 1 }}><Button label="Lưu" icon="checkmark" disabled={before === undefined && after === undefined} onPress={save} /></View>
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </Card>
      )}
    </>
  );
}

function PainRow({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: C.text }}>{label}{value !== undefined ? `: ${value}/10` : ''}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
        {Array.from({ length: 11 }, (_, i) => (
          <Pressable
            key={i}
            onPress={() => onChange(value === i ? undefined : i)}
            accessibilityRole="radio"
            accessibilityLabel={`${label} ${i}`}
            accessibilityState={{ checked: value === i }}
            style={{ width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: value === i ? C.primary : C.surfaceMuted }}>
            <Text style={{ color: value === i ? C.onPrimary : C.text, fontWeight: '700' }}>{i}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function NavBtn({ icon, label, onPress }: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft }}>
      <Ionicons name={icon} size={20} color={C.primary} />
    </Pressable>
  );
}
