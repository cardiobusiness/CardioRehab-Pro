import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface MetricTileProps {
  label: string;
  value: string;
  tone?: "normal" | "warning" | "critical";
}

export function MetricTile({ label, value, tone = "normal" }: MetricTileProps) {
  return (
    <View style={[styles.tile, styles[tone]]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    minHeight: 82,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#D6DEE8",
    padding: 12,
    backgroundColor: "#FFFFFF"
  },
  normal: {},
  warning: {
    borderColor: "#D89A00",
    backgroundColor: "#FFF8E6"
  },
  critical: {
    borderColor: "#C83131",
    backgroundColor: "#FFF0F0"
  },
  label: {
    color: "#445469",
    fontSize: 13
  },
  value: {
    color: "#162234",
    fontSize: 24,
    fontWeight: "700",
    marginTop: 6
  }
});

