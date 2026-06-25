import { createBrowserRouter } from "react-router";
import TabShell from "./components/TabShell";
import CyclingStart from "./pages/cycling/CyclingStart";
import RouteGeneration from "./pages/RouteGeneration";
import EnhancedRidingHUD from "./pages/EnhancedRidingHUD";
import ColorWeave from "./pages/ColorWeave";
import ColorMemory from "./pages/ColorMemory";
import Training from "./pages/Training";
import Overview from "./pages/Overview";
import ShareCard from "./pages/ShareCard";
import ColorMap from "./pages/ColorMap";
import Plaza from "./pages/Plaza";
import PostDetail from "./pages/PostDetail";

// Bottom tab bar (5 symmetric slots, 出发 centred + enlarged):
//   /map 色彩地图(汇总) · /plaza 广场(明细) · / 出发 · /colors 颜色记忆 · /training 骑行日志
// Core flow (色彩游记 wedge):
//   / → /generate → /ride-enhanced → /weave(hero) → /share
//   /login = 登录/注册页 (reached from a personal tab's profile header)
//
// Off-path pages kept on disk but un-routed — revive when needed:
//   ColorReveal(/color), ColorCompass(/phone) + 4 emotion rooms, MoodEntry(/mood),
//   RouteMatching(/matching), RidingHUD(/ride), WatchRiding(/watch), Review(/review).
export const router = createBrowserRouter([
  // top-level tabs (bottom tab bar shell)
  {
    element: <TabShell />,
    children: [
      { path: "/", Component: CyclingStart },
      { path: "/map", Component: ColorMap },
      { path: "/plaza", Component: Plaza },
      { path: "/colors", Component: ColorMemory },
      { path: "/training", Component: Training },
    ],
  },
  // pushed flow / detail screens (no tab bar — full focus)
  { path: "/login", element: <CyclingStart auth /> },
  { path: "/generate", Component: RouteGeneration },
  { path: "/ride-enhanced", Component: EnhancedRidingHUD },
  { path: "/weave", Component: ColorWeave },
  { path: "/overview", Component: Overview },
  { path: "/share", Component: ShareCard },
  { path: "/post/:id", Component: PostDetail },
]);
