// shareCard.ts — render a ride as a shareable POSTER on a <canvas>, in the
// 光屿骑行 bead/pixel language. Canvas-drawn (not DOM screenshot) so export is
// dependency-free and pixel-reliable. Returns once photos are drawn.
//
// Later upgrade path (see docs): swap to html-to-image for DOM-fidelity + Web
// Share API. For now this is fully offline and good enough to go viral.

import { COLOR_PROFILES, type ColorId } from "./moodColor";
import { emotionMeta, type RideRecord } from "./journal";
import { CTA_COLORS, emotionToCtaColor } from "../components/pixelKit";

const PAPER = "#f4efe3";
const INK = "#3c3526";
const INK_SOFT = "#6b5d45";
const OUT = "#3a2817";
const FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Heiti SC",sans-serif';

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = src;
  });
}

// filled rect + chunky dark "pixel" inset border
function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border = OUT, bw = 5) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, bw);
  ctx.fillRect(x, y + h - bw, w, bw);
  ctx.fillRect(x, y, bw, h);
  ctx.fillRect(x + w - bw, y, bw, h);
}

// a small bead (circle + white speck)
function bead(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.4, 0, Math.PI * 2);
  ctx.fill();
}

export async function renderShareCard(canvas: HTMLCanvasElement, ride: RideRecord): Promise<void> {
  const W = 1080;
  const H = 1500;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const meta = emotionMeta(ride.colorId);
  const profile = COLOR_PROFILES[ride.colorId as ColorId];
  const accent = CTA_COLORS[emotionToCtaColor(ride.colorId as ColorId)];
  const M = 84;

  // background paper + faint cross-stitch grid
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(58,40,23,0.035)";
  for (let gx = 0; gx < W; gx += 18) ctx.fillRect(gx, 0, 1, H);
  for (let gy = 0; gy < H; gy += 18) ctx.fillRect(0, gy, W, 1);

  // outer frame
  ctx.fillStyle = OUT;
  ctx.fillRect(28, 28, W - 56, 8);
  ctx.fillRect(28, H - 36, W - 56, 8);
  ctx.fillRect(28, 28, 8, H - 56);
  ctx.fillRect(W - 36, 28, 8, H - 56);

  // header wordmark
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK_SOFT;
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText("光屿骑行", M, 130);
  ctx.font = `600 22px ${FONT}`;
  ctx.fillStyle = accent.ink;
  ctx.textAlign = "right";
  ctx.fillText("AURARIDE", W - M, 130);
  ctx.textAlign = "left";

  // big color name + swatch
  const swatch = 96;
  panel(ctx, M, 180, swatch, swatch, meta.color, OUT, 6);
  ctx.fillStyle = accent.fill;
  ctx.font = `800 120px ${FONT}`;
  ctx.fillText(profile?.en || meta.en, M + swatch + 36, 290);
  ctx.fillStyle = INK;
  ctx.font = `700 48px ${FONT}`;
  ctx.fillText(meta.cn, M + swatch + 40, 350);

  // mood line
  if (ride.moodText) {
    ctx.fillStyle = INK_SOFT;
    ctx.font = `italic 500 34px ${FONT}`;
    ctx.fillText(`“${ride.moodText.slice(0, 22)}”`, M, 440);
  }

  // stats panel (3 cols)
  const sy = 490;
  const sh = 200;
  panel(ctx, M, sy, W - M * 2, sh, "#fffdf7");
  const cols = [
    { v: ride.distance.toFixed(2), l: "公里" },
    { v: `${Math.max(1, Math.round(ride.duration / 60))}`, l: "分钟" },
    { v: `${ride.photos.length}`, l: "印象" },
  ];
  const colW = (W - M * 2) / 3;
  cols.forEach((c, i) => {
    const cx = M + colW * i + colW / 2;
    if (i > 0) {
      ctx.fillStyle = "rgba(58,40,23,0.16)";
      ctx.fillRect(M + colW * i, sy + 30, 2, sh - 60);
    }
    ctx.textAlign = "center";
    ctx.fillStyle = INK;
    ctx.font = `800 84px ${FONT}`;
    ctx.fillText(c.v, cx, sy + 110);
    ctx.fillStyle = INK_SOFT;
    ctx.font = `600 28px ${FONT}`;
    ctx.fillText(c.l, cx, sy + 158);
  });
  ctx.textAlign = "left";

  // route ribbon (bead polyline)
  const ry = 760;
  const rh = 180;
  ctx.fillStyle = accent.tint;
  ctx.fillRect(M, ry, W - M * 2, rh);
  const seed = parseInt(ride.id.slice(-6)) || 7;
  let a = seed;
  const rnd = () => ((a = (a * 1664525 + 1013904223) % 4294967296), a / 4294967296);
  const n = 13;
  let px = M + 40;
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    const cy = ry + rh / 2 + Math.sin(t * Math.PI * 2 + seed) * (rh * 0.28) + (rnd() - 0.5) * 14;
    bead(ctx, px, cy, i === 0 || i === n - 1 ? 12 : 8, i === 0 || i === n - 1 ? meta.color : accent.fill);
    px += (W - M * 2 - 80) / (n - 1);
  }

  // photos row (up to 3)
  const photos = ride.photos.slice(0, 3);
  if (photos.length) {
    const py = 990;
    const gap = 20;
    const pw = (W - M * 2 - gap * (photos.length - 1)) / photos.length;
    const ph = Math.min(pw, 300);
    const imgs = await Promise.all(photos.map((p) => loadImg(p.dataUrl)));
    imgs.forEach((img, i) => {
      const x = M + (pw + gap) * i;
      ctx.fillStyle = "#fffdf7";
      ctx.fillRect(x, py, pw, ph);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 6, py + 6, pw - 12, ph - 12);
        ctx.clip();
        const ar = img.width / img.height;
        let dw = pw - 12, dh = dw / ar;
        if (dh < ph - 12) { dh = ph - 12; dw = dh * ar; }
        ctx.drawImage(img, x + 6 + (pw - 12 - dw) / 2, py + 6 + (ph - 12 - dh) / 2, dw, dh);
        ctx.restore();
      }
      // frame
      ctx.fillStyle = OUT;
      ctx.fillRect(x, py, pw, 5);
      ctx.fillRect(x, py + ph - 5, pw, 5);
      ctx.fillRect(x, py, 5, ph);
      ctx.fillRect(x + pw - 5, py, 5, ph);
    });
  }

  // footer line
  const fy = photos.length ? 1330 : 1040;
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 30px ${FONT}`;
  ctx.fillText(profile?.line || "", M, fy);
  // bead strip
  const colors = ["calm-green", "lonely-blue", "explore-yellow", "release-red", "tired-gray"];
  colors.forEach((c, i) => bead(ctx, M + 14 + i * 34, fy + 50, 11, emotionMeta(c).color));
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 26px ${FONT}`;
  ctx.textAlign = "right";
  const d = new Date(ride.startedAt);
  ctx.fillText(`${d.getFullYear()}.${`${d.getMonth() + 1}`.padStart(2, "0")}.${`${d.getDate()}`.padStart(2, "0")}`, W - M, fy + 58);
  ctx.textAlign = "left";
}
