import { motion } from "motion/react";
import { useState } from "react";

interface RippleEffect {
  id: number;
  x: number;
  y: number;
}

export default function DeepSeaBackground() {
  const [ripples, setRipples] = useState<RippleEffect[]>([]);

  const handlePress = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    const newRipple = {
      id: Date.now(),
      x,
      y,
    };

    setRipples((prev) => [...prev, newRipple]);

    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== newRipple.id));
    }, 4000);
  };

  return (
    <div
      className="absolute inset-0 overflow-hidden bg-black cursor-pointer"
      onMouseDown={handlePress}
      onTouchStart={handlePress}
    >
      {/* Deep Navy Base Layer */}
      <div className="absolute inset-0 bg-[#0a1628]" />

      {/* Deep Sea Blob 1 - Dark Lake Blue */}
      <motion.div
        className="absolute w-[1000px] h-[1000px] rounded-full"
        style={{
          background: "radial-gradient(circle, #1e3a5f 0%, transparent 65%)",
          filter: "blur(120px)",
          top: "-20%",
          left: "-10%",
        }}
        animate={{
          x: ["-5%", "8%", "-5%"],
          y: ["-5%", "10%", "-5%"],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Deep Sea Blob 2 - Navy */}
      <motion.div
        className="absolute w-[900px] h-[900px] rounded-full"
        style={{
          background: "radial-gradient(circle, #0f2847 0%, transparent 65%)",
          filter: "blur(140px)",
          bottom: "-10%",
          right: "-5%",
        }}
        animate={{
          x: ["5%", "-8%", "5%"],
          y: ["5%", "-10%", "5%"],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Deep Sea Blob 3 - Darker Blue */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: "radial-gradient(circle, #132d4a 0%, transparent 70%)",
          filter: "blur(100px)",
          top: "40%",
          left: "30%",
        }}
        animate={{
          x: ["-10%", "10%", "-10%"],
          y: ["-8%", "8%", "-8%"],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Phosphorescent Glow - Center Highlight */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: "radial-gradient(circle, #2563eb44 0%, transparent 60%)",
          filter: "blur(80px)",
          top: "50%",
          left: "50%",
          x: "-50%",
          y: "-50%",
        }}
        animate={{
          opacity: [0.3, 0.7, 0.3],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Whale Breath - Secondary Glow */}
      <motion.div
        className="absolute w-[500px] h-[500px] rounded-full"
        style={{
          background: "radial-gradient(circle, #3b82f633 0%, transparent 65%)",
          filter: "blur(90px)",
          top: "30%",
          left: "60%",
        }}
        animate={{
          opacity: [0.25, 0.6, 0.25],
          scale: [0.95, 1.1, 0.95],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 3,
        }}
      />

      {/* Subtle Particles */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-blue-400/20"
          style={{
            top: `${20 + i * 10}%`,
            left: `${10 + i * 12}%`,
          }}
          animate={{
            opacity: [0.1, 0.4, 0.1],
            y: [0, -30, 0],
          }}
          transition={{
            duration: 8 + i * 0.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.8,
          }}
        />
      ))}

      {/* Ink Ripple Effects */}
      {ripples.map((ripple) => (
        <motion.div
          key={ripple.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 0,
            height: 0,
            background: "radial-gradient(circle, #3b82f666 0%, #1e3a5f33 40%, transparent 70%)",
            filter: "blur(40px)",
          }}
          initial={{
            width: 0,
            height: 0,
            opacity: 0.8,
            x: "-50%",
            y: "-50%",
          }}
          animate={{
            width: 800,
            height: 800,
            opacity: 0,
          }}
          transition={{
            duration: 3.5,
            ease: [0.2, 0, 0.2, 1],
          }}
        />
      ))}

      {/* Subtle Noise Texture */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}
