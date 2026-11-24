import { router } from 'expo-router';

import { NoAccess } from '@/components/Guard';
import { Empty, Header, LinkRow, ListCard, Muted, Screen, SectionTitle } from '@/components/ui';
import { doctorTasks } from '@/lib/doctorTasks';
import { fmtDate, fmtDateTime } from '@/lib/format';
import { useLookups, useStore } from '@/lib/store';

/**
 * Logic chốt 25/11/2026 (TC-7, TC-10): thông báo của bác sĩ, mở từ chuông ở Trang chủ. Bốn loại việc chờ, luôn hiện đủ, không
 * tùy chỉnh: ảnh chưa đủ nhãn, ảnh cần chụp lại, phác đồ chờ bệnh nhân xác nhận, máy báo lỗi. Chạm một dòng mở đúng nơi xử lý.
 */
export default function Notifications() {
  const { data, me } = useStore();
  const { patient, wound } = useLookups();
  if (me?.role !== 'doctor') return <NoAccess />;
  const t = doctorTasks(data, me.id);
  const who = (pid: string, wid?: string) => [patient(pid)?.code, wid ? wound(wid)?.code : null].filter(Boolean).join(' · ');
  return (
    <Screen header={<Header back title="Thông báo" subtitle={t.total ? `${t.total} việc chờ` : 'Không có việc chờ'} />}>
      {t.total === 0 && <Empty icon="notifications-off-outline" text="Không có việc nào đang chờ." />}
      <SectionTitle>{`Ảnh chưa đủ nhãn (${t.unlabeled.length})`}</SectionTitle>
      {t.unlabeled.length === 0 ? <Muted>Không có.</Muted> : (
        <ListCard>
          {t.unlabeled.slice(0, 20).map((im) => (
            <LinkRow key={im.id} icon="pricetag-outline" tone="amber" title={`${im.id} · ${who(im.patientId, im.woundId)}`} sub={`Chụp ${fmtDate(im.captureDate)}`}
              onPress={() => router.push({ pathname: '/images/[id]', params: { id: im.id } })} />
          ))}
        </ListCard>
      )}
      {t.unlabeled.length > 20 && <Muted>{`Còn ${t.unlabeled.length - 20} ảnh, xem ở Chụp ảnh và gán nhãn.`}</Muted>}
      <SectionTitle>{`Ảnh cần chụp lại (${t.retakes.length})`}</SectionTitle>
      {t.retakes.length === 0 ? <Muted>Không có.</Muted> : (
        <ListCard>
          {t.retakes.map((im) => (
            <LinkRow key={im.id} icon="camera-reverse-outline" tone="amber" title={`${im.id} · ${who(im.patientId, im.woundId)}`} sub={im.retakeRequested || 'Đã yêu cầu chụp lại'}
              onPress={() => router.push({ pathname: '/images/[id]', params: { id: im.id } })} />
          ))}
        </ListCard>
      )}
      <SectionTitle>{`Phác đồ chờ bệnh nhân xác nhận (${t.awaitingAck.length})`}</SectionTitle>
      {t.awaitingAck.length === 0 ? <Muted>Không có.</Muted> : (
        <ListCard>
          {t.awaitingAck.map((pl) => (
            <LinkRow key={pl.id} icon="document-text-outline" tone="violet" title={who(pl.patientId, pl.woundId)} sub={`Phiên bản ${pl.version} · lưu ${fmtDateTime(pl.editedAt)}`}
              onPress={() => pl.woundId ? router.push({ pathname: '/wounds/[id]', params: { id: pl.woundId, the: 'phac-do' } }) : router.push({ pathname: '/patients/[id]', params: { id: pl.patientId } })} />
          ))}
        </ListCard>
      )}
      <SectionTitle>{`Máy báo lỗi (${t.faults.length})`}</SectionTitle>
      {t.faults.length === 0 ? <Muted>Không có.</Muted> : (
        <ListCard>
          {t.faults.map((d) => (
            <LinkRow key={d.id} icon="warning-outline" tone="red" title={d.code} sub={`${d.fault!.message} · ${fmtDateTime(d.fault!.at)}${d.patientId ? ` · ${patient(d.patientId)?.code ?? ''}` : ''}`}
              onPress={() => router.push({ pathname: '/devices/[id]', params: { id: d.id } })} />
          ))}
        </ListCard>
      )}
    </Screen>
  );
}
