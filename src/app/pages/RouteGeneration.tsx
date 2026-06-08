import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ChevronLeft, RefreshCw, ArrowRight } from "lucide-react";
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

  return (
    <div className="size-full overflow-hidden relative bg-[#070810] text-white">
      {/* Map / backdrop */}
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
        {/* Vignette */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 50% at 50% 30%, transparent 30%, rgba(0,0,0,0.5) 100%), linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 25%, transparent 45%, rgba(7,8,16,0.95) 92%)",
          }}
        />
      </div>

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center text-white/70 active:scale-90 transition-transform"
          aria-label="返回"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2">
          <span className="w-1 h-1 rounded-full" style={{ backgroundColor: theme.color, boxShadow: `0 0 6px ${theme.color}` }} />
          <span className="font-serif-cn text-[12px] tracking-[0.35em] text-white/85" style={{ fontWeight: 500 }}>
            路线推荐
          </span>
        </div>
        <div className="text-[10px] tracking-[0.25em]" style={{ color: `${theme.color}cc`, textShadow: `0 0 10px ${theme.color}66` }}>
          {theme.cn} / {theme.en}
        </div>
      </div>

      {/* Planning overlay */}
      <AnimatePresence>
        {planning && (
          <motion.div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-12 h-12 rounded-full border border-white/15"
              style={{ borderTopColor: theme.color }}
              animate={{ rotate: 360 }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />
            <div className="font-serif-cn text-[12px] tracking-[0.3em] text-white/70">
              {status === "locating" ? "正在定位…" : "正在规划周边路线…"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom sheet: slogan + 3 route cards + actions */}
      {status === "ready" && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 z-20 px-5 pb-7"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="font-serif-cn text-center text-[11px] tracking-[0.3em] text-white/55 mb-1">
            {theme.slogan}
          </div>
          <div className="text-center text-[10px] tracking-[0.2em] text-white/30 mb-4">
            {usedRealLocation ? "基于你周边的真实路网" : "示例位置 · 周边路网"} · 选一条出发
          </div>

          {/* Route cards */}
          <div className="grid grid-cols-3 gap-2.5 mb-5">
            {routes.map((r, idx) => {
              const sel = idx === selected;
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setSelected(idx);
                    if (navigator.vibrate) navigator.vibrate(12);
                  }}
                  className="relative rounded-2xl px-2.5 py-3 text-left transition-all active:scale-[0.97]"
                  style={{
                    border: `1px solid ${sel ? theme.color : "rgba(255,255,255,0.12)"}`,
                    backgroundColor: sel ? `${theme.color}1f` : "rgba(255,255,255,0.04)",
                    boxShadow: sel ? `0 0 22px ${theme.color}44` : "none",
                  }}
                >
                  <div className="font-serif-cn text-[11px] tracking-[0.15em] text-white/85" style={{ fontWeight: 500 }}>
                    {r.name}
                  </div>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-[24px] leading-none tabular-nums font-light" style={{ color: sel ? "#fff" : "rgba(255,255,255,0.8)" }}>
                      {r.distanceKm}
                    </span>
                    <span className="text-[10px]" style={{ color: `${theme.color}cc` }}>km</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] tabular-nums text-white/55">
                    <span>{r.durationMin}分钟</span>
                  </div>
                  <div className="font-serif-cn text-[9px] tracking-[0.15em] mt-1.5" style={{ color: sel ? `${theme.color}dd` : "rgba(255,255,255,0.4)" }}>
                    {r.tag}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleRegenerate}
              className="px-5 h-14 rounded-2xl flex items-center justify-center gap-2 border border-white/15 text-white/80 active:scale-95 transition-transform"
            >
              <RefreshCw size={15} />
              <span className="font-serif-cn text-[12px] tracking-[0.25em]">换一批</span>
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 h-14 rounded-2xl flex items-center justify-center gap-2 text-black active:scale-[0.98] transition-transform"
              style={{ backgroundColor: theme.color, boxShadow: `0 0 28px ${theme.color}55` }}
            >
              <span className="font-serif-cn text-[14px] tracking-[0.3em]" style={{ fontWeight: 600 }}>
                出发
              </span>
              <ArrowRight size={18} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
