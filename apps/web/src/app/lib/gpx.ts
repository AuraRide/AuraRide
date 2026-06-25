// gpx.ts — turn a saved ride's GPS track into a standard .gpx file.
//
// GPX is the universal cycling-track interchange format: Strava, Garmin Connect,
// Komoot, RideWithGPS, etc. all import it. Coordinates are raw WGS-84 (what the
// browser Geolocation API returns), which is exactly what GPX expects — no GCJ-02
// conversion here.

import type { RideRecord } from "./journal";
import { emotionMeta } from "./journal";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Build a GPX 1.1 document string for a ride. Returns null if there's no track. */
export function rideToGPX(ride: RideRecord): string | null {
  const pts = ride.track ?? [];
  if (pts.length < 2) return null;

  const meta = emotionMeta(ride.colorId);
  const name = `光屿骑行 · ${meta.cn}/${meta.en}`;
  const started = new Date(ride.startedAt);
  // Spread point timestamps evenly across the ride so importers can derive a
  // (uniform) pace. We don't capture per-point time, so this is an approximation.
  const stepMs = pts.length > 1 ? (ride.duration * 1000) / (pts.length - 1) : 0;

  const trkpts = pts
    .map((p, i) => {
      const t = new Date(ride.startedAt + Math.round(i * stepMs)).toISOString();
      return `      <trkpt lat="${p.lat.toFixed(6)}" lon="${p.lng.toFixed(6)}"><time>${t}</time></trkpt>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="AuraRide 光屿骑行" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${esc(name)}</name>
    <time>${started.toISOString()}</time>
  </metadata>
  <trk>
    <name>${esc(name)}</name>
    <type>cycling</type>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`;
}

/** Filename like 光屿骑行-2026-06-18.gpx */
export function gpxFilename(ride: RideRecord): string {
  const d = new Date(ride.startedAt);
  const ymd = `${d.getFullYear()}-${`${d.getMonth() + 1}`.padStart(2, "0")}-${`${d.getDate()}`.padStart(2, "0")}`;
  return `光屿骑行-${ymd}.gpx`;
}

// Strava's manual-upload page — where a user drops the exported .gpx to sync it.
export const STRAVA_UPLOAD_URL = "https://www.strava.com/upload/select";

/**
 * Export the ride's track as a .gpx file. Prefers the Web Share API (so on a
 * phone the user can hand it straight to Strava / Files); falls back to a normal
 * download. Returns an outcome the caller can surface as a toast.
 */
export async function exportRideGPX(ride: RideRecord): Promise<"shared" | "downloaded" | "empty"> {
  const gpx = rideToGPX(ride);
  if (!gpx) return "empty";
  const name = gpxFilename(ride);
  const blob = new Blob([gpx], { type: "application/gpx+xml" });

  const file = new File([blob], name, { type: "application/gpx+xml" });
  const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
  if (nav.canShare && nav.canShare({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: "光屿骑行 · 轨迹" } as ShareData);
      return "shared";
    } catch {
      /* cancelled / unsupported — fall through to download */
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return "downloaded";
}
