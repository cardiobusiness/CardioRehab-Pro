import { test } from "node:test";
import assert from "node:assert/strict";
import { appendHeartRate, chartSegments, isCurrentReading } from "../src/sensors/heartRateSeries.ts";
import type { HeartRateReading } from "../src/sensors/heartRate.ts";

function reading(time: number, deviceId = "a"): HeartRateReading {
  return { deviceId, bpm: 80, rrIntervalsMs: [], contact: "unsupported", receivedAt: new Date(time).toISOString() };
}
test("freshness rejects absent, invalid, future, expired and no-contact readings", () => {
  assert.equal(isCurrentReading(undefined, 0), false);
  assert.equal(isCurrentReading(reading(0), 5000), true);
  assert.equal(isCurrentReading(reading(0), 5001), false);
  assert.equal(isCurrentReading(reading(1000), 0), false);
  assert.equal(isCurrentReading({ ...reading(0), receivedAt: "invalid" }, 0), false);
  assert.equal(isCurrentReading({ ...reading(0), contact: "not_detected" }, 0), false);
});
test("chart uses actual timestamps and never bridges a signal loss", () => {
  let history = appendHeartRate([], reading(1000));
  history = appendHeartRate(history, reading(2000));
  history = appendHeartRate(history, reading(10000));
  history = appendHeartRate(history, reading(11000), true);
  assert.deepEqual(chartSegments(history, 11000).map(segment => segment.map(point => point.time)), [[1000, 2000], [10000], [11000]]);
});
test("bounded chart drops old samples and never mixes sensors", () => {
  let history = appendHeartRate([], reading(0));
  history = appendHeartRate(history, reading(61000));
  assert.equal(history.length, 1);
  assert.equal(chartSegments(history, 122000).length, 0);
  history = appendHeartRate(history, reading(62000, "b"));
  assert.equal(history.length, 1);
  assert.equal(history[0].deviceId, "b");
});
test("duplicate, no-contact, invalid and backward clock values cannot corrupt timeline", () => {
  const history = appendHeartRate([], reading(5000));
  assert.equal(appendHeartRate(history, reading(5000)), history);
  assert.equal(appendHeartRate(history, { ...reading(6000), contact: "not_detected" }), history);
  assert.equal(appendHeartRate(history, { ...reading(6000), bpm: NaN }), history);
  assert.equal(appendHeartRate(history, reading(1000)).length, 1);
});
test("high notification rates are bounded to 300 points", () => {
  let history = [] as ReturnType<typeof appendHeartRate>;
  for (let index = 0; index < 1000; ++index) history = appendHeartRate(history, reading(index));
  assert.equal(history.length, 300);
});
