import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Leaf } from "lucide-react";
import {
  PIXEL_FONT,
  PIXEL_OUT,
  INK,
  INK_SOFT,
  INK_FAINT,
  STAIR,
  CTA_COLORS,
  emotionToCtaColor,
  PixelButton,
} from "../components/pixelKit";

const closingMessages: Record<string, { en: string; cn: string; impression: string[]; note: string }> = {
  "calm-green": { en: "MOSS", cn: "顺应风向，把心跳交还给潮汐。", impression: ["顺风", "轻松巡航", "城市漫游"], note: "风景早已等候，你只是按时抵达。" },
  "release-red": { en: "EMBER", cn: "撕开风阻，让不安在直道上彻底燃尽。", impression: ["逆风", "高强冲刺", "直道燃尽"], note: "不安已被甩在身后，呼吸归于平稳。" },
  "explore-yellow": { en: "TRACE", cn: "循迹宽街，在建筑的折痕里听长回声。", impression: ["微风", "节奏巡游", "街巷穿行"], note: "宽街收纳了你的轨迹，回声仍在延展。" },
  "lonely-blue": { en: "DEPTH", cn: "潜入暗流，将喧嚣沉降于底面。", impression: ["静风", "稳速下沉", "深处独行"], note: "喧嚣已沉入水底，你浮回了自己。" },
  "tired-gray": { en: "VOID", cn: "隐入网格，做一阵没有轨迹的风。", impression: ["顺风", "轻松巡航", "网格漫游"], note: "你不必被看见，也已经抵达。" },
};

// per-emotion cream backdrop, harmonised with the bead scenes
const PAGE_BG: Record<string, string> = {
  "calm-green": "linear-gradient(180deg, #f2eddd 0%, #e6efe2 55%, #dde9da 100%)",
  "release-red": "linear-gradient(180deg, #f4efe3 0%, #f3e6df 55%, #efddd4 100%)",
  "explore-yellow": "linear-gradient(180deg, #f4efe3 0%, #f3ecd6 55%, #efe6c9 100%)",
  "lonely-blue": "linear-gradient(180deg, #eef2f4 0%, #e3ecf4 55%, #dce7f2 100%)",
  "tired-gray": "linear-gradient(180deg, #f1f1ee 0%, #e9ebec 55%, #e2e5e6 100%)",
};

export default function Review() {
  const location = useLocation();
  const navigate = useNavigate();
  const colorId = location.state?.colorId || "calm-green";
  const distance = location.state?.distance || 2.4;
  const duration = location.state?.duration || 60;
  const rideId: string | undefined = location.state?.rideId;

  const accent = CTA_COLORS[emotionToCtaColor(colorId)];
  const message = closingMessages[colorId] || closingMessages["calm-green"];
  const minutes = Math.max(1, Math.floor(duration / 60));
  const pace = ((duration / 60) / Math.max(distance, 0.01)).toFixed(1);

  const card: React.CSSProperties = { background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT };

  return (
    <div className="size-full overflow-hidden relative" style={{ fontFamily: PIXEL_FONT, background: PAGE_BG[colorId] || PAGE_BG["tired-gray"], color: INK }}>
      {/* faint cross-stitch grid */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          opacity: 0.5,
          backgroundImage: "repeating-linear-gradient(0deg, rgba(58,40,23,0.03) 0 1px, transparent 1px 9px), repeating-linear-gradient(90deg, rgba(58,40,23,0.03) 0 1px, transparent 1px 9px)",
        }}
      />

      <div className="relative z-10 h-full flex flex-col" style={{ padding: "44px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
        {/* title */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="text-center" style={{ marginBottom: 18 }}>
          <div style={{ color: accent.fill, fontSize: 26, fontWeight: 800, letterSpacing: 6 }}>{message.en}</div>
          <div style={{ color: INK_SOFT, fontSize: 13, fontWeight: 500, letterSpacing: 1, marginTop: 6 }}>{message.cn}</div>
        </motion.div>

        {/* distance card */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5 }} style={{ ...card, padding: "18px 20px", marginBottom: 14 }}>
          <div style={{ textAlign: "center", color: accent.ink, fontSize: 11, fontWeight: 700, letterSpacing: 4, marginBottom: 4 }}>本次骑行已完成</div>
          <div className="flex items-baseline justify-center" style={{ gap: 8 }}>
            <div style={{ color: INK, fontSize: 66, fontWeight: 800, lineHeight: 1, letterSpacing: -2 }}>{distance.toFixed(2)}</div>
            <div style={{ color: accent.fill, fontSize: 22, fontWeight: 700 }}>km</div>
          </div>
          <div style={{ textAlign: "center", color: INK_SOFT, fontSize: 12, fontWeight: 500, marginTop: 4 }}>{minutes} 分钟</div>
        </motion.div>

        {/* route wave */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.6 }} className="relative" style={{ height: 70, marginBottom: 14 }}>
          <svg viewBox="0 0 320 76" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <path d="M 20 56 Q 70 18, 110 36 Q 160 60, 200 24 Q 250 0, 300 40" fill="none" stroke={accent.fill} strokeWidth="3" strokeLinecap="round" strokeDasharray="3 5" opacity="0.85" />
            {[{ x: 20, y: 56 }, { x: 110, y: 36 }, { x: 200, y: 24 }, { x: 300, y: 40 }].map((p, i) => (
              <rect key={i} x={p.x - 4} y={p.y - 4} width="8" height="8" fill={accent.fill} />
            ))}
          </svg>
          <div style={{ position: "absolute", left: 0, bottom: 0, color: INK_FAINT, fontSize: 10, fontWeight: 600, letterSpacing: 2 }}>起点</div>
          <div style={{ position: "absolute", right: 0, bottom: 0, color: INK_FAINT, fontSize: 10, fontWeight: 600, letterSpacing: 2 }}>终点</div>
        </motion.div>

        {/* stats row */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.5 }} className="grid grid-cols-3" style={{ ...card, marginBottom: 12 }}>
          {[
            { value: pace, label: "平均配速", unit: "min/km" },
            { value: "3", label: "打卡数", unit: "" },
            { value: "80", label: "平均心率", unit: "bpm" },
          ].map((s, i) => (
            <div key={s.label} style={{ padding: "12px 6px", textAlign: "center", boxShadow: i > 0 ? "inset 1px 0 0 0 rgba(58,40,23,0.16)" : "none" }}>
              <div className="flex items-baseline justify-center" style={{ gap: 3 }}>
                <div style={{ color: INK, fontSize: 22, fontWeight: 800 }}>{s.value}</div>
                {s.unit && <div style={{ color: INK_FAINT, fontSize: 9, fontWeight: 600 }}>{s.unit}</div>}
              </div>
              <div style={{ color: INK_SOFT, fontSize: 10, fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* impression card */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36, duration: 0.5 }} style={{ ...card, padding: "13px 14px", marginBottom: 18 }}>
          <div className="flex items-center" style={{ gap: 8, marginBottom: 8 }}>
            <Leaf size={13} style={{ color: accent.fill }} />
            <div style={{ color: INK_SOFT, fontSize: 11, fontWeight: 700, letterSpacing: 2 }}>骑行印象</div>
            <div className="flex-1 flex justify-end" style={{ gap: 6 }}>
              {message.impression.map((tag) => (
                <span key={tag} style={{ color: accent.ink, background: accent.tint, boxShadow: "inset 0 0 0 1.5px " + accent.fill, clipPath: STAIR, fontSize: 9, fontWeight: 700, letterSpacing: 1, padding: "3px 7px" }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div style={{ color: INK, fontSize: 12, fontWeight: 500, lineHeight: 1.7 }}>{message.note}</div>
        </motion.div>

        {/* buttons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44, duration: 0.5 }} className="mt-auto" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PixelButton onClick={() => navigate("/share", { state: { rideId, colorId, distance, duration, moodText: location.state?.moodText } })} fill={accent.fill} text={accent.text} height={54} fontSize={16} fontWeight={800} letter={4}>
            生成分享卡
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </PixelButton>
          <div style={{ display: "flex", gap: 12 }}>
            <PixelButton onClick={() => navigate("/colors")} flex={1} fill="#f6efdf" text={INK} height={48} fontSize={14} fontWeight={700} letter={3}>
              查看旅程
            </PixelButton>
            <PixelButton onClick={() => navigate("/")} flex={1} fill="#f6efdf" text={INK} height={48} fontSize={14} fontWeight={700} letter={3}>
              再次启程
            </PixelButton>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
