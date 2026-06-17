import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { X } from "lucide-react";
import { emotionMeta, type RidePhoto, type RideRecord } from "../lib/journal";
import { repo } from "../lib/rideRepo";
import { PIXEL_FONT, PIXEL_OUT, INK, INK_SOFT, STAIR, CTA_COLORS, PixelButton } from "../components/pixelKit";

// "旅程全览" — a full-screen, story-style photo overview that auto-plays through
// the rider's moments: a stats cover, one chapter per emotion colour, then a
// closing photo wall. Tap right/left to navigate; tap-hold pauses.

const COLOR_ORDER = [
  "calm-green",
  "lonely-blue",
  "explore-yellow",
  "release-red",
  "tired-gray",
] as const;

interface Moment extends RidePhoto {
  colorId: string;
  rideDate: number;
}

type Scene =
  | { kind: "cover"; duration: number }
  | {
      kind: "color";
      duration: number;
      colorId: string;
      meta: { cn: string; en: string; color: string };
      photos: Moment[];
      distance: number;
    }
  | { kind: "finale"; duration: number };

// Deterministic scatter so photos feel hand-placed but don't reshuffle on render.
const SCATTER = [
  { r: -4, dx: -6, dy: 2 },
  { r: 3, dx: 5, dy: -4 },
  { r: -2, dx: 3, dy: 5 },
  { r: 5, dx: -4, dy: -2 },
  { r: -3, dx: 6, dy: 3 },
  { r: 2, dx: -5, dy: -3 },
];

export default function Overview() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<RideRecord[]>([]);
  useEffect(() => { repo.listRides().then(setRides); }, []);

  const { scenes, totalDistance, totalRides, totalPhotos, dominant, allPhotos } =
    useMemo(() => {
      const moments: Moment[] = rides.flatMap((r) =>
        r.photos.map((p) => ({ ...p, colorId: r.colorId, rideDate: r.startedAt }))
      );
      const totalDistance = rides.reduce((a, r) => a + r.distance, 0);
      const groups = COLOR_ORDER.map((c) => ({
        colorId: c,
        meta: emotionMeta(c),
        photos: moments.filter((m) => m.colorId === c),
        distance: rides
          .filter((r) => r.colorId === c)
          .reduce((a, r) => a + r.distance, 0),
      })).filter((g) => g.photos.length > 0);

      const dominant =
        groups.slice().sort((a, b) => b.photos.length - a.photos.length)[0]?.meta
          .color || "#34E89E";

      const colorScenes: Scene[] = groups.map((g) => ({
        kind: "color",
        duration: 4500,
        colorId: g.colorId,
        meta: g.meta,
        photos: g.photos,
        distance: g.distance,
      }));

      const scenes: Scene[] = [
        { kind: "cover", duration: 4000 },
        ...colorScenes,
        { kind: "finale", duration: 6000 },
      ];

      return {
        scenes,
        totalDistance,
        totalRides: rides.length,
        totalPhotos: moments.length,
        dominant,
        allPhotos: moments,
      };
    }, [rides]);

  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const hasPhotos = totalPhotos > 0;

  // Auto-advance (the finale lingers — no auto-advance past it).
  useEffect(() => {
    if (!hasPhotos || paused) return;
    if (idx >= scenes.length - 1) return;
    const t = setTimeout(() => setIdx((i) => i + 1), scenes[idx].duration);
    return () => clearTimeout(t);
  }, [idx, paused, scenes, hasPhotos]);

  if (!hasPhotos) {
    return (
      <div className="size-full flex flex-col items-center justify-center gap-5 px-10 text-center" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #e9e2d2 100%)", color: INK }}>
        <div style={{ fontSize: 14, letterSpacing: 2, color: INK, fontWeight: 800 }}>还没有拍下任何瞬间</div>
        <div style={{ fontSize: 12, letterSpacing: 1, color: INK_SOFT, lineHeight: 1.8, fontWeight: 500 }}>
          骑行途中拍下照片，
          <br />
          这里会把它们汇成一段旅程
        </div>
        <div style={{ width: 180, marginTop: 6 }}>
          <PixelButton onClick={() => navigate("/")} fill={CTA_COLORS.yellow.fill} text={CTA_COLORS.yellow.text} height={48} fontSize={14} letter={4}>去骑行</PixelButton>
        </div>
      </div>
    );
  }

  const scene = scenes[idx];
  const goNext = () => setIdx((i) => Math.min(i + 1, scenes.length - 1));
  const goPrev = () => setIdx((i) => Math.max(i - 1, 0));

  return (
    <div className="size-full relative overflow-hidden bg-black text-white select-none">
      {/* Scene — crossfade (no mode="wait" so a backgrounded tab can't hang it) */}
      <AnimatePresence>
        <motion.div
          key={idx}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6 }}
        >
          {scene.kind === "cover" && (
            <CoverScene
              dominant={dominant}
              distance={totalDistance}
              rides={totalRides}
              photos={totalPhotos}
              sample={allPhotos.slice(0, 8)}
            />
          )}
          {scene.kind === "color" && <ColorScene scene={scene} />}
          {scene.kind === "finale" && (
            <FinaleScene photos={allPhotos} dominant={dominant} />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Progress bars */}
      <div className="absolute top-4 left-4 right-4 z-30 flex gap-1.5">
        {scenes.map((_, i) => (
          <div key={i} className="flex-1 h-0.5 rounded-full bg-white/20 overflow-hidden">
            <motion.div
              className="h-full bg-white"
              initial={{ width: i < idx ? "100%" : "0%" }}
              animate={{ width: i < idx ? "100%" : i === idx ? "100%" : "0%" }}
              transition={
                i === idx && !paused
                  ? { duration: scene.duration / 1000, ease: "linear" }
                  : { duration: 0 }
              }
            />
          </div>
        ))}
      </div>

      {/* Close */}
      <button
        onClick={() => navigate("/journal")}
        className="absolute top-7 right-4 z-30 text-white/70 active:scale-90 transition-transform"
        aria-label="关闭"
      >
        <X size={20} />
      </button>

      {/* Tap zones (prev / next), hold to pause */}
      <button
        className="absolute inset-y-0 left-0 w-1/3 z-20"
        aria-label="上一段"
        onClick={goPrev}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />
      <button
        className="absolute inset-y-0 right-0 w-2/3 z-20"
        aria-label="下一段"
        onClick={goNext}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />
    </div>
  );
}

function CoverScene({
  dominant,
  distance,
  rides,
  photos,
  sample,
}: {
  dominant: string;
  distance: number;
  rides: number;
  photos: number;
  sample: Moment[];
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
      {/* drifting photo backdrop */}
      <div className="absolute inset-0 opacity-25">
        {sample.map((p, i) => (
          <motion.img
            key={p.takenAt}
            src={p.dataUrl}
            alt=""
            className="absolute w-24 h-24 object-cover rounded-xl"
            style={{ left: `${(i % 4) * 26 + 4}%`, top: `${Math.floor(i / 4) * 38 + 8}%` }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.5, scale: 1, y: [0, -10, 0] }}
            transition={{
              opacity: { duration: 1, delay: i * 0.08 },
              y: { duration: 6 + i, repeat: Infinity, ease: "easeInOut" },
            }}
          />
        ))}
      </div>
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 45%, ${dominant}33, transparent 60%)`,
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
      >
        <div className="font-serif-cn text-[12px] tracking-[0.5em] text-white/55">旅程全览</div>
        <div className="mt-3 text-[40px] font-extralight tracking-wide" style={{ textShadow: `0 0 30px ${dominant}66` }}>
          你走过的路
        </div>
      </motion.div>

      <motion.div
        className="relative z-10 mt-12 flex items-end gap-7"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.7 }}
      >
        <BigStat value={distance.toFixed(1)} unit="km" />
        <BigStat value={`${rides}`} unit="次骑行" />
        <BigStat value={`${photos}`} unit="个瞬间" />
      </motion.div>
    </div>
  );
}

function BigStat({ value, unit }: { value: string; unit: string }) {
  return (
    <div className="text-center">
      <div className="text-[34px] leading-none font-light tabular-nums">{value}</div>
      <div className="font-serif-cn text-[10px] tracking-[0.25em] text-white/50 mt-1.5">{unit}</div>
    </div>
  );
}

function ColorScene({ scene }: { scene: Extract<Scene, { kind: "color" }> }) {
  const { meta, photos, distance } = scene;
  const shown = photos.slice(0, 9);
  return (
    <div className="absolute inset-0 flex flex-col">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 25%, ${meta.color}2e, #06070d 65%)` }}
      />
      {/* heading */}
      <motion.div
        className="relative z-10 pt-16 text-center"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7 }}
      >
        <div className="text-[44px] font-extralight tracking-[0.2em]" style={{ color: meta.color, textShadow: `0 0 26px ${meta.color}77` }}>
          {meta.en}
        </div>
        <div className="font-serif-cn text-[13px] tracking-[0.4em] text-white/80 mt-1">{meta.cn}</div>
        <div className="font-serif-cn text-[11px] tracking-[0.25em] text-white/45 mt-3">
          {photos.length} 个瞬间 · {distance.toFixed(1)} km
        </div>
      </motion.div>

      {/* photo cluster */}
      <div className="relative z-10 flex-1 px-5 mt-6">
        <div className="grid grid-cols-3 gap-2">
          {shown.map((p, i) => {
            const s = SCATTER[i % SCATTER.length];
            return (
              <motion.div
                key={p.takenAt}
                className="relative aspect-square overflow-hidden"
                style={{ clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }}
                initial={{ opacity: 0, scale: 0.6, rotate: s.r * 2, x: s.dx, y: s.dy + 20 }}
                animate={{ opacity: 1, scale: 1, rotate: s.r, x: 0, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + i * 0.09, ease: "easeOut" }}
              >
                <img src={p.dataUrl} alt="" className="w-full h-full object-cover" />
                {p.caption && (
                  <div
                    className="absolute inset-x-0 bottom-0 px-1.5 py-1 text-[9px] tracking-[0.1em] text-white/95 truncate"
                    style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)", fontFamily: PIXEL_FONT }}
                  >
                    {p.caption}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function FinaleScene({ photos, dominant }: { photos: Moment[]; dominant: string }) {
  const navigate = useNavigate();
  const wall = photos.slice(0, 24);
  return (
    <div className="absolute inset-0 flex flex-col">
      {/* mosaic wall */}
      <div className="absolute inset-0 grid grid-cols-4 gap-0.5 opacity-60">
        {wall.map((p, i) => (
          <motion.img
            key={p.takenAt}
            src={p.dataUrl}
            alt=""
            className="w-full aspect-square object-cover"
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 0.85, scale: 1 }}
            transition={{ duration: 0.5, delay: i * 0.04 }}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(3,4,8,0.4) 40%, rgba(3,4,8,0.95))` }}
      />

      <div className="relative z-10 mt-auto px-8 pb-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6 }}
        >
          <div className="font-serif-cn text-[15px] tracking-[0.3em] text-white/90 leading-relaxed">
            你的颜色，
            <br />
            都在路上。
          </div>
          <div className="mt-2 font-serif-cn text-[11px] tracking-[0.25em]" style={{ color: `${dominant}cc` }}>
            {photos.length} 个被记下的瞬间
          </div>

          <div className="mt-8 flex gap-3 justify-center">
            <div style={{ width: 130 }}>
              <PixelButton onClick={() => navigate("/journal")} fill="#f6efdf" text={INK} height={48} fontSize={14} fontWeight={700} letter={3}>完成</PixelButton>
            </div>
            <div style={{ width: 150 }}>
              <PixelButton onClick={() => navigate(0)} fill={dominant} text="#241a10" height={48} fontSize={14} fontWeight={800} letter={3}>再看一次</PixelButton>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
