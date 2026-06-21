import { motion } from "motion/react";
import { useMemo } from "react";

interface FluidCanvasProps {
  currentColor: string;
  nextColor?: string;
  blendProgress: number;
}

export default function FluidCanvas({
  currentColor,
  nextColor,
  blendProgress,
}: FluidCanvasProps) {
  const particles = useMemo(
    () =>
      Array.from({ length: 25 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 200 + 150,
        delay: Math.random() * 5,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Current Color Blobs */}
      <motion.div
        className="absolute inset-0"
        animate={{
          x: `-${blendProgress * 50}%`,
          opacity: 1 - blendProgress * 0.5,
        }}
        transition={{
          type: "spring",
          stiffness: 60,
          damping: 35,
        }}
      >
        {particles.slice(0, 13).map((particle) => (
          <motion.div
            key={`current-${particle.id}`}
            className="absolute rounded-full"
            style={{
              width: particle.size,
              height: particle.size,
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              background: `radial-gradient(circle, ${currentColor}44 0%, transparent 70%)`,
              filter: "blur(80px)",
            }}
            animate={{
              x: [0, 30, -20, 0],
              y: [0, -40, 20, 0],
              scale: [1, 1.2, 0.9, 1],
              opacity: [0.4, 0.6, 0.5, 0.4],
            }}
            transition={{
              duration: 20 + particle.delay,
              repeat: Infinity,
              ease: "easeInOut",
              delay: particle.delay,
            }}
          />
        ))}
      </motion.div>

      {/* Next Color Blobs */}
      {nextColor && blendProgress > 0 && (
        <motion.div
          className="absolute inset-0"
          initial={{ x: "100%" }}
          animate={{
            x: `${100 - blendProgress * 50}%`,
            opacity: blendProgress * 0.8 + 0.2,
          }}
          transition={{
            type: "spring",
            stiffness: 60,
            damping: 35,
          }}
        >
          {particles.slice(13, 25).map((particle) => (
            <motion.div
              key={`next-${particle.id}`}
              className="absolute rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                left: `${particle.x}%`,
                top: `${particle.y}%`,
                background: `radial-gradient(circle, ${nextColor}44 0%, transparent 70%)`,
                filter: "blur(80px)",
              }}
              animate={{
                x: [0, -30, 20, 0],
                y: [0, 40, -20, 0],
                scale: [1, 0.9, 1.2, 1],
                opacity: [0.4, 0.5, 0.6, 0.4],
              }}
              transition={{
                duration: 18 + particle.delay,
                repeat: Infinity,
                ease: "easeInOut",
                delay: particle.delay,
              }}
            />
          ))}
        </motion.div>
      )}

      {/* Frosted Glass Overlay */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-black/10" />

      {/* Noise Texture */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
