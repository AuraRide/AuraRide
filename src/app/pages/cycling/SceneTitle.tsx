// SceneTitle.tsx — "光屿骑行" rendered in bead / cross-stitch style (ported from
// title.jsx). Position-agnostic + width-responsive: it draws the bead canvas at
// full internal resolution and lets CSS scale it to the parent's width, so the
// title always fits the real phone frame (no stage-crop). The parent positions it.

import React from "react";
import type { CtaColor } from "./scenes";

const TITLE_TEXT = "光屿骑行";

const TITLE_COLORS: Record<CtaColor, { dark: string; main: string; light: string }> = {
  red: { dark: "#7d1a12", main: "#d23b2c", light: "#ef7163" },
  yellow: { dark: "#9a6a08", main: "#e8a417", light: "#f4c64e" },
  gray: { dark: "#444b52", main: "#8f99a2", light: "#c2cad0" },
  blue: { dark: "#173e84", main: "#2f6fd6", light: "#5e98ec" },
  green: { dark: "#1d5e2c", main: "#3a9b4e", light: "#62c074" },
};

interface TitleGrid {
  cells: [number, number][];
  w: number;
  h: number;
}

function buildTitleGrid(): TitleGrid {
  const FONT_PX = 168;
  const STEP = 5;
  const SPACING = Math.round(FONT_PX * 0.1);
  const PAD = Math.ceil(FONT_PX * 0.28);
  const family = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Heiti SC",sans-serif';
  const font = "700 " + FONT_PX + "px " + family;

  const meas = document.createElement("canvas").getContext("2d")!;
  meas.font = font;
  const chars = Array.from(TITLE_TEXT);
  const widths = chars.map((c) => Math.ceil(meas.measureText(c).width));
  const totalW = widths.reduce((a, b) => a + b, 0) + SPACING * (chars.length - 1);

  const cv = document.createElement("canvas");
  cv.width = totalW + PAD * 2;
  cv.height = FONT_PX + PAD * 2;
  const ctx = cv.getContext("2d")!;
  ctx.font = font;
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#000";
  let x = PAD;
  const baseline = PAD + FONT_PX * 0.84;
  chars.forEach((c, i) => {
    ctx.fillText(c, x, baseline);
    x += widths[i] + SPACING;
  });

  const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
  const gw = Math.floor(cv.width / STEP);
  const gh = Math.floor(cv.height / STEP);
  const cells: [number, number][] = [];
  let minx = gw,
    miny = gh,
    maxx = 0,
    maxy = 0;
  for (let gy = 0; gy < gh; gy++) {
    for (let gx = 0; gx < gw; gx++) {
      let acc = 0,
        n = 0;
      for (let oy = 1; oy < STEP; oy += 2) {
        for (let ox = 1; ox < STEP; ox += 2) {
          const px = gx * STEP + ox,
            py = gy * STEP + oy;
          acc += data[(py * cv.width + px) * 4 + 3];
          n++;
        }
      }
      if (acc / n > 96) {
        cells.push([gx, gy]);
        if (gx < minx) minx = gx;
        if (gx > maxx) maxx = gx;
        if (gy < miny) miny = gy;
        if (gy > maxy) maxy = gy;
      }
    }
  }
  return {
    cells: cells.map(([gx, gy]) => [gx - minx, gy - miny] as [number, number]),
    w: maxx - minx + 1,
    h: maxy - miny + 1,
  };
}

function paintTitleBeads(canvas: HTMLCanvasElement, grid: TitleGrid, pal: { dark: string; main: string; light: string }) {
  const TARGET_W = 936;
  const SS = 2;
  const BEAD = (TARGET_W * SS) / (grid.w + 3);
  canvas.width = Math.ceil((grid.w + 3) * BEAD);
  canvas.height = Math.ceil((grid.h + 3) * BEAD);
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const filled = new Set(grid.cells.map(([x, y]) => x + "," + y));
  const N8 = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const outline = new Set<string>();
  for (const [x, y] of grid.cells) {
    for (const [dx, dy] of N8) {
      const k = x + dx + "," + (y + dy);
      if (!filled.has(k)) outline.add(k);
    }
  }
  const r = BEAD * 0.46;

  ctx.fillStyle = "rgba(40,30,18,0.16)";
  for (const [x, y] of grid.cells) {
    ctx.beginPath();
    ctx.arc((x + 1.5) * BEAD + BEAD * 0.25, (y + 1.5) * BEAD + BEAD * 0.4, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = pal.dark;
  for (const key of outline) {
    const [x, y] = key.split(",").map(Number);
    ctx.beginPath();
    ctx.arc((x + 1.5) * BEAD, (y + 1.5) * BEAD, r * 1.12, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const [x, y] of grid.cells) {
    const cx = (x + 1.5) * BEAD,
      cy = (y + 1.5) * BEAD;
    const topEdge = !filled.has(x + "," + (y - 1));
    ctx.fillStyle = topEdge ? pal.light : pal.main;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.20)";
    ctx.beginPath();
    ctx.arc(cx - r * 0.3, cy - r * 0.3, r * 0.42, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Renders the bead title + AURARIDE wordmark, sized to 100% of its parent.
// `t` drives only a gentle vertical float (entrance fade is handled by the parent).
export default function SceneTitle({ color, t }: { color: CtaColor; t: number }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const grid = React.useMemo(buildTitleGrid, []);
  const pal = TITLE_COLORS[color] || TITLE_COLORS.yellow;

  React.useLayoutEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    paintTitleBeads(cv, grid, pal);
  }, [grid, color, pal]);

  const float = Math.sin(t * 0.9) * 5;

  return (
    <div style={{ width: "100%", transform: "translateY(" + float.toFixed(2) + "px)", pointerEvents: "none" }}>
      <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block" }} />
      <div
        style={{
          marginTop: 4,
          textAlign: "center",
          fontFamily: '"PingFang SC","Microsoft YaHei",sans-serif',
          fontSize: "clamp(12px, 3.6vw, 16px)",
          fontWeight: 600,
          letterSpacing: 7,
          color: pal.dark,
          opacity: 0.6,
          textIndent: 7,
        }}
      >
        AURARIDE
      </div>
    </div>
  );
}
