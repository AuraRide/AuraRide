import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { Smartphone, Watch } from "lucide-react";
import AnimatedBackground from "../components/AnimatedBackground";

export default function WatchSelector() {
  const navigate = useNavigate();

  const devices = [
    {
      id: "phone",
      name: "光屿骑行",
      icon: Smartphone,
      path: "/",
      description: "全新体验",
    },
    {
      id: "classic",
      name: "色彩罗盘",
      icon: Smartphone,
      path: "/phone",
      description: "经典模式",
    },
    {
      id: "watch",
      name: "手表端",
      icon: Watch,
      path: "/watch",
      description: "骑行模式",
    },
  ];

  return (
    <div className="size-full text-white overflow-hidden relative">
      <AnimatedBackground color="#3B82F6" opacity={0.25} />

      <div className="relative z-10 h-full flex items-center justify-center p-16">
        <div className="max-w-lg w-full space-y-16">
          <div className="text-center space-y-6">
            <h1 className="text-[10px] tracking-[0.5em] text-white/40 font-light">
              AURARIDE
            </h1>
            <p className="text-3xl font-extralight tracking-[0.05em]">
              选择设备
            </p>
          </div>

          <div className="grid gap-6">
            {devices.map((device, index) => (
              <motion.button
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.15 }}
                onClick={() => {
                  if (device.id === "watch") {
                    navigate(device.path, { state: { colorId: "calm-green" } });
                  } else {
                    navigate(device.path);
                  }
                }}
                className="group relative p-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl text-left overflow-hidden transition-all"
                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 8px 32px rgba(59, 130, 246, 0.2)",
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                />

                <div className="relative flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-xl">
                    <device.icon size={28} className="text-white/60" />
                  </div>
                  <div className="flex-1">
                    <div className="text-xl font-light tracking-wide mb-1">
                      {device.name}
                    </div>
                    <div className="text-[10px] text-white/30 tracking-[0.2em] font-light">
                      {device.description}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
