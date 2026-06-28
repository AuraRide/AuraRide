// weave.ts — turn one ride into a static pixel "color weave" (行程色织物).
//
// This is the product's hero artifact: a deterministic woven tapestry generated
// from a single ride's REAL data —
//   • palette ← the colours actually sampled from the rider's photos (审美/C2),
//     NOT an emotion verdict. The scenery's colours become thread colours.
//   • thread  ← the GPS track, normalised and rasterised onto the grid, so the
//     route literally weaves a line through the cloth.
//   • seed    ← the ride id, so the same ride always reproduces the same weave
//     (un-fakeable, ownable — bind to real movement + time + place).
//
// Pure + DOM-free so it stays testable and can run anywhere; the page renders
// the returned spec as SVG <rect>s. Version B (animated, grows during the ride)
// can reuse buildPalette/threadFromTrack untouched.

import type { RideRecord } from "./rideRepo";
import { emotionMeta } from "./journal";

export interface WeaveCell {
  x: number;
  y: number;
  color: string;
  thread: boolean; // true if this cell sits on the route thread
}

export interface WeaveSpec {
  cols: number;
  rows: number;
  cells: WeaveCell[];
  palette: string[]; // the colours this ride was woven from
  thread: Array<[number, number]>; // grid coords (col,row) of the route thread
  accent: string; // mood accent hex (the declared 今日色彩基调)
  seed: number;
}

// ── colour helpers ───────────────────────────────────────────────────
function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "#888888").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((c) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0")).join("");
}

/** Lighten (+) / darken (−) a hex colour by an absolute amount. */
export function shade(hex: string, amt: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + amt, g + amt, b + amt);
}

/** Linear blend between two hex colours, t in [0,1]. */
function mix(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

// ── deterministic PRNG (mulberry32) ──────────────────────────────────
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFromId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Two colours are "the same swatch" if they're visually close. */
function near(a: string, b: string): boolean {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return Math.abs(ar - br) + Math.abs(ag - bg) + Math.abs(ab - bb) < 36;
}

function dedupeColors(colors: string[]): string[] {
  const out: string[] = [];
  for (const c of colors) if (!out.some((o) => near(o, c))) out.push(c);
  return out;
}

// ── palette: the colours this ride was actually made of ──────────────
export function buildPalette(ride: Pick<RideRecord, "photos" | "dominantColor" | "colorId">): string[] {
  const base = ride.dominantColor || emotionMeta(ride.colorId).color;
  const sampled = dedupeColors((ride.photos || []).map((p) => p.color).filter(Boolean));

  // Real sampled colours lead; if the ride had few/no photos, grow a coherent
  // palette out of the ride's base colour so the cloth never looks empty.
  const pal = [...sampled];
  if (pal.length < 5) {
    for (const v of [base, shade(base, 46), shade(base, -34), shade(base, 78), shade(base, -64)]) {
      if (!pal.some((o) => near(o, v))) pal.push(v);
      if (pal.length >= 5) break;
    }
  }
  return pal.slice(0, 6);
}

// ── thread: rasterise the GPS track onto the grid ────────────────────
function threadFromTrack(
  track: Array<{ lat: number; lng: number }> | undefined,
  cols: number,
  rows: number,
  rnd: () => number
): Array<[number, number]> {
  const pts: Array<[number, number]> = [];

  if (track && track.length >= 2) {
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const p of track) {
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
      minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
    }
    const spanLat = maxLat - minLat || 1;
    const spanLng = maxLng - minLng || 1;
    // sample ~rows points along the track, map lng→x lat→y (y inverted: north up)
    const step = Math.max(1, Math.floor(track.length / (rows * 2)));
    for (let i = 0; i < track.length; i += step) {
      const p = track[i];
      const x = Math.round(((p.lng - minLng) / spanLng) * (cols - 1));
      const y = Math.round((1 - (p.lat - minLat) / spanLat) * (rows - 1));
      const last = pts[pts.length - 1];
      if (!last || last[0] !== x || last[1] !== y) pts.push([clamp(x, 0, cols - 1), clamp(y, 0, rows - 1)]);
    }
  }

  // No usable track → weave a seeded wandering thread top→bottom so every ride
  // still gets a distinct, stable line.
  if (pts.length < 2) {
    let x = Math.floor(rnd() * cols);
    for (let y = 0; y < rows; y++) {
      pts.push([clamp(x, 0, cols - 1), y]);
      x += Math.round((rnd() - 0.5) * 3);
      x = clamp(x, 0, cols - 1);
    }
  }

  // Connect sampled points with straight pixel runs so the thread is continuous.
  const filled: Array<[number, number]> = [];
  const seen = new Set<string>();
  const push = (x: number, y: number) => {
    const k = x + "," + y;
    if (!seen.has(k)) { seen.add(k); filled.push([x, y]); }
  };
  for (let i = 0; i < pts.length - 1; i++) {
    let [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    // Bresenham
    // eslint-disable-next-line no-constant-condition
    while (true) {
      push(x0, y0);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x0 += sx; }
      if (e2 < dx) { err += dx; y0 += sy; }
    }
  }
  return filled;
}

// ── the weave ────────────────────────────────────────────────────────
export function buildWeave(
  ride: Pick<RideRecord, "id" | "photos" | "dominantColor" | "colorId" | "track">,
  cols = 12,
  rows = 16
): WeaveSpec {
  const seed = seedFromId(ride.id || "weave");
  const rnd = rng(seed);
  const palette = buildPalette(ride);
  const accent = emotionMeta(ride.colorId).color;
  const thread = threadFromTrack(ride.track, cols, rows, rnd);
  const onThread = new Set(thread.map(([x, y]) => x + "," + y));

  // A ride is woven from just its handful of palette colours, laid as contiguous
  // horizontal bands (so you can literally count the colours — one per photo),
  // with only a subtle over/under stitch shading for cloth texture. No random
  // gradient, so the cloth reads as "N colours woven", not a high-res image.
  const cells: WeaveCell[] = [];
  for (let y = 0; y < rows; y++) {
    const band = palette[Math.floor((y / rows) * palette.length) % palette.length];
    for (let x = 0; x < cols; x++) {
      const woven = (x + y) % 2 === 0 ? 8 : -8; // stitch over/under
      let color = shade(band, woven);

      const isThread = onThread.has(x + "," + y);
      if (isThread) color = mix(accent, "#fffaf0", (x + y) % 2 === 0 ? 0.12 : 0);

      cells.push({ x, y, color, thread: isThread });
    }
  }

  return { cols, rows, cells, palette, thread, accent, seed };
}
