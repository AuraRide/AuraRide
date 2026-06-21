import { motion } from "motion/react";
import { useEffect, useState } from "react";

interface DynamicRouteLineProps {
  speed: number;
  heartRate?: number;
  terrain?: "asphalt" | "gravel" | "cobblestone";
  elevation?: "flat" | "climbing";
  color: string;
  progress: number;
}

export default function DynamicRouteLine({
  speed,
  heartRate = 80,
  terrain = "asphalt",
  elevation = "flat",
  color,
  progress,
}: DynamicRouteLineProps) {
  const [routeState, setRouteState] = useState<"cruising" | "sprinting" | "climbing">("cruising");

  useEffect(() => {
    if (elevation === "climbing" || heartRate > 140) {
      setRouteState("climbing");
    } else if (speed > 25 || heartRate > 120) {
      setRouteState("sprinting");
    } else {
      setRouteState("cruising");
    }
  }, [speed, heartRate, elevation]);

  // Route path
  const routePath = "M 100 400 Q 200 300, 300 350 T 500 300 Q 600 280, 700 320 T 900 300";

  return (
    <div className="absolute inset-0 pointer-events-none">
      <svg className="w-full h-full">
        {/* Base Path - Subtle Shadow */}
        <motion.path
          d={routePath}
          fill="none"
          stroke={`${color}22`}
          strokeWidth="12"
          filter="blur(8px)"
        />

        {/* Main Route Line */}
        <motion.path
          d={routePath}
          fill="none"
          stroke={color}
          strokeWidth={routeState === "climbing" ? "6" : routeState === "sprinting" ? "8" : "7"}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{
            pathLength: progress,
            strokeWidth: routeState === "climbing" ? [6, 7, 6] : undefined,
          }}
          transition={{
            pathLength: { duration: 1, ease: "easeInOut" },
            strokeWidth: routeState === "climbing"
              ? { duration: 0.8, repeat: Infinity, ease: "easeInOut" }
              : {},
          }}
          style={{
            filter: `drop-shadow(0 0 ${routeState === "sprinting" ? "16px" : "10px"} ${color}${routeState === "sprinting" ? "aa" : "88"})`,
          }}
        />

        {/* Flowing Inner Light */}
        <motion.path
          d={routePath}
          fill="none"
          stroke={`${color}dd`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={routeState === "sprinting" ? "20 10" : "40 20"}
          initial={{ pathLength: 0, strokeDashoffset: 0 }}
          animate={{
            pathLength: progress,
            strokeDashoffset: routeState === "cruising" ? -100 : -200,
          }}
          transition={{
            pathLength: { duration: 1, ease: "easeInOut" },
            strokeDashoffset: {
              duration: routeState === "sprinting" ? 2 : 4,
              repeat: Infinity,
              ease: "linear",
            },
          }}
          style={{
            filter: `blur(2px)`,
          }}
        />

        {/* Terrain Noise for Gravel/Cobblestone */}
        {(terrain === "gravel" || terrain === "cobblestone") && (
          <motion.path
            d={routePath}
            fill="none"
            stroke={`${color}44`}
            strokeWidth="8"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress }}
            transition={{ duration: 1, ease: "easeInOut" }}
            style={{
              filter: `url(#noise-${terrain})`,
            }}
          />
        )}

        {/* Sprinting Motion Blur Trail */}
        {routeState === "sprinting" && (
          <motion.path
            d={routePath}
            fill="none"
            stroke={color}
            strokeWidth="12"
            strokeLinecap="round"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: progress,
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              pathLength: { duration: 1, ease: "easeInOut" },
              opacity: { duration: 0.6, repeat: Infinity },
            }}
            style={{
              filter: "blur(6px)",
            }}
          />
        )}

        {/* Climbing Pulse Effect */}
        {routeState === "climbing" && (
          <motion.path
            d={routePath}
            fill="none"
            stroke={`${color}88`}
            strokeWidth="10"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{
              pathLength: progress,
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              pathLength: { duration: 1, ease: "easeInOut" },
              opacity: { duration: 0.8, repeat: Infinity, ease: "easeInOut" },
            }}
            style={{
              filter: "blur(5px)",
            }}
          />
        )}

        {/* SVG Filters */}
        <defs>
          <filter id="noise-gravel">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.8"
              numOctaves="3"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="3"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="noise-cobblestone">
            <feTurbulence
              type="turbulence"
              baseFrequency="1.2"
              numOctaves="4"
              result="noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="noise"
              scale="5"
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
        </defs>
      </svg>

      {/* Glass Tube Effect for Asphalt */}
      {terrain === "asphalt" && (
        <svg className="absolute inset-0 w-full h-full">
          <motion.path
            d={routePath}
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="9"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: progress }}
            transition={{ duration: 1, ease: "easeInOut" }}
            style={{
              filter: "blur(1px)",
            }}
          />
        </svg>
      )}
    </div>
  );
}
