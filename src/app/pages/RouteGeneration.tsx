import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { RefreshCw, ArrowRight } from "lucide-react";
import {
  PIXEL_FONT,
  PIXEL_OUT,
  PAPER,
  INK,
  INK_SOFT,
  INK_FAINT,
  STAIR,
  TOP_STAIR,
  CTA_COLORS,
  emotionToCtaColor,
  PixelButton,
  PixelBack,
} from "../components/pixelKit";
import { AMAP_KEY, loadAMap, loadPlugin } from "../lib/amap";
import { wgs84ToGcj02 } from "../lib/gcj02";
import {
  ROUTE_VARIANTS,
  destPoint,
  planRoute,
  type RoutePlan,
  type LngLat,
} from "../lib/routePlanning";

// Emotion theme — color, copy and how far this mood wants to ride.
const THEME: Record<
  string,
  { cn: string; en: string; color: string; slogan: string; factor: number }
> = {
  "calm-green": { cn: "暗绿", en: "MOSS", color: "#34E89E", slogan: "顺应风向，把心跳交还给潮汐。", factor: 0.85 },
  "lonely-blue": { cn: "深蓝", en: "DEPTH", color: "#4FA8FF", slogan: "潜入暗流，把喧嚣沉降于底面。", factor: 1.0 },
  "explore-yellow": { cn: "赭黄", en: "TRACE", color: "#FFB54A", slogan: "从容探索街区肌理，收集长长的回声。", factor: 1.15 },
  "release-red": { cn: "余火", en: "EMBER", color: "#FF3344", slogan: "撕开风阻，让不安在直道上彻底燃尽。", factor: 1.3 },
  "tired-gray": { cn: "灰白", en: "VOID", color: "#C9D2D8", slogan: "隐入网格，做一阵没有轨迹的风。", factor: 0.9 },
};

// Fallback start when there's no location fix (preview / denied): Shanghai Bund.
const DEFAULT_START: LngLat = { lat: 31.2389, lng: 121.4999 };

type Status = "locating" | "planning" | "ready";

export default function RouteGeneration() {
  const location = useLocation();
  const navigate = useNavigate();
  const colorId = location.state?.colorId || "tired-gray";
  const moodText: string | undefined = location.state?.moodText;
  const theme = THEME[colorId] || THEME["tired-gray"];

  const [start, setStart] = useState<LngLat | null>(null);
  const [usedRealLocation, setUsedRealLocation] = useState(false);
  const [routes, setRoutes] = useState<RoutePlan[]>([]);
  const [selected, setSelected] = useState(0);
  const [status, setStatus] = useState<Status>("locating");
  const [regenKey, setRegenKey] = useState(0);

  const mapElRef = useRef<HTMLDivElement>(null);
  const amapRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);

  // --- 1. Resolve a start location (real GPS → GCJ-02, else default) ---
  useEffect(() => {
    let done = false;
    const fallback = setTimeout(() => {
      if (!done) {
        done = true;
        setStart(DEFAULT_START);
      }
    }, 3500);
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (done) return;
          done = true;
          clearTimeout(fallback);
          setUsedRealLocation(true);
          setStart(wgs84ToGcj02(pos.coords.latitude, pos.coords.longitude));
        },
        () => {
          if (done) return;
          done = true;
          clearTimeout(fallback);
          setStart(DEFAULT_START);
        },
        { enableHighAccuracy: true, timeout: 3000, maximumAge: 10000 }
      );
    } else {
      done = true;
      clearTimeout(fallback);
      setStart(DEFAULT_START);
    }
    return () => clearTimeout(fallback);
  }, []);

  const makeSynthetic = (): RoutePlan[] =>
    ROUTE_VARIANTS.map((v) => {
      const dist = +(v.distKm * theme.factor * 1.4).toFixed(1);
      return {
        id: v.id,
        name: v.name,
        tag: v.tag,
        color: theme.color,
        path: [],
        distanceKm: dist,
        durationMin: Math.max(1, Math.round(dist * 4)),
      };
    });

  // --- 2. Plan three routes around the start ---
  useEffect(() => {
    if (!start) return;
    if (!AMAP_KEY) {
      setRoutes(makeSynthetic());
      setSelected(0);
      setStatus("ready");
      return;
    }
    let cancelled = false;
    setStatus("planning");
    loadAMap()
      .then(async (AMap) => {
        amapRef.current = AMap;
        await loadPlugin(AMap, "AMap.Riding");
        if (cancelled) return;
        if (!mapRef.current && mapElRef.current) {
          mapRef.current = new AMap.Map(mapElRef.current, {
            zoom: 14,
            mapStyle: "amap://styles/dark",
            center: [start.lng, start.lat],
            viewMode: "2D",
          });
        }
        const jitter = (regenKey * 47) % 60; // shift bearings on regenerate
        const variants = ROUTE_VARIANTS.map((v) => ({
          ...v,
          bearing: v.bearing + jitter,
          distKm: v.distKm * theme.factor,
        }));
        const results = await Promise.all(
          variants.map(async (v) => {
            const dest = destPoint(start.lat, start.lng, v.bearing, v.distKm);
            const r = await planRoute(AMap, start, dest);
            if (!r) return null;
            return {
              id: v.id,
              name: v.name,
              tag: v.tag,
              color: theme.color,
              path: r.path,
              distanceKm: +r.distanceKm.toFixed(1),
              durationMin: r.durationMin,
            } as RoutePlan;
          })
        );
        if (cancelled) return;
        const ok = results.filter(Boolean) as RoutePlan[];
        setRoutes(ok.length ? ok : makeSynthetic());
        setSelected(0);
        setStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setRoutes(makeSynthetic());
        setSelected(0);
        setStatus("ready");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, regenKey]);

  // --- 3. Draw / restyle routes on the map when routes or selection change ---
  useEffect(() => {
    if (status !== "ready" || !AMAP_KEY) return;
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    overlaysRef.current.forEach((o) => map.remove(o));
    overlaysRef.current = [];
    if (!routes.length || !routes.some((r) => r.path.length)) return;

    routes.forEach((r, idx) => {
      if (!r.path.length) return;
      const sel = idx === selected;
      const pl = new AMap.Polyline({
        path: r.path,
        strokeColor: sel ? theme.color : "#8b94a3",
        strokeWeight: sel ? 6 : 3,
        strokeOpacity: sel ? 0.95 : 0.45,
        lineJoin: "round",
        lineCap: "round",
        zIndex: sel ? 100 : 50,
        ...(sel ? {} : { strokeStyle: "dashed" }),
      });
      map.add(pl);
      overlaysRef.current.push(pl);
      const end = r.path[r.path.length - 1];
      const em = new AMap.CircleMarker({
        center: end,
        radius: sel ? 6 : 4,
        fillColor: sel ? "#ffffff" : "#8b94a3",
        fillOpacity: 1,
        strokeColor: sel ? theme.color : "#8b94a3",
        strokeWeight: 2,
        zIndex: sel ? 101 : 51,
      });
      map.add(em);
      overlaysRef.current.push(em);
    });

    if (start) {
      const sm = new AMap.CircleMarker({
        center: [start.lng, start.lat],
        radius: 7,
        fillColor: theme.color,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        zIndex: 200,
      });
      map.add(sm);
      overlaysRef.current.push(sm);
    }

    try {
      map.setFitView(overlaysRef.current, false, [70, 40, 320, 40]);
    } catch {
      /* ignore */
    }
  }, [status, routes, selected, theme.color]);

  const handleConfirm = () => {
    if (navigator.vibrate) navigator.vibrate([20, 30, 40]);
    const r = routes[selected];
    navigate("/ride-enhanced", {
      state: { colorId, moodText, plannedDistanceKm: r?.distanceKm },
    });
  };

  const handleRegenerate = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    setRegenKey((k) => k + 1);
  };

  const planning = status !== "ready";
  const accent = CTA_COLORS[emotionToCtaColor(colorId)];

  return (
    <div className="size-full overflow-hidden relative" style={{ fontFamily: PIXEL_FONT, background: "#070810" }}>
      {/* Live map / grid backdrop (kept — real route planning) */}
      <div className="absolute inset-0">
        {AMAP_KEY ? (
          <div ref={mapElRef} style={{ width: "100%", height: "100%" }} className="bg-black" />
        ) : (
          <div className="absolute inset-0 bg-[#0a0c10]">
            <svg className="absolute inset-0 w-full h-full opacity-[0.12]" aria-hidden>
              <defs>
                <pattern id="rg-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke={theme.color} strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#rg-grid)" />
            </svg>
          </div>
        )}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 50% at 50% 30%, transparent 30%, rgba(0,0,0,0.5) 100%), linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 25%, transparent 45%, rgba(7,8,16,0.6) 92%)",
          }}
        />
      </div>

      {/* Top bar — pixel back + paper title pill */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-4">
        <PixelBack onClick={() => navigate(-1)} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: PAPER,
            clipPath: STAIR,
            boxShadow: "inset 0 0 0 2px " + PIXEL_OUT,
            padding: "7px 14px",
          }}
        >
          <span style={{ width: 9, height: 9, background: accent.fill, clipPath: STAIR }} />
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: INK }}>路线推荐 · {theme.cn}</span>
        </div>
        <div style={{ width: 40 }} />
      </div>

      {/* Planning overlay */}
      {planning && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center" style={{ gap: 18, background: "rgba(20,16,8,0.42)" }}>
          <div className="pixel-spin" style={{ width: 50, height: 50, background: PAPER, clipPath: TOP_STAIR, boxShadow: "inset 0 0 0 3px " + accent.fill }} />
          <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 3, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
            {status === "locating" ? "正在定位…" : "正在规划周边路线…"}
          </div>
        </div>
      )}

      {/* Bottom paper panel: slogan + 3 route cards + actions */}
      {status === "ready" && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-20"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            background: PAPER,
            clipPath: TOP_STAIR,
            boxShadow: "inset 0 4px 0 0 " + PIXEL_OUT,
            padding: "22px 22px calc(env(safe-area-inset-bottom, 0px) + 22px)",
          }}
        >
          <div style={{ textAlign: "center", fontSize: 13, fontWeight: 600, letterSpacing: 2, color: INK, marginBottom: 4 }}>{theme.slogan}</div>
          <div style={{ textAlign: "center", fontSize: 11, letterSpacing: 1, color: INK_FAINT, marginBottom: 16 }}>
            {usedRealLocation ? "基于你周边的真实路网" : "示例位置 · 周边路网"} · 选一条出发
          </div>

          {/* Route cards */}
          <div className="grid grid-cols-3" style={{ gap: 10, marginBottom: 18 }}>
            {routes.map((r, idx) => {
              const sel = idx === selected;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelected(idx);
                    if (navigator.vibrate) navigator.vibrate(12);
                  }}
                  style={{
                    position: "relative",
                    textAlign: "left",
                    padding: "11px 11px 12px",
                    cursor: "pointer",
                    border: "none",
                    background: sel ? accent.tint : "#fffdf7",
                    clipPath: STAIR,
                    boxShadow: "inset 0 0 0 2px " + (sel ? accent.fill : "#cbbd99"),
                    fontFamily: PIXEL_FONT,
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: 1, color: INK }}>{r.name}</div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 3, marginTop: 7 }}>
                    <span style={{ fontSize: 26, lineHeight: 1, fontWeight: 800, color: sel ? accent.ink : INK }}>{r.distanceKm}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: accent.fill }}>km</span>
                  </div>
                  <div style={{ marginTop: 5, fontSize: 11, color: INK_SOFT }}>{r.durationMin} 分钟</div>
                  <div style={{ marginTop: 5, fontSize: 10, fontWeight: 600, letterSpacing: 1, color: sel ? accent.ink : INK_FAINT }}>{r.tag}</div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: 12 }}>
            <PixelButton onClick={handleRegenerate} fill="#f6efdf" text={INK} height={54} fontSize={15} fontWeight={700} letter={2} style={{ width: 118 }}>
              <RefreshCw size={15} />
              换一批
            </PixelButton>
            <PixelButton onClick={handleConfirm} flex={1} fill={accent.fill} text={accent.text} height={54} fontSize={18} fontWeight={800} letter={5}>
              出发
              <ArrowRight size={18} />
            </PixelButton>
          </div>
        </motion.div>
      )}
    </div>
  );
}
