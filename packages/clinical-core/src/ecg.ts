import type { EcgEvent, EcgSample } from "./types";

export interface EcgStrip {
  label: string;
  samples: EcgSample[];
  events: EcgEvent[];
}

export function saveEcgStrip(
  label: string,
  samples: EcgSample[],
  events: EcgEvent[],
  startSampleIndex: number,
  endSampleIndex: number
): EcgStrip {
  const start = Math.max(0, startSampleIndex);
  const end = Math.min(samples.length, endSampleIndex);

  return {
    label,
    samples: samples.slice(start, end),
    events: events.filter((event) => {
      if (typeof event.startSampleIndex !== "number") {
        return false;
      }

      return event.startSampleIndex >= start && event.startSampleIndex <= end;
    })
  };
}

export function downsampleEcg(samples: EcgSample[], maxPoints: number): EcgSample[] {
  if (samples.length <= maxPoints) {
    return samples;
  }

  const step = Math.ceil(samples.length / maxPoints);
  return samples.filter((_, index) => index % step === 0);
}

