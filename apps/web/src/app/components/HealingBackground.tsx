import { motion } from "motion/react";
import { useState } from "react";

interface WaveEffect {
  id: number;
}

export default function HealingBackground() {
  const [waves, setWaves] = useState<WaveEffect[]>([]);

  const handleConfirm = () => {
    const newWave = { id: Date.now() };
    setWaves((prev) => [...prev, newWave]);

    setTimeout(() => {
      setWaves((prev) => prev.filter((w) => w.id !== newWave.id));
    }, 2000);
  };

  return {
    background: (
      <div className="absolute inset-0 overflow-hidden bg-black">
        {/* Moss Green Base */}
        <div className="absolute inset-0 bg-[#0d1410]" />

        {/* God Rays Effect - Layer 1 */}
        <motion.div
          className="absolute w-full h-full"
          style={{
            background:
              "linear-gradient(135deg, transparent 0%, #2d5016 30%, transparent 60%, #405920 80%, transparent 100%)",
            filter: "blur(80px)",
            opacity: 0.4,
          }}
          animate={{
            x: ["-5%", "5%", "-5%"],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* God Rays Effect - Layer 2 */}
        <motion.div
          className="absolute w-full h-full"
          style={{
            background:
              "linear-gradient(45deg, transparent 0%, #3d5a1f 20%, transparent 50%, #2a4515 70%, transparent 100%)",
            filter: "blur(100px)",
            opacity: 0.3,
          }}
          animate={{
            x: ["5%", "-5%", "5%"],
            opacity: [0.25, 0.45, 0.25],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1,
          }}
        />

        {/* Moss Green Blob 1 */}
        <motion.div
          className="absolute w-[900px] h-[900px] rounded-full"
          style={{
            background: "radial-gradient(circle, #3a5a22 0%, transparent 65%)",
            filter: "blur(110px)",
            top: "-15%",
            left: "-10%",
          }}
          animate={{
            x: ["-3%", "7%", "-3%"],
            y: ["-3%", "8%", "-3%"],
            scale: [1, 1.1, 1],
            opacity: [0.4, 0.6, 0.4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Moss Green Blob 2 */}
        <motion.div
          className="absolute w-[800px] h-[800px] rounded-full"
          style={{
            background: "radial-gradient(circle, #2a4515 0%, transparent 65%)",
            filter: "blur(120px)",
            bottom: "-10%",
            right: "-5%",
          }}
          animate={{
            x: ["3%", "-7%", "3%"],
            y: ["3%", "-8%", "3%"],
            scale: [1, 1.15, 1],
            opacity: [0.35, 0.55, 0.35],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5,
          }}
        />

        {/* Dawn Yellow Accent */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: "radial-gradient(circle, #8b7355 0%, transparent 60%)",
            filter: "blur(90px)",
            top: "20%",
            right: "15%",
          }}
          animate={{
            opacity: [0.15, 0.35, 0.15],
            scale: [0.9, 1.05, 0.9],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 1.5,
          }}
        />

        {/* Heartbeat Pulse Center */}
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full"
          style={{
            background: "radial-gradient(circle, #4a6b2a44 0%, transparent 65%)",
            filter: "blur(70px)",
            top: "50%",
            left: "50%",
            x: "-50%",
            y: "-50%",
          }}
          animate={{
            scale: [0.95, 1.08, 0.95],
            opacity: [0.3, 0.55, 0.3],
          }}
          transition={{
            duration: 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Floating Dust Particles */}
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1,
              height: Math.random() * 3 + 1,
              background: `rgba(138, 180, 90, ${Math.random() * 0.4 + 0.2})`,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              filter: "blur(1px)",
            }}
            animate={{
              y: [0, -100 - Math.random() * 100],
              x: [0, (Math.random() - 0.5) * 40],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 8,
              ease: "easeInOut",
            }}
          />
        ))}

        {/* Wind Wave Effects */}
        {waves.map((wave) => (
          <motion.div
            key={wave.id}
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "linear-gradient(0deg, #4a6b2a66 0%, #4a6b2a33 30%, transparent 60%)",
              filter: "blur(40px)",
            }}
            initial={{
              y: "100%",
              opacity: 0,
            }}
            animate={{
              y: "-100%",
              opacity: [0, 0.8, 0],
            }}
            transition={{
              duration: 1.8,
              ease: [0.25, 0.1, 0.25, 1],
            }}
          />
        ))}
      </div>
    ),
    triggerWave: handleConfirm,
  };
}
