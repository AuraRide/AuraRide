import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import AnimatedBackground from "../components/AnimatedBackground";

const colorMoods = [
  {
    id: "calm-green",
    name: "治愈",
    color: "#2DD4BF",
    description: "寻找宁静",
  },
  {
    id: "release-red",
    name: "释放",
    color: "#F43F5E",
    description: "冲破束缚",
  },
  {
    id: "explore-yellow",
    name: "探索",
    color: "#FBBF24",
    description: "迷失街巷",
  },
  {
    id: "lonely-blue",
    name: "独行",
    color: "#3B82F6",
    description: "与夜同行",
  },
  {
    id: "tired-gray",
    name: "倦怠",
    color: "#94A3B8",
    description: "无需目的",
  },
];

export default function ColorCompass() {
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleColorSelect = (colorId: string) => {
    setSelectedColor(colorId);
    setTimeout(() => {
      if (colorId === "lonely-blue") {
        navigate("/deep-sea");
      } else if (colorId === "calm-green") {
        navigate("/healing");
      } else if (colorId === "release-red") {
        navigate("/burnout");
      } else {
        navigate("/generate", { state: { colorId } });
      }
    }, 800);
  };

  const activeColor = selectedColor || hoveredColor;
  const activeMood = colorMoods.find((c) => c.id === activeColor);

  return (
    <div className="size-full text-white overflow-hidden relative">
      <AnimatedBackground
        color={activeMood?.color || "#3B82F6"}
        opacity={0.35}
      />

      <div className="relative z-10 h-full flex flex-col items-center justify-center p-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-32"
        >
          <h1 className="text-[10px] tracking-[0.5em] text-white/40 mb-8 font-light">
            AURARIDE
          </h1>
          <p className="text-4xl font-extralight tracking-[0.05em]">
            {activeMood ? activeMood.description : "此刻的色彩"}
          </p>
        </motion.div>

        <div className="relative w-96 h-96 mb-32">
          {colorMoods.map((mood, index) => {
            const angle = (index / colorMoods.length) * Math.PI * 2 - Math.PI / 2;
            const radius = 150;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <motion.button
                key={mood.id}
                className="absolute w-24 h-24 rounded-full cursor-pointer backdrop-blur-xl border border-white/10"
                style={{
                  left: "50%",
                  top: "50%",
                  x: x - 48,
                  y: y - 48,
                  background: selectedColor === mood.id
                    ? `${mood.color}40`
                    : `${mood.color}15`,
                  boxShadow:
                    selectedColor === mood.id
                      ? `0 0 60px ${mood.color}88, inset 0 0 20px ${mood.color}44`
                      : hoveredColor === mood.id
                      ? `0 0 40px ${mood.color}55, inset 0 0 10px ${mood.color}22`
                      : `0 0 20px ${mood.color}22`,
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: selectedColor === mood.id ? 1.4 : 1,
                  opacity: selectedColor && selectedColor !== mood.id ? 0.2 : 1,
                }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  delay: index * 0.1,
                }}
                whileHover={{ scale: 1.15 }}
                onHoverStart={() => setHoveredColor(mood.id)}
                onHoverEnd={() => setHoveredColor(null)}
                onClick={() => handleColorSelect(mood.id)}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span
                    className="text-[11px] font-light tracking-[0.2em]"
                    style={{ color: mood.color }}
                  >
                    {mood.name}
                  </span>
                </div>
              </motion.button>
            );
          })}

          <motion.div
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            animate={{
              opacity: selectedColor ? [0.5, 1, 0.5] : 0,
              scale: selectedColor ? [1, 1.2, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: selectedColor ? Infinity : 0,
            }}
          >
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: activeMood?.color,
                boxShadow: `0 0 40px ${activeMood?.color}, 0 0 80px ${activeMood?.color}66`,
              }}
            />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: selectedColor ? 0 : 0.3 }}
          className="text-[10px] tracking-[0.3em] text-white/30 font-light"
        >
          选择你的情绪色彩
        </motion.div>
      </div>
    </div>
  );
}
