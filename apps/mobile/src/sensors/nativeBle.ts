import { PermissionsAndroid, Platform } from "react-native";
import { BleManager, State, type Subscription } from "react-native-ble-plx";

export async function prepareBluetooth(manager: BleManager): Promise<void> {
  if (Platform.OS === "android") {
    const permissions = Number(Platform.Version) >= 31
      ? [PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN, PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT]
      : [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    const result = await PermissionsAndroid.requestMultiple(permissions);
    if (permissions.some(permission => result[permission] !== PermissionsAndroid.RESULTS.GRANTED)) {
      throw new Error("Autorize o Bluetooth nas configurações para buscar sensores. Android até 11 também exige localização ativada.");
    }
  }
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let subscription: Subscription | undefined;
    const timeout = setTimeout(() => {
      settled = true;
      subscription?.remove();
      reject(new Error("Bluetooth indisponível. Ative-o nas configurações."));
    }, 8000);
    subscription = manager.onStateChange(state => {
      if (settled) return;
      if (state === State.Unknown || state === State.Resetting) return;
      settled = true;
      clearTimeout(timeout);
      subscription?.remove();
      if (state === State.PoweredOn) resolve();
      else reject(new Error(state === State.Unauthorized ? "Permissão Bluetooth não autorizada." : "Ative o Bluetooth para buscar sensores."));
    }, true);
    if (settled) subscription.remove();
  });
}
