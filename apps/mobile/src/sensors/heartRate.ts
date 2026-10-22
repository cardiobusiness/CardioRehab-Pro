import { toByteArray } from "base64-js";

export const HEART_RATE_SERVICE = "0000180d-0000-1000-8000-00805f9b34fb";
export const HEART_RATE_MEASUREMENT = "00002a37-0000-1000-8000-00805f9b34fb";

export interface HeartRateReading {
  deviceId: string;
  bpm: number;
  rrIntervalsMs: number[];
  contact: "detected" | "not_detected" | "unsupported";
  energyExpendedKj?: number;
  receivedAt: string;
}

// Independent implementation of Bluetooth SIG Heart Rate Service 1.0, §3.1.
// receivedAt is phone receipt time; HRS supplies no absolute sensor timestamp.
export function parseHeartRate(value: string, deviceId: string, now = Date.now()): HeartRateReading {
  if (!value || value.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new Error("Payload BLE inválido.");
  }
  const bytes = toByteArray(value);
  let offset = 1;
  const flags = bytes[0];
  function read(size: 1 | 2): number {
    if (offset + size > bytes.length) throw new Error("Medição BLE truncada.");
    const result = bytes[offset] + (size === 2 ? bytes[offset + 1] * 256 : 0);
    offset += size;
    return result;
  }
  if (bytes.length < 2 || (flags & 0xe0)) throw new Error("Flags BLE inválidas.");
  const bpm = read(flags & 1 ? 2 : 1);
  // Zero represents no usable pulse. Positive uint16 readings are preserved;
  // prescribed clinical limits belong to a separate, individualized layer.
  if (!bpm) throw new Error("Sensor sem leitura de FC válida.");
  const contact = flags & 4 ? (flags & 2 ? "detected" : "not_detected") : "unsupported";
  const energyExpendedKj = flags & 8 ? read(2) : undefined;
  const rrIntervalsMs: number[] = [];
  if (flags & 16) {
    if (offset === bytes.length) throw new Error("Intervalos RR ausentes.");
    while (offset < bytes.length) {
      const rr = read(2);
      if (!rr) throw new Error("Intervalo RR inválido.");
      rrIntervalsMs.push(rr * 1000 / 1024);
    }
  }
  if (offset !== bytes.length) throw new Error("Bytes inesperados na medição BLE.");
  return { deviceId, bpm, contact, rrIntervalsMs, energyExpendedKj, receivedAt: new Date(now).toISOString() };
}
