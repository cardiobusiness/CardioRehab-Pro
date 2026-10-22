import React from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";

const reportRows = [
  ["Paciente", "Paciente em avaliacao"],
  ["Risco cardiovascular", "alto risco"],
  ["Sensor utilizado", "Polar H10"],
  ["FC minima/media/maxima", "88 / 94 / 118 bpm"],
  ["PA inicial/durante/final", "128/78 - 138/82 - 124/76 mmHg"],
  ["Duplo produto inicial/pico/final", "11264 - 16284 - 10416"],
  ["Borg inicial/final", "1 / 3"],
  ["Sintomas", "Dispneia leve aos esforcos"],
  ["Intercorrencias", "Sem intercorrencias criticas"],
  ["Evolucao da sessao", "Boa tolerancia, sem queda pressorica"],
  ["Observacoes", "Manter monitorizacao continua"],
  ["Conduta sugerida", "Progressao gradual conforme resposta hemodinamica"]
];

export function ReportScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Relatorio final</Text>
      <View style={styles.report}>
        {reportRows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
      <Button title="Gerar PDF" onPress={() => undefined} />
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
  report: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6DEE8",
    backgroundColor: "#FFFFFF"
  },
  row: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF3",
    gap: 4
  },
  label: {
    color: "#445469",
    fontWeight: "600"
  },
  value: {
    color: "#162234"
  }
});

