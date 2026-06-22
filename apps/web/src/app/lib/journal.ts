// Local-only ride journal — persists rides + photos to localStorage so the
// user has something to come back to. Photos are stored as data URLs so the
// gallery survives reloads without needing a backend.

export interface RidePhoto {
  dataUrl: string;
  color: string; // hex — sampled dominant color
  takenAt: number;
  caption?: string;
}

export interface RideRecord {
  id: string;
  colorId: string;
  startedAt: number;
  endedAt: number;
  distance: number;
  duration: number;
  moodText?: string;
  photos: RidePhoto[];
  dominantColor: string; // overall ride color, judged from photos (or theme)
}

const KEY = "auraride.rides";

export function loadRides(): RideRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RideRecord[];
  } catch {
    return [];
  }
}

// Replace the whole ride list (used by demo seeding).
export function replaceAllRides(rides: RideRecord[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(rides));
  } catch {
    /* ignore quota */
  }
}

// Remove a single ride by id.
export function deleteRide(id: string) {
  const rides = loadRides().filter((r) => r.id !== id);
  try {
    localStorage.setItem(KEY, JSON.stringify(rides));
  } catch {
    /* ignore */
  }
}

export function saveRide(ride: RideRecord) {
  const rides = loadRides();
  rides.unshift(ride);
  // Keep the most recent 30 to stay within localStorage budget
  const trimmed = rides.slice(0, 30);
  try {
    localStorage.setItem(KEY, JSON.stringify(trimmed));
  } catch {
    // Quota exceeded — drop oldest photos and retry once
    const reduced = trimmed.map((r) => ({ ...r, photos: r.photos.slice(0, 3) }));
    try {
      localStorage.setItem(KEY, JSON.stringify(reduced));
    } catch {
      /* give up silently */
    }
  }
}

// Sample the dominant color of an image by averaging pixels on a downscaled
// canvas. Cheap, good enough to give "the system judged your ride to be ___".
export async function sampleDominantColor(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const size = 32;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("#888888");
      ctx.drawImage(img, 0, 0, size, size);
      const data = ctx.getImageData(0, 0, size, size).data;
      let r = 0, g = 0, b = 0, count = 0;
      for (let i = 0; i < data.length; i += 4) {
        const alpha = data[i + 3];
        if (alpha < 128) continue;
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        count++;
      }
      if (count === 0) return resolve("#888888");
      r = Math.round(r / count);
      g = Math.round(g / count);
      b = Math.round(b / count);
      const hex = `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
      resolve(hex);
    };
    img.onerror = () => resolve("#888888");
    img.src = dataUrl;
  });
}

// Map a sampled hex to one of the 5 emotion buckets — this is the "system
// judges your color" moment in the journal.
export function classifyColor(
  hex: string
): "calm-green" | "lonely-blue" | "explore-yellow" | "release-red" | "tired-gray" {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max === 0 ? 0 : (max - min) / max;
  if (sat < 0.18) return "tired-gray";
  if (r > g && r > b) return g > b * 1.2 ? "explore-yellow" : "release-red";
  if (g >= r && g >= b) return "calm-green";
  return "lonely-blue";
}

export function emotionMeta(colorId: string) {
  const map: Record<string, { cn: string; en: string; color: string }> = {
    "calm-green": { cn: "暗绿", en: "MOSS", color: "#34E89E" },
    "lonely-blue": { cn: "深蓝", en: "DEPTH", color: "#4FA8FF" },
    "explore-yellow": { cn: "赭黄", en: "TRACE", color: "#FFB54A" },
    "release-red": { cn: "余火", en: "EMBER", color: "#FF3344" },
    "tired-gray": { cn: "灰白", en: "VOID", color: "#C9D2D8" },
  };
  return map[colorId] || map["tired-gray"];
}
