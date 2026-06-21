// CyclingScene.tsx — composes one full riding scene (replaces each scene file's
// <BikeScene>): backdrop gradients, the scrolling bead band, atmospheric veils,
// a light pool + contact shadows, the animated bead rider, and the title + login
// UI on top. Driven by a single `t` (seconds) passed down from CyclingStart.

import React from "react";
import {
  STAGE_W,
  BAND_TOP,
  BAND_H,
  GROUND_Y,
  TILE_DISP_W,
  PPS,
  DURATION,
} from "./engine";
import { BoyArt, type RiderArt, type RiderMap } from "./riderBoy";
import { riderArt, getRiderId, type RiderId } from "./riderChoice";
import type { SceneDef } from "./scenes";

// boy & girl share the same grid/cadence, so these dims hold for both
const GW = BoyArt.GW,
  GH = BoyArt.GH,
  CS = BoyArt.CS;
const DISP_W = 486;
const DISP_H = (DISP_W * GH) / GW;
const DISP_GROUND = DISP_H * (74 / GH);
const OUTLINE = "#2c2014";

// "rgba(r,g,b,a)" → "rgba(r,g,b,0)" so the contact-shadow fades to fully
// transparent of the SAME hue (not toward black).
function zeroAlpha(rgba: string): string {
  return rgba.replace(/,\s*[\d.]+\s*\)$/, ",0)");
}

function renderRiderOutlined(ctx: CanvasRenderingContext2D, map: RiderMap, personSet: Set<number>) {
  ctx.clearRect(0, 0, GW * CS, GH * CS);
  const r = CS * 0.46;
  const filled = (x: number, y: number) => x >= 0 && x < GW && y >= 0 && y < GH && map.has(x * 1000 + y);
  const isPerson = (x: number, y: number) => personSet.has(x * 1000 + y);

  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  ctx.fillStyle = OUTLINE;
  for (let x = 0; x < GW; x++) {
    for (let y = 0; y < GH; y++) {
      if (filled(x, y)) continue;
      let adj = false;
      for (const [dx, dy] of N8) {
        if (isPerson(x + dx, y + dy)) {
          adj = true;
          break;
        }
      }
      if (!adj) continue;
      const cx = (x + 0.5) * CS,
        cy = (y + 0.5) * CS;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.35, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  map.forEach((color, key) => {
    const x = Math.floor(key / 1000),
      y = key % 1000;
    const cx = (x + 0.5) * CS,
      cy = (y + 0.5) * CS;
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

function Cyclist({ t, shadowColor, art, onToggle }: { t: number; shadowColor: string; art: RiderArt; onToggle?: () => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const bobPhase = (t / DURATION) * 8 * Math.PI * 2;
  const squash = 1 + Math.sin(bobPhase * 2) * 0.035;
  const bob = Math.sin(bobPhase) * 4;
  React.useLayoutEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const crankAngle = (t / DURATION) * art.CRANK_REV * 2 * Math.PI;
    const wheelAngle = (t / DURATION) * art.WHEEL_REV * 2 * Math.PI;
    const map: RiderMap = new Map();
    art.build(map, crankAngle, wheelAngle);
    const personSet = art.personMask(crankAngle);
    renderRiderOutlined(ctx, map, personSet);
  });
  const shadowOut = zeroAlpha(shadowColor);
  return (
    <React.Fragment>
      {[27, 67].map((gx, i) => {
        const wx = (STAGE_W - DISP_W) / 2 + DISP_W * (gx / GW);
        const wheelD = DISP_W * (32 / GW);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: wx - wheelD * 0.62,
              top: GROUND_Y - 11,
              width: wheelD * 1.24,
              height: 20,
              background: `radial-gradient(ellipse at center, ${shadowColor} 0%, ${shadowOut} 68%)`,
              transform: `scaleX(${2 - squash})`,
              transformOrigin: "center",
            }}
          />
        );
      })}
      <canvas
        ref={canvasRef}
        width={GW * CS}
        height={GH * CS}
        onClick={onToggle}
        title={onToggle ? "点我换骑手" : undefined}
        style={{
          position: "absolute",
          left: (STAGE_W - DISP_W) / 2,
          top: GROUND_Y - DISP_GROUND + bob,
          width: DISP_W,
          height: DISP_H,
          transform: `scaleY(${squash})`,
          transformOrigin: "bottom center",
          cursor: onToggle ? "pointer" : "default",
          pointerEvents: onToggle ? "auto" : "none",
        }}
      />
    </React.Fragment>
  );
}

// forest floating leaves (ported from scene_forest_bead.jsx <Leaves/>)
function Leaves({ t }: { t: number }) {
  const f = t / DURATION;
  const span = STAGE_W + 240;
  const seeds = [
    { x0: 960, y: 980, N: 2, sw: 70, M: 3, K: 4, r: 7, c: "#9aae6e", ph: 0.0 },
    { x0: 1320, y: 1120, N: 2, sw: 90, M: 2, K: 3, r: 6, c: "#c2a86e", ph: 1.7 },
    { x0: 700, y: 920, N: 3, sw: 60, M: 4, K: 5, r: 5, c: "#86994f", ph: 3.1 },
    { x0: 1180, y: 1060, N: 3, sw: 80, M: 3, K: 4, r: 6, c: "#b6964e", ph: 4.4 },
  ];
  return (
    <React.Fragment>
      {seeds.map((s, i) => {
        let x = s.x0 - ((f * s.N * span) % span);
        if (x < -60) x += span;
        const sway = Math.sin(2 * Math.PI * s.M * f + s.ph) * s.sw;
        const rot = Math.sin(2 * Math.PI * s.K * f + s.ph) * 40;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: s.y + sway,
              width: s.r * 2,
              height: s.r * 1.3,
              background: s.c,
              borderRadius: "60% 60% 60% 0",
              transform: `rotate(${rot}deg)`,
              opacity: 0.5,
            }}
          />
        );
      })}
    </React.Fragment>
  );
}

// Pure background art for one scene (backdrop + scrolling bead band + rider +
// atmosphere). The title / login UI live in a separate screen-space layer
// (StartUI) so they stay responsive to the real viewport. Reused as the page
// background behind interior screens too.
export default function CyclingScene({ def, t, tileURL, riderId, onToggleRider }: { def: SceneDef; t: number; tileURL: string; riderId?: RiderId; onToggleRider?: () => void }) {
  const bandOffset = (t * PPS) % TILE_DISP_W;
  const dashOffset = (t * PPS * 1.3) % def.dash.dashPx;
  const groundTopForBands = BAND_TOP + BAND_H * 0.88;
  const art = riderArt(riderId ?? getRiderId());

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: def.sky }}>
      {/* backdrop: sky + ground */}
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: BAND_TOP + 2, background: def.skyGradient }} />
      <div style={{ position: "absolute", left: 0, right: 0, top: groundTopForBands - 2, bottom: 0, background: def.groundGradient }} />

      {/* scrolling bead band */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: BAND_TOP,
          height: BAND_H,
          backgroundImage: "url(" + tileURL + ")",
          backgroundRepeat: "repeat-x",
          backgroundSize: TILE_DISP_W + "px " + BAND_H + "px",
          backgroundPositionX: -bandOffset + "px",
          imageRendering: "auto",
          willChange: "background-position",
        }}
      />

      {/* atmospheric veils */}
      {def.veils.map((v, i) => (
        <div key={i} style={{ position: "absolute", left: 0, right: 0, top: v.top, height: v.height, background: v.gradient, pointerEvents: "none" }} />
      ))}

      {/* pressing side walls (alley) */}
      {def.edgeVignette && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: def.edgeVignette }} />}

      {/* soft light pool behind the rider */}
      <div
        style={{
          position: "absolute",
          left: STAGE_W / 2 - 320,
          top: GROUND_Y - 560,
          width: 640,
          height: 600,
          background: def.lightPool,
          pointerEvents: "none",
        }}
      />

      {def.leaves && <Leaves t={t} />}

      {/* foreground speed-cue dashes */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: def.dash.top,
          height: 10,
          backgroundImage: def.dash.gradient,
          backgroundSize: def.dash.dashPx + "px 100%",
          backgroundPositionX: -dashOffset + "px",
          opacity: def.dash.opacity,
          borderRadius: def.dash.radius || 0,
        }}
      />

      <Cyclist t={t} shadowColor={def.shadowColor} art={art} onToggle={onToggleRider} />
    </div>
  );
}
