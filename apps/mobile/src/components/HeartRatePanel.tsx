import React, { useCallback, useEffect, useRef, useState } from "react";
import { AppState, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { BleManager } from "react-native-ble-plx";
import { toByteArray } from "base64-js";
import { HeartRateMonitor, type MonitorSnapshot } from "../sensors/heartRateMonitor";
import { prepareBluetooth } from "../sensors/nativeBle";
import type { HeartRateReading } from "../sensors/heartRate";
import { SimulatedBleTransport } from "../sensors/simulatedBle";
import { appendHeartRate, isCurrentReading, type HeartRatePoint } from "../sensors/heartRateSeries";
import { HeartRateChart } from "./HeartRateChart";

const labels = {
  idle: "Pronto para buscar", scanning: "Buscando sensores…", connecting: "Conectando…",
  streaming: "Conectado", reconnecting: "Tentando reconectar…", disconnected: "Desconectado", error: "Bluetooth indisponível"
};
const initial: MonitorSnapshot = { status: "idle", devices: [], rejected: 0 };
// BLE PLX owns a native client. Finish destruction before a rapid screen
// re-entry creates another manager, so old cleanup cannot destroy the new one.
let previousCleanup: Promise<void> = Promise.resolve();
export function HeartRatePanel({ onReading, allowSimulation = false }: { onReading: (reading?: HeartRateReading) => void; allowSimulation?: boolean }) {
  const [simulated, setSimulated] = useState(false);
  const [paused, setPaused] = useState(false);
  const [history, setHistory] = useState<HeartRatePoint[]>([]);
  const [snapshot, setSnapshot] = useState(initial);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const monitorRef = useRef<HeartRateMonitor | null>(null);
  const managerRef = useRef<BleManager | null>(null);
  const simulatorRef = useRef<SimulatedBleTransport | null>(null);
  const onReadingRef = useRef(onReading);
  onReadingRef.current = onReading;
  const busyRef = useRef(false);

  useFocusEffect(useCallback(() => {
    let active = true;
    setSnapshot(initial);
    setHistory([]);
    setPaused(false);
    setBusy(false);
    busyRef.current = false;
    onReadingRef.current(undefined);
    let manager: BleManager | undefined;
    let monitor: HeartRateMonitor | undefined;
    let simulator: SimulatedBleTransport | undefined;
    let lastReading: HeartRateReading | undefined;
    let needsBreak = true;
    const receive = (value: MonitorSnapshot) => {
      if (!active) return;
      setSnapshot(value);
      setNow(Date.now());
      if (value.status !== "streaming" || !value.reading) needsBreak = true;
      if (value.reading && value.reading !== lastReading) {
        lastReading = value.reading;
        if (value.reading.contact === "not_detected") needsBreak = true;
        else {
          const breakBefore = needsBreak;
          const reading = value.reading;
          setHistory(previous => appendHeartRate(previous, reading, breakBefore));
          needsBreak = false;
        }
      }
    };
    let stateSubscription: { remove(): void } | undefined;
    const initialize = previousCleanup.then(() => {
      if (!active) return;
      if (simulated) {
        simulator = new SimulatedBleTransport();
        simulatorRef.current = simulator;
        monitor = new HeartRateMonitor(simulator, receive);
        monitorRef.current = monitor;
        return;
      }
      try { manager = new BleManager(); }
      catch { setSnapshot({ ...initial, status: "error", error: "Módulo BLE indisponível. Recompile o aplicativo nativo." }); return; }
      const ownedMonitor = new HeartRateMonitor(manager, receive);
      monitor = ownedMonitor;
      managerRef.current = manager;
      monitorRef.current = ownedMonitor;
      stateSubscription = manager.onStateChange(state => {
        if (!active) return;
        if (state === "PoweredOff" || state === "Unauthorized" || state === "Unsupported") {
          void ownedMonitor.disconnect();
          onReadingRef.current(undefined);
          setSnapshot(previous => ({ ...previous, reading: undefined, status: "error", error: "Bluetooth desligado ou indisponível." }));
        }
      });
    }).catch(() => {
      if (active) setSnapshot({ ...initial, status: "error", error: "Falha ao inicializar Bluetooth. Verifique o build nativo." });
    });
    const appSubscription = AppState.addEventListener("change", state => {
      if (state !== "active") { void monitor?.disconnect(); onReadingRef.current(undefined); }
    });
    return () => {
      active = false;
      stateSubscription?.remove();
      appSubscription.remove();
      monitorRef.current = null;
      managerRef.current = null;
      simulatorRef.current = null;
      onReadingRef.current(undefined);
      previousCleanup = initialize.then(async () => {
        await monitor?.dispose();
        await manager?.destroy();
        await simulator?.destroy();
      }).catch(() => undefined);
    };
  }, [simulated]));

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  const reading = snapshot.reading;
  const age = reading ? Math.max(0, (now - Date.parse(reading.receivedAt)) / 1000) : Infinity;
  const usable = snapshot.status === "streaming" && isCurrentReading(reading, now);
  useEffect(() => { onReadingRef.current(usable ? reading : undefined); }, [usable, reading]);

  async function act(action: (monitor: HeartRateMonitor) => Promise<void>, prepare = false) {
    const monitor = monitorRef.current;
    const manager = managerRef.current;
    if (!monitor || (!simulated && !manager) || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (prepare && !simulated && manager) await prepareBluetooth(manager);
      if (monitorRef.current === monitor && AppState.currentState === "active") await action(monitor);
    } catch (error) {
      if (monitorRef.current === monitor) setSnapshot(previous => ({ ...previous, status: "error", reading: undefined, error: error instanceof Error ? error.message : "Falha Bluetooth." }));
    } finally {
      if (monitorRef.current === monitor) { busyRef.current = false; setBusy(false); }
    }
  }
  const locked = busy || ["connecting", "reconnecting"].includes(snapshot.status);
  return (
    <View style={styles.panel}>
      <Text style={styles.heading}>Sensor de frequência cardíaca</Text>
      {allowSimulation && <View style={styles.actions}>
        <Action label={simulated ? "Usar sensor Bluetooth real" : "Sensor Bluetooth real selecionado"} disabled={busy || !simulated} onPress={() => setSimulated(false)} />
        <Action label={simulated ? "Simulador selecionado" : "Testar sem sensor: simulador"} disabled={busy || simulated} onPress={() => setSimulated(true)} />
      </View>}
      {simulated && <Text accessibilityLiveRegion="polite" style={styles.simulated}>SIMULAÇÃO ATIVA · BPM, RR, conexão e RSSI são artificiais. Nenhum sensor físico está conectado.</Text>}
      <Text accessibilityLiveRegion="polite">{labels[snapshot.status]}{simulated ? " · SIMULADO" : ""}</Text>
      <Text style={styles.bpm}>{usable && reading ? reading.bpm : "—"}<Text style={styles.unit}> bpm</Text></Text>
      <Text>{reading ? (age > 5 ? "Dados desatualizados" : reading.contact === "not_detected" ? "Sensor sem contato com a pele" : "Leitura recebida") : "Aguardando uma leitura válida"}</Text>
      {reading && <Text style={styles.detail}>Recebida às {new Date(reading.receivedAt).toLocaleTimeString()} · {Math.floor(age)} s atrás</Text>}
      {usable && reading && <Text style={styles.detail}>RR: {reading.rrIntervalsMs.length ? reading.rrIntervalsMs.map(rr => rr.toFixed(1)).join(" / ") + " ms" : "não disponibilizado"}</Text>}
      <HeartRateChart points={history} now={now} simulated={simulated} />
      <Text style={styles.detail}>Qualidade: {reading?.contact === "detected" ? "contato informado pelo sensor" : reading?.contact === "not_detected" ? "sem contato" : "contato não informado"}. RSSI indica proximidade, não qualidade clínica.</Text>
      {snapshot.error && <Text accessibilityLiveRegion="polite" style={styles.error}>{snapshot.error}</Text>}
      {snapshot.rejected > 0 && <Text style={styles.error}>Medições rejeitadas: {snapshot.rejected}</Text>}
      <View style={styles.actions}>
        <Action label={snapshot.status === "scanning" ? "Parar busca" : simulated ? "Procurar sensor simulado" : "Buscar sensores BLE"} disabled={locked || snapshot.status === "streaming"} onPress={() => void act(monitor => snapshot.status === "scanning" ? monitor.stopScan() : monitor.scan(), snapshot.status !== "scanning")} />
        <Action label="Desconectar" disabled={busy || !snapshot.selectedId} onPress={() => void act(monitor => monitor.disconnect())} />
      </View>
      {simulated && snapshot.status === "streaming" && <View style={styles.actions}>
        <Action label={paused ? "Retomar dados simulados" : "Pausar dados: testar sinal desatualizado"} onPress={() => { simulatorRef.current?.setPaused(!paused); setPaused(!paused); }} />
        <Action label="Simular desconexão e reconexão" onPress={() => simulatorRef.current?.simulateDisconnect()} />
      </View>}
      {snapshot.devices.map(device => (
        <View key={device.id} style={styles.device}>
          <Text style={styles.name}>{device.localName || device.name || "Sensor BLE sem nome"}</Text>
          <Text selectable style={styles.detail}>{device.id}</Text>
          <Text style={styles.detail}>RSSI{simulated ? " simulado" : " na descoberta"}: {device.rssi ?? "indisponível"} dBm · {manufacturer(device.manufacturerData)}</Text>
          <Action label={snapshot.selectedId === device.id ? snapshot.status === "streaming" ? "Sensor conectado" : "Reconectar este sensor" : "Conectar este sensor"} disabled={locked || (snapshot.selectedId === device.id && snapshot.status === "streaming")} onPress={() => void act(monitor => monitor.connect(device.id), true)} />
        </View>
      ))}
      {snapshot.status === "idle" && snapshot.devices.length === 0 && <Text style={styles.detail}>Ative e vista o sensor. A busca dura 12 segundos e lista dispositivos que anunciam Heart Rate Service.</Text>}
      {snapshot.status === "idle" && snapshot.devices.length > 0 && <Text style={styles.detail}>Selecione o sensor pelo nome e identificador para conectar.</Text>}
      <Text style={styles.detail}>Confirme o identificador do sensor antes de conectar. Esta etapa não vincula pacientes nem salva sessões. Ao sair da tela ou colocar o app em segundo plano, a conexão é encerrada.</Text>
    </View>
  );
}
function manufacturer(value: string | null) {
  if (!value) return "fabricante não anunciado";
  try {
    const bytes = toByteArray(value);
    return bytes.length >= 2 ? `ID de fabricante anunciado: 0x${(bytes[0] + bytes[1] * 256).toString(16).padStart(4, "0")}` : "fabricante não identificado";
  } catch { return "fabricante não identificado"; }
}
function Action({ label, disabled, onPress }: { label: string; disabled?: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><Text style={styles.buttonText}>{label}</Text></Pressable>;
}
const styles = StyleSheet.create({
  panel: { backgroundColor: "#FFFFFF", padding: 18, borderRadius: 16, borderWidth: 1, borderColor: "#38E7A7", gap: 10 },
  heading: { fontSize: 19, fontWeight: "700", color: "#162234" },
  bpm: { fontSize: 52, fontWeight: "700", color: "#126347" },
  unit: { fontSize: 20 }, detail: { color: "#445469", fontSize: 13 },
  error: { color: "#8F1D1D" }, actions: { gap: 8 },
  simulated: { backgroundColor: "#FFF1CC", color: "#704600", padding: 12, borderRadius: 8, fontWeight: "700" },
  device: { paddingTop: 12, borderTopWidth: 1, borderColor: "#D6DEE8", gap: 6 },
  name: { fontWeight: "700", color: "#162234" },
  button: { backgroundColor: "#38E7A7", borderRadius: 10, padding: 12, alignItems: "center", minHeight: 44 },
  disabled: { opacity: 0.4 }, buttonText: { color: "#103A2B", fontWeight: "700" }
});
