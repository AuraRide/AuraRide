import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { Heart } from "lucide-react";
import { PIXEL_FONT, PIXEL_OUT, PAPER, INK, INK_SOFT, INK_FAINT, STAIR, CTA_COLORS, emotionToCtaColor, PixelBack } from "../components/pixelKit";
import { emotionMeta } from "../lib/journal";
import { COLOR_PROFILES, type ColorId } from "../lib/moodColor";
import { repo, type Post } from "../lib/rideRepo";
import { buildWeave } from "../lib/weave";

export default function PostDetail() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    if (id) repo.getPost(id).then(setPost);
  }, [id]);

  // rebuild this rider's weave from the post's palette + route shape
  const weave = useMemo(() => {
    if (!post) return null;
    return buildWeave({
      id: post.id,
      photos: (post.palette ?? []).map((c) => ({ color: c, dataUrl: "", takenAt: 0 })),
      dominantColor: emotionMeta(post.colorId).color,
      colorId: post.colorId,
      track: post.routeShape.map(([x, y]) => ({ lat: y, lng: x })),
    });
  }, [post]);

  if (!post) {
    return (
      <div className="size-full flex items-center justify-center" style={{ fontFamily: PIXEL_FONT, background: "#efe9dc", color: INK_SOFT }}>
        加载中…
      </div>
    );
  }

  const meta = emotionMeta(post.colorId);
  const a = CTA_COLORS[emotionToCtaColor(post.colorId as any)];
  const profile = COLOR_PROFILES[post.colorId as ColorId];
  const d = post.routeShape.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${(x * 100).toFixed(1)} ${(y * 100).toFixed(1)}`).join(" ");

  const like = async () => setPost(await repo.toggleLike(post.id));

  return (
    <div className="size-full overflow-y-auto relative" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #e9e2d2 100%)", color: INK }}>
      {/* cover — real photo when the post has one, else the route placeholder */}
      <div style={{ position: "relative", height: 320, background: `linear-gradient(160deg, ${post.coverColor} 0%, ${meta.color}cc 55%, ${post.coverColor}77 100%)` }}>
        {post.photoUrls.length > 0 ? (
          <>
            <img src={post.photoUrls[0]} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,8,0.30) 0%, rgba(20,16,8,0) 30%, rgba(20,16,8,0) 55%, rgba(20,16,8,0.45) 100%)" }} />
          </>
        ) : (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            <path d={d} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="2 3" />
            {post.routeShape.filter((_, i) => i === 0 || i === post.routeShape.length - 1).map(([x, y], i) => (
              <rect key={i} x={x * 100 - 2} y={y * 100 - 2} width="4" height="4" fill="#fff" />
            ))}
          </svg>
        )}
        <div className="absolute" style={{ top: 48, left: 20 }}>
          <PixelBack onClick={() => navigate(-1)} />
        </div>
        <div className="absolute" style={{ left: 20, right: 20, bottom: 18 }}>
          <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1, color: "#fff", textShadow: "0 2px 12px rgba(0,0,0,0.45)" }}>{post.city}</div>
        </div>
      </div>

      <div className="px-5" style={{ paddingTop: 18, paddingBottom: 30 }}>
        {/* author */}
        <div className="flex items-center" style={{ gap: 10, marginBottom: 16 }}>
          <span style={{ width: 36, height: 36, background: post.author.avatarColor, clipPath: STAIR, display: "grid", placeItems: "center", color: "#fff", fontSize: 16, fontWeight: 800 }}>{post.author.handle.slice(0, 1)}</span>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: INK }}>{post.author.handle}</div>
            <div style={{ fontSize: 11, color: INK_FAINT, marginTop: 2 }}>{post.city}</div>
          </div>
          <motion.button whileTap={{ scale: 0.92 }} onClick={like} className="flex items-center" style={{ marginLeft: "auto", gap: 6, padding: "8px 14px", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 13, fontWeight: 800, clipPath: STAIR, background: post.likedByMe ? a.fill : "#fffdf7", color: post.likedByMe ? a.text : INK, boxShadow: post.likedByMe ? "none" : "inset 0 0 0 2px " + PIXEL_OUT }}>
            <Heart size={14} fill={post.likedByMe ? a.text : "none"} /> {post.likes}
          </motion.button>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2" style={{ background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, marginBottom: 16 }}>
          {[["距离", `${post.distanceKm} km`], ["时长", `${post.durationMin} 分钟`]].map(([l, v], i) => (
            <div key={l} style={{ textAlign: "center", padding: "16px 0", boxShadow: i === 0 ? "inset -1px 0 0 0 rgba(58,40,23,0.16)" : "none" }}>
              <div style={{ fontSize: 24, fontWeight: 800, color: INK }}>{v}</div>
              <div style={{ fontSize: 11, letterSpacing: 2, color: INK_SOFT, marginTop: 5, fontWeight: 600 }}>{l}</div>
            </div>
          ))}
        </div>

        {(post.caption || post.moodText) && (
          <div style={{ background: a.tint, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, padding: "14px 16px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, color: INK, lineHeight: 1.7 }}>{post.caption || post.moodText}</div>
            {profile?.line && <div style={{ fontSize: 12, color: a.ink, marginTop: 8 }}>{profile.line}</div>}
          </div>
        )}

        {/* TA 的色织 — this rider's weave, rebuilt from the post's palette + route */}
        {weave && (
          <div style={{ marginBottom: 16 }}>
            <div className="flex items-baseline" style={{ gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: INK }}>TA 的色织</span>
              <span style={{ fontSize: 11, color: INK_FAINT }}>这趟织出的颜色</span>
            </div>
            <div style={{ background: PAPER, clipPath: STAIR, boxShadow: "inset 0 0 0 3px " + PIXEL_OUT, padding: 10 }}>
              <svg viewBox={`0 0 ${weave.cols} ${weave.rows}`} width="100%" style={{ display: "block", shapeRendering: "crispEdges" }} preserveAspectRatio="xMidYMid meet">
                <rect x={0} y={0} width={weave.cols} height={weave.rows} fill="#efe7d6" />
                {weave.cells.map((c) => (
                  <rect key={`${c.x}-${c.y}`} x={c.x + 0.06} y={c.y + 0.06} width={0.88} height={0.88} fill={c.color} />
                ))}
              </svg>
            </div>
            <div className="flex" style={{ gap: 5, marginTop: 8 }}>
              {weave.palette.map((col, i) => (
                <span key={i} style={{ flex: 1, height: 14, background: col, boxShadow: "inset 0 0 0 1.5px rgba(58,40,23,0.18)" }} />
              ))}
            </div>
          </div>
        )}

        {post.photoUrls.length > 0 && (
          <div className="grid grid-cols-2" style={{ gap: 8 }}>
            {post.photoUrls.map((u, i) => (
              <div key={i} style={{ overflow: "hidden", boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }}>
                <img src={u} alt="" className="w-full aspect-square object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
