// cityImages.ts — real city photos for the 广场 feed covers. Each seeded post's
// city is matched by keyword to a set of photos; the cover is a deterministic
// pick per post id. Cities WITHOUT a photo return null — the seed only keeps
// cities that have one, so the feed never shows a blank/placeholder cover.
//
// 图源 = 腾讯云 COS bucket(公有读),不打进 dist bundle 减体积。
// 上传方式:`coscmd upload -r <local-dir> cities/`(memory tencent-cam-cos)。

const COS_BASE = "https://auraride-photos-1315627382.cos.ap-shanghai.myqcloud.com/cities";
const url = (name: string) => `${COS_BASE}/${name}.jpg`;

// keyword(s) in the post's city string → that city's photo file basenames
const MATCH: Array<{ kw: string[]; imgs: string[] }> = [
  { kw: ["北京"], imgs: [url("beijing-1"), url("beijing-2")] },
  { kw: ["上海"], imgs: [url("shanghai-1"), url("shanghai-2")] },
  { kw: ["广州", "广东", "珠江"], imgs: [url("guangzhou-1"), url("guangzhou-2")] },
  { kw: ["南京", "江苏"], imgs: [url("nanjing-1"), url("nanjing-2"), url("nanjing-3"), url("nanjing-4"), url("nanjing-5")] },
  { kw: ["大连", "辽宁"], imgs: [url("dalian-1"), url("dalian-2"), url("dalian-3")] },
  { kw: ["天津"], imgs: [url("tianjin-1"), url("tianjin-2")] },
  { kw: ["黄山", "安徽"], imgs: [url("huangshan-1"), url("huangshan-2"), url("huangshan-3")] },
  { kw: ["山西", "平遥"], imgs: [url("shanxi-1"), url("shanxi-2"), url("shanxi-3")] },
  { kw: ["江西", "滕王阁"], imgs: [url("jiangxi-1"), url("jiangxi-2"), url("jiangxi-3")] },
  { kw: ["河北", "山海关"], imgs: [url("hebei-1"), url("hebei-2"), url("hebei-3")] },
  { kw: ["浙江", "西湖"], imgs: [url("xihu-1"), url("xihu-2"), url("xihu-3")] },
  { kw: ["厦门", "福建"], imgs: [url("xiamen-1"), url("xiamen-2"), url("xiamen-3")] },
  { kw: ["重庆", "洪崖洞"], imgs: [url("chongqing-1"), url("chongqing-2"), url("chongqing-3")] },
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
