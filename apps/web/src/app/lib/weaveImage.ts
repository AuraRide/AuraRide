// weaveImage.ts — paint a complete, branded SHARE CARD for a ride's color weave
// straight onto a canvas, and return a PNG data URL.
//
// Why canvas (not serialise the on-screen SVG): drawing the cells ourselves from
// the WeaveSpec is deterministic, needs no font/HTML rasterisation, and never
// taints the canvas — so toDataURL() always works and the image is downloadable
// + shareable. This is the 打卡传播单元 (the thing that goes out and carries the
// brand visually).

import type { WeaveSpec } from "./weave";

// tokens mirrored from pixelKit (canvas can't read CSS vars)
const PAPER = "#f7f1e4";
const PAPER_2 = "#fffdf7";
const INK = "#3c3526";
const INK_SOFT = "#6b5d45";
const INK_FAINT = "#a89a80";
const OUT = "#3a2817";
const GROUND = "#efe7d6";
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Heiti SC",sans-serif';

export interface WeaveCardData {
  weave: WeaveSpec;
  emotionCn: string;
  emotionEn: string;
  accent: string;
  distanceLabel?: string; // e.g. "12.40" or "—"
  minutes?: number;
  photoCount?: number;
  moodText?: string;
  dateLabel?: string; // e.g. "2026.06.22"
}

// small helper: text with optional letter-spacing (supported in modern Chromium,
// which is what the app targets; harmlessly ignored elsewhere).
function text(
  ctx: CanvasRenderingContext2D,
  s: string,
  x: number,
  y: number,
  opts: { size: number; color: string; weight?: number; spacing?: number; align?: CanvasTextAlign }
) {
  ctx.font = `${opts.weight ?? 600} ${opts.size}px ${FONT}`;
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align ?? "left";
  ctx.textBaseline = "alphabetic";
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${opts.spacing ?? 0}px`;
  } catch {
    /* ignore */
  }
  ctx.fillText(s, x, y);
  try {
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = "0px";
  } catch {
    /* ignore */
  }
}

// a pixel-outline panel: fill + 3px inset border (evokes the in-app stair frame)
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = OUT;
  ctx.lineWidth = 3;
  ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
}

export function renderWeaveCard(d: WeaveCardData, scale = 2): string {
  const W = 540;
  const P = 34;
  const innerW = W - P * 2;
  const { cols, rows } = d.weave;
  const cell = Math.floor(innerW / cols);
  const weaveW = cell * cols;
  const weaveH = cell * rows;
  const weaveX = Math.round((W - weaveW) / 2);
  const panelPad = 14;

  // section heights
  const headerH = 88;
  const gap = 18;
  const panelH = weaveH + panelPad * 2;
  const paletteH = 26;
  const statsH = 84;
  const moodH = d.moodText ? 40 : 0;
  const footerH = 30;

  const H =
    P + headerH + gap + panelH + gap + paletteH + gap + statsH + (d.moodText ? gap + moodH : 0) + gap + footerH + P;

  const canvas = document.createElement("canvas");
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";
  ctx.scale(scale, scale);

  // background
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);

  let y = P;

  // ── header ──────────────────────────────────────────────────────────
  text(ctx, "光屿骑行 · AURARIDE", P, y + 14, { size: 12, color: INK_SOFT, weight: 700, spacing: 2 });
  if (d.dateLabel) text(ctx, d.dateLabel, W - P, y + 14, { size: 12, color: INK_FAINT, weight: 600, spacing: 1, align: "right" });
  text(ctx, "COLOR WEAVE", P, y + 44, { size: 11, color: INK_FAINT, weight: 600, spacing: 5 });
  text(ctx, "这趟的色织", P, y + 74, { size: 28, color: INK, weight: 800, spacing: 2 });
  // accent emotion chip on the right
  // a wordless accent block (no colour name) on the right
  const chipW = 40, chipH = 30, chipX = W - P - chipW, chipY = y + 50;
  panel(ctx, chipX, chipY, chipW, chipH, d.accent);
  y += headerH + gap;

  // ── weave panel ─────────────────────────────────────────────────────
  panel(ctx, weaveX - panelPad, y, weaveW + panelPad * 2, panelH, PAPER_2);
  // ground
  ctx.fillStyle = GROUND;
  ctx.fillRect(weaveX, y + panelPad, weaveW, weaveH);
  // cells (with a small stitch gap)
  const g = cell * 0.06;
  for (const c of d.weave.cells) {
    ctx.fillStyle = c.color;
    ctx.fillRect(weaveX + c.x * cell + g, y + panelPad + c.y * cell + g, cell - g * 2, cell - g * 2);
  }
  y += panelH + gap;

  // ── palette bar ─────────────────────────────────────────────────────
  const pal = d.weave.palette;
  const swGap = 5;
  const swW = (innerW - swGap * (pal.length - 1)) / pal.length;
  pal.forEach((c, i) => {
    const sx = P + i * (swW + swGap);
    ctx.fillStyle = c;
    ctx.fillRect(sx, y, swW, paletteH);
    ctx.strokeStyle = "rgba(58,40,23,0.18)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(sx + 0.75, y + 0.75, swW - 1.5, paletteH - 1.5);
  });
  y += paletteH + gap;

  // ── stats ───────────────────────────────────────────────────────────
  panel(ctx, P, y, innerW, statsH, PAPER_2);
  const stats = [
    { v: d.distanceLabel ?? "—", l: "公里 km" },
    { v: String(d.minutes ?? 0), l: "分钟" },
    { v: String(d.photoCount ?? 0), l: "采色" },
  ];
  const colW = innerW / 3;
  stats.forEach((s, i) => {
    const cx = P + colW * i + colW / 2;
    if (i > 0) {
      ctx.strokeStyle = "rgba(58,40,23,0.16)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(P + colW * i, y + 16);
      ctx.lineTo(P + colW * i, y + statsH - 16);
      ctx.stroke();
    }
    text(ctx, s.v, cx, y + 46, { size: 30, color: INK, weight: 800, align: "center" });
    text(ctx, s.l, cx, y + 66, { size: 11, color: INK_SOFT, weight: 600, spacing: 1, align: "center" });
  });
  y += statsH + gap;

  // ── mood line (optional) ────────────────────────────────────────────
  if (d.moodText) {
    text(ctx, `出发时你写下 · “${d.moodText}”`, W / 2, y + 22, { size: 13, color: INK_FAINT, weight: 500, align: "center" });
    y += moodH + gap;
  }

  // ── footer watermark ────────────────────────────────────────────────
  ctx.fillStyle = d.accent;
  ctx.fillRect(P, y + 6, 12, 12);
  text(ctx, "AuraRide · 用慢行收集世界的颜色", P + 20, y + 16, { size: 12, color: INK_SOFT, weight: 600, spacing: 1 });

  return canvas.toDataURL("image/png");
}
