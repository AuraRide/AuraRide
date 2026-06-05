import { motion } from "motion/react";

interface EmotionEffectsProps {
  emotionId: string;
  color: string;
}

export default function EmotionEffects({ emotionId, color }: EmotionEffectsProps) {
  // Void - Snow/Static Effect with Drift
  if (emotionId === "void-gray") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(60)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 2 + 1,
              height: Math.random() * 2 + 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: `rgba(255, 255, 255, ${Math.random() * 0.3 + 0.1})`,
              filter: "blur(0.5px)",
            }}
            animate={{
              opacity: [0.1, 0.6, 0.1],
              y: [0, Math.random() * 100 - 50],
              x: [0, Math.random() * 60 - 30],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "linear",
            }}
          />
        ))}
      </div>
    );
  }

  // Depth - Phosphorescent Dots with Slow Float
  if (emotionId === "depth-blue") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 6 + 2,
              height: Math.random() * 6 + 2,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: color,
              boxShadow: `0 0 ${10 + Math.random() * 15}px ${color}`,
              filter: "blur(1px)",
            }}
            animate={{
              opacity: [0.2, 0.9, 0.2],
              scale: [0.7, 1.3, 0.7],
              y: [0, -20 - Math.random() * 30, 0],
            }}
            transition={{
              duration: 6 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 6,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
  }

  // Moss - Floating Dust
  if (emotionId === "moss-green") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(25)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              left: `${Math.random() * 100}%`,
              bottom: `${Math.random() * 100}%`,
              backgroundColor: `${color}88`,
              filter: "blur(1px)",
            }}
            animate={{
              y: [-100 - Math.random() * 200, 0],
              x: [(Math.random() - 0.5) * 50, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: "easeOut",
            }}
          />
        ))}
      </div>
    );
  }

  // Trace - Light Streaks and Fragments
  if (emotionId === "trace-yellow") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Light Streaks */}
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={`streak-${i}`}
            className="absolute h-px origin-left"
            style={{
              width: Math.random() * 200 + 120,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `linear-gradient(90deg, transparent, ${color}88, ${color}44, transparent)`,
              rotate: Math.random() * 180 - 90,
              filter: "blur(1.5px)",
            }}
            animate={{
              opacity: [0, 0.7, 0],
              scaleX: [0, 1, 0.3],
            }}
            transition={{
              duration: 1.5 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 6,
              ease: [0.43, 0.13, 0.23, 0.96],
            }}
          />
        ))}

        {/* Geometric Fragments */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`fragment-${i}`}
            className="absolute"
            style={{
              width: Math.random() * 20 + 10,
              height: 1,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              backgroundColor: `${color}55`,
              rotate: Math.random() * 360,
            }}
            animate={{
              opacity: [0, 0.6, 0],
              rotate: [0, 90, 180],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 4,
            }}
          />
        ))}
      </div>
    );
  }

  // Ember - Sparks and Flickers
  if (emotionId === "ember-red") {
    return (
      <div className="absolute inset-0 pointer-events-none">
        {/* Rising Embers */}
        {[...Array(25)].map((_, i) => {
          const isOrange = i % 3 === 0;
          const emberColor = isOrange ? "#ff6b35" : i % 2 === 0 ? "#ff8c30" : color;

          return (
            <motion.div
              key={`ember-${i}`}
              className="absolute rounded-full"
              style={{
                width: Math.random() * 5 + 2,
                height: Math.random() * 5 + 2,
                left: `${Math.random() * 100}%`,
                bottom: `${Math.random() * 20}%`,
                backgroundColor: emberColor,
                boxShadow: `0 0 ${8 + Math.random() * 12}px ${emberColor}`,
              }}
              animate={{
                y: [-250 - Math.random() * 250, 0],
                x: [(Math.random() - 0.5) * 120, 0],
                opacity: [0, 0.95, 0.6, 0],
                scale: [0.4, 1.2, 0.8, 0.2],
              }}
              transition={{
                duration: 3.5 + Math.random() * 3.5,
                repeat: Infinity,
                delay: Math.random() * 5,
                ease: [0.34, 0.46, 0.68, 0.92],
              }}
            />
          );
        })}

        {/* Pulsing Hotspots */}
        {[...Array(8)].map((_, i) => (
          <motion.div
            key={`hotspot-${i}`}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 40 + 30,
              height: Math.random() * 40 + 30,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, ${color}66 0%, transparent 70%)`,
              filter: "blur(15px)",
            }}
            animate={{
              opacity: [0.2, 0.6, 0.3, 0.7, 0.2],
              scale: [0.8, 1.2, 0.9, 1.1, 0.8],
            }}
            transition={{
              duration: 2 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: [0.45, 0.05, 0.55, 0.95],
            }}
          />
        ))}
      </div>
    );
  }

  return null;
}
