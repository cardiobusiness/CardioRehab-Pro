import { HEART_RATE_MEASUREMENT, HEART_RATE_SERVICE, parseHeartRate, type HeartRateReading } from "./heartRate";

export interface Subscription { remove(): void }
export interface SensorDevice {
  id: string;
  name: string | null;
  localName: string | null;
  rssi: number | null;
  manufacturerData: string | null;
}
export interface BleTransport {
  startDeviceScan(uuids: string[] | null, options: null, listener: (error: Error | null, device: SensorDevice | null) => void): void | Promise<void>;
  stopDeviceScan(): void | Promise<void>;
  connectToDevice(id: string, options: { timeout: number }): Promise<unknown>;
  discoverAllServicesAndCharacteristicsForDevice(id: string): Promise<unknown>;
  characteristicsForDevice(id: string, service: string): Promise<Array<{ uuid: string; isNotifiable: boolean }>>;
  monitorCharacteristicForDevice(id: string, service: string, characteristic: string, listener: (error: Error | null, value: { value: string | null } | null) => void): Subscription;
  onDeviceDisconnected(id: string, listener: (error: Error | null) => void): Subscription;
  cancelDeviceConnection(id: string): Promise<unknown>;
}
export type MonitorStatus = "idle" | "scanning" | "connecting" | "streaming" | "reconnecting" | "disconnected" | "error";
export interface MonitorSnapshot {
  status: MonitorStatus;
  devices: SensorDevice[];
  selectedId?: string;
  reading?: HeartRateReading;
  error?: string;
  rejected: number;
}

// One monitor owns one connection. Future patient sessions must own distinct
// monitor instances and persist the patient/session/device binding explicitly.
export class HeartRateMonitor {
  private snapshot: MonitorSnapshot = { status: "idle", devices: [], rejected: 0 };
  private generation = 0;
  private selected?: string;
  private subscriptions: Subscription[] = [];
  private scanTimer?: ReturnType<typeof setTimeout>;
  private retryTimer?: ReturnType<typeof setTimeout>;
  private attempts = 0;
  private disposed = false;
  private pendingConnection?: Promise<unknown>;

  constructor(private ble: BleTransport, private emit: (snapshot: MonitorSnapshot) => void,
    private retryDelays = [1000, 3000, 7000]) {}

  private update(patch: Partial<MonitorSnapshot>) {
    if (this.disposed) return;
    this.snapshot = { ...this.snapshot, ...patch };
    this.emit(this.snapshot);
  }
  private clearSubscriptions() {
    this.subscriptions.forEach(subscription => subscription.remove());
    this.subscriptions = [];
  }
  async stopScan() {
    clearTimeout(this.scanTimer);
    await this.ble.stopDeviceScan();
    if (this.snapshot.status === "scanning") this.update({ status: "idle" });
  }
  async scan() {
    await this.disconnect();
    if (this.disposed) return;
    const token = this.generation;
    this.update({ status: "scanning", devices: [], error: undefined });
    this.scanTimer = setTimeout(() => { void this.stopScan().catch(error => this.fail(error)); }, 12000);
    try {
      await this.ble.startDeviceScan([HEART_RATE_SERVICE], null, (error, device) => {
        if (token !== this.generation || this.snapshot.status !== "scanning") return;
        if (error) { void this.stopScan().catch(() => undefined); this.fail(error); return; }
        if (!device) return;
        const devices = this.snapshot.devices.filter(item => item.id !== device.id);
        devices.push(device);
        this.update({ devices: devices.sort((a, b) => (b.rssi ?? -200) - (a.rssi ?? -200)) });
      });
    } catch (error) { await this.stopScan().catch(() => undefined); this.fail(error); }
  }
  async connect(id: string) {
    await this.disconnect();
    if (this.disposed) return;
    this.selected = id;
    this.attempts = 0;
    this.update({ selectedId: id, reading: undefined, rejected: 0, error: undefined });
    await this.open(this.generation);
  }
  private async open(token: number) {
    const id = this.selected;
    if (!id || this.disposed || token !== this.generation) return;
    this.update({ status: this.attempts ? "reconnecting" : "connecting", error: undefined });
    try {
      const connection = this.ble.connectToDevice(id, { timeout: 10000 });
      this.pendingConnection = connection;
      try { await connection; }
      finally { if (this.pendingConnection === connection) this.pendingConnection = undefined; }
      if (token !== this.generation) return;
      await this.ble.discoverAllServicesAndCharacteristicsForDevice(id);
      const characteristics = await this.ble.characteristicsForDevice(id, HEART_RATE_SERVICE);
      if (token !== this.generation) return;
      if (!characteristics.some(item => item.uuid.toLowerCase() === HEART_RATE_MEASUREMENT && item.isNotifiable)) {
        await this.ble.cancelDeviceConnection(id).catch(() => undefined);
        this.update({ status: "error", error: "Sensor sem característica Heart Rate notificável." });
        return;
      }
      this.subscriptions.push(this.ble.onDeviceDisconnected(id, () => this.retry(token)));
      this.update({ status: "streaming", reading: undefined });
      this.subscriptions.push(this.ble.monitorCharacteristicForDevice(id, HEART_RATE_SERVICE, HEART_RATE_MEASUREMENT, (error, characteristic) => {
        if (token !== this.generation || this.snapshot.status !== "streaming") return;
        if (error) { this.retry(token); return; }
        try {
          const reading = parseHeartRate(characteristic?.value ?? "", id);
          this.update({ reading, error: undefined });
        } catch (error) {
          this.update({ reading: undefined, rejected: this.snapshot.rejected + 1, error: message(error) });
        }
      }));
    } catch (error) {
      if (token === this.generation) this.retry(token, message(error));
    }
  }
  private retry(token: number, error = "Conexão perdida com o sensor.") {
    if (token !== this.generation || !this.selected || this.disposed || this.retryTimer) return;
    const nextToken = ++this.generation;
    this.clearSubscriptions();
    this.update({ status: "reconnecting", reading: undefined, error });
    const delay = this.retryDelays[this.attempts++];
    if (delay === undefined) { this.update({ status: "disconnected", error: "Reconexão esgotada. Selecione o sensor para tentar novamente." }); return; }
    const id = this.selected;
    // Cancel the old link before retrying, including notification failures.
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.ble.cancelDeviceConnection(id).catch(() => undefined).then(() => this.open(nextToken));
    }, delay);
  }
  private fail(error: unknown) { this.update({ status: "error", reading: undefined, error: message(error) }); }
  async disconnect() {
    ++this.generation;
    clearTimeout(this.retryTimer);
    this.retryTimer = undefined;
    this.clearSubscriptions();
    const id = this.selected;
    this.selected = undefined;
    this.update({ status: "idle", reading: undefined, selectedId: undefined, error: undefined });
    await this.stopScan().catch(() => undefined);
    if (id) {
      await this.ble.cancelDeviceConnection(id).catch(() => undefined);
      // Some native stacks resolve a pending connection after cancellation.
      await this.pendingConnection?.catch(() => undefined);
      await this.ble.cancelDeviceConnection(id).catch(() => undefined);
    }
  }
  async dispose() {
    this.disposed = true;
    await this.disconnect();
  }
}
function message(error: unknown) { return error instanceof Error ? error.message : "Falha Bluetooth."; }
