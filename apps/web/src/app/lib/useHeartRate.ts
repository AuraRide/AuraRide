import { useEffect, useRef, useState } from "react";

// Web Bluetooth heart-rate strap — progressive enhancement.
//
// When the browser supports Web Bluetooth (Chrome/Edge on Android/desktop, over
// https or localhost) the rider can pair a standard BLE heart-rate monitor
// (Heart Rate Service 0x180D, Measurement characteristic 0x2A37) and the HUD
// shows REAL bpm. Everywhere else this stays dormant and the HUD keeps its
// gentle simulated trace — nothing breaks.

export interface HeartRateState {
  supported: boolean;
  connected: boolean;
  bpm: number | null;
  deviceName: string | null;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

// HR Measurement: first byte = flags; bit0 = value format (0 → uint8, 1 → uint16).
function parseHeartRate(value: DataView): number {
  const flags = value.getUint8(0);
  return flags & 0x1 ? value.getUint16(1, true) : value.getUint8(1);
}

export function useHeartRate(): HeartRateState {
  const supported = typeof navigator !== "undefined" && "bluetooth" in navigator;
  const [connected, setConnected] = useState(false);
  const [bpm, setBpm] = useState<number | null>(null);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const deviceRef = useRef<any>(null);
  const charRef = useRef<any>(null);

  const onValue = (e: any) => setBpm(parseHeartRate(e.target.value as DataView));

  const connect = async () => {
    if (!supported) {
      setError("此环境不支持蓝牙心率带");
      return;
    }
    try {
      const bt = (navigator as any).bluetooth;
      const device = await bt.requestDevice({ filters: [{ services: ["heart_rate"] }] });
      deviceRef.current = device;
      setDeviceName(device.name || "心率带");
      device.addEventListener("gattserverdisconnected", () => {
        setConnected(false);
        setBpm(null);
      });
      const server = await device.gatt.connect();
      const service = await server.getPrimaryService("heart_rate");
      const ch = await service.getCharacteristic("heart_rate_measurement");
      charRef.current = ch;
      await ch.startNotifications();
      ch.addEventListener("characteristicvaluechanged", onValue);
      setConnected(true);
      setError(null);
    } catch (e: any) {
      // User-cancelled chooser throws too — keep it quiet but recordable.
      setError(e?.message || "连接失败");
    }
  };

  const disconnect = () => {
    try {
      charRef.current?.removeEventListener("characteristicvaluechanged", onValue);
      deviceRef.current?.gatt?.disconnect();
    } catch {
      /* ignore */
    }
    setConnected(false);
    setBpm(null);
  };

  // Tear down on unmount.
  useEffect(() => () => disconnect(), []);

  return { supported, connected, bpm, deviceName, error, connect, disconnect };
}
