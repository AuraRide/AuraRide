import { motion } from "motion/react";
import { useMemo } from "react";

interface WeatherEffectsProps {
  weather: "clear" | "rain" | "wind" | "cloudy" | "sunset";
  windDirection?: "head" | "tail";
  timeOfDay?: "day" | "sunset" | "night";
  routeColor: string;
  routeProgress?: number;
}

export default function WeatherEffects({
  weather,
  windDirection = "tail",
  routeColor,
}: WeatherEffectsProps) {
  const raindrops = useMemo(
    () =>
      Array.from({ length: weather === "rain" ? 28 : 0 }, (_, i) => ({
        id: i,
        x: 4 + Math.random() * 92,
        delay: Math.random() * 2.4,
        speed: 0.8 + Math.random() * 0.45,
        length: 16 + Math.random() * 14,
      })),
    [weather]
  );

  const windParticles = useMemo(
    () =>
      Array.from({ length: weather === "wind" ? 18 : 0 }, (_, i) => ({
        id: i,
        y: 18 + Math.random() * 64,
        size: 30 + Math.random() * 60,
        delay: Math.random() * 3,
        duration: 3 + Math.random() * 1.6,
      })),
    [weather]
  );

  const clouds = useMemo(
    () =>
      Array.from({ length: weather === "cloudy" ? 5 : 0 }, (_, i) => ({
        id: i,
        y: 6 + i * 10 + Math.random() * 5,
        size: 130 + Math.random() * 80,
        delay: i * 3.5 + Math.random() * 2,
        duration: 22 + Math.random() * 10,
      })),
    [weather]
  );

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* ───── Rain ───── */}
      {weather === "rain" && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${routeColor}10 0%, ${routeColor}1a 60%, ${routeColor}22 100%)`,
            }}
          />
          {raindrops.map((d) => (
            <div key={d.id} className="absolute" style={{ left: `${d.x}%`, top: 0, bottom: 0 }}>
              <motion.div
                className="absolute"
                style={{
                  width: 1.2,
                  height: d.length,
                  background: `linear-gradient(180deg, transparent 0%, ${routeColor}cc 100%)`,
                  filter: `drop-shadow(0 0 3px ${routeColor}88)`,
                }}
                animate={{ top: ["-10%", "78%"], opacity: [0, 0.85, 0] }}
                transition={{
                  duration: d.speed,
                  repeat: Infinity,
                  delay: d.delay,
                  ease: "linear",
                  times: [0, 0.85, 1],
                }}
              />
              <motion.div
                className="absolute rounded-full"
                style={{
                  top: "78%",
                  left: -3,
                  width: 6,
                  height: 6,
                  border: `1px solid ${routeColor}aa`,
                  filter: `drop-shadow(0 0 4px ${routeColor}66)`,
                }}
                animate={{
                  width: [3, 16],
                  height: [3, 16],
                  left: [0, -8],
                  top: ["78%", "calc(78% - 3px)"],
                  opacity: [0, 0.7, 0],
                }}
                transition={{
                  duration: 0.7,
                  repeat: Infinity,
                  delay: d.delay + d.speed * 0.85,
                  ease: "easeOut",
                }}
              />
            </div>
          ))}
        </>
      )}

      {/* ───── Clear / sunny ray from top-right ───── */}
      {weather === "clear" && (
        <>
          <motion.div
            className="absolute"
            style={{
              top: "-15%",
              right: "-25%",
              width: "90%",
              height: "90%",
              background: `radial-gradient(ellipse 70% 90% at 100% 0%, ${routeColor}40 0%, ${routeColor}1f 35%, transparent 65%)`,
              filter: "blur(8px)",
            }}
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute"
            style={{
              top: "-10%",
              right: "6%",
              width: 160,
              height: "75%",
              background: `linear-gradient(200deg, ${routeColor}55 0%, ${routeColor}22 40%, transparent 80%)`,
              filter: "blur(14px)",
              transform: "rotate(18deg)",
              transformOrigin: "top right",
            }}
            animate={{ opacity: [0.55, 0.9, 0.55] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`mote-${i}`}
              className="absolute rounded-full"
              style={{
                top: `${5 + Math.random() * 40}%`,
                right: `${5 + Math.random() * 30}%`,
                width: 2.5,
                height: 2.5,
                backgroundColor: routeColor,
                filter: "blur(0.5px)",
                boxShadow: `0 0 8px ${routeColor}`,
              }}
              animate={{
                y: [0, 25, 50],
                x: [0, -18, -36],
                opacity: [0, 0.85, 0],
              }}
              transition={{
                duration: 5.5 + Math.random() * 3,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: "easeOut",
              }}
            />
          ))}
        </>
      )}

      {/* ───── Cloudy / overcast ───── */}
      {weather === "cloudy" && (
        <>
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(180deg, ${routeColor}14 0%, transparent 55%)`,
            }}
          />
          {clouds.map((c) => (
            <motion.div
              key={c.id}
              className="absolute"
              style={{
                top: `${c.y}%`,
                left: `-${c.size}px`,
                width: c.size,
                height: c.size * 0.45,
                background: `radial-gradient(ellipse 60% 70% at 50% 50%, ${routeColor}55 0%, ${routeColor}22 60%, transparent 100%)`,
                filter: "blur(16px)",
              }}
              animate={{ left: ["-25%", "115%"], opacity: [0, 0.85, 0.85, 0] }}
              transition={{
                duration: c.duration,
                repeat: Infinity,
                delay: c.delay,
                ease: "linear",
                times: [0, 0.15, 0.85, 1],
              }}
            />
          ))}
        </>
      )}

      {/* ───── Wind ───── */}
      {weather === "wind" && (
        <>
          {windParticles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute"
              style={{
                top: `${p.y}%`,
                left: windDirection === "tail" ? "-10%" : "110%",
                width: p.size,
                height: 1.5,
                background: `linear-gradient(${
                  windDirection === "tail" ? "90deg" : "270deg"
                }, transparent 0%, ${routeColor}cc 50%, transparent 100%)`,
                filter: `blur(1px) drop-shadow(0 0 4px ${routeColor}88)`,
              }}
              animate={{
                left: windDirection === "tail" ? ["-10%", "110%"] : ["110%", "-10%"],
                opacity: [0, 0.85, 0.85, 0],
              }}
              transition={{
                duration: p.duration,
                repeat: Infinity,
                delay: p.delay,
                ease: "linear",
                times: [0, 0.1, 0.85, 1],
              }}
            />
          ))}
        </>
      )}

      {/* ───── Sunset ───── */}
      {weather === "sunset" && (
        <motion.div
          className="absolute inset-0"
          style={{
            background: `linear-gradient(180deg, ${routeColor}33 0%, ${routeColor}14 40%, transparent 70%, ${routeColor}1f 100%)`,
          }}
          animate={{ opacity: [0.55, 0.85, 0.55] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}
