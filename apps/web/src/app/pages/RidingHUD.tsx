import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Navigation, MapPin, Pause, Square } from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";

const routeColors: Record<string, string> = {
  "calm-green": "#2DD4BF",
  "release-red": "#F43F5E",
  "explore-yellow": "#FBBF24",
  "lonely-blue": "#3B82F6",
  "tired-gray": "#94A3B8",
};

const checkpoints = [
  { name: "无人江堤", distance: 2.3 },
  { name: "老桥观景", distance: 5.1 },
  { name: "林间静处", distance: 7.8 },
];

export default function RidingHUD() {
  const location = useLocation();
  const navigate = useNavigate();
  const colorId = location.state?.colorId || "calm-green";
  const themeColor = routeColors[colorId];

  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [reachedCheckpoints, setReachedCheckpoints] = useState<number[]>([]);

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      setSpeed((prev) => Math.max(0, prev + (Math.random() - 0.5) * 3));
      setDistance((prev) => prev + 0.01);
      setDuration((prev) => prev + 1);

      checkpoints.forEach((checkpoint, index) => {
        if (
          distance >= checkpoint.distance &&
          !reachedCheckpoints.includes(index)
        ) {
          setReachedCheckpoints((prev) => [...prev, index]);
        }
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isPaused, distance, reachedCheckpoints]);

  const handleEnd = () => {
    navigate("/review", { state: { colorId, distance, duration } });
  };

  return (
    <div className="size-full text-white overflow-hidden relative">
      <AnimatedBackground color={themeColor} opacity={0.3} />

      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5">
        <motion.div
          className="h-full origin-left"
          style={{
            background: `linear-gradient(90deg, ${themeColor} 0%, ${themeColor}88 100%)`,
            width: `${(distance / 10) * 100}%`,
            boxShadow: `0 0 20px ${themeColor}66`,
          }}
        />
      </div>

      <div className="relative z-10 h-full flex flex-col p-12">
        <div className="flex items-center justify-between mb-16">
          <div className="flex items-center gap-3">
            <Navigation size={14} style={{ color: themeColor, opacity: 0.6 }} />
            <span className="text-[10px] tracking-[0.2em] uppercase font-light text-white/30">
              {distance.toFixed(1)} / 10.3
            </span>
          </div>
          <div className="text-[10px] tracking-[0.3em] font-light text-white/40 tabular-nums">
            {Math.floor(duration / 60)
              .toString()
              .padStart(2, "0")}
            :{(duration % 60).toString().padStart(2, "0")}
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-20">
            <motion.div
              animate={{
                scale: [1, 1.01, 1],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="text-[140px] font-extralight leading-none tabular-nums tracking-tight">
                {speed.toFixed(1)}
              </div>
              <div
                className="text-[10px] tracking-[0.5em] mt-4 uppercase font-light"
                style={{ color: themeColor, opacity: 0.7 }}
              >
                km/h
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-16 max-w-lg mx-auto">
              <div className="text-center">
                <div className="text-4xl font-extralight tabular-nums mb-2">
                  {distance.toFixed(2)}
                </div>
                <div className="text-[9px] text-white/30 tracking-[0.3em] font-light">
                  距离
                </div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-extralight tabular-nums mb-2">
                  {(distance > 0 ? (duration / 60 / distance) * 60 : 0).toFixed(1)}
                </div>
                <div className="text-[9px] text-white/30 tracking-[0.3em] font-light">
                  配速
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {reachedCheckpoints.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-6 flex items-center gap-4"
              style={{
                boxShadow: `0 8px 32px ${themeColor}22, inset 0 1px 0 ${themeColor}11`,
              }}
            >
              <MapPin size={16} style={{ color: themeColor, opacity: 0.8 }} />
              <div className="flex-1">
                <span
                  className="text-sm tracking-wide font-light"
                  style={{ color: themeColor }}
                >
                  {checkpoints[reachedCheckpoints[reachedCheckpoints.length - 1]].name}
                </span>
                <span className="text-xs text-white/40 ml-3 tracking-wide font-light">
                  在此处停顿。
                </span>
              </div>
            </motion.div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="flex-1 py-5 backdrop-blur-xl rounded-full border transition-all"
              style={{
                borderColor: `${themeColor}33`,
                backgroundColor: isPaused ? `${themeColor}22` : `${themeColor}0A`,
                boxShadow: isPaused ? `0 0 20px ${themeColor}33` : "none",
              }}
            >
              <Pause size={20} className="mx-auto" style={{ color: themeColor }} />
            </button>
            <button
              onClick={handleEnd}
              className="flex-1 py-5 backdrop-blur-xl rounded-full border transition-all"
              style={{
                borderColor: themeColor,
                backgroundColor: `${themeColor}22`,
                boxShadow: `0 0 30px ${themeColor}33`,
              }}
            >
              <Square size={18} className="mx-auto" style={{ color: themeColor }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
