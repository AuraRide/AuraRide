import { useState } from "react";
import { useNavigate } from "react-router";
import {
  PIXEL_FONT,
  PIXEL_OUT,
  PAPER,
  INK,
  INK_SOFT,
  INK_FAINT,
  STAIR,
  CTA_COLORS,
  PixelButton,
  PixelField,
  PixelChip,
  PixelBack,
} from "../components/pixelKit";
import SceneBackdrop from "./cycling/SceneBackdrop";

// Step 1 of the flow: the user writes, in one sentence, how they feel today.
// DEMO of the "珠绣场景背景" direction: a live bead riding world (赭黄/alley)
// fills the screen; the form sits in a stair-cornered cream paper panel on top.
// Pre-colour the accent is the warm 赭黄 (yellow) exploration mood.

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
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed) return;
    navigate("/color", { state: { moodText: trimmed } });
  };

  return (
    <div className="size-full overflow-hidden relative" style={{ fontFamily: PIXEL_FONT, background: "#efe9dc" }}>
      {/* live bead riding world behind everything */}
      <SceneBackdrop color="yellow" />

      {/* soft scrim so the paper panel reads cleanly off the scene */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,16,8,0) 40%, rgba(20,16,8,0.16) 100%)", pointerEvents: "none", zIndex: 5 }} />

      {/* top bar over the scene */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12">
        <PixelBack onClick={() => navigate("/")} />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 4, color: INK, textShadow: "0 1px 0 rgba(255,255,255,0.5)" }}>光屿骑行</span>
        <div style={{ width: 40 }} />
      </div>

      {/* form — centered floating card */}
      <div
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
        <h1 style={{ fontSize: 27, lineHeight: 1.25, fontWeight: 800, letterSpacing: 1, color: INK, margin: 0 }}>
          今天，你是什么颜色？
        </h1>
        <p style={{ marginTop: 8, marginBottom: 18, fontSize: 14, fontWeight: 500, color: INK_SOFT }}>用一句话，写下此刻的心情。</p>

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
    </div>
  );
}
