import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { motion } from "motion/react";
import { Pause, Play, Square } from "lucide-react";

const routeColors: Record<string, string> = {
  "calm-green": "#2DD4BF",
  "release-red": "#F43F5E",
  "explore-yellow": "#FBBF24",
  "lonely-blue": "#3B82F6",
  "tired-gray": "#94A3B8",
};

export default function WatchRiding() {
  const location = useLocation();
  const colorId = location.state?.colorId || "calm-green";
  const themeColor = routeColors[colorId];

  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [heartRate, setHeartRate] = useState(85);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSpeed((prev) => {
        const newSpeed = Math.max(0, prev + (Math.random() - 0.5) * 3);
        return Math.min(35, newSpeed);
      });
      setDistance((prev) => prev + 0.01);
      setDuration((prev) => prev + 1);
      setHeartRate((prev) => {
        const change = Math.random() - 0.5;
        return Math.max(60, Math.min(180, prev + change * 2));
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const progress = (distance / 10.3) * 100;

  return (
    <div className="relative w-[390px] h-[390px] mx-auto bg-black rounded-full overflow-hidden">
      {/* Aurora Background */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 30% 40%, ${themeColor}33 0%, transparent 60%)`,
          filter: "blur(60px)",
        }}
        animate={{
          x: ["-10%", "10%", "-10%"],
          y: ["-10%", "10%", "-10%"],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 70% 60%, ${themeColor}22 0%, transparent 60%)`,
          filter: "blur(50px)",
        }}
        animate={{
          x: ["10%", "-10%", "10%"],
          y: ["10%", "-10%", "10%"],
          scale: [1, 0.9, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Progress Ring */}
      <svg className="absolute inset-0 w-full h-full -rotate-90">
        <circle
          cx="195"
          cy="195"
          r="185"
          fill="none"
          stroke="rgba(255, 255, 255, 0.05)"
          strokeWidth="6"
        />
        <motion.circle
          cx="195"
          cy="195"
          r="185"
          fill="none"
          stroke={themeColor}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={2 * Math.PI * 185}
          strokeDashoffset={2 * Math.PI * 185 * (1 - progress / 100)}
          style={{
            filter: `drop-shadow(0 0 12px ${themeColor}99)`,
          }}
        />
      </svg>

      {/* Main Content */}
      <div className="relative z-10 h-full flex flex-col items-center justify-center p-8 text-white">
        {/* Speed Display */}
        <motion.div
          className="text-center mb-8"
          animate={{ scale: [1, 1.008, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="text-[68px] font-extralight leading-none tabular-nums tracking-tight">
            {speed.toFixed(1)}
          </div>
          <div
            className="text-[9px] tracking-[0.5em] mt-2 uppercase font-light"
            style={{ color: themeColor, opacity: 0.6 }}
          >
            km/h
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 text-center">
          <div>
            <div className="text-xl font-extralight tabular-nums mb-1">
              {distance.toFixed(2)}
            </div>
            <div className="text-[8px] text-white/20 tracking-[0.3em] font-light">
              公里
            </div>
          </div>
          <div>
            <div className="text-xl font-extralight tabular-nums mb-1">
              {Math.floor(duration / 60)}:{(duration % 60).toString().padStart(2, "0")}
            </div>
            <div className="text-[8px] text-white/20 tracking-[0.3em] font-light">
              时间
            </div>
          </div>
          <div>
            <div className="text-xl font-extralight tabular-nums mb-1">
              {(distance > 0 ? (duration / 60 / distance) * 60 : 0).toFixed(1)}
            </div>
            <div className="text-[8px] text-white/20 tracking-[0.3em] font-light">
              配速
            </div>
          </div>
          <div>
            <div
              className="text-xl font-extralight tabular-nums flex items-center justify-center gap-1.5 mb-1"
              style={{ color: themeColor }}
            >
              <motion.div
                className="w-1 h-1 rounded-full"
                style={{ backgroundColor: themeColor }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              {Math.round(heartRate)}
            </div>
            <div className="text-[8px] text-white/20 tracking-[0.3em] font-light">
              心率
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-5">
          <motion.button
            onClick={() => setIsPaused(!isPaused)}
            className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl border transition-all"
            style={{
              borderColor: `${themeColor}33`,
              backgroundColor: isPaused ? `${themeColor}22` : `${themeColor}0A`,
              boxShadow: isPaused ? `0 0 20px ${themeColor}33` : "none",
            }}
            whileTap={{ scale: 0.92 }}
          >
            {isPaused ? (
              <Play size={18} style={{ color: themeColor }} />
            ) : (
              <Pause size={18} style={{ color: themeColor }} />
            )}
          </motion.button>
          <motion.button
            className="w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-xl border"
            style={{
              backgroundColor: `${themeColor}22`,
              borderColor: themeColor,
              boxShadow: `0 0 20px ${themeColor}33`,
            }}
            whileTap={{ scale: 0.92 }}
          >
            <Square size={15} style={{ color: themeColor }} />
          </motion.button>
        </div>
      </div>

      {/* Time Display */}
      <div className="absolute top-8 left-0 right-0 text-center">
        <div className="text-[9px] text-white/20 tracking-[0.2em] font-light">
          {new Date().toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </div>
      </div>

      {/* Battery Indicator */}
      <div className="absolute bottom-8 left-0 right-0 flex justify-center">
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-3 py-1">
          <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                width: "75%",
                backgroundColor: themeColor,
                opacity: 0.7,
              }}
              animate={{
                opacity: [0.5, 0.8, 0.5],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
