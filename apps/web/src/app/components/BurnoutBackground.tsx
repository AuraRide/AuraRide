import { motion } from "motion/react";
import { useState, useEffect } from "react";

interface HeatPoint {
  id: number;
  x: number;
  y: number;
}

export default function BurnoutBackground() {
  const [heatPoints, setHeatPoints] = useState<HeatPoint[]>([]);
  const [flickers, setFlickers] = useState<number[]>(
    Array.from({ length: 6 }, () => Math.random())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setFlickers(Array.from({ length: 6 }, () => Math.random()));
    }, 150 + Math.random() * 200);

    return () => clearInterval(interval);
  }, []);

  const handleTouch = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const newPoint = { id: Date.now(), x, y };
    setHeatPoints((prev) => [...prev, newPoint]);

    setTimeout(() => {
      setHeatPoints((prev) => prev.filter((p) => p.id !== newPoint.id));
    }, 2000);
  };

  return {
    background: (
      <div
        className="absolute inset-0 overflow-hidden bg-black cursor-pointer"
        onMouseMove={handleTouch}
        onTouchMove={handleTouch}
      >
        {/* Ash Black Base */}
        <div className="absolute inset-0 bg-[#0a0605]" />

        {/* Dark Red Base Layer */}
        <div
          className="absolute inset-0"
          style={{
            background: "radial-gradient(circle at 50% 50%, #1a0a0a 0%, #000000 100%)",
          }}
        />

        {/* Lava/Magma Blob 1 - Dark Red */}
        <motion.div
          className="absolute w-[1000px] h-[1000px] rounded-full"
          style={{
            background: "radial-gradient(circle, #4a1a1a 0%, transparent 60%)",
            filter: "blur(100px)",
            top: "-20%",
            left: "-15%",
          }}
          animate={{
            x: ["-5%", "8%", "-5%"],
            y: ["-3%", "7%", "-3%"],
            scale: [1, 1.12, 1],
            opacity: [0.3 + flickers[0] * 0.2, 0.5 + flickers[0] * 0.3, 0.3 + flickers[0] * 0.2],
          }}
          transition={{
            duration: 2 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Ember Orange Blob 2 */}
        <motion.div
          className="absolute w-[900px] h-[900px] rounded-full"
          style={{
            background: "radial-gradient(circle, #5a2a10 0%, transparent 60%)",
            filter: "blur(110px)",
            bottom: "-15%",
            right: "-10%",
          }}
          animate={{
            x: ["5%", "-8%", "5%"],
            y: ["3%", "-7%", "3%"],
            scale: [1, 1.15, 1],
            opacity: [0.35 + flickers[1] * 0.2, 0.55 + flickers[1] * 0.25, 0.35 + flickers[1] * 0.2],
          }}
          transition={{
            duration: 2.5 + Math.random() * 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Hot Core - Center */}
        <motion.div
          className="absolute w-[700px] h-[700px] rounded-full"
          style={{
            background: "radial-gradient(circle, #6a2a1a 0%, transparent 65%)",
            filter: "blur(90px)",
            top: "30%",
            left: "40%",
          }}
          animate={{
            scale: [0.95, 1.18, 0.95],
            opacity: [0.3 + flickers[2] * 0.25, 0.6 + flickers[2] * 0.3, 0.3 + flickers[2] * 0.25],
            rotate: [0, 15, 0, -15, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        />

        {/* Thermal Accent Spots */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: 200 + i * 50,
              height: 200 + i * 50,
              background: `radial-gradient(circle, ${
                i % 2 === 0 ? "#d2691e" : "#8b3a1e"
              }${Math.floor((0.2 + flickers[i] * 0.3) * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
              filter: `blur(${60 + i * 10}px)`,
              top: `${20 + i * 15}%`,
              left: `${10 + i * 12}%`,
            }}
            animate={{
              opacity: [0.15 + flickers[i] * 0.2, 0.4 + flickers[i] * 0.25, 0.15 + flickers[i] * 0.2],
              scale: [0.9, 1.1, 0.9],
            }}
            transition={{
              duration: 1 + Math.random() * 1.5,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.2,
            }}
          />
        ))}

        {/* Ember Particles */}
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={`ember-${i}`}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 4 + 2,
              height: Math.random() * 4 + 2,
              background: `rgba(255, ${100 + Math.random() * 80}, 30, ${0.4 + Math.random() * 0.4})`,
              left: `${Math.random() * 100}%`,
              top: `${50 + Math.random() * 50}%`,
              filter: "blur(1px)",
              boxShadow: "0 0 8px rgba(255, 140, 30, 0.8)",
            }}
            animate={{
              y: [0, -200 - Math.random() * 200],
              x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 100],
              opacity: [0, 0.8, 0],
              scale: [0.5, 1, 0.3],
            }}
            transition={{
              duration: 4 + Math.random() * 4,
              repeat: Infinity,
              delay: Math.random() * 5,
              ease: "easeOut",
            }}
          />
        ))}

        {/* Heat Distortion Points */}
        {heatPoints.map((point) => (
          <motion.div
            key={point.id}
            className="absolute rounded-full pointer-events-none mix-blend-screen"
            style={{
              left: point.x,
              top: point.y,
              width: 0,
              height: 0,
            }}
            initial={{
              width: 0,
              height: 0,
              opacity: 0.8,
              x: "-50%",
              y: "-50%",
            }}
            animate={{
              width: 300,
              height: 300,
              opacity: 0,
            }}
            transition={{
              duration: 1.5,
              ease: "easeOut",
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                background: "radial-gradient(circle, #ff8c3088 0%, #d2691e33 30%, transparent 60%)",
                filter: "blur(30px)",
              }}
            />
          </motion.div>
        ))}

        {/* Noise Texture */}
        <div
          className="absolute inset-0 opacity-[0.04] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.95' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
          }}
        />
      </div>
    ),
  };
}
