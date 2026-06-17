// riderGirl.ts — procedural cross-stitch "bead pixel" GIRL cyclist, ported from
// girl.jsx. Same grid/cadence as the boy (so it drops into the same Cyclist),
// restyled: brown side-ponytail + bow, coral tee, sage shorts, white socks.

import type { RiderArt, RiderMap } from "./riderBoy";

const GW = 92;
const GH = 82;
const CS = 7;
const CRANK_REV = 9;
const WHEEL_REV = 18;

const COL = {
  out: "#46301f",
  hairD: "#553c23",
  hairM: "#7c5836",
  hairL: "#9c7847",
  skin: "#f1d6b6",
  skinD: "#e0b791",
  blush: "#d98f78",
  bow: "#c75c4b",
  bowD: "#a8453a",
  bowH: "#e07d68",
  shirt: "#d98e76",
  shirtD: "#c0735c",
  shirtH: "#e8a890",
  short: "#8d9a6b",
  shortD: "#74814f",
  sock: "#efe9da",
  shoe: "#ddd7c7",
  shoeD: "#bcb6a4",
  bike: "#cf7d4a",
  bikeD: "#ad6033",
  bikeH: "#e29b6b",
  basket: "#9aa67e",
  basketD: "#7d8a60",
  rim: "#4a3526",
  spoke: "#c9b48a",
  fleckG: "#8fa068",
  fleckO: "#c8854b",
};

function setCell(map: RiderMap, x: number, y: number, color: string) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || x >= GW || y < 0 || y >= GH) return;
  map.set(x * 1000 + y, color);
}
function disc(map: RiderMap, cx: number, cy: number, r: number, color: string) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy <= r2) setCell(map, x, y, color);
    }
  }
}
function ring(map: RiderMap, cx: number, cy: number, r: number, thickness: number, color: string) {
  const ro = r + thickness / 2, ri = r - thickness / 2;
  for (let y = Math.floor(cy - ro); y <= Math.ceil(cy + ro); y++) {
    for (let x = Math.floor(cx - ro); x <= Math.ceil(cx + ro); x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= ro && d >= ri) setCell(map, x, y, color);
    }
  }
}
function thick(map: RiderMap, x0: number, y0: number, x1: number, y1: number, t: number, color: string) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len * 2));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    disc(map, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, t / 2, color);
  }
}
function thinLine(map: RiderMap, x0: number, y0: number, x1: number, y1: number, color: string) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(len));
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    setCell(map, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, color);
  }
}
function ik(ax: number, ay: number, bx: number, by: number, L1: number, L2: number): [number, number] {
  let dx = bx - ax, dy = by - ay;
  let d = Math.hypot(dx, dy);
  const dmin = Math.abs(L1 - L2) + 0.4, dmax = L1 + L2 - 0.4;
  d = Math.max(dmin, Math.min(dmax, d));
  const ux = dx / (Math.hypot(dx, dy) || 1), uy = dy / (Math.hypot(dx, dy) || 1);
  const a = (d * d + L1 * L1 - L2 * L2) / (2 * d);
  const h = Math.sqrt(Math.max(0, L1 * L1 - a * a));
  const mx = ax + a * ux, my = ay + a * uy;
  const k1x = mx - uy * h, k1y = my + ux * h;
  const k2x = mx + uy * h, k2y = my - ux * h;
  return k1x > k2x ? [k1x, k1y] : [k2x, k2y];
}

const RC = [27, 58], FC = [67, 58], CR = [45, 59], RW = 16, PR = 6;
const HIP = [44, 43];

function drawWheel(map: RiderMap, cx: number, cy: number, r: number, wa: number) {
  for (let k = 0; k < 5; k++) {
    const a = wa + k * ((2 * Math.PI) / 5);
    thinLine(map, cx, cy, cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2), COL.rim);
  }
  const ra = wa;
  setCell(map, cx + Math.cos(ra) * (r * 0.62), cy + Math.sin(ra) * (r * 0.62), COL.fleckO);
  setCell(map, cx + Math.cos(ra) * (r * 0.62) + 0.4, cy + Math.sin(ra) * (r * 0.62), COL.fleckO);
  const flecks: [number, number, string][] = [
    [0.5, 0.9, COL.fleckG], [0.78, 2.4, COL.fleckO], [0.6, 3.9, COL.fleckG],
    [0.85, 5.0, COL.fleckG], [0.45, 5.9, COL.fleckO], [0.7, 1.7, COL.fleckG],
  ];
  flecks.forEach(([rf, a0, c]) => {
    const a = a0 + wa;
    setCell(map, cx + Math.cos(a) * r * rf, cy + Math.sin(a) * r * rf, c);
  });
  ring(map, cx, cy, r, 2.3, COL.rim);
  const va = wa + 0.7;
  setCell(map, cx + Math.cos(va) * r, cy + Math.sin(va) * r, COL.fleckO);
  setCell(map, cx + Math.cos(va) * (r - 1.1), cy + Math.sin(va) * (r - 1.1), COL.fleckO);
  const ha = va + Math.PI;
  setCell(map, cx + Math.cos(ha) * r, cy + Math.sin(ha) * r, COL.spoke);
  setCell(map, cx + Math.cos(ha) * (r - 1.1), cy + Math.sin(ha) * (r - 1.1), COL.spoke);
  const qa = va + Math.PI / 2;
  setCell(map, cx + Math.cos(qa) * r, cy + Math.sin(qa) * r, COL.spoke);
  disc(map, cx, cy, 1.6, COL.rim);
}

function drawLeg(map: RiderMap, angle: number, far: boolean) {
  const px = CR[0] + Math.cos(angle) * PR;
  const py = CR[1] + Math.sin(angle) * PR;
  const hx = far ? HIP[0] - 1.5 : HIP[0] + 0.5;
  const hy = HIP[1];
  const knee = ik(hx, hy, px, py - 1, 10, 12);
  const thighC = far ? COL.shortD : COL.short;
  const shinC = far ? COL.skinD : COL.skin;
  thick(map, hx, hy, knee[0], knee[1], 4.2, thighC);
  thick(map, knee[0], knee[1], px, py - 1, 3, shinC);
  disc(map, px, py - 1.6, 1.7, far ? "#cfc9b7" : COL.sock);
  disc(map, px + 0.6, py + 0.6, 2.1, far ? COL.shoeD : COL.shoe);
  setCell(map, px, py + 1.4, COL.bikeD);
}

function drawBasket(map: RiderMap) {
  thick(map, 63, 38, 72, 44, 1.4, COL.bikeD);
  for (let y = 42; y <= 49; y++) {
    for (let x = 71; x <= 79; x++) {
      const edge = x === 71 || x === 79 || y === 42 || y === 49;
      setCell(map, x, y, edge ? COL.basketD : COL.basket);
    }
  }
  [[73, 44], [76, 44], [78, 44], [74, 46], [77, 46], [73, 48], [76, 48]].forEach(([x, y]) => setCell(map, x, y, COL.basketD));
}

function drawHair(map: RiderMap) {
  disc(map, 60, 11, 6.2, COL.hairM);
  disc(map, 65, 12, 5.0, COL.hairM);
  disc(map, 67, 14, 3.6, COL.hairM);
  disc(map, 56, 13, 4.8, COL.hairM);
  disc(map, 55, 16, 3.6, COL.hairM);
  const tie = [53, 15];
  const tail: [number, number, number][] = [
    [50, 16, 3.6], [47, 18, 3.9], [44, 20, 3.9], [43, 23, 3.5],
    [43, 26, 3.0], [43, 29, 2.4], [44, 31, 1.7], [45, 33, 1.2],
  ];
  tail.forEach(([x, y, r]) => disc(map, x, y, r, COL.hairM));
  [[47, 21], [44, 23], [42, 25], [42, 28], [43, 31], [50, 18]].forEach(([x, y]) => setCell(map, x, y, COL.hairD));
  [[58, 9], [63, 10], [50, 15], [46, 17], [45, 21]].forEach(([x, y]) => setCell(map, x, y, COL.hairL));
  disc(map, tie[0], tie[1] - 1.9, 1.7, COL.bow);
  disc(map, tie[0], tie[1] + 1.9, 1.7, COL.bow);
  disc(map, tie[0], tie[1], 1.0, COL.bowD);
  setCell(map, tie[0] - 1, tie[1] - 2, COL.bowH);
  setCell(map, tie[0] - 1, tie[1] + 2, COL.bowH);
}

function drawHead(map: RiderMap) {
  disc(map, 62, 18, 6.0, COL.skin);
  thinLine(map, 57, 13, 67, 13, COL.hairM);
  setCell(map, 67, 14, COL.hairM);
  setCell(map, 68, 15, COL.hairM);
  setCell(map, 58, 14, COL.hairM);
  setCell(map, 69, 19, COL.skinD);
  setCell(map, 66, 18, COL.out);
  setCell(map, 66, 19, COL.out);
  setCell(map, 67, 21, COL.out);
  disc(map, 64, 20, 1.3, COL.blush);
}

function drawBody(map: RiderMap) {
  disc(map, 44, 43, 4.6, COL.short);
  thick(map, 40, 43, 48, 44, 4, COL.short);
  setCell(map, 41, 45, COL.shortD);
  setCell(map, 47, 45, COL.shortD);
  thick(map, 44, 42, 55, 26, 7, COL.shirt);
  disc(map, 55, 26, 4.2, COL.shirt);
  disc(map, 45, 40, 4.4, COL.shirt);
  thick(map, 46, 41, 54, 29, 3, COL.shirtD);
  thick(map, 42, 40, 52, 27, 1.8, COL.shirtH);
  setCell(map, 56, 24, COL.shirtD);
  setCell(map, 57, 25, COL.shirtD);
  thick(map, 57, 24, 60, 21, 2.4, COL.skin);
  disc(map, 55, 27, 2.4, COL.shirt);
  thick(map, 55, 28, 61, 37, 2.6, COL.skin);
  disc(map, 61, 37, 1.9, COL.skin);
}

function drawFrame(map: RiderMap) {
  thick(map, RC[0], RC[1], CR[0], CR[1], 2.4, COL.bike);
  thick(map, CR[0], CR[1], 41, 47, 2.4, COL.bike);
  thick(map, CR[0], CR[1], 57, 41, 2.4, COL.bike);
  thick(map, 42, 47, 57, 41, 2.2, COL.bike);
  thick(map, 57, 41, FC[0], FC[1], 2.2, COL.bike);
  thick(map, 57, 41, 59, 35, 2.0, COL.bike);
  thick(map, 58, 35, 63, 36, 1.8, COL.bike);
  thinLine(map, 28, 57, 43, 58, COL.bikeH);
  thinLine(map, 46, 58, 55, 42, COL.bikeH);
  disc(map, CR[0], CR[1], 2, COL.bikeD);
  thick(map, 35, 47, 45, 47, 1.8, COL.rim);
  setCell(map, 35, 46, COL.rim);
  setCell(map, 36, 46, COL.rim);
  setCell(map, 46, 47, COL.rim);
}

function build(map: RiderMap, crankAngle: number, wheelAngle: number) {
  drawWheel(map, RC[0], RC[1], RW, wheelAngle);
  drawWheel(map, FC[0], FC[1], RW, wheelAngle);
  drawLeg(map, crankAngle + Math.PI, true);
  drawFrame(map);
  drawBasket(map);
  drawBody(map);
  drawHair(map);
  drawHead(map);
  drawLeg(map, crankAngle, false);
}

function personMask(crankAngle: number): Set<number> {
  const m: RiderMap = new Map();
  drawLeg(m, crankAngle + Math.PI, true);
  drawBody(m);
  drawHair(m);
  drawHead(m);
  drawLeg(m, crankAngle, false);
  return new Set(m.keys());
}

function render(ctx: CanvasRenderingContext2D, map: RiderMap) {
  ctx.clearRect(0, 0, GW * CS, GH * CS);
  const r = CS * 0.46;
  map.forEach((color, key) => {
    const x = Math.floor(key / 1000), y = key % 1000;
    const cx = (x + 0.5) * CS, cy = (y + 0.5) * CS;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  });
}

export const GirlArt: RiderArt = { GW, GH, CS, build, render, personMask, CRANK_REV, WHEEL_REV };
