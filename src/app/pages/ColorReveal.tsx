import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { analyzeMood, COLOR_PROFILES } from "../lib/moodColor";
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
} from "../components/pixelKit";
import SceneBackdrop from "./cycling/SceneBackdrop";

// Step 2: read the mood sentence, analyze it into one emotion color, and reveal
// it INSIDE that colour's bead riding world. "Describe in words" resolves into
// AuraRide's embroidered colour world; the reveal sits in a cream paper panel.

export default function ColorReveal() {
  const navigate = useNavigate();
  const location = useLocation();
  const moodText: string = location.state?.moodText || "";

  useEffect(() => {
    if (!moodText) navigate("/mood", { replace: true });
  }, [moodText, navigate]);

  const result = useMemo(() => analyzeMood(moodText), [moodText]);
  const profile = COLOR_PROFILES[result.colorId];
  const ctaColor = emotionToCtaColor(result.colorId);
  const accent = CTA_COLORS[ctaColor];

  const [phase, setPhase] = useState<"reading" | "reveal">("reading");
  useEffect(() => {
    const t = setTimeout(() => setPhase("reveal"), 2000);
    return () => clearTimeout(t);
  }, []);

  const start = () => navigate("/generate", { state: { colorId: result.colorId } });

  return (
    <div className="size-full overflow-hidden relative" style={{ fontFamily: PIXEL_FONT, background: accent.tint }}>
      {/* the matching emotion's bead riding world */}
      <SceneBackdrop color={ctaColor} />

      {phase === "reading" ? (
        <motion.div
          key="reading"
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-7 text-center"
          style={{ background: "rgba(20,16,8,0.30)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div
            className="pixel-spin"
            style={{
              width: 54,
              height: 54,
              marginBottom: 24,
              background: PAPER,
              clipPath: TOP_STAIR,
              boxShadow: "inset 0 0 0 3px " + accent.fill,
            }}
          />
          <p style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>正在读取你的颜色…</p>
          <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.82)", maxWidth: 280, lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
            “{moodText}”
          </p>
        </motion.div>
      ) : (
        <div
          key="reveal"
          className="pixel-pop"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            width: "min(88vw, 380px)",
            maxHeight: "82%",
            overflowY: "auto",
            zIndex: 10,
            background: PAPER,
            clipPath: STAIR,
            boxShadow: "inset 0 0 0 3px " + PIXEL_OUT,
            padding: "24px 22px",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 4, color: INK_SOFT }}>你今天的颜色是</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 8 }}>
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: 2, color: accent.fill, lineHeight: 1 }}>{profile.en}</span>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, color: INK }}>{profile.cn}</span>
            <span
              style={{
                marginLeft: "auto",
                width: 34,
                height: 34,
                background: profile.hex,
                clipPath: TOP_STAIR,
                boxShadow: "inset 0 0 0 3px " + PIXEL_OUT,
              }}
            />
          </div>

          <p style={{ marginTop: 16, fontSize: 15, fontWeight: 500, color: INK, lineHeight: 1.7 }}>{profile.line}</p>
          <p style={{ marginTop: 10, fontSize: 12, color: INK_FAINT, lineHeight: 1.6 }}>来自你的一句话 · “{moodText}”</p>

          <div style={{ marginTop: 20 }}>
            <PixelButton onClick={start} fill={accent.fill} text={accent.text} height={56} fontSize={18} letter={4}>
              沿着这个颜色出发
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </PixelButton>
          </div>
          <button
            onClick={() => navigate("/mood", { replace: true })}
            style={{ display: "block", width: "100%", marginTop: 14, background: "none", border: "none", cursor: "pointer", fontFamily: PIXEL_FONT, fontSize: 13, color: INK_FAINT }}
          >
            换一句话重新描述
          </button>
        </div>
      )}
    </div>
  );
}
