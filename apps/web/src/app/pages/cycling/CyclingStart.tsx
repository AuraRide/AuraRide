// CyclingStart.tsx — AuraRide's start / login screen. A full-bleed, cover-scaled
// 1080×1920 pixel-embroidery riding stage with five swipeable "states" (one per
// emotion colour: 赭黄/深蓝/暗绿/灰白/余火). Auto-cycles, supports swipe + dots,
// and enters the app from the in-scene 开始骑行 / 登录 / 注册 cluster.

import React from "react";
import { motion } from "motion/react";
import { STAGE_W, STAGE_H, DURATION } from "./engine";
import { SCENES } from "./scenes";
import { getRiderId, setRiderId, type RiderId } from "./riderChoice";
import { PIXEL_FONT } from "../../components/pixelKit";
import CyclingScene from "./CyclingScene";
import StartUI from "./StartUI";

const AUTO_MS = 7000; // dwell per scene before auto-advancing
const RESUME_MS = 10000; // pause auto-cycle this long after a manual interaction

export default function CyclingStart({ auth = false }: { auth?: boolean } = {}) {
  const [index, setIndex] = React.useState(0);
  const [t, setT] = React.useState(0);
  const [scale, setScale] = React.useState(0.3);
  const [rider, setRider] = React.useState<RiderId>(() => getRiderId());
  const [showHint, setShowHint] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const lastInteract = React.useRef(0);
  const clock = React.useRef(0);

  // build all five tileable strips once (instant scene switching afterwards)
  const tileURLs = React.useMemo(() => SCENES.map((s) => s.buildTileURL()), []);

  // cover-scale the stage to fill the container (crop overflow, never letterbox)
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const s = Math.max(el.clientWidth / STAGE_W, el.clientHeight / STAGE_H);
      setScale(s);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  // single RAF time loop (drives scroll + pedal cadence), looping every DURATION
  React.useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    const step = (ts: number) => {
      if (last == null) last = ts;
      const dt = (ts - last) / 1000;
      last = ts;
      clock.current = (clock.current + dt) % DURATION;
      setT(clock.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // auto-cycle through the five states, unless the user interacted recently
  React.useEffect(() => {
    const id = setInterval(() => {
      if (performance.now() - lastInteract.current < RESUME_MS) return;
      setIndex((i) => (i + 1) % SCENES.length);
    }, AUTO_MS);
    return () => clearInterval(id);
  }, []);

  const goto = (i: number) => {
    lastInteract.current = performance.now();
    setIndex(((i % SCENES.length) + SCENES.length) % SCENES.length);
  };

  // lightweight horizontal swipe detection (doesn't block button taps)
  const down = React.useRef<{ x: number; y: number; ts: number } | null>(null);
  const onPointerDown = (e: React.PointerEvent) => {
    lastInteract.current = performance.now();
    down.current = { x: e.clientX, y: e.clientY, ts: performance.now() };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const d = down.current;
    down.current = null;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      goto(index + (dx < 0 ? 1 : -1));
    }
  };

  // tap the rider to swap boy ⇄ girl (persisted, also used by interior scenes)
  const toggleRider = () => {
    lastInteract.current = performance.now();
    setRider((r) => {
      const next: RiderId = r === "boy" ? "girl" : "boy";
      setRiderId(next);
      return next;
    });
    setShowHint(false);
  };

  // one-time discovery hint that the rider is tappable. The "seen" flag is set
  // only after the hint has shown (not on mount), so React StrictMode's
  // double-mount doesn't swallow it.
  React.useEffect(() => {
    try {
      if (localStorage.getItem("auraride.riderHinted")) return;
    } catch {
      /* ignore */
    }
    const show = window.setTimeout(() => setShowHint(true), 1200);
    const hide = window.setTimeout(() => {
      setShowHint(false);
      try {
        localStorage.setItem("auraride.riderHinted", "1");
      } catch {
        /* ignore */
      }
    }, 6000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  const active = SCENES[index];

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ position: "absolute", inset: 0, overflow: "hidden", background: active.sky, touchAction: "pan-y" }}
    >
      {/* cover-scaled scene art (background only — crop is fine) */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: STAGE_W,
          height: STAGE_H,
          transform: `translate(-50%,-50%) scale(${scale})`,
          transformOrigin: "center",
        }}
      >
        {/* only the active scene is mounted (one animated rider at a time); the
            new scene fades in over the previous one's sky background */}
        <motion.div
          key={index}
          style={{ position: "absolute", inset: 0 }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <CyclingScene def={active} t={t} tileURL={tileURLs[index]} riderId={rider} onToggleRider={toggleRider} />
        </motion.div>
      </div>

      {/* interactive layer in real screen coords — always fits the phone frame */}
      <StartUI color={active.color} t={t} mode={auth ? "auth" : "start"} />

      {/* one-time hint that the rider is tappable (screen-space) */}
      {showHint && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: "absolute",
            left: "50%",
            top: "58%",
            transform: "translateX(-50%)",
            zIndex: 30,
            fontFamily: PIXEL_FONT,
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: 2,
            color: "#3c3526",
            background: "#f7f1e4",
            clipPath:
              "polygon(0 8px,4px 8px,4px 4px,8px 4px,8px 0,calc(100% - 8px) 0,calc(100% - 8px) 4px,calc(100% - 4px) 4px,calc(100% - 4px) 8px,100% 8px,100% calc(100% - 8px),calc(100% - 4px) calc(100% - 8px),calc(100% - 4px) calc(100% - 4px),calc(100% - 8px) calc(100% - 4px),calc(100% - 8px) 100%,8px 100%,8px calc(100% - 4px),4px calc(100% - 4px),4px calc(100% - 8px),0 calc(100% - 8px))",
            boxShadow: "inset 0 0 0 2px #3a2817",
            padding: "8px 14px",
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          试试点一下
        </motion.div>
      )}

      {/* state dots — screen-space, always visible above the cover crop */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "calc(env(safe-area-inset-top, 0px) + 16px)",
          display: "flex",
          justifyContent: "center",
          gap: 10,
          zIndex: 90,
        }}
      >
        {SCENES.map((s, i) => (
          <button
            key={s.key}
            onClick={() => goto(i)}
            aria-label={s.cn}
            style={{
              width: i === index ? 26 : 9,
              height: 9,
              borderRadius: 999,
              border: "none",
              padding: 0,
              cursor: "pointer",
              background: i === index ? "rgba(255,255,255,0.92)" : "rgba(255,255,255,0.42)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.35)",
              transition: "width .25s ease, background .25s ease",
            }}
          />
        ))}
      </div>
    </div>
  );
}
