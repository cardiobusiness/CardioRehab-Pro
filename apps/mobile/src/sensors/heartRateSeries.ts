import type { HeartRateReading } from "./heartRate";

export const STALE_AFTER_MS = 5000;
export const CHART_WINDOW_MS = 60000;
export interface HeartRatePoint { deviceId: string; time: number; bpm: number; breakBefore: boolean }

export function isCurrentReading(reading: HeartRateReading | undefined, now: number): boolean {
  if (!reading || reading.contact === "not_detected") return false;
  const age = now - Date.parse(reading.receivedAt);
  return Number.isFinite(age) && age >= 0 && age <= STALE_AFTER_MS;
}
export function appendHeartRate(history: HeartRatePoint[], reading: HeartRateReading,
  breakBefore = false): HeartRatePoint[] {
  const time = Date.parse(reading.receivedAt);
  if (reading.contact === "not_detected" || !Number.isFinite(time) || !Number.isFinite(reading.bpm) || reading.bpm <= 0) return history;
  let points = history;
  const last = points.at(-1);
  if (last && last.deviceId !== reading.deviceId) points = [];
  // Clock rollback: start a new timeline instead of drawing time backwards.
  else if (last && time < last.time) points = [];
  else if (last && time === last.time) return history;
  return [...points.filter(point => point.time >= time - CHART_WINDOW_MS),
    { deviceId: reading.deviceId, time, bpm: reading.bpm, breakBefore }].slice(-300);
}
export function chartSegments(points: HeartRatePoint[], now: number): HeartRatePoint[][] {
  const segments: HeartRatePoint[][] = [];
  for (const point of points.filter(item => item.time >= now - CHART_WINDOW_MS && item.time <= now)) {
    const current = segments.at(-1);
    const previous = current?.at(-1);
    if (!current || point.breakBefore || (previous && point.time - previous.time > STALE_AFTER_MS)) segments.push([point]);
    else current.push(point);
  }
  return segments;
}
