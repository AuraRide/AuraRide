import { MessageCircle, CopyPlus, Check } from "lucide-react";
import { PIXEL_FONT, PIXEL_OUT, INK, INK_SOFT, STAIR } from "./pixelKit";

// 广场 post action row — 评论 + 复制路线到「待出行路线」.
// Lives inside a card whose body navigates to /post/:id, so both buttons stop
// propagation. `saved` flips the copy button into a confirmed/disabled state.
export default function PostActions({
  commentCount,
  saved,
  accent,
  onComment,
  onCopyRoute,
}: {
  commentCount: number;
  saved: boolean;
  accent: { fill: string; ink: string; tint: string; text: string };
  onComment: () => void;
  onCopyRoute: () => void;
}) {
  const base: React.CSSProperties = {
    flex: 1,
    height: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    cursor: "pointer",
    border: "none",
    fontFamily: PIXEL_FONT,
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: 1,
    clipPath: STAIR,
  };

  return (
    <div className="flex" style={{ gap: 8, marginTop: 12 }}>
      <button
        onClick={(e) => { e.stopPropagation(); onComment(); }}
        style={{ ...base, background: "#fffdf7", color: INK_SOFT, boxShadow: "inset 0 0 0 2px #cbbd99" }}
      >
        <MessageCircle size={15} />
        评论{commentCount > 0 ? ` ${commentCount}` : ""}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); if (!saved) onCopyRoute(); }}
        aria-disabled={saved}
        style={
          saved
            ? { ...base, background: accent.tint, color: accent.ink, boxShadow: "inset 0 0 0 2px " + accent.fill, cursor: "default" }
            : { ...base, background: accent.fill, color: accent.text, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT }
        }
      >
        {saved ? <Check size={15} /> : <CopyPlus size={15} />}
        {saved ? "已在待出行" : "复制路线"}
      </button>
    </div>
  );
}
