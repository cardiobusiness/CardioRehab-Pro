import type { DoubleProductSample } from "./types";

export type DoubleProductAlertType =
  | "very_high"
  | "abrupt_increase"
  | "bp_drop_with_hr_increase"
  | "symptoms_associated";

export interface DoubleProductAlert {
  type: DoubleProductAlertType;
  severity: "warning" | "critical";
  message: string;
}

export interface DoubleProductInput {
  heartRate: number;
  systolicBloodPressure: number;
  previous?: DoubleProductSample;
  previousSystolicBloodPressure?: number;
  previousHeartRate?: number;
  symptoms?: string[];
  highThreshold?: number;
  abruptIncreasePercent?: number;
}

export function calculateDoubleProduct(
  heartRate: number,
  systolicBloodPressure: number
): number {
  return heartRate * systolicBloodPressure;
}

export function buildDoubleProductSample(
  input: Pick<DoubleProductInput, "heartRate" | "systolicBloodPressure">
): DoubleProductSample {
  return {
    value: calculateDoubleProduct(input.heartRate, input.systolicBloodPressure),
    heartRate: input.heartRate,
    systolicBloodPressure: input.systolicBloodPressure,
    recordedAt: new Date().toISOString()
  };
}

export function evaluateDoubleProductAlerts(
  input: DoubleProductInput
): DoubleProductAlert[] {
  const value = calculateDoubleProduct(
    input.heartRate,
    input.systolicBloodPressure
  );
  const highThreshold = input.highThreshold ?? 25000;
  const abruptIncreasePercent = input.abruptIncreasePercent ?? 25;
  const alerts: DoubleProductAlert[] = [];

  if (value >= highThreshold) {
    alerts.push({
      type: "very_high",
      severity: value >= highThreshold * 1.15 ? "critical" : "warning",
      message: "Duplo produto muito elevado."
    });
  }

  if (input.previous && input.previous.value > 0) {
    const increase =
      ((value - input.previous.value) / input.previous.value) * 100;

    if (increase >= abruptIncreasePercent) {
      alerts.push({
        type: "abrupt_increase",
        severity: increase >= abruptIncreasePercent * 1.5 ? "critical" : "warning",
        message: "Aumento abrupto do duplo produto."
      });
    }
  }

  if (
    typeof input.previousSystolicBloodPressure === "number" &&
    typeof input.previousHeartRate === "number" &&
    input.systolicBloodPressure < input.previousSystolicBloodPressure - 10 &&
    input.heartRate > input.previousHeartRate + 10
  ) {
    alerts.push({
      type: "bp_drop_with_hr_increase",
      severity: "critical",
      message: "Queda de PA com aumento de FC."
    });
  }

  if ((input.symptoms ?? []).length > 0) {
    alerts.push({
      type: "symptoms_associated",
      severity: "critical",
      message: "Sintomas associados durante a sessao."
    });
  }

  return alerts;
}

