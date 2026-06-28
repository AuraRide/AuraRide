import { useNavigate } from "react-router";
import { Bookmark, Users, ChevronRight } from "lucide-react";
import { PIXEL_FONT, PIXEL_OUT, INK, INK_FAINT, INK_SOFT, STAIR } from "../components/pixelKit";
import { emotionMeta } from "../lib/journal";
import CityAvatar from "../components/CityAvatar";
import { useSocial } from "./social/useSocial";
import { SocialSheets } from "./social/sheets";

// 色彩地图 — the social side's OVERVIEW. It aggregates everyone's rides into the
// community 色织 (proportional spectrum + mosaic) and a per-city 色谱: the more
// people ride, the richer the map (the network-effect moat made visible). The
// detail — individual posts — lives one tap away in 广场.
export default function ColorMap() {
  const navigate = useNavigate();
  const s = useSocial();

  return (
    <div className="size-full overflow-y-auto relative" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #efe9dc 60%, #e9e2d2 100%)", color: INK }}>
      <div className="sticky top-0 z-10 px-5 pt-12 pb-3" style={{ background: "rgba(244,239,227,0.94)", boxShadow: "inset 0 -2px 0 0 rgba(58,40,23,0.12)" }}>
        <div className="flex items-center justify-between">
          <div style={{ width: 40 }} />
          <div className="text-center">
            <div style={{ fontSize: 10, letterSpacing: 5, color: INK_FAINT, fontWeight: 600 }}>COLOR MAP</div>
            <div style={{ fontSize: 16, letterSpacing: 3, color: INK, fontWeight: 800, marginTop: 2 }}>城市色彩</div>
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
      </div>

      <div className="px-5 py-5" style={{ display: "flex", flexDirection: "column", gap: 22, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
        {s.posts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: INK_SOFT, fontSize: 13 }}>地图还空着 · 去骑一趟，点亮第一块颜色</div>
        ) : (
          <>
            {/* community colour composition — what colours everyone is riding */}
            <div>
              <div className="flex items-baseline" style={{ gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: INK }}>社区色织</span>
                <span style={{ fontSize: 11, color: INK_FAINT }}>{s.posts.length} 段骑行的颜色构成</span>
              </div>

              <div style={{ display: "flex", height: 30, clipPath: STAIR, overflow: "hidden", boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }}>
                {s.composition.map((c) => (
                  <div key={c.id} title={`${c.meta.cn} · ${c.count} 段`} style={{ flex: c.count, background: c.meta.color }} />
                ))}
              </div>

              <div className="flex flex-wrap" style={{ gap: 12, marginTop: 10 }}>
                {s.composition.map((c) => (
                  <div key={c.id} className="flex items-center" style={{ gap: 5 }}>
                    <span style={{ width: 10, height: 10, background: c.meta.color, clipPath: STAIR, flex: "none" }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: INK_SOFT }}>{c.count}</span>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 4, padding: 10, background: "#efe7d6", clipPath: STAIR, boxShadow: "inset 0 0 0 3px " + PIXEL_OUT }}>
                {s.mosaic.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate(`/post/${p.id}`)}
                    title={`${emotionMeta(p.colorId).cn} · ${p.city}`}
                    style={{ aspectRatio: "1 / 1", background: p.coverColor, border: "none", cursor: "pointer", clipPath: STAIR, boxShadow: "inset 0 0 0 1.5px rgba(58,40,23,0.18)" }}
                  />
                ))}
              </div>
              <div style={{ marginTop: 6, fontSize: 10, color: INK_FAINT, textAlign: "right" }}>每格一段骑行 · 点开看</div>
            </div>

            {/* enter the feed — the map is the summary, 广场 is the detail */}
            <button
              onClick={() => navigate("/plaza")}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 16px", cursor: "pointer", border: "none", background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, fontFamily: PIXEL_FONT, textAlign: "left" }}
            >
              <span style={{ flex: "none", width: 38, height: 38, display: "grid", placeItems: "center", background: PIXEL_OUT, color: "#fff", clipPath: STAIR }}>
                <Users size={19} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: INK }}>去广场看全部动态</div>
                <div style={{ fontSize: 11, color: INK_FAINT, marginTop: 2 }}>每段骑行的照片、路线与评论</div>
              </div>
              <ChevronRight size={18} style={{ color: INK_FAINT }} />
            </button>

            {/* per-city colour spectrum */}
            <div>
              <div className="flex items-baseline" style={{ gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: 1, color: INK }}>城市色谱</span>
                <span style={{ fontSize: 11, color: INK_FAINT }}>每座城市的色性</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {s.cities.map((c) => (
                  <div key={c.city} style={{ background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, padding: "12px 14px" }}>
                    <div className="flex items-center" style={{ gap: 10, marginBottom: 9 }}>
                      <CityAvatar city={c.city} color={c.main} size={36} />
                      <span style={{ fontSize: 14, fontWeight: 800, color: INK }}>{c.city}</span>
                      <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: INK_FAINT }}>{c.count} 段</span>
                    </div>
                    <div style={{ display: "flex", height: 16, clipPath: STAIR, overflow: "hidden", boxShadow: "inset 0 0 0 1.5px rgba(58,40,23,0.15)" }}>
                      {c.colors.map((col, i) => (
                        <span key={i} style={{ flex: 1, background: col }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      <SocialSheets s={s} />
    </div>
  );
}
