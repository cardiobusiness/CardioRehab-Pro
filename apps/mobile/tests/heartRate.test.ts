import { test } from "node:test";
import assert from "node:assert/strict";
import { fromByteArray } from "base64-js";
import { parseHeartRate } from "../src/sensors/heartRate.ts";

const packet = (...bytes: number[]) => fromByteArray(Uint8Array.from(bytes));
test("decodes uint8 BPM and records phone receipt time and device identity", () => {
  const reading = parseHeartRate(packet(0, 72), "sensor-a", 0);
  assert.equal(reading.bpm, 72);
  assert.equal(reading.receivedAt, "1970-01-01T00:00:00.000Z");
  assert.equal(reading.deviceId, "sensor-a");
  assert.equal(reading.contact, "unsupported");
});
test("decodes uint16 little endian, contact, energy, multiple RR in 1/1024 seconds", () => {
  const reading = parseHeartRate(packet(31, 44, 1, 10, 0, 0, 4, 0, 2), "sensor-b");
  assert.equal(reading.bpm, 300);
  assert.equal(reading.energyExpendedKj, 10);
  assert.equal(reading.contact, "detected");
  assert.deepEqual(reading.rrIntervalsMs, [1000, 500]);
});
test("distinguishes missing skin contact from unsupported detection", () => {
  assert.equal(parseHeartRate(packet(4, 65), "a").contact, "not_detected");
});
test("rejects malformed base64, zero pulse, reserved flags, truncated fields and trailing bytes", () => {
  for (const value of ["", "!!!!", "A", packet(0), packet(0, 0), packet(32, 70), packet(1, 70),
    packet(8, 70, 1), packet(16, 70), packet(16, 70, 1), packet(16, 70, 0, 0), packet(0, 70, 1)]) {
    assert.throws(() => parseHeartRate(value, "a"), undefined, value);
  }
});
test("retains fractional milliseconds rather than rounding RR", () => {
  assert.deepEqual(parseHeartRate(packet(16, 70, 1, 0), "a").rrIntervalsMs, [0.9765625]);
});
