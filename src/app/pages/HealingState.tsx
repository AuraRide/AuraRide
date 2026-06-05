import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import HealingBackground from "../components/HealingBackground";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import mapBg from "../../imports/image.png";

export default function HealingState() {
  const navigate = useNavigate();
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const { background, triggerWave } = HealingBackground();

  useEffect(() => {
    if (isPressed) {
      const interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 5;
        });
      }, 30);

      return () => clearInterval(interval);
    } else {
      setProgress(0);
    }
  }, [isPressed]);

  useEffect(() => {
    if (progress >= 100) {
      triggerWave();
      setIsExiting(true);
      setTimeout(() => {
        navigate("/generate", { state: { colorId: "calm-green" } });
      }, 1200);
    }
  }, [progress, navigate, triggerWave]);

  const handlePressStart = () => {
    setIsPressed(true);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
  };

  return (
    <div className="size-full text-white overflow-hidden relative select-none bg-black">
      {/* Map background image */}
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      >
        <ImageWithFallback
          src={mapBg}
          alt="深绿地图"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.7) saturate(1.1)" }}
        />
        {/* Tonal overlay for readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.8) 100%)",
          }}
        />
      </motion.div>

      <motion.div
        className="relative z-10 h-full flex flex-col items-center justify-center p-16"
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
        style={{ pointerEvents: isExiting ? "none" : "auto" }}
      >
        {/* Title */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center mb-32"
        >
          <motion.h1
            className="text-6xl font-extralight tracking-[0.2em] mb-8"
            animate={{
              opacity: [0.7, 1, 0.7],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            MOSS
          </motion.h1>
          <motion.p
            className="text-base font-light tracking-wide text-green-200/50 leading-relaxed max-w-md mx-auto"
            animate={{
              opacity: [0.4, 0.7, 0.4],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.75,
            }}
          >
            顺应风向，把心跳交还给潮汐。
          </motion.p>
        </motion.div>

        {/* Interactive Circle */}
        <motion.div
          className="relative w-72 h-72 cursor-pointer"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        >
          {/* Outer Pulse */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, #4a6b2a33 0%, transparent 70%)",
              filter: "blur(30px)",
            }}
            animate={{
              scale: [1, 1.15, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Main Circle */}
          <motion.div
            className="absolute inset-0 rounded-full backdrop-blur-xl border border-green-600/20 flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, #2a451533 0%, #0d141088 100%)",
            }}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            whileHover={{ scale: 1.05 }}
            animate={{
              boxShadow: isPressed
                ? "0 0 60px rgba(74, 107, 42, 0.6), inset 0 0 60px rgba(74, 107, 42, 0.3)"
                : "0 0 20px rgba(74, 107, 42, 0.2), inset 0 0 20px rgba(74, 107, 42, 0.1)",
            }}
          >
            {/* Progress Ring */}
            {isPressed && (
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <motion.circle
                  cx="144"
                  cy="144"
                  r="140"
                  fill="none"
                  stroke="#4a6b2a"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 140}
                  initial={{ strokeDashoffset: 2 * Math.PI * 140 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 140 * (1 - progress / 100),
                  }}
                  style={{
                    filter: "drop-shadow(0 0 8px #4a6b2a88)",
                  }}
                />
              </svg>
            )}

            {/* Center Content */}
            <div className="relative z-10 text-center">
              <motion.div
                className="text-[10px] tracking-[0.3em] font-light text-green-400/60 mb-3"
                animate={{
                  opacity: isPressed ? 0.3 : [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 3,
                  repeat: isPressed ? 0 : Infinity,
                }}
              >
                {isPressed ? "流动中" : "长按"}
              </motion.div>
              <motion.div
                className="w-3 h-3 mx-auto rounded-full bg-green-500"
                animate={{
                  scale: [0.9, 1.2, 0.9],
                  opacity: [0.5, 0.9, 0.5],
                  boxShadow: [
                    "0 0 15px rgba(74, 107, 42, 0.4)",
                    "0 0 30px rgba(74, 107, 42, 0.7)",
                    "0 0 15px rgba(74, 107, 42, 0.4)",
                  ],
                }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Instruction Text */}
        <motion.div
          animate={{
            opacity: isPressed ? 0 : [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 3.5,
            repeat: isPressed ? 0 : Infinity,
          }}
          className="mt-32 text-[10px] tracking-[0.3em] text-green-400/40 font-light"
        >
          长按以确认
        </motion.div>
      </motion.div>
    </div>
  );
}
