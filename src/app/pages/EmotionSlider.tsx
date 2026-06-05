import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from "motion/react";
import { X } from "lucide-react";
import FluidCanvas from "../components/FluidCanvas";
import EmotionEffects from "../components/EmotionEffects";

const emotions = [
  {
    id: "void-gray",
    colorId: "tired-gray",
    title: "VOID",
    subtitle: "隐入网格",
    description: "做一阵没有轨迹的风。",
    fullSlogan: "隐入网格，做一阵没有轨迹的风。",
    highlightWords: "没有轨迹",
    color: "#6b7280",
    logoGradient: ["#9ca3af", "#6b7280"],
    route: "/generate",
  },
  {
    id: "depth-blue",
    colorId: "lonely-blue",
    title: "DEPTH",
    subtitle: "潜入暗流",
    description: "将喧嚣沉降于底面。",
    fullSlogan: "潜入暗流，将喧嚣沉降于底面。",
    highlightWords: "沉降底面",
    color: "#1e40af",
    logoGradient: ["#60a5fa", "#1e40af"],
    route: "/deep-sea",
  },
  {
    id: "moss-green",
    colorId: "calm-green",
    title: "MOSS",
    subtitle: "顺应风向",
    description: "把心跳交还给潮汐。",
    fullSlogan: "顺应风向，把心跳交还给潮汐。",
    highlightWords: "交还潮汐",
    color: "#365314",
    logoGradient: ["#86efac", "#365314"],
    route: "/healing",
  },
  {
    id: "trace-yellow",
    colorId: "explore-yellow",
    title: "TRACE",
    subtitle: "循迹宽街",
    description: "在建筑的折痕里听长回声。",
    fullSlogan: "循迹宽街，在建筑的折痕里听长回声。",
    highlightWords: "听长回声",
    color: "#92400e",
    logoGradient: ["#fbbf24", "#92400e"],
    route: "/trace",
  },
  {
    id: "ember-red",
    colorId: "release-red",
    title: "EMBER",
    subtitle: "撕开风阻",
    description: "让不安在直道上彻底燃尽。",
    fullSlogan: "撕开风阻，让不安在直道上彻底燃尽。",
    highlightWords: "彻底燃尽",
    color: "#7f1d1d",
    logoGradient: ["#fb7185", "#7f1d1d"],
    route: "/burnout",
  },
];

export default function EmotionSlider() {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(2); // Start at STAY
  const [isHolding, setIsHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const [isSinking, setIsSinking] = useState(false);
  const [moodText, setMoodText] = useState("");
  const [showMoodSheet, setShowMoodSheet] = useState(false);
  const [moodDraft, setMoodDraft] = useState("");

  const dragX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragValue, setDragValue] = useState(0);

  const blendProgress = useTransform(dragX, [-200, 0, 200], [1, 0, 1]);

  useEffect(() => {
    const unsubscribe = dragX.on("change", (latest) => {
      setDragValue(latest);
    });
    return unsubscribe;
  }, [dragX]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isHolding && !isSinking) {
      interval = setInterval(() => {
        setHoldProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setIsSinking(true);
            return 100;
          }
          return prev + 10; // 1 second to complete
        });
      }, 100);
    } else if (!isHolding) {
      setHoldProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHolding, isSinking]);

  useEffect(() => {
    if (isSinking) {
      // Haptic feedback on sink
      if (navigator.vibrate) {
        navigator.vibrate([30, 50, 60]);
      }

      setTimeout(() => {
        const emotion = emotions[currentIndex];
        navigate(emotion.route, { state: { colorId: emotion.colorId } });
      }, 1500);
    }
  }, [isSinking, currentIndex, navigate]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    let indexChanged = false;

    if (info.offset.x < -threshold && currentIndex < emotions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      indexChanged = true;
    } else if (info.offset.x > threshold && currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      indexChanged = true;
    }

    // Haptic feedback on page change
    if (indexChanged && navigator.vibrate) {
      navigator.vibrate(20);
    }

    dragX.set(0);
  };

  const currentEmotion = emotions[currentIndex];
  const nextEmotion = dragValue < 0
    ? emotions[Math.min(currentIndex + 1, emotions.length - 1)]
    : emotions[Math.max(currentIndex - 1, 0)];

  const textParallax = useTransform(dragX, [-200, 0, 200], [-150, 0, 150]);
  const textOpacity = useTransform(dragX, [-200, -50, 0, 50, 200], [0.3, 0.8, 1, 0.8, 0.3]);

  return (
    <div
      ref={containerRef}
      className="size-full overflow-hidden relative select-none"
    >
      {/* Fluid Background */}
      <FluidCanvas
        currentColor={currentEmotion.color}
        nextColor={nextEmotion.color}
        blendProgress={Math.abs(dragValue) / 200}
      />

      {/* Emotion-Specific Effects */}
      <EmotionEffects emotionId={currentEmotion.id} color={currentEmotion.color} />

      {/* App Name with Icon — centered hero */}
      <motion.div
        className="absolute top-20 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center"
        initial={{ opacity: 0, x: -20 }}
        animate={
          isSinking
            ? {
                opacity: 0,
                y: -30,
                filter: "blur(10px)",
              }
            : {
                opacity: 1,
                x: 0,
                filter: "blur(0px)",
              }
        }
        transition={
          isSinking
            ? { duration: 0.8, ease: "easeOut" }
            : { delay: 0.5, duration: 1 }
        }
      >
        <div className="flex flex-col items-center gap-3">
          {/* Cycling Icon */}
          <motion.div
            key={`icon-${currentEmotion.id}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{
              opacity: 1,
              scale: 1,
              rotate: [0, 360],
            }}
            transition={{
              opacity: { duration: 0.5 },
              scale: { duration: 0.5 },
              rotate: {
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              },
            }}
          >
            <svg
              width="40"
              height="40"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id={`icon-gradient-${currentEmotion.id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor={currentEmotion.logoGradient[0]} stopOpacity="0.8" />
                  <stop offset="100%" stopColor={currentEmotion.logoGradient[1]} stopOpacity="1" />
                </linearGradient>
              </defs>
              {/* Outer ring */}
              <circle
                cx="16"
                cy="16"
                r="13"
                stroke={`url(#icon-gradient-${currentEmotion.id})`}
                strokeWidth="1.5"
                opacity="0.5"
              />
              {/* Inner glow circle */}
              <circle
                cx="16"
                cy="16"
                r="9"
                stroke={currentEmotion.logoGradient[1]}
                strokeWidth="0.8"
                opacity="0.7"
                style={{
                  filter: `drop-shadow(0 0 8px ${currentEmotion.logoGradient[1]}aa)`,
                }}
              />
              {/* Center dot */}
              <circle
                cx="16"
                cy="16"
                r="2"
                fill={currentEmotion.logoGradient[0]}
                opacity="0.95"
                style={{
                  filter: `drop-shadow(0 0 4px ${currentEmotion.logoGradient[0]}dd)`,
                }}
              />
              {/* Route path arc */}
              <motion.path
                d="M 8 16 Q 16 8, 24 16"
                stroke={currentEmotion.logoGradient[0]}
                strokeWidth="1.2"
                fill="none"
                strokeLinecap="round"
                opacity="0.8"
                animate={{
                  pathLength: [0, 1],
                  opacity: [0.4, 0.8, 0.4],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </svg>
          </motion.div>

          {/* App Name */}
          <motion.div
            key={`name-${currentEmotion.id}`}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center"
            style={{
              color: "#ffffff",
              fontSize: 38,
              fontWeight: 300,
              letterSpacing: "-0.01em",
              textShadow: `0 0 28px ${currentEmotion.logoGradient[0]}66, 0 0 14px ${currentEmotion.logoGradient[1]}44`,
            }}
          >
            AuraRide
          </motion.div>
          <motion.div
            key={`subtitle-${currentEmotion.id}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="font-serif-cn text-center"
            style={{
              color: "rgba(255,255,255,0.62)",
              fontSize: 12,
              fontWeight: 400,
              letterSpacing: "0.32em",
              textShadow: `0 0 14px ${currentEmotion.logoGradient[1]}44`,
            }}
          >
            一段路线，一种心情，一次抵达
          </motion.div>
        </div>
      </motion.div>

      {/* Pagination Indicators */}
      <motion.div
        className="absolute top-8 right-8 flex gap-2 z-20"
        animate={
          isSinking
            ? {
                opacity: 0,
                y: -30,
              }
            : {
                opacity: 1,
                y: 0,
              }
        }
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {emotions.map((_, index) => (
          <motion.div
            key={index}
            className="w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor:
                index === currentIndex
                  ? currentEmotion.color
                  : "rgba(255, 255, 255, 0.2)",
            }}
            animate={{
              scale: index === currentIndex ? 1.3 : 1,
              opacity: index === currentIndex ? 1 : 0.4,
            }}
          />
        ))}
      </motion.div>

      {/* Main Content - Draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.3}
        dragMomentum={false}
        onDragEnd={handleDragEnd}
        style={{ x: dragX }}
        className="relative z-10 h-full flex flex-col items-center justify-center cursor-grab active:cursor-grabbing"
      >
        {/* Title with Parallax */}
        <motion.div
          style={{ x: textParallax, opacity: textOpacity }}
          className="text-center mb-4 relative"
        >
          <motion.div
            animate={
              isSinking
                ? {
                    y: [0, -100],
                    opacity: [1, 0],
                    filter: ["blur(0px)", "blur(10px)"],
                  }
                : {}
            }
            transition={
              isSinking
                ? { duration: 1.2, ease: [0.43, 0.13, 0.23, 0.96] }
                : {}
            }
          >
            {/* Curved glowing journey path */}
            <div className="relative w-72 h-72 mx-auto">
              <motion.svg
                key={`${currentEmotion.id}-path`}
                viewBox="0 0 240 280"
                className="absolute inset-0 w-full h-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
              >
                <defs>
                  <linearGradient id={`hero-grad-${currentEmotion.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor={currentEmotion.logoGradient[0]} stopOpacity="1" />
                    <stop offset="100%" stopColor={currentEmotion.logoGradient[1]} stopOpacity="0.85" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M 150 20 C 110 80, 200 130, 130 180 S 60 230, 90 260"
                  fill="none"
                  stroke={currentEmotion.logoGradient[0]}
                  strokeWidth="10"
                  strokeLinecap="round"
                  opacity="0.18"
                  style={{ filter: "blur(6px)" }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                />
                <motion.path
                  d="M 150 20 C 110 80, 200 130, 130 180 S 60 230, 90 260"
                  fill="none"
                  stroke={`url(#hero-grad-${currentEmotion.id})`}
                  strokeWidth="2"
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 5px ${currentEmotion.logoGradient[0]})` }}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.6, ease: "easeOut" }}
                />
                {/* Start dot (top) */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5 }}
                >
                  <circle cx="150" cy="20" r="9" fill="none" stroke={currentEmotion.logoGradient[0]} strokeWidth="1" opacity="0.55" />
                  <circle cx="150" cy="20" r="3.5" fill={currentEmotion.logoGradient[0]} style={{ filter: `drop-shadow(0 0 8px ${currentEmotion.logoGradient[0]})` }} />
                </motion.g>
                {/* End dot (bottom) */}
                <motion.g
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.6, duration: 0.5 }}
                >
                  <motion.circle
                    cx="90"
                    cy="260"
                    r="14"
                    fill="none"
                    stroke={currentEmotion.logoGradient[0]}
                    strokeWidth="1"
                    animate={{ r: [10, 18, 10], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
                  />
                  <circle cx="90" cy="260" r="7" fill={currentEmotion.logoGradient[0]} opacity="0.9" style={{ filter: `drop-shadow(0 0 14px ${currentEmotion.logoGradient[0]})` }} />
                  <circle cx="90" cy="260" r="3" fill="#ffffff" />
                </motion.g>
              </motion.svg>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Bottom Action Area */}
      <motion.div
        className="absolute bottom-10 left-0 right-0 flex flex-col items-center z-20 px-8"
        animate={
          isSinking
            ? { opacity: 0, y: 50 }
            : { opacity: 1, y: 0 }
        }
        transition={{ duration: 0.6 }}
      >
        {/* Free-form mood — tap to open the sheet */}
        <button
          onClick={() => {
            setMoodDraft(moodText);
            setShowMoodSheet(true);
          }}
          className="w-full max-w-xs mb-4 bg-transparent border-b font-serif-cn text-center outline-none transition-colors active:scale-[0.99]"
          style={{
            borderColor: `${currentEmotion.logoGradient[0]}55`,
            color: moodText ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.45)",
            fontSize: 12,
            letterSpacing: "0.18em",
            padding: "10px 4px",
          }}
        >
          {moodText || "此刻，想说点什么…（点击输入）"}
        </button>

        {/* Wide pill button — tap to confirm */}
        <motion.button
          onClick={() => {
            if (navigator.vibrate) navigator.vibrate([20, 30, 40]);
            const emotion = emotions[currentIndex];
            navigate(emotion.route, {
              state: { colorId: emotion.colorId, moodText: moodText.trim() || undefined },
            });
          }}
          className="relative w-full max-w-xs h-14 rounded-full backdrop-blur-xl flex items-center justify-center gap-3 overflow-hidden"
          style={{
            border: `1.5px solid ${currentEmotion.logoGradient[0]}cc`,
            backgroundColor: `${currentEmotion.logoGradient[0]}1a`,
            boxShadow: `0 0 30px ${currentEmotion.logoGradient[0]}55, inset 0 0 18px ${currentEmotion.logoGradient[0]}1a`,
          }}
          whileTap={{ scale: 0.98 }}
        >
          {/* Ring icon */}
          <span className="relative flex items-center justify-center" style={{ width: 22, height: 22 }}>
            <span
              className="absolute inset-0 rounded-full"
              style={{ border: `1.4px solid ${currentEmotion.logoGradient[0]}` }}
            />
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: currentEmotion.logoGradient[0],
                boxShadow: `0 0 10px ${currentEmotion.logoGradient[0]}`,
              }}
            />
          </span>
          <span
            className="font-serif-cn relative"
            style={{
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 500,
              letterSpacing: "0.35em",
              textShadow: `0 0 14px ${currentEmotion.logoGradient[0]}66`,
            }}
          >
            开始探索
          </span>
        </motion.button>

        {/* Footer links */}
        <div className="mt-5 flex items-center gap-5">
          <button
            onClick={() => navigate("/journal")}
            className="font-serif-cn text-[11px] tracking-[0.3em] transition-opacity hover:opacity-100"
            style={{ color: "rgba(255,255,255,0.55)", fontWeight: 400, opacity: 0.75 }}
          >
            我的旅程
          </button>
          <span className="text-white/20">·</span>
          <div
            className="font-serif-cn text-[11px] tracking-[0.3em]"
            style={{ color: "rgba(255,255,255,0.5)", fontWeight: 400, opacity: 0.7 }}
          >
            登录 / 注册
          </div>
        </div>
      </motion.div>

      {/* Sink Transition Effect — disabled */}
      {false && isSinking && (
        <>
          {/* Implosion Center - Multiple Layers */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {/* Core Burst */}
            <motion.div
              className="w-full h-full rounded-full"
              style={{
                background: `radial-gradient(circle, ${currentEmotion.color}dd 0%, ${currentEmotion.color}66 20%, transparent 40%)`,
                filter: "blur(60px)",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 2, 4], opacity: [0, 1, 0] }}
              transition={{ duration: 1.5, ease: [0.43, 0.13, 0.23, 0.96] }}
            />
          </motion.div>

          {/* Vignette */}
          <motion.div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              background: `radial-gradient(circle at 50% 50%, transparent 20%, ${currentEmotion.color}cc 100%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.3 }}
          />

          {/* Flash */}
          <motion.div
            className="absolute inset-0 pointer-events-none z-30"
            style={{
              backgroundColor: currentEmotion.color,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 0.6, times: [0, 0.3, 1] }}
          />
        </>
      )}

      {/* Mood sheet — tap-to-type modal */}
      <AnimatePresence>
        {showMoodSheet && (
          <>
            <motion.div
              className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMoodSheet(false)}
            />
            <motion.div
              className="absolute left-0 right-0 bottom-0 z-50 rounded-t-3xl border-t backdrop-blur-2xl px-5 pt-3 pb-7"
              style={{
                borderColor: `${currentEmotion.logoGradient[0]}55`,
                backgroundColor: "rgba(18,18,20,0.94)",
                boxShadow: `0 -22px 60px ${currentEmotion.logoGradient[0]}44`,
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              <div className="w-10 h-1 mx-auto rounded-full bg-white/20 mb-4" />

              <div className="flex items-start justify-between mb-4">
                <div>
                  <div
                    className="font-serif-cn text-[10px] tracking-[0.4em]"
                    style={{ color: `${currentEmotion.logoGradient[0]}aa`, fontWeight: 500 }}
                  >
                    MOOD
                  </div>
                  <div
                    className="font-serif-cn text-[15px] tracking-[0.3em] text-white/95 mt-0.5"
                    style={{ fontWeight: 500 }}
                  >
                    此刻，想说点什么
                  </div>
                </div>
                <button
                  onClick={() => setShowMoodSheet(false)}
                  className="text-white/55 active:scale-95 transition-transform"
                >
                  <X size={18} />
                </button>
              </div>

              <textarea
                value={moodDraft}
                onChange={(e) => setMoodDraft(e.target.value)}
                placeholder="像写给自己的一行便签…"
                maxLength={80}
                rows={4}
                autoFocus
                className="w-full bg-white/5 border rounded-xl px-3 py-2.5 font-serif-cn outline-none resize-none mb-2"
                style={{
                  borderColor: `${currentEmotion.logoGradient[0]}33`,
                  color: "rgba(255,255,255,0.95)",
                  fontSize: 14,
                  letterSpacing: "0.1em",
                  lineHeight: 1.6,
                }}
              />
              <div
                className="text-right font-serif-cn text-[10px] tracking-[0.25em] text-white/40 mb-4"
                style={{ fontWeight: 400 }}
              >
                {moodDraft.length}/80
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setMoodText("");
                    setShowMoodSheet(false);
                  }}
                  className="flex-1 h-12 rounded-full border font-serif-cn text-[12px] tracking-[0.3em] text-white/70 active:scale-[0.98] transition-transform"
                  style={{ borderColor: "rgba(255,255,255,0.18)", fontWeight: 500 }}
                >
                  清空
                </button>
                <button
                  onClick={() => {
                    setMoodText(moodDraft.trim());
                    setShowMoodSheet(false);
                  }}
                  className="flex-[2] h-12 rounded-full font-serif-cn text-[13px] tracking-[0.35em] active:scale-[0.98] transition-transform"
                  style={{
                    backgroundColor: currentEmotion.logoGradient[0],
                    color: "#0a0a0a",
                    boxShadow: `0 0 24px ${currentEmotion.logoGradient[0]}66`,
                    fontWeight: 600,
                  }}
                >
                  存为此刻
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
