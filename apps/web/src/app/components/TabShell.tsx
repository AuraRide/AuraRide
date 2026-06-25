import { Outlet, useLocation, useNavigate } from "react-router";
import { Map, Users, Bike, Palette, LineChart } from "lucide-react";
import { PIXEL_FONT, PIXEL_OUT, PAPER, INK, INK_FAINT, CTA_COLORS, STAIR } from "./pixelKit";

// Bottom tab bar — the app's top-level navigation shell. Five symmetric slots
// with a raised, enlarged 出发 button in the centre (the primary "start a ride"
// action, easiest to reach by thumb). The other four are the social side
// (色彩地图 = aggregation, 广场 = feed) and the personal side (颜色记忆 = the
// woven memories, 骑行日志 = training data). Flow screens (/generate, /weave,
// /share, /login…) render full-screen without the bar for focus.
export const TAB_BAR_H = 60; // px (excl. safe-area inset) — pages pad by this

// left two · [centre FAB] · right two
const LEFT = [
  { to: "/map", label: "色彩地图", Icon: Map },
  { to: "/plaza", label: "广场", Icon: Users },
] as const;
const RIGHT = [
  { to: "/colors", label: "颜色记忆", Icon: Palette },
  { to: "/training", label: "骑行日志", Icon: LineChart },
] as const;

function Tab({ to, label, Icon }: { to: string; label: string; Icon: typeof Map }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = pathname === to;
  return (
    <button
      onClick={() => navigate(to)}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 3,
        border: "none",
        background: "none",
        cursor: "pointer",
        color: active ? INK : INK_FAINT,
      }}
    >
      <Icon size={20} strokeWidth={active ? 2.6 : 2} />
      <span style={{ fontSize: 10, fontWeight: active ? 800 : 600, letterSpacing: 0.5 }}>{label}</span>
    </button>
  );
}

function StartFab() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = pathname === "/";
  const c = CTA_COLORS.yellow;
  return (
    <div style={{ flex: 1, position: "relative", display: "flex", justifyContent: "center" }}>
      <button
        onClick={() => navigate("/")}
        aria-label="出发"
        style={{
          position: "absolute",
          bottom: 8,
          width: 64,
          height: 64,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 1,
          border: "none",
          cursor: "pointer",
          background: c.fill,
          color: c.text,
          clipPath: STAIR,
          boxShadow: active
            ? "inset 0 0 0 3px " + PIXEL_OUT
            : "inset 0 0 0 3px " + PIXEL_OUT + ", 0 6px 16px rgba(40,28,12,0.32)",
          fontFamily: PIXEL_FONT,
        }}
      >
        <Bike size={26} strokeWidth={2.6} />
        <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1 }}>出发</span>
      </button>
    </div>
  );
}

function TabBar() {
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        height: `calc(${TAB_BAR_H}px + env(safe-area-inset-bottom, 0px))`,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        display: "flex",
        alignItems: "stretch",
        background: PAPER,
        boxShadow: "inset 0 3px 0 0 " + PIXEL_OUT,
        fontFamily: PIXEL_FONT,
      }}
    >
      {LEFT.map((t) => (
        <Tab key={t.to} {...t} />
      ))}
      <StartFab />
      {RIGHT.map((t) => (
        <Tab key={t.to} {...t} />
      ))}
    </div>
  );
}

export default function TabShell() {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Outlet />
      <TabBar />
    </div>
  );
}
