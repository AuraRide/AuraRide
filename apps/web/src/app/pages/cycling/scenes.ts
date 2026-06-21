// @ts-nocheck
// scenes.ts — the five bead/cross-stitch riding scenes, ported from the handoff
// (scene_alley/beach/forest/highway/oldtown_bead.jsx). Each scene procedurally
// builds one tileable strip (buildXxxMap) and declares its backdrop + overlay
// colours (SceneDef). The shared bead geometry + rasteriser live in engine.ts.
//
// The five scenes line up 1:1 with AuraRide's five emotion colours:
//   yellow→赭黄 TRACE · blue→深蓝 DEPTH · green→暗绿 MOSS · gray→灰白 VOID · red→余火 EMBER

import { BAND_TOP, BAND_H, GROUND_ROW, TGW, mulberry32, setCell, tileURLFromMap, type BeadMap } from "./engine";

export type CtaColor = "red" | "yellow" | "green" | "gray" | "blue";

export interface Veil {
  top: number;
  height: number;
  gradient: string;
}

export interface SceneDef {
  key: string;
  cn: string; // short scene name (dots / aria)
  color: CtaColor;
  buildTileURL: () => string;
  sky: string; // base SKY colour (also fills any cover backdrop)
  skyGradient: string; // upper sky band
  groundGradient: string; // lower ground band
  veils: Veil[]; // atmospheric haze + shade layers
  edgeVignette?: string; // pressing side-walls (alley only)
  lightPool: string; // soft radial pool behind the rider
  shadowColor: string; // rider wheel contact shadow
  dash: { top: number; dashPx: number; gradient: string; opacity: number; radius?: number };
  leaves?: boolean; // forest floating leaves
}

const GROUND_TOP = BAND_TOP + BAND_H * 0.88; // identical 0.88 ground ratio in every scene

// ════════════════════════════════════════════════════════════════════
// 小巷 ALLEY (yellow)
// ════════════════════════════════════════════════════════════════════
function buildAlleyMap(): BeadMap {
  const map: BeadMap = new Map();
  const rnd = mulberry32(20260613);

  const F = {
    sky: "#d4dadb", skyD: "#c4cbcc",
    brick: "#8b918c", brickL: "#9ea49c", brickD: "#737a77", mortar: "#646c6c",
    pier: "#7d847f", pierD: "#666d6a",
    stain: "#6f7670", stainD: "#5c635f",
    moss: "#7c8a55", mossD: "#5f6e40", mossL: "#94a06a",
    wood: "#6d4e33", woodD: "#503722", woodL: "#86643f", paper: "#d8cfb6",
    red: "#b24536", redD: "#8a3327", gold: "#d8b659",
    ac: "#c0c4bf", acL: "#d2d6d0", acD: "#8f948f", grille: "#9aa09a",
    pipe: "#5d6361", pipeL: "#727876", pipeBr: "#4a4f4d",
    meter: "#9aa08c", meterL: "#aab09b", meterD: "#7c8270", conduit: "#5b5f56",
    led1: "#c4473a", led2: "#7fa86a",
    wire: "#3c403c", cord: "#4a4d48", bulb: "#caa84a", bulbG: "#f2dc8e",
    string: "#867a5e",
    stoneL: "#bdbcb1", stone: "#a9a89e", stoneD: "#94938a", seam: "#7c7b72",
    pool: "#c2c9c9",
  };
  const CLOTH = ["#7e9bb5", "#dcd3bb", "#c07f6a", "#7f8c5e", "#b9b4c2"];

  function skyFill(colTop) {
    for (let x = 0; x < TGW; x++) {
      for (let y = 0; y < colTop[x]; y++) setCell(map, x, y, rnd() < 0.28 ? F.skyD : F.sky);
    }
    for (let i = 0; i < 5; i++) {
      const ax = 30 + i * 74 + Math.floor(rnd() * 24);
      const top = colTop[((ax % TGW) + TGW) % TGW];
      const h = 6 + Math.floor(rnd() * 5);
      for (let y = top - h; y < top; y++) setCell(map, ax, y, F.wire);
      for (let k = -2; k <= 2; k++) setCell(map, ax + k, top - h, F.wire);
      setCell(map, ax - 3, top - h + 2, F.wire);
      setCell(map, ax + 3, top - h + 2, F.wire);
    }
  }
  function brickFill(x0, w, topY, botY) {
    for (let y = topY; y <= botY; y++) {
      for (let x = x0; x < x0 + w; x++) {
        let c = F.brick;
        const k = rnd();
        if (k < 0.16) c = F.brickL;
        else if (k < 0.3) c = F.brickD;
        if (y % 3 === 0 && rnd() < 0.38) c = F.mortar;
        if (y % 3 === 1 && (x + (Math.floor(y / 3) % 2) * 3) % 6 === 0 && rnd() < 0.5) c = F.mortar;
        if (y > botY - 20 && rnd() < (y - (botY - 20)) / 60) c = F.brickD;
        setCell(map, x, y, c);
      }
    }
  }
  function pierAt(x, topY) {
    for (let y = topY; y <= GROUND_ROW; y++) {
      setCell(map, x - 1, y, F.pierD);
      setCell(map, x, y, rnd() < 0.3 ? F.pierD : F.pier);
      setCell(map, x + 1, y, F.pierD);
    }
  }
  function downpipeAt(x, topY) {
    for (let y = topY; y <= GROUND_ROW; y++) {
      setCell(map, x, y, F.pipeBr);
      setCell(map, x + 1, y, y % 7 < 3 ? F.pipeL : F.pipe);
      setCell(map, x + 2, y, F.pipeBr);
    }
    for (let by = topY + 7; by < GROUND_ROW; by += 13) {
      setCell(map, x - 1, by, F.pipeBr);
      setCell(map, x + 3, by, F.pipeBr);
    }
  }
  function stainStreak(x, topY, len) {
    for (let y = topY; y <= topY + len && y <= GROUND_ROW; y++) {
      if (rnd() < 0.72) setCell(map, x, y, rnd() < 0.5 ? F.stainD : F.stain);
      if (rnd() < 0.3) setCell(map, x + 1, y, F.stain);
    }
  }
  function windowAt(wx, wy) {
    for (let x = wx - 2; x <= wx + 2; x++) {
      setCell(map, x, wy - 1, F.woodD);
      setCell(map, x, wy + 4, F.woodD);
    }
    for (let y = wy; y <= wy + 3; y++) {
      setCell(map, wx - 2, y, F.wood);
      setCell(map, wx + 2, y, F.wood);
      for (let x = wx - 1; x <= wx + 1; x++) {
        const cross = x === wx || y === wy + 1;
        setCell(map, x, y, cross ? F.woodL : rnd() < 0.3 ? F.paper : F.stain);
      }
    }
  }
  function acUnitAt(cx, cy) {
    for (let y = cy; y <= cy + 5; y++) {
      for (let x = cx - 5; x <= cx + 4; x++) {
        let c = F.ac;
        if (y === cy || x === cx - 5) c = F.acL;
        if (y === cy + 5 || x === cx + 4) c = F.acD;
        setCell(map, x, y, c);
      }
    }
    for (let x = cx - 4; x <= cx + 3; x++) {
      if (x % 2 === 0) for (let y = cy + 1; y <= cy + 4; y++) setCell(map, x, y, F.grille);
    }
    setCell(map, cx - 5, cy + 6, F.acD);
    setCell(map, cx + 4, cy + 6, F.acD);
    for (let y = cy + 6; y <= cy + 11; y++) setCell(map, cx + 4, y, F.conduit);
  }
  function meterBoxAt(cx, cy) {
    for (let y = cy; y <= cy + 5; y++) {
      for (let x = cx - 3; x <= cx + 3; x++) {
        let c = F.meter;
        if (x === cx - 3 || y === cy) c = F.meterL;
        if (x === cx + 3 || y === cy + 5) c = F.meterD;
        setCell(map, x, y, c);
      }
    }
    setCell(map, cx - 1, cy + 2, F.led1);
    setCell(map, cx + 1, cy + 2, F.led2);
    for (let y = cy + 6; y <= GROUND_ROW; y++) setCell(map, cx + 2, y, F.conduit);
  }
  function doorAt(cx) {
    for (let y = 90; y <= GROUND_ROW; y++) {
      for (let x = cx - 5; x <= cx + 5; x++) {
        let c = F.wood;
        if (x === cx) c = F.woodD;
        else if (rnd() < 0.16) c = F.woodL;
        if (x === cx - 5 || x === cx + 5) c = F.woodD;
        setCell(map, x, y, c);
      }
    }
    for (let x = cx - 6; x <= cx + 6; x++) {
      setCell(map, x, 88, F.woodD);
      setCell(map, x, 89, F.wood);
    }
    for (let y = 91; y <= 106; y++) {
      setCell(map, cx - 7, y, rnd() < 0.4 ? F.red : F.redD);
      setCell(map, cx + 7, y, rnd() < 0.4 ? F.red : F.redD);
    }
    setCell(map, cx - 1, 100, F.gold);
    setCell(map, cx + 1, 100, F.gold);
  }
  function mossPatch(cx, spread) {
    for (let i = 0; i < spread; i++) {
      const dx = Math.floor(rnd() * 14) - 7;
      const dy = Math.floor(rnd() * 12);
      const k = rnd();
      setCell(map, cx + dx, GROUND_ROW - dy, k < 0.3 ? F.mossL : k < 0.7 ? F.moss : F.mossD);
    }
  }
  function vatAt(cx) {
    for (let x = cx - 2; x <= cx + 2; x++) setCell(map, x, 99, F.woodD);
    for (let y = 100; y <= GROUND_ROW; y++) {
      const half = y >= GROUND_ROW - 1 ? 2 : 3;
      for (let x = cx - half; x <= cx + half; x++) {
        let c = "#5b4636";
        if (rnd() < 0.22) c = "#74604b";
        if (y === GROUND_ROW || x === cx + half) c = "#42321f";
        setCell(map, x, y, c);
      }
    }
  }
  function bulbAt(cx, cy) {
    for (let y = cy - 9; y <= cy - 1; y++) setCell(map, cx, y, F.cord);
    setCell(map, cx, cy, F.bulbG);
    setCell(map, cx - 1, cy, F.bulb);
    setCell(map, cx + 1, cy, F.bulb);
    setCell(map, cx, cy + 1, F.bulb);
  }
  function overheadLines() {
    const POLE = 96;
    const lines = [
      { by: 9, sag: 5, kind: "wire" },
      { by: 13, sag: 7, kind: "wire" },
      { by: 17, sag: 6, kind: "cloth" },
      { by: 22, sag: 9, kind: "cloth" },
      { by: 15, sag: 11, kind: "wire" },
    ];
    for (const L of lines) {
      for (let x = 0; x < TGW; x++) {
        const sp = (x % POLE) / POLE;
        const y = L.by + L.sag * Math.sin(Math.PI * sp);
        setCell(map, x, y, L.kind === "cloth" ? F.string : F.wire);
        if (L.kind === "wire" && rnd() < 0.25) setCell(map, x, y + 1, F.wire);
      }
      if (L.kind === "cloth") {
        for (let s = 0; s < TGW; s += POLE) {
          const x = s + POLE / 2 + Math.floor(rnd() * 10) - 5;
          const sp = (x % POLE) / POLE;
          const y = Math.round(L.by + L.sag * Math.sin(Math.PI * sp));
          const c = CLOTH[Math.floor(rnd() * CLOTH.length)];
          for (let dx = -2; dx <= 2; dx++) setCell(map, x + dx, y + 1, c);
          for (let dy = 2; dy <= 6; dy++)
            for (let dx = -2; dx <= 2; dx++) setCell(map, x + dx, y + dy, rnd() < 0.18 ? F.skyD : c);
        }
      }
    }
  }

  const piers = [];
  let px = 14 + Math.floor(rnd() * 24);
  while (px < TGW - 12) {
    piers.push(px);
    px += 50 + Math.floor(rnd() * 40);
  }
  const bounds = [0, ...piers, TGW];
  const colTop = new Array(TGW);
  const segs = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const top = 20 + Math.floor(rnd() * 16);
    for (let x = bounds[i]; x < bounds[i + 1]; x++) colTop[x] = top;
    segs.push({ x: bounds[i], w: bounds[i + 1] - bounds[i], top });
  }
  skyFill(colTop);
  segs.forEach((s) => brickFill(s.x, s.w, s.top, GROUND_ROW));
  piers.forEach((p, i) => {
    pierAt(p, Math.min(colTop[(p - 1 + TGW) % TGW], colTop[p % TGW]));
    if (i % 2 === 0) downpipeAt(p + 3, colTop[p % TGW] + 2);
  });
  segs.forEach((s, i) => {
    const cx = s.x + Math.floor(s.w / 2);
    for (let wx = s.x + 9; wx <= s.x + s.w - 9; wx += 18) if (rnd() < 0.7) windowAt(wx, s.top + 9);
    for (let wx = s.x + 9; wx <= s.x + s.w - 9; wx += 18)
      if (rnd() < 0.6) stainStreak(wx + (rnd() < 0.5 ? -2 : 2), s.top + 14, 22 + Math.floor(rnd() * 30));
    if (s.w > 30 && rnd() < 0.8) acUnitAt(s.x + 11, s.top + 18);
    if (s.w > 26) meterBoxAt(s.x + s.w - 8, 72 + Math.floor(rnd() * 8));
    if (i % 2 === 1 && s.w > 28) doorAt(cx);
    if (rnd() < 0.7) mossPatch(s.x + 6, 16);
    if (rnd() < 0.6) mossPatch(s.x + s.w - 6, 14);
    if (i % 2 === 0 && s.w > 24) vatAt(s.x + 7);
    if (rnd() < 0.45) bulbAt(cx, s.top + 16);
  });
  overheadLines();

  const top = GROUND_ROW - 2,
    bot = GROUND_ROW + 12;
  for (let y = top; y <= bot; y++) {
    for (let x2 = 0; x2 < TGW; x2++) {
      if (y === top && rnd() < 0.5) continue;
      const k = rnd();
      let c = k < 0.3 ? F.stoneL : k < 0.7 ? F.stone : F.stoneD;
      const row = y - top;
      if (row % 4 === 3 && (x2 + (Math.floor(row / 4) % 2) * 4) % 8 === 0) c = F.seam;
      setCell(map, x2, y, c);
    }
  }
  [40, 150, 250, 330].forEach((cx0) => {
    const w = 14 + Math.floor(rnd() * 14);
    for (let x = cx0; x < cx0 + w; x++) {
      for (let y = GROUND_ROW + 3; y <= GROUND_ROW + 7; y++) {
        const edge = x === cx0 || x === cx0 + w - 1 || y === GROUND_ROW + 7;
        if (rnd() < (edge ? 0.4 : 0.8)) setCell(map, x, y, rnd() < 0.4 ? F.stoneL : F.pool);
      }
    }
  });
  return map;
}

// ════════════════════════════════════════════════════════════════════
// 海滩 BEACH (blue)
// ════════════════════════════════════════════════════════════════════
function buildBeachMap(): BeadMap {
  const map: BeadMap = new Map();
  const rnd = mulberry32(20260613);
  const HORIZON = 42;
  const SURF = 87;
  const F = {
    cloud: "#e9f1ee", cloudL: "#f7faf7",
    seaHz: "#bcd9d6", seaL: "#aed4cf", seaM: "#92c3c0", seaD: "#7fb5b4",
    sparkle: "#dcefe9",
    isle: "#90a576", isleD: "#768c5e",
    sail: "#f4f1e6", mast: "#8a6f4c", hull: "#b98a5d", hullD: "#96703f",
    foam: "#f3f4ec", foamD: "#dde6dd",
    wet: "#dbc49d", wetD: "#cfb78f",
    sandL: "#f0e0c0", sand: "#e4d2ac", sandD: "#cfba90",
    post: "#96764a", postD: "#6e5639", postH: "#b89a6a",
    rope: "#c2ab7e", ropeD: "#9c855c",
    buoyA: "#d98e76", buoyB: "#efe9da",
    grass: "#8aa061", grassD: "#6f8549",
  };
  function blob(cx, cy, r, cMid, cLite, ragged) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx,
          dy = y - cy;
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        if (d > r - 1.2 && rnd() < ragged) continue;
        let c = cMid;
        if (rnd() < 0.3 || (-dx - dy > r * 0.35 && rnd() < 0.55)) c = cLite;
        setCell(map, x, y, c);
      }
    }
  }
  function clouds() {
    for (let i = 0; i < 6; i++) {
      const cx = rnd() * TGW,
        cy = 10 + rnd() * 20,
        R = 5 + rnd() * 6;
      [[0, 0, R], [-R * 0.85, R * 0.3, R * 0.7], [R * 0.85, R * 0.32, R * 0.66], [R * 0.15, -R * 0.42, R * 0.6]].forEach(
        ([dx, dy, r2]) => blob(cx + dx, cy + dy, r2, F.cloud, F.cloudL, 0.3)
      );
    }
  }
  function sea() {
    const top = HORIZON,
      bot = SURF + 1;
    for (let y = top; y <= bot; y++) {
      const f = (y - top) / (bot - top);
      for (let x = 0; x < TGW; x++) {
        const k = rnd();
        let c;
        if (f < 0.16) c = k < 0.5 ? F.seaHz : F.seaL;
        else if (f < 0.55) c = k < 0.18 ? F.seaL : k < 0.82 ? F.seaM : F.seaD;
        else c = k < 0.28 ? F.seaL : k < 0.78 ? F.seaM : F.seaD;
        setCell(map, x, y, c);
      }
    }
    for (let i = 0; i < 220; i++) {
      const x = Math.floor(rnd() * TGW),
        y = top + 4 + Math.floor(rnd() * (bot - top - 8));
      const len = 2 + Math.floor(rnd() * 4);
      for (let d = 0; d < len; d++) setCell(map, x + d, y, F.sparkle);
    }
  }
  function islands() {
    [[70, 30], [262, 44]].forEach(([cx, w]) => {
      for (let dx = -w / 2; dx <= w / 2; dx++) {
        const h = Math.max(0, Math.round((1 - Math.pow((2 * dx) / w, 2)) * 4.2));
        for (let dy = 0; dy < h; dy++) setCell(map, cx + dx, HORIZON + 1 - dy, rnd() < 0.3 ? F.isleD : F.isle);
      }
    });
  }
  function boat(cx, baseY) {
    for (let dx = -3; dx <= 3; dx++) setCell(map, cx + dx, baseY, F.hull);
    for (let dx = -2; dx <= 2; dx++) setCell(map, cx + dx, baseY + 1, F.hullD);
    for (let y = baseY - 10; y < baseY; y++) setCell(map, cx, y, F.mast);
    for (let i = 0; i < 8; i++) {
      const w = Math.round((i / 8) * 5);
      for (let dx = 1; dx <= w; dx++) setCell(map, cx - dx, baseY - 10 + i, F.sail);
    }
  }
  function shore() {
    for (let x = 0; x < TGW; x++) {
      const w = Math.sin((2 * Math.PI * 9 * x) / TGW) * 1.4 + Math.sin((2 * Math.PI * 4 * x) / TGW + 2) * 2.0;
      const y0 = Math.round(SURF + w * 0.8);
      for (let y = y0; y < y0 + 3; y++) if (rnd() < 0.88) setCell(map, x, y, rnd() < 0.3 ? F.foamD : F.foam);
      for (let y = y0 + 3; y <= 98; y++) {
        const k = rnd();
        setCell(map, x, y, k < 0.5 ? F.wet : k < 0.8 ? F.wetD : F.sandD);
      }
      for (let y = 99; y <= 105; y++) {
        const k = rnd();
        setCell(map, x, y, k < 0.35 ? F.sandL : k < 0.8 ? F.sand : F.sandD);
      }
    }
  }
  function groundShelf() {
    const top = GROUND_ROW - 2,
      bot = GROUND_ROW + 8;
    for (let y = top; y <= bot; y++) {
      const f = (y - top) / (bot - top);
      for (let x = 0; x < TGW; x++) {
        const k = rnd();
        let c;
        if (f < 0.4) c = k < 0.3 ? F.sandL : k < 0.7 ? F.sand : F.sandD;
        else c = k < 0.45 ? F.sand : k < 0.8 ? F.sandL : F.wetD;
        setCell(map, x, y, c);
      }
    }
  }
  function tufts() {
    for (let i = 0; i < 30; i++) {
      const x = rnd() * TGW,
        y = 100 + rnd() * 6;
      const n = 4 + Math.floor(rnd() * 4);
      for (let b = 0; b < n; b++) setCell(map, x + (rnd() * 4 - 2), y - rnd() * 2.5, rnd() < 0.4 ? F.grassD : F.grass);
    }
  }
  function buoyRing(cx, cy) {
    for (let a = 0; a < 24; a++) {
      const ang = (a / 24) * 2 * Math.PI;
      const c = Math.floor(a / 6) % 2 === 0 ? F.buoyA : F.buoyB;
      setCell(map, cx + Math.cos(ang) * 3.1, cy + Math.sin(ang) * 3.1, c);
      setCell(map, cx + Math.cos(ang) * 2.2, cy + Math.sin(ang) * 2.2, c);
    }
  }
  function fence() {
    const spacing = 48;
    for (let px = 8; px < TGW; px += spacing) {
      for (let y = 94; y <= 107; y++) {
        setCell(map, px - 1, y, F.postD);
        setCell(map, px, y, rnd() < 0.2 ? F.postD : F.post);
        setCell(map, px + 1, y, rnd() < 0.35 ? F.postD : F.post);
      }
      setCell(map, px - 1, 93, F.postH);
      setCell(map, px, 93, F.postH);
      setCell(map, px + 1, 93, F.postH);
      for (let i = 2; i < spacing; i++) {
        const u = i / spacing;
        const y = 96 + Math.sin(Math.PI * u) * 5;
        setCell(map, px + 1 + i, y, rnd() < 0.3 ? F.rope : F.ropeD);
        setCell(map, px + 1 + i, y + 1, F.ropeD);
      }
    }
    buoyRing(57, 100);
    buoyRing(249, 100);
  }

  clouds();
  sea();
  islands();
  boat(150, HORIZON + 6);
  boat(330, HORIZON + 10);
  shore();
  groundShelf();
  tufts();
  fence();
  return map;
}

// ════════════════════════════════════════════════════════════════════
// shared foliage/trunk/tree helpers for forest + highway
// ════════════════════════════════════════════════════════════════════
function makeTreeKit(map: BeadMap, rnd, F) {
  function foliage(cx, cy, r, cMid, cLite, cDark, ragged) {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const dx = x - cx,
          dy = y - cy;
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        if (d > r - 1.2 && rnd() < ragged) continue;
        let c = cMid;
        const k = rnd();
        if (k < 0.24) c = cLite;
        else if (k < 0.42) c = cDark;
        if (-dx - dy > r * 0.35 && rnd() < 0.55) c = cLite;
        if (dx + dy > r * 0.45 && rnd() < 0.45) c = cDark;
        setCell(map, x, y, c);
      }
    }
  }
  function trunk(cx, topY, baseY, w) {
    for (let y = topY; y <= baseY; y++) {
      for (let x = Math.round(cx - w); x <= Math.round(cx + w); x++) {
        const edge = x <= cx - w + 0.5 || x >= cx + w - 0.5;
        let c = edge ? F.trunkD : F.trunk;
        if (!edge && rnd() < 0.18) c = F.trunkH;
        setCell(map, x, y, c);
      }
    }
  }
  function roundTree(cx, baseY, H, R, cM, cL, cD) {
    const topY = baseY - H;
    const cy = topY + R * 0.9;
    trunk(cx, cy + R * 0.2, baseY, R < 11 ? 1 : 1.6);
    const blobs = [
      [0, 0, R], [-R * 0.62, R * 0.32, R * 0.7], [R * 0.62, R * 0.34, R * 0.68],
      [0, -R * 0.55, R * 0.66], [-R * 0.34, R * 0.74, R * 0.58], [R * 0.4, R * 0.72, R * 0.56],
      [-R * 0.2, -R * 0.2, R * 0.55], [R * 0.28, -R * 0.1, R * 0.5],
    ];
    blobs.forEach(([bx, by, br]) => foliage(cx + bx, cy + by, br, cM, cL, cD, 0.42));
  }
  function pine(cx, baseY, H, W, cM, cL, cD) {
    const topY = baseY - H;
    trunk(cx, baseY - H * 0.06, baseY, 1.4);
    const tiers = Math.max(3, Math.round(H / (W * 0.85)));
    for (let y = topY; y <= baseY; y++) {
      const f = (y - topY) / H;
      let half = f * W * 0.5;
      const scallop = 0.78 + 0.22 * Math.abs(Math.sin(f * tiers * Math.PI));
      half *= scallop;
      if (half < 0.4) {
        setCell(map, cx, y, cM);
        continue;
      }
      for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
        const edge = x < cx - half + 1.1 || x > cx + half - 1.1;
        if (edge && rnd() < 0.34) continue;
        let c = cM;
        const k = rnd();
        if (k < 0.26) c = cL;
        else if (k < 0.46) c = cD;
        if (cx - x > half * 0.15 && rnd() < 0.4) c = cL;
        setCell(map, x, y, c);
      }
    }
  }
  return { foliage, trunk, roundTree, pine };
}

// ════════════════════════════════════════════════════════════════════
// 森林 FOREST (green)
// ════════════════════════════════════════════════════════════════════
function buildForestMap(): BeadMap {
  const map: BeadMap = new Map();
  const rnd = mulberry32(20260611);
  const F = {
    trunk: "#80623e", trunkD: "#5f4628", trunkH: "#9a7748",
    hz: "#c4cfa1", hzL: "#d6deb6", hzD: "#b0bf8d",
    gA: "#8ba35f", gAd: "#71894a", gAl: "#a8bd7a",
    nM: "#5f7c40", nL: "#7e9b53", nD: "#45602e",
    pM: "#3f5a33", pD: "#2c4524", pL: "#52704a",
    grass: "#71904a", grassD: "#586f3a", grassL: "#90aa5c",
    earth: "#c8b087", earthD: "#b89c72",
    shadow: "#4c6336",
    fl1: "#d98e76", fl2: "#efe7d2", fl3: "#e3bb5c",
  };
  const { foliage, roundTree, pine } = makeTreeKit(map, rnd, F);
  function grassAndFlowers(y0) {
    for (let x = 0; x < TGW; x++) {
      if (rnd() < 0.6) {
        const h = 1 + Math.floor(rnd() * 3);
        for (let i = 0; i < h; i++) {
          const k = rnd();
          const c = k < 0.3 ? F.grassL : k < 0.55 ? F.grassD : F.grass;
          setCell(map, x + (rnd() < 0.4 ? 1 : 0), y0 - i, c);
        }
      }
      if (rnd() < 0.05) {
        const fc = [F.fl1, F.fl2, F.fl3][Math.floor(rnd() * 3)];
        setCell(map, x, y0 - 1 - Math.floor(rnd() * 2), fc);
      }
    }
  }
  function groundShelf() {
    const top = GROUND_ROW - 2,
      bot = GROUND_ROW + 8;
    for (let y = top; y <= bot; y++) {
      const f = (y - top) / (bot - top);
      for (let x = 0; x < TGW; x++) {
        if (y === top && rnd() < 0.55) continue;
        let c;
        if (f < 0.4) {
          const k = rnd();
          c = k < 0.3 ? F.grassL : k < 0.6 ? F.grass : F.grassD;
        } else {
          const k = rnd();
          c = k < 0.4 ? F.earth : k < 0.7 ? F.earthD : F.grassD;
        }
        setCell(map, x, y, c);
      }
    }
  }
  function baseShadow(cx, baseY, w) {
    for (let dx = -w; dx <= w; dx++) {
      for (let dy = -1; dy <= 2; dy++) {
        const d = Math.hypot(dx / w, dy / 2.4);
        if (d > 1 || rnd() < 0.45) continue;
        setCell(map, cx + dx, baseY + dy, F.shadow);
      }
    }
  }

  for (let x = 4; x < TGW; x += 15 + Math.floor(rnd() * 8)) {
    const cx = x + rnd() * 6;
    const baseY = GROUND_ROW - 3 - Math.floor(rnd() * 2);
    if (rnd() < 0.5) pine(cx, baseY, 30 + rnd() * 12, 13 + rnd() * 4, F.hzD, F.hz, F.hzD);
    else roundTree(cx, baseY, 26 + rnd() * 10, 8 + rnd() * 3, F.hz, F.hzL, F.hzD);
  }
  groundShelf();
  let x = 2;
  while (x < TGW + 6) {
    const baseY = GROUND_ROW + 2;
    const roll = rnd();
    if (roll < 0.42) {
      const H = 80 + rnd() * 26,
        W = 24 + rnd() * 8;
      pine(x, baseY, H, W, F.pM, F.pL, F.pD);
      baseShadow(x, baseY, W * 0.5);
      x += W * 0.62 + 6 + rnd() * 6;
    } else if (roll < 0.72) {
      const H = 64 + rnd() * 22,
        R = 18 + rnd() * 6;
      roundTree(x, baseY, H, R, F.nM, F.nL, F.nD);
      baseShadow(x, baseY, R * 1.1);
      x += R * 1.42 + 5 + rnd() * 5;
    } else {
      const H = 58 + rnd() * 18,
        R = 16 + rnd() * 5;
      roundTree(x, baseY, H, R, F.gA, F.gAl, F.gAd);
      baseShadow(x, baseY, R * 1.1);
      x += R * 1.42 + 5 + rnd() * 5;
    }
  }
  grassAndFlowers(GROUND_ROW - 1);
  return map;
}

// ════════════════════════════════════════════════════════════════════
// 公路 HIGHWAY (gray)
// ════════════════════════════════════════════════════════════════════
function buildHighwayMap(): BeadMap {
  const map: BeadMap = new Map();
  const rnd = mulberry32(20260612);
  const F = {
    cityM: "#a9bfc2", cityL: "#bccfd1", cityD: "#94adb1",
    cloud: "#e6efec", cloudL: "#f2f8f5",
    gM: "#8aa061", gL: "#a6ba7c", gD: "#6f8549",
    trunk: "#80623e", trunkD: "#5f4628", trunkH: "#9a7748",
    hM: "#7d9355", hL: "#97ab6c", hD: "#647a42",
    railL: "#e3dfd4", rail: "#cfcabd", railD: "#a8a397",
    pole: "#9aa0a2", poleD: "#7d8385", lampHead: "#6e7476", lampGlow: "#e8d9a8",
    curbL: "#dcd6c9", curb: "#cdc7b9", curbD: "#b3ad9f",
    roadA: "#b9b2a9", roadB: "#c4bdb4",
  };
  const { foliage, roundTree } = makeTreeKit(map, rnd, F);
  function clouds() {
    for (let i = 0; i < 5; i++) {
      const cx = rnd() * TGW,
        cy = 14 + rnd() * 22,
        R = 5 + rnd() * 5;
      [[0, 0, R], [-R * 0.85, R * 0.3, R * 0.7], [R * 0.85, R * 0.32, R * 0.66], [R * 0.15, -R * 0.42, R * 0.6]].forEach(
        ([dx, dy, r2]) => foliage(cx + dx, cy + dy, r2, F.cloud, F.cloudL, F.cloud, 0.3)
      );
    }
  }
  function buildings() {
    let x = 2;
    const baseY = 98;
    while (x < TGW - 4) {
      const w = 8 + Math.floor(rnd() * 14);
      const h = 16 + Math.floor(rnd() * 34);
      for (let bx = x; bx < x + w; bx++) {
        for (let by = baseY - h; by <= baseY; by++) {
          let c = F.cityM;
          const k = rnd();
          if (k < 0.12) c = F.cityL;
          else if (k < 0.2) c = F.cityD;
          if (by === baseY - h) c = F.cityD;
          setCell(map, bx, by, c);
        }
      }
      if (rnd() < 0.25) {
        const ax = x + Math.floor(w / 2);
        for (let i = 1; i <= 3; i++) setCell(map, ax, baseY - h - i, F.cityD);
      }
      x += w + (rnd() < 0.45 ? 1 + Math.floor(rnd() * 5) : 0);
    }
  }
  function hedge() {
    for (let x = 0; x < TGW; x += 3) {
      const r = 3.4 + rnd() * 2.2;
      foliage(x + rnd() * 2, 101 - rnd() * 3, r, F.hM, F.hL, F.hD, 0.35);
    }
  }
  function treeRow() {
    let x = 6 + rnd() * 10;
    while (x < TGW - 8) {
      const H = 30 + rnd() * 12,
        R = 10 + rnd() * 4;
      roundTree(x, GROUND_ROW - 4, H, R, F.gM, F.gL, F.gD);
      x += 34 + rnd() * 18;
    }
  }
  function groundShelf() {
    const top = GROUND_ROW - 2,
      bot = GROUND_ROW + 8;
    for (let y = top; y <= bot; y++) {
      const f = (y - top) / (bot - top);
      for (let x = 0; x < TGW; x++) {
        if (y === top && rnd() < 0.5) continue;
        let c;
        if (f < 0.38) {
          const k = rnd();
          c = k < 0.3 ? F.curbL : k < 0.65 ? F.curb : F.curbD;
        } else {
          const k = rnd();
          c = k < 0.4 ? F.roadA : k < 0.75 ? F.roadB : F.curbD;
        }
        setCell(map, x, y, c);
      }
    }
  }
  function guardrail() {
    for (let x = 0; x < TGW; x++) {
      setCell(map, x, 101, F.railL);
      setCell(map, x, 102, rnd() < 0.25 ? F.railD : F.rail);
    }
    for (let x = 4; x < TGW; x += 9) {
      setCell(map, x, 103, F.railD);
      setCell(map, x, 104, F.railD);
      setCell(map, x, 105, F.railD);
    }
  }
  function lamps() {
    for (let cx = 30; cx < TGW; cx += 128) {
      for (let y = 38; y <= GROUND_ROW; y++) {
        setCell(map, cx, y, rnd() < 0.2 ? F.poleD : F.pole);
        setCell(map, cx + 1, y, rnd() < 0.3 ? F.poleD : F.pole);
      }
      for (let dx = 1; dx <= 6; dx++) setCell(map, cx - dx, 38, F.pole);
      setCell(map, cx - 6, 39, F.lampHead);
      setCell(map, cx - 7, 39, F.lampHead);
      setCell(map, cx - 6, 40, F.lampGlow);
      setCell(map, cx - 7, 40, F.lampGlow);
    }
  }
  clouds();
  buildings();
  hedge();
  treeRow();
  groundShelf();
  guardrail();
  lamps();
  return map;
}

// ════════════════════════════════════════════════════════════════════
// 老城 OLD TOWN (red)
// ════════════════════════════════════════════════════════════════════
function buildTownMap(): BeadMap {
  const map: BeadMap = new Map();
  const rnd = mulberry32(20260614);
  const F = {
    haze: "#ddd6c6", hazeD: "#cdc6b4",
    eave: "#a8744e", eaveD: "#8a5c3a",
    doorM: "#8a5f3a", doorD: "#6e4827", doorL: "#a47a4e",
    frame: "#f2ead6", glass: "#6e6552", glassL: "#8a8069",
    shutter: "#8d9a6b", shutterD: "#74814f",
    vine: "#7d9355", vineD: "#647a42", vineL: "#97ab6c",
    pot: "#b97a4e", potD: "#96572f",
    string: "#8a7a5e",
    glow: "#e3bb5c", glowL: "#f0d488", cap: "#5f4a33",
    stoneL: "#cfc4b0", stone: "#c2b6a0", stoneD: "#b0a48c", seam: "#9c9078",
  };
  const WALLS = [
    { M: "#e6dac0", L: "#f0e6cf", D: "#d3c5a6" },
    { M: "#d9b48c", L: "#e6c7a2", D: "#c39d74" },
    { M: "#cf9a74", L: "#dfaf8a", D: "#b9825c" },
    { M: "#ded2bb", L: "#ebe2cf", D: "#c9bba0" },
  ];
  const FLAGS = ["#d98e76", "#efe7d2", "#8d9a6b", "#e3bb5c"];
  function hazeLayer() {
    for (let y = 44; y <= GROUND_ROW + 2; y++) for (let x = 0; x < TGW; x++) setCell(map, x, y, rnd() < 0.25 ? F.hazeD : F.haze);
    [[30, 18], [150, 22], [270, 16], [340, 20]].forEach(([cx, w]) => {
      for (let x = cx; x < cx + w; x++) for (let y = 60; y <= 92; y++) if (rnd() < 0.6) setCell(map, x, y, F.hazeD);
    });
  }
  function windowAt(wx, wy) {
    for (let x = wx - 1; x <= wx + 3; x++) setCell(map, x, wy - 1, F.frame);
    for (let y = wy; y <= wy + 5; y++) {
      setCell(map, wx - 1, y, F.frame);
      setCell(map, wx + 3, y, F.frame);
      for (let x = wx; x <= wx + 2; x++) setCell(map, x, y, rnd() < 0.3 ? F.glassL : F.glass);
    }
    for (let x = wx - 2; x <= wx + 4; x++) setCell(map, x, wy + 6, F.frame);
    if (rnd() < 0.6) {
      for (let y = wy; y <= wy + 5; y++) {
        setCell(map, wx - 3, y, rnd() < 0.3 ? F.shutterD : F.shutter);
        setCell(map, wx - 2, y, F.shutterD);
        setCell(map, wx + 4, y, F.shutterD);
        setCell(map, wx + 5, y, rnd() < 0.3 ? F.shutterD : F.shutter);
      }
    }
  }
  function doorAt(cx) {
    for (let y = 90; y <= 106; y++) {
      for (let x = cx - 4; x <= cx + 4; x++) {
        let c = F.doorM;
        if (x === cx) c = F.doorD;
        else if (rnd() < 0.18) c = F.doorL;
        setCell(map, x, y, c);
      }
    }
    for (let x = cx - 3; x <= cx + 3; x++) setCell(map, x, 89, F.doorM);
    for (let x = cx - 2; x <= cx + 2; x++) setCell(map, x, 88, F.doorM);
    [[-5, 92], [5, 92], [-4, 90], [4, 90], [-3, 88], [3, 88], [-2, 87], [-1, 87], [0, 87], [1, 87], [2, 87]].forEach(
      ([dx, dy]) => setCell(map, cx + dx, dy, F.frame)
    );
    setCell(map, cx + 2, 99, F.glow);
  }
  function vinesAt(x0, topY) {
    for (let y = topY; y <= topY + 30; y++) {
      for (let x = x0; x <= x0 + 4; x++) {
        if (rnd() < 0.32) {
          const k = rnd();
          setCell(map, x, y, k < 0.3 ? F.vineL : k < 0.7 ? F.vine : F.vineD);
        }
      }
    }
  }
  function lanternAt(cx, y0) {
    setCell(map, cx, y0, F.cap);
    setCell(map, cx, y0 + 1, F.glowL);
    setCell(map, cx - 1, y0 + 1, F.glow);
    setCell(map, cx + 1, y0 + 1, F.glow);
    setCell(map, cx, y0 + 2, F.glow);
    setCell(map, cx - 1, y0 + 2, F.glow);
    setCell(map, cx + 1, y0 + 2, F.glow);
    setCell(map, cx, y0 + 3, F.cap);
  }
  function potAt(cx) {
    for (let i = 0; i < 14; i++) {
      const dx = rnd() * 6 - 3,
        dy = rnd() * 4;
      const k = rnd();
      setCell(map, cx + dx, 99 + dy, k < 0.3 ? F.vineL : k < 0.7 ? F.vine : F.vineD);
    }
    for (let y = 103; y <= 106; y++) {
      const half = y === 103 ? 3 : 2;
      for (let x = cx - half; x <= cx + half; x++) setCell(map, x, y, y === 103 || rnd() < 0.25 ? F.potD : F.pot);
    }
  }
  function buntingBetween(ax, ay, bx, by) {
    const n = bx - ax;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      const y = ay + (by - ay) * u + Math.sin(Math.PI * u) * 4;
      setCell(map, ax + i, y, F.string);
      if (i > 1 && i < n - 1 && i % 5 === 2) {
        const c = FLAGS[Math.floor(rnd() * FLAGS.length)];
        setCell(map, ax + i, y + 1, c);
        setCell(map, ax + i, y + 2, c);
      }
    }
  }
  function facade(x0, w, topY, wall) {
    for (let y = topY; y <= GROUND_ROW; y++) {
      for (let x = x0; x < x0 + w; x++) {
        let c = wall.M;
        const k = rnd();
        if (k < 0.14) c = wall.L;
        else if (k < 0.24) c = wall.D;
        if (x === x0 || x === x0 + w - 1) c = wall.D;
        if (y === topY + 2) c = rnd() < 0.5 ? wall.D : wall.M;
        setCell(map, x, y, c);
      }
    }
    for (let x = x0 - 1; x <= x0 + w; x++) {
      setCell(map, x, topY, F.eaveD);
      setCell(map, x, topY + 1, rnd() < 0.3 ? F.eaveD : F.eave);
    }
    const rows = [topY + 8];
    if (topY + 26 < 80) rows.push(topY + 24);
    rows.forEach((wy) => {
      for (let wx = x0 + 7; wx <= x0 + w - 10; wx += 14) windowAt(wx, wy);
    });
  }

  hazeLayer();
  const segs = [];
  let x = 0;
  while (x < TGW - 36) {
    const w = 46 + Math.floor(rnd() * 28);
    const topY = 20 + Math.floor(rnd() * 14);
    segs.push({ x, w, topY });
    x += w + (rnd() < 0.5 ? 6 + Math.floor(rnd() * 4) : 0);
  }
  if (TGW - x > 10) segs.push({ x, w: TGW - x, topY: 24 + Math.floor(rnd() * 10) });
  segs.forEach((s, i) => facade(s.x, s.w, s.topY, WALLS[i % WALLS.length]));
  segs.forEach((s, i) => {
    const cx = s.x + Math.floor(s.w / 2);
    if (i % 2 === 0) doorAt(cx);
    if (rnd() < 0.6) vinesAt(s.x + 1, s.topY + 4);
    if (i % 2 === 1) lanternAt(cx, s.topY + 10);
    potAt(s.x + 6);
    if (rnd() < 0.7) potAt(s.x + s.w - 7);
  });
  for (let i = 0; i + 1 < segs.length; i += 2) {
    const a = segs[i],
      b = segs[i + 1];
    if (b.x - (a.x + a.w) >= 0) buntingBetween(a.x + a.w - 6, a.topY + 5, b.x + 6, b.topY + 5);
  }
  const top = GROUND_ROW - 2,
    bot = GROUND_ROW + 8;
  for (let y = top; y <= bot; y++) {
    for (let x2 = 0; x2 < TGW; x2++) {
      if (y === top && rnd() < 0.5) continue;
      const k = rnd();
      let c = k < 0.3 ? F.stoneL : k < 0.7 ? F.stone : F.stoneD;
      const row = y - top;
      if (row % 3 === 2 && (x2 + (Math.floor(row / 3) % 2) * 3) % 6 === 0) c = F.seam;
      setCell(map, x2, y, c);
    }
  }
  return map;
}

// ════════════════════════════════════════════════════════════════════
// scene definitions (1:1 with AuraRide emotion colours)
// ════════════════════════════════════════════════════════════════════
export const SCENES: SceneDef[] = [
  {
    key: "alley",
    cn: "小巷",
    color: "yellow",
    buildTileURL: () => tileURLFromMap(buildAlleyMap()),
    sky: "#d4dadb",
    skyGradient: "linear-gradient(180deg, #e2e6e4 0%, #d4dadb 100%)",
    groundGradient: "linear-gradient(180deg, #8f8e85 0%, #a9a89e 45%, #c2c1b6 100%)",
    veils: [
      { top: BAND_TOP + BAND_H * 0.32, height: BAND_H * 0.62, gradient: "linear-gradient(180deg, rgba(60,66,64,0) 0%, rgba(60,66,64,0.22) 70%, rgba(60,66,64,0.30) 100%)" },
    ],
    edgeVignette: "linear-gradient(90deg, rgba(48,52,50,0.34) 0%, rgba(48,52,50,0) 18%, rgba(48,52,50,0) 82%, rgba(48,52,50,0.34) 100%)",
    lightPool: "radial-gradient(ellipse at center, rgba(228,233,231,0.45) 0%, rgba(228,233,231,0) 62%)",
    shadowColor: "rgba(70,72,60,0.34)",
    dash: { top: GROUND_TOP + 40, dashPx: 230, gradient: "repeating-linear-gradient(90deg, rgba(96,98,86,0.22) 0 115px, rgba(96,98,86,0) 115px 230px)", opacity: 0.6 },
  },
  {
    key: "beach",
    cn: "海滩",
    color: "blue",
    buildTileURL: () => tileURLFromMap(buildBeachMap()),
    sky: "#c9dee0",
    skyGradient: "linear-gradient(180deg, #d4e4e6 0%, #c9dee0 100%)",
    groundGradient: "linear-gradient(180deg, #e7d6b4 0%, #ecdabb 45%, #efe1c4 100%)",
    veils: [
      { top: BAND_TOP, height: BAND_H * 0.55, gradient: "linear-gradient(180deg, rgba(201,222,224,0.45) 0%, rgba(201,222,224,0.15) 55%, rgba(201,222,224,0) 100%)" },
    ],
    lightPool: "radial-gradient(ellipse at center, rgba(248,243,228,0.5) 0%, rgba(248,243,228,0) 62%)",
    shadowColor: "rgba(120,100,70,0.28)",
    dash: { top: GROUND_TOP + 32, dashPx: 260, gradient: "repeating-linear-gradient(90deg, rgba(255,255,255,0.5) 0 130px, rgba(255,255,255,0) 130px 260px)", opacity: 0.6 },
  },
  {
    key: "forest",
    cn: "森林",
    color: "green",
    buildTileURL: () => tileURLFromMap(buildForestMap()),
    sky: "#efead8",
    skyGradient: "linear-gradient(180deg, #f2eddd 0%, #efead8 100%)",
    groundGradient: "linear-gradient(180deg, #d6bf9c 0%, #dfc9aa 45%, #e6d2b5 100%)",
    veils: [
      { top: BAND_TOP, height: BAND_H * 0.6, gradient: "linear-gradient(180deg, rgba(239,234,216,0.55) 0%, rgba(239,234,216,0.2) 55%, rgba(239,234,216,0) 100%)" },
    ],
    lightPool: "radial-gradient(ellipse at center, rgba(245,240,224,0.55) 0%, rgba(245,240,224,0) 62%)",
    shadowColor: "rgba(80,60,38,0.32)",
    dash: { top: GROUND_TOP + 30, dashPx: 240, gradient: "repeating-linear-gradient(90deg, rgba(150,120,80,0.28) 0 120px, rgba(150,120,80,0) 120px 240px)", opacity: 0.6 },
    leaves: true,
  },
  {
    key: "highway",
    cn: "公路",
    color: "gray",
    buildTileURL: () => tileURLFromMap(buildHighwayMap()),
    sky: "#cbdfe0",
    skyGradient: "linear-gradient(180deg, #d4e3e4 0%, #cbdfe0 100%)",
    groundGradient: "linear-gradient(180deg, #aba49c 0%, #beb6af 45%, #c9c2ba 100%)",
    veils: [
      { top: BAND_TOP, height: BAND_H * 0.6, gradient: "linear-gradient(180deg, rgba(203,223,224,0.5) 0%, rgba(203,223,224,0.18) 55%, rgba(203,223,224,0) 100%)" },
    ],
    lightPool: "radial-gradient(ellipse at center, rgba(236,242,238,0.5) 0%, rgba(236,242,238,0) 62%)",
    shadowColor: "rgba(70,66,60,0.30)",
    dash: { top: GROUND_TOP + 36, dashPx: 240, gradient: "repeating-linear-gradient(90deg, rgba(244,241,233,0.65) 0 120px, rgba(244,241,233,0) 120px 240px)", opacity: 0.75, radius: 5 },
  },
  {
    key: "oldtown",
    cn: "老城",
    color: "red",
    buildTileURL: () => tileURLFromMap(buildTownMap()),
    sky: "#efe9dc",
    skyGradient: "linear-gradient(180deg, #f4efe3 0%, #efe9dc 100%)",
    groundGradient: "linear-gradient(180deg, #cdc2b0 0%, #dbd0be 45%, #e3d9c8 100%)",
    veils: [
      { top: BAND_TOP, height: BAND_H * 0.5, gradient: "linear-gradient(180deg, rgba(239,233,220,0.5) 0%, rgba(239,233,220,0.16) 55%, rgba(239,233,220,0) 100%)" },
    ],
    lightPool: "radial-gradient(ellipse at center, rgba(247,242,229,0.5) 0%, rgba(247,242,229,0) 62%)",
    shadowColor: "rgba(90,78,58,0.30)",
    dash: { top: GROUND_TOP + 36, dashPx: 230, gradient: "repeating-linear-gradient(90deg, rgba(120,105,82,0.22) 0 115px, rgba(120,105,82,0) 115px 230px)", opacity: 0.6 },
  },
];
