// cityImages.ts — real city photos used as feed cover placeholders, so posts
// without a user photo show a city image instead of a blank gradient. Vite turns
// each import into a hashed asset URL. Cities are matched by keyword (the seed
// stores names like "北京 · 朝阳" / "江苏 · 南京" / "广东 · 珠江"); any unmatched
// city falls back to a deterministic pick from the whole pool (still a real
// photo, never the grey placeholder).

import beijing1 from "../../assets/cities/beijing-1.jpg";
import beijing2 from "../../assets/cities/beijing-2.jpg";
import shanghai1 from "../../assets/cities/shanghai-1.jpg";
import shanghai2 from "../../assets/cities/shanghai-2.jpg";
import nanjing1 from "../../assets/cities/nanjing-1.jpg";
import nanjing2 from "../../assets/cities/nanjing-2.jpg";
import guangzhou1 from "../../assets/cities/guangzhou-1.jpg";
import guangzhou2 from "../../assets/cities/guangzhou-2.jpg";

const ALL = [beijing1, beijing2, shanghai1, shanghai2, nanjing1, nanjing2, guangzhou1, guangzhou2];

const MATCH: Array<{ kw: string[]; imgs: string[] }> = [
  { kw: ["北京"], imgs: [beijing1, beijing2] },
  { kw: ["上海"], imgs: [shanghai1, shanghai2] },
  { kw: ["南京", "江苏"], imgs: [nanjing1, nanjing2] },
  { kw: ["广州", "广东", "珠江"], imgs: [guangzhou1, guangzhou2] },
];

// FNV-1a — stable per post id, so a given post always shows the same photo.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function cityImage(city: string, seed: string): string {
  const h = hash(seed || city);
  for (const m of MATCH) if (m.kw.some((k) => city.includes(k))) return m.imgs[h % m.imgs.length];
  return ALL[h % ALL.length];
}
