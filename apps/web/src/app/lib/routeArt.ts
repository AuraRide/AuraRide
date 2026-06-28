// routeArt.ts — turns a ride into shareable "route" artifacts: a poetic name, a
// normalised route shape (real GPS track if present, else a deterministic
// synthesized path), and a faux pixel-QR matrix for the "扫码骑同款路线" hook.
// All deterministic per ride id, so the same ride always reads the same.

import { COLOR_PROFILES, type ColorId } from "./moodColor";
import type { RideRecord } from "./journal";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

// poetic, evocative names — a few per colour, picked deterministically
const NAME_POOL: Record<string, string[]> = {
  "calm-green": ["树荫慢行", "公园巡游", "林间漫行", "绿荫拾光"],
  "lonely-blue": ["沿江独行", "水岸慢行", "临江漫游", "看海的路"],
  "explore-yellow": ["老城穿行", "街巷寻光", "暖巷漫游", "旧城拾忆"],
  "release-red": ["闹市巡游", "烟火夜骑", "闹巷疾行", "冲进人间"],
  "tired-gray": ["城中放空", "网格漫游", "随风慢行", "没有目的地"],
};

export function routeName(ride: RideRecord): string {
  const pool = NAME_POOL[ride.colorId] || NAME_POOL["tired-gray"];
  const r = rng(hash(ride.id || "x"));
  return pool[Math.floor(r() * pool.length)];
}

// returns the colour's real-environment place (公园/水岸/老城…) for the tag
export function routePlace(ride: RideRecord): string {
  return COLOR_PROFILES[ride.colorId as ColorId]?.place || "城市路网";
}

// normalised route points in [0,1]² (y already flipped for screen drawing)
export function routeShape(ride: RideRecord): Array<[number, number]> {
  const t: any = (ride as any).track;
  if (Array.isArray(t) && t.length >= 2) {
    const pts = t
      .map((p: any): [number, number] | null => {
        if (Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number") return [p[0], p[1]];
        const x = p?.lng ?? p?.lon ?? p?.x;
        const y = p?.lat ?? p?.y;
        return typeof x === "number" && typeof y === "number" ? [x, y] : null;
      })
      .filter(Boolean) as Array<[number, number]>;
    if (pts.length >= 2) {
      let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
      for (const [x, y] of pts) { minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y); }
      const sx = maxx - minx || 1, sy = maxy - miny || 1;
      return pts.map(([x, y]) => [(x - minx) / sx, 1 - (y - miny) / sy] as [number, number]);
    }
  }
  // synthesized wandering route
  const r = rng(hash(ride.id || "x") + Math.round((ride.distance || 5) * 10));
  const n = 7 + Math.round((ride.distance || 5) / 2);
  let x = 0.5, y = 0.82;
  let ang = -Math.PI / 2 + (r() - 0.5);
  const pts: Array<[number, number]> = [[x, y]];
  for (let i = 0; i < n; i++) {
    ang += (r() - 0.5) * 1.35;
    const step = 0.06 + r() * 0.05;
    x = clamp(x + Math.cos(ang) * step, 0.08, 0.92);
    y = clamp(y + Math.sin(ang) * step, 0.1, 0.9);
    pts.push([x, y]);
  }
  return pts;
}

// faux QR matrix (decorative "scan to ride the same route" mark) with the three
// finder squares so it reads as a QR at a glance.
export function qrMatrix(ride: RideRecord, n = 13): boolean[][] {
  const r = rng(hash((ride.id || "x") + ride.colorId) + 99);
  const m: boolean[][] = Array.from({ length: n }, () => Array.from({ length: n }, () => r() < 0.46));
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++)
      for (let x = 0; x < 7; x++) {
        const edge = x === 0 || y === 0 || x === 6 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        m[oy + y][ox + x] = edge || core;
      }
    // quiet ring just inside
    for (let y = 1; y < 6; y++) for (let x = 1; x < 6; x++) if (!(x >= 2 && x <= 4 && y >= 2 && y <= 4)) m[oy + y][ox + x] = false;
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  return m;
}
