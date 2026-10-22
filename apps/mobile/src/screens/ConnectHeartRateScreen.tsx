import React from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { HeartRatePanel } from "../components/HeartRatePanel";

export function ConnectHeartRateScreen() {
  return <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Conectar frequencímetro</Text>
    <Text style={styles.subtitle}>Selecione seu sensor para acompanhar a frequência cardíaca em tempo real. A leitura funciona sem internet.</Text>
    <HeartRatePanel allowSimulation onReading={() => undefined} />
  </ScrollView>;
}
const styles = StyleSheet.create({
  container: { padding: 16, gap: 16, backgroundColor: "#F5F7FA", flexGrow: 1 },
  title: { fontSize: 26, fontWeight: "800", color: "#162234" }, subtitle: { color: "#445469", lineHeight: 21 }
});
