import type { Patient, RiskAssessment, RiskCriteria } from "./types";

const reducedEfThreshold = 40;
const lowFunctionalCapacityThresholdMets = 5;

export function deriveRiskCriteria(patient: Patient): RiskCriteria {
  const text = [
    patient.cardiovascularDiagnosis,
    patient.exerciseTest,
    patient.scintigraphy,
    patient.echocardiogram,
    ...patient.comorbidities,
    ...patient.symptoms
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return {
    reducedEjectionFraction:
      typeof patient.ejectionFraction === "number" &&
      patient.ejectionFraction < reducedEfThreshold,
    ischemia: includesAny(text, ["isquemia", "isquemico", "ischemia"]),
    complexArrhythmias: includesAny(text, [
      "arritmia complexa",
      "taquicardia ventricular",
      "tvns",
      "extrassistolia complexa"
    ]),
    angina: includesAny(text, ["angina", "dor toracica", "dor precordial"]),
    dyspnea: includesAny(text, ["dispneia", "falta de ar"]),
    bloodPressureDropOnExertion: includesAny(text, [
      "queda de pressao",
      "hipotensao ao esforco",
      "queda pressorica"
    ]),
    lowFunctionalCapacity:
      typeof patient.functionalCapacityMets === "number" &&
      patient.functionalCapacityMets < lowFunctionalCapacityThresholdMets,
    heartFailure: includesAny(text, [
      "insuficiencia cardiaca",
      "icfer",
      "icfep",
      "heart failure"
    ]),
    recentCardiovascularEvent: includesAny(text, [
      "iam recente",
      "infarto recente",
      "evento recente",
      "angioplastia recente",
      "cirurgia recente"
    ]),
    significantEcgChange: includesAny(text, [
      "alteracao significativa no ecg",
      "supradesnivel",
      "infradesnivel",
      "bloqueio novo"
    ])
  };
}

export function stratifyCardiovascularRisk(patient: Patient): RiskAssessment {
  const criteria = deriveRiskCriteria(patient);
  const weightedCriteria: Array<[keyof RiskCriteria, number, string]> = [
    ["reducedEjectionFraction", 3, "fracao de ejecao reduzida"],
    ["ischemia", 3, "presenca de isquemia"],
    ["complexArrhythmias", 3, "arritmias complexas"],
    ["angina", 2, "angina"],
    ["dyspnea", 1, "dispneia"],
    ["bloodPressureDropOnExertion", 3, "queda de pressao ao esforco"],
    ["lowFunctionalCapacity", 2, "baixa capacidade funcional"],
    ["heartFailure", 2, "insuficiencia cardiaca"],
    ["recentCardiovascularEvent", 3, "evento cardiovascular recente"],
    ["significantEcgChange", 3, "alteracao significativa no ECG"]
  ];

  const active = weightedCriteria.filter(([key]) => criteria[key]);
  const score = active.reduce((total, [, weight]) => total + weight, 0);
  const highSeverityCount = active.filter(([, weight]) => weight >= 3).length;

  let level: RiskAssessment["level"] = "baixo risco";

  if (score >= 6 || highSeverityCount >= 2) {
    level = "alto risco";
  } else if (score >= 2) {
    level = "risco moderado";
  }

  return {
    level,
    score,
    criteria,
    reasons: active.map(([, , reason]) => reason)
  };
}

function includesAny(text: string, terms: string[]): boolean {
  return terms.some((term) => text.includes(term));
}

