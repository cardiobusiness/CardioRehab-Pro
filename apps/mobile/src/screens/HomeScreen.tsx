import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../App";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const actions: Array<{
  label: string;
  route: keyof RootStackParamList;
}> = [
  { label: "Cadastrar paciente", route: "Patient" },
  { label: "Iniciar sessao", route: "Session" },
  { label: "Conectar frequencímetro", route: "ConnectHeartRate" },
  { label: "Estratificacao de risco", route: "Patient" },
  { label: "Relatorios", route: "Report" }
];

export function HomeScreen({ navigation }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CardioRehab Pro</Text>
      <View style={styles.actions}>
        {actions.map((action) => (
          <Pressable
            key={action.label}
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={() => navigation.navigate(action.route)}
          >
            <Text style={styles.buttonText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#F5F7FA"
  },
  title: {
    color: "#162234",
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 28,
    textAlign: "center"
  },
  actions: {
    gap: 12
  },
  button: {
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: "#38E7A7",
    justifyContent: "center",
    paddingHorizontal: 16
  },
  buttonPressed: {
    backgroundColor: "#2BC68E"
  },
  buttonText: {
    color: "#103A2B",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center"
  }
});

