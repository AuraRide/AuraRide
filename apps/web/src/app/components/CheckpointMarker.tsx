import { motion, AnimatePresence } from "motion/react";

interface CheckpointMarkerProps {
  isNearby: boolean;
  isReached: boolean;
  color: string;
  name: string;
  message: string;
  subtitle: string;
  x: number;
  y: number;
}

export default function CheckpointMarker({
  isNearby,
  isReached,
  color,
  name,
  message,
  subtitle,
  x,
  y,
}: CheckpointMarkerProps) {
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Pre-trigger: Rotating Ring */}
      {isNearby && !isReached && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
        >
          <svg width="60" height="60" viewBox="0 0 60 60">
            <circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke={color}
              strokeWidth="1"
              opacity="0.4"
            />
            <motion.circle
              cx="30"
              cy="30"
              r="26"
              fill="none"
              stroke={color}
              strokeWidth="1.5"
              strokeDasharray="40 120"
              strokeLinecap="round"
              animate={{
                strokeDashoffset: [0, -160],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                filter: `drop-shadow(0 0 6px ${color}88)`,
              }}
            />
          </svg>
        </motion.div>
      )}

      {/* Reached: Ripple Effect */}
      <AnimatePresence>
        {isReached && (
          <>
            {/* Three-layer Ripples */}
            {[0, 0.15, 0.3].map((delay, i) => (
              <motion.div
                key={`ripple-${i}`}
                className="absolute rounded-full border"
                style={{
                  borderColor: color,
                  borderWidth: 2,
                }}
                initial={{
                  width: 20,
                  height: 20,
                  opacity: 0.8,
                  x: "-50%",
                  y: "-50%",
                }}
                animate={{
                  width: 100,
                  height: 100,
                  opacity: 0,
                }}
                exit={{ opacity: 0 }}
                transition={{
                  duration: 1.2,
                  delay: delay,
                  ease: [0.43, 0.13, 0.23, 0.96],
                }}
              />
            ))}

            {/* Solid Geometric Point */}
            <motion.div
              className="absolute w-3 h-3 rounded-full"
              style={{
                backgroundColor: color,
                boxShadow: `0 0 20px ${color}aa, inset 0 0 10px ${color}`,
                x: "-50%",
                y: "-50%",
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{
                delay: 0.4,
                duration: 0.4,
                type: "spring",
                stiffness: 300,
              }}
            />

            {/* Affirmation Text */}
            <motion.div
              className="absolute top-12 left-1/2 -translate-x-1/2 text-center whitespace-nowrap"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.6, duration: 0.8 }}
            >
              <div
                className="text-xl font-black tracking-[0.2em] mb-1"
                style={{ color }}
              >
                {message}
              </div>
              <div className="text-xs font-light text-white/60 tracking-wide">
                {subtitle}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Unreached Marker */}
      {!isReached && !isNearby && (
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{
            backgroundColor: `${color}66`,
            boxShadow: `0 0 8px ${color}44`,
          }}
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        />
      )}
    </div>
  );
}
