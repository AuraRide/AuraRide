import { createBrowserRouter } from "react-router";
import MoodEntry from "./pages/MoodEntry";
import ColorReveal from "./pages/ColorReveal";
import EmotionSlider from "./pages/EmotionSlider";
import ColorCompass from "./pages/ColorCompass";
import DeepSeaState from "./pages/DeepSeaState";
import HealingState from "./pages/HealingState";
import BurnoutState from "./pages/BurnoutState";
import TraceState from "./pages/TraceState";
import RouteMatching from "./pages/RouteMatching";
import RouteGeneration from "./pages/RouteGeneration";
import RidingHUD from "./pages/RidingHUD";
import EnhancedRidingHUD from "./pages/EnhancedRidingHUD";
import Review from "./pages/Review";
import WatchRiding from "./pages/WatchRiding";
import Journal from "./pages/Journal";
import Overview from "./pages/Overview";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: EmotionSlider,
  },
  {
    path: "/mood",
    Component: MoodEntry,
  },
  {
    path: "/color",
    Component: ColorReveal,
  },
  {
    path: "/emotions",
    Component: EmotionSlider,
  },
  {
    path: "/phone",
    Component: ColorCompass,
  },
  {
    path: "/deep-sea",
    Component: DeepSeaState,
  },
  {
    path: "/healing",
    Component: HealingState,
  },
  {
    path: "/burnout",
    Component: BurnoutState,
  },
  {
    path: "/trace",
    Component: TraceState,
  },
  {
    path: "/matching",
    Component: RouteMatching,
  },
  {
    path: "/generate",
    Component: RouteGeneration,
  },
  {
    path: "/ride",
    Component: RidingHUD,
  },
  {
    path: "/ride-enhanced",
    Component: EnhancedRidingHUD,
  },
  {
    path: "/review",
    Component: Review,
  },
  {
    path: "/watch",
    Component: WatchRiding,
  },
  {
    path: "/journal",
    Component: Journal,
  },
  {
    path: "/overview",
    Component: Overview,
  },
]);
