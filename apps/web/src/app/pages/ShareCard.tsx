import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { MapPin, LocateFixed, Route, ExternalLink } from "lucide-react";
import { PIXEL_FONT, PIXEL_OUT, PAPER, INK, INK_SOFT, INK_FAINT, STAIR, CTA_COLORS, emotionToCtaColor, PixelButton, PixelField, PixelBack } from "../components/pixelKit";
import { repo, type RideRecord } from "../lib/rideRepo";
import { emotionMeta } from "../lib/journal";
import { renderShareCard } from "../lib/shareCard";
import { exportRideGPX, STRAVA_UPLOAD_URL } from "../lib/gpx";
import { AMAP_KEY, loadAMap, loadPlugin } from "../lib/amap";
import { wgs84ToGcj02 } from "../lib/gcj02";

// quick-pick cities for the capsule selector
const PRESET_CITIES = [
  "上海 · 北外滩",
  "上海 · 外滩",
  "杭州 · 西湖",
  "成都 · 锦江",
  "广州 · 珠江",
  "北京 · 朝阳",
  "深圳 · 湾区",
  "南京 · 玄武湖",
  "武汉 · 东湖",
  "西安 · 城墙",
];

// Compose a shareable poster from a ride: pick which photos to feature, write a
// share line, tweak the city tag — the canvas re-renders live. Then save/share
// the image or publish it to 广场.
// Entry: navigate("/share", { state: { rideId } }) — falls back to latest / state.

const MAX_PHOTOS = 3;

// our five theme (emotion) colours, for the celebration confetti
const CONFETTI_COLORS = ["#34E89E", "#4FA8FF", "#FFB54A", "#FF3344", "#C9D2D8"];

// little bead-pixel confetti bursting out from behind the card
function Confetti() {
  const bits = useMemo(
    () =>
      Array.from({ length: 52 }, (_, i) => {
        const ang = Math.random() * Math.PI * 2;
        const dist = 70 + Math.random() * 230;
        return {
          i,
          color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
          size: 8 + Math.random() * 11,
          dx: Math.cos(ang) * dist,
          dy: Math.sin(ang) * dist - 60,
          fall: 240 + Math.random() * 300,
          rot: (Math.random() * 2 - 1) * 600,
          dur: 1.3 + Math.random() * 0.9,
          delay: Math.random() * 0.18,
        };
      }),
    []
  );
  return (
    <div style={{ position: "absolute", left: "50%", top: "46%", pointerEvents: "none", zIndex: 1 }}>
      {bits.map((b) => (
        <motion.div
          key={b.i}
          style={{ position: "absolute", width: b.size, height: b.size, background: b.color, boxShadow: "inset 2px 2px 0 0 rgba(255,255,255,0.4), inset -1px -1px 0 0 rgba(0,0,0,0.18)" }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0.4, rotate: 0 }}
          animate={{ x: b.dx, y: [b.dy, b.dy + b.fall], opacity: [0, 1, 1, 0], scale: 1, rotate: b.rot }}
          transition={{ duration: b.dur, delay: b.delay, ease: "easeOut", opacity: { duration: b.dur, delay: b.delay, times: [0, 0.12, 0.65, 1] } }}
        />
      ))}
    </div>
  );
}

export default function ShareCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const rideId: string | undefined = location.state?.rideId;

  const [ride, setRide] = useState<RideRecord | null>(null);
  const [city, setCity] = useState("上海 · 北外滩");
  const [caption, setCaption] = useState("");
  const [selected, setSelected] = useState<number[]>([]); // photo indices, in pick order
  const [cityModal, setCityModal] = useState(false);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [published, setPublished] = useState(false);
  const [gpxMsg, setGpxMsg] = useState<string | null>(null);

  // 省/市/区 cascade (fetched on demand from 高德 DistrictSearch)
  const [provinces, setProvinces] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [selP, setSelP] = useState("");
  const [selC, setSelC] = useState("");
  const [selD, setSelD] = useState("");
  const [openLevel, setOpenLevel] = useState<"p" | "c" | "d" | null>("p"); // which wheel is expanded
  const dsRef = useRef<any>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  // when a wheel opens, scroll the current pick to the vertical centre so items
  // sit both above and below it (a real wheel, not a top-down list)
  useEffect(() => {
    const el = wheelRef.current;
    if (!el) return;
    const sel = el.querySelector('[data-sel="1"]') as HTMLElement | null;
    el.scrollTop = sel ? sel.offsetTop - el.clientHeight / 2 + sel.clientHeight / 2 : 0;
  }, [openLevel, provinces, cities, districts]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      let r = rideId ? await repo.getRide(rideId) : null;
      // If we know the intended colour (passed from Review/Journal), trust it
      // BEFORE falling back to "the newest ride in the journal" — otherwise a
      // freshly-finished yellow ride could be shadowed by an older grey one and
      // the card would silently switch to VOID.
      if (!r && location.state?.colorId) {
        const cid: string = location.state.colorId;
        r = {
          id: rideId || `${Date.now()}`,
          colorId: cid,
          startedAt: location.state.startedAt || Date.now(),
          endedAt: Date.now(),
          distance: location.state.distance || 0,
          duration: location.state.duration || 0,
          moodText: location.state.moodText,
          photos: [],
          dominantColor: emotionMeta(cid).color,
        };
      }
      if (!r) r = (await repo.listRides())[0] || null;
      setRide(r);
      setCaption((r?.moodText || "").slice(0, 22));
      setSelected(r ? r.photos.slice(0, MAX_PHOTOS).map((_, i) => i) : []);
    })();
  }, [rideId, location.state]);

  const accent = ride ? CTA_COLORS[emotionToCtaColor(ride.colorId as any)] : CTA_COLORS.yellow;

  // photos chosen for the poster, in pick order
  const chosenPhotos = useMemo(
    () => (ride ? selected.map((i) => ride.photos[i]).filter(Boolean) : []),
    [ride, selected]
  );

  // live re-render whenever the ride, photo selection or caption changes
  useEffect(() => {
    if (ride && canvasRef.current) {
      renderShareCard(canvasRef.current, ride, { photos: chosenPhotos, caption }).catch(() => {});
    }
  }, [ride, chosenPhotos, caption]);

  // auto-match the current city via GPS + 高德 reverse geocoding (like a maps app)
  const detectCity = () => {
    if (locating) return;
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const gcj = wgs84ToGcj02(pos.coords.latitude, pos.coords.longitude);
          if (!AMAP_KEY) {
            setCity(`${gcj.lat.toFixed(3)}, ${gcj.lng.toFixed(3)}`);
            return;
          }
          const AMap = await loadAMap();
          await loadPlugin(AMap, "AMap.Geocoder");
          const geocoder = new AMap.Geocoder({});
          geocoder.getAddress([gcj.lng, gcj.lat], (status: string, result: any) => {
            setLocating(false);
            if (status === "complete" && result.regeocode) {
              const c = result.regeocode.addressComponent;
              const cityName = (Array.isArray(c.city) ? c.province : c.city) || c.province || "";
              const spot = c.district || c.township || "";
              setCity(`${cityName}${spot ? " · " + spot : ""}`.trim() || result.regeocode.formattedAddress);
            }
          });
          return; // setLocating handled in callback
        } catch {
          /* ignore */
        }
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  };

  // 省/市/区 cascade via 高德 DistrictSearch (each level fetched on demand)
  const ensureDS = async () => {
    if (dsRef.current) return dsRef.current;
    const AMap = await loadAMap();
    await loadPlugin(AMap, "AMap.DistrictSearch");
    dsRef.current = new AMap.DistrictSearch({ subdistrict: 1, extensions: "base" });
    return dsRef.current;
  };
  const childrenOf = (name: string): Promise<string[]> =>
    new Promise((res) => {
      ensureDS()
        .then((ds) =>
          ds.search(name, (status: string, result: any) => {
            const list = status === "complete" && result.districtList?.[0]?.districtList;
            res(list ? list.map((d: any) => d.name) : []);
          })
        )
        .catch(() => res([]));
    });

  useEffect(() => {
    if (cityModal && AMAP_KEY && provinces.length === 0) childrenOf("中国").then(setProvinces);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cityModal]);

  const short = (s: string) => s.replace(/(省|市|区|县|自治区|自治州|特别行政区|盟|地区)$/, "") || s;
  const pickProvince = async (p: string) => {
    setSelP(p); setSelC(""); setSelD(""); setCities([]); setDistricts([]);
    const next = await childrenOf(p);
    setCities(next);
    setOpenLevel(next.length ? "c" : null); // expand the next level
  };
  const pickCity = async (c: string) => {
    setSelC(c); setSelD(""); setDistricts([]);
    const next = await childrenOf(c);
    setDistricts(next);
    setOpenLevel(next.length ? "d" : null);
  };
  const pickDistrict = (d: string) => {
    setSelD(d);
    setOpenLevel(null);
  };
  const confirmRegion = () => {
    const base = short(selC || selP);
    if (base) setCity(selD ? `${base} · ${short(selD)}` : base);
    setCityModal(false);
  };

  const togglePhoto = (i: number) => {
    setSelected((sel) => {
      if (sel.includes(i)) return sel.filter((x) => x !== i);
      if (sel.length >= MAX_PHOTOS) return [...sel.slice(1), i]; // drop oldest, keep newest
      return [...sel, i];
    });
  };

  const saveImage = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.toBlob(async (blob) => {
      if (!blob) return;
      const name = `光屿骑行-${ride?.colorId || "card"}.png`;
      const file = new File([blob], name, { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: { files: File[] }) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "光屿骑行", text: caption } as ShareData);
          return;
        } catch {
          /* cancelled / unsupported — fall through */
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    }, "image/png");
  };

  const hasTrack = (ride?.track?.length ?? 0) >= 2;
  const exportGpx = async () => {
    if (!ride) return;
    const res = await exportRideGPX(ride);
    setGpxMsg(
      res === "empty" ? "这次骑行没有轨迹可导出"
      : res === "shared" ? "已分享轨迹文件"
      : "GPX 已导出，可上传到 Strava"
    );
    setTimeout(() => setGpxMsg(null), 3200);
  };

  const publish = async () => {
    if (!ride || busy || published) return;
    setBusy(true);
    try {
      if (!(await repo.getRide(ride.id))) await repo.saveRide(ride);
      await repo.publishRide(ride.id, {
        city,
        caption: caption.trim() || ride.moodText,
        photoUrls: chosenPhotos.map((p) => p.dataUrl),
      });
      // celebrate, then head to the plaza
      setPublished(true);
      setTimeout(() => navigate("/plaza", { replace: true }), 2000);
    } catch (e) {
      setBusy(false);
      setGpxMsg(
        e instanceof Error && e.message === "QUOTA_EXCEEDED"
          ? "存储空间已满，发布失败：请到「旅程」删掉一些旧骑行后重试"
          : "发布失败，请重试"
      );
      setTimeout(() => setGpxMsg(null), 4500);
    }
  };

  return (
    <div className="size-full relative flex flex-col" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #e9e2d2 100%)", color: INK }}>
      {/* header: back + city tag (top-right) */}
      <div className="flex items-center justify-between px-5 pt-12 pb-1" style={{ flex: "none" }}>
        <PixelBack onClick={() => navigate(-1)} />
        {ride ? (
          <button
            onClick={() => { setOpenLevel("p"); setCityModal(true); }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 200, padding: "8px 12px", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 13, fontWeight: 700, color: INK, background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px #cbbd99", whiteSpace: "nowrap", overflow: "hidden" }}
          >
            <MapPin size={14} style={{ color: accent.fill, flexShrink: 0 }} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{city}</span>
            <span style={{ color: INK_FAINT, fontSize: 12, flexShrink: 0 }}>· 改</span>
          </button>
        ) : (
          <div style={{ width: 40 }} />
        )}
      </div>

      {!ride ? (
        <div style={{ flex: 1, display: "grid", placeItems: "center", color: INK_SOFT }}>没有可分享的骑行</div>
      ) : (
        <>
          {/* poster — fills the middle, scales to fit (no page scroll) */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: "6px 20px" }}>
            <canvas ref={canvasRef} style={{ maxWidth: "100%", maxHeight: "100%", display: "block", boxShadow: "0 10px 30px rgba(58,40,23,0.25)" }} />
          </div>

          {/* controls (fixed at bottom) */}
          <div style={{ flex: "none", padding: "6px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)", display: "flex", flexDirection: "column", gap: 10 }}>
            {/* photo picker */}
            {ride.photos.length > 0 && (
              <div className="flex items-center" style={{ gap: 8, overflowX: "auto" }}>
                <span style={{ flexShrink: 0, fontSize: 11, color: INK_FAINT }}>选照片 {selected.length}/{MAX_PHOTOS}</span>
                {ride.photos.map((p, i) => {
                  const order = selected.indexOf(i);
                  const on = order >= 0;
                  return (
                    <button
                      key={p.takenAt ?? i}
                      onClick={() => togglePhoto(i)}
                      style={{ position: "relative", flex: "none", width: 56, height: 56, padding: 0, cursor: "pointer", border: "none", overflow: "hidden", clipPath: STAIR, boxShadow: "inset 0 0 0 3px " + (on ? accent.fill : "#cbbd99"), opacity: on ? 1 : 0.55 }}
                    >
                      <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
                      {on && <span style={{ position: "absolute", top: 3, right: 3, width: 17, height: 17, background: accent.fill, color: accent.text, clipPath: STAIR, display: "grid", placeItems: "center", fontSize: 10, fontWeight: 800 }}>{order + 1}</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {/* share line (single row) */}
            <PixelField value={caption} onChange={(v) => setCaption(v.slice(0, 22))} placeholder="写一句想说的话…（≤22字）" accent={accent.fill} />

            {/* actions — side by side */}
            <div style={{ display: "flex", gap: 10 }}>
              <PixelButton onClick={publish} disabled={busy} flex={1} fill={accent.fill} text={accent.text} height={52} fontSize={16} fontWeight={800} letter={3}>
                {busy ? "发布中…" : "发布广场"}
              </PixelButton>
              <PixelButton onClick={saveImage} flex={1} fill="#f6efdf" text={INK} height={52} fontSize={16} fontWeight={700} letter={3}>
                保存 / 分享
              </PixelButton>
            </div>

            {/* export the GPS track as GPX → Strava / Garmin / Komoot … */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <button
                onClick={exportGpx}
                disabled={!hasTrack}
                style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 12px", cursor: hasTrack ? "pointer" : "not-allowed", border: "none", background: "none", fontFamily: PIXEL_FONT, fontSize: 13, fontWeight: 700, color: hasTrack ? INK_SOFT : INK_FAINT, opacity: hasTrack ? 1 : 0.7 }}
              >
                <Route size={14} style={{ color: hasTrack ? accent.fill : INK_FAINT }} />
                导出轨迹（GPX）
              </button>
              <a href={STRAVA_UPLOAD_URL} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, color: "#fc4c02", textDecoration: "none", display: "flex", alignItems: "center", gap: 4 }}>
                上传到 Strava<ExternalLink size={11} />
              </a>
            </div>
            {gpxMsg && <div style={{ textAlign: "center", fontSize: 11, color: INK_SOFT, marginTop: -2 }}>{gpxMsg}</div>}
          </div>
        </>
      )}

      {/* region picker popup — auto-match (GPS) + 省/市/区 cascade (vertical scroll) */}
      {cityModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 70, fontFamily: PIXEL_FONT }}>
          <div onClick={() => setCityModal(false)} style={{ position: "absolute", inset: 0, background: "rgba(20,16,8,0.5)" }} />
          <div
            className="pixel-pop"
            style={{ position: "absolute", left: "50%", top: "50%", width: "min(92vw, 400px)", background: PAPER, clipPath: STAIR, boxShadow: "inset 0 0 0 3px " + PIXEL_OUT, padding: "20px 20px 20px" }}
          >
            <div style={{ fontSize: 17, fontWeight: 800, color: INK, marginBottom: 12 }}>选择地区</div>

            {/* auto-match + current-location readout */}
            <button
              onClick={detectCity}
              disabled={locating}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 44, marginBottom: 8, cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 14, fontWeight: 800, letterSpacing: 2, color: accent.ink, background: accent.tint, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + accent.fill }}
            >
              <LocateFixed size={15} className={locating ? "pixel-spin" : ""} style={{ color: accent.fill }} />
              {locating ? "定位中…" : "使用当前定位"}
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12, padding: "0 2px" }}>
              <MapPin size={13} style={{ color: accent.fill, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: INK_FAINT, flexShrink: 0 }}>当前</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: city ? INK : INK_FAINT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {locating ? "定位中…" : city || "未定位"}
              </span>
            </div>

            {/* 省 / 市 / 区 — three columns, each expands up/down IN PLACE.
                When a wheel is open we reserve vertical room so it can grow both
                ways without covering the locate / 确定 buttons. */}
            <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: openLevel ? 78 : 0, marginBottom: openLevel ? 92 : 14 }}>
              {([
                ["p", "省", provinces, selP, pickProvince] as const,
                ["c", "市", cities, selC, pickCity] as const,
                ["d", "区", districts, selD, pickDistrict] as const,
              ]).map(([lvl, label, items, sel, pick]) => {
                const on = openLevel === lvl;
                const fade = "linear-gradient(to bottom, transparent 0%, #000 32%, #000 68%, transparent 100%)";
                const WHEEL_H = 184;
                return (
                  <div key={lvl} style={{ position: "relative", flex: 1, minWidth: 0 }}>
                    {/* header pill (single current value) */}
                    <button
                      onClick={() => setOpenLevel(on ? null : lvl)}
                      style={{ width: "100%", padding: "8px 6px", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, clipPath: STAIR, background: on ? accent.fill : "#fffdf7", boxShadow: "inset 0 0 0 2px " + (on ? accent.fill : "#cbbd99"), display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}
                    >
                      <span style={{ fontSize: 10, color: on ? accent.text : INK_FAINT, fontWeight: 700 }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: on ? accent.text : sel ? INK : INK_FAINT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{sel ? short(sel) : "选择"}</span>
                    </button>

                    {/* in-column wheel — centred on the pill so it expands BOTH up & down */}
                    {on && (
                      <div
                        ref={wheelRef}
                        style={{ position: "absolute", left: -2, right: -2, top: "50%", transform: "translateY(-50%)", height: WHEEL_H, zIndex: 10, overflowY: "auto", background: PAPER, clipPath: STAIR, boxShadow: "inset 0 0 0 3px " + accent.fill, WebkitMaskImage: fade, maskImage: fade }}
                      >
                        {items.length === 0 ? (
                          <div style={{ textAlign: "center", padding: WHEEL_H / 2 - 8 + "px 0", color: INK_FAINT, fontSize: 11 }}>…</div>
                        ) : (
                          <div style={{ padding: WHEEL_H / 2 - 18 + "px 0" }}>
                            {items.map((it) => (
                              <button
                                key={it}
                                data-sel={sel === it ? "1" : undefined}
                                onClick={() => pick(it)}
                                title={it}
                                style={{ display: "block", width: "100%", textAlign: "center", padding: "8px 4px", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: sel === it ? 14 : 12, fontWeight: sel === it ? 800 : 500, color: sel === it ? accent.fill : INK, background: "transparent", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                              >
                                {short(it)}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <PixelButton onClick={confirmRegion} fill={accent.fill} text={accent.text} height={48} fontSize={16} fontWeight={800} letter={3}>
              确定{(selC || selP) ? ` · ${short(selD || selC || selP)}` : ""}
            </PixelButton>
          </div>
        </div>
      )}

      {/* publish success — five-colour confetti behind a badge, then → 广场 */}
      {published && (
        <div style={{ position: "fixed", inset: 0, zIndex: 80, display: "grid", placeItems: "center", fontFamily: PIXEL_FONT }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(20,16,8,0.55)" }} />
          <Confetti />
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 16, stiffness: 280 }}
            style={{ position: "relative", zIndex: 2, width: "min(80vw, 300px)", textAlign: "center", background: PAPER, clipPath: STAIR, boxShadow: "inset 0 0 0 3px " + PIXEL_OUT, padding: "30px 24px 26px" }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", damping: 12, stiffness: 260 }}
              style={{ width: 76, height: 76, margin: "0 auto 16px", background: accent.fill, clipPath: STAIR, display: "grid", placeItems: "center", boxShadow: "inset 0 0 0 3px " + PIXEL_OUT }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4 10-11" stroke={accent.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.div>
            <div style={{ fontSize: 21, fontWeight: 800, color: INK }}>发布成功</div>
            <div style={{ fontSize: 13, color: INK_FAINT, marginTop: 8 }}>正在前往颜色广场…</div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
