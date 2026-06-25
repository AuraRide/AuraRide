import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
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
  PixelField,
  PixelChip,
  PixelBack,
} from "../components/pixelKit";
import SceneBackdrop from "./cycling/SceneBackdrop";

// Step 1 (merged) — write one sentence about how you feel, and it resolves inline
// into 今日色彩基调: the colour that themes this journey. (Mood = the journey's
// lens / author's intent, NOT a verdict on you — the ride's real colours come
// from the road.) Formerly two pages (MoodEntry → ColorReveal); now one.

const EXAMPLES = [
  "今天有点累，只想一个人安静地骑一会儿",
  "阳光很好，想出去走走看看",
  "压力好大，需要狠狠发泄一下",
  "心很乱，想让一切慢下来",
];

const MAX = 60;
const ACCENT = CTA_COLORS.yellow;

export default function MoodEntry() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<"input" | "reading" | "reveal">("input");
  const trimmed = text.trim();

  const result = useMemo(() => (phase === "input" ? null : analyzeMood(trimmed)), [phase, trimmed]);
  const profile = result ? COLOR_PROFILES[result.colorId] : null;
  const ctaColor = result ? emotionToCtaColor(result.colorId) : "yellow";
  const accent = result ? CTA_COLORS[ctaColor] : ACCENT;

  const submit = () => {
    if (!trimmed) return;
    setPhase("reading");
  };

  useEffect(() => {
    if (phase !== "reading") return;
    const t = setTimeout(() => setPhase("reveal"), 1500);
    return () => clearTimeout(t);
  }, [phase]);

  const start = () => {
    if (result) navigate("/generate", { state: { colorId: result.colorId } });
  };

  return (
    <div className="size-full overflow-hidden relative" style={{ fontFamily: PIXEL_FONT, background: phase === "input" ? "#efe9dc" : accent.tint }}>
      {/* live bead riding world behind everything — recolours to the matched mood */}
      <SceneBackdrop color={phase === "input" ? "yellow" : ctaColor} />

      {/* soft scrim so panels read cleanly off the scene */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,8,0) 40%, rgba(20,16,8,0.16) 100%)", pointerEvents: "none", zIndex: 5 }} />

      {/* top bar over the scene */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12">
        <PixelBack onClick={() => (phase === "input" ? navigate("/") : setPhase("input"))} />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 4, color: INK, textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>光屿骑行</span>
        <div style={{ width: 40 }} />
      </div>

      {/* ── INPUT ── */}
      {phase === "input" && (
        <div
          className="pixel-pop"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
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
          <h1 style={{ fontSize: 27, lineHeight: 1.25, fontWeight: 800, letterSpacing: 1, color: INK, margin: 0 }}>
            今天，你是什么颜色？
          </h1>
          <p style={{ marginTop: 8, marginBottom: 18, fontSize: 14, fontWeight: 500, color: INK_SOFT }}>
            用一句话写下此刻的心情——它会成为这趟旅程的色彩基调。
          </p>

          <PixelField value={text} onChange={(v) => setText(v.slice(0, MAX))} placeholder="比如：今天有点累，只想一个人安静地骑一会儿" accent={ACCENT.fill} multiline />
          <div style={{ marginTop: 6, textAlign: "right", fontSize: 12, color: INK_FAINT }}>
            {trimmed.length}/{MAX}
          </div>

          <div className="flex flex-wrap gap-2" style={{ marginTop: 10 }}>
            {EXAMPLES.map((ex) => (
              <PixelChip key={ex} onClick={() => setText(ex)} accent={ACCENT.fill}>
                {ex.length > 12 ? ex.slice(0, 12) + "…" : ex}
              </PixelChip>
            ))}
          </div>

          <div style={{ marginTop: 18 }}>
            <PixelButton onClick={submit} disabled={!trimmed} fill={ACCENT.fill} text={ACCENT.text} height={56} fontSize={18} letter={4}>
              生成我的颜色
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={ACCENT.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </PixelButton>
          </div>
        </div>
      )}

      {/* ── READING ── */}
      {phase === "reading" && (
        <motion.div
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-7 text-center"
          style={{ background: "rgba(20,16,8,0.30)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <div className="pixel-spin" style={{ width: 54, height: 54, marginBottom: 24, background: PAPER, clipPath: TOP_STAIR, boxShadow: "inset 0 0 0 3px " + accent.fill }} />
          <p style={{ fontSize: 16, fontWeight: 700, letterSpacing: 3, color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>正在读取你的颜色…</p>
          <p style={{ marginTop: 12, fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.82)", maxWidth: 280, lineHeight: 1.6, textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>
            “{trimmed}”
          </p>
        </motion.div>
      )}

      {/* ── REVEAL ── */}
      {phase === "reveal" && profile && (
        <div
          className="pixel-pop"
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%, -50%)",
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
          <div style={{ fontSize: 13, fontWeight: 600, letterSpacing: 4, color: INK_SOFT }}>今天的色彩基调</div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginTop: 8 }}>
            <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: 2, color: accent.fill, lineHeight: 1 }}>{profile.en}</span>
            <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, color: INK }}>{profile.cn}</span>
            <span style={{ marginLeft: "auto", width: 34, height: 34, background: profile.hex, clipPath: TOP_STAIR, boxShadow: "inset 0 0 0 3px " + PIXEL_OUT }} />
          </div>

          <div className="flex items-center" style={{ gap: 8, marginTop: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: INK }}>{profile.place}</span>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: accent.ink, background: accent.tint, clipPath: STAIR, padding: "3px 8px" }}>{profile.feel}</span>
          </div>
          <p style={{ marginTop: 10, fontSize: 15, fontWeight: 500, color: INK, lineHeight: 1.7 }}>{profile.line}</p>
          <p style={{ marginTop: 10, fontSize: 12, color: INK_FAINT, lineHeight: 1.6 }}>来自你的一句话 · “{trimmed}”</p>

          <div style={{ marginTop: 20 }}>
            <PixelButton onClick={start} fill={accent.fill} text={accent.text} height={56} fontSize={18} letter={4}>
              沿着这个颜色出发
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={accent.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </PixelButton>
          </div>
          <button
            onClick={() => setPhase("input")}
            style={{ display: "block", width: "100%", marginTop: 14, background: "none", border: "none", cursor: "pointer", fontFamily: PIXEL_FONT, fontSize: 13, color: INK_FAINT }}
          >
            换一句话重新描述
          </button>
        </div>
      )}
    </div>
  );
}
