import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, MapPin, X } from "lucide-react";
import { RidePhoto, RideRecord, emotionMeta, loadRides } from "../lib/journal";

type Tab = "rides" | "colors" | "summary";

const COLOR_BUCKETS: Array<
  "calm-green" | "lonely-blue" | "explore-yellow" | "release-red" | "tired-gray"
> = ["calm-green", "lonely-blue", "explore-yellow", "release-red", "tired-gray"];

function formatDate(ts: number) {
  const d = new Date(ts);
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const dd = d.getDate().toString().padStart(2, "0");
  const hh = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  return `${mm}.${dd} ${hh}:${mi}`;
}

function formatMonth(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, "0")}`;
}

export default function Journal() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [tab, setTab] = useState<Tab>("rides");
  const [openRide, setOpenRide] = useState<RideRecord | null>(null);
  const [openColor, setOpenColor] = useState<string | null>(null);
  const [summaryScope, setSummaryScope] = useState<"month" | "year">("month");

  useEffect(() => {
    setRides(loadRides());
  }, []);

  const totalDistance = rides.reduce((a, r) => a + r.distance, 0);
  const totalPhotos = rides.reduce((a, r) => a + r.photos.length, 0);

  const photosByColor = useMemo(() => {
    const map: Record<string, Array<{ photo: RidePhoto; ride: RideRecord }>> = {};
    COLOR_BUCKETS.forEach((c) => (map[c] = []));
    rides.forEach((ride) => {
      ride.photos.forEach((photo) => {
        const bucket = ride.colorId in map ? ride.colorId : "tired-gray";
        map[bucket].push({ photo, ride });
      });
    });
    return map;
  }, [rides]);

  const summaryBuckets = useMemo(() => {
    const now = new Date();
    return COLOR_BUCKETS.map((c) => {
      const subset = rides.filter((r) => {
        if (r.colorId !== c) return false;
        const d = new Date(r.startedAt);
        if (summaryScope === "month") {
          return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
        }
        return d.getFullYear() === now.getFullYear();
      });
      return {
        colorId: c,
        meta: emotionMeta(c),
        count: subset.length,
        distance: subset.reduce((a, r) => a + r.distance, 0),
        photos: subset.reduce((a, r) => a + r.photos.length, 0),
        duration: subset.reduce((a, r) => a + r.duration, 0),
      };
    });
  }, [rides, summaryScope]);

  const totalForScope = summaryBuckets.reduce((a, b) => a + b.count, 0);

  return (
    <div className="size-full bg-black text-white overflow-y-auto relative">
      <div className="sticky top-0 z-10 backdrop-blur-xl bg-black/70 px-5 pt-5 pb-3 border-b border-white/5">
        <div className="flex items-center justify-between">
          <button onClick={() => navigate("/")} className="text-white/80 active:scale-95 transition-transform">
            <ChevronLeft size={22} />
          </button>
          <div className="text-center">
            <div className="font-serif-cn text-[11px] tracking-[0.45em] text-white/55" style={{ fontWeight: 500 }}>
              JOURNAL
            </div>
            <div className="font-serif-cn text-[14px] tracking-[0.35em] text-white/95 mt-0.5" style={{ fontWeight: 500 }}>
              我的旅程
            </div>
          </div>
          <div className="w-[22px]" />
        </div>

        <div className="flex items-center justify-center gap-5 mt-4">
          <Stat label="总骑行" value={`${totalDistance.toFixed(1)} km`} />
          <span className="w-px h-5 bg-white/10" />
          <Stat label="次数" value={`${rides.length}`} />
          <span className="w-px h-5 bg-white/10" />
          <Stat label="印象" value={`${totalPhotos}`} />
        </div>

        <div className="mt-4 flex gap-1 bg-white/5 rounded-full p-1">
          {(
            [
              { id: "rides", label: "每次骑行" },
              { id: "colors", label: "按颜色" },
              { id: "summary", label: "总结" },
            ] as Array<{ id: Tab; label: string }>
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex-1 py-2 rounded-full font-serif-cn text-[11px] tracking-[0.3em] transition-all"
              style={{
                backgroundColor: tab === t.id ? "rgba(255,255,255,0.95)" : "transparent",
                color: tab === t.id ? "#0a0a0a" : "rgba(255,255,255,0.65)",
                fontWeight: tab === t.id ? 600 : 400,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-5 py-5">
        {rides.length === 0 ? (
          <EmptyState onStart={() => navigate("/emotions")} />
        ) : tab === "rides" ? (
          <RidesList rides={rides} onOpen={setOpenRide} />
        ) : tab === "colors" ? (
          <ColorBuckets photosByColor={photosByColor} onOpen={setOpenColor} />
        ) : (
          <SummaryView
            buckets={summaryBuckets}
            total={totalForScope}
            scope={summaryScope}
            onScope={setSummaryScope}
            onOpenColor={setOpenColor}
          />
        )}
      </div>

      <AnimatePresence>
        {openRide && <RideDetailSheet ride={openRide} onClose={() => setOpenRide(null)} />}
      </AnimatePresence>
      <AnimatePresence>
        {openColor && (
          <ColorPhotoSheet
            colorId={openColor}
            entries={photosByColor[openColor] || []}
            onClose={() => setOpenColor(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div className="text-[16px] font-light tabular-nums leading-none text-white/95">{value}</div>
      <div className="font-serif-cn text-[9px] tracking-[0.3em] text-white/45 mt-1" style={{ fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="text-center py-24">
      <div className="font-serif-cn text-[12px] tracking-[0.3em] text-white/35" style={{ fontWeight: 400 }}>
        还没有旅程，去开始第一次骑行吧
      </div>
      <button
        onClick={onStart}
        className="mt-6 px-6 py-2.5 rounded-full border border-white/20 font-serif-cn text-[11px] tracking-[0.35em] text-white/80 active:scale-95 transition-transform"
        style={{ fontWeight: 500 }}
      >
        开始探索
      </button>
    </div>
  );
}

function RidesList({ rides, onOpen }: { rides: RideRecord[]; onOpen: (r: RideRecord) => void }) {
  return (
    <div className="space-y-4">
      {rides.map((ride) => {
        const meta = emotionMeta(ride.colorId);
        return (
          <motion.button
            key={ride.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => onOpen(ride)}
            className="w-full text-left rounded-2xl border overflow-hidden active:scale-[0.99] transition-transform"
            style={{
              borderColor: `${meta.color}55`,
              backgroundColor: "rgba(20,20,22,0.55)",
              boxShadow: `0 0 18px ${meta.color}22`,
            }}
          >
            <div className="px-4 pt-4 pb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: ride.dominantColor, boxShadow: `0 0 8px ${ride.dominantColor}` }}
                  />
                  <span className="font-serif-cn text-[11px] tracking-[0.3em]" style={{ color: `${meta.color}ee`, fontWeight: 500 }}>
                    {meta.cn} / {meta.en}
                  </span>
                </div>
                <div className="font-serif-cn text-[10px] tracking-[0.25em] text-white/45 mt-1.5" style={{ fontWeight: 400 }}>
                  {formatDate(ride.startedAt)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[22px] font-light tabular-nums leading-none">{ride.distance.toFixed(2)}</div>
                <div className="font-serif-cn text-[9px] tracking-[0.3em] text-white/45 mt-1" style={{ fontWeight: 500 }}>
                  km · {Math.round(ride.duration / 60)}min
                </div>
              </div>
            </div>

            {ride.moodText && (
              <div className="px-4 pb-3">
                <div className="font-serif-cn text-[12px] tracking-[0.15em] text-white/75 italic" style={{ fontWeight: 400 }}>
                  "{ride.moodText}"
                </div>
              </div>
            )}

            {ride.photos.length > 0 ? (
              <div className="grid grid-cols-4 gap-1 px-1.5 pb-1.5">
                {ride.photos.slice(0, 4).map((p, i) => (
                  <div
                    key={p.takenAt}
                    className="aspect-square rounded-lg overflow-hidden relative"
                    style={{ border: `1px solid ${p.color}aa` }}
                  >
                    <img src={p.dataUrl} alt="ride moment" className="w-full h-full object-cover" />
                    {i === 3 && ride.photos.length > 4 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/55 font-serif-cn text-[12px] tracking-[0.2em] text-white/95" style={{ fontWeight: 500 }}>
                        +{ride.photos.length - 4}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-4 pb-4 flex items-center gap-2 text-white/35">
                <MapPin size={11} />
                <span className="font-serif-cn text-[10px] tracking-[0.3em]" style={{ fontWeight: 400 }}>
                  无拍照印象
                </span>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

function ColorBuckets({
  photosByColor,
  onOpen,
}: {
  photosByColor: Record<string, Array<{ photo: RidePhoto; ride: RideRecord }>>;
  onOpen: (colorId: string) => void;
}) {
  return (
    <div className="space-y-3">
      {COLOR_BUCKETS.map((c) => {
        const meta = emotionMeta(c);
        const items = photosByColor[c] || [];
        return (
          <button
            key={c}
            onClick={() => items.length > 0 && onOpen(c)}
            className="w-full text-left rounded-2xl border overflow-hidden transition-all active:scale-[0.99]"
            style={{
              borderColor: `${meta.color}55`,
              backgroundColor: "rgba(20,20,22,0.55)",
              boxShadow: items.length > 0 ? `0 0 18px ${meta.color}22` : "none",
              opacity: items.length > 0 ? 1 : 0.4,
            }}
            disabled={items.length === 0}
          >
            <div className="px-4 pt-3 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
                />
                <div>
                  <div className="font-serif-cn text-[13px] tracking-[0.3em] text-white/95" style={{ fontWeight: 500 }}>
                    {meta.cn}
                  </div>
                  <div className="font-serif-cn text-[9px] tracking-[0.35em] text-white/40 mt-0.5" style={{ fontWeight: 500 }}>
                    {meta.en}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[18px] font-light tabular-nums leading-none">{items.length}</div>
                <div className="font-serif-cn text-[9px] tracking-[0.3em] text-white/45 mt-1" style={{ fontWeight: 500 }}>
                  张印象
                </div>
              </div>
            </div>
            {items.length > 0 && (
              <div className="grid grid-cols-5 gap-0.5 px-1 pb-1">
                {items.slice(0, 5).map(({ photo }) => (
                  <div
                    key={photo.takenAt}
                    className="aspect-square overflow-hidden rounded-md"
                    style={{ border: `1px solid ${photo.color}88` }}
                  >
                    <img src={photo.dataUrl} alt="moment" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SummaryView({
  buckets,
  total,
  scope,
  onScope,
  onOpenColor,
}: {
  buckets: Array<{
    colorId: string;
    meta: { cn: string; en: string; color: string };
    count: number;
    distance: number;
    photos: number;
    duration: number;
  }>;
  total: number;
  scope: "month" | "year";
  onScope: (s: "month" | "year") => void;
  onOpenColor: (id: string) => void;
}) {
  const now = new Date();
  const scopeLabel = scope === "month" ? formatMonth(now.getTime()) : `${now.getFullYear()}`;
  const totalDistance = buckets.reduce((a, b) => a + b.distance, 0);
  const totalDuration = buckets.reduce((a, b) => a + b.duration, 0);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["month", "year"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onScope(s)}
            className="px-4 py-2 rounded-full border font-serif-cn text-[11px] tracking-[0.3em] transition-all"
            style={{
              borderColor: scope === s ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.15)",
              backgroundColor: scope === s ? "rgba(255,255,255,0.12)" : "transparent",
              color: scope === s ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.55)",
              fontWeight: 500,
            }}
          >
            {s === "month" ? "本月" : "本年"}
          </button>
        ))}
        <div className="flex-1" />
        <div className="self-center font-serif-cn text-[11px] tracking-[0.3em] text-white/45" style={{ fontWeight: 500 }}>
          {scopeLabel}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 flex items-center justify-around">
        <div className="text-center">
          <div className="text-[28px] font-light tabular-nums leading-none">{totalDistance.toFixed(1)}</div>
          <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/45 mt-1.5" style={{ fontWeight: 500 }}>km</div>
        </div>
        <span className="w-px h-10 bg-white/10" />
        <div className="text-center">
          <div className="text-[28px] font-light tabular-nums leading-none">{total}</div>
          <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/45 mt-1.5" style={{ fontWeight: 500 }}>次骑行</div>
        </div>
        <span className="w-px h-10 bg-white/10" />
        <div className="text-center">
          <div className="text-[28px] font-light tabular-nums leading-none">{Math.round(totalDuration / 60)}</div>
          <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/45 mt-1.5" style={{ fontWeight: 500 }}>min</div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="font-serif-cn text-[10px] tracking-[0.35em] text-white/45 mb-3" style={{ fontWeight: 500 }}>
          颜色分布
        </div>
        {total === 0 ? (
          <div className="font-serif-cn text-[11px] tracking-[0.25em] text-white/35 py-4 text-center" style={{ fontWeight: 400 }}>
            该时间段尚无骑行
          </div>
        ) : (
          <>
            <div className="flex h-2.5 rounded-full overflow-hidden bg-white/5">
              {buckets.map((b) => (
                <div
                  key={b.colorId}
                  style={{
                    width: `${(b.count / total) * 100}%`,
                    backgroundColor: b.meta.color,
                    boxShadow: `0 0 8px ${b.meta.color}88`,
                  }}
                />
              ))}
            </div>
            <div className="mt-4 space-y-2.5">
              {buckets
                .filter((b) => b.count > 0)
                .map((b) => (
                  <button
                    key={b.colorId}
                    onClick={() => onOpenColor(b.colorId)}
                    className="w-full flex items-center justify-between active:scale-[0.99] transition-transform"
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: b.meta.color, boxShadow: `0 0 8px ${b.meta.color}` }}
                      />
                      <span className="font-serif-cn text-[12px] tracking-[0.25em]" style={{ color: `${b.meta.color}ee`, fontWeight: 500 }}>
                        {b.meta.cn}
                      </span>
                      <span className="font-serif-cn text-[10px] tracking-[0.2em] text-white/35" style={{ fontWeight: 400 }}>
                        · {b.photos} 张
                      </span>
                    </div>
                    <div className="font-serif-cn text-[11px] tracking-[0.2em] text-white/70 tabular-nums" style={{ fontWeight: 500 }}>
                      {b.count} 次 · {b.distance.toFixed(1)} km
                    </div>
                  </button>
                ))}
            </div>
          </>
        )}
      </div>

      <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/30 text-center pt-2" style={{ fontWeight: 400 }}>
        点击颜色查看该色调下的所有照片
      </div>
    </div>
  );
}

function RideDetailSheet({ ride, onClose }: { ride: RideRecord; onClose: () => void }) {
  const meta = emotionMeta(ride.colorId);
  return (
    <>
      <motion.div
        className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="absolute left-0 right-0 bottom-0 z-50 rounded-t-3xl border-t backdrop-blur-2xl pt-3 pb-7 max-h-[88%] overflow-y-auto"
        style={{
          borderColor: `${meta.color}66`,
          backgroundColor: "rgba(16,16,18,0.96)",
          boxShadow: `0 -22px 60px ${meta.color}55`,
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="w-10 h-1 mx-auto rounded-full bg-white/20 mb-4" />

        <div className="px-5 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: ride.dominantColor, boxShadow: `0 0 8px ${ride.dominantColor}` }}
              />
              <span className="font-serif-cn text-[11px] tracking-[0.35em]" style={{ color: `${meta.color}ee`, fontWeight: 500 }}>
                {meta.cn} / {meta.en}
              </span>
            </div>
            <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/45 mt-1.5" style={{ fontWeight: 400 }}>
              {formatDate(ride.startedAt)}
            </div>
          </div>
          <button onClick={onClose} className="text-white/55 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        <div className="px-5 mt-4 grid grid-cols-3 rounded-2xl border border-white/10 bg-white/[0.03]">
          <div className="text-center py-3 border-r border-white/10">
            <div className="text-[20px] font-light tabular-nums leading-none">{ride.distance.toFixed(2)}</div>
            <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/45 mt-1.5" style={{ fontWeight: 500 }}>km</div>
          </div>
          <div className="text-center py-3 border-r border-white/10">
            <div className="text-[20px] font-light tabular-nums leading-none">{Math.round(ride.duration / 60)}</div>
            <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/45 mt-1.5" style={{ fontWeight: 500 }}>min</div>
          </div>
          <div className="text-center py-3">
            <div className="text-[20px] font-light tabular-nums leading-none">{ride.photos.length}</div>
            <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/45 mt-1.5" style={{ fontWeight: 500 }}>印象</div>
          </div>
        </div>

        {ride.moodText && (
          <div className="px-5 mt-4">
            <div className="font-serif-cn text-[13px] tracking-[0.15em] text-white/85 italic" style={{ fontWeight: 400 }}>
              "{ride.moodText}"
            </div>
          </div>
        )}

        <div className="px-3 mt-4">
          {ride.photos.length === 0 ? (
            <div className="font-serif-cn text-[11px] tracking-[0.25em] text-white/35 text-center py-10" style={{ fontWeight: 400 }}>
              没有拍下任何瞬间
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {ride.photos.map((p) => (
                <div
                  key={p.takenAt}
                  className="rounded-xl overflow-hidden relative"
                  style={{ border: `1px solid ${p.color}aa`, boxShadow: `0 0 12px ${p.color}33` }}
                >
                  <img src={p.dataUrl} alt="moment" className="w-full aspect-square object-cover" />
                  <div
                    className="absolute top-1.5 left-1.5 backdrop-blur-md rounded-full px-2 py-0.5 flex items-center gap-1.5"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${p.color}88` }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: p.color, boxShadow: `0 0 6px ${p.color}` }}
                    />
                    <span className="font-serif-cn text-[9px] tracking-[0.2em] text-white/90" style={{ fontWeight: 500 }}>
                      {emotionMeta(ride.colorId).cn}
                    </span>
                  </div>
                  {p.caption && (
                    <div
                      className="absolute inset-x-0 bottom-0 px-2 py-1.5 font-serif-cn text-[10px] tracking-[0.1em] text-white/95"
                      style={{
                        background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
                        fontWeight: 400,
                      }}
                    >
                      {p.caption}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}

function ColorPhotoSheet({
  colorId,
  entries,
  onClose,
}: {
  colorId: string;
  entries: Array<{ photo: RidePhoto; ride: RideRecord }>;
  onClose: () => void;
}) {
  const meta = emotionMeta(colorId);
  return (
    <>
      <motion.div
        className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="absolute left-0 right-0 bottom-0 z-50 rounded-t-3xl border-t backdrop-blur-2xl pt-3 pb-7 max-h-[88%] overflow-y-auto"
        style={{
          borderColor: `${meta.color}66`,
          backgroundColor: "rgba(16,16,18,0.96)",
          boxShadow: `0 -22px 60px ${meta.color}55`,
        }}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
      >
        <div className="w-10 h-1 mx-auto rounded-full bg-white/20 mb-4" />

        <div className="px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: meta.color, boxShadow: `0 0 10px ${meta.color}` }}
            />
            <div>
              <div className="font-serif-cn text-[14px] tracking-[0.3em] text-white/95" style={{ fontWeight: 500 }}>
                {meta.cn}
              </div>
              <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/40 mt-0.5" style={{ fontWeight: 500 }}>
                {meta.en} · {entries.length} 张印象
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-white/55 active:scale-95 transition-transform">
            <X size={18} />
          </button>
        </div>

        <div className="px-3 mt-4">
          <div className="grid grid-cols-3 gap-1.5">
            {entries.map(({ photo, ride }) => (
              <div
                key={photo.takenAt}
                className="rounded-lg overflow-hidden relative"
                style={{ border: `1px solid ${photo.color}aa` }}
              >
                <img src={photo.dataUrl} alt="moment" className="w-full aspect-square object-cover" />
                {photo.caption && (
                  <div
                    className="absolute inset-x-0 bottom-0 px-1.5 py-1 font-serif-cn text-[9px] tracking-[0.1em] text-white/95 truncate"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.85), transparent)",
                      fontWeight: 400,
                    }}
                    title={photo.caption}
                  >
                    {photo.caption}
                  </div>
                )}
                <div
                  className="absolute top-1 right-1 font-serif-cn text-[8px] tracking-[0.1em] text-white/55 px-1.5 py-0.5 rounded-full"
                  style={{ backgroundColor: "rgba(0,0,0,0.55)", fontWeight: 400 }}
                >
                  {formatDate(ride.startedAt).slice(0, 5)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </>
  );
}
