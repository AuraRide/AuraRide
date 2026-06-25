import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { RidePhoto, RideRecord, emotionMeta } from "../lib/journal";
import { repo } from "../lib/rideRepo";
import { seedDemoRides } from "../lib/demoData";
import { PIXEL_FONT, PIXEL_OUT, INK, INK_SOFT, STAIR } from "../components/pixelKit";
import {
  Tab, COLOR_BUCKETS, ProfileHeader, Stat,
  RidesList, ColorBuckets, SummaryView, RideDetailSheet, ColorPhotoSheet, EmptyState,
  inScope, type Scope,
} from "./journal/kit";

// 颜色记忆 — the personal collection of woven rides: each ride's 色织, the photos
// bucketed by colour, and a summary spectrum. (训练数据 lives in its sibling tab
// 骑行日志.)
export default function ColorMemory() {
  const navigate = useNavigate();
  const [rides, setRides] = useState<RideRecord[]>([]);
  const [tab, setTab] = useState<Tab>("rides");
  const [openRide, setOpenRide] = useState<RideRecord | null>(null);
  const [openColor, setOpenColor] = useState<string | null>(null);
  const [summaryScope, setSummaryScope] = useState<Scope>("day");

  useEffect(() => { repo.listRides().then(setRides); }, []);

  const totalDistance = rides.reduce((a, r) => a + r.distance, 0);
  const totalPhotos = rides.reduce((a, r) => a + r.photos.length, 0);

  const photosByColor = useMemo(() => {
    const map: Record<string, Array<{ photo: RidePhoto; ride: RideRecord }>> = {};
    COLOR_BUCKETS.forEach((c) => (map[c] = []));
    rides.forEach((ride) => ride.photos.forEach((photo) => {
      const bucket = ride.colorId in map ? ride.colorId : "tired-gray";
      map[bucket].push({ photo, ride });
    }));
    return map;
  }, [rides]);

  const summaryBuckets = useMemo(() => {
    const nowTs = Date.now();
    return COLOR_BUCKETS.map((c) => {
      const subset = rides.filter((r) => r.colorId === c && inScope(r.startedAt, summaryScope, nowTs));
      return { colorId: c, meta: emotionMeta(c), count: subset.length, distance: subset.reduce((a, r) => a + r.distance, 0), photos: subset.reduce((a, r) => a + r.photos.length, 0), duration: subset.reduce((a, r) => a + r.duration, 0) };
    });
  }, [rides, summaryScope]);

  const totalForScope = summaryBuckets.reduce((a, b) => a + b.count, 0);

  return (
    <div className="size-full overflow-y-auto relative" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #efe9dc 60%, #e9e2d2 100%)", color: INK, paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)" }}>
      <div className="sticky top-0 z-10 px-5 pt-12 pb-3" style={{ background: "rgba(244,239,227,0.94)", boxShadow: "inset 0 -2px 0 0 rgba(58,40,23,0.12)" }}>
        <ProfileHeader subtitle="颜色记忆 · 你织下的每一段" />

        <div className="flex items-center justify-center" style={{ gap: 20, marginTop: 14 }}>
          <Stat label="总骑行" value={`${totalDistance.toFixed(1)} km`} />
          <span style={{ width: 2, height: 20, background: "rgba(58,40,23,0.18)" }} />
          <Stat label="次数" value={`${rides.length}`} />
          <span style={{ width: 2, height: 20, background: "rgba(58,40,23,0.18)" }} />
          <Stat label="印象" value={`${totalPhotos}`} />
        </div>

        <div className="flex" style={{ gap: 8, marginTop: 14 }}>
          {([{ id: "rides", label: "每次骑行" }, { id: "colors", label: "按颜色" }, { id: "summary", label: "总结" }] as Array<{ id: Tab; label: string }>).map((t) => {
            const on = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "9px 0", cursor: "pointer", border: "none", fontFamily: PIXEL_FONT, fontSize: 12, fontWeight: on ? 800 : 600, letterSpacing: 2, clipPath: STAIR, background: on ? PIXEL_OUT : "#fffdf7", color: on ? "#fff" : INK_SOFT, boxShadow: on ? "none" : "inset 0 0 0 2px #cbbd99" }}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-5 py-5">
        {rides.length === 0 ? (
          <EmptyState onStart={() => navigate("/")} onSeed={import.meta.env.DEV ? () => { seedDemoRides(); repo.listRides().then(setRides); } : undefined} />
        ) : tab === "rides" ? (
          <RidesList rides={rides} onOpen={setOpenRide} />
        ) : tab === "colors" ? (
          <ColorBuckets photosByColor={photosByColor} onOpen={setOpenColor} />
        ) : (
          <SummaryView buckets={summaryBuckets} total={totalForScope} scope={summaryScope} onScope={setSummaryScope} onOpenColor={setOpenColor} />
        )}
      </div>

      {openRide && (
        <RideDetailSheet
          ride={openRide}
          onClose={() => setOpenRide(null)}
          onDelete={() => {
            repo.deleteRide(openRide.id).then(() => repo.listRides()).then(setRides);
            setOpenRide(null);
          }}
        />
      )}
      {openColor && <ColorPhotoSheet colorId={openColor} entries={photosByColor[openColor] || []} onClose={() => setOpenColor(null)} />}
    </div>
  );
}
