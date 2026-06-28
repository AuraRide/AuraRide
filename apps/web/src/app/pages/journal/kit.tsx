import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { MapPin, Sparkles, Users, X, LogIn } from "lucide-react";
import { RidePhoto, RideRecord, emotionMeta } from "../../lib/journal";
import { getAccount } from "../../lib/session";
import KidAvatar from "../../components/KidAvatar";
import {
  PIXEL_FONT,
  PIXEL_OUT,
  PAPER,
  INK,
  INK_SOFT,
  INK_FAINT,
  STAIR,
  CTA_COLORS,
  emotionToCtaColor,
  PixelButton,
} from "../../components/pixelKit";

// Shared building blocks for the two personal tabs — 颜色记忆 (ColorMemory) and
// 骑行日志 (Training). Both sit behind the same profile header (which shows the
// 登录 / 注册 entry when signed out) and draw from the same ride records.

export type Tab = "rides" | "colors" | "summary";

export const COLOR_BUCKETS: Array<"calm-green" | "lonely-blue" | "explore-yellow" | "release-red" | "tired-gray"> = [
  "calm-green", "lonely-blue", "explore-yellow", "release-red", "tired-gray",
];

export const acc = (id: string) => CTA_COLORS[emotionToCtaColor(id as any)];
export const card: React.CSSProperties = { background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT };

export function formatDate(ts: number) {
  const d = new Date(ts);
  return `${(d.getMonth() + 1).toString().padStart(2, "0")}.${d.getDate().toString().padStart(2, "0")} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export type Scope = "day" | "week" | "month" | "year";
export const DAY_MS = 86400000;
export const p2 = (n: number) => n.toString().padStart(2, "0");
export function startOfDay(ts: number) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
export function startOfWeek(ts: number) { const d = new Date(startOfDay(ts)); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day); return d.getTime(); }
export function inScope(ts: number, scope: Scope, nowTs: number) {
  const d = new Date(ts), now = new Date(nowTs);
  if (scope === "day") return startOfDay(ts) === startOfDay(nowTs);
  if (scope === "week") { const s = startOfWeek(nowTs); return ts >= s && ts < s + 7 * DAY_MS; }
  if (scope === "month") return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  return d.getFullYear() === now.getFullYear();
}
export function scopeLabel(scope: Scope, nowTs: number) {
  const now = new Date(nowTs);
  if (scope === "day") return `${now.getFullYear()}.${p2(now.getMonth() + 1)}.${p2(now.getDate())}`;
  if (scope === "week") { const s = new Date(startOfWeek(nowTs)); const e = new Date(startOfWeek(nowTs) + 6 * DAY_MS); return `${p2(s.getMonth() + 1)}.${p2(s.getDate())} – ${p2(e.getMonth() + 1)}.${p2(e.getDate())}`; }
  if (scope === "month") return `${now.getFullYear()}.${p2(now.getMonth() + 1)}`;
  return `${now.getFullYear()}`;
}
export const SCOPE_LABELS: Record<Scope, string> = { day: "今日", week: "本周", month: "本月", year: "本年" };

// ── shared header: who's riding (or a sign-in entry) ──────────────────
export function ProfileHeader({ subtitle }: { subtitle: string }) {
  const navigate = useNavigate();
  const account = getAccount();
  return (
    <div className="flex items-center" style={{ height: 44, gap: 12 }}>
      <KidAvatar size={44} bg={account ? CTA_COLORS.yellow.tint : "#f6efdf"} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: 1, color: INK }}>{account || "未登录的骑行者"}</div>
        <div style={{ fontSize: 11, color: INK_FAINT, marginTop: 2 }}>{subtitle}</div>
      </div>
      {!account && (
        <button
          onClick={() => navigate("/login")}
          style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", cursor: "pointer", border: "none", background: PIXEL_OUT, color: "#fff", clipPath: STAIR, fontFamily: PIXEL_FONT, fontSize: 12, fontWeight: 800, letterSpacing: 1 }}
        >
          <LogIn size={14} /> 登录 / 注册
        </button>
      )}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <div style={{ fontSize: 16, fontWeight: 800, lineHeight: 1, color: INK }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: 3, color: INK_FAINT, marginTop: 4, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1, color: INK }}>{value}</div>
      <div style={{ fontSize: 9, letterSpacing: 2, color: INK_FAINT, marginTop: 5, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: INK_SOFT }}>{children}</div>;
}
function PB({ value, unit, label }: { value: string; unit: string; label: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 2 }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: INK }}>{value}</span>
        <span style={{ fontSize: 10, fontWeight: 700, color: INK_FAINT }}>{unit}</span>
      </div>
      <div style={{ fontSize: 9, letterSpacing: 1, color: INK_FAINT, marginTop: 5, fontWeight: 600 }}>{label}</div>
    </div>
  );
}

// Training log — weekly mileage trend, personal bests, and a per-ride table.
// All derived from the rides we already store (distance / duration / startedAt
// / maxSpeedKmh); nothing fabricated.
export function TrainingLog({ rides }: { rides: RideRecord[] }) {
  const totalKm = rides.reduce((a, r) => a + r.distance, 0);
  const totalSec = rides.reduce((a, r) => a + r.duration, 0);
  const avgKmh = totalSec > 0 ? (totalKm * 3600) / totalSec : 0;

  const nowWeek = startOfWeek(Date.now());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const ws = nowWeek - (7 - i) * 7 * DAY_MS;
    const km = rides.filter((r) => r.startedAt >= ws && r.startedAt < ws + 7 * DAY_MS).reduce((a, r) => a + r.distance, 0);
    return { ws, km };
  });
  const maxWeekKm = Math.max(1, ...weeks.map((w) => w.km));

  const byDist = [...rides].sort((a, b) => b.distance - a.distance)[0];
  const byDur = [...rides].sort((a, b) => b.duration - a.duration)[0];
  const fastest = [...rides]
    .filter((r) => r.duration > 60)
    .map((r) => ({ r, kmh: (r.distance * 3600) / r.duration }))
    .sort((a, b) => b.kmh - a.kmh)[0];

  const recent = [...rides].sort((a, b) => b.startedAt - a.startedAt);
  const fmtDur = (sec: number) => `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: PIXEL_FONT }}>
      <div style={{ ...card, padding: "16px 18px", display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
        <MiniStat value={totalKm.toFixed(1)} label="累计 km" />
        <MiniStat value={`${Math.round(totalSec / 60)}`} label="累计分钟" />
        <MiniStat value={`${rides.length}`} label="次数" />
        <MiniStat value={avgKmh.toFixed(1)} label="均速 km/h" />
      </div>

      <div style={{ ...card, padding: "16px 18px" }}>
        <SectionTitle>周里程趋势 · 近 8 周</SectionTitle>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 100, marginTop: 12 }}>
          {weeks.map((w, i) => {
            const h = Math.round((w.km / maxWeekKm) * 80);
            const isNow = i === weeks.length - 1;
            const d = new Date(w.ws);
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: w.km > 0 ? INK_SOFT : "transparent", height: 11 }}>{w.km > 0 ? w.km.toFixed(0) : "·"}</div>
                <div style={{ width: "100%", height: Math.max(3, h), background: isNow ? INK : "#cbbd99", clipPath: STAIR }} />
                <div style={{ fontSize: 8, color: INK_FAINT }}>{p2(d.getMonth() + 1)}.{p2(d.getDate())}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...card, padding: "16px 18px" }}>
        <SectionTitle>个人最佳</SectionTitle>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 12 }}>
          <PB value={byDist ? byDist.distance.toFixed(1) : "–"} unit="km" label="最长距离" />
          <PB value={fastest ? fastest.kmh.toFixed(1) : "–"} unit="km/h" label="最快均速" />
          <PB value={byDur ? `${Math.round(byDur.duration / 60)}` : "–"} unit="分钟" label="最长时长" />
        </div>
      </div>

      <div>
        <SectionTitle>单次记录</SectionTitle>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
          {recent.map((r) => {
            const a = acc(r.colorId);
            const kmh = r.duration > 0 ? (r.distance * 3600) / r.duration : 0;
            return (
              <div key={r.id} style={{ ...card, padding: "11px 13px", display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 10, height: 10, background: emotionMeta(r.colorId).color, clipPath: STAIR, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>{r.distance.toFixed(2)} km</div>
                  <div style={{ fontSize: 10, color: INK_FAINT, marginTop: 2 }}>{formatDate(r.startedAt)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: a.ink }}>{fmtDur(r.duration)}</div>
                  <div style={{ fontSize: 10, color: INK_SOFT, marginTop: 2 }}>{kmh.toFixed(1)} km/h{r.maxSpeedKmh ? ` · 峰 ${r.maxSpeedKmh.toFixed(0)}` : ""}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({ onStart, onSeed }: { onStart: () => void; onSeed?: () => void }) {
  return (
    <div className="text-center" style={{ padding: "60px 0" }}>
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

export function RidesList({ rides, onOpen }: { rides: RideRecord[]; onOpen: (r: RideRecord) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {rides.map((ride) => (
        <motion.button key={ride.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} onClick={() => onOpen(ride)} className="w-full text-left" style={{ ...card, overflow: "hidden", border: "none" }}>
          <div className="flex items-start justify-between" style={{ gap: 12, padding: "14px 14px 10px" }}>
            <div>
              <div className="flex items-center" style={{ gap: 8 }}>
                <span style={{ width: 10, height: 10, background: ride.dominantColor, clipPath: STAIR }} />
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: INK }}>{formatDate(ride.startedAt)}</span>
              </div>
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
      ))}
    </div>
  );
}

export function ColorBuckets({ photosByColor, onOpen }: { photosByColor: Record<string, Array<{ photo: RidePhoto; ride: RideRecord }>>; onOpen: (colorId: string) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {COLOR_BUCKETS.map((c) => {
        const meta = emotionMeta(c);
        const items = photosByColor[c] || [];
        return (
          <button key={c} onClick={() => items.length > 0 && onOpen(c)} disabled={items.length === 0} className="w-full text-left" style={{ ...card, overflow: "hidden", border: "none", opacity: items.length > 0 ? 1 : 0.45, cursor: items.length > 0 ? "pointer" : "default" }}>
            <div className="flex items-center justify-between" style={{ padding: "12px 14px" }}>
              <div className="flex items-center" style={{ gap: 12 }}>
                <span style={{ width: 28, height: 28, background: meta.color, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }} />
                <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>这一色</div>
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

export function SummaryView({ buckets, total, scope, onScope, onOpenColor }: {
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
      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={() => navigate("/overview")} className="flex-1 flex items-center justify-between" style={{ ...card, padding: "14px 16px", border: "none", cursor: "pointer" }}>
          <div className="text-left">
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: INK }}>旅程全览</div>
            <div style={{ fontSize: 10, letterSpacing: 1, color: INK_SOFT, marginTop: 4 }}>照片汇成动画</div>
          </div>
          <Sparkles size={18} style={{ color: domAcc.fill }} />
        </button>
        <button onClick={() => navigate("/plaza")} className="flex-1 flex items-center justify-between" style={{ ...card, padding: "14px 16px", border: "none", cursor: "pointer" }}>
          <div className="text-left">
            <div style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: INK }}>去广场</div>
            <div style={{ fontSize: 10, letterSpacing: 1, color: INK_SOFT, marginTop: 4 }}>看别人的颜色</div>
          </div>
          <Users size={18} style={{ color: domAcc.fill }} />
        </button>
      </div>

      <div className="flex" style={{ gap: 8 }}>
        {(["day", "week", "month", "year"] as Scope[]).map((sc) => {
          const on = scope === sc;
          return (
            <button key={sc} onClick={() => onScope(sc)} style={{ flex: 1, padding: "8px 0", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 12, fontWeight: on ? 800 : 600, letterSpacing: 1, clipPath: STAIR, background: on ? PIXEL_OUT : "#fffdf7", color: on ? "#fff" : INK_SOFT, boxShadow: on ? "none" : "inset 0 0 0 2px #cbbd99" }}>
              {SCOPE_LABELS[sc]}
            </button>
          );
        })}
      </div>
      <div className="text-center" style={{ fontSize: 11, letterSpacing: 3, color: INK_FAINT, fontWeight: 600 }}>{label}</div>

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
                      <span style={{ width: 16, height: 16, background: b.meta.color, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }} />
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
    <div className="fixed inset-0" style={{ zIndex: 110, fontFamily: PIXEL_FONT }}>
      <div className="absolute inset-0" style={{ background: "rgba(20,16,8,0.5)" }} onClick={onClose} />
      <div
        className="pixel-pop"
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: "88%",
          maxHeight: "82%",
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

export function RideDetailSheet({ ride, onClose, onDelete }: { ride: RideRecord; onClose: () => void; onDelete: () => void }) {
  const navigate = useNavigate();
  const a = acc(ride.colorId);
  const [confirm, setConfirm] = useState(false);
  return (
    <SheetShell accentFill={a.fill} onClose={onClose}>
      <div className="px-5 flex items-start justify-between">
        <div>
          <div className="flex items-center" style={{ gap: 8 }}>
            <span style={{ width: 11, height: 11, background: ride.dominantColor, clipPath: STAIR }} />
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: INK }}>{formatDate(ride.startedAt)}</span>
          </div>
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

      <div className="px-5" style={{ marginTop: 18 }}>
        <PixelButton onClick={() => navigate("/weave", { state: { rideId: ride.id, colorId: ride.colorId, distance: ride.distance, duration: ride.duration, moodText: ride.moodText } })} fill={a.fill} text={a.text} height={50} fontSize={15} fontWeight={800} letter={3}>
          看这趟的色织
        </PixelButton>
      </div>

      <div className="px-5" style={{ marginTop: 12 }}>
        <PixelButton onClick={() => navigate("/share", { state: { rideId: ride.id, colorId: ride.colorId, distance: ride.distance, duration: ride.duration, moodText: ride.moodText } })} fill="#f6efdf" text={INK} height={46} fontSize={14} fontWeight={700} letter={3}>
          生成分享卡 / 发布到广场
        </PixelButton>
      </div>

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

export function ColorPhotoSheet({ colorId, entries, onClose }: { colorId: string; entries: Array<{ photo: RidePhoto; ride: RideRecord }>; onClose: () => void }) {
  const meta = emotionMeta(colorId);
  const a = acc(colorId);
  return (
    <SheetShell accentFill={a.fill} onClose={onClose}>
      <div className="px-5 flex items-center justify-between">
        <div className="flex items-center" style={{ gap: 10 }}>
          <span style={{ width: 22, height: 22, background: meta.color, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 1, color: INK }}>这一色的印象</div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: a.ink, marginTop: 2, fontWeight: 600 }}>{entries.length} 张</div>
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
