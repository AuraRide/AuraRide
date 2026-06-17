// pixelKit.tsx — shared "像素刺绣" UI language, extracted from the cycling start
// screen (SceneCTA) so every page can speak the same visual dialect: chunky
// stair-cornered pixel buttons with hard offset shadows, warm cream paper panels,
// bold PingFang type, dark-thread outlines, and the same five emotion accents.
//
// Sizing here is in REAL screen px (the start screen draws in a scaled 1080-wide
// stage; ordinary pages don't), tuned to read identically on a phone.

import React from "react";
import type { ColorId } from "../lib/moodColor";

export type CtaColor = "red" | "yellow" | "green" | "gray" | "blue";

export const PIXEL_FONT = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Heiti SC",sans-serif';
export const PIXEL_OUT = "#3a2817"; // dark thread outline (matches the rider outline)
export const PAPER = "#f7f1e4"; // warm cream sheet
export const PAPER_2 = "#fffdf7"; // brighter input paper
export const PAPER_LINE = "#cbbd99"; // muted paper border
export const INK = "#3c3526"; // primary text on paper
export const INK_SOFT = "#6b5d45"; // secondary text on paper
export const INK_FAINT = "#a89a80"; // tertiary / hints

// the five accents — identical to the start screen + AuraRide's emotion colours
export const CTA_COLORS: Record<CtaColor, { fill: string; deep: string; text: string; ink: string; tint: string }> = {
  red: { fill: "#d23b2c", deep: "#a02418", text: "#fff", ink: "#7d1a12", tint: "#f6e3df" },
  yellow: { fill: "#eba81b", deep: "#c98708", text: "#5a3d00", ink: "#8a5e06", tint: "#f7eccf" },
  gray: { fill: "#7c858d", deep: "#5b636a", text: "#fff", ink: "#444b52", tint: "#e7e9ea" },
  blue: { fill: "#2f6fd6", deep: "#1f54ad", text: "#fff", ink: "#173e84", tint: "#dde6f6" },
  green: { fill: "#3a9b4e", deep: "#2a7a3a", text: "#fff", ink: "#1d5e2c", tint: "#dcefe0" },
};

// AuraRide emotion colourId → pixel accent (1:1 with the five scenes)
const EMOTION_TO_CTA: Record<ColorId, CtaColor> = {
  "release-red": "red",
  "lonely-blue": "blue",
  "calm-green": "green",
  "explore-yellow": "yellow",
  "tired-gray": "gray",
};
export function emotionToCtaColor(colorId: ColorId | undefined | null): CtaColor {
  return (colorId && EMOTION_TO_CTA[colorId]) || "yellow";
}

// stair-stepped "pixel" corner silhouettes
export const STAIR =
  "polygon(0 8px,4px 8px,4px 4px,8px 4px,8px 0," +
  "calc(100% - 8px) 0,calc(100% - 8px) 4px,calc(100% - 4px) 4px,calc(100% - 4px) 8px,100% 8px," +
  "100% calc(100% - 8px),calc(100% - 4px) calc(100% - 8px),calc(100% - 4px) calc(100% - 4px),calc(100% - 8px) calc(100% - 4px),calc(100% - 8px) 100%," +
  "8px 100%,8px calc(100% - 4px),4px calc(100% - 4px),4px calc(100% - 8px),0 calc(100% - 8px))";
export const TOP_STAIR =
  "polygon(0 10px,5px 10px,5px 5px,10px 5px,10px 0," +
  "calc(100% - 10px) 0,calc(100% - 10px) 5px,calc(100% - 5px) 5px,calc(100% - 5px) 10px,100% 10px," +
  "100% 100%,0 100%)";

// ── chunky pixel button ──────────────────────────────────────────────
export function PixelButton({
  onClick,
  children,
  fill = PIXEL_OUT,
  text = "#fff",
  outline = PIXEL_OUT,
  height = 52,
  fontSize = 17,
  fontWeight = 800,
  letter = 3,
  flex,
  disabled,
  style,
}: {
  onClick?: () => void;
  children: React.ReactNode;
  fill?: string;
  text?: string;
  outline?: string;
  height?: number;
  fontSize?: number;
  fontWeight?: number;
  letter?: number;
  flex?: number;
  disabled?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ position: "relative", flex, opacity: disabled ? 0.45 : 1, ...style }}>
      <div style={{ position: "absolute", inset: 0, transform: "translate(3px,5px)", background: outline, clipPath: STAIR, zIndex: 0 }} />
      <button
        onClick={onClick}
        disabled={disabled}
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          height,
          border: "none",
          cursor: disabled ? "not-allowed" : "pointer",
          background: fill,
          color: text,
          fontFamily: PIXEL_FONT,
          fontSize,
          fontWeight,
          letterSpacing: letter,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          clipPath: STAIR,
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
          boxShadow: "inset 0 0 0 2px " + outline + ", inset 4px 4px 0 0 rgba(255,255,255,0.22), inset -4px -5px 0 0 rgba(0,0,0,0.15)",
        }}
      >
        {children}
      </button>
    </div>
  );
}

// ── cream paper panel with stair corners + inset outline ─────────────
export function PixelPanel({ children, style, bg = PAPER, outline = PIXEL_OUT }: { children?: React.ReactNode; style?: React.CSSProperties; bg?: string; outline?: string }) {
  return (
    <div
      style={{
        position: "relative",
        background: bg,
        clipPath: STAIR,
        boxShadow: "inset 0 0 0 2px " + outline,
        fontFamily: PIXEL_FONT,
        color: INK,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── labelled paper input ─────────────────────────────────────────────
export function PixelField({
  label,
  value,
  onChange,
  placeholder,
  accent,
  type = "text",
  multiline,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  accent: string;
  type?: string;
  multiline?: boolean;
}) {
  const [focus, setFocus] = React.useState(false);
  const shared: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 15px",
    fontSize: 16,
    fontFamily: PIXEL_FONT,
    color: INK,
    background: PAPER_2,
    border: "2px solid " + (focus ? accent : PAPER_LINE),
    borderRadius: 0,
    outline: "none",
    boxShadow: "inset 2px 2px 0 0 rgba(58,40,23," + (focus ? "0.10" : "0.05") + ")",
    transition: "border-color .15s",
    resize: "none",
  };
  return (
    <label style={{ display: "block" }}>
      {label && <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: INK_SOFT, marginBottom: 7, fontFamily: PIXEL_FONT }}>{label}</span>}
      {multiline ? (
        <textarea value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} rows={3} style={shared} />
      ) : (
        <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} onFocus={() => setFocus(true)} onBlur={() => setFocus(false)} style={shared} />
      )}
    </label>
  );
}

// ── small stair-cornered chip ────────────────────────────────────────
export function PixelChip({ children, onClick, active, accent }: { children: React.ReactNode; onClick?: () => void; active?: boolean; accent: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: PIXEL_FONT,
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 1,
        padding: "8px 12px",
        cursor: "pointer",
        border: "2px solid " + (active ? accent : PAPER_LINE),
        background: active ? accent : "transparent",
        color: active ? "#fff" : INK_SOFT,
        clipPath: STAIR,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {children}
    </button>
  );
}

// ── back button (stair-cornered paper square) ────────────────────────
export function PixelBack({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label="返回"
      style={{
        position: "relative",
        width: 40,
        height: 40,
        border: "none",
        cursor: "pointer",
        background: PAPER,
        color: INK,
        clipPath: STAIR,
        boxShadow: "inset 0 0 0 2px " + PIXEL_OUT,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 5l-7 7 7 7" />
      </svg>
    </button>
  );
}
