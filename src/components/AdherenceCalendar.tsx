import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/Text';
import { Button, Card, HeaderButton, Muted } from '@/components/ui';
import { monthCells, type DayCell, type DayKind } from '@/lib/adherence';
import { isScheduled, localDay } from '@/lib/course';
import { notify } from '@/lib/dialog';
import { fmtDate } from '@/lib/format';
import { useStore } from '@/lib/store';
import type { Reminder } from '@/lib/reminders';
import type { DeviceSession, SessionNote, TreatmentPlan } from '@/lib/types';
import { C, radius } from '@/theme';

// Ngưỡng cảnh báo đau giống màn Báo triệu chứng; đề xuất cho demo, cần bác sĩ xác nhận.
const HIGH_PAIN = 7;
const WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Mỗi trạng thái có biểu tượng và chữ riêng, không chỉ dựa vào màu (khác bản Nerivio). */
/**
 * Chú giải chỉ có 5 nhóm cho bệnh nhân: Đã điều trị, Có lịch, Nghỉ, Lệch lịch, Chưa có dữ liệu.
 * "Lệch lịch" gộp bỏ lỡ, thiếu lần và chiếu ngoài lịch; chữ trong ô và trình đọc màn hình vẫn nói rõ từng loại (`detail`).
 */
const KIND: Record<Exclude<DayKind, 'outside'>, { label: string; detail?: string; color: string; bg: string; icon?: 'checkmark' | 'alert' }> = {
  met: { label: 'Đã điều trị', color: C.green, bg: C.greenSoft, icon: 'checkmark' },
  partial: { label: 'Lệch lịch', detail: 'Thiếu lần', color: C.amber, bg: C.amberSoft },
  over: { label: 'Lệch lịch', detail: 'Chiếu ngoài lịch hoặc thừa lần', color: C.amber, bg: C.amberSoft, icon: 'alert' },
  none: { label: 'Lệch lịch', detail: 'Bỏ lỡ', color: C.amber, bg: C.amberSoft },
  rest: { label: 'Nghỉ', color: C.textFaint, bg: C.card },
  planned: { label: 'Có lịch', color: C.primary, bg: C.primarySoft },
  unsynced: { label: 'Chưa có dữ liệu', color: C.textSoft, bg: C.neutralSoft },
  today: { label: 'Hôm nay', color: C.primary, bg: C.primarySoft },
};

const shiftMonth = (month: string, by: number) => {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
};
// Giờ Việt Nam (UTC+7), cùng mốc với localDay; không theo múi giờ điện thoại.
const time = (iso: string) => new Date(new Date(iso).getTime() + 420 * 60000).toISOString().slice(11, 16);

function cellText(c: DayCell, target: number | null | undefined) {
  if (c.kind === 'unsynced') return '?';
  if (c.kind === 'none') return 'bỏ lỡ';
  if (c.kind === 'rest') return 'nghỉ';
  if (c.kind === 'planned') return 'lịch';
  if (c.kind === 'over') return `${c.count}×`;
  if (target == null || target <= 1) return c.kind === 'met' ? 'xong' : `${c.count}`;
  if (c.kind === 'met' && target == null) return `${c.count}`;
  return target != null ? `${c.count}/${target}` : `${c.count}`;
}

/**
 * Lịch tuân thủ theo tháng (mẫu "Migraine diary" của Nerivio): mỗi ngày một ô có trạng thái,
 * chạm vào ngày để xem các phiên và ghi mức đau trước/sau phiên.
 */
export function AdherenceCalendar({ sessions, plan, lastSyncDay, canEdit, reminders = [] }: { sessions: DeviceSession[]; plan?: TreatmentPlan; lastSyncDay: string | null; canEdit: boolean; reminders?: Reminder[] }) {
  const { data, setSessionPain } = useStore();
  const today = localDay();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState<string | null>(today);
  const [editing, setEditing] = useState<string | null>(null);
  const [before, setBefore] = useState<number | undefined>();
  const [after, setAfter] = useState<number | undefined>();
  const [flags, setFlags] = useState<Flags>({});
  // Lịch theo đợt: chỉ ngày có buổi mới cần chiếu; ngày nghỉ theo lịch không bị tính là bỏ lỡ.
  const target = plan ? plan.sessionsPerDay ?? 1 : null;
  const cells = monthCells(month, sessions, target, lastSyncDay, plan?.startDate ?? null, plan?.endDate ?? null, today, plan ? (d) => isScheduled(plan, d) : undefined);
  const daySessions = selected ? sessions.filter((s) => localDay(s.start) === selected).sort((a, b) => a.start.localeCompare(b.start)) : [];
  const note = (id: string) => data.sessionNotes.find((n) => n.sessionId === id);
  const [y, m] = month.split('-');
  const selectedCell = cells.find((c) => c.date === selected);

  const startEdit = (id: string) => {
    const n = note(id);
    setEditing(id); setBefore(n?.painBefore); setAfter(n?.painAfter);
    setFlags({ burning: n?.burning, stinging: n?.stinging, rednessNextDay: n?.rednessNextDay, swellingNextDay: n?.swellingNextDay });
  };
  const save = () => {
    try {
      setSessionPain(editing!, { painBefore: before, painAfter: after, ...flags });
      if (flags.rednessNextDay || flags.swellingNextDay) {
        notify('Đã ghi phản ứng da', 'Bác sĩ sẽ thấy ghi chú này. Nếu đỏ hoặc sưng lan rộng, có mủ hay sốt, hãy liên hệ bác sĩ ngay.');
      }
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
        {/* Lưới ngày lấn 10 pt vào lề thẻ mỗi bên để ô ngày rộng tối thiểu 44 pt trên máy 360 pt (vùng chạm Apple HIG). */}
        <View style={{ flexDirection: 'row', marginHorizontal: -10 }}>
          {WEEKDAYS.map((w) => <Text key={w} style={{ flex: 1, textAlign: 'center', fontSize: 13, color: C.textSoft, fontWeight: '600' }}>{w}</Text>)}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -10 }}>
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
                accessibilityLabel={`Ngày ${day} tháng ${Number(m)}${k ? `: ${k.detail ?? k.label}${c.kind !== 'unsynced' ? `, ${c.count} lần` : ''}` : ''}${hasReminder ? ', có lịch hẹn' : ''}`}
                style={{ width: `${100 / 7}%`, height: 52, padding: 2 }}>
                <View style={{ flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: k ? k.bg : 'transparent', borderWidth: on ? 2 : 0, borderColor: C.primary }}>
                  {hasReminder && <Ionicons name="calendar" size={10} color={C.violet} style={{ position: 'absolute', top: 3, right: 4 }} />}
                  {/* Ô lịch: số ngày cỡ 15 và một biểu tượng thay cho chữ cỡ 10 (đề xuất 3); chữ đầy đủ ở accessibilityLabel và ô chi tiết. */}
                  <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 15, fontWeight: '700', color: k && c.kind !== 'rest' ? C.text : C.textFaint }}>{day}</Text>
                  {k && <CellMark kind={c.kind} color={k.color} text={cellText(c, target)} />}
                </View>
              </Pressable>
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {reminders.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="calendar" size={12} color={C.violet} />
              <Text style={{ fontSize: 13, color: C.textSoft }}>Lịch hẹn</Text>
            </View>
          )}
          {(['met', 'planned', 'rest', 'none', 'unsynced'] as const).map((kind) => (
            <View key={kind} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 14, height: 14, borderRadius: 4, backgroundColor: KIND[kind].bg, borderWidth: 1, borderColor: KIND[kind].color }} />
              <Text style={{ fontSize: 13, color: C.textSoft }}>{KIND[kind].label}</Text>
            </View>
          ))}
        </View>
        {!plan && <Muted>Chưa có đợt điều trị, lịch chỉ hiện số lần đã chiếu.</Muted>}
      </Card>

      {selected && (
        <Card>
          <Text style={{ fontWeight: '700', fontSize: 16, color: C.text }}>{fmtDate(selected)}</Text>
          {reminders.filter((r) => r.date === selected).map((r) => (
            <View key={r.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: C.violetSoft, borderRadius: radius.m, padding: 12 }}>
              <Ionicons name="calendar" size={18} color={C.violet} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700', color: C.text }}>{r.title}</Text>
                <Text style={{ color: C.textSoft, fontSize: 14 }}>{r.body}</Text>
              </View>
            </View>
          ))}
          {selected > today && !reminders.some((r) => r.date === selected) && <Muted>Chưa có lịch hẹn ngày này.</Muted>}
          {selectedCell?.kind === 'unsynced' && <Muted>Thiết bị chưa gửi dữ liệu ngày này. Số phiên sẽ hiện khi thiết bị kết nối Wi-Fi.</Muted>}
          {selectedCell?.kind === 'none' && <Muted>Ngày có lịch nhưng thiết bị không ghi nhận phiên chiếu nào.</Muted>}
          {selectedCell?.kind === 'over' && <Muted>Có phiên chiếu ngoài lịch hoặc nhiều hơn số lần của buổi. Hãy báo bác sĩ phụ trách.</Muted>}
          {selectedCell?.kind === 'partial' && <Muted>Chưa chiếu đủ số lần của buổi.</Muted>}
          {selectedCell?.kind === 'rest' && <Muted>Ngày nghỉ theo lịch của đợt. Thiết bị không phát vào ngày này.</Muted>}
          {selectedCell?.kind === 'planned' && <Muted>Có buổi điều trị theo lịch.</Muted>}
          {/* Hôm nay chưa có phiên: nói rõ là có buổi và dữ liệu có thể chưa về, không ghi "Không có phiên" (cùng ý với cảnh báo đồng bộ ở Trang chủ). */}
          {selectedCell?.kind === 'today' && daySessions.length === 0 && <Muted>{lastSyncDay !== today ? 'Hôm nay có buổi điều trị. Số lần chiếu sẽ hiện khi thiết bị gửi dữ liệu.' : 'Hôm nay có buổi điều trị, thiết bị chưa ghi nhận lần chiếu nào.'}</Muted>}
          {daySessions.length === 0 && !['unsynced', 'rest', 'planned', 'today'].includes(selectedCell?.kind ?? '') && selected <= today && <Muted>Không có phiên điều trị.</Muted>}
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
                    <Text style={{ color: C.textSoft, fontSize: 14 }}>
                      {n ? noteText(n) : 'Chưa ghi cảm giác'}
                    </Text>
                  </View>
                  {canEdit && editing !== s.sessionId && (
                    <HeaderButton icon="create-outline" label={n ? 'Sửa' : 'Ghi cảm giác'} onPress={() => startEdit(s.sessionId)} />
                  )}
                </View>
                {editing === s.sessionId && (
                  <View style={{ gap: 8 }}>
                    <PainRow label="Đau trước phiên" value={before} onChange={setBefore} />
                    <PainRow label="Đau sau phiên" value={after} onChange={setAfter} />
                    <Muted>0 = không đau, 10 = đau nhất. Có thể bỏ trống một trong hai.</Muted>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>Trong lúc chiếu</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Toggle label="Nóng rát" on={!!flags.burning} onPress={() => setFlags({ ...flags, burning: !flags.burning })} />
                      <Toggle label="Châm chích" on={!!flags.stinging} onPress={() => setFlags({ ...flags, stinging: !flags.stinging })} />
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>Ngày hôm sau, da quanh vết thương</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      <Toggle label="Đỏ da" on={!!flags.rednessNextDay} onPress={() => setFlags({ ...flags, rednessNextDay: !flags.rednessNextDay })} />
                      <Toggle label="Sưng" on={!!flags.swellingNextDay} onPress={() => setFlags({ ...flags, swellingNextDay: !flags.swellingNextDay })} />
                    </View>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                      <View style={{ flex: 1 }}><Button label="Hủy" variant="ghost" onPress={() => setEditing(null)} /></View>
                      <View style={{ flex: 1 }}><Button label="Lưu" icon="checkmark" disabled={before === undefined && after === undefined && !Object.values(flags).some(Boolean)} onPress={save} /></View>
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

type Flags = Pick<SessionNote, 'burning' | 'stinging' | 'rednessNextDay' | 'swellingNextDay'>;

/** Tóm tắt cảm giác của một phiên, dùng cả ở màn thiết bị của bác sĩ. */
export function noteText(n: SessionNote): string {
  const parts: string[] = [];
  if (n.painBefore !== undefined || n.painAfter !== undefined) parts.push(`Đau ${n.painBefore ?? '–'} → ${n.painAfter ?? '–'}/10`);
  const t = [n.burning && 'nóng rát', n.stinging && 'châm chích'].filter(Boolean);
  if (t.length) parts.push(`Khi chiếu: ${t.join(', ')}`);
  const r = [n.rednessNextDay && 'đỏ da', n.swellingNextDay && 'sưng'].filter(Boolean);
  if (r.length) parts.push(`Hôm sau: ${r.join(', ')}`);
  return parts.length ? parts.join(' · ') : 'Không ghi nhận khó chịu';
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={label}
      style={{ minHeight: 44, paddingHorizontal: 14, borderRadius: 22, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? C.primary : C.surfaceMuted }}>
      <Ionicons name={on ? 'checkbox' : 'square-outline'} size={18} color={on ? C.onPrimary : C.textSoft} />
      <Text style={{ color: on ? C.onPrimary : C.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function PainRow({ label, value, onChange }: { label: string; value?: number; onChange: (v: number | undefined) => void }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', color: C.text }}>{label}{value !== undefined ? `: ${value}/10` : ''}</Text>
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

const MARK: Partial<Record<DayKind, React.ComponentProps<typeof Ionicons>['name']>> = {
  met: 'checkmark-circle', planned: 'ellipse', none: 'close-circle', over: 'alert-circle', partial: 'remove-circle', unsynced: 'help-circle', today: 'time',
};

function CellMark({ kind, color, text }: { kind: DayKind; color: string; text: string }) {
  const icon = MARK[kind];
  if (!icon) return null; // ngày nghỉ: chỉ làm mờ số ngày
  // Nhiều lần trong một buổi thì hiện số (2×, 1/2) thay biểu tượng.
  if ((kind === 'over' || kind === 'partial' || kind === 'met') && /\d/.test(text) && text !== '1×') {
    return <Text maxFontSizeMultiplier={1.2} style={{ fontSize: 12, fontWeight: '700', color }}>{text}</Text>;
  }
  return <Ionicons name={icon} size={kind === 'planned' ? 8 : 15} color={color} />;
}

function NavBtn({ icon, label, onPress }: { icon: 'chevron-back' | 'chevron-forward'; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: C.primarySoft }}>
      <Ionicons name={icon} size={20} color={C.primary} />
    </Pressable>
  );
}
