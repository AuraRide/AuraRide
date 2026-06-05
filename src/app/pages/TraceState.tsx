import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import mapBg from "../../imports/image-9.png";

const AMBER = "#FFB54A";
const AMBER_DEEP = "#C4A57B";

export default function TraceState() {
  const navigate = useNavigate();
  const [isPressed, setIsPressed] = useState(false);
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
        navigate("/generate", { state: { colorId: "explore-yellow" } });
      }, 1200);
    }
  }, [progress, navigate]);

  const handlePressStart = () => setIsPressed(true);
  const handlePressEnd = () => setIsPressed(false);

  return (
    <div className="size-full text-white overflow-hidden relative select-none bg-black">
      <motion.div
        className="absolute inset-0"
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 1, ease: "easeInOut" }}
      >
        <ImageWithFallback
          src={mapBg}
          alt="赭黄街区地图"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ filter: "brightness(0.7) saturate(1.05)" }}
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
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          className="text-center mb-32"
        >
          <motion.h1
            className="text-6xl font-extralight tracking-[0.2em] mb-8"
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          >
            TRACE
          </motion.h1>
          <motion.p
            className="text-base font-light tracking-wide leading-relaxed max-w-md mx-auto"
            style={{ color: "rgba(255, 200, 130, 0.55)" }}
            animate={{ opacity: [0.4, 0.7, 0.4] }}
            transition={{
              duration: 3.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.75,
            }}
          >
            循迹宽街，在建筑的折痕里听长回声。
          </motion.p>
        </motion.div>

        <motion.div
          className="relative w-72 h-72 cursor-pointer"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 2, delay: 0.5 }}
        >
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${AMBER}33 0%, transparent 70%)`,
              filter: "blur(30px)",
            }}
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          />

          <motion.div
            className="absolute inset-0 rounded-full backdrop-blur-xl flex items-center justify-center touch-none"
            style={{
              border: `1px solid ${AMBER}44`,
              background: `radial-gradient(circle, ${AMBER_DEEP}22 0%, #1a130888 100%)`,
            }}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              handlePressStart();
            }}
            onPointerUp={handlePressEnd}
            onPointerCancel={handlePressEnd}
            animate={{
              boxShadow: isPressed
                ? `0 0 60px ${AMBER}88, inset 0 0 60px ${AMBER}44`
                : `0 0 20px ${AMBER}33, inset 0 0 20px ${AMBER}1a`,
            }}
          >
            {isPressed && (
              <svg className="absolute inset-0 w-full h-full -rotate-90">
                <motion.circle
                  cx="144"
                  cy="144"
                  r="140"
                  fill="none"
                  stroke={AMBER}
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 140}
                  initial={{ strokeDashoffset: 2 * Math.PI * 140 }}
                  animate={{
                    strokeDashoffset: 2 * Math.PI * 140 * (1 - progress / 100),
                  }}
                  style={{ filter: `drop-shadow(0 0 8px ${AMBER}aa)` }}
                />
              </svg>
            )}

            <div className="relative z-10 text-center">
              <motion.div
                className="text-[10px] tracking-[0.3em] font-light mb-3"
                style={{ color: `${AMBER}bb` }}
                animate={{ opacity: isPressed ? 0.3 : [0.4, 0.8, 0.4] }}
                transition={{ duration: 3, repeat: isPressed ? 0 : Infinity }}
              >
                {isPressed ? "循迹中" : "长按"}
              </motion.div>
              <motion.div
                className="w-3 h-3 mx-auto rounded-full"
                style={{ backgroundColor: AMBER }}
                animate={{
                  scale: [0.9, 1.2, 0.9],
                  opacity: [0.55, 0.95, 0.55],
                  boxShadow: [
                    `0 0 15px ${AMBER}66`,
                    `0 0 30px ${AMBER}aa`,
                    `0 0 15px ${AMBER}66`,
                  ],
                }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          animate={{ opacity: isPressed ? 0 : [0.3, 0.6, 0.3] }}
          transition={{ duration: 3.5, repeat: isPressed ? 0 : Infinity }}
          className="mt-32 text-[10px] tracking-[0.3em] font-light"
          style={{ color: `${AMBER}55` }}
        >
          长按以确认
        </motion.div>
      </motion.div>
    </div>
  );
}
