import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import { Camera, Pause, Square, X } from "lucide-react";
import {
  RidePhoto,
  classifyColor,
  emotionMeta,
  sampleDominantColor,
  saveRide,
} from "../lib/journal";
import WeatherEffects from "../components/WeatherEffects";
import CheckpointMarker from "../components/CheckpointMarker";
import { getCheckpointMessage } from "../data/checkpointMessages";
import { useGeolocation } from "../lib/useGeolocation";
import RideMap from "../components/RideMap";
import { type LatLng } from "../lib/gcj02";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import mapBgGreen from "../../imports/image.png";
import mapBgGray from "../../imports/image-4.png";
import mapBgBlue from "../../imports/image-7.png";
import mapBgYellow from "../../imports/image-9.png";
import mapBgRed from "../../imports/image-11.png";

const mapBgByColor: Record<string, string> = {
  "calm-green": mapBgGreen,
  "tired-gray": mapBgGray,
  "release-red": mapBgRed,
  "explore-yellow": mapBgYellow,
  "lonely-blue": mapBgBlue,
};

// Shared waypoint sets (viewBox 360 x 780) — must match RouteGeneration
const defaultRouteWaypoints: Array<[number, number]> = [
  [188, 60], [168, 92], [206, 128], [148, 162], [172, 200], [212, 232],
  [192, 270], [176, 308], [158, 348], [128, 384], [172, 416], [200, 452],
  [176, 488], [152, 524], [186, 560], [228, 594], [232, 638], [202, 672], [184, 712],
];
const coastalRouteWaypoints: Array<[number, number]> = [
  [220, 32], [198, 60], [178, 92], [152, 122], [148, 158], [172, 188],
  [192, 210], [168, 240], [148, 272], [176, 300], [200, 326], [178, 358],
  [152, 392], [136, 428], [160, 460], [188, 488], [168, 520], [142, 552],
  [128, 588], [156, 622], [182, 656], [168, 692], [150, 730],
];
const boulevardRouteWaypoints: Array<[number, number]> = [
  [130, 30], [122, 78], [156, 102], [192, 128], [222, 162], [232, 218],
  [218, 268], [178, 282], [142, 290], [156, 332], [122, 362], [96, 396],
  [118, 436], [142, 476], [108, 510], [92, 548], [136, 582], [182, 602],
  [222, 592], [256, 618], [262, 660], [246, 702], [216, 736],
];
const sprintRouteWaypoints: Array<[number, number]> = [
  [60, 28], [110, 52], [158, 82], [182, 118], [182, 170], [182, 230],
  [182, 290], [182, 360], [182, 430], [182, 500], [182, 560], [182, 620],
  [182, 690], [182, 740],
];

const routeWaypointsByColor: Record<string, Array<[number, number]>> = {
  "lonely-blue": coastalRouteWaypoints,
  "explore-yellow": boulevardRouteWaypoints,
  "release-red": sprintRouteWaypoints,
};

const buildRoutePath = (wp: Array<[number, number]>) =>
  wp.map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${y}`).join(" ");

// Point along a polyline at progress 0..1
const pointAtProgress = (wp: Array<[number, number]>, t: number) => {
  if (wp.length < 2) return wp[0] || [0, 0];
  const segs = wp.slice(1).map(([x, y], i) => {
    const [px, py] = wp[i];
    return Math.hypot(x - px, y - py);
  });
  const total = segs.reduce((a, b) => a + b, 0);
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const r = segs[i] === 0 ? 0 : target / segs[i];
      const [x0, y0] = wp[i];
      const [x1, y1] = wp[i + 1];
      return [x0 + (x1 - x0) * r, y0 + (y1 - y0) * r] as [number, number];
    }
    target -= segs[i];
  }
  return wp[wp.length - 1];
};

const emotionLabel: Record<string, { cn: string; en: string; subtitle: string }> = {
  "tired-gray": { cn: "灰白", en: "VOID", subtitle: "风景单已就绪，你只是按时抵达。" },
  "lonely-blue": { cn: "深蓝", en: "DEPTH", subtitle: "海面替你压住喧嚣，你只管下潜。" },
  "calm-green": { cn: "暗绿", en: "MOSS", subtitle: "把心跳交还给潮汐，节奏自会归位。" },
  "explore-yellow": { cn: "赭黄", en: "TRACE", subtitle: "宽街收着回声，留你慢慢走过。" },
  "release-red": { cn: "余火", en: "EMBER", subtitle: "前方是直道，把不安全部留在这里。" },
};

// Aligned with RouteGeneration so the line reads continuously across pages
const routeColors: Record<string, string> = {
  "calm-green": "#34E89E",
  "release-red": "#FF3344",
  "explore-yellow": "#FFB54A",
  "lonely-blue": "#4FA8FF",
  "tired-gray": "#C9D2D8",
};

const checkpointsBase = [
  {
    name: "无人江堤",
    distance: 2.3,
    x: 30,
    y: 45,
    context: { isScenic: true },
  },
  {
    name: "老桥观景",
    distance: 5.1,
    x: 50,
    y: 38,
    context: { isMidway: true, isScenic: true },
  },
  {
    name: "林间静处",
    distance: 7.8,
    x: 75,
    y: 42,
    context: { isFinal: false, isScenic: true },
  },
];

export default function EnhancedRidingHUD() {
  const location = useLocation();
  const navigate = useNavigate();
  const colorId = location.state?.colorId || "calm-green";
  const moodText: string | undefined = location.state?.moodText;
  const themeColor = routeColors[colorId];
  const label = emotionLabel[colorId] || emotionLabel["tired-gray"];

  const startedAtRef = useRef<number>(Date.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<RidePhoto[]>([]);
  const [photoToast, setPhotoToast] = useState<RidePhoto | null>(null);
  const [showSheet, setShowSheet] = useState(false);
  const [draftDataUrl, setDraftDataUrl] = useState<string | null>(null);
  const [draftColor, setDraftColor] = useState<string>(themeColor);
  const [draftCaption, setDraftCaption] = useState("");

  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [heartRate, setHeartRate] = useState(85);
  const [isPaused, setIsPaused] = useState(false);
  const [weather, setWeather] = useState<"clear" | "rain" | "wind" | "cloudy" | "sunset">("clear");
  const [windDirection, setWindDirection] = useState<"head" | "tail">("tail");
  const [reachedCheckpoints, setReachedCheckpoints] = useState<number[]>([]);
  const [nearbyCheckpoint, setNearbyCheckpoint] = useState<number | null>(null);
  const [checkpointMessages, setCheckpointMessages] = useState<
    Array<{ message: string; subtitle: string }>
  >([]);

  // Real satellite positioning — drives speed & distance on a phone. Falls back
  // to a gentle simulation when there is no fix (desktop preview / denied perms).
  const gps = useGeolocation({ paused: isPaused });
  const usingGps = gps.status === "tracking";

  // The ride's path, oldest → newest (raw WGS-84). Drawn by RideMap.
  const [track, setTrack] = useState<LatLng[]>([]);

  // Refs let the distance-watcher effect read fresh speed / heart-rate without
  // re-subscribing every tick.
  const speedRef = useRef(speed);
  speedRef.current = speed;
  const heartRateRef = useRef(heartRate);
  heartRateRef.current = heartRate;
  // Dedup key for real GPS points + a wandering synthetic position used when
  // there is no fix, so the trace still draws in preview / on GPS-less devices.
  const lastAppendedRef = useRef<string>("");
  const synthRef = useRef({ lat: 31.24, lng: 121.49, heading: Math.PI / 4 });

  const pushPoint = (lat: number, lng: number) =>
    setTrack((t) => {
      const next = [...t, { lat, lng }];
      return next.length > 600 ? next.slice(next.length - 600) : next;
    });

  // Append real GPS fixes to the track.
  useEffect(() => {
    if (gps.status !== "tracking" || gps.lat == null || gps.lng == null) return;
    const key = `${gps.lat.toFixed(6)},${gps.lng.toFixed(6)}`;
    if (key === lastAppendedRef.current) return;
    lastAppendedRef.current = key;
    pushPoint(gps.lat, gps.lng);
  }, [gps.lat, gps.lng, gps.status]);

  // Initialize checkpoint messages on mount
  useEffect(() => {
    const messages = checkpointsBase.map((checkpoint) => {
      const context = {
        ...checkpoint.context,
        isClimbing: heartRate > 140,
        isHighSpeed: speed > 25,
      };
      return getCheckpointMessage(context);
    });
    setCheckpointMessages(messages);
  }, []);

  // Real elapsed riding time (seconds), paused-aware.
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(id);
  }, [isPaused]);

  // Heart rate has no sensor in the browser — keep a gentle simulated trace
  // until a wearable / HealthKit integration replaces it.
  useEffect(() => {
    if (isPaused) return;
    const id = setInterval(() => {
      setHeartRate((p) => Math.max(60, Math.min(180, p + (Math.random() - 0.5) * 4)));
    }, 1500);
    return () => clearInterval(id);
  }, [isPaused]);

  // GPS is the source of truth for speed & distance whenever we have a fix.
  useEffect(() => {
    if (gps.status !== "tracking") return;
    setSpeed(isPaused ? 0 : gps.speedKmh);
    setDistance(gps.distanceKm);
  }, [gps.status, gps.speedKmh, gps.distanceKm, isPaused]);

  // Fallback motion when there's no GPS fix (desktop preview / denied / locating)
  // so the HUD still feels alive. GPS takes over the moment a fix arrives.
  useEffect(() => {
    if (isPaused || gps.status === "tracking") return;
    const id = setInterval(() => {
      setSpeed((prev) => Math.min(35, Math.max(0, prev + (Math.random() - 0.5) * 4)));
      setDistance((prev) => prev + 0.05);
      // Wander a synthetic position so the trace canvas has a path to draw.
      const s = synthRef.current;
      s.heading += (Math.random() - 0.5) * 0.6;
      const step = 0.00012; // ~13m per tick
      s.lat += Math.sin(s.heading) * step * 0.6;
      s.lng += Math.cos(s.heading) * step;
      pushPoint(s.lat, s.lng);
    }, 250);
    return () => clearInterval(id);
  }, [isPaused, gps.status]);

  // Weather + checkpoint reactions, driven by distance regardless of its source.
  useEffect(() => {
    if (distance > 0 && distance < 2) setWeather("clear");
    else if (distance >= 2 && distance < 4) setWeather("cloudy");
    else if (distance >= 4 && distance < 6) {
      setWeather("wind");
      setWindDirection(speedRef.current > 20 ? "tail" : "head");
    } else if (distance >= 6 && distance < 8) setWeather("rain");
    else if (distance >= 8) setWeather("sunset");

    checkpointsBase.forEach((checkpoint, index) => {
      const gap = Math.abs(distance - checkpoint.distance);
      setReachedCheckpoints((prevReached) => {
        if (gap < 0.4 && !prevReached.includes(index)) {
          setNearbyCheckpoint(index);
        }
        if (gap < 0.2 && !prevReached.includes(index)) {
          setNearbyCheckpoint(null);
          const context = {
            ...checkpoint.context,
            isClimbing: heartRateRef.current > 140,
            isHighSpeed: speedRef.current > 25,
          };
          const newMessage = getCheckpointMessage(context);
          setCheckpointMessages((prevMessages) => {
            const updated = [...prevMessages];
            updated[index] = newMessage;
            return updated;
          });
          if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
          setTimeout(() => {
            setReachedCheckpoints((prev) => prev.filter((i) => i !== index));
          }, 1500);
          return [...prevReached, index];
        }
        return prevReached;
      });
    });
  }, [distance]);

  const openPhotoSheet = () => {
    setDraftDataUrl(null);
    setDraftColor(themeColor);
    setDraftCaption("");
    setShowSheet(true);
  };

  const handlePhotoPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const color = await sampleDominantColor(dataUrl);
      setDraftDataUrl(dataUrl);
      setDraftColor(color);
      if (navigator.vibrate) navigator.vibrate(15);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const confirmPhoto = () => {
    if (!draftDataUrl) return;
    const photo: RidePhoto = {
      dataUrl: draftDataUrl,
      color: draftColor,
      takenAt: Date.now(),
      caption: draftCaption.trim() || undefined,
    };
    setPhotos((prev) => [...prev, photo]);
    setPhotoToast(photo);
    setTimeout(() => setPhotoToast(null), 2600);
    setShowSheet(false);
    if (navigator.vibrate) navigator.vibrate([20, 20, 30]);
  };

  const handleEnd = () => {
    // Average the sampled colors so the saved ride has a "judged" overall color.
    let dominant = themeColor;
    if (photos.length > 0) {
      const avg = photos.reduce(
        (acc, p) => {
          acc.r += parseInt(p.color.slice(1, 3), 16);
          acc.g += parseInt(p.color.slice(3, 5), 16);
          acc.b += parseInt(p.color.slice(5, 7), 16);
          return acc;
        },
        { r: 0, g: 0, b: 0 }
      );
      const n = photos.length;
      dominant = `#${[avg.r / n, avg.g / n, avg.b / n]
        .map((c) => Math.round(c).toString(16).padStart(2, "0"))
        .join("")}`;
    }
    const judgedColorId = photos.length > 0 ? classifyColor(dominant) : colorId;
    saveRide({
      id: `${startedAtRef.current}`,
      colorId: judgedColorId,
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      distance,
      duration,
      moodText,
      photos,
      dominantColor: dominant,
    });
    navigate("/review", { state: { colorId: judgedColorId, distance, duration, moodText } });
  };

  const routeProgress = Math.min(distance / 10.3, 1);

  return (
    <div className="size-full text-white overflow-hidden relative bg-black">
      {/* Weather Effects Layer — sits above the map, below the HUD */}
      <AnimatePresence mode="sync">
        <motion.div
          key={weather}
          className="absolute inset-0 pointer-events-none z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          <WeatherEffects
            weather={weather}
            windDirection={windDirection}
            timeOfDay={weather === "sunset" ? "sunset" : "day"}
            routeColor={themeColor}
            routeProgress={routeProgress}
          />
        </motion.div>
      </AnimatePresence>

      {/* Live map + GPS trace (real 高德 map when VITE_AMAP_KEY is set, else a
          trace canvas drawing the actual path shape). */}
      <div className="absolute inset-0">
        <RideMap track={track} themeColor={themeColor} />
        {/* Vignette to keep HUD readable */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 75% 55% at 50% 50%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.88) 100%)",
          }}
        />

        {/* Live GPS trace is now drawn by RideMap above; the synthetic
            planned-route overlay is kept here but disabled. */}
        {false && (
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 360 780"
          preserveAspectRatio="xMidYMid slice"
          style={{ opacity: 0.45 }}
        >
          {(() => {
            const wp = routeWaypointsByColor[colorId] || defaultRouteWaypoints;
            const path = buildRoutePath(wp);
            const checkpointIndices = [0, Math.floor(wp.length / 2), wp.length - 1];
            const [riderX, riderY] = pointAtProgress(wp, routeProgress);
            return (
              <>
                {/* Soft outer glow (full route, faded) */}
                <path
                  d={path}
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="12"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity="0.18"
                  style={{ filter: "blur(7px)" }}
                />
                {/* Planned route dashed */}
                <path
                  d={path}
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="4 6"
                  opacity="0.55"
                />
                {/* Traveled progress — bright */}
                <path
                  d={path}
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength={1}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1 - routeProgress,
                    filter: `drop-shadow(0 0 5px ${themeColor})`,
                    transition: "stroke-dashoffset 0.4s ease-out",
                  }}
                />
                {/* Waypoint dots */}
                {wp.map(([x, y], i) => {
                  const isOrigin = i === 0;
                  const isEnd = i === wp.length - 1;
                  const isMajor = checkpointIndices.includes(i);
                  const r = isOrigin || isEnd ? 5 : isMajor ? 3.5 : 2;
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r={r + 2}
                        fill="none"
                        stroke={themeColor}
                        strokeWidth="0.8"
                        opacity={isOrigin || isEnd ? 0.7 : 0.4}
                      />
                      <circle
                        cx={x}
                        cy={y}
                        r={r}
                        fill={themeColor}
                        opacity={isOrigin || isEnd ? 0.95 : isMajor ? 0.75 : 0.55}
                        style={{ filter: `drop-shadow(0 0 4px ${themeColor})` }}
                      />
                    </g>
                  );
                })}
                {/* Labels */}
                <text
                  x={wp[0][0] + 12}
                  y={wp[0][1] + 4}
                  fill="#ffffff"
                  fontSize="10"
                  opacity="0.85"
                  style={{ filter: `drop-shadow(0 0 4px ${themeColor})` }}
                >
                  起点
                </text>
                <text
                  x={wp[wp.length - 1][0] + 12}
                  y={wp[wp.length - 1][1] + 4}
                  fill="#ffffff"
                  fontSize="10"
                  opacity="0.85"
                  style={{ filter: `drop-shadow(0 0 4px ${themeColor})` }}
                >
                  终点
                </text>
                {/* Current rider position */}
                <circle
                  cx={riderX}
                  cy={riderY}
                  r="9"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="1"
                  opacity="0.6"
                />
                <motion.circle
                  cx={riderX}
                  cy={riderY}
                  r="14"
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="1.2"
                  animate={{ r: [9, 18, 9], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                />
                <circle
                  cx={riderX}
                  cy={riderY}
                  r="4"
                  fill="#ffffff"
                  style={{ filter: `drop-shadow(0 0 8px ${themeColor})` }}
                />
              </>
            );
          })()}
        </svg>
        )}
      </div>

      {/* deprecated: original synthetic city map */}
      {false && (
        <svg viewBox="0 0 400 800">
          <defs>
            <pattern
              id="map-grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 40 0 L 0 0 0 40"
                fill="none"
                stroke={themeColor}
                strokeWidth="0.5"
                opacity="0.18"
              />
            </pattern>
            <linearGradient id="hud-route" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={themeColor} stopOpacity="0.2" />
              <stop offset={`${routeProgress * 100}%`} stopColor={themeColor} stopOpacity="0.95" />
              <stop offset={`${Math.min(routeProgress * 100 + 0.1, 100)}%`} stopColor={themeColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={themeColor} stopOpacity="0.2" />
            </linearGradient>
          </defs>

          {/* Grid base */}
          <rect width="100%" height="100%" fill="url(#map-grid)" />

          {/* District blocks */}
          {[
            { x: 20, y: 80, w: 90, h: 120 },
            { x: 130, y: 60, w: 110, h: 140 },
            { x: 260, y: 90, w: 120, h: 110 },
            { x: 20, y: 230, w: 130, h: 110 },
            { x: 170, y: 220, w: 100, h: 130 },
            { x: 290, y: 230, w: 90, h: 120 },
            { x: 20, y: 380, w: 110, h: 130 },
            { x: 150, y: 380, w: 130, h: 120 },
            { x: 300, y: 380, w: 80, h: 140 },
            { x: 20, y: 540, w: 140, h: 110 },
            { x: 180, y: 530, w: 100, h: 130 },
            { x: 300, y: 540, w: 80, h: 110 },
          ].map((b, i) => (
            <rect
              key={i}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              fill="rgba(255,255,255,0.025)"
              stroke={`${themeColor}22`}
              strokeWidth="0.6"
              rx="2"
            />
          ))}

          {/* Major roads (horizontal & vertical) */}
          {[210, 360, 520].map((y) => (
            <line
              key={`h-${y}`}
              x1="0"
              y1={y}
              x2="400"
              y2={y}
              stroke={`${themeColor}33`}
              strokeWidth="6"
              strokeLinecap="round"
            />
          ))}
          {[120, 250, 380].map((x) => (
            <line
              key={`v-${x}`}
              x1={x}
              y1="0"
              x2={x}
              y2="800"
              stroke={`${themeColor}33`}
              strokeWidth="6"
              strokeLinecap="round"
            />
          ))}

          {/* River curve */}
          <path
            d="M -20 680 Q 100 600, 200 660 T 420 620"
            fill="none"
            stroke="#3b82f6"
            strokeOpacity="0.22"
            strokeWidth="22"
            strokeLinecap="round"
            filter="blur(2px)"
          />

          {/* Planned route — full path faded */}
          <path
            d="M 60 720 Q 120 580, 180 500 T 280 320 Q 320 220, 360 100"
            fill="none"
            stroke={`${themeColor}66`}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="6 8"
          />

          {/* Traveled route glow */}
          <path
            d="M 60 720 Q 120 580, 180 500 T 280 320 Q 320 220, 360 100"
            fill="none"
            stroke={themeColor}
            strokeWidth="14"
            strokeLinecap="round"
            opacity="0.25"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1 - routeProgress,
              filter: `blur(10px) drop-shadow(0 0 12px ${themeColor})`,
            }}
          />
          <path
            d="M 60 720 Q 120 580, 180 500 T 280 320 Q 320 220, 360 100"
            fill="none"
            stroke={themeColor}
            strokeWidth="3.5"
            strokeLinecap="round"
            pathLength={1}
            style={{
              strokeDasharray: 1,
              strokeDashoffset: 1 - routeProgress,
              filter: `drop-shadow(0 0 6px ${themeColor})`,
            }}
          />

          {/* Origin marker */}
          <circle cx="60" cy="720" r="5" fill={themeColor} opacity="0.8" />
          <circle cx="60" cy="720" r="10" fill="none" stroke={themeColor} strokeWidth="1" opacity="0.5" />

          {/* Destination marker */}
          <g>
            <circle cx="360" cy="100" r="6" fill="none" stroke={themeColor} strokeWidth="1.5" />
            <circle cx="360" cy="100" r="2.5" fill={themeColor} />
            <motion.circle
              cx="360"
              cy="100"
              r="6"
              fill="none"
              stroke={themeColor}
              strokeWidth="1"
              animate={{ r: [6, 18, 6], opacity: [0.8, 0, 0.8] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
            />
          </g>
        </svg>
      )}

      {/* Top Progress Bar */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5">
        <motion.div
          className="h-full origin-left"
          style={{
            background: `linear-gradient(90deg, ${themeColor} 0%, ${themeColor}88 100%)`,
            width: `${routeProgress * 100}%`,
            boxShadow: `0 0 20px ${themeColor}66`,
          }}
        />
      </div>

      {/* Photo capture toast — confirms the system judged a color */}
      <AnimatePresence>
        {photoToast && (
          <motion.div
            key={photoToast.takenAt}
            className="absolute top-20 left-1/2 -translate-x-1/2 z-30 backdrop-blur-xl rounded-2xl border px-3 py-2 flex items-center gap-3"
            style={{
              borderColor: `${photoToast.color}aa`,
              backgroundColor: "rgba(20,20,22,0.7)",
              boxShadow: `0 0 24px ${photoToast.color}66`,
            }}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <img src={photoToast.dataUrl} alt="just captured" className="w-10 h-10 rounded-lg object-cover" />
            <div className="flex flex-col">
              <span className="font-serif-cn text-[10px] tracking-[0.3em] text-white/55" style={{ fontWeight: 500 }}>
                此刻的颜色
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: photoToast.color, boxShadow: `0 0 8px ${photoToast.color}` }}
                />
                <span className="font-serif-cn text-[11px] tracking-[0.25em] text-white/90" style={{ fontWeight: 500 }}>
                  {emotionMeta(classifyColor(photoToast.color)).cn}
                </span>
              </div>
            </div>
            <button onClick={() => setPhotoToast(null)} className="text-white/50 ml-1">
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HUD Overlay */}
      <div className="relative z-20 h-full flex flex-col px-5 pt-4 pb-6">
        {/* Top Stats */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] tracking-[0.2em] text-white/70 font-light tabular-nums">
            {distance.toFixed(1)} / 10.3 km
          </span>

          {/* Satellite positioning status */}
          <span
            className="text-[10px] tracking-[0.15em] font-light tabular-nums flex items-center gap-1.5"
            style={{ color: usingGps ? "#34E89E" : "rgba(255,255,255,0.5)" }}
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: usingGps ? "#34E89E" : "rgba(255,255,255,0.45)",
                boxShadow: usingGps ? "0 0 6px #34E89E" : "none",
              }}
              animate={gps.status === "locating" ? { opacity: [0.3, 1, 0.3] } : { opacity: 1 }}
              transition={gps.status === "locating" ? { duration: 1, repeat: Infinity } : {}}
            />
            {gps.status === "tracking" &&
              `GPS · 精度 ${gps.accuracy != null ? Math.round(gps.accuracy) : "--"}m`}
            {gps.status === "locating" && "定位中…"}
            {gps.status === "denied" && "定位被拒 · 模拟"}
            {gps.status === "unavailable" && "无定位 · 模拟"}
            {gps.status === "idle" && "准备定位"}
          </span>

          <span className="text-[11px] tracking-[0.25em] font-light text-white/70 tabular-nums">
            {Math.floor(duration / 60).toString().padStart(2, "0")}
            :{(duration % 60).toString().padStart(2, "0")}
          </span>
        </div>

        {/* Pill row: emotion · state · weather */}
        <div className="flex items-center gap-2 mt-3">
          <div
            className="backdrop-blur-xl rounded-full px-3 py-1.5 flex items-center gap-1.5 border"
            style={{ borderColor: `${themeColor}55`, backgroundColor: "rgba(255,255,255,0.05)" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: themeColor, boxShadow: `0 0 6px ${themeColor}` }} />
            <span className="text-[10px] tracking-[0.2em]" style={{ color: `${themeColor}ee`, fontWeight: 500 }}>
              {label.cn} / {label.en}
            </span>
          </div>
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
            <motion.span
              className="font-serif-cn text-[10px] tracking-[0.25em] text-white/75"
              key={`state-${speed > 25 ? "sprint" : heartRate > 140 ? "climb" : "cruise"}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              style={{ fontWeight: 500 }}
            >
              {speed > 25 ? "冲刺" : heartRate > 140 ? "爬坡" : "巡航"}
            </motion.span>
          </div>
          <div
            className="backdrop-blur-xl rounded-full px-3 py-1.5 flex items-center gap-1.5 border"
            style={{
              borderColor: weather === "wind" ? `${themeColor}77` : "rgba(255,255,255,0.1)",
              backgroundColor: weather === "wind" ? `${themeColor}18` : "rgba(255,255,255,0.05)",
              boxShadow: weather === "wind" ? `0 0 14px ${themeColor}44` : "none",
            }}
          >
            <span className="text-[11px]">
              {weather === "clear" && "☀"}
              {weather === "cloudy" && "☁"}
              {weather === "wind" && (windDirection === "tail" ? "↗" : "↙")}
              {weather === "rain" && "☂"}
              {weather === "sunset" && "☼"}
            </span>
            <motion.span
              key={`weather-${weather}-${windDirection}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="font-serif-cn text-[10px] tracking-[0.25em] text-white/85"
              style={{ fontWeight: 500 }}
            >
              {weather === "clear" && "晴朗"}
              {weather === "cloudy" && "阴天"}
              {weather === "wind" && (windDirection === "tail" ? "顺风" : "逆风")}
              {weather === "rain" && "小雨"}
              {weather === "sunset" && "日落"}
            </motion.span>
          </div>
        </div>

        {/* Center Speed Display */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            {/* Distance Progress Arc (semicircle) */}
            <div className="relative w-[260px] h-[80px] mx-auto mb-2">
              <svg
                className="absolute inset-0 w-full h-full overflow-visible"
                viewBox="0 0 260 80"
              >
                {/* Track */}
                <path
                  d="M 20 70 A 110 110 0 0 1 240 70"
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                />
                {/* Progress */}
                <path
                  d="M 20 70 A 110 110 0 0 1 240 70"
                  fill="none"
                  stroke={themeColor}
                  strokeWidth="2"
                  strokeLinecap="round"
                  pathLength={1}
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1 - routeProgress,
                    filter: `drop-shadow(0 0 6px ${themeColor})`,
                    transition: "stroke-dashoffset 0.4s ease-out",
                  }}
                />
                {/* Leading dot */}
                {(() => {
                  const angle = Math.PI * (1 - routeProgress); // 180° → 0°
                  const cx = 130 + 110 * Math.cos(angle);
                  const cy = 70 - 110 * Math.sin(angle);
                  return (
                    <circle
                      cx={cx}
                      cy={cy}
                      r="3.5"
                      fill="#ffffff"
                      style={{ filter: `drop-shadow(0 0 8px ${themeColor})` }}
                    />
                  );
                })()}
              </svg>
              {/* Label inside arc */}
              <div className="absolute inset-x-0 bottom-1 text-center">
                <div
                  className="font-serif-cn text-[11px] tracking-[0.4em]"
                  style={{ color: `${themeColor}cc`, fontWeight: 500 }}
                >
                  正在骑行
                </div>
                <div className="text-[9px] tracking-[0.25em] text-white/40 tabular-nums mt-0.5">
                  {Math.round(routeProgress * 100)}%
                </div>
              </div>
            </div>

            <motion.div
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            >
              <div className="text-[92px] font-extralight leading-none tabular-nums tracking-tight">
                {speed.toFixed(1)}
              </div>
              <div
                className="text-[11px] tracking-[0.45em] mt-1 font-light"
                style={{ color: `${themeColor}cc` }}
              >
                km/h
              </div>
            </motion.div>

            {/* Subtitle line */}
            <div
              className="font-serif-cn text-[11px] tracking-[0.25em] text-white/55 mt-4"
              style={{ fontWeight: 400 }}
            >
              {label.subtitle}
            </div>
          </div>
        </div>

        {/* Stats glass card */}
        <div
          className="backdrop-blur-xl rounded-2xl border grid grid-cols-3 mb-4"
          style={{
            borderColor: "rgba(255,255,255,0.12)",
            backgroundColor: "rgba(20,20,22,0.55)",
          }}
        >
          <div className="text-center py-3 border-r border-white/10">
            <div className="text-[22px] font-light tabular-nums leading-none" style={{ color: "#ffffff" }}>
              {distance.toFixed(2)}
            </div>
            <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/55 mt-1.5" style={{ fontWeight: 500 }}>
              距离
            </div>
          </div>
          <div className="text-center py-3 border-r border-white/10">
            <div className="text-[22px] font-light tabular-nums leading-none" style={{ color: "#ffffff" }}>
              {(distance > 0 ? (duration / 60 / distance) * 60 : 0).toFixed(1)}
            </div>
            <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/55 mt-1.5" style={{ fontWeight: 500 }}>
              配速 km/h
            </div>
          </div>
          <div className="text-center py-3">
            <div
              className="text-[22px] font-light tabular-nums leading-none flex items-center justify-center gap-1.5"
              style={{ color: heartRate > 140 ? "#F43F5E" : "#ffffff" }}
            >
              <motion.div
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: heartRate > 140 ? "#F43F5E" : themeColor }}
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              />
              {Math.round(heartRate)}
            </div>
            <div className="font-serif-cn text-[10px] tracking-[0.3em] text-white/55 mt-1.5" style={{ fontWeight: 500 }}>
              心率 cpm
            </div>
          </div>
        </div>

        {/* Photo strip — shows captured ride photos */}
        {photos.length > 0 && (
          <div className="flex items-center gap-2 mb-3 overflow-x-auto pb-1">
            <span className="font-serif-cn text-[10px] tracking-[0.3em] text-white/55 shrink-0" style={{ fontWeight: 500 }}>
              路线印象 · {photos.length}
            </span>
            {photos.map((p) => (
              <div
                key={p.takenAt}
                className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0"
                style={{ border: `1px solid ${p.color}cc`, boxShadow: `0 0 10px ${p.color}55` }}
              >
                <img src={p.dataUrl} alt="ride moment" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {/* Bottom Controls */}
        <div className="flex gap-3 items-center">
          <button
            onClick={openPhotoSheet}
            className="px-4 py-3.5 rounded-full backdrop-blur-xl border transition-all active:scale-95 flex items-center gap-2"
            style={{
              borderColor: `${themeColor}77`,
              backgroundColor: `${themeColor}1a`,
              color: "rgba(255,255,255,0.9)",
              boxShadow: `0 0 14px ${themeColor}44`,
            }}
            aria-label="拍照"
          >
            <Camera size={14} />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoPick}
            className="hidden"
          />
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="px-6 py-3.5 rounded-full backdrop-blur-xl border transition-all active:scale-95 flex items-center gap-2"
            style={{
              borderColor: "rgba(255,255,255,0.18)",
              backgroundColor: "rgba(255,255,255,0.05)",
              color: "rgba(255,255,255,0.85)",
            }}
          >
            <Pause size={14} />
            <span className="font-serif-cn text-[12px] tracking-[0.3em]" style={{ fontWeight: 500 }}>
              {isPaused ? "继续" : "暂停"}
            </span>
          </button>
          <button
            onClick={handleEnd}
            className="flex-1 py-3.5 rounded-full transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{
              backgroundColor: "#ffffff",
              color: "#0a0a0a",
              boxShadow: `0 0 28px ${themeColor}55`,
            }}
          >
            <Square size={12} />
            <span className="font-serif-cn text-[13px] tracking-[0.35em]" style={{ fontWeight: 600 }}>
              结束骑行
            </span>
          </button>
        </div>
      </div>

      {/* Photo Sheet — modal for picking + captioning a ride photo */}
      <AnimatePresence>
        {showSheet && (
          <>
            <motion.div
              className="absolute inset-0 z-40 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSheet(false)}
            />
            <motion.div
              className="absolute left-0 right-0 bottom-0 z-50 rounded-t-3xl border-t backdrop-blur-2xl px-5 pt-3 pb-7"
              style={{
                borderColor: `${themeColor}55`,
                backgroundColor: "rgba(18,18,20,0.92)",
                boxShadow: `0 -20px 60px ${themeColor}44`,
              }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              {/* Grabber */}
              <div className="w-10 h-1 mx-auto rounded-full bg-white/20 mb-4" />

              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-serif-cn text-[10px] tracking-[0.4em] text-white/45" style={{ fontWeight: 500 }}>
                    MOMENT
                  </div>
                  <div className="font-serif-cn text-[15px] tracking-[0.3em] text-white/95 mt-0.5" style={{ fontWeight: 500 }}>
                    记一刻路上
                  </div>
                </div>
                <button onClick={() => setShowSheet(false)} className="text-white/55 active:scale-95 transition-transform">
                  <X size={18} />
                </button>
              </div>

              {/* Preview / picker */}
              {draftDataUrl ? (
                <div className="relative rounded-2xl overflow-hidden mb-4" style={{ border: `1px solid ${draftColor}aa` }}>
                  <img src={draftDataUrl} alt="preview" className="w-full h-56 object-cover" />
                  <div
                    className="absolute top-2 left-2 backdrop-blur-md rounded-full px-2.5 py-1 flex items-center gap-1.5"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)", border: `1px solid ${draftColor}aa` }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: draftColor, boxShadow: `0 0 6px ${draftColor}` }}
                    />
                    <span className="font-serif-cn text-[10px] tracking-[0.25em] text-white/90" style={{ fontWeight: 500 }}>
                      {emotionMeta(classifyColor(draftColor)).cn}
                    </span>
                  </div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 backdrop-blur-md rounded-full px-3 py-1.5 font-serif-cn text-[10px] tracking-[0.3em] text-white/90 active:scale-95 transition-transform"
                    style={{ backgroundColor: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.25)", fontWeight: 500 }}
                  >
                    换一张
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full h-44 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-2 mb-4 active:scale-[0.99] transition-transform"
                  style={{ borderColor: `${themeColor}66`, backgroundColor: `${themeColor}0d` }}
                >
                  <Camera size={28} style={{ color: themeColor }} />
                  <span className="font-serif-cn text-[12px] tracking-[0.3em]" style={{ color: `${themeColor}dd`, fontWeight: 500 }}>
                    拍摄 / 上传照片
                  </span>
                  <span className="font-serif-cn text-[10px] tracking-[0.25em] text-white/35" style={{ fontWeight: 400 }}>
                    系统会从画面里读出此刻的颜色
                  </span>
                </button>
              )}

              {/* Caption */}
              <div className="mb-4">
                <textarea
                  value={draftCaption}
                  onChange={(e) => setDraftCaption(e.target.value)}
                  placeholder="想说点什么…（一句也行）"
                  maxLength={60}
                  rows={2}
                  className="w-full bg-white/5 border rounded-xl px-3 py-2.5 font-serif-cn outline-none resize-none transition-colors"
                  style={{
                    borderColor: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.92)",
                    fontSize: 13,
                    letterSpacing: "0.1em",
                  }}
                />
                <div className="text-right font-serif-cn text-[9px] tracking-[0.25em] text-white/35 mt-1" style={{ fontWeight: 400 }}>
                  {draftCaption.length}/60
                </div>
              </div>

              {/* Confirm */}
              <button
                onClick={confirmPhoto}
                disabled={!draftDataUrl}
                className="w-full h-12 rounded-full flex items-center justify-center transition-all active:scale-[0.98] disabled:opacity-40"
                style={{
                  backgroundColor: draftDataUrl ? "#ffffff" : "rgba(255,255,255,0.1)",
                  color: draftDataUrl ? "#0a0a0a" : "rgba(255,255,255,0.5)",
                  boxShadow: draftDataUrl ? `0 0 24px ${draftColor}66` : "none",
                }}
              >
                <span className="font-serif-cn text-[13px] tracking-[0.35em]" style={{ fontWeight: 600 }}>
                  收入旅程
                </span>
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
