import { useEffect, useRef, useState } from "react";

// Real satellite positioning for the riding HUD.
//
// Wraps the browser Geolocation API (navigator.geolocation.watchPosition), which
// on a phone is backed by GPS/GNSS. It accumulates ride distance with the
// haversine formula and reports live speed (preferring the device-provided
// Doppler speed, falling back to distance/time when the device omits it).
//
// Notes for the China region:
// - Distance/speed are computed from raw WGS-84 lat/lng and are accurate as-is;
//   the GCJ-02 ("Mars") coordinate offset only matters when plotting points on a
//   Chinese map provider — that belongs to the map step, not here.
// - Continuous tracking with the screen locked needs a native (Capacitor) build;
//   in the browser, positioning pauses when the tab is backgrounded.

export type GpsStatus =
  | "idle"
  | "locating" // permission granted / waiting for first usable fix
  | "tracking" // receiving fixes
  | "denied" // user blocked location permission
  | "unavailable"; // no geolocation support or hardware error

export interface GeolocationState {
  status: GpsStatus;
  hasFix: boolean;
  speedKmh: number;
  distanceKm: number;
  accuracy: number | null; // meters
  lat: number | null;
  lng: number | null;
  error: string | null;
}

interface Options {
  /** When true, stop accumulating distance and report 0 speed. */
  paused?: boolean;
  /** Master switch — set false to not start watching at all. */
  enabled?: boolean;
}

const EARTH_R = 6371000; // meters

function haversine(aLat: number, aLng: number, bLat: number, bLng: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const lat1 = toRad(aLat);
  const lat2 = toRad(bLat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(h));
}

const INITIAL: GeolocationState = {
  status: "idle",
  hasFix: false,
  speedKmh: 0,
  distanceKm: 0,
  accuracy: null,
  lat: null,
  lng: null,
  error: null,
};

export function useGeolocation({ paused = false, enabled = true }: Options = {}) {
  const [state, setState] = useState<GeolocationState>(INITIAL);

  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  const lastRef = useRef<{ lat: number; lng: number; t: number } | null>(null);
  const distMetersRef = useRef(0);
  const smoothSpeedRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setState((s) => ({ ...s, status: "unavailable", error: "设备不支持定位" }));
      return;
    }

    setState((s) => ({ ...s, status: "locating" }));

    const onPosition = (pos: GeolocationPosition) => {
      const { latitude, longitude, accuracy, speed } = pos.coords;
      const t = pos.timestamp;

      // Reject very imprecise fixes outright (common indoors / cold start).
      if (accuracy != null && accuracy > 50) {
        setState((s) => ({
          ...s,
          status: "locating",
          accuracy,
          lat: latitude,
          lng: longitude,
        }));
        return;
      }

      let derivedKmh: number | null = null;

      const last = lastRef.current;
      if (last) {
        const d = haversine(last.lat, last.lng, latitude, longitude);
        const dt = (t - last.t) / 1000; // seconds
        // Accept a segment only if it's a plausible move: at least 1m (filters
        // GPS jitter) and under 30 m/s ≈ 108 km/h (filters teleport spikes).
        const plausible = d >= 1 && dt > 0 && d / dt < 30;
        if (plausible) {
          if (!pausedRef.current) distMetersRef.current += d;
          derivedKmh = (d / dt) * 3.6;
        } else if (d < 1) {
          derivedKmh = 0; // standing still
        }
      }

      // Prefer the device's own (Doppler) speed when present, else our derived.
      let kmh =
        speed != null && speed >= 0 ? speed * 3.6 : derivedKmh != null ? derivedKmh : smoothSpeedRef.current;
      // Light smoothing to calm jitter.
      smoothSpeedRef.current = smoothSpeedRef.current * 0.5 + kmh * 0.5;
      const shownSpeed = pausedRef.current ? 0 : Math.max(0, smoothSpeedRef.current);

      lastRef.current = { lat: latitude, lng: longitude, t };

      setState({
        status: "tracking",
        hasFix: true,
        speedKmh: shownSpeed,
        distanceKm: distMetersRef.current / 1000,
        accuracy: accuracy ?? null,
        lat: latitude,
        lng: longitude,
        error: null,
      });
    };

    const onError = (err: GeolocationPositionError) => {
      const denied = err.code === err.PERMISSION_DENIED;
      setState((s) => ({
        ...s,
        status: denied ? "denied" : "unavailable",
        error: err.message || (denied ? "定位权限被拒绝" : "无法获取定位"),
      }));
    };

    const watchId = navigator.geolocation.watchPosition(onPosition, onError, {
      enableHighAccuracy: true,
      maximumAge: 1000,
      timeout: 20000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [enabled]);

  return state;
}
