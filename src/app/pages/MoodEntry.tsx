import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { ArrowRight, ChevronLeft } from "lucide-react";

// Step 1 of the flow: the user opens the app and writes, in one sentence, how
// they feel today. That sentence is the only input the rest of the experience
// needs — it is handed to /color, where it is turned into an emotion color.

const EXAMPLES = [
  "今天有点累，只想一个人安静地骑一会儿",
  "阳光很好，想出去走走看看",
  "压力好大，需要狠狠发泄一下",
  "心很乱，想让一切慢下来",
];

const MAX = 60;

export default function MoodEntry() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const trimmed = text.trim();

  const submit = () => {
    if (!trimmed) return;
    navigate("/color", { state: { moodText: trimmed } });
  };

  return (
    <div className="size-full overflow-hidden relative flex flex-col bg-[#0a0b10] text-white">
      {/* Ambient aurora background */}
      <motion.div
        aria-hidden
        className="absolute -top-1/3 left-1/2 -translate-x-1/2 w-[160%] aspect-square rounded-full blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, rgba(79,168,255,0.22), rgba(52,232,158,0.10) 40%, transparent 70%)",
        }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Back to the login / landing screen */}
      <button
        onClick={() => navigate("/")}
        aria-label="返回"
        className="absolute top-12 left-5 z-20 w-9 h-9 flex items-center justify-center rounded-full text-white/55 hover:text-white/90 transition-colors"
      >
        <ChevronLeft size={22} />
      </button>

      {/* Brand */}
      <motion.div
        className="relative z-10 pt-16 text-center"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <span className="text-sm font-light tracking-[0.4em] text-white/50">
          AURARIDE
        </span>
      </motion.div>

      {/* Prompt + input */}
      <div className="relative z-10 flex-1 flex flex-col justify-center px-7">
        <motion.h1
          className="text-[2rem] leading-snug font-light tracking-wide"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
        >
          今天，
          <br />
          你是什么颜色？
        </motion.h1>

        <motion.p
          className="mt-3 text-sm font-light text-white/45"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
        >
          用一句话，写下此刻的心情。
        </motion.p>

        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, MAX))}
            placeholder="比如：今天有点累，只想一个人安静地骑一会儿"
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            className="w-full resize-none bg-transparent text-xl font-light leading-relaxed text-white placeholder:text-white/25 outline-none border-b border-white/15 focus:border-white/40 transition-colors pb-3"
          />
          <div className="mt-2 text-right text-xs text-white/30">
            {trimmed.length}/{MAX}
          </div>
        </motion.div>

        {/* Example chips */}
        <motion.div
          className="mt-6 flex flex-wrap gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.55 }}
        >
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              className="text-xs font-light text-white/55 border border-white/12 rounded-full px-3 py-1.5 hover:border-white/35 hover:text-white/80 transition-colors"
            >
              {ex.length > 12 ? ex.slice(0, 12) + "…" : ex}
            </button>
          ))}
        </motion.div>
      </div>

      {/* CTA */}
      <motion.div
        className="relative z-10 px-7 pb-12"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.5 }}
      >
        <button
          onClick={submit}
          disabled={!trimmed}
          className="w-full h-14 rounded-2xl flex items-center justify-center gap-2 text-base font-normal tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-white text-black active:scale-[0.98]"
        >
          生成我的颜色
          <ArrowRight size={18} />
        </button>

        <button
          onClick={() => navigate("/journal")}
          className="mt-4 w-full text-center text-xs font-light text-white/40 hover:text-white/70 transition-colors"
        >
          我的旅程
        </button>
      </motion.div>
    </div>
  );
}
