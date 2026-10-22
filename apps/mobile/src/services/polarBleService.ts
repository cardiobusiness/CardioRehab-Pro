import type { EcgSample, HeartRateSample, SensorModel } from "@cardiorehab/clinical-core";

export type PolarConnectionState =
  | "idle"
  | "scanning"
  | "connecting"
  | "connected"
  | "streaming"
  | "disconnected"
  | "error";

export interface PolarDevice {
  id: string;
  name: string;
  model: SensorModel;
  rssi?: number;
}

export interface PolarBleAdapter {
  scan(model: SensorModel): Promise<PolarDevice[]>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  startHeartRateStream(onSample: (sample: HeartRateSample) => void): Promise<void>;
  startEcgStream?(onSample: (sample: EcgSample) => void): Promise<void>;
}

export class MockPolarBleAdapter implements PolarBleAdapter {
  async scan(model: SensorModel): Promise<PolarDevice[]> {
    return [
      {
        id: `${model}-demo`,
        name: sensorLabel(model),
        model,
        rssi: -48
      }
    ];
  }

  async connect(_deviceId: string): Promise<void> {
    return undefined;
  }

  async disconnect(): Promise<void> {
    return undefined;
  }

  async startHeartRateStream(onSample: (sample: HeartRateSample) => void): Promise<void> {
    onSample({
      bpm: 92,
      rrIntervalsMs: [652, 648],
      recordedAt: new Date().toISOString()
    });
  }

  async startEcgStream(onSample: (sample: EcgSample) => void): Promise<void> {
    for (let index = 0; index < 120; index += 1) {
      onSample({
        microvolts: Math.round(Math.sin(index / 5) * 420),
        recordedAt: new Date(Date.now() + index * 4).toISOString()
      });
    }
  }
}

export function sensorLabel(model: SensorModel): string {
  const labels: Record<SensorModel, string> = {
    polar_h7: "Polar H7",
    polar_h10: "Polar H10",
    polar_verity_sense: "Polar Verity Sense"
  };

  return labels[model];
}
