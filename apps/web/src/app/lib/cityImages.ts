// cityImages.ts — real city photos for the 广场 feed covers. Each seeded post's
// city is matched by keyword to a set of photos; the cover is a deterministic
// pick per post id. Cities WITHOUT a photo return null — the seed only keeps
// cities that have one, so the feed never shows a blank/placeholder cover.

import beijing1 from "../../assets/cities/beijing-1.jpg";
import beijing2 from "../../assets/cities/beijing-2.jpg";
import shanghai1 from "../../assets/cities/shanghai-1.jpg";
import shanghai2 from "../../assets/cities/shanghai-2.jpg";
import guangzhou1 from "../../assets/cities/guangzhou-1.jpg";
import guangzhou2 from "../../assets/cities/guangzhou-2.jpg";
import nanjing1 from "../../assets/cities/nanjing-1.jpg";
import nanjing2 from "../../assets/cities/nanjing-2.jpg";
import nanjing3 from "../../assets/cities/nanjing-3.jpg";
import nanjing4 from "../../assets/cities/nanjing-4.jpg";
import nanjing5 from "../../assets/cities/nanjing-5.jpg";
import dalian1 from "../../assets/cities/dalian-1.jpg";
import dalian2 from "../../assets/cities/dalian-2.jpg";
import dalian3 from "../../assets/cities/dalian-3.jpg";
import tianjin1 from "../../assets/cities/tianjin-1.jpg";
import tianjin2 from "../../assets/cities/tianjin-2.jpg";
import huangshan1 from "../../assets/cities/huangshan-1.jpg";
import huangshan2 from "../../assets/cities/huangshan-2.jpg";
import huangshan3 from "../../assets/cities/huangshan-3.jpg";
import shanxi1 from "../../assets/cities/shanxi-1.jpg";
import shanxi2 from "../../assets/cities/shanxi-2.jpg";
import shanxi3 from "../../assets/cities/shanxi-3.jpg";
import jiangxi1 from "../../assets/cities/jiangxi-1.jpg";
import jiangxi2 from "../../assets/cities/jiangxi-2.jpg";
import jiangxi3 from "../../assets/cities/jiangxi-3.jpg";
import hebei1 from "../../assets/cities/hebei-1.jpg";
import hebei2 from "../../assets/cities/hebei-2.jpg";
import hebei3 from "../../assets/cities/hebei-3.jpg";
import xihu1 from "../../assets/cities/xihu-1.jpg";
import xihu2 from "../../assets/cities/xihu-2.jpg";
import xihu3 from "../../assets/cities/xihu-3.jpg";
import xiamen1 from "../../assets/cities/xiamen-1.jpg";
import xiamen2 from "../../assets/cities/xiamen-2.jpg";
import xiamen3 from "../../assets/cities/xiamen-3.jpg";
import chongqing1 from "../../assets/cities/chongqing-1.jpg";
import chongqing2 from "../../assets/cities/chongqing-2.jpg";
import chongqing3 from "../../assets/cities/chongqing-3.jpg";

// keyword(s) in the post's city string → that city's photos
const MATCH: Array<{ kw: string[]; imgs: string[] }> = [
  { kw: ["北京"], imgs: [beijing1, beijing2] },
  { kw: ["上海"], imgs: [shanghai1, shanghai2] },
  { kw: ["广州", "广东", "珠江"], imgs: [guangzhou1, guangzhou2] },
  { kw: ["南京", "江苏"], imgs: [nanjing1, nanjing2, nanjing3, nanjing4, nanjing5] },
  { kw: ["大连", "辽宁"], imgs: [dalian1, dalian2, dalian3] },
  { kw: ["天津"], imgs: [tianjin1, tianjin2] },
  { kw: ["黄山", "安徽"], imgs: [huangshan1, huangshan2, huangshan3] },
  { kw: ["山西", "平遥"], imgs: [shanxi1, shanxi2, shanxi3] },
  { kw: ["江西", "滕王阁"], imgs: [jiangxi1, jiangxi2, jiangxi3] },
  { kw: ["河北", "山海关"], imgs: [hebei1, hebei2, hebei3] },
  { kw: ["浙江", "西湖"], imgs: [xihu1, xihu2, xihu3] },
  { kw: ["厦门", "福建"], imgs: [xiamen1, xiamen2, xiamen3] },
  { kw: ["重庆", "洪崖洞"], imgs: [chongqing1, chongqing2, chongqing3] },
];

/** Flat pool of every city photo — used as preset "采色" photos for demo rides. */
export const PRESET_PHOTOS: string[] = MATCH.flatMap((m) => m.imgs);

// FNV-1a — stable per post id, so a given post always shows the same photo.
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// sample-feed ids look like "sample-<region>-<j>": use j so a city's j-th post
// gets its j-th photo (distinct, no repeats). Other ids hash deterministically.
function seedIndex(seed: string): number {
  const m = /-(\d+)$/.exec(seed || "");
  return m ? parseInt(m[1], 10) : hash(seed);
}

/** A real photo for this city, or null if we have none. */
export function cityImage(city: string, seed: string): string | null {
  for (const m of MATCH) if (m.kw.some((k) => city.includes(k))) return m.imgs[seedIndex(seed) % m.imgs.length];
  return null;
}

/** How many distinct photos this city has (0 if none) — used to prune the seed feed. */
export function cityImageCount(city: string): number {
  for (const m of MATCH) if (m.kw.some((k) => city.includes(k))) return m.imgs.length;
  return 0;
}

/** Whether we have any photo for this city. */
export function hasCityImage(city: string): boolean {
  return cityImageCount(city) > 0;
}
