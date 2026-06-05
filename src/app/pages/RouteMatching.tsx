import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";

const colorData: Record<string, { color: string; name: string }> = {
  "calm-green": { color: "#2DD4BF", name: "治愈" },
  "release-red": { color: "#F43F5E", name: "释放" },
  "explore-yellow": { color: "#FBBF24", name: "探索" },
  "lonely-blue": { color: "#3B82F6", name: "深潜" },
  "tired-gray": { color: "#94A3B8", name: "漂流" },
};

const coordinates = [
  "N 31°14'23.4\"",
  "E 121°28'47.2\"",
  "ALT 12m",
  "DIST 8.2km",
  "NODES 47",
  "SCORE 94%",
];

export default function RouteMatching() {
  const location = useLocation();
  const navigate = useNavigate();
  const colorId = location.state?.colorId || "calm-green";
  const { color, name } = colorData[colorId];

  const [phase, setPhase] = useState<"matching" | "revealing" | "drawing">("matching");
  const [coordIndex, setCoordIndex] = useState(0);

  useEffect(() => {
    // Phase 1: Matching (coordinates flashing)
    const coordInterval = setInterval(() => {
      setCoordIndex((prev) => (prev + 1) % coordinates.length);
    }, 120);

    setTimeout(() => {
      clearInterval(coordInterval);
      setPhase("revealing");
    }, 2500);

    return () => clearInterval(coordInterval);
  }, []);

  useEffect(() => {
    if (phase === "revealing") {
      setTimeout(() => {
        setPhase("drawing");
      }, 1500);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "drawing") {
      setTimeout(() => {
        navigate("/generate", { state: { colorId } });
      }, 3000);
    }
  }, [phase, navigate, colorId]);

  return (
    <div className="size-full bg-black text-white overflow-hidden relative">
      {/* Matching Phase - Spinning Light Ball */}
      {phase === "matching" && (
        <>
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Outer Rings */}
            <motion.div
              className="absolute w-64 h-64 rounded-full border"
              style={{ borderColor: `${color}33` }}
              animate={{ rotate: 360, scale: [1, 1.1, 1] }}
              transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" }, scale: { duration: 2, repeat: Infinity } }}
            />
            <motion.div
              className="absolute w-48 h-48 rounded-full border"
              style={{ borderColor: `${color}55` }}
              animate={{ rotate: -360, scale: [1, 1.15, 1] }}
              transition={{ rotate: { duration: 2, repeat: Infinity, ease: "linear" }, scale: { duration: 1.5, repeat: Infinity } }}
            />

            {/* Core Light Ball */}
            <motion.div
              className="absolute w-32 h-32 rounded-full"
              style={{
                background: `radial-gradient(circle, ${color} 0%, ${color}88 40%, transparent 70%)`,
                filter: "blur(20px)",
              }}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            <motion.div
              className="absolute w-16 h-16 rounded-full"
              style={{
                background: color,
                boxShadow: `0 0 60px ${color}cc`,
              }}
              animate={{
                scale: [0.9, 1.2, 0.9],
                rotate: 360,
              }}
              transition={{
                scale: { duration: 1.5, repeat: Infinity },
                rotate: { duration: 4, repeat: Infinity, ease: "linear" },
              }}
            />
          </div>

          {/* Flashing Coordinates */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="absolute top-1/3">
              <motion.div
                key={coordIndex}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="text-xs tracking-[0.3em] uppercase font-light"
                style={{ color }}
              >
                {coordinates[coordIndex]}
              </motion.div>
            </div>
          </div>

          {/* Status Text */}
          <div className="absolute bottom-32 left-0 right-0 text-center">
            <motion.div
              className="text-[10px] tracking-[0.3em] text-white/40 font-light"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              正在匹配{name}路线
            </motion.div>
          </div>
        </>
      )}

      {/* Revealing Phase - Shockwave Burst */}
      {phase === "revealing" && (
        <>
          {/* Shockwave */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
          >
            <motion.div
              className="absolute w-full h-full rounded-full"
              style={{
                background: `radial-gradient(circle, ${color}44 0%, ${color}22 30%, transparent 60%)`,
                filter: "blur(40px)",
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 3 }}
              transition={{ duration: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
            />
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-32"
                style={{
                  background: `linear-gradient(180deg, ${color} 0%, transparent 100%)`,
                  transformOrigin: "center",
                  rotate: i * 45,
                }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{
                  duration: 1.2,
                  delay: i * 0.05,
                  ease: "easeOut",
                }}
              />
            ))}
          </motion.div>

          {/* Map Grid Reveal */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
          >
            <svg className="w-full h-full opacity-10">
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <motion.path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke={color}
                    strokeWidth="0.5"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.8 }}
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </motion.div>
        </>
      )}

      {/* Drawing Phase - Route Line */}
      {phase === "drawing" && (
        <>
          {/* Background Grid */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full">
              <defs>
                <pattern
                  id="grid-static"
                  width="40"
                  height="40"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 40"
                    fill="none"
                    stroke={color}
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid-static)" />
            </svg>
          </div>

          {/* Route Path Drawing */}
          <svg className="absolute inset-0 w-full h-full">
            <motion.path
              d="M 100 400 Q 200 300, 300 350 T 500 300 Q 600 280, 700 320 T 900 300"
              fill="none"
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              style={{
                filter: `drop-shadow(0 0 8px ${color}aa)`,
              }}
            />

            {/* Route Nodes */}
            {[0.2, 0.4, 0.6, 0.8].map((position, i) => (
              <motion.circle
                key={i}
                cx={100 + position * 800}
                cy={350 - Math.sin(position * Math.PI * 2) * 50}
                r="4"
                fill={color}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  delay: 0.5 + position * 2,
                  duration: 0.3,
                }}
                style={{
                  filter: `drop-shadow(0 0 6px ${color})`,
                }}
              />
            ))}
          </svg>

          {/* Route Info */}
          <motion.div
            className="absolute top-32 left-16"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.5 }}
          >
            <div className="text-[10px] tracking-[0.3em] text-white/30 font-light mb-2">
              路线类型
            </div>
            <div
              className="text-xl font-light tracking-wide"
              style={{ color }}
            >
              {name}
            </div>
          </motion.div>

          <motion.div
            className="absolute bottom-32 right-16 text-right"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 1.8 }}
          >
            <div className="text-[10px] tracking-[0.3em] text-white/30 font-light mb-2">
              路线就绪
            </div>
            <div
              className="text-xl font-light tracking-wide tabular-nums"
              style={{ color }}
            >
              8.2 km
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
}
