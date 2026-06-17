import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { PIXEL_FONT, PIXEL_OUT, INK, INK_SOFT, INK_FAINT, STAIR, CTA_COLORS, emotionToCtaColor, PixelBack } from "../components/pixelKit";
import { emotionMeta } from "../lib/journal";
import { repo, type Post } from "../lib/rideRepo";

// 广场 / 发现 — browse other riders' beautiful routes + colours. Filter by colour.
// Reads repo.listFeed (local seed now, backend later — same interface).

const COLORS = ["calm-green", "lonely-blue", "explore-yellow", "release-red", "tired-gray"];

function RouteRibbon({ shape, color }: { shape: [number, number][]; color: string }) {
  const d = shape.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${(x * 100).toFixed(1)} ${(y * 100).toFixed(1)}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
      <path d={d} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3" />
      {shape.filter((_, i) => i === 0 || i === shape.length - 1).map(([x, y], i) => (
        <rect key={i} x={x * 100 - 2} y={y * 100 - 2} width="4" height="4" fill="#fff" />
      ))}
    </svg>
  );
}

export default function Discover() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    repo.listFeed(filter ? { colorId: filter } : undefined).then(setPosts);
  }, [filter]);

  return (
    <div className="size-full overflow-y-auto relative" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #efe9dc 60%, #e9e2d2 100%)", color: INK }}>
      <div className="sticky top-0 z-10 px-5 pt-12 pb-3" style={{ background: "rgba(244,239,227,0.94)", boxShadow: "inset 0 -2px 0 0 rgba(58,40,23,0.12)" }}>
        <div className="flex items-center justify-between">
          <PixelBack onClick={() => navigate("/")} />
          <div className="text-center">
            <div style={{ fontSize: 10, letterSpacing: 5, color: INK_FAINT, fontWeight: 600 }}>DISCOVER</div>
            <div style={{ fontSize: 16, letterSpacing: 3, color: INK, fontWeight: 800, marginTop: 2 }}>颜色广场</div>
          </div>
          <div style={{ width: 40 }} />
        </div>

        {/* colour filter */}
        <div className="flex" style={{ gap: 8, marginTop: 14, overflowX: "auto", paddingBottom: 2 }}>
          {[null, ...COLORS].map((c) => {
            const on = filter === c;
            const meta = c ? emotionMeta(c) : null;
            return (
              <button
                key={c || "all"}
                onClick={() => setFilter(c)}
                style={{ flex: "none", display: "flex", alignItems: "center", gap: 6, padding: "7px 12px", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 12, fontWeight: on ? 800 : 600, clipPath: STAIR, background: on ? PIXEL_OUT : "#fffdf7", color: on ? "#fff" : INK_SOFT, boxShadow: on ? "none" : "inset 0 0 0 2px #cbbd99" }}
              >
                {meta && <span style={{ width: 9, height: 9, background: meta.color, clipPath: STAIR }} />}
                {meta ? meta.cn : "全部"}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-5" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: INK_SOFT, fontSize: 13 }}>这个颜色还没有人发布</div>
        ) : (
          posts.map((p, i) => {
            const meta = emotionMeta(p.colorId);
            const a = CTA_COLORS[emotionToCtaColor(p.colorId as any)];
            return (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
                onClick={() => navigate(`/post/${p.id}`)}
                className="w-full text-left"
                style={{ background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, border: "none", overflow: "hidden", cursor: "pointer" }}
              >
                {/* cover */}
                <div style={{ position: "relative", height: 150, background: `linear-gradient(150deg, ${p.coverColor} 0%, ${meta.color}cc 60%, ${p.coverColor}88 100%)` }}>
                  <RouteRibbon shape={p.routeShape} color={p.coverColor} />
                  <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(20,16,8,0.45)", clipPath: STAIR, padding: "5px 9px" }}>
                    <span style={{ width: 9, height: 9, background: meta.color, clipPath: STAIR }} />
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#fff" }}>{meta.cn} / {meta.en}</span>
                  </div>
                  <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", alignItems: "center", gap: 5, background: "rgba(20,16,8,0.45)", clipPath: STAIR, padding: "4px 8px", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                    <Heart size={11} fill={p.likedByMe ? "#fff" : "none"} /> {p.likes}
                  </div>
                </div>

                {/* meta */}
                <div style={{ padding: "12px 14px 14px" }}>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <span style={{ width: 22, height: 22, background: p.author.avatarColor, clipPath: STAIR, display: "grid", placeItems: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>{p.author.handle.slice(0, 1)}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>{p.author.handle}</span>
                    <span style={{ fontSize: 11, color: INK_FAINT, marginLeft: "auto" }}>{p.city}</span>
                  </div>
                  {p.caption && <div style={{ marginTop: 8, fontSize: 13, color: INK, lineHeight: 1.6 }}>{p.caption}</div>}
                  <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 12, fontWeight: 700, color: a.ink }}>
                    <span>{p.distanceKm} km</span>
                    <span style={{ color: INK_FAINT }}>·</span>
                    <span>{p.durationMin} 分钟</span>
                  </div>
                </div>
              </motion.button>
            );
          })
        )}
      </div>
    </div>
  );
}
