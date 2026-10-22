import React from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Line, Polyline, Text as SvgText } from "react-native-svg";
import { CHART_WINDOW_MS, chartSegments, type HeartRatePoint } from "../sensors/heartRateSeries";

export function HeartRateChart({ points, now, simulated }: { points: HeartRatePoint[]; now: number; simulated: boolean }) {
  const segments = chartSegments(points, now);
  const visible = segments.flat();
  const min = Math.max(0, Math.floor((Math.min(60, ...visible.map(point => point.bpm)) - 10) / 10) * 10);
  const max = Math.ceil((Math.max(120, ...visible.map(point => point.bpm)) + 10) / 10) * 10;
  const x = (time: number) => 38 + (time - (now - CHART_WINDOW_MS)) / CHART_WINDOW_MS * 274;
  const y = (bpm: number) => 148 - (bpm - min) / (max - min) * 130;
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FC nos últimos 60 segundos{simulated ? " · SIMULADO" : ""}</Text>
      <Svg width="100%" height={190} viewBox="0 0 320 185" accessibilityLabel={`Gráfico temporal de frequência cardíaca${simulated ? " simulada" : ""}, ${visible.length} medições nos últimos 60 segundos`}>
        {[min, (min + max) / 2, max].map(value => <React.Fragment key={value}>
          <Line x1={38} x2={312} y1={y(value)} y2={y(value)} stroke="#D6DEE8" />
          <SvgText x={32} y={y(value) + 4} textAnchor="end" fontSize={11} fill="#445469">{value}</SvgText>
        </React.Fragment>)}
        <SvgText x={6} y={10} fontSize={10} fill="#445469">BPM</SvgText>
        <SvgText x={38} y={172} fontSize={11} fill="#445469">−60 s</SvgText>
        <SvgText x={166} y={172} fontSize={11} fill="#445469">−30 s</SvgText>
        <SvgText x={280} y={172} fontSize={11} fill="#445469">agora</SvgText>
        {segments.map((segment, index) => <React.Fragment key={index}>
          <Polyline points={segment.map(point => `${x(point.time)},${y(point.bpm)}`).join(" ")} fill="none" stroke={simulated ? "#956000" : "#126347"} strokeWidth={2.5} />
          {segment.length === 1 && <Circle cx={x(segment[0].time)} cy={y(segment[0].bpm)} r={3} fill={simulated ? "#956000" : "#126347"} />}
        </React.Fragment>)}
      </Svg>
      <Text style={styles.note}>{visible.length ? "Lacunas representam interrupções de leitura. O eixo vertical se ajusta aos dados." : "Aguardando medições para desenhar o gráfico."}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { gap: 6 }, title: { fontWeight: "700", color: "#162234" }, note: { color: "#445469", fontSize: 12 }
});
