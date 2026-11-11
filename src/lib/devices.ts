// Gán thiết bị cho bệnh nhân, giữ quan hệ một bệnh nhân - một thiết bị ở cả hai phía.
// Tách khỏi store để kiểm thử bằng node.

interface DeviceLink { id: string; patientId?: string }
interface PatientLink { id: string; deviceId?: string }

export function reassignDevice<D extends DeviceLink, P extends PatientLink>(
  devices: D[], patients: P[], deviceId: string, patientId: string | null,
): { devices: D[]; patients: P[] } {
  // Bệnh nhân cũ của thiết bị này (nếu có) mất liên kết; thiết bị cũ của bệnh nhân mới (nếu có) bị gỡ.
  const previousDeviceOfPatient = patientId ? patients.find((p) => p.id === patientId)?.deviceId : undefined;
  return {
    devices: devices.map((x) => {
      if (x.id === deviceId) return { ...x, patientId: patientId ?? undefined };
      if (patientId && (x.patientId === patientId || x.id === previousDeviceOfPatient)) return { ...x, patientId: undefined };
      return x;
    }),
    patients: patients.map((p) => {
      if (patientId && p.id === patientId) return { ...p, deviceId };
      if (p.deviceId === deviceId) return { ...p, deviceId: undefined };
      return p;
    }),
  };
}
