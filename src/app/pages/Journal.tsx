import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { MapPin, Sparkles, Compass, X } from "lucide-react";
import { RidePhoto, RideRecord, emotionMeta } from "../lib/journal";
import { repo } from "../lib/rideRepo";
import { seedDemoRides } from "../lib/demoData";
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

type Tab = "rides" | "colors" | "summary";

const COLOR_BUCKETS: Array<"calm-green" | "lonely-blue" | "explore-yellow" | "release-red" | "tired-gray"> = [
  "calm-green", "lonely-blue", "explore-yellow", "release-red", "tired-gray",
];

const acc = (id: string) => CTA_COLORS[emotionToCtaColor(id as any)];
const card: React.CSSProperties = { background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT };

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

type Scope = "day" | "week" | "month" | "year";
const DAY_MS = 86400000;
const p2 = (n: number) => n.toString().padStart(2, "0");
function startOfDay(ts: number) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function startOfWeek(ts: number) { const d = new Date(startOfDay(ts)); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d.getTime(); }
function inScope(ts: number, scope: Scope, nowTs: number) {
  const d = new Date(ts), now = new Date(nowTs);
  if (scope === "day") return startOfDay(ts) === startOfDay(nowTs);
  if (scope === "week") { const s = startOfWeek(nowTs); return ts >= s && ts < s + 7 * DAY_MS; }
  if (scope === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  return d.getFullYear() === now.getFullYear();
}
function scopeLabel(scope: Scope, nowTs: number) {
  const now = new Date(nowTs);
  if (scope === "day") return `${now.getFullYear()}.${p2(now.getMonth() + 1)}.${p2(now.getDate())}`;
  if (scope === "week") { const s = new Date(startOfWeek(nowTs)); const e = new Date(startOfWeek(nowTs) + 6 * DAY_MS); return `${p2(s.getMonth() + 1)}.${p2(s.getDate())} – ${p2(e.getMonth() + 1)}.${p2(e.getDate())}`; }
  if (scope === "month") return `${now.getFullYear()}.${p2(now.getMonth() + 1)}`;
  return `${now.getFullYear()}`;
}
const SCOPE_LABELS: Record<Scope, string> = { day: "今日", week: "本周", month: "本月", year: "本年" };

export default function Journal() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [tab, setTab] = useState<Tab>("rides");
  const [openRide, setOpenRide] = useState<RideRecord | null>(null);
  const [openColor, setOpenColor] = useState<string | null>(null);
  const [summaryScope, setSummaryScope] = useState<Scope>("day");

  useEffect(() => { repo.listRides().then(setRides); }, []);

  const totalDistance = rides.reduce((a, r) => a + r.distance, 0);
  const totalPhotos = rides.reduce((a, r) => a + r.photos.length, 0);

  const photosByColor = useMemo(() => {
    const map: Record<string, Array<{ photo: RidePhoto; ride: RideRecord }>> = {};
    COLOR_BUCKETS.forEach((c) => (map[c] = []));
    rides.forEach((ride) => ride.photos.forEach((photo) => {
      const bucket = ride.colorId in map ? ride.colorId : "tired-gray";
      map[bucket].push({ photo, ride });
    }));
    return map;
  }, [rides]);

  const summaryBuckets = useMemo(() => {
    const nowTs = Date.now();
    return COLOR_BUCKETS.map((c) => {
      const subset = rides.filter((r) => r.colorId === c && inScope(r.startedAt, summaryScope, nowTs));
      return { colorId: c, meta: emotionMeta(c), count: subset.length, distance: subset.reduce((a, r) => a + r.distance, 0), photos: subset.reduce((a, r) => a + r.photos.length, 0), duration: subset.reduce((a, r) => a + r.duration, 0) };
    });
  }, [rides, summaryScope]);

  const totalForScope = summaryBuckets.reduce((a, b) => a + b.count, 0);

  return (
    <div className="size-full overflow-y-auto relative" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #efe9dc 60%, #e9e2d2 100%)", color: INK }}>
      <div className="sticky top-0 z-10 px-5 pt-5 pb-3" style={{ background: "rgba(244,239,227,0.94)", boxShadow: "inset 0 -2px 0 0 rgba(58,40,23,0.12)" }}>
        <div className="flex items-center justify-between">
          <PixelBack onClick={() => navigate("/")} />
          <div className="text-center">
            <div style={{ fontSize: 10, letterSpacing: 5, color: INK_FAINT, fontWeight: 600 }}>JOURNAL</div>
            <div style={{ fontSize: 16, letterSpacing: 3, color: INK, fontWeight: 800, marginTop: 2 }}>我的旅程</div>
          </div>
          <div style={{ width: 40 }} />
        </div>

        <div className="flex items-center justify-center" style={{ gap: 20, marginTop: 14 }}>
          <Stat label="总骑行" value={`${totalDistance.toFixed(1)} km`} />
          <span style={{ width: 2, height: 20, background: "rgba(58,40,23,0.18)" }} />
          <Stat label="次数" value={`${rides.length}`} />
          <span style={{ width: 2, height: 20, background: "rgba(58,40,23,0.18)" }} />
          <Stat label="印象" value={`${totalPhotos}`} />
        </div>

        <div className="flex" style={{ gap: 8, marginTop: 14 }}>
          {([{ id: "rides", label: "每次骑行" }, { id: "colors", label: "按颜色" }, { id: "summary", label: "总结" }] as Array<{ id: Tab; label: string }>).map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "9px 0", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 12, fontWeight: on ? 800 : 600, letterSpacing: 2, clipPath: STAIR, background: on ? PIXEL_OUT : "#fffdf7", color: on ? "#fff" : INK_SOFT, boxShadow: on ? "none" : "inset 0 0 0 2px #cbbd99" }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-5">
        {rides.length === 0 ? (
          <EmptyState onStart={() => navigate("/")} onSeed={import.meta.env.DEV ? () => { seedDemoRides(); repo.listRides().then(setRides); } : undefined} />
        ) : tab === "rides" ? (
          <RidesList rides={rides} onOpen={setOpenRide} />
        ) : tab === "colors" ? (
          <ColorBuckets photosByColor={photosByColor} onOpen={setOpenColor} />
        ) : (
          <SummaryView buckets={summaryBuckets} total={totalForScope} scope={summaryScope} onScope={setSummaryScope} onOpenColor={setOpenColor} />
        )}
      </div>

      {openRide && (
        <RideDetailSheet
          ride={openRide}
          onClose={() => setOpenRide(null)}
          onDelete={() => {
            repo.deleteRide(openRide.id).then(() => repo.listRides()).then(setRides);
            setOpenRide(null);
          }}
        />
      )}
      {openColor && <ColorPhotoSheet colorId={openColor} entries={photosByColor[openColor] || []} onClose={() => setOpenColor(null)} />}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: INK }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: 3, color: INK_FAINT, marginTop: 4, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1, color: INK }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: 2, color: INK_FAINT, marginTop: 5, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

function EmptyState({ onStart, onSeed }: { onStart: () => void; onSeed?: () => void }) {
  return (
    <div className="text-center" style={{ padding: "80px 0" }}>
      <div style={{ fontSize: 13, letterSpacing: 2, color: INK_SOFT, fontWeight: 500 }}>还没有旅程，去开始第一次骑行吧</div>
      <div style={{ maxWidth: 200, margin: "20px auto 0" }}>
        <PixelButton onClick={onStart} fill={CTA_COLORS.yellow.fill} text={CTA_COLORS.yellow.text} height={48} fontSize={14} letter={4}>开始探索</PixelButton>
      </div>
      {onSeed && (
        <div style={{ marginTop: 36 }}>
          <button onClick={onSeed} style={{ padding: "8px 16px", cursor: "pointer", border: "2px dashed #cbbd99", background: "transparent", fontFamily: PIXEL_FONT, fontSize: 11, letterSpacing: 2, color: INK_FAINT }}>载入演示数据</button>
          <div style={{ fontSize: 9, letterSpacing: 1, color: INK_FAINT, marginTop: 8 }}>仅开发预览 · 注入示例骑行与照片</div>
        </div>
      )}
    </div>
  );
}

function RidesList({ rides, onOpen }: { rides: RideRecord[]; onOpen: (r: RideRecord) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rides.map((ride) => {
        const meta = emotionMeta(ride.colorId);
        const a = acc(ride.colorId);
        return (
          <motion.button key={ride.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => onOpen(ride)} className="w-full text-left" style={{ ...card, overflow: "hidden", border: "none" }}>
            <div className="flex items-start justify-between" style={{ gap: 12, padding: "14px 14px 10px" }}>
              <div>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span style={{ width: 10, height: 10, background: ride.dominantColor, clipPath: STAIR }} />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, color: a.ink }}>{meta.cn} / {meta.en}</span>
                </div>
                <div style={{ fontSize: 10, letterSpacing: 2, color: INK_FAINT, marginTop: 6 }}>{formatDate(ride.startedAt)}</div>
              </div>
              <div className="text-right">
                <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: INK }}>{ride.distance.toFixed(2)}</div>
                <div style={{ fontSize: 9, letterSpacing: 2, color: INK_FAINT, marginTop: 4, fontWeight: 600 }}>km · {Math.round(ride.duration / 60)}min</div>
              </div>
            </div>
            {ride.moodText && (
              <div style={{ padding: "0 14px 10px" }}>
                <div style={{ fontSize: 12, letterSpacing: 1, color: INK_SOFT, fontStyle: "italic" }}>"{ride.moodText}"</div>
              </div>
            )}
            {ride.photos.length > 0 ? (
              <div className="grid grid-cols-4" style={{ gap: 4, padding: "0 6px 6px" }}>
                {ride.photos.slice(0, 4).map((p, i) => (
                  <div key={p.takenAt} className="aspect-square relative" style={{ overflow: "hidden", boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }}>
                    <img src={p.dataUrl} alt="ride moment" className="w-full h-full object-cover" />
                    {i === 3 && ride.photos.length > 4 && (
                      <div className="absolute inset-0 flex items-center justify-center" style={{ background: "rgba(20,16,8,0.55)", color: "#fff", fontSize: 12, fontWeight: 700 }}>+{ride.photos.length - 4}</div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center" style={{ gap: 8, padding: "0 14px 14px", color: INK_FAINT }}>
                <MapPin size={11} />
                <span style={{ fontSize: 10, letterSpacing: 2 }}>无拍照印象</span>
              </div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

function ColorBuckets({ photosByColor, onOpen }: { photosByColor: Record<string, Array<{ photo: RidePhoto; ride: RideRecord }>>; onOpen: (colorId: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {COLOR_BUCKETS.map((c) => {
        const meta = emotionMeta(c);
        const a = acc(c);
        const items = photosByColor[c] || [];
        return (
          <button key={c} onClick={() => items.length > 0 && onOpen(c)} disabled={items.length === 0} className="w-full text-left" style={{ ...card, overflow: "hidden", border: "none", opacity: items.length > 0 ? 1 : 0.45, cursor: items.length > 0 ? "pointer" : "default" }}>
            <div className="flex items-center justify-between" style={{ padding: "12px 14px" }}>
              <div className="flex items-center" style={{ gap: 12 }}>
                <span style={{ width: 14, height: 14, background: meta.color, clipPath: STAIR }} />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: INK }}>{meta.cn}</div>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: 3, color: a.ink, marginTop: 2 }}>{meta.en}</div>
                </div>
              </div>
              <div className="text-right">
                <div style={{ fontSize: 18, fontWeight: 800, lineHeight: 1, color: INK }}>{items.length}</div>
                <div style={{ fontSize: 9, letterSpacing: 2, color: INK_FAINT, marginTop: 4, fontWeight: 600 }}>张印象</div>
              </div>
            </div>
            {items.length > 0 && (
              <div className="grid grid-cols-5" style={{ gap: 3, padding: "0 4px 4px" }}>
                {items.slice(0, 5).map(({ photo }) => (
                  <div key={photo.takenAt} className="aspect-square" style={{ overflow: "hidden", boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }}>
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

function SummaryView({ buckets, total, scope, onScope, onOpenColor }: {
  buckets: Array<{ colorId: string; meta: { cn: string; en: string; color: string }; count: number; distance: number; photos: number; duration: number }>;
  total: number; scope: Scope; onScope: (s: Scope) => void; onOpenColor: (id: string) => void;
}) {
  const navigate = useNavigate();
  const label = scopeLabel(scope, Date.now());
  const totalDistance = buckets.reduce((a, b) => a + b.distance, 0);
  const totalDuration = buckets.reduce((a, b) => a + b.duration, 0);
  const totalPhotos = buckets.reduce((a, b) => a + b.photos, 0);
  const active = buckets.filter((b) => b.count > 0).sort((a, b) => b.count - a.count);
  const domId = active[0]?.colorId || "lonely-blue";
  const domAcc = acc(domId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* overview story + community entries */}
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => navigate("/overview")} className="flex-1 flex items-center justify-between" style={{ ...card, padding: "14px 16px", border: "none", cursor: "pointer" }}>
          <div className="text-left">
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: INK }}>旅程全览</div>
            <div style={{ fontSize: 10, letterSpacing: 1, color: INK_SOFT, marginTop: 4 }}>照片汇成动画</div>
          </div>
          <Sparkles size={18} style={{ color: domAcc.fill }} />
        </button>
        <button onClick={() => navigate("/discover")} className="flex-1 flex items-center justify-between" style={{ ...card, padding: "14px 16px", border: "none", cursor: "pointer" }}>
          <div className="text-left">
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: INK }}>颜色广场</div>
            <div style={{ fontSize: 10, letterSpacing: 1, color: INK_SOFT, marginTop: 4 }}>看别人的颜色</div>
          </div>
          <Compass size={18} style={{ color: domAcc.fill }} />
        </button>
      </div>

      {/* scope tabs */}
      <div className="flex" style={{ gap: 8 }}>
        {(["day", "week", "month", "year"] as Scope[]).map((s) => {
          const on = scope === s;
          return (
            <button key={s} onClick={() => onScope(s)} style={{ flex: 1, padding: "8px 0", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 12, fontWeight: on ? 800 : 600, letterSpacing: 1, clipPath: STAIR, background: on ? PIXEL_OUT : "#fffdf7", color: on ? "#fff" : INK_SOFT, boxShadow: on ? "none" : "inset 0 0 0 2px #cbbd99" }}>
              {SCOPE_LABELS[s]}
            </button>
          );
        })}
      </div>
      <div className="text-center" style={{ fontSize: 11, letterSpacing: 3, color: INK_FAINT, fontWeight: 600 }}>{label}</div>

      {/* hero */}
      <motion.div key={`hero-${scope}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} style={{ background: domAcc.tint, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, padding: 18 }}>
        <div style={{ fontSize: 10, letterSpacing: 3, color: domAcc.ink, fontWeight: 600 }}>{SCOPE_LABELS[scope]}共骑行</div>
        <div className="flex items-baseline" style={{ gap: 8, marginTop: 6 }}>
          <span style={{ fontSize: 50, lineHeight: 1, fontWeight: 800, color: INK }}>{totalDistance.toFixed(1)}</span>
          <span style={{ fontSize: 16, fontWeight: 700, color: domAcc.fill }}>km</span>
        </div>
        <div className="flex items-center" style={{ gap: 18, marginTop: 18 }}>
          <MiniStat value={`${total}`} label="次骑行" />
          <span style={{ width: 2, height: 26, background: "rgba(58,40,23,0.18)" }} />
          <MiniStat value={`${Math.round(totalDuration / 60)}`} label="分钟" />
          <span style={{ width: 2, height: 26, background: "rgba(58,40,23,0.18)" }} />
          <MiniStat value={`${totalPhotos}`} label="个瞬间" />
        </div>
      </motion.div>

      {/* spectrum */}
      {total === 0 ? (
        <div style={{ ...card, padding: "50px 0", textAlign: "center" }}>
          <div style={{ fontSize: 12, letterSpacing: 2, color: INK_SOFT, fontWeight: 500 }}>{SCOPE_LABELS[scope]}还没有骑行</div>
          <div style={{ fontSize: 10, letterSpacing: 1, color: INK_FAINT, marginTop: 8 }}>去骑一段，留下你的颜色</div>
        </div>
      ) : (
        <div style={{ ...card, padding: 18 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, letterSpacing: 3, color: INK, fontWeight: 700 }}>情绪光谱</div>
            <div style={{ fontSize: 9, letterSpacing: 1, color: INK_FAINT }}>点按看照片 →</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {active.map((b, i) => {
              const a = acc(b.colorId);
              const pct = Math.round((b.count / total) * 100);
              return (
                <motion.button key={b.colorId} onClick={() => onOpenColor(b.colorId)} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.05 + i * 0.06 }} className="w-full text-left" style={{ background: "none", border: "none", cursor: "pointer", fontFamily: PIXEL_FONT, padding: 0 }}>
                  <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
                    <div className="flex items-center" style={{ gap: 8 }}>
                      <span style={{ width: 11, height: 11, background: b.meta.color, clipPath: STAIR }} />
                      <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 1, color: INK }}>{b.meta.cn}</span>
                      <span style={{ fontSize: 9, letterSpacing: 2, color: INK_FAINT, fontWeight: 600 }}>{b.meta.en}</span>
                    </div>
                    <div style={{ fontSize: 10, letterSpacing: 1, color: INK_SOFT, fontWeight: 600 }}>{b.count}次 · {b.distance.toFixed(1)}km · {b.photos}张</div>
                  </div>
                  <div style={{ height: 12, background: "#eadfca", boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, overflow: "hidden" }}>
                    <motion.div style={{ height: "100%", background: a.fill }} initial={{ width: 0 }} animate={{ width: `${Math.max(pct, 5)}%` }} transition={{ duration: 0.6, delay: 0.15 + i * 0.06, ease: "easeOut" }} />
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function SheetShell({ onClose, children }: { accentFill?: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="absolute inset-0 z-40" style={{ fontFamily: PIXEL_FONT }}>
      <div className="absolute inset-0" style={{ background: "rgba(20,16,8,0.5)" }} onClick={onClose} />
      <div
        className="pixel-pop"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "min(90vw, 400px)",
          maxHeight: "84%",
          overflowY: "auto",
          background: PAPER,
          clipPath: STAIR,
          boxShadow: "inset 0 0 0 3px " + PIXEL_OUT,
          paddingTop: 18,
          paddingBottom: 22,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function RideDetailSheet({ ride, onClose, onDelete }: { ride: RideRecord; onClose: () => void; onDelete: () => void }) {
  const navigate = useNavigate();
  const meta = emotionMeta(ride.colorId);
  const a = acc(ride.colorId);
  const [confirm, setConfirm] = useState(false);
  return (
    <SheetShell accentFill={a.fill} onClose={onClose}>
      <div className="px-5 flex items-start justify-between">
        <div>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span style={{ width: 11, height: 11, background: ride.dominantColor, clipPath: STAIR }} />
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: a.ink }}>{meta.cn} / {meta.en}</span>
          </div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: INK_FAINT, marginTop: 6 }}>{formatDate(ride.startedAt)}</div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: INK_SOFT }}><X size={18} /></button>
      </div>

      <div className="px-5" style={{ marginTop: 16 }}>
        <div className="grid grid-cols-3" style={{ ...card }}>
          {[["距离", ride.distance.toFixed(2), "km"], ["时长", `${Math.round(ride.duration / 60)}`, "min"], ["印象", `${ride.photos.length}`, ""]].map(([lab, val], i) => (
            <div key={lab} style={{ textAlign: "center", padding: "12px 0", boxShadow: i < 2 ? "inset -1px 0 0 0 rgba(58,40,23,0.16)" : "none" }}>
              <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1, color: INK }}>{val}</div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: INK_SOFT, marginTop: 6, fontWeight: 600 }}>{lab}</div>
            </div>
          ))}
        </div>
      </div>

      {ride.moodText && (
        <div className="px-5" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, letterSpacing: 1, color: INK, fontStyle: "italic" }}>"{ride.moodText}"</div>
        </div>
      )}

      <div className="px-4" style={{ marginTop: 16 }}>
        {ride.photos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 0", fontSize: 11, letterSpacing: 2, color: INK_FAINT }}>没有拍下任何瞬间</div>
        ) : (
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            {ride.photos.map((p) => (
              <div key={p.takenAt} className="relative" style={{ overflow: "hidden", boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }}>
                <img src={p.dataUrl} alt="moment" className="w-full aspect-square object-cover" />
                {p.caption && (
                  <div className="absolute inset-x-0 bottom-0" style={{ padding: "6px 8px", fontSize: 10, color: "#fff", background: "linear-gradient(to top, rgba(20,16,8,0.85), transparent)" }}>{p.caption}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* share this ride */}
      <div className="px-5" style={{ marginTop: 18 }}>
        <PixelButton onClick={() => navigate("/share", { state: { rideId: ride.id } })} fill={a.fill} text={a.text} height={50} fontSize={15} fontWeight={800} letter={3}>
          生成分享卡 / 发布到广场
        </PixelButton>
      </div>

      {/* delete this ride */}
      <div className="px-5" style={{ marginTop: 12 }}>
        {confirm ? (
          <div style={{ display: "flex", gap: 10 }}>
            <PixelButton onClick={onDelete} flex={1} fill="#d23b2c" text="#fff" height={48} fontSize={14} fontWeight={800} letter={2}>
              确认删除
            </PixelButton>
            <PixelButton onClick={() => setConfirm(false)} flex={1} fill="#f6efdf" text={INK} height={48} fontSize={14} fontWeight={700} letter={2}>
              取消
            </PixelButton>
          </div>
        ) : (
          <button
            onClick={() => setConfirm(true)}
            style={{ width: "100%", height: 48, cursor: "pointer", fontFamily: PIXEL_FONT, fontSize: 13, fontWeight: 700, letterSpacing: 3, color: "#a33", background: "transparent", border: "none", clipPath: STAIR, boxShadow: "inset 0 0 0 2px rgba(178,53,44,0.5)" }}
          >
            删除这段记录
          </button>
        )}
      </div>
    </SheetShell>
  );
}

function ColorPhotoSheet({ colorId, entries, onClose }: { colorId: string; entries: Array<{ photo: RidePhoto; ride: RideRecord }>; onClose: () => void }) {
  const meta = emotionMeta(colorId);
  const a = acc(colorId);
  return (
    <SheetShell accentFill={a.fill} onClose={onClose}>
      <div className="px-5 flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 10 }}>
          <span style={{ width: 14, height: 14, background: meta.color, clipPath: STAIR }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: INK }}>{meta.cn}</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: a.ink, marginTop: 2, fontWeight: 600 }}>{meta.en} · {entries.length} 张印象</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: INK_SOFT }}><X size={18} /></button>
      </div>
      <div className="px-4" style={{ marginTop: 16 }}>
        <div className="grid grid-cols-3" style={{ gap: 6 }}>
          {entries.map(({ photo, ride }) => (
            <div key={photo.takenAt} className="relative" style={{ overflow: "hidden", boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }}>
              <img src={photo.dataUrl} alt="moment" className="w-full aspect-square object-cover" />
              {photo.caption && (
                <div className="absolute inset-x-0 bottom-0 truncate" style={{ padding: "4px 6px", fontSize: 9, color: "#fff", background: "linear-gradient(to top, rgba(20,16,8,0.85), transparent)" }} title={photo.caption}>{photo.caption}</div>
              )}
              <div className="absolute" style={{ top: 4, right: 4, fontSize: 8, color: "#fff", background: "rgba(20,16,8,0.6)", padding: "2px 5px" }}>{formatDate(ride.startedAt).slice(0, 5)}</div>
            </div>
          ))}
        </div>
      </div>
    </SheetShell>
  );
}
