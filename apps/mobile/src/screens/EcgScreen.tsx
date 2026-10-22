import React, { useMemo, useState } from "react";
import { Button, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";
import { downsampleEcg, type EcgSample } from "@cardiorehab/clinical-core";
import { MockPolarBleAdapter } from "../services/polarBleService";

export function EcgScreen() {
  const [samples, setSamples] = useState<EcgSample[]>([]);
  const adapter = useMemo(() => new MockPolarBleAdapter(), []);
  const visibleSamples = downsampleEcg(samples, 160);
  const points = visibleSamples
    .map((sample, index) => `${index * 2},${70 - sample.microvolts / 12}`)
    .join(" ");

  async function startEcg() {
    const nextSamples: EcgSample[] = [];
    await adapter.startEcgStream?.((sample) => nextSamples.push(sample));
    setSamples(nextSamples);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>Modulo ECG Polar H10</Text>
      <Button title="Iniciar streaming ECG" onPress={startEcg} />
      <View style={styles.traceBox}>
        <Svg width="100%" height="150" viewBox="0 0 320 150">
          <Polyline points={points} fill="none" stroke="#1F7A8C" strokeWidth="2" />
        </Svg>
      </View>
      <Button title="Marcar sintoma no tracado" onPress={() => undefined} />
      <Button title="Salvar trecho de ECG na sessao" onPress={() => undefined} />
      <Text style={styles.note}>
        Amostras carregadas: {samples.length}. O adaptador atual simula ECG e deve ser
        substituido pelo Polar BLE SDK no build nativo.
      </Text>
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
  traceBox: {
    height: 170,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6DEE8",
    backgroundColor: "#FFFFFF",
    justifyContent: "center"
  },
  note: {
    color: "#445469"
  }
});

