import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { RideRecord } from "../lib/journal";
import { repo } from "../lib/rideRepo";
import { seedDemoRides } from "../lib/demoData";
import { PIXEL_FONT, INK, INK_FAINT } from "../components/pixelKit";
import { ProfileHeader, TrainingLog, EmptyState } from "./journal/kit";

// 骑行日志 — the training data view: cumulative totals, weekly mileage trend,
// personal bests, and a per-ride table. Pure ride metrics (距离/时长/配速),
// distinct from the colour/photo memories in its sibling tab 颜色记忆.
export default function Training() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<RideRecord[]>([]);

  useEffect(() => { repo.listRides().then(setRides); }, []);

  return (
    <div className="size-full overflow-y-auto relative" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #efe9dc 60%, #e9e2d2 100%)", color: INK, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
      <div className="sticky top-0 z-10 px-5 pt-12 pb-3" style={{ background: "rgba(244,239,227,0.94)", boxShadow: "inset 0 -2px 0 0 rgba(58,40,23,0.12)" }}>
        <ProfileHeader subtitle="骑行日志 · 你跑过的每一公里" />
        <div style={{ marginTop: 10, fontSize: 10, letterSpacing: 4, color: INK_FAINT, fontWeight: 600 }}>TRAINING LOG</div>
      </div>

      <div className="px-5 py-5">
        {rides.length === 0 ? (
          <EmptyState onStart={() => navigate("/")} onSeed={import.meta.env.DEV ? () => { seedDemoRides(); repo.listRides().then(setRides); } : undefined} />
        ) : (
          <TrainingLog rides={rides} />
        )}
      </div>
    </div>
  );
}
