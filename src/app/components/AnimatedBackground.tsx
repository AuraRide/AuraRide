import { motion } from "motion/react";

interface AnimatedBackgroundProps {
  color: string;
  opacity?: number;
}

export default function AnimatedBackground({
  color,
  opacity = 0.4,
}: AnimatedBackgroundProps) {
  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {/* Main Aurora Blob 1 */}
      <motion.div
        className="absolute w-[800px] h-[800px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}${Math.round(opacity * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          filter: "blur(80px)",
        }}
        animate={{
          x: ["-20%", "10%", "-10%", "-20%"],
          y: ["-10%", "20%", "-5%", "-10%"],
          scale: [1, 1.1, 0.95, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Aurora Blob 2 */}
      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}${Math.round(opacity * 0.8 * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          filter: "blur(100px)",
          right: 0,
          bottom: 0,
        }}
        animate={{
          x: ["20%", "-10%", "15%", "20%"],
          y: ["10%", "-20%", "5%", "10%"],
          scale: [1, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Aurora Blob 3 */}
      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full"
        style={{
          background: `radial-gradient(circle, ${color}${Math.round(opacity * 0.6 * 255).toString(16).padStart(2, '0')} 0%, transparent 70%)`,
          filter: "blur(90px)",
          left: "50%",
          top: "50%",
        }}
        animate={{
          x: ["-50%", "-45%", "-55%", "-50%"],
          y: ["-50%", "-45%", "-55%", "-50%"],
          scale: [1, 1.15, 0.9, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Mesh Grid Overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(${color}33 1px, transparent 1px),
            linear-gradient(90deg, ${color}33 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }}
      />

      {/* Breathing Overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color}11 0%, transparent 60%)`,
        }}
        animate={{
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
