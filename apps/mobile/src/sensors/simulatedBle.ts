import { fromByteArray } from "base64-js";
import { HEART_RATE_MEASUREMENT, HEART_RATE_SERVICE } from "./heartRate";
import type { BleTransport, SensorDevice, Subscription } from "./heartRateMonitor";

export const SIMULATED_DEVICE_ID = "simulated-heart-rate";
// Exercises the same GATT subscription and byte parser as a real peripheral.
// It does not use the phone radio and must never be advertised as hardware.
export class SimulatedBleTransport implements BleTransport {
  private connected = false;
  private scanTimer?: ReturnType<typeof setTimeout>;
  private timer?: ReturnType<typeof setInterval>;
  private disconnectListener?: (error: Error | null) => void;
  private paused = false;
  private sequence = 0;
  constructor(private intervalMs = 1000) {}

  async startDeviceScan(uuids: string[] | null, _options: null,
    listener: (error: Error | null, device: SensorDevice | null) => void) {
    await this.stopDeviceScan();
    if (uuids && !uuids.includes(HEART_RATE_SERVICE)) return;
    this.scanTimer = setTimeout(() => listener(null, {
      id: SIMULATED_DEVICE_ID, name: "Frequencímetro SIMULADO", localName: null,
      rssi: -45, manufacturerData: null
    }), 250);
  }
  async stopDeviceScan() { clearTimeout(this.scanTimer); }
  async connectToDevice(id: string) {
    if (id !== SIMULATED_DEVICE_ID) throw new Error("Sensor simulado desconhecido.");
    this.connected = true;
  }
  async discoverAllServicesAndCharacteristicsForDevice() {
    if (!this.connected) throw new Error("Simulador desconectado.");
  }
  async characteristicsForDevice(_id: string, service: string) {
    return service === HEART_RATE_SERVICE ? [{ uuid: HEART_RATE_MEASUREMENT, isNotifiable: true }] : [];
  }
  monitorCharacteristicForDevice(_id: string, _service: string, _characteristic: string,
    listener: (error: Error | null, value: { value: string | null } | null) => void): Subscription {
    clearInterval(this.timer);
    const send = () => {
      if (!this.connected || this.paused) return;
      const bpm = Math.round(82 + 12 * Math.sin(this.sequence++ / 6));
      const rr = Math.round(60 / bpm * 1024);
      // Alternate uint8/uint16 encodings with identical semantics.
      const wide = this.sequence % 2 === 0;
      const bytes = [0x16 | (wide ? 1 : 0), bpm];
      if (wide) bytes.push(0);
      bytes.push(rr & 255, rr >> 8);
      listener(null, { value: fromByteArray(Uint8Array.from(bytes)) });
    };
    // Defer first reading until monitor owns the subscription.
    const first = setTimeout(send, 0);
    const timer = setInterval(send, this.intervalMs);
    this.timer = timer;
    return { remove: () => { clearTimeout(first); clearInterval(timer); } };
  }
  onDeviceDisconnected(_id: string, listener: (error: Error | null) => void): Subscription {
    this.disconnectListener = listener;
    return { remove: () => { if (this.disconnectListener === listener) this.disconnectListener = undefined; } };
  }
  async cancelDeviceConnection() {
    this.connected = false;
    clearInterval(this.timer);
  }
  setPaused(paused: boolean) { this.paused = paused; }
  simulateDisconnect() {
    if (!this.connected) return;
    this.connected = false;
    clearInterval(this.timer);
    this.disconnectListener?.(new Error("Desconexão simulada."));
  }
  async destroy() { await this.stopDeviceScan(); await this.cancelDeviceConnection(); this.disconnectListener = undefined; }
}
