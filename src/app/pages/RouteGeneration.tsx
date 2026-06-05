import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import mapBgGreen from "../../imports/image.png";
import mapBgGray from "../../imports/image-4.png";
import mapBgBlue from "../../imports/image-7.png";
import mapBgYellow from "../../imports/image-9.png";
import mapBgRed from "../../imports/image-11.png";

const mapBgByColor: Record<string, string> = {
  "calm-green": mapBgGreen,
  "tired-gray": mapBgGray,
  "release-red": mapBgRed,
  "explore-yellow": mapBgYellow,
  "lonely-blue": mapBgBlue,
};

const emotionMeta: Record<string, { cn: string; en: string; tags: string[]; description: string }> = {
  "tired-gray": {
    cn: "灰白",
    en: "VOID",
    tags: ["低干扰路段", "城市探索", "适合夜骑"],
    description: "适合在节奏拖滞、想要短暂消失时的轻度骑行。",
  },
  "lonely-blue": {
    cn: "深蓝",
    en: "DEPTH",
    tags: ["沿海岸线", "安静路段", "适合独行"],
    description: "适合独处沉思、需要把喧嚣交还给海面的时刻。",
  },
  "calm-green": {
    cn: "暗绿",
    en: "MOSS",
    tags: ["公园绿道", "缓坡路段", "适合放松"],
    description: "适合需要松弛节奏、把心跳交回潮汐的恢复性骑行。",
  },
  "explore-yellow": {
    cn: "赭黄",
    en: "TRACE",
    tags: ["历史街区", "宽街林荫", "适合白天"],
    description: "适合从容探索街区肌理、收集长回声的中等强度骑行。",
  },
  "release-red": {
    cn: "余火",
    en: "EMBER",
    tags: ["主干直道", "强度训练", "适合冲刺"],
    description: "适合需要在直道上彻底燃尽不安的高强度释放骑行。",
  },
};

const routeData: Record<string, any> = {
  "calm-green": {
    color: "#34E89E",
    accentColor: "#2EBE82",
    slogan: "顺应风向，把心跳交还给潮汐。",
    distance: "10.3",
    duration: "32",
    checkpoints: 3,
  },
  "release-red": {
    color: "#FF3344",
    accentColor: "#B87A7A",
    slogan: "撕开风阻，让不安在直道上彻底燃尽。",
    distance: "12.5",
    duration: "38",
    checkpoints: 3,
  },
  "explore-yellow": {
    color: "#FFB54A",
    accentColor: "#C4A57B",
    slogan: "循迹宽街，在建筑的折痕里听长回声。",
    distance: "8.6",
    duration: "28",
    checkpoints: 3,
  },
  "lonely-blue": {
    color: "#4FA8FF",
    accentColor: "#6B8AAF",
    slogan: "潜入暗流，将喧嚣沉降于底面。",
    distance: "7.8",
    duration: "25",
    checkpoints: 3,
  },
  "tired-gray": {
    color: "#C9D2D8",
    accentColor: "#8B9AA3",
    slogan: "隐入网格，做一阵没有轨迹的风。",
    distance: "8.2",
    duration: "26",
    checkpoints: 3,
  },
};

// Geometric city blocks for VOID grid
const cityBlocks = [
  // Grid pattern blocks
  { x: 8, y: 12, w: 15, h: 20 },
  { x: 28, y: 8, w: 18, h: 25 },
  { x: 52, y: 15, w: 12, h: 18 },
  { x: 70, y: 10, w: 20, h: 22 },
  { x: 12, y: 40, w: 22, h: 15 },
  { x: 40, y: 38, w: 16, h: 20 },
  { x: 62, y: 42, w: 18, h: 16 },
  { x: 85, y: 35, w: 12, h: 24 },
  { x: 5, y: 65, w: 20, h: 18 },
  { x: 30, y: 68, w: 14, h: 20 },
  { x: 50, y: 65, w: 25, h: 16 },
  { x: 80, y: 70, w: 15, h: 15 },
];

// Winding waypoint route (viewBox 360 x 780) — every vertex gets a glow dot
const defaultRouteWaypoints: Array<[number, number]> = [
  [188, 60],
  [168, 92],
  [206, 128],
  [148, 162],
  [172, 200],
  [212, 232],
  [192, 270],
  [176, 308],
  [158, 348],
  [128, 384],
  [172, 416],
  [200, 452],
  [176, 488],
  [152, 524],
  [186, 560],
  [228, 594],
  [232, 638],
  [202, 672],
  [184, 712],
];

// Coast-hugging route for lonely-blue (matches image-7/8 coastline)
const coastalRouteWaypoints: Array<[number, number]> = [
  [220, 32],
  [198, 60],
  [178, 92],
  [152, 122],
  [148, 158],
  [172, 188],
  [192, 210],
  [168, 240],
  [148, 272],
  [176, 300],
  [200, 326],
  [178, 358],
  [152, 392],
  [136, 428],
  [160, 460],
  [188, 488],
  [168, 520],
  [142, 552],
  [128, 588],
  [156, 622],
  [182, 656],
  [168, 692],
  [150, 730],
];

// Boulevard/plaza route for explore-yellow (matches image-9/10 grid streets)
const boulevardRouteWaypoints: Array<[number, number]> = [
  [130, 30],
  [122, 78],
  [156, 102],
  [192, 128],
  [222, 162],
  [232, 218],
  [218, 268],
  [178, 282],
  [142, 290],
  [156, 332],
  [122, 362],
  [96, 396],
  [118, 436],
  [142, 476],
  [108, 510],
  [92, 548],
  [136, 582],
  [182, 602],
  [222, 592],
  [256, 618],
  [262, 660],
  [246, 702],
  [216, 736],
];

// Straight axial sprint for release-red (matches image-11/12 grid arteries)
const sprintRouteWaypoints: Array<[number, number]> = [
  [60, 28],
  [110, 52],
  [158, 82],
  [182, 118],
  [182, 170],
  [182, 230],
  [182, 290],
  [182, 360],
  [182, 430],
  [182, 500],
  [182, 560],
  [182, 620],
  [182, 690],
  [182, 740],
];

const routeWaypointsByColor: Record<string, Array<[number, number]>> = {
  "lonely-blue": coastalRouteWaypoints,
  "explore-yellow": boulevardRouteWaypoints,
  "release-red": sprintRouteWaypoints,
};

const buildRoutePath = (wp: Array<[number, number]>) =>
  wp.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");

export default function RouteGeneration() {
  const location = useLocation();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<"blocks" | "route" | "complete">("blocks");
  const [routeProgress, setRouteProgress] = useState(0);

  const colorId = location.state?.colorId || "tired-gray";
  const route = routeData[colorId];
  const meta = emotionMeta[colorId];
  const routeWaypoints = routeWaypointsByColor[colorId] || defaultRouteWaypoints;
  const routePath = buildRoutePath(routeWaypoints);
  const checkpointIndices = [
    0,
    Math.floor(routeWaypoints.length / 2),
    routeWaypoints.length - 1,
  ];

  // Phase 1: Blocks emerge
  useEffect(() => {
    setTimeout(() => {
      setPhase("route");
    }, 1200);
  }, []);

  // Phase 2: Route animation
  useEffect(() => {
    if (phase === "route") {
      const interval = setInterval(() => {
        setRouteProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setPhase("complete");
            return 100;
          }
          return prev + 2;
        });
      }, 20);
      return () => clearInterval(interval);
    }
  }, [phase]);

  const handleConfirm = () => {
    if (navigator.vibrate) navigator.vibrate([20, 30, 40]);
    navigate("/ride-enhanced", { state: { colorId } });
  };

  const handleRegenerate = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    setPhase("blocks");
    setRouteProgress(0);
    setTimeout(() => setPhase("route"), 800);
  };

  return (
    <motion.div
      className="size-full overflow-hidden relative bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.4, ease: "easeOut" }}
    >
      {/* Green Map Background */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      >
        <ImageWithFallback
          src={mapBgByColor[colorId] || mapBgGreen}
          alt="情绪地图"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.7) saturate(1.05)" }}
        />
        {/* Vignette for HUD readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.85) 100%)",
          }}
        />
      </motion.div>

      <motion.svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 360 780"
        preserveAspectRatio="xMidYMid slice"
        animate={{ opacity: phase === "complete" ? 0.42 : 1 }}
        transition={{ duration: 0.9, ease: "easeOut", delay: phase === "complete" ? 0.3 : 0 }}
      >
        <defs>
          <linearGradient id="routeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={route.color} stopOpacity="1" />
            <stop offset="100%" stopColor={route.color} stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* Glowing waypoint route */}
        {phase !== "blocks" && (
          <>
            {/* Soft outer glow */}
            <motion.path
              d={routePath}
              fill="none"
              stroke={route.color}
              strokeWidth="14"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: routeProgress / 100, opacity: 0.35 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ filter: "blur(8px)" }}
            />
            {/* Inner glow */}
            <motion.path
              d={routePath}
              fill="none"
              stroke={route.color}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: routeProgress / 100, opacity: 0.55 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ filter: "blur(3px)" }}
            />
            {/* Crisp center line */}
            <motion.path
              d={routePath}
              fill="none"
              stroke={route.color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: routeProgress / 100 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 4px ${route.color})` }}
            />

            {/* Start / End labels */}
            {phase === "complete" && (
              <>
                <text
                  x={routeWaypoints[0][0] + 14}
                  y={routeWaypoints[0][1] + 4}
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight={500}
                  opacity={0.85}
                  style={{ filter: `drop-shadow(0 0 4px ${route.color})` }}
                >
                  起点
                </text>
                <text
                  x={routeWaypoints[routeWaypoints.length - 1][0] + 14}
                  y={routeWaypoints[routeWaypoints.length - 1][1] + 4}
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight={500}
                  opacity={0.85}
                  style={{ filter: `drop-shadow(0 0 4px ${route.color})` }}
                >
                  终点
                </text>
              </>
            )}

            {/* Waypoint dots — appear progressively with the path */}
            {routeWaypoints.map(([x, y], i) => {
              const t = i / (routeWaypoints.length - 1);
              const visible = routeProgress / 100 >= t;
              const isOrigin = i === 0;
              const isEnd = i === routeWaypoints.length - 1;
              const isMajor = checkpointIndices.includes(i);

              return (
                <g key={i}>
                  {/* Dot halo */}
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={isOrigin || isEnd ? 9 : isMajor ? 6 : 3.5}
                    fill="none"
                    stroke={route.color}
                    strokeWidth={isOrigin ? 1.4 : 0.9}
                    initial={{ opacity: 0, scale: 0.4 }}
                    animate={
                      visible
                        ? { opacity: isOrigin || isEnd ? 0.9 : isMajor ? 0.7 : 0.45, scale: 1 }
                        : { opacity: 0, scale: 0.4 }
                    }
                    transition={{ duration: 0.35, ease: "easeOut" }}
                  />
                  {/* Filled dot */}
                  <motion.circle
                    cx={x}
                    cy={y}
                    r={isOrigin || isEnd ? 4 : isMajor ? 2.6 : 1.6}
                    fill={isOrigin ? "#ffffff" : route.color}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={visible ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    style={{
                      filter: `drop-shadow(0 0 ${isOrigin || isEnd ? 10 : isMajor ? 6 : 3}px ${route.color})`,
                    }}
                  />
                  {/* Pulsing ripple for origin & major checkpoints once complete */}
                  {phase === "complete" && (isOrigin || isMajor) && (
                    <motion.circle
                      cx={x}
                      cy={y}
                      r={isOrigin ? 10 : 7}
                      fill="none"
                      stroke={route.color}
                      strokeWidth="1"
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: [0.6, 2.2, 3], opacity: [0, 0.7, 0] }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        delay: isOrigin ? 0 : i * 0.12,
                        ease: "easeOut",
                      }}
                    />
                  )}
                </g>
              );
            })}
          </>
        )}
      </motion.svg>

      {/* Redesigned Recommendation Overlay */}
      {phase === "complete" && (
        <div className="absolute inset-0 flex flex-col pointer-events-none">
          {/* Top Bar */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            className="flex items-center justify-between px-5 pt-4 pointer-events-auto"
          >
            <button
              onClick={() => navigate(-1)}
              className="w-8 h-8 flex items-center justify-center text-white/70 active:scale-90 transition-transform"
              aria-label="back"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full" style={{ backgroundColor: route.color, boxShadow: `0 0 6px ${route.color}` }} />
              <span className="font-serif-cn text-[12px] tracking-[0.35em] text-white/85" style={{ fontWeight: 500 }}>
                路线推荐
              </span>
            </div>
            <div
              className="text-[10px] tracking-[0.25em]"
              style={{ color: `${route.color}cc`, textShadow: `0 0 10px ${route.color}66` }}
            >
              {meta.cn} / {meta.en}
            </div>
          </motion.div>

          {/* Slogan */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45, duration: 0.7 }}
            className="font-serif-cn text-center mt-3 text-[11px] tracking-[0.3em] text-white/55"
          >
            {route.slogan}
          </motion.div>

          {/* Stats column - top left over map */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6, duration: 0.7 }}
            className="px-6 mt-6"
          >
            <div className="flex items-baseline gap-2">
              <div
                className="text-[64px] leading-none tabular-nums"
                style={{
                  color: "#ffffff",
                  fontWeight: 200,
                  textShadow: `0 0 30px ${route.color}66`,
                }}
              >
                {route.distance}
              </div>
              <div
                className="text-[18px] tabular-nums"
                style={{ color: `${route.color}ee`, fontWeight: 300 }}
              >
                km
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-baseline gap-1">
                <span className="text-[18px] tabular-nums text-white/85" style={{ fontWeight: 300 }}>
                  {route.duration}
                </span>
                <span className="font-serif-cn text-[10px] tracking-[0.25em] text-white/55" style={{ fontWeight: 500 }}>
                  分钟
                </span>
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex items-baseline gap-1">
                <span className="text-[18px] tabular-nums text-white/85" style={{ fontWeight: 300 }}>
                  {route.checkpoints}
                </span>
                <span className="font-serif-cn text-[10px] tracking-[0.25em] text-white/55" style={{ fontWeight: 500 }}>
                  处打卡点
                </span>
              </div>
            </div>
          </motion.div>

          {/* Spacer pushes bottom block down */}
          <div className="flex-1" />

          {/* Bottom Block */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.7 }}
            className="px-5 pb-6 pointer-events-auto"
          >
            {/* Feature chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {meta.tags.map((tag) => (
                <div
                  key={tag}
                  className="backdrop-blur-xl rounded-full px-3 py-1.5 border"
                  style={{
                    borderColor: `${route.color}33`,
                    backgroundColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="font-serif-cn text-[11px] tracking-[0.2em]"
                    style={{ color: `${route.color}ee`, fontWeight: 500 }}
                  >
                    {tag}
                  </span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div
              className="font-serif-cn text-[11px] tracking-[0.15em] leading-relaxed text-white/55 mb-4 px-1"
              style={{ fontWeight: 400 }}
            >
              {meta.description}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 items-center">
              <button
                onClick={handleRegenerate}
                className="px-6 py-3.5 rounded-full backdrop-blur-xl border transition-all active:scale-95"
                style={{
                  borderColor: "rgba(255,255,255,0.18)",
                  backgroundColor: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.8)",
                }}
              >
                <span className="font-serif-cn text-[12px] tracking-[0.3em]" style={{ fontWeight: 500 }}>
                  换一条
                </span>
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-3.5 rounded-full transition-all active:scale-95 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: "#ffffff",
                  color: "#0a0a0a",
                  boxShadow: `0 0 28px ${route.color}55`,
                }}
              >
                <span className="font-serif-cn text-[13px] tracking-[0.35em]" style={{ fontWeight: 600 }}>
                  出发
                </span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
