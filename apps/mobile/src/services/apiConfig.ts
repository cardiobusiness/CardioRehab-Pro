import { Platform } from "react-native";

export const API_PORT = 3334;

export const API_BASE_URL =
  Platform.OS === "android"
    ? `http://10.0.2.2:${API_PORT}`
    : `http://127.0.0.1:${API_PORT}`;

export const HEALTH_URL = `${API_BASE_URL}/health`;

