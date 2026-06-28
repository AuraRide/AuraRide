import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
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
  PixelBack,
} from "../components/pixelKit";
import { X } from "lucide-react";
import { repo, type RideRecord } from "../lib/rideRepo";
import { emotionMeta } from "../lib/journal";
import { buildWeave } from "../lib/weave";
import { renderWeaveCard } from "../lib/weaveImage";
import type { ColorId } from "../lib/moodColor";

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

// HERO — 行程色织物 / COLOR WEAVE.
// The post-ride destination (supersedes Review): a single ride becomes a woven
// pixel tapestry made from the colours it was actually ridden through, with the
// GPS track threaded across the cloth. This is the share/collect/own unit.

const PAGE_BG: Record<string, string> = {
  "calm-green": "linear-gradient(180deg, #f2eddd 0%, #e6efe2 55%, #dde9da 100%)",
  "release-red": "linear-gradient(180deg, #f4efe3 0%, #f3e6df 55%, #efddd4 100%)",
  "explore-yellow": "linear-gradient(180deg, #f4efe3 0%, #f3ecd6 55%, #efe6c9 100%)",
  "lonely-blue": "linear-gradient(180deg, #eef2f4 0%, #e3ecf4 55%, #dce7f2 100%)",
  "tired-gray": "linear-gradient(180deg, #f1f1ee 0%, #e9ebec 55%, #e2e5e6 100%)",
};

export default function ColorWeave() {
  const location = useLocation();
  const navigate = useNavigate();
  const colorId: string = location.state?.colorId || "explore-yellow";
  const distanceState: number = location.state?.distance ?? 0;
  const durationState: number = location.state?.duration ?? 0;
  const rideId: string | undefined = location.state?.rideId;
  const moodText: string | undefined = location.state?.moodText;

  const accent = CTA_COLORS[emotionToCtaColor(colorId as ColorId)];
  const meta = emotionMeta(colorId);

  // Load the full ride (track + per-photo colours) to weave from. If we can't
  // (direct nav / demo), synthesise a minimal ride so the cloth still renders.
  const [ride, setRide] = useState<RideRecord | null>(null);
  useEffect(() => {
    let alive = true;
    if (rideId) repo.getRide(rideId).then((r) => { if (alive) setRide(r); });
    return () => { alive = false; };
  }, [rideId]);

  const source: Pick<RideRecord, "id" | "photos" | "dominantColor" | "colorId" | "track"> = ride ?? {
    id: rideId || "demo",
    photos: [],
    dominantColor: meta.color,
    colorId,
    track: [],
  };

  const weave = useMemo(() => buildWeave(source), [source.id, ride]);

  const distance = ride?.distance ?? distanceState;
  const duration = ride?.duration ?? durationState;
  const minutes = Math.max(1, Math.floor((duration || 0) / 60));
  const photoCount = ride?.photos?.length ?? 0;

  const stats = [
    { value: distance ? distance.toFixed(2) : "—", label: "公里", unit: "km" },
    { value: String(minutes), label: "分钟", unit: "" },
    { value: String(photoCount), label: "采色", unit: "" },
  ];

  // ── share: render the branded card to PNG, then save / system-share ──
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const openShare = () => {
    const url = renderWeaveCard({
      weave,
      emotionCn: meta.cn,
      emotionEn: meta.en,
      accent: meta.color,
      distanceLabel: distance ? distance.toFixed(2) : "—",
      minutes,
      photoCount,
      moodText,
      dateLabel: fmtDate(ride?.startedAt ?? Date.now()),
    });
    if (url) setShareUrl(url);
  };
  const download = () => {
    if (!shareUrl) return;
    const a = document.createElement("a");
    a.href = shareUrl;
    a.download = `auraride-weave-${ride?.id ?? "demo"}.png`;
    a.click();
  };
  const systemShare = async () => {
    if (!shareUrl) return;
    try {
      const blob = await (await fetch(shareUrl)).blob();
      const file = new File([blob], "auraride-weave.png", { type: "image/png" });
      const nav = navigator as Navigator & { canShare?: (d: unknown) => boolean };
      if (nav.canShare && nav.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "我的色织", text: "用慢行收集世界的颜色 · AuraRide" });
      } else {
        download();
      }
    } catch {
      download();
    }
  };

  return (
    <div className="size-full overflow-y-auto relative" style={{ fontFamily: PIXEL_FONT, background: PAGE_BG[colorId] || PAGE_BG["tired-gray"], color: INK }}>
      <div className="relative z-10" style={{ padding: "44px 20px calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
        {/* top bar */}
        <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
          <PixelBack onClick={() => navigate("/")} />
          <div className="text-center">
            <div style={{ fontSize: 9, letterSpacing: 5, color: INK_FAINT, fontWeight: 600 }}>COLOR WEAVE</div>
            <div style={{ fontSize: 16, letterSpacing: 2, color: INK, fontWeight: 800, marginTop: 1 }}>这趟的色织</div>
          </div>
          <div style={{ width: 40 }} />
        </div>

        {/* the woven tapestry */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          style={{ background: PAPER, clipPath: STAIR, boxShadow: "inset 0 0 0 3px " + PIXEL_OUT, padding: 12, marginBottom: 14 }}
        >
          <svg viewBox={`0 0 ${weave.cols} ${weave.rows}`} width="100%" style={{ display: "block", shapeRendering: "crispEdges" }} preserveAspectRatio="xMidYMid meet">
            <rect x={0} y={0} width={weave.cols} height={weave.rows} fill="#efe7d6" />
            {weave.cells.map((c) => (
              <rect key={c.x + "-" + c.y} x={c.x + 0.06} y={c.y + 0.06} width={0.88} height={0.88} fill={c.color} />
            ))}
          </svg>
        </motion.div>

        {/* palette — the colours this ride was woven from */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="flex items-center"
          style={{ gap: 8, marginBottom: 14 }}
        >
          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 2, color: INK_SOFT, whiteSpace: "nowrap" }}>织自这趟的颜色</span>
          <div className="flex-1 flex" style={{ gap: 5 }}>
            {weave.palette.map((c, i) => (
              <span key={i} style={{ flex: 1, height: 18, background: c, clipPath: TOP_STAIR, boxShadow: "inset 0 0 0 1.5px rgba(58,40,23,0.18)" }} />
            ))}
          </div>
        </motion.div>

        {/* stats — distilled from the old Review */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24, duration: 0.5 }}
          className="grid grid-cols-3"
          style={{ background: "#fffdf7", clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, marginBottom: moodText ? 12 : 18 }}
        >
          {stats.map((s, i) => (
            <div key={s.label} style={{ padding: "13px 6px", textAlign: "center", boxShadow: i > 0 ? "inset 1px 0 0 0 rgba(58,40,23,0.16)" : "none" }}>
              <div className="flex items-baseline justify-center" style={{ gap: 3 }}>
                <div style={{ color: INK, fontSize: 24, fontWeight: 800 }}>{s.value}</div>
                {s.unit && <div style={{ color: INK_FAINT, fontSize: 9, fontWeight: 600 }}>{s.unit}</div>}
              </div>
              <div style={{ color: INK_SOFT, fontSize: 10, fontWeight: 600, letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </motion.div>

        {moodText && (
          <div style={{ textAlign: "center", color: INK_FAINT, fontSize: 12, lineHeight: 1.6, marginBottom: 18 }}>
            出发时你写下 · “{moodText}”
          </div>
        )}

        {/* actions */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32, duration: 0.5 }} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PixelButton
            onClick={openShare}
            fill={accent.fill}
            text={accent.text}
            height={54}
            fontSize={16}
            fontWeight={800}
            letter={4}
          >
            分享这幅色织
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={accent.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </PixelButton>
          <div style={{ display: "flex", gap: 12 }}>
            <PixelButton onClick={() => navigate("/colors")} flex={1} fill="#f6efdf" text={INK} height={48} fontSize={14} fontWeight={700} letter={3}>
              收入记忆
            </PixelButton>
            <PixelButton onClick={() => navigate("/")} flex={1} fill="#f6efdf" text={INK} height={48} fontSize={14} fontWeight={700} letter={3}>
              再次启程
            </PixelButton>
          </div>
        </motion.div>
      </div>

      {/* share sheet — the generated PNG card, ready to save / share out */}
      {shareUrl && (
        <div className="fixed inset-0 z-50" style={{ fontFamily: PIXEL_FONT }}>
          <div className="absolute inset-0" style={{ background: "rgba(20,16,8,0.55)" }} onClick={() => setShareUrl(null)} />
          <div
            className="pixel-pop absolute"
            style={{
              left: "50%",
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(86vw, 340px)",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              background: PAPER,
              clipPath: STAIR,
              boxShadow: "inset 0 0 0 3px " + PIXEL_OUT,
              padding: "16px 16px 18px",
            }}
          >
            <div className="flex items-center justify-between" style={{ flex: "none", marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 800, letterSpacing: 2, color: INK }}>分享色织</div>
              <button onClick={() => setShareUrl(null)} style={{ background: "none", border: "none", cursor: "pointer", color: INK_SOFT }}>
                <X size={18} />
              </button>
            </div>
            {/* image area flexes & scales the (tall) card to fit; buttons stay pinned below */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", justifyContent: "center", overflow: "hidden", marginBottom: 12 }}>
              <img src={shareUrl} alt="color weave card" style={{ display: "block", maxWidth: "100%", maxHeight: "100%", objectFit: "contain", boxShadow: "inset 0 0 0 3px " + PIXEL_OUT }} />
            </div>
            <PixelButton onClick={systemShare} fill={accent.fill} text={accent.text} height={48} fontSize={15} fontWeight={800} letter={3}>
              分享出去
            </PixelButton>
            <div style={{ height: 10 }} />
            <PixelButton onClick={download} fill="#f6efdf" text={INK} height={44} fontSize={14} fontWeight={700} letter={2}>
              保存图片
            </PixelButton>
            <div style={{ flex: "none", textAlign: "center", fontSize: 10, color: INK_FAINT, marginTop: 10, lineHeight: 1.6 }}>
              手机上「分享出去」可直达微信/相册；电脑端长按或「保存图片」
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
