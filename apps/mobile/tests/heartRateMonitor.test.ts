import { test } from "node:test";
import assert from "node:assert/strict";
import { HEART_RATE_MEASUREMENT, HEART_RATE_SERVICE } from "../src/sensors/heartRate.ts";
import { HeartRateMonitor, type BleTransport, type MonitorSnapshot, type SensorDevice } from "../src/sensors/heartRateMonitor.ts";

class FakeBle implements BleTransport {
  scanListener?: Parameters<BleTransport["startDeviceScan"]>[2];
  measurement?: Parameters<BleTransport["monitorCharacteristicForDevice"]>[3];
  disconnected?: Parameters<BleTransport["onDeviceDisconnected"]>[1];
  connects: string[] = [];
  cancels: string[] = [];
  removed = 0;
  failConnect = false;
  compatible = true;
  filter: string[] | null = null;
  async startDeviceScan(uuids: string[] | null, _options: null, callback: NonNullable<FakeBle["scanListener"]>) { this.filter = uuids; this.scanListener = callback; }
  async stopDeviceScan() {}
  async connectToDevice(id: string) { this.connects.push(id); if (this.failConnect) throw new Error("timeout"); }
  async discoverAllServicesAndCharacteristicsForDevice() {}
  async characteristicsForDevice() { return this.compatible ? [{ uuid: HEART_RATE_MEASUREMENT, isNotifiable: true }] : []; }
  monitorCharacteristicForDevice(_id: string, _service: string, _characteristic: string, callback: NonNullable<FakeBle["measurement"]>) {
    this.measurement = callback; return { remove: () => { ++this.removed; } };
  }
  onDeviceDisconnected(_id: string, callback: NonNullable<FakeBle["disconnected"]>) {
    this.disconnected = callback; return { remove: () => { ++this.removed; } };
  }
  async cancelDeviceConnection(id: string) { this.cancels.push(id); }
}
function setup(delays: number[] = [1]) {
  const ble = new FakeBle();
  let snapshot: MonitorSnapshot = { status: "idle", devices: [], rejected: 0 };
  const monitor = new HeartRateMonitor(ble, next => { snapshot = next; }, delays);
  return { ble, monitor, current: () => snapshot };
}
const tick = () => new Promise(resolve => setTimeout(resolve, 15));
test("discovers HRS devices, deduplicates and updates RSSI without auto connecting", async () => {
  const { ble, monitor, current } = setup();
  await monitor.scan();
  assert.deepEqual(ble.filter, [HEART_RATE_SERVICE]);
  const device: SensorDevice = { id: "a", name: "Generic", localName: null, rssi: -80, manufacturerData: null };
  ble.scanListener!(null, device);
  ble.scanListener!(null, { ...device, rssi: -40 });
  assert.equal(current().devices.length, 1);
  assert.equal(current().devices[0].rssi, -40);
  assert.deepEqual(ble.connects, []);
  await monitor.dispose();
});
test("validates actual characteristic and does not retry incompatible devices", async () => {
  const { ble, monitor, current } = setup();
  ble.compatible = false;
  await monitor.connect("unsupported");
  assert.equal(current().status, "error");
  await tick();
  assert.equal(ble.connects.length, 1);
  await monitor.dispose();
});
test("streams with device attribution and clears invalid readings", async () => {
  const { ble, monitor, current } = setup();
  await monitor.connect("a");
  ble.measurement!(null, { value: "AEg=" });
  assert.equal(current().reading?.bpm, 72);
  assert.equal(current().reading?.deviceId, "a");
  ble.measurement!(null, { value: "bad" });
  assert.equal(current().reading, undefined);
  assert.equal(current().rejected, 1);
  await monitor.dispose();
});
test("reconnects only the selected sensor and ignores old stream callbacks", async () => {
  const { ble, monitor, current } = setup();
  await monitor.connect("a");
  const old = ble.measurement!;
  ble.disconnected!(null);
  assert.equal(current().status, "reconnecting");
  assert.equal(current().reading, undefined);
  await tick();
  assert.deepEqual(ble.connects, ["a", "a"]);
  old(null, { value: "AEg=" });
  assert.equal(current().reading, undefined);
  ble.measurement!(null, { value: "AEg=" });
  assert.equal(current().reading?.bpm, 72);
  await monitor.dispose();
});
test("manual disconnect cancels retries and queued notifications", async () => {
  const { ble, monitor, current } = setup();
  await monitor.connect("a");
  const old = ble.measurement!;
  ble.disconnected!(null);
  await monitor.disconnect();
  await tick();
  old(null, { value: "AEg=" });
  assert.equal(current().status, "idle");
  assert.equal(current().reading, undefined);
  assert.equal(ble.connects.length, 1);
  await monitor.dispose();
});
test("stops after bounded retries when native connection fails", async () => {
  const { ble, monitor, current } = setup();
  ble.failConnect = true;
  await monitor.connect("a");
  await tick();
  assert.equal(current().status, "disconnected");
  assert.equal(ble.connects.length, 2);
  await monitor.dispose();
});
test("switching sensors rejects old patient's callbacks", async () => {
  const { ble, monitor, current } = setup();
  await monitor.connect("a");
  const old = ble.measurement!;
  await monitor.connect("b");
  old(null, { value: "AEg=" });
  assert.equal(current().reading, undefined);
  ble.measurement!(null, { value: "AEg=" });
  assert.equal(current().reading?.deviceId, "b");
  await monitor.dispose();
});
test("dispose releases subscriptions and ignores delayed native callbacks", async () => {
  const { ble, monitor, current } = setup();
  await monitor.connect("a");
  const oldSnapshot = current();
  const old = ble.measurement!;
  await monitor.dispose();
  old(null, { value: "AEg=" });
  assert.equal(current(), oldSnapshot);
  assert.equal(ble.removed, 2);
});
test("disposal cancels a connection that resolves after native cancellation", async () => {
  const { ble, monitor } = setup();
  let finish!: () => void;
  ble.connectToDevice = async id => { ble.connects.push(id); await new Promise<void>(resolve => { finish = resolve; }); };
  const connection = monitor.connect("a");
  await tick();
  const disposal = monitor.dispose();
  finish();
  await Promise.all([connection, disposal]);
  assert.equal(ble.measurement, undefined);
  assert.ok(ble.cancels.includes("a"));
});
test("notification errors reconnect without accepting buffered readings from the old stream", async () => {
  const { ble, monitor, current } = setup();
  await monitor.connect("a");
  const old = ble.measurement!;
  old(new Error("notification failed"), null);
  await tick();
  assert.equal(current().status, "streaming");
  old(null, { value: "AEg=" });
  assert.equal(current().reading, undefined);
  await monitor.dispose();
});
