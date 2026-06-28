import { useEffect, useMemo, useRef, useState } from "react";
import { wgs84ToGcj02, type LatLng } from "../lib/gcj02";
import { AMAP_KEY, loadAMap } from "../lib/amap";

// Live ride map + GPS trace.
//
// Two render modes:
//  1. Real 高德 (AMap) basemap — used when VITE_AMAP_KEY is configured. The raw
//     WGS-84 track is converted to GCJ-02 before drawing so it sits on the road.
//  2. Trace canvas fallback — a dark canvas that auto-fits and draws the actual
//     GPS path shape. Used when no key is set (e.g. local preview), so the
//     feature is fully usable before the map key exists.

interface RideMapProps {
  track: LatLng[]; // raw WGS-84 points, oldest → newest
  themeColor: string;
}

// stable PRNG for the (fixed-seed) night-map texture, so it doesn't reshuffle
// every time the trace updates.
function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

export default function RideMap({ track, themeColor }: RideMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);

  const useRealMap = Boolean(AMAP_KEY) && !mapFailed;

  // GCJ-02 path for the real map ([lng, lat] pairs).
  const gcjPath = useMemo(
    () =>
      track.map((p) => {
        const g = wgs84ToGcj02(p.lat, p.lng);
        return [g.lng, g.lat] as [number, number];
      }),
    [track]
  );

  // --- Real 高德 map lifecycle ---
  useEffect(() => {
    if (!AMAP_KEY || !containerRef.current) return;
    let cancelled = false;
    loadAMap()
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        const map = new AMap.Map(containerRef.current, {
          zoom: 16,
          mapStyle: "amap://styles/dark",
          center: gcjPath.length ? gcjPath[gcjPath.length - 1] : [121.49, 31.24],
          viewMode: "2D",
        });
        mapRef.current = map;
        polylineRef.current = new AMap.Polyline({
          strokeColor: themeColor,
          strokeWeight: 5,
          strokeOpacity: 0.95,
          lineJoin: "round",
          showDir: true,
        });
        if (gcjPath.length >= 2) polylineRef.current.setPath(gcjPath);
        map.add(polylineRef.current);
        markerRef.current = new AMap.CircleMarker({
          center: gcjPath.length ? gcjPath[gcjPath.length - 1] : [121.49, 31.24],
          radius: 7,
          fillColor: "#ffffff",
          fillOpacity: 1,
          strokeColor: themeColor,
          strokeWeight: 3,
        });
        map.add(markerRef.current);
        setMapReady(true);
      })
      .catch(() => setMapFailed(true));
    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.destroy?.();
        mapRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Push new points to the real map as the ride progresses.
  useEffect(() => {
    if (!mapReady || !gcjPath.length) return;
    try {
      if (gcjPath.length >= 2) polylineRef.current?.setPath(gcjPath);
      const last = gcjPath[gcjPath.length - 1];
      markerRef.current?.setCenter(last);
      mapRef.current?.setCenter(last);
    } catch {
      /* ignore transient AMap path errors */
    }
  }, [gcjPath, mapReady]);

  // --- Trace canvas fallback projection ---
  const traceGeom = useMemo(() => {
    const W = 360;
    const H = 780;
    const pad = 60;
    if (track.length < 2) return null;
    const midLat = track[Math.floor(track.length / 2)].lat;
    const cos = Math.cos((midLat * Math.PI) / 180);
    const pts = track.map((p) => [p.lng * cos, p.lat] as [number, number]);
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const spanX = maxX - minX || 1e-6;
    const spanY = maxY - minY || 1e-6;
    const s = Math.min((W - 2 * pad) / spanX, (H - 2 * pad) / spanY);
    const offX = (W - s * spanX) / 2;
    const offY = (H - s * spanY) / 2;
    const project = ([gx, gy]: [number, number]): [number, number] => [
      offX + (gx - minX) * s,
      H - (offY + (gy - minY) * s), // flip so north is up
    ];
    const screen = pts.map(project);
    const d = screen.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
    return { d, start: screen[0], current: screen[screen.length - 1], W, H };
  }, [track]);

  // Stylized "高德 dark navigation" backdrop (fixed seed → stable during the ride).
  // This is the look you'd get with a live 高德 basemap; set VITE_AMAP_KEY and the
  // component swaps to the real AMap (above) with no other change.
  const nightMap = useMemo(() => {
    const W = 360, H = 780;
    const r = mulberry(7);
    const tiles: Array<{ x: number; y: number; fill: string }> = [];
    const pal = ["#1f2636", "#232b3d", "#1b2230", "#262e41"];
    for (let y = 0; y < H; y += 40)
      for (let x = 0; x < W; x += 40) tiles.push({ x: x + 1.5, y: y + 1.5, fill: pal[Math.floor(r() * pal.length)] });
    const parks: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (let i = 0; i < 3; i++) parks.push({ x: r() * W * 0.76, y: r() * H * 0.82, w: 54 + r() * 74, h: 46 + r() * 66 });
    let rx = W * (0.16 + r() * 0.5);
    const river: Array<[number, number]> = [];
    for (let y = -20; y <= H + 20; y += 26) { rx += (r() - 0.5) * 48; river.push([Math.max(18, Math.min(W - 18, rx)), y]); }
    // major arterials — gentle quadratic curves edge-to-edge
    const edge = (): [number, number] => { const s = Math.floor(r() * 4), u = r(); return s === 0 ? [u * W, 0] : s === 1 ? [W, u * H] : s === 2 ? [u * W, H] : [0, u * H]; };
    const majors: string[] = [];
    for (let i = 0; i < 5; i++) {
      const a = edge(), b = edge();
      const mx = (a[0] + b[0]) / 2 + (r() - 0.5) * 150, my = (a[1] + b[1]) / 2 + (r() - 0.5) * 150;
      majors.push(`M ${a[0].toFixed(0)} ${a[1].toFixed(0)} Q ${mx.toFixed(0)} ${my.toFixed(0)} ${b[0].toFixed(0)} ${b[1].toFixed(0)}`);
    }
    return { W, H, tiles, parks, river, majors };
  }, []);

  if (useRealMap) {
    // AMap forces position:relative on its container, which breaks `absolute
    // inset-0` height — give it an explicit 100% box instead.
    return (
      <div
        ref={containerRef}
        className="bg-black"
        style={{ width: "100%", height: "100%" }}
      />
    );
  }

  // Fallback: trace canvas
  return (
    <div className="absolute inset-0 bg-[#1a2030] overflow-hidden">
      {/* 高德 dark-navigation-style basemap (water · parks · road hierarchy) */}
      <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${nightMap.W} ${nightMap.H}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        <rect width={nightMap.W} height={nightMap.H} fill="#1a2030" />
        {nightMap.tiles.map((b, i) => (
          <rect key={i} x={b.x} y={b.y} width={37} height={37} fill={b.fill} />
        ))}
        {nightMap.parks.map((p, i) => (
          <rect key={"p" + i} x={p.x} y={p.y} width={p.w} height={p.h} rx={6} fill="#20392b" />
        ))}
        {/* water */}
        <polyline points={nightMap.river.map((p) => p.join(",")).join(" ")} fill="none" stroke="#163252" strokeWidth="20" strokeLinejoin="round" strokeLinecap="round" />
        {/* minor road grid */}
        <g stroke="#2b3447" strokeWidth="1.4">
          {Array.from({ length: Math.ceil(nightMap.W / 40) + 1 }).map((_, i) => (
            <line key={"v" + i} x1={i * 40} y1={0} x2={i * 40} y2={nightMap.H} />
          ))}
          {Array.from({ length: Math.ceil(nightMap.H / 40) + 1 }).map((_, i) => (
            <line key={"h" + i} x1={0} y1={i * 40} x2={nightMap.W} y2={i * 40} />
          ))}
        </g>
        {/* major arterials — dark casing + light fill */}
        <g fill="none" strokeLinecap="round" strokeLinejoin="round">
          {nightMap.majors.map((d, i) => (<path key={"mc" + i} d={d} stroke="#10141e" strokeWidth="9" />))}
          {nightMap.majors.map((d, i) => (<path key={"mf" + i} d={d} stroke="#69708a" strokeWidth="5" />))}
        </g>
      </svg>

      {traceGeom ? (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${traceGeom.W} ${traceGeom.H}`}
          preserveAspectRatio="xMidYMid slice"
        >
          {/* glow under-stroke */}
          <path d={traceGeom.d} fill="none" stroke={themeColor} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" opacity="0.22" style={{ filter: "blur(6px)" }} />
          {/* main trace */}
          <path d={traceGeom.d} fill="none" stroke={themeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${themeColor})` }} />
          {/* start */}
          <circle cx={traceGeom.start[0]} cy={traceGeom.start[1]} r="5" fill="none" stroke={themeColor} strokeWidth="1.4" opacity="0.7" />
          <circle cx={traceGeom.start[0]} cy={traceGeom.start[1]} r="2.5" fill={themeColor} />
          {/* current position */}
          <circle cx={traceGeom.current[0]} cy={traceGeom.current[1]} r="5" fill="#ffffff" style={{ filter: `drop-shadow(0 0 8px ${themeColor})` }} />
        </svg>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-8">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 10px ${themeColor}` }} />
          <div className="font-serif-cn text-[12px] tracking-[0.3em] text-white/55">轨迹将在这里展开</div>
          <div className="font-serif-cn text-[10px] tracking-[0.2em] text-white/30">定位锁定后，你的路线会实时画出</div>
        </div>
      )}
      {/* map attribution — reads like an integrated SDK; remove "· 模拟" once a real key is set */}
      <div style={{ position: "absolute", left: 8, bottom: 8, fontSize: 9, letterSpacing: 1, color: "rgba(255,255,255,0.55)", background: "rgba(0,0,0,0.32)", padding: "2px 7px", borderRadius: 3, pointerEvents: "none" }}>
        高德地图 · 模拟
      </div>
    </div>
  );
}
