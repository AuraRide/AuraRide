import { Trash2, Link2, X, Send } from "lucide-react";
import { PIXEL_FONT, PIXEL_OUT, PAPER, INK, INK_SOFT, INK_FAINT, STAIR, TOP_STAIR } from "../../components/pixelKit";
import { emotionMeta } from "../../lib/journal";
import { ME, type useSocial } from "./useSocial";
import { TAB_BAR_H } from "../../components/TabShell";
import { cityImage } from "../../lib/cityImages";

// AirDrop-style glyph for the "Apple 好友" target
function AirDrop() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
      <path d="M6.5 13.5a7.5 7.5 0 0 1 11 0" />
      <path d="M9 11a4 4 0 0 1 6 0" />
      <path d="M12 20l-2.6-4.2h5.2z" fill="#fff" stroke="none" />
    </svg>
  );
}

type Social = ReturnType<typeof useSocial>;

export function RouteRibbon({ shape }: { shape: [number, number][] }) {
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

// All the post-interaction sheets shared by 色彩地图 and 广场, driven by the
// useSocial() hook passed in. Rendered once at the bottom of each page.
export function SocialSheets({ s }: { s: Social }) {
  return (
    <>
      {/* share — centred modal: small title + preview image + platform buttons */}
      {s.menuPost && (() => {
        const post = s.menuPost;
        const meta = emotionMeta(post.colorId);
        const cover = post.photoUrls[0] || cityImage(post.city, post.id);
        const mine = post.author.id === ME;
        const TARGETS = [
          ["wechat", "微信", "#3a9b4e", "微"],
          ["qq", "QQ", "#2f6fd6", "Q"],
          ["xiaohongshu", "小红书", "#ff2442", "书"],
          ["apple", "Apple 好友", "#2b2b2e", ""],
        ] as const;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 110, fontFamily: PIXEL_FONT }}>
            <div onClick={() => s.setMenuPost(null)} style={{ position: "absolute", inset: 0, background: "rgba(20,16,8,0.5)" }} />
            <div className="pixel-pop" style={{ position: "absolute", left: "50%", top: "50%", width: "min(82%, 350px)", background: PAPER, clipPath: STAIR, boxShadow: "inset 0 0 0 3px " + PIXEL_OUT, padding: "18px 20px 22px" }}>
              {/* title */}
              <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
                <span style={{ fontSize: 17, fontWeight: 800, color: INK }}>分享给朋友</span>
                <button onClick={() => s.setMenuPost(null)} style={{ background: "none", border: "none", cursor: "pointer", color: INK_FAINT }}><X size={18} /></button>
              </div>

              {/* preview image */}
              <div style={{ position: "relative", height: 150, overflow: "hidden", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, marginBottom: 18 }}>
                <img src={cover} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,8,0.30) 0%, rgba(20,16,8,0) 40%, rgba(20,16,8,0) 55%, rgba(20,16,8,0.55) 100%)" }} />
                <div style={{ position: "absolute", top: 10, left: 10, display: "flex", alignItems: "center", gap: 6, background: "rgba(20,16,8,0.45)", clipPath: STAIR, padding: "5px 9px" }}>
                  <span style={{ width: 9, height: 9, background: meta.color, clipPath: STAIR }} />
                  <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1, color: "#fff" }}>{post.city}</span>
                </div>
                <div style={{ position: "absolute", left: 12, right: 12, bottom: 9, color: "#fff" }}>
                  <div style={{ fontSize: 13, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{post.caption || `${meta.cn} 的一段骑行`}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.85, marginTop: 2 }}>{post.distanceKm} km · {post.durationMin} 分钟 · 光屿骑行</div>
                </div>
              </div>

              {/* platform targets */}
              <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                {TARGETS.map(([t, label, color, glyph]) => (
                  <button key={t} onClick={() => s.share(t)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", fontFamily: PIXEL_FONT }}>
                    <span style={{ width: 54, height: 54, background: color, clipPath: STAIR, display: "grid", placeItems: "center", color: "#fff", boxShadow: "inset 0 0 0 3px " + PIXEL_OUT }}>
                      {glyph ? <span style={{ fontSize: 23, fontWeight: 800 }}>{glyph}</span> : <AirDrop />}
                    </span>
                    <span style={{ fontSize: 11.5, fontWeight: 700, color: INK, whiteSpace: "nowrap" }}>{label}</span>
                  </button>
                ))}
              </div>

              {/* copy link */}
              <button onClick={() => s.share("copy")} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 46, cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 14, fontWeight: 700, letterSpacing: 1, color: INK_SOFT, background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px #cbbd99" }}>
                <Link2 size={16} /> 复制链接
              </button>

              {mine && (
                <button onClick={s.doDelete} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 46, marginTop: 10, cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 14, fontWeight: 800, letterSpacing: 1, color: "#b5392c", background: "transparent", clipPath: STAIR, boxShadow: "inset 0 0 0 2px rgba(178,53,44,0.5)" }}>
                  <Trash2 size={15} /> 删除这条
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* comment sheet */}
      {s.commentPost && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, fontFamily: PIXEL_FONT }}>
          <div onClick={() => s.setCommentPost(null)} style={{ position: "absolute", inset: 0, background: "rgba(20,16,8,0.5)" }} />
          <div
            className="pixel-sheet-up"
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "78%", display: "flex", flexDirection: "column", background: PAPER, clipPath: TOP_STAIR, boxShadow: "inset 0 4px 0 0 " + PIXEL_OUT, padding: `16px 20px calc(env(safe-area-inset-bottom, 0px) + ${TAB_BAR_H + 16}px)` }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: INK }}>评论 {s.comments.length > 0 ? s.comments.length : ""}</span>
              <button onClick={() => s.setCommentPost(null)} style={{ background: "none", border: "none", cursor: "pointer", color: INK_FAINT }}><X size={18} /></button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, marginBottom: 12 }}>
              {s.comments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: INK_FAINT, fontSize: 13 }}>还没有评论 · 来说第一句</div>
              ) : (
                s.comments.map((c) => (
                  <div key={c.id} className="flex" style={{ gap: 10 }}>
                    <span style={{ flex: "none", width: 28, height: 28, background: c.author.avatarColor, clipPath: STAIR, display: "grid", placeItems: "center", color: "#fff", fontSize: 12, fontWeight: 800 }}>{c.author.handle.slice(0, 1)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: INK }}>{c.author.handle}</div>
                      <div style={{ fontSize: 13, color: INK, lineHeight: 1.6, marginTop: 2 }}>{c.text}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex" style={{ gap: 8, alignItems: "stretch" }}>
              <input
                value={s.commentText}
                onChange={(e) => s.setCommentText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") s.sendComment(); }}
                placeholder="说点什么…"
                style={{ flex: 1, minWidth: 0, height: 44, padding: "0 14px", fontFamily: PIXEL_FONT, fontSize: 14, color: INK, background: "#fffdf7", border: "2px solid #cbbd99", borderRadius: 0, outline: "none", boxSizing: "border-box" }}
              />
              <button
                onClick={s.sendComment}
                disabled={!s.commentText.trim()}
                style={{ flex: "none", width: 56, display: "grid", placeItems: "center", cursor: s.commentText.trim() ? "pointer" : "default", border: "none", background: s.commentText.trim() ? PIXEL_OUT : "#cbbd99", color: "#fff", clipPath: STAIR }}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 待出行路线 sheet */}
      {s.savedSheet && (
        <div style={{ position: "fixed", inset: 0, zIndex: 110, fontFamily: PIXEL_FONT }}>
          <div onClick={() => s.setSavedSheet(false)} style={{ position: "absolute", inset: 0, background: "rgba(20,16,8,0.5)" }} />
          <div
            className="pixel-sheet-up"
            style={{ position: "absolute", left: 0, right: 0, bottom: 0, maxHeight: "78%", display: "flex", flexDirection: "column", background: PAPER, clipPath: TOP_STAIR, boxShadow: "inset 0 4px 0 0 " + PIXEL_OUT, padding: `16px 20px calc(env(safe-area-inset-bottom, 0px) + ${TAB_BAR_H + 16}px)` }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: INK }}>待出行路线 {s.savedRoutes.length > 0 ? s.savedRoutes.length : ""}</span>
              <button onClick={() => s.setSavedSheet(false)} style={{ background: "none", border: "none", cursor: "pointer", color: INK_FAINT }}><X size={18} /></button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              {s.savedRoutes.length === 0 ? (
                <div style={{ textAlign: "center", padding: "28px 0", color: INK_FAINT, fontSize: 13 }}>还没有收藏路线 · 在广场「复制路线」加进来</div>
              ) : (
                s.savedRoutes.map((r) => (
                  <div key={r.id} className="flex items-center" style={{ gap: 10, background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, padding: "10px 12px" }}>
                    <span style={{ flex: "none", width: 26, height: 26, background: r.coverColor, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: INK }}>{r.city}</div>
                      <div style={{ fontSize: 11, color: INK_FAINT, marginTop: 2 }}>{r.distanceKm} km · {r.durationMin} 分钟</div>
                    </div>
                    <button onClick={() => s.removeSaved(r)} aria-label="移除" style={{ flex: "none", width: 34, height: 34, display: "grid", placeItems: "center", cursor: "pointer", border: "none", background: "transparent", color: INK_FAINT }}>
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {s.toast && (
        <div style={{ position: "fixed", left: "50%", bottom: "12%", transform: "translateX(-50%)", zIndex: 70, fontFamily: PIXEL_FONT, fontSize: 13, fontWeight: 700, color: "#fff", background: "rgba(20,16,8,0.85)", clipPath: STAIR, padding: "10px 18px", whiteSpace: "nowrap" }}>
          {s.toast}
        </div>
      )}
    </>
  );
}
