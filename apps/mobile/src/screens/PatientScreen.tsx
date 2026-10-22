import React, { useMemo } from "react";
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { stratifyCardiovascularRisk, type Patient } from "@cardiorehab/clinical-core";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "Patient">;

const samplePatient: Patient = {
  name: "Paciente em avaliacao",
  age: 62,
  sex: "female",
  weightKg: 78,
  heightCm: 164,
  cardiovascularDiagnosis: "Insuficiencia cardiaca com fracao de ejecao reduzida",
  procedurePerformed: "Angioplastia previa",
  comorbidities: ["Hipertensao arterial", "Diabetes mellitus"],
  medications: ["Betabloqueador", "IECA"],
  betaBlocker: true,
  pacemaker: false,
  icd: false,
  ejectionFraction: 38,
  exerciseTest: "Baixa capacidade funcional sem isquemia induzida",
  scintigraphy: "Sem defeitos perfusionais relevantes",
  echocardiogram: "FEVE 38%",
  functionalCapacityMets: 4.5,
  symptoms: ["Dispneia aos esforcos"]
};

export function PatientScreen({ navigation }: Props) {
  const risk = useMemo(() => stratifyCardiovascularRisk(samplePatient), []);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Cadastro de paciente</Text>
      {[
        ["Nome", samplePatient.name],
        ["Idade", String(samplePatient.age)],
        ["Sexo", samplePatient.sex],
        ["Peso", `${samplePatient.weightKg} kg`],
        ["Altura", `${samplePatient.heightCm} cm`],
        ["Diagnostico cardiovascular", samplePatient.cardiovascularDiagnosis ?? ""],
        ["Procedimento realizado", samplePatient.procedurePerformed ?? ""],
        ["Comorbidades", samplePatient.comorbidities.join(", ")],
        ["Medicamentos", samplePatient.medications.join(", ")],
        ["Fracao de ejecao", `${samplePatient.ejectionFraction}%`],
        ["Capacidade funcional", `${samplePatient.functionalCapacityMets} METs`],
        ["Sintomas", samplePatient.symptoms.join(", ")]
      ].map(([label, value]) => (
        <View key={label} style={styles.field}>
          <Text style={styles.label}>{label}</Text>
          <TextInput value={value} editable={false} style={styles.input} />
        </View>
      ))}

      <View style={styles.riskBox}>
        <Text style={styles.label}>Estratificacao inicial</Text>
        <Text style={styles.risk}>{risk.level}</Text>
        <Text style={styles.reasons}>{risk.reasons.join(", ") || "Sem criterios ativos"}</Text>
      </View>

      <Button title="Iniciar sessao" onPress={() => navigation.navigate("Session")} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
    backgroundColor: "#F5F7FA"
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#162234"
  },
  field: {
    gap: 6
  },
  label: {
    color: "#445469",
    fontSize: 13,
    fontWeight: "600"
  },
  input: {
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6DEE8",
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    color: "#162234"
  },
  riskBox: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D89A00",
    backgroundColor: "#FFF8E6",
    padding: 12,
    gap: 4
  },
  risk: {
    fontSize: 20,
    fontWeight: "700",
    color: "#7A4B00"
  },
  reasons: {
    color: "#445469"
  }
});

