import { RideRecord, replaceAllRides } from "./journal";
import { PRESET_PHOTOS } from "./cityImages";

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
    // real preset photos (city scenery), distinct per ride/photo
    const photos = Array.from({ length: photoCounts[i] }, (_, k) => ({
      dataUrl: PRESET_PHOTOS[(i * 4 + k) % PRESET_PHOTOS.length],
      color: hex,
      takenAt: started + k * 120000,
      caption: CAPTIONS[(i * 3 + k) % CAPTIONS.length],
    }));
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
