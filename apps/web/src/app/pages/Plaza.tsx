import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Heart, MoreHorizontal, Bookmark, Map as MapIcon, ChevronRight } from "lucide-react";
import { PIXEL_FONT, PIXEL_OUT, INK, INK_FAINT, INK_SOFT, STAIR, CTA_COLORS, emotionToCtaColor } from "../components/pixelKit";
import { emotionMeta } from "../lib/journal";
import PostActions from "../components/PostActions";
import CityAvatar from "../components/CityAvatar";
import { useSocial, COLORS } from "./social/useSocial";
import { SocialSheets } from "./social/sheets";
import { cityImage } from "../lib/cityImages";

// 广场 — the social side's DETAIL: the browsable feed of everyone's rides, with
// colour filtering, comments, copy-route and share. The bird's-eye summary of
// all this lives in 色彩地图 (one tap away, top of the page).
export default function Plaza() {
  const navigate = useNavigate();
  const s = useSocial();
  const [filter, setFilter] = useState<string | null>(null);

  const feedList = filter ? s.posts.filter((p) => p.colorId === filter) : s.posts;

  return (
    <div className="size-full overflow-y-auto relative" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #efe9dc 60%, #e9e2d2 100%)", color: INK }}>
      <div className="sticky top-0 z-10 px-5 pt-12 pb-3" style={{ background: "rgba(244,239,227,0.94)", boxShadow: "inset 0 -2px 0 0 rgba(58,40,23,0.12)" }}>
        <div className="flex items-center justify-between">
          <div style={{ width: 40 }} />
          <div className="text-center">
            <div style={{ fontSize: 10, letterSpacing: 5, color: INK_FAINT, fontWeight: 600 }}>PLAZA</div>
            <div style={{ fontSize: 16, letterSpacing: 3, color: INK, fontWeight: 800, marginTop: 2 }}>广场</div>
          </div>
          <button
            onClick={s.openSaved}
            aria-label="待出行路线"
            style={{ position: "relative", width: 40, height: 36, display: "grid", placeItems: "center", cursor: "pointer", border: "none", background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px #cbbd99", color: INK_SOFT }}
          >
            <Bookmark size={17} />
            {s.savedIds.size > 0 && (
              <span style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, padding: "0 3px", display: "grid", placeItems: "center", background: PIXEL_OUT, color: "#fff", fontSize: 10, fontWeight: 800, clipPath: STAIR }}>{s.savedIds.size}</span>
            )}
          </button>
        </div>

        {/* colour filter */}
        <div className="flex" style={{ gap: 6, marginTop: 12 }}>
          {[null, ...COLORS].map((c) => {
            const on = filter === c;
            const meta = c ? emotionMeta(c) : null;
            return (
              <button
                key={c || "all"}
                onClick={() => setFilter(c)}
                style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, padding: "7px 4px", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 11.5, fontWeight: on ? 800 : 600, clipPath: STAIR, background: on ? PIXEL_OUT : "#fffdf7", color: on ? "#fff" : INK_SOFT, boxShadow: on ? "none" : "inset 0 0 0 2px #cbbd99" }}
              >
                {meta && <span style={{ flex: "none", width: 9, height: 9, background: meta.color, clipPath: STAIR }} />}
                <span style={{ whiteSpace: "nowrap" }}>{meta ? meta.cn : "全部"}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-5" style={{ display: "flex", flexDirection: "column", gap: 16, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
        {/* up to the bird's-eye summary */}
        <button
          onClick={() => navigate("/map")}
          style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 14px", cursor: "pointer", border: "none", background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, fontFamily: PIXEL_FONT, textAlign: "left" }}
        >
          <span style={{ flex: "none", width: 34, height: 34, display: "grid", placeItems: "center", background: PIXEL_OUT, color: "#fff", clipPath: STAIR }}>
            <MapIcon size={17} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>看城市色谱 · 色彩地图</div>
            <div style={{ fontSize: 11, color: INK_FAINT, marginTop: 2 }}>所有人的颜色汇成的活体色谱</div>
          </div>
          <ChevronRight size={17} style={{ color: INK_FAINT }} />
        </button>

        {feedList.length === 0 ? (
          <div style={{ textAlign: "center", padding: "50px 0", color: INK_SOFT, fontSize: 13 }}>{s.posts.length === 0 ? "广场还空着 · 去骑一趟，发布第一段颜色" : "这个颜色还没有人发布"}</div>
        ) : (
          feedList.map((p, i) => {
            const meta = emotionMeta(p.colorId);
            const a = CTA_COLORS[emotionToCtaColor(p.colorId as any)];
            // user photo if any, otherwise a real city photo (never the grey blank)
            const cover = p.photoUrls[0] || cityImage(p.city, p.id);
            return (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: Math.min(i * 0.05, 0.3) }}
                onClick={() => navigate(`/post/${p.id}`)}
                style={{ background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, overflow: "hidden", cursor: "pointer" }}
              >
                <div style={{ position: "relative", height: 150, background: `linear-gradient(150deg, ${p.coverColor} 0%, ${meta.color}cc 60%, ${p.coverColor}88 100%)` }}>
                  <img src={cover} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                  <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,8,0.28) 0%, rgba(20,16,8,0) 32%, rgba(20,16,8,0) 70%, rgba(20,16,8,0.30) 100%)" }} />
                  {p.photoUrls.length > 1 && (
                    <div style={{ position: "absolute", bottom: 10, left: 10, background: "rgba(20,16,8,0.5)", clipPath: STAIR, padding: "3px 8px", color: "#fff", fontSize: 11, fontWeight: 800 }}>+{p.photoUrls.length - 1}</div>
                  )}
                  <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(20,16,8,0.45)", clipPath: STAIR, padding: "5px 9px" }}>
                    <span style={{ width: 9, height: 9, background: meta.color, clipPath: STAIR }} />
                    <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#fff" }}>{p.city}</span>
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); s.setMenuPost(p); }}
                    aria-label="更多"
                    style={{ position: "absolute", top: 8, right: 8, width: 32, height: 28, display: "grid", placeItems: "center", cursor: "pointer", border: "none", background: "rgba(20,16,8,0.45)", clipPath: STAIR, color: "#fff" }}
                  >
                    <MoreHorizontal size={16} />
                  </button>

                  <div style={{ position: "absolute", bottom: 10, right: 10, display: "flex", alignItems: "center", gap: 5, background: "rgba(20,16,8,0.45)", clipPath: STAIR, padding: "4px 8px", color: "#fff", fontSize: 11, fontWeight: 700 }}>
                    <Heart size={11} fill={p.likedByMe ? "#fff" : "none"} /> {p.likes}
                  </div>
                </div>

                <div style={{ padding: "12px 14px 14px" }}>
                  <div className="flex items-center" style={{ gap: 8 }}>
                    <span style={{ width: 22, height: 22, background: p.author.avatarColor, clipPath: STAIR, display: "grid", placeItems: "center", color: "#fff", fontSize: 11, fontWeight: 800 }}>{p.author.handle.slice(0, 1)}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: INK }}>{p.author.handle}</span>
                    <div className="flex items-center" style={{ gap: 6, marginLeft: "auto" }}>
                      <CityAvatar city={p.city} color={meta.color} size={22} />
                      <span style={{ fontSize: 11, color: INK_FAINT }}>{p.city}</span>
                    </div>
                  </div>
                  {p.caption && <div style={{ marginTop: 8, fontSize: 13, color: INK, lineHeight: 1.6 }}>{p.caption}</div>}
                  <div style={{ marginTop: 8, display: "flex", gap: 12, fontSize: 12, fontWeight: 700, color: a.ink }}>
                    <span>{p.distanceKm} km</span>
                    <span style={{ color: INK_FAINT }}>·</span>
                    <span>{p.durationMin} 分钟</span>
                  </div>
                  <PostActions
                    commentCount={s.counts[p.id] || 0}
                    saved={s.savedIds.has(p.id)}
                    accent={a}
                    onComment={() => s.openComments(p)}
                    onCopyRoute={() => s.copyRoute(p)}
                  />
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      <SocialSheets s={s} />
    </div>
  );
}
