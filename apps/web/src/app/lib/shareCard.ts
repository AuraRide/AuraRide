// shareCard.ts — render a ride as a shareable POSTER on a <canvas>, in the
// 光屿骑行 bead/pixel language. Canvas-drawn (not DOM screenshot) so export is
// dependency-free and pixel-reliable. Returns once photos are drawn.
//
// The card now foregrounds the ROUTE as a shareable artifact: a poetic route
// name, a stylized mini-map of the path, and a "扫码骑同款路线" QR hook — so a
// viewer wants to copy the route, not just admire the weave.

import { COLOR_PROFILES, type ColorId } from "./moodColor";
import { emotionMeta, type RideRecord } from "./journal";
import { CTA_COLORS, emotionToCtaColor } from "../components/pixelKit";
import { routeName, routePlace, routeShape, qrMatrix } from "./routeArt";

const PAPER = "#f4efe3";
const INK = "#3c3526";
const INK_SOFT = "#6b5d45";
const INK_FAINT = "#a08a66";
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

// tiny deterministic prng so the map texture is stable across re-renders
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function rng(seed: number) {
  let t = seed >>> 0;
  return () => { t += 0x6d2b79f5; let r = Math.imul(t ^ (t >>> 15), 1 | t); r ^= r + Math.imul(r ^ (r >>> 7), 61 | r); return ((r ^ (r >>> 14)) >>> 0) / 4294967296; };
}

function panel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, border = OUT, bw = 5) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = border;
  ctx.fillRect(x, y, w, bw);
  ctx.fillRect(x, y + h - bw, w, bw);
  ctx.fillRect(x, y, bw, h);
  ctx.fillRect(x + w - bw, y, bw, h);
}

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

function poly(ctx: CanvasRenderingContext2D, pts: Array<[number, number]>) {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
}

// the new centrepiece: a stylized map of the route + a stats strip
function drawRouteMap(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, ride: RideRecord, themeColor: string) {
  const pad = 5;
  panel(ctx, x, y, w, h, "#ece5d4", OUT, pad);
  const stripH = 62;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x + pad, y + pad, w - 2 * pad, h - 2 * pad);
  ctx.clip();

  const r = rng(hash(ride.id || "x") + 5);
  // land blocks
  for (let by = y; by < y + h; by += 44)
    for (let bx = x; bx < x + w; bx += 44) {
      const k = r();
      ctx.fillStyle = k < 0.2 ? "#ddd4bf" : k < 0.36 ? "#e9e3d2" : "#e4ddca";
      ctx.fillRect(bx + 2, by + 2, 40, 40);
    }
  // a couple of parks
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "#c3d4a3";
    ctx.fillRect(x + 40 + r() * (w - 200), y + 30 + r() * (h - 220), 70 + r() * 90, 60 + r() * 70);
  }
  // river
  ctx.strokeStyle = "#a9cee0";
  ctx.lineWidth = 22;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  let rx = x + w * (0.15 + r() * 0.5);
  const river: Array<[number, number]> = [];
  for (let yy = y - 20; yy <= y + h + 20; yy += 30) { rx += (r() - 0.5) * 60; river.push([Math.max(x + 20, Math.min(x + w - 20, rx)), yy]); }
  poly(ctx, river);
  ctx.stroke();
  // road grid
  ctx.strokeStyle = "#d8cfb8";
  ctx.lineWidth = 2;
  for (let gx = x; gx < x + w; gx += 44) { ctx.beginPath(); ctx.moveTo(gx, y); ctx.lineTo(gx, y + h); ctx.stroke(); }
  for (let gy = y; gy < y + h; gy += 44) { ctx.beginPath(); ctx.moveTo(x, gy); ctx.lineTo(x + w, gy); ctx.stroke(); }

  // the route, scaled into the inner area (leaving room for the stats strip)
  const ix = x + 34, iy = y + 30, iw = w - 68, ih = h - 60 - stripH;
  const shape = routeShape(ride);
  const pts = shape.map(([px, py]) => [ix + px * iw, iy + py * ih] as [number, number]);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.strokeStyle = "rgba(255,255,255,0.9)";
  ctx.lineWidth = 17;
  poly(ctx, pts);
  ctx.stroke();
  ctx.strokeStyle = themeColor;
  ctx.lineWidth = 9;
  poly(ctx, pts);
  ctx.stroke();
  // start (circle) + end (square)
  const s0 = pts[0], s1 = pts[pts.length - 1];
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(s0[0], s0[1], 15, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = themeColor; ctx.beginPath(); ctx.arc(s0[0], s0[1], 10, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#fff"; ctx.fillRect(s1[0] - 11, s1[1] - 11, 22, 22);
  ctx.fillStyle = themeColor; ctx.fillRect(s1[0] - 7, s1[1] - 7, 14, 14);
  ctx.restore();

  // place tag (top-left, over the map)
  const place = routePlace(ride);
  ctx.font = `800 26px ${FONT}`;
  const tagW = ctx.measureText(place).width + 56;
  panel(ctx, x + 18, y + 18, tagW, 46, "#fffdf7", OUT, 3);
  ctx.fillStyle = themeColor; ctx.fillRect(x + 32, y + 34, 14, 14);
  ctx.fillStyle = INK; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(place, x + 56, y + 42);

  // stats strip (bottom): distance · time · samples
  const sy = y + h - pad - stripH;
  ctx.fillStyle = "rgba(36,28,16,0.82)";
  ctx.fillRect(x + pad, sy, w - 2 * pad, stripH);
  const mins = Math.max(1, Math.round(ride.duration / 60));
  const parts: Array<[string, string]> = [
    [ride.distance.toFixed(2), "km"],
    [`${mins}`, "分钟"],
    [`${ride.photos.length}`, "采色"],
  ];
  const segW = (w - 2 * pad) / parts.length;
  ctx.textBaseline = "middle";
  parts.forEach(([v, l], i) => {
    const cx = x + pad + segW * i + segW / 2;
    if (i > 0) { ctx.fillStyle = "rgba(255,255,255,0.18)"; ctx.fillRect(x + pad + segW * i, sy + 14, 2, stripH - 28); }
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff"; ctx.font = `800 34px ${FONT}`;
    const vw = ctx.measureText(v).width;
    ctx.fillText(v, cx - 14, sy + stripH / 2);
    ctx.fillStyle = "rgba(255,255,255,0.8)"; ctx.font = `600 20px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(l, cx - 14 + vw / 2 + 6, sy + stripH / 2 + 1);
  });
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
}

// the "scan to ride the same route" mark
function drawQR(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ride: RideRecord) {
  panel(ctx, x, y, size, size, "#fffdf7", OUT, 4);
  const n = 13;
  const m = qrMatrix(ride, n);
  const pad = 14;
  const cell = (size - pad * 2) / n;
  ctx.fillStyle = OUT;
  for (let yy = 0; yy < n; yy++)
    for (let xx = 0; xx < n; xx++)
      if (m[yy][xx]) ctx.fillRect(Math.round(x + pad + xx * cell), Math.round(y + pad + yy * cell), Math.ceil(cell), Math.ceil(cell));
}

export interface ShareCardOpts {
  photos?: { dataUrl: string }[];
  caption?: string;
}

export async function renderShareCard(canvas: HTMLCanvasElement, ride: RideRecord, opts: ShareCardOpts = {}): Promise<void> {
  const W = 1080;
  const M = 72;
  const meta = emotionMeta(ride.colorId);
  const profile = COLOR_PROFILES[ride.colorId as ColorId];
  const accent = CTA_COLORS[emotionToCtaColor(ride.colorId as ColorId)];

  const photos = (opts.photos ?? ride.photos).slice(0, 3);
  const captionText = (opts.caption ?? ride.moodText ?? profile?.line ?? "").trim();
  const name = routeName(ride);

  // ── layout (top → bottom), adaptive height ──
  const nameY = 360; // baseline of the route-name title
  const mapY = 392;
  const mapH = 470;
  const mapBottom = mapY + mapH; // 862

  const n = photos.length;
  const gap = 22;
  const photoY = mapBottom + 44;
  const pw = n ? (W - 2 * M - gap * (n - 1)) / n : 0;
  const ph = n ? Math.min(pw, 460) : 0;
  const photoBottom = n ? photoY + ph : mapBottom;

  const captionY = captionText ? photoBottom + (n ? 64 : 54) : photoBottom;
  const qrTop = (captionText ? captionY : photoBottom) + 36;
  const qrSize = 150;
  const dateY = qrTop + qrSize + 44;
  const H = dateY + 58; // clearance so the bottom line never touches the frame

  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // background paper + faint cross-stitch grid
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(58,40,23,0.035)";
  for (let gx = 0; gx < W; gx += 18) ctx.fillRect(gx, 0, 1, H);
  for (let gy = 0; gy < H; gy += 18) ctx.fillRect(0, gy, W, 1);

  // outer frame
  ctx.fillStyle = OUT;
  ctx.fillRect(24, 24, W - 48, 7);
  ctx.fillRect(24, H - 31, W - 48, 7);
  ctx.fillRect(24, 24, 7, H - 48);
  ctx.fillRect(W - 31, 24, 7, H - 48);

  // header wordmark
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = INK_SOFT;
  ctx.font = `800 28px ${FONT}`;
  ctx.fillText("光屿骑行", M, 96);
  ctx.font = `600 20px ${FONT}`;
  ctx.fillStyle = accent.ink;
  ctx.textAlign = "right";
  ctx.fillText("AURARIDE", W - M, 96);
  ctx.textAlign = "left";

  // colour name + swatch
  const swatch = 86;
  panel(ctx, M, 144, swatch, swatch, meta.color, OUT, 6);
  ctx.fillStyle = accent.fill;
  ctx.font = `800 106px ${FONT}`;
  ctx.fillText(profile?.en || meta.en, M + swatch + 32, 240);
  ctx.fillStyle = INK;
  ctx.font = `700 44px ${FONT}`;
  ctx.fillText(meta.cn, M + swatch + 34, 300);

  // route name title — this ride, as a named, shareable route
  ctx.fillStyle = INK;
  ctx.font = `800 50px ${FONT}`;
  const title = `「${name}」`;
  ctx.fillText(title, M, nameY);
  const titleW = ctx.measureText(title).width;
  ctx.fillStyle = accent.ink;
  ctx.font = `700 28px ${FONT}`;
  ctx.fillText(`· ${ride.distance.toFixed(1)}km`, M + titleW + 18, nameY - 4);

  // ROUTE MAP — the new centrepiece
  drawRouteMap(ctx, M, mapY, W - 2 * M, mapH, ride, meta.color);

  // photos (kept, smaller)
  if (n) {
    const imgs = await Promise.all(photos.map((p) => loadImg(p.dataUrl)));
    imgs.forEach((img, i) => {
      const x = M + (pw + gap) * i;
      ctx.fillStyle = "#fffdf7";
      ctx.fillRect(x, photoY, pw, ph);
      if (img) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(x + 6, photoY + 6, pw - 12, ph - 12);
        ctx.clip();
        const ar = img.width / img.height;
        let dw = pw - 12, dh = dw / ar;
        if (dh < ph - 12) { dh = ph - 12; dw = dh * ar; }
        ctx.drawImage(img, x + 6 + (pw - 12 - dw) / 2, photoY + 6 + (ph - 12 - dh) / 2, dw, dh);
        ctx.restore();
      }
      ctx.fillStyle = OUT;
      ctx.fillRect(x, photoY, pw, 5);
      ctx.fillRect(x, photoY + ph - 5, pw, 5);
      ctx.fillRect(x, photoY, 5, ph);
      ctx.fillRect(x + pw - 5, photoY, 5, ph);
    });
  }

  // caption
  if (captionText) {
    ctx.fillStyle = INK_SOFT;
    ctx.font = `italic 500 32px ${FONT}`;
    ctx.fillText(`“${captionText.slice(0, 22)}${captionText.length > 22 ? "…" : ""}”`, M, captionY);
  }

  // footer — the share hook: QR + "扫码骑同款路线"
  drawQR(ctx, M, qrTop, qrSize, ride);
  const tx = M + qrSize + 28;
  ctx.fillStyle = INK;
  ctx.font = `800 38px ${FONT}`;
  ctx.fillText("扫码 · 骑同款路线", tx, qrTop + 56);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `500 25px ${FONT}`;
  ctx.fillText("在广场一键「复制路线」", tx, qrTop + 98);
  ctx.fillStyle = INK_FAINT;
  ctx.font = `500 23px ${FONT}`;
  ctx.fillText("跟着颜色，骑进同一座城市", tx, qrTop + 132);

  // bottom line: colour tag (left) + date (right)
  bead(ctx, M + 12, dateY - 9, 11, meta.color);
  ctx.fillStyle = INK_SOFT;
  ctx.font = `600 24px ${FONT}`;
  ctx.fillText(`${meta.cn} · ${profile?.en || meta.en}`, M + 34, dateY);
  ctx.textAlign = "right";
  const d = new Date(ride.startedAt);
  ctx.fillText(`${d.getFullYear()}.${`${d.getMonth() + 1}`.padStart(2, "0")}.${`${d.getDate()}`.padStart(2, "0")}`, W - M, dateY);
  ctx.textAlign = "left";
}
