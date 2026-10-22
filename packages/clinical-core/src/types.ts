export type Sex = "female" | "male" | "other";

export type RiskLevel = "baixo risco" | "risco moderado" | "alto risco";

export type SensorModel = "polar_h7" | "polar_h10" | "polar_verity_sense";

export interface Patient {
  id?: string;
  name: string;
  age: number;
  sex: Sex;
  weightKg?: number;
  heightCm?: number;
  cardiovascularDiagnosis?: string;
  procedurePerformed?: string;
  comorbidities: string[];
  medications: string[];
  betaBlocker: boolean;
  pacemaker: boolean;
  icd: boolean;
  ejectionFraction?: number;
  exerciseTest?: string;
  scintigraphy?: string;
  echocardiogram?: string;
  functionalCapacityMets?: number;
  symptoms: string[];
}

export interface RiskCriteria {
  reducedEjectionFraction: boolean;
  ischemia: boolean;
  complexArrhythmias: boolean;
  angina: boolean;
  dyspnea: boolean;
  bloodPressureDropOnExertion: boolean;
  lowFunctionalCapacity: boolean;
  heartFailure: boolean;
  recentCardiovascularEvent: boolean;
  significantEcgChange: boolean;
}

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  criteria: RiskCriteria;
  reasons: string[];
}

export interface BloodPressure {
  systolic: number;
  diastolic: number;
  phase: "initial" | "exercise" | "final";
  recordedAt: string;
}

export interface HeartRateSample {
  bpm: number;
  rrIntervalsMs?: number[];
  recordedAt: string;
}

export interface Spo2Sample {
  value: number;
  recordedAt: string;
}

export interface BorgSample {
  value: number;
  recordedAt: string;
}

export interface DoubleProductSample {
  value: number;
  heartRate: number;
  systolicBloodPressure: number;
  recordedAt: string;
}

export interface EcgSample {
  microvolts: number;
  recordedAt: string;
}

export interface EcgEvent {
  label: string;
  symptom?: string;
  recordedAt: string;
  startSampleIndex?: number;
  endSampleIndex?: number;
}

export interface RehabSession {
  id?: string;
  patientId: string;
  sensorModel: SensorModel;
  startedAt: string;
  finishedAt?: string;
  targetZoneBpm?: {
    min: number;
    max: number;
  };
  heartRate: HeartRateSample[];
  bloodPressure: BloodPressure[];
  spo2: Spo2Sample[];
  borg: BorgSample[];
  symptoms: string[];
  exerciseLoad?: string;
  exerciseTimeMinutes?: number;
  incidents: string[];
  doubleProduct: DoubleProductSample[];
  ecg?: {
    samples: EcgSample[];
    events: EcgEvent[];
    savedStrips: Array<{
      label: string;
      startSampleIndex: number;
      endSampleIndex: number;
    }>;
  };
  therapistNotes?: string;
  suggestedConduct?: string;
}

