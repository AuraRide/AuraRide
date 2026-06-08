import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight } from "lucide-react";
import { analyzeMood, COLOR_PROFILES } from "../lib/moodColor";
import FluidCanvas from "../components/FluidCanvas";

// Step 2: read the mood sentence, analyze it into one emotion color, and reveal
// that color. The reveal lives over the same flowing FluidCanvas the entry/login
// screen uses, so "describe in words" resolves into AuraRide's color world.

export default function ColorReveal() {
  const navigate = useNavigate();
  const location = useLocation();
  const moodText: string = location.state?.moodText || "";

  // If someone lands here directly without a sentence, send them back to write one.
  useEffect(() => {
    if (!moodText) navigate("/mood", { replace: true });
  }, [moodText, navigate]);

  const result = useMemo(() => analyzeMood(moodText), [moodText]);
  const profile = COLOR_PROFILES[result.colorId];

  const [phase, setPhase] = useState<"reading" | "reveal">("reading");

  // setTimeout flips the phase reliably (fires even if the tab is backgrounded);
  // phases crossfade via absolute overlays so nothing hangs on an exit animation.
  useEffect(() => {
    const t = setTimeout(() => setPhase("reveal"), 2000);
    return () => clearTimeout(t);
  }, []);

  const start = () => {
    navigate("/generate", { state: { colorId: result.colorId } });
  };

  return (
    <div className="size-full overflow-hidden relative flex items-center justify-center text-white">
      {/* Flowing color world — intensifies on reveal */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: phase === "reveal" ? 1 : 0.55 }}
        transition={{ duration: 1.2 }}
      >
        <FluidCanvas currentColor={profile.hex} blendProgress={0} />
      </motion.div>

      {/* Legibility vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 50% 45%, transparent 30%, rgba(0,0,0,0.55) 100%)",
        }}
      />

      <AnimatePresence>
        {phase === "reading" ? (
          <motion.div
            key="reading"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center px-7 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="mb-8 w-16 h-16 rounded-full border border-white/20"
              animate={{ rotate: 360 }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              style={{ borderTopColor: profile.hex }}
            />
            <p className="text-base font-light tracking-wider text-white/75">
              正在读取你的颜色…
            </p>
            <p className="mt-3 text-sm font-light text-white/40 max-w-xs leading-relaxed">
              “{moodText}”
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="reveal"
            className="absolute inset-0 z-10 flex flex-col items-center justify-center px-7 text-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.2 }}
          >
            {/* Breathing color orb */}
            <motion.div
              className="w-44 h-44 rounded-full mb-10"
              style={{
                background: `radial-gradient(circle at 35% 30%, ${profile.gradient[0]}, ${profile.gradient[1]})`,
                boxShadow: `0 0 80px ${profile.hex}66, inset 0 0 40px ${profile.hex}33`,
              }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            />

            <div className="text-xs font-light tracking-[0.3em] text-white/50">
              你今天的颜色是
            </div>
            <div
              className="mt-3 text-5xl font-extralight tracking-[0.2em]"
              style={{ color: profile.hex, textShadow: `0 0 24px ${profile.hex}88` }}
            >
              {profile.en}
            </div>
            <div className="mt-1 text-lg font-light text-white/80 tracking-widest">
              {profile.cn}
            </div>

            <p className="mt-8 text-base font-light text-white/80 leading-relaxed max-w-xs">
              {profile.line}
            </p>

            <p className="mt-4 text-xs font-light text-white/40 max-w-xs leading-relaxed">
              来自你的一句话 · “{moodText}”
            </p>

            <div className="mt-12 w-full max-w-xs space-y-3">
              <button
                onClick={start}
                className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-base font-normal tracking-wide text-black active:scale-[0.98] transition-transform"
                style={{ backgroundColor: profile.hex }}
              >
                沿着这个颜色出发
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => navigate("/mood", { replace: true })}
                className="w-full text-center text-xs font-light text-white/50 hover:text-white/80 transition-colors"
              >
                换一句话重新描述
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
