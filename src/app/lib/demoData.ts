import { RideRecord, RidePhoto, replaceAllRides } from "./journal";

// Demo data for previewing the journal / overview / summary without having to
// ride first. Dev-only — surfaced behind import.meta.env.DEV in the UI.

const HEX: Record<string, string> = {
  "calm-green": "#34E89E",
  "lonely-blue": "#4FA8FF",
  "explore-yellow": "#FFB54A",
  "release-red": "#FF3344",
  "tired-gray": "#C9D2D8",
};
const COLORS = Object.keys(HEX);

const CAPTIONS = [
  "风很大", "到顶了", "慢下来", "海边发呆", "一个人骑", "绿道尽头",
  "老桥观景", "日落前", "空无一人", "把心跳交还潮汐", "巷子深处", "直道冲刺",
];
const MOODS = [
  "今天想一个人安静地骑一会",
  "阳光很好，出来透透气",
  "压力有点大，需要发泄",
  "心很乱，让一切慢下来",
  undefined,
];

// Paint a small atmospheric thumbnail so the photo wall / overview look alive.
function makePhoto(hex: string, caption: string, t: number, seed: number): RidePhoto {
  const canvas = document.createElement("canvas");
  canvas.width = 96;
  canvas.height = 96;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { dataUrl: "", color: hex, takenAt: t, caption };
  const g = ctx.createLinearGradient(0, 0, 96, 96);
  g.addColorStop(0, hex);
  g.addColorStop(1, "#0a0c12");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 96, 96);
  // a couple of soft light blobs, positioned deterministically by seed
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = "#ffffff";
  const r1 = 16 + (seed % 3) * 6;
  ctx.beginPath();
  ctx.arc(24 + (seed % 5) * 9, 30 + (seed % 4) * 10, r1, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.12;
  ctx.beginPath();
  ctx.arc(70 - (seed % 4) * 8, 64 + (seed % 3) * 7, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  return { dataUrl: canvas.toDataURL("image/jpeg", 0.6), color: hex, takenAt: t, caption };
}

export function seedDemoRides(): number {
  const now = Date.now();
  const H = 3600000;
  const D = 86400000;
  // Spread across today / this week / this month / earlier this year.
  const offsets = [1 * H, 5 * H, 1.2 * D, 2.5 * D, 6 * D, 11 * D, 20 * D, 38 * D, 65 * D, 95 * D];
  const dists = [12.5, 6.0, 8.1, 10.5, 4.4, 9.2, 7.3, 13.1, 5.6, 11.0];
  const photoCounts = [3, 2, 4, 1, 2, 3, 0, 2, 1, 4];

  const rides: RideRecord[] = offsets.map((off, i) => {
    const colorId = COLORS[i % COLORS.length];
    const hex = HEX[colorId];
    const started = now - off;
    const photos = Array.from({ length: photoCounts[i] }, (_, k) =>
      makePhoto(hex, CAPTIONS[(i * 3 + k) % CAPTIONS.length], started + k * 120000, i * 5 + k)
    );
    return {
      id: String(started),
      colorId,
      startedAt: started,
      endedAt: started + dists[i] * 240000,
      distance: dists[i],
      duration: Math.round(dists[i] * 240), // seconds ≈ 15 km/h pace
      moodText: MOODS[i % MOODS.length],
      photos,
      dominantColor: hex,
    };
  });

  replaceAllRides(rides);
  return rides.length;
}
