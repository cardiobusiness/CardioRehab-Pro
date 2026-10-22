import React, { useState } from "react";
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import {
  buildDoubleProductSample,
  evaluateDoubleProductAlerts
} from "@cardiorehab/clinical-core";
import { MetricTile } from "../components/MetricTile";
import type { RootStackParamList } from "../App";
import { HeartRatePanel } from "../components/HeartRatePanel";
import type { HeartRateReading } from "../sensors/heartRate";

type Props = NativeStackScreenProps<RootStackParamList, "Session">;

export function SessionScreen({ navigation }: Props) {
  const [heartRate, setHeartRate] = useState<HeartRateReading>();
  const [systolic, setSystolic] = useState(0);
  const [diastolic, setDiastolic] = useState(0);
  const [spo2, setSpo2] = useState(0);
  const [borg, setBorg] = useState(0);
  const [symptoms, setSymptoms] = useState("");
  const [pressureSnapshot, setPressureSnapshot] = useState<{
    sample: ReturnType<typeof buildDoubleProductSample>;
    heartRateReceivedAt: string;
    deviceId: string;
    diastolic: number;
  }>();
  // Legacy alert rules are not enabled for live sensor data: they have not
  // undergone clinical validation or individual prescription.
  const alerts: ReturnType<typeof evaluateDoubleProductAlerts> = [];
  const doubleProduct = pressureSnapshot?.sample;
  const alertTone = alerts.some((alert) => alert.severity === "critical")
    ? "critical"
    : alerts.length > 0
      ? "warning"
      : "normal";

  function recordPressure() {
    if (!heartRate || Date.now() - Date.parse(heartRate.receivedAt) > 5000 ||
      !Number.isFinite(systolic) || !Number.isFinite(diastolic) ||
      systolic <= 0 || diastolic <= 0 || systolic <= diastolic) return;
    setPressureSnapshot({
      sample: buildDoubleProductSample({ heartRate: heartRate.bpm, systolicBloodPressure: systolic }),
      heartRateReceivedAt: heartRate.receivedAt,
      deviceId: heartRate.deviceId,
      diastolic
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Sessao de reabilitacao</Text>

      <HeartRatePanel onReading={setHeartRate} />

      <View style={styles.grid}>
        <MetricTile label="Zona alvo" value="Não prescrita" />
        <MetricTile label="PA registrada manualmente" value={pressureSnapshot ? `${pressureSnapshot.sample.systolicBloodPressure}/${pressureSnapshot.diastolic}` : "—"} />
        <MetricTile label="Duplo produto na última PA registrada" value={doubleProduct ? String(doubleProduct.value) : "—"} tone={alertTone} />
        <MetricTile label="SpO2 manual" value={spo2 ? `${spo2}%` : "—"} />
        <MetricTile label="Borg manual" value={String(borg)} />
      </View>
      {pressureSnapshot && <Text>DP: FC {pressureSnapshot.sample.heartRate} bpm recebida às {new Date(pressureSnapshot.heartRateReceivedAt).toLocaleTimeString()} do sensor {pressureSnapshot.deviceId} × PAS {pressureSnapshot.sample.systolicBloodPressure} mmHg registrada às {new Date(pressureSnapshot.sample.recordedAt).toLocaleTimeString()}. Registro local temporário; não acompanha a FC continuamente.</Text>}

      {alerts.map((alert) => (
        <Text key={alert.type} style={styles.alert}>
          {alert.message}
        </Text>
      ))}

      <View style={styles.fieldRow}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={systolic ? String(systolic) : ""}
          onChangeText={(value) => setSystolic(Number(value) || 0)}
          placeholder="PAS"
        />
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={diastolic ? String(diastolic) : ""}
          onChangeText={(value) => setDiastolic(Number(value) || 0)}
          placeholder="PAD"
        />
      </View>
      <Button title="Registrar PA medida agora e calcular DP" disabled={!heartRate || systolic <= diastolic || diastolic <= 0} onPress={recordPressure} />
      <Text>Informe a PA medida neste momento. A FC usa o horário de recebimento no celular; esta etapa não sincroniza um aparelho de pressão.</Text>

      <View style={styles.fieldRow}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(spo2)}
          onChangeText={(value) => setSpo2(Number(value) || 0)}
          placeholder="SpO2"
        />
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={String(borg)}
          onChangeText={(value) => setBorg(Number(value) || 0)}
          placeholder="Borg"
        />
      </View>

      <TextInput
        style={styles.textArea}
        value={symptoms}
        onChangeText={setSymptoms}
        placeholder="Sintomas, carga, tempo de exercicio e intercorrencias"
        multiline
      />

      <View style={styles.actions}>
        <Button title="ECG (demonstração)" onPress={() => navigation.navigate("ECG")} />
        <Button title="Relatorio (demonstração)" onPress={() => navigation.navigate("Report")} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    backgroundColor: "#F5F7FA"
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#162234"
  },
  segment: {
    gap: 8
  },
  grid: {
    gap: 10
  },
  fieldRow: {
    flexDirection: "row",
    gap: 10
  },
  input: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6DEE8",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12
  },
  textArea: {
    minHeight: 96,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6DEE8",
    backgroundColor: "#FFFFFF",
    padding: 12,
    textAlignVertical: "top"
  },
  alert: {
    borderRadius: 8,
    backgroundColor: "#FFF0F0",
    color: "#8F1D1D",
    padding: 10,
    fontWeight: "600"
  },
  actions: {
    gap: 8
  }
});

