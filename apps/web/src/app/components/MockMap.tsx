import { useMemo } from "react";

// MockMap — a stylized, illustrated city map for when no 高德 key is configured.
// Procedurally drawn (seeded, so 换一批 / 调里程 reshuffles it) in the app's warm
// palette: land blocks, parks, a river and a road grid, with the planned routes
// drawn on top (selected = solid theme colour, the rest dashed grey). Lives behind
// the route page's bottom panel — start marker sits in the upper-visible third.

const VW = 360;
const VH = 720;
const START = { x: VW * 0.5, y: VH * 0.3 };

// small deterministic PRNG so the same seed always paints the same city
function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function MockMap({
  themeColor = "#2BB877",
  routes = [],
  selected = 0,
  seed = 0,
}: {
  themeColor?: string;
  routes?: Array<{ distanceKm: number }>;
  selected?: number;
  seed?: number;
}) {
  const city = useMemo(() => {
    const rnd = mulberry(seed * 131 + 7);
    const cell = 40;
    const blocks: Array<{ x: number; y: number; w: number; h: number; fill: string }> = [];
    for (let y = 0; y < VH; y += cell)
      for (let x = 0; x < VW; x += cell) {
        const k = rnd();
        blocks.push({ x: x + 2, y: y + 2, w: cell - 4, h: cell - 4, fill: k < 0.2 ? "#ddd4bf" : k < 0.34 ? "#e9e3d2" : "#e4ddca" });
      }
    const parks: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (let i = 0; i < 4; i++) parks.push({ x: rnd() * VW * 0.78, y: rnd() * VH * 0.62, w: 46 + rnd() * 64, h: 40 + rnd() * 60 });
    let rx = VW * (0.18 + rnd() * 0.5);
    const river: Array<[number, number]> = [];
    for (let y = -20; y <= VH + 20; y += 22) {
      rx += (rnd() - 0.5) * 42;
      river.push([Math.max(20, Math.min(VW - 20, rx)), y]);
    }
    return { blocks, parks, river };
  }, [seed]);

  const paths = useMemo(() => {
    return routes.map((r, i) => {
      const dist = r.distanceKm || 5;
      const rnd = mulberry(seed * 977 + i * 37 + Math.round(dist * 10));
      const steps = 5 + Math.round(dist);
      const stepLen = Math.min(48, 14 + dist * 2);
      let ang = -Math.PI / 2 + (i - 1) * 0.7 + (rnd() - 0.5) * 0.5;
      let x = START.x;
      let y = START.y;
      const pts: Array<[number, number]> = [[x, y]];
      for (let s = 0; s < steps; s++) {
        ang += (rnd() - 0.5) * 1.1;
        x += Math.cos(ang) * stepLen;
        y += Math.sin(ang) * stepLen * 0.78;
        x = Math.max(22, Math.min(VW - 22, x));
        y = Math.max(64, Math.min(VH * 0.6, y));
        pts.push([x, y]);
      }
      return pts;
    });
  }, [routes, seed]);

  const d = (pts: Array<[number, number]>) => pts.map((p, i) => `${i ? "L" : "M"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const roadsV = Array.from({ length: Math.ceil(VW / 40) + 1 });
  const roadsH = Array.from({ length: Math.ceil(VH / 40) + 1 });

  return (
    <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid slice" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} shapeRendering="crispEdges">
      <rect width={VW} height={VH} fill="#ece5d4" />
      {city.blocks.map((b, i) => (
        <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} fill={b.fill} />
      ))}
      {city.parks.map((p, i) => (
        <rect key={"p" + i} x={p.x} y={p.y} width={p.w} height={p.h} fill="#c3d4a3" />
      ))}
      <polyline points={city.river.map((p) => p.join(",")).join(" ")} fill="none" stroke="#a9cee0" strokeWidth="17" strokeLinejoin="round" strokeLinecap="round" />
      <g stroke="#d8cfb8" strokeWidth="2" shapeRendering="auto">
        {roadsV.map((_, i) => (
          <line key={"v" + i} x1={i * 40} y1={0} x2={i * 40} y2={VH} />
        ))}
        {roadsH.map((_, i) => (
          <line key={"h" + i} x1={0} y1={i * 40} x2={VW} y2={i * 40} />
        ))}
      </g>

      {/* unselected routes (dashed grey) */}
      {paths.map((pts, i) =>
        i !== selected ? (
          <path key={"u" + i} d={d(pts)} fill="none" stroke="#97a0ab" strokeWidth="3.5" strokeDasharray="2 6" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" shapeRendering="auto" />
        ) : null
      )}
      {/* selected route (solid theme colour) + end marker */}
      {paths.map((pts, i) =>
        i === selected ? (
          <g key={"s" + i} shapeRendering="auto">
            <path d={d(pts)} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
            <path d={d(pts)} fill="none" stroke={themeColor} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x={pts[pts.length - 1][0] - 6} y={pts[pts.length - 1][1] - 6} width="12" height="12" fill="#fff" stroke={themeColor} strokeWidth="3.5" />
          </g>
        ) : null
      )}
      {/* start marker */}
      <g shapeRendering="auto">
        <circle cx={START.x} cy={START.y} r="11" fill="#fff" opacity="0.85" />
        <circle cx={START.x} cy={START.y} r="8" fill={themeColor} stroke="#fff" strokeWidth="3" />
      </g>
    </svg>
  );
}
