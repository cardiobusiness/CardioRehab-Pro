import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeScreen } from "./screens/HomeScreen";
import { PatientScreen } from "./screens/PatientScreen";
import { SessionScreen } from "./screens/SessionScreen";
import { EcgScreen } from "./screens/EcgScreen";
import { ReportScreen } from "./screens/ReportScreen";
import { ConnectHeartRateScreen } from "./screens/ConnectHeartRateScreen";

export type RootStackParamList = {
  Home: undefined;
  Patient: undefined;
  Session: undefined;
  ECG: undefined;
  Report: undefined;
  ConnectHeartRate: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="ConnectHeartRate" component={ConnectHeartRateScreen} options={{ title: "Conectar frequencímetro" }} />
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "CardioRehab Pro" }}
        />
        <Stack.Screen
          name="Patient"
          component={PatientScreen}
          options={{ title: "CardioRehab Pro" }}
        />
        <Stack.Screen
          name="Session"
          component={SessionScreen}
          options={{ title: "Sessao de reabilitacao" }}
        />
        <Stack.Screen
          name="ECG"
          component={EcgScreen}
          options={{ title: "ECG Polar H10" }}
        />
        <Stack.Screen
          name="Report"
          component={ReportScreen}
          options={{ title: "Relatorio final" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
