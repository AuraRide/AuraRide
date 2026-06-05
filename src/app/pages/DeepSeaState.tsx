import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import DeepSeaBackground from "../components/DeepSeaBackground";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import mapBg from "../../imports/image-7.png";

export default function DeepSeaState() {
  const navigate = useNavigate();
  const [isPressed, setIsPressed] = useState(false);
  const [pressTimer, setPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);

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
      setIsExiting(true);
      setTimeout(() => {
        navigate("/generate", { state: { colorId: "lonely-blue" } });
      }, 1200);
    }
  }, [progress, navigate]);

  const handlePressStart = () => {
    setIsPressed(true);
  };

  const handlePressEnd = () => {
    setIsPressed(false);
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  return (
    <div className="size-full text-white overflow-hidden relative select-none bg-black">
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      >
        <ImageWithFallback
          src={mapBg}
          alt="深蓝海岸地图"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.7) saturate(1.1)" }}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.85) 100%)",
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
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            DEPTH
          </motion.h1>
          <motion.p
            className="text-base font-light tracking-wide text-blue-200/50 leading-relaxed max-w-md mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3,
            }}
          >
            潜入暗流，将喧嚣沉降于底面。
          </motion.p>
        </motion.div>

        {/* Interactive Circle */}
        <motion.div
          className="relative w-72 h-72 cursor-pointer"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        >
          {/* Outer Glow Ring */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, #3b82f622 0%, transparent 70%)",
              filter: "blur(30px)",
            }}
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.3, 0.6, 0.3],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Main Circle */}
          <motion.div
            className="absolute inset-0 rounded-full backdrop-blur-xl border border-blue-500/20 flex items-center justify-center touch-none select-none"
            style={{
              background: "radial-gradient(circle, #1e3a5f33 0%, #0a162888 100%)",
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              handlePressStart();
            }}
            onPointerUp={handlePressEnd}
            onPointerCancel={handlePressEnd}
            animate={{
              boxShadow: isPressed
                ? [
                    "0 0 40px rgba(59, 130, 246, 0.4), inset 0 0 40px rgba(59, 130, 246, 0.2)",
                    "0 0 60px rgba(59, 130, 246, 0.6), inset 0 0 60px rgba(59, 130, 246, 0.3)",
                  ]
                : "0 0 20px rgba(59, 130, 246, 0.2), inset 0 0 20px rgba(59, 130, 246, 0.1)",
            }}
            transition={{
              duration: 0.3,
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
                  stroke="#3b82f6"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 140}
                  initial={{ strokeDashoffset: 2 * Math.PI * 140 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 140 * (1 - progress / 100),
                  }}
                  style={{
                    filter: "drop-shadow(0 0 8px #3b82f688)",
                  }}
                />
              </svg>
            )}

            {/* Center Content */}
            <div className="relative z-10 text-center">
              <motion.div
                className="text-[10px] tracking-[0.3em] font-light text-blue-400/60 mb-3"
                animate={{
                  opacity: isPressed ? 0.3 : [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 4,
                  repeat: isPressed ? 0 : Infinity,
                }}
              >
                {isPressed ? "下潜中" : "长按"}
              </motion.div>
              <motion.div
                className="w-3 h-3 mx-auto rounded-full bg-blue-500"
                animate={{
                  scale: isPressed ? [1, 1.3, 1] : 1,
                  opacity: isPressed ? [0.6, 1, 0.6] : 0.6,
                  boxShadow: isPressed
                    ? [
                        "0 0 20px rgba(59, 130, 246, 0.6)",
                        "0 0 40px rgba(59, 130, 246, 0.8)",
                        "0 0 20px rgba(59, 130, 246, 0.6)",
                      ]
                    : "0 0 15px rgba(59, 130, 246, 0.4)",
                }}
                transition={{
                  duration: 0.6,
                  repeat: Infinity,
                }}
              />
            </div>
          </motion.div>

          {/* Ripple on Press */}
          {isPressed && (
            <motion.div
              className="absolute inset-0 rounded-full border border-blue-500/40"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeOut",
              }}
            />
          )}
        </motion.div>

        {/* Instruction Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isPressed ? 0 : [0.3, 0.6, 0.3] }}
          transition={{
            duration: 4,
            repeat: isPressed ? 0 : Infinity,
          }}
          className="mt-32 text-[10px] tracking-[0.3em] text-blue-400/40 font-light"
        >
          长按以确认
        </motion.div>
      </motion.div>
    </div>
  );
}
