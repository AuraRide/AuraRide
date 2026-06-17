// SceneBackdrop.tsx — a reusable, cover-scaled bead riding scene used as a full
// page background behind interior screens. Picks the scene that matches an
// emotion accent, runs its own RAF clock, and fills the container (crop is fine).

import React from "react";
import { STAGE_W, STAGE_H, DURATION } from "./engine";
import { SCENES, type CtaColor } from "./scenes";
import { getRiderId } from "./riderChoice";
import CyclingScene from "./CyclingScene";

export default function SceneBackdrop({ color }: { color: CtaColor }) {
  const def = React.useMemo(() => SCENES.find((s) => s.color === color) || SCENES[0], [color]);
  const tileURL = React.useMemo(() => def.buildTileURL(), [def]);
  const [t, setT] = React.useState(0);
  const [scale, setScale] = React.useState(0.4);
  const ref = React.useRef<HTMLDivElement>(null);
  const clock = React.useRef(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScale(Math.max(el.clientWidth / STAGE_W, el.clientHeight / STAGE_H));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  React.useEffect(() => {
    let raf = 0;
    let last: number | null = null;
    const step = (ts: number) => {
      if (last == null) last = ts;
      clock.current = (clock.current + (ts - last) / 1000) % DURATION;
      last = ts;
      setT(clock.current);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, overflow: "hidden", background: def.sky }}>
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
        <CyclingScene def={def} t={t} tileURL={tileURL} riderId={getRiderId()} />
      </div>
    </div>
  );
}
