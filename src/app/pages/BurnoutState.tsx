import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import BurnoutBackground from "../components/BurnoutBackground";

export default function BurnoutState() {
  const navigate = useNavigate();
  const [isPressed, setIsPressed] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const { background } = BurnoutBackground();

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
      // Vibration feedback
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 50]);
      }

      setIsExiting(true);
      setTimeout(() => {
        navigate("/generate", { state: { colorId: "release-red" } });
      }, 1200);
    }
  }, [progress, navigate]);

  const handlePressStart = () => {
    setIsPressed(true);
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
  };

  const handlePressEnd = () => {
    setIsPressed(false);
  };

  return (
    <div className="size-full text-white overflow-hidden relative select-none">
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      >
        {background}
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
              opacity: [0.6, 1, 0.75, 1, 0.6],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: [0.45, 0.05, 0.55, 0.95],
            }}
          >
            EMBER
          </motion.h1>
          <motion.p
            className="text-base font-light tracking-wide text-orange-200/50 leading-relaxed max-w-md mx-auto"
            animate={{
              opacity: [0.3, 0.7, 0.4, 0.7, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: [0.45, 0.05, 0.55, 0.95],
              delay: 0.5,
            }}
          >
            撕开风阻，让不安在直道上彻底燃尽。
          </motion.p>
        </motion.div>

        {/* Interactive Circle */}
        <motion.div
          className="relative w-72 h-72 cursor-pointer"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        >
          {/* Outer Heat Wave */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, #d2691e44 0%, transparent 70%)",
              filter: "blur(40px)",
            }}
            animate={{
              scale: [1, 1.2, 1.1, 1.25, 1],
              opacity: [0.3, 0.7, 0.4, 0.6, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: [0.45, 0.05, 0.55, 0.95],
            }}
          />

          {/* Secondary Pulse */}
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: "radial-gradient(circle, #ff8c3033 0%, transparent 65%)",
              filter: "blur(35px)",
            }}
            animate={{
              scale: [1.1, 1, 1.15, 1.05, 1.1],
              opacity: [0.4, 0.6, 0.3, 0.7, 0.4],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: [0.45, 0.05, 0.55, 0.95],
              delay: 0.3,
            }}
          />

          {/* Main Circle */}
          <motion.div
            className="absolute inset-0 rounded-full backdrop-blur-xl border border-orange-600/30 flex items-center justify-center"
            style={{
              background: "radial-gradient(circle, #4a1a1a44 0%, #0a060588 100%)",
            }}
            onMouseDown={handlePressStart}
            onMouseUp={handlePressEnd}
            onMouseLeave={handlePressEnd}
            onTouchStart={handlePressStart}
            onTouchEnd={handlePressEnd}
            whileHover={{ scale: 1.05 }}
            animate={{
              boxShadow: isPressed
                ? [
                    "0 0 40px rgba(210, 105, 30, 0.5), inset 0 0 40px rgba(210, 105, 30, 0.3)",
                    "0 0 70px rgba(255, 140, 48, 0.7), inset 0 0 60px rgba(255, 140, 48, 0.4)",
                    "0 0 40px rgba(210, 105, 30, 0.5), inset 0 0 40px rgba(210, 105, 30, 0.3)",
                  ]
                : "0 0 25px rgba(210, 105, 30, 0.3), inset 0 0 25px rgba(210, 105, 30, 0.15)",
            }}
            transition={{
              duration: 0.4,
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
                  stroke="#d2691e"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 140}
                  initial={{ strokeDashoffset: 2 * Math.PI * 140 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 140 * (1 - progress / 100),
                  }}
                  style={{
                    filter: "drop-shadow(0 0 12px #ff8c30cc)",
                  }}
                />
              </svg>
            )}

            {/* Center Content */}
            <div className="relative z-10 text-center">
              <motion.div
                className="text-[10px] tracking-[0.3em] font-light text-orange-400/70 mb-3"
                animate={{
                  opacity: isPressed ? 0.4 : [0.5, 0.9, 0.6, 0.9, 0.5],
                }}
                transition={{
                  duration: 1.5,
                  repeat: isPressed ? 0 : Infinity,
                }}
              >
                {isPressed ? "燃烧中" : "长按"}
              </motion.div>
              <motion.div
                className="w-3 h-3 mx-auto rounded-full bg-orange-500"
                animate={{
                  scale: isPressed ? [1, 1.4, 1.1, 1.3, 1] : [0.9, 1.3, 0.9],
                  opacity: isPressed ? [0.6, 1, 0.7, 1, 0.6] : [0.5, 1, 0.5],
                  boxShadow: isPressed
                    ? [
                        "0 0 20px rgba(255, 140, 48, 0.6)",
                        "0 0 45px rgba(255, 140, 48, 0.9)",
                        "0 0 20px rgba(255, 140, 48, 0.6)",
                      ]
                    : [
                        "0 0 15px rgba(210, 105, 30, 0.5)",
                        "0 0 30px rgba(210, 105, 30, 0.8)",
                        "0 0 15px rgba(210, 105, 30, 0.5)",
                      ],
                }}
                transition={{
                  duration: isPressed ? 0.5 : 2,
                  repeat: Infinity,
                  ease: [0.45, 0.05, 0.55, 0.95],
                }}
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Instruction Text */}
        <motion.div
          animate={{
            opacity: isPressed ? 0 : [0.3, 0.7, 0.4, 0.7, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: isPressed ? 0 : Infinity,
          }}
          className="mt-32 text-[10px] tracking-[0.3em] text-orange-400/40 font-light"
        >
          长按以点燃
        </motion.div>
      </motion.div>
    </div>
  );
}
