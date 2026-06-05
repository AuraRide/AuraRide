import { useLocation, useNavigate } from "react-router";
import { motion } from "motion/react";
import { Leaf, ArrowRight } from "lucide-react";

const routeColors: Record<string, string> = {
  "calm-green": "#5A9B8E",
  "release-red": "#B87A7A",
  "explore-yellow": "#C4A57B",
  "lonely-blue": "#6B8AAF",
  "tired-gray": "#8B9AA3",
};

const closingMessages: Record<string, { en: string; cn: string; impression: string[]; note: string }> = {
  "calm-green": {
    en: "M O S S",
    cn: "顺应风向，把心跳交还给潮汐。",
    impression: ["顺风", "轻松巡航", "城市漫游"],
    note: "风景早已等候，你只是按时抵达。",
  },
  "release-red": {
    en: "E M B E R",
    cn: "撕开风阻，让不安在直道上彻底燃尽。",
    impression: ["逆风", "高强冲刺", "直道燃尽"],
    note: "不安已被甩在身后，呼吸归于平稳。",
  },
  "explore-yellow": {
    en: "T R A C E",
    cn: "循迹宽街，在建筑的折痕里听长回声。",
    impression: ["微风", "节奏巡游", "街巷穿行"],
    note: "宽街收纳了你的轨迹，回声仍在延展。",
  },
  "lonely-blue": {
    en: "D E P T H",
    cn: "潜入暗流，将喧嚣沉降于底面。",
    impression: ["静风", "稳速下沉", "深处独行"],
    note: "喧嚣已沉入水底，你浮回了自己。",
  },
  "tired-gray": {
    en: "V O I D",
    cn: "隐入网格，做一阵没有轨迹的风。",
    impression: ["顺风", "轻松巡航", "网格漫游"],
    note: "你不必被看见，也已经抵达。",
  },
};

export default function Review() {
  const location = useLocation();
  const navigate = useNavigate();
  const colorId = location.state?.colorId || "calm-green";
  const distance = location.state?.distance || 2.4;
  const duration = location.state?.duration || 60;

  const themeColor = routeColors[colorId];
  const message = closingMessages[colorId];
  const minutes = Math.max(1, Math.floor(duration / 60));
  const pace = ((duration / 60) / Math.max(distance, 0.01)).toFixed(1);

  return (
    <div className="size-full text-white overflow-hidden relative bg-black">
      {/* Ambient background */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 90% 70% at 35% 30%, ${themeColor}33 0%, ${themeColor}14 30%, #000000 70%)`,
          }}
          animate={{ opacity: [0.6, 0.85, 0.6] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute inset-0"
          style={{
            background: `radial-gradient(ellipse 60% 50% at 70% 80%, ${themeColor}22 0%, transparent 55%)`,
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut", delay: 3 }}
        />
      </div>

      {/* Faint grid texture */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.06 }}>
        <defs>
          <pattern id="grid-bg" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-bg)" />
      </svg>

      <div className="relative z-10 h-full flex flex-col" style={{ padding: "44px 20px 28px 20px" }}>
        {/* Top - title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 1 }}
          className="text-center mb-5"
        >
          <div
            className="mb-2"
            style={{
              color: themeColor,
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.55em",
              textShadow: `0 0 14px ${themeColor}88`,
            }}
          >
            {message.en}
          </div>
          <div
            className="font-serif-cn"
            style={{
              color: "rgba(255,255,255,0.82)",
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: "0.12em",
            }}
          >
            {message.cn}
          </div>
        </motion.div>

        {/* Distance card */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.9 }}
          className="rounded-3xl px-5 py-5 mb-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: `0 0 40px ${themeColor}22, inset 0 0 30px rgba(255,255,255,0.02)`,
          }}
        >
          <div
            className="text-center mb-1"
            style={{
              color: themeColor,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.32em",
            }}
          >
            本次骑行已完成
          </div>
          <div className="flex items-baseline justify-center gap-2">
            <div
              className="tabular-nums leading-none"
              style={{
                color: "#ffffff",
                fontSize: 72,
                fontWeight: 200,
                letterSpacing: "-0.04em",
                textShadow: `0 0 35px ${themeColor}88`,
              }}
            >
              {distance.toFixed(2)}
            </div>
            <div
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: 22,
                fontWeight: 300,
                letterSpacing: "0.05em",
              }}
            >
              km
            </div>
          </div>
          <div
            className="font-serif-cn text-center mt-1"
            style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 500 }}
          >
            {minutes} 分钟
          </div>
        </motion.div>

        {/* Route wave with checkpoints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 1 }}
          className="relative mb-4"
          style={{ height: 76 }}
        >
          <svg viewBox="0 0 320 76" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <motion.path
              d="M 20 56 Q 70 18, 110 36 Q 160 60, 200 24 Q 250 0, 300 40"
              fill="none"
              stroke={themeColor}
              strokeWidth="8"
              strokeLinecap="round"
              opacity="0.18"
              style={{ filter: "blur(5px)" }}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2.2, ease: "easeOut" }}
            />
            <motion.path
              d="M 20 56 Q 70 18, 110 36 Q 160 60, 200 24 Q 250 0, 300 40"
              fill="none"
              stroke={themeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="3 4"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeOut" }}
              style={{ filter: `drop-shadow(0 0 4px ${themeColor})` }}
            />
            {[
              { x: 20, y: 56 },
              { x: 110, y: 36 },
              { x: 200, y: 24 },
              { x: 300, y: 40 },
            ].map((p, i) => (
              <motion.circle
                key={i}
                cx={p.x}
                cy={p.y}
                r="4"
                fill={themeColor}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 1.2 + i * 0.15, duration: 0.5 }}
                style={{ filter: `drop-shadow(0 0 6px ${themeColor})` }}
              />
            ))}
          </svg>
          <div
            className="absolute left-0 bottom-0 font-serif-cn"
            style={{ color: `${themeColor}cc`, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em" }}
          >
            起点
          </div>
          <div
            className="absolute right-0 bottom-0 font-serif-cn"
            style={{ color: `${themeColor}cc`, fontSize: 10, fontWeight: 500, letterSpacing: "0.2em" }}
          >
            终点
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.95, duration: 0.9 }}
          className="grid grid-cols-3 rounded-2xl overflow-hidden mb-3"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {[
            { value: pace, label: "平均配速", unit: "min/km" },
            { value: "3", label: "打卡数", unit: "" },
            { value: "80", label: "平均心率", unit: "bpm" },
          ].map((s, i) => (
            <div
              key={s.label}
              className="py-3 px-2 text-center relative"
              style={{ borderLeft: i > 0 ? "1px solid rgba(255,255,255,0.08)" : "none" }}
            >
              <div className="flex items-baseline justify-center gap-1">
                <div
                  className="tabular-nums"
                  style={{
                    color: "#ffffff",
                    fontSize: 22,
                    fontWeight: 300,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {s.value}
                </div>
                {s.unit && (
                  <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 500 }}>
                    {s.unit}
                  </div>
                )}
              </div>
              <div
                className="font-serif-cn mt-0.5"
                style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, fontWeight: 500, letterSpacing: "0.15em" }}
              >
                {s.label}
              </div>
            </div>
          ))}
        </motion.div>

        {/* Impression card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.15, duration: 0.9 }}
          className="rounded-2xl px-4 py-3 mb-5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Leaf size={12} style={{ color: themeColor }} />
            <div
              className="font-serif-cn"
              style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 500, letterSpacing: "0.2em" }}
            >
              骑行印象
            </div>
            <div className="flex-1 flex justify-end gap-1.5">
              {message.impression.map((tag) => (
                <span
                  key={tag}
                  className="font-serif-cn px-2 py-0.5 rounded-full"
                  style={{
                    color: themeColor,
                    background: `${themeColor}1a`,
                    border: `0.5px solid ${themeColor}44`,
                    fontSize: 9,
                    fontWeight: 500,
                    letterSpacing: "0.1em",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
          <div
            className="font-serif-cn"
            style={{ color: "rgba(255,255,255,0.65)", fontSize: 11, fontWeight: 500, lineHeight: 1.6 }}
          >
            {message.note}
          </div>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4, duration: 0.9 }}
          className="mt-auto space-y-3"
        >
          <button
            onClick={() => navigate("/emotions")}
            className="w-full rounded-full flex items-center justify-center gap-2 transition-all"
            style={{
              height: 48,
              background: `linear-gradient(180deg, ${themeColor} 0%, ${themeColor}dd 100%)`,
              border: `1px solid ${themeColor}`,
              boxShadow: `0 0 38px ${themeColor}88, 0 0 14px ${themeColor}aa, inset 0 1px 0 rgba(255,255,255,0.35)`,
              color: "#0a0f0d",
            }}
          >
            <span
              className="font-serif-cn"
              style={{ fontSize: 14, fontWeight: 600, letterSpacing: "0.3em" }}
            >
              保存记录
            </span>
            <ArrowRight size={14} strokeWidth={2.5} />
          </button>
          <button
            onClick={() => navigate("/emotions")}
            className="w-full rounded-full transition-all"
            style={{
              height: 44,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.18)",
              color: "rgba(255,255,255,0.8)",
            }}
          >
            <span
              className="font-serif-cn"
              style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.3em" }}
            >
              再次启程
            </span>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
