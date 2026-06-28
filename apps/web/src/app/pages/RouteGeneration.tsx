import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { RefreshCw, ArrowRight, Search, MapPin, X } from "lucide-react";
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
import MockMap from "../components/MockMap";
import { wgs84ToGcj02 } from "../lib/gcj02";
import {
  ROUTE_VARIANTS,
  destPoint,
  planRoute,
  type RoutePlan,
  type LngLat,
} from "../lib/routePlanning";
import { repo, type SavedRoute } from "../lib/rideRepo";
import { emotionMeta } from "../lib/journal";
import { COLOR_PROFILES, COLOR_ORDER } from "../lib/moodColor";

// Colour theme. Each colour is anchored to a REAL city environment archetype
// (`place` + a 高德 POI keyword) so "绿 = 绿荫" stops being a private metaphor and
// becomes geography: pick a colour → head into a place that actually wears it.
// `feel` is the honest *consequence* of that place, not a decreed label.
// route-only bits per colour (the 高德 POI keyword to anchor into + distance nudge)
const ROUTE_META: Record<string, { poi: string; factor: number }> = {
  "calm-green": { poi: "公园", factor: 0.85 },
  "lonely-blue": { poi: "滨江公园", factor: 1.0 },
  "explore-yellow": { poi: "历史文化街区", factor: 1.15 },
  "release-red": { poi: "步行街", factor: 1.3 },
  "tired-gray": { poi: "地铁站", factor: 0.9 },
};

// Theme = SHARED environment data (COLOR_PROFILES: cn/en/hex/place/feel/line) +
// the route-only bits above. One source of truth, so 选色屏 / reveal / 路线页 never drift.
const THEME: Record<
  string,
  { cn: string; en: string; color: string; place: string; poi: string; feel: string; slogan: string; factor: number }
> = Object.fromEntries(
  COLOR_ORDER.map((id) => {
    const p = COLOR_PROFILES[id];
    const rm = ROUTE_META[id];
    return [id, { cn: p.cn, en: p.en, color: p.hex, place: p.place, feel: p.feel, slogan: p.line, poi: rm.poi, factor: rm.factor }];
  })
);

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

  // route controls — distance is now driven by the rider, not the mood. The
  // emotion factor only seeds the DEFAULT target (a gentle nudge, not the law).
  const [targetKm, setTargetKm] = useState(() =>
    Math.min(30, Math.max(2, Math.round(8 * (THEME[colorId]?.factor ?? 1))))
  );
  const [mode, setMode] = useState<"loop" | "outback">("loop");
  const [replanning, setReplanning] = useState(false);
  // 待出行路线 copied from 广场 — used here as quick distance presets (saved routes
  // carry a normalised shape + distance, not a geo path, so we replan a fresh route
  // of that length from the rider's current location).
  const [savedRoutes, setSavedRoutes] = useState<SavedRoute[]>([]);
  const [appliedRouteId, setAppliedRouteId] = useState<string | null>(null);
  // load 待出行路线 (planned routes copied from 广场)
  useEffect(() => { repo.listSavedRoutes().then(setSavedRoutes); }, []);

  // optional explicit destination (高德 AutoComplete)
  const [destQuery, setDestQuery] = useState("");
  const [destTips, setDestTips] = useState<Array<{ name: string; district: string; lng: number; lat: number }>>([]);
  const [customDest, setCustomDest] = useState<{ name: string; lng: number; lat: number } | null>(null);
  // 环境锚点 — nearest real POI of this colour's environment type (公园/水岸/老城…)
  const [envAnchor, setEnvAnchor] = useState<{ name: string; lng: number; lat: number } | null>(null);

  const mapElRef = useRef<HTMLDivElement>(null);
  const amapRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const acRef = useRef<any>(null);
  const firstPlanned = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null); // bottom sheet — its height is reserved when fitting the map

  const SPREAD = [0.7, 1.0, 1.3];
  const VARIANT_NAMES: Array<[string, string]> = [["近线", "近 · 舒缓"], ["标准", "中 · 适中"], ["长线", "远 · 尽兴"]];

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

  // Offline / no-key fallback: three distances around the chosen target.
  const makeSynthetic = (): RoutePlan[] =>
    SPREAD.map((s, i) => {
      const dist = +(targetKm * s).toFixed(1);
      return {
        id: i,
        name: VARIANT_NAMES[i][0],
        tag: VARIANT_NAMES[i][1],
        color: theme.color,
        path: [],
        distanceKm: dist,
        durationMin: Math.max(1, Math.round(dist * 4)),
      };
    });

  // --- 2. Plan routes: 3 suggestions around `targetKm`, or one direct route to
  // an explicit destination. `mode` decides loop (one-way) vs 折返 (round-trip).
  // Re-runs (debounced) whenever the rider changes target / mode / destination.
  useEffect(() => {
    if (!start) return;
    let cancelled = false;

    const run = async () => {
      if (!firstPlanned.current) setStatus("planning");
      else setReplanning(true);

      const finish = (rs: RoutePlan[]) => {
        if (cancelled) return;
        setRoutes(rs.length ? rs : makeSynthetic());
        setSelected(0);
        firstPlanned.current = true;
        setStatus("ready");
        setReplanning(false);
      };

      if (!AMAP_KEY) {
        finish(makeSynthetic());
        return;
      }
      try {
        const AMap = await loadAMap();
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

        // (a) explicit destination → one direct route there (mode applies)
        if (customDest) {
          const r = await planRoute(AMap, start, customDest);
          if (cancelled) return;
          if (r) {
            const total = mode === "outback" ? +(r.distanceKm * 2).toFixed(1) : +r.distanceKm.toFixed(1);
            finish([{
              id: 0,
              name: customDest.name,
              tag: mode === "outback" ? "折返 · 往返" : "直达 · 单程",
              color: theme.color,
              path: r.path,
              distanceKm: total,
              durationMin: mode === "outback" ? r.durationMin * 2 : r.durationMin,
            }]);
          } else {
            finish(makeSynthetic());
          }
          return;
        }

        // (b) three suggestions toward REAL nearby places, so every route follows
        // real roads (never cuts across water / unreachable land). We pull POIs of
        // this colour's environment type around the rider and pick three at
        // near/mid/far distances; 骑行规划 then snaps the path to the road network.
        // If no POI is found we fall back to bearing+distance points.
        const jitter = (regenKey * 47) % 60;
        let dests: Array<LngLat | null> = [null, null, null];
        try {
          await loadPlugin(AMap, "AMap.PlaceSearch");
          if (cancelled) return;
          const radius = Math.min(50000, Math.max(1500, Math.round(targetKm * 850)));
          const pois: any[] = await new Promise((res) => {
            const ps = new AMap.PlaceSearch({ pageSize: 25, pageIndex: 1 });
            ps.searchNearBy(theme.poi, [start.lng, start.lat], radius, (st: string, result: any) => {
              res((st === "complete" && result?.poiList?.pois) || []);
            });
          });
          const cand = pois
            .filter((p) => p.location)
            .map((p) => ({ lng: p.location.lng, lat: p.location.lat, d: p.distance ?? 0 }))
            .sort((a, b) => a.d - b.d);
          if (cand.length) {
            // pick the POI whose straight-line distance is closest to a target (so
            // routes track 目标里程 instead of shooting to whatever park is farthest)
            const pick = (targetM: number): LngLat => {
              let best = cand[0];
              for (const c of cand) if (Math.abs(c.d - targetM) < Math.abs(best.d - targetM)) best = c;
              return { lng: best.lng, lat: best.lat };
            };
            const km = targetKm * 1000;
            const j = 1 + (regenKey % 3) * 0.12; // 换一批 nudges the targets
            dests = [pick(km * 0.3 * j), pick(km * 0.55 * j), pick(km * 0.85 * j)];
          }
        } catch {
          /* no POIs → bearing fallback below */
        }
        if (cancelled) return;

        const results = await Promise.all(
          SPREAD.map(async (s, i) => {
            const oneWay = (targetKm * s) / (mode === "outback" ? 2 : 1);
            const dest = dests[i] || destPoint(start.lat, start.lng, ROUTE_VARIANTS[i].bearing + jitter, oneWay);
            const r = await planRoute(AMap, start, dest);
            if (!r) return null;
            const total = mode === "outback" ? +(r.distanceKm * 2).toFixed(1) : +r.distanceKm.toFixed(1);
            return {
              id: i,
              name: VARIANT_NAMES[i][0],
              tag: VARIANT_NAMES[i][1],
              color: theme.color,
              path: r.path,
              distanceKm: total,
              durationMin: mode === "outback" ? r.durationMin * 2 : r.durationMin,
            } as RoutePlan;
          })
        );
        if (cancelled) return;
        finish(results.filter(Boolean) as RoutePlan[]);
      } catch {
        finish(makeSynthetic());
      }
    };

    // Debounce control-driven replans (slider drag) so we don't spam the service.
    const t = setTimeout(run, firstPlanned.current ? 320 : 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, regenKey, targetKm, mode, customDest]);

  // --- 2b. Destination autocomplete (debounced) ---
  useEffect(() => {
    if (!AMAP_KEY || customDest) return;
    const q = destQuery.trim();
    if (q.length < 2) {
      setDestTips([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const AMap = amapRef.current || (await loadAMap());
        amapRef.current = AMap;
        if (!acRef.current) {
          await loadPlugin(AMap, "AMap.AutoComplete");
          acRef.current = new AMap.AutoComplete({});
        }
        acRef.current.search(q, (st: string, result: any) => {
          if (cancelled) return;
          const tips = st === "complete" && result?.tips
            ? result.tips
                .filter((tp: any) => tp.location)
                .slice(0, 6)
                .map((tp: any) => ({ name: tp.name, district: tp.district || "", lng: tp.location.lng, lat: tp.location.lat }))
            : [];
          setDestTips(tips);
        });
      } catch {
        /* ignore */
      }
    }, 320);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destQuery, customDest]);

  // --- 2c. Environment anchor: find the nearest POI of this colour's place type
  // (公园 for 绿, 滨水 for 蓝, 老城 for 黄…) so the colour can route into a place
  // that REALLY wears it. One-tap turns it into the destination.
  useEffect(() => {
    setEnvAnchor(null);
    if (!AMAP_KEY || !start || customDest) return;
    let cancelled = false;
    (async () => {
      try {
        const AMap = amapRef.current || (await loadAMap());
        amapRef.current = AMap;
        await loadPlugin(AMap, "AMap.PlaceSearch");
        const ps = new AMap.PlaceSearch({ pageSize: 1, pageIndex: 1 });
        ps.searchNearBy(theme.poi, [start.lng, start.lat], 5000, (st: string, result: any) => {
          if (cancelled) return;
          const p = st === "complete" && result?.poiList?.pois?.[0];
          if (p?.location) setEnvAnchor({ name: p.name, lng: p.location.lng, lat: p.location.lat });
        });
      } catch {
        /* ignore — anchor stays null, copy still shows the framing */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, colorId, customDest]);

  // --- 3. Draw / restyle routes on the map when routes or selection change ---
  useEffect(() => {
    if (status !== "ready" || !AMAP_KEY) return;
    const AMap = amapRef.current;
    const map = mapRef.current;
    if (!AMap || !map) return;

    overlaysRef.current.forEach((o) => map.remove(o));
    overlaysRef.current = [];
    if (!routes.length || !routes.some((r) => r.path.length)) return;

    // Only fit the *selected* route + start marker — packing all 3 fan-out
    // routes shrinks zoom to city-wide ("能看到整个上海").
    const fitTargets: any[] = [];
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
      if (sel) fitTargets.push(pl, em);
    });

    let startMk: any = null;
    if (start) {
      startMk = new AMap.CircleMarker({
        center: [start.lng, start.lat],
        radius: 7,
        fillColor: theme.color,
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 2,
        zIndex: 200,
      });
      map.add(startMk);
      overlaysRef.current.push(startMk);
      fitTargets.push(startMk);
    }

    try {
      // Fit the SELECTED route (+ start) into the visible map area — not all three,
      // whose far ends would zoom the map out until each route is a few pixels.
      const padBottom = (panelRef.current?.offsetHeight ?? 340) + 24;
      // immediate=true so getZoom() reads the final value; false animates and
      // the clamp would catch the *animation start*, not the destination.
      map.setFitView(fitTargets.length ? fitTargets : overlaysRef.current, true, [80, 40, padBottom, 40]);
      const z = map.getZoom();
      if (z < 13) map.setZoom(13);
      else if (z > 17) map.setZoom(17);
    } catch {
      /* ignore */
    }
  }, [status, routes, selected, theme.color, customDest, targetKm, mode]);

  const handleConfirm = () => {
    if (navigator.vibrate) navigator.vibrate([20, 30, 40]);
    const r = routes[selected];
    navigate("/ride-enhanced", {
      state: { colorId, moodText, plannedDistanceKm: r?.distanceKm },
    });
  };

  // apply a 待出行 route as a preset: clear any fixed destination and set the
  // target distance to that route's — the planning effect replans automatically.
  const applySaved = (r: SavedRoute) => {
    setCustomDest(null);
    setDestQuery("");
    setTargetKm(Math.min(30, Math.max(2, Math.round(r.distanceKm))));
    setAppliedRouteId(r.id);
  };

  const handleRegenerate = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    setRegenKey((k) => k + 1);
  };

  const planning = status !== "ready";
  const accent = CTA_COLORS[emotionToCtaColor(colorId)];

  return (
    <div className="size-full overflow-hidden relative" style={{ fontFamily: PIXEL_FONT, background: AMAP_KEY ? "#070810" : "#ece5d4" }}>
      {/* Map backdrop — real 高德 map when keyed, otherwise a stylized in-app map */}
      <div className="absolute inset-0">
        {AMAP_KEY ? (
          <>
            <div ref={mapElRef} style={{ width: "100%", height: "100%" }} className="bg-black" />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 90% 50% at 50% 30%, transparent 30%, rgba(0,0,0,0.5) 100%), linear-gradient(to bottom, rgba(0,0,0,0.4), transparent 25%, transparent 45%, rgba(7,8,16,0.6) 92%)",
              }}
            />
          </>
        ) : (
          <>
            <MockMap themeColor={theme.color} routes={routes} selected={selected} seed={regenKey * 1000 + targetKm} />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(to bottom, rgba(244,239,227,0.18) 0%, rgba(244,239,227,0) 22%, rgba(244,239,227,0) 52%, rgba(244,239,227,0.7) 84%, rgba(244,239,227,0.95) 100%)" }}
            />
          </>
        )}
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
          <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 3, color: INK }}>路线推荐</span>
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
          ref={panelRef}
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
          {/* 环境锚点 — colour = a real city place type, not a private metaphor */}
          <div style={{ background: accent.tint, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + accent.fill, padding: "12px 14px", marginBottom: 12 }}>
            <div className="flex items-center" style={{ gap: 8, marginBottom: 6 }}>
              <span style={{ flex: "none", width: 12, height: 12, background: theme.color, clipPath: STAIR, boxShadow: "inset 0 0 0 1.5px " + PIXEL_OUT }} />
              <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>{theme.place}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, letterSpacing: 1, color: accent.ink, background: "#fffdf7", clipPath: STAIR, padding: "3px 8px" }}>{theme.feel}</span>
            </div>
            <div style={{ fontSize: 12, color: INK_SOFT, lineHeight: 1.6 }}>{theme.slogan}</div>
            {!customDest && (
              envAnchor ? (
                <button
                  onClick={() => { setCustomDest(envAnchor); setDestQuery(envAnchor.name); setAppliedRouteId(null); }}
                  style={{ marginTop: 10, width: "100%", height: 40, cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 13, fontWeight: 800, letterSpacing: 1, clipPath: STAIR, background: accent.fill, color: accent.text }}
                >
                  去最近的{theme.place} · {envAnchor.name}
                </button>
              ) : (
                <div style={{ marginTop: 8, fontSize: 11, color: INK_FAINT }}>
                  {AMAP_KEY ? `正在城市里找最近的${theme.place}…` : `开启定位与地图后，可一键导向最近的${theme.place}`}
                </div>
              )
            )}
          </div>
          <div style={{ textAlign: "center", fontSize: 11, letterSpacing: 1, color: INK_FAINT, marginBottom: 14 }}>
            {usedRealLocation ? "基于你周边的真实路网" : "示例位置 · 周边路网"}
            {replanning ? " · 更新中…" : customDest ? " · 已锁定目的地" : " · 选一条出发"}
          </div>

          {/* Controls — destination search + target distance + loop/折返 */}
          <div style={{ marginBottom: 14, display: "flex", flexDirection: "column", gap: 10 }}>
            {/* destination */}
            <div style={{ position: "relative" }}>
              {customDest ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + accent.fill, padding: "9px 12px" }}>
                  <MapPin size={14} style={{ color: accent.fill, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{customDest.name}</span>
                  <button onClick={() => { setCustomDest(null); setDestQuery(""); setDestTips([]); }} style={{ background: "none", border: "none", cursor: "pointer", color: INK_FAINT, display: "grid", placeItems: "center" }}><X size={16} /></button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px #cbbd99", padding: "9px 12px" }}>
                  <Search size={14} style={{ color: INK_FAINT, flexShrink: 0 }} />
                  <input
                    value={destQuery}
                    onChange={(e) => setDestQuery(e.target.value)}
                    placeholder={AMAP_KEY ? "搜目的地（可选）" : "配置地图 Key 后可搜目的地"}
                    disabled={!AMAP_KEY}
                    style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontFamily: PIXEL_FONT, fontSize: 13, color: INK }}
                  />
                </div>
              )}
              {!customDest && destTips.length > 0 && (
                <div style={{ position: "absolute", left: 0, right: 0, bottom: "calc(100% + 6px)", background: PAPER, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, maxHeight: 168, overflowY: "auto", zIndex: 6 }}>
                  {destTips.map((tip, i) => (
                    <button key={i} onClick={() => { setCustomDest(tip); setDestTips([]); setDestQuery(tip.name); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 12px", border: "none", background: "transparent", cursor: "pointer", fontFamily: PIXEL_FONT, boxShadow: i ? "inset 0 1px 0 0 rgba(58,40,23,0.10)" : "none" }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: INK, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tip.name}</div>
                      {tip.district && <div style={{ fontSize: 11, color: INK_FAINT, marginTop: 2 }}>{tip.district}</div>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* target distance (a destination fixes the distance, so hide it then) */}
            {!customDest && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: INK_SOFT }}>目标里程</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: accent.ink }}>{targetKm} km</span>
                </div>
                <input type="range" min={2} max={30} step={1} value={targetKm} onChange={(e) => setTargetKm(+e.target.value)} style={{ width: "100%", accentColor: accent.fill }} />
              </div>
            )}

            {/* loop vs 折返 */}
            <div style={{ display: "flex", gap: 8 }}>
              {(["loop", "outback"] as const).map((m) => {
                const on = mode === m;
                return (
                  <button key={m} onClick={() => setMode(m)} style={{ flex: 1, padding: "8px 0", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 13, fontWeight: on ? 800 : 600, clipPath: STAIR, background: on ? accent.fill : "#fffdf7", color: on ? accent.text : INK_SOFT, boxShadow: on ? "none" : "inset 0 0 0 2px #cbbd99" }}>
                    {m === "loop" ? "环线" : "折返"}
                  </button>
                );
              })}
            </div>

            {/* 待出行路线 — quick presets copied from 广场 */}
            {savedRoutes.length > 0 && (
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: INK_SOFT, marginBottom: 6 }}>待出行路线 · 套用距离出发</div>
                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                  {savedRoutes.map((r) => {
                    const meta = emotionMeta(r.colorId);
                    const on = appliedRouteId === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => applySaved(r)}
                        style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, padding: "8px 11px", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, clipPath: STAIR, background: on ? accent.fill : "#fffdf7", color: on ? accent.text : INK_SOFT, boxShadow: on ? "none" : "inset 0 0 0 2px #cbbd99" }}
                      >
                        <span style={{ flex: "none", width: 9, height: 9, background: meta.color, clipPath: STAIR }} />
                        <span style={{ fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" }}>{r.city.split(" · ").pop()} · {r.distanceKm}km</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Route cards */}
          <div style={{ display: "grid", gridTemplateColumns: routes.length === 1 ? "1fr" : "repeat(3, 1fr)", gap: 10, marginBottom: 18 }}>
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
