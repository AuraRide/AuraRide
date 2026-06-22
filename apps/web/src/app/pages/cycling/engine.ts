// engine.ts — shared constants + helpers ported from the "骑行循环动画" handoff
// (Claude Design). The bead/cross-stitch tile geometry is identical across all
// five scenes, so it lives here once. Each scene only varies its palette + the
// procedural map it builds; both feed the same bead-rasteriser below.

export const STAGE_W = 1080;
export const STAGE_H = 1920;
export const DURATION = 12; // seconds per loop — drives scroll speed + pedal cadence

// the riding "band" (sky above, ground below) — same framing in every scene
export const BAND_TOP = 760;
export const BAND_H = 820;
export const GROUND_Y = 1560;

// bead tile grid (one tileable strip, scrolled horizontally)
export const TGW = 384; // tile width in bead cells
export const TGH = 128; // tile height in bead cells
export const FCS = 8; // render px per bead cell (scaled down on screen → crisp)
export const GROUND_ROW = 108; // ground/curb row inside the tile
export const BEAD_DISP = BAND_H / TGH; // on-screen size of one bead
export const TILE_DISP_W = TGW * BEAD_DISP; // on-screen tile width
export const PPS = TILE_DISP_W / DURATION; // scroll speed (px/s) for a seamless loop

export type BeadMap = Map<number, string>;

// seeded RNG — keeps every generated tile deterministic (same picture each load)
export function mulberry32(a: number): () => number {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// write one bead cell into the tile map; x wraps so the strip tiles seamlessly
export function setCell(map: BeadMap, x: number, y: number, color: string): void {
  x = Math.round(x);
  y = Math.round(y);
  if (y < 0 || y >= TGH) return;
  x = ((x % TGW) + TGW) % TGW;
  map.set(x * 100000 + y, color);
}

// rasterise a bead map into a tileable data-URL: each cell is a round bead with
// a soft white highlight speck (the cross-stitch look).
export function tileURLFromMap(map: BeadMap): string {
  const cv = document.createElement("canvas");
  cv.width = TGW * FCS;
  cv.height = TGH * FCS;
  const ctx = cv.getContext("2d")!;
  const r = FCS * 0.46;
  map.forEach((color, key) => {
    const gx = Math.floor(key / 100000);
    const gy = key % 100000;
    const cx = (gx + 0.5) * FCS;
    const cy = (gy + 0.5) * FCS;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  });
  return cv.toDataURL();
}
