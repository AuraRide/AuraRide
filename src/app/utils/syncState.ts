// Sync state between phone and watch using localStorage

export interface RideState {
  colorId: string;
  emotionState: string;
  speed: number;
  distance: number;
  duration: number;
  heartRate: number;
  isPaused: boolean;
  weather: "clear" | "rain" | "wind" | "sunset";
  terrain: "asphalt" | "gravel" | "cobblestone";
}

const SYNC_KEY = "auraride_sync_state";

export const saveRideState = (state: Partial<RideState>) => {
  try {
    const current = getRideState();
    const updated = { ...current, ...state };
    localStorage.setItem(SYNC_KEY, JSON.stringify(updated));
    // Dispatch custom event for real-time sync
    window.dispatchEvent(new CustomEvent("auraride_state_change", { detail: updated }));
  } catch (error) {
    console.error("Failed to save ride state:", error);
  }
};

export const getRideState = (): Partial<RideState> => {
  try {
    const stored = localStorage.getItem(SYNC_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to get ride state:", error);
    return {};
  }
};

export const clearRideState = () => {
  try {
    localStorage.removeItem(SYNC_KEY);
    window.dispatchEvent(new CustomEvent("auraride_state_change", { detail: {} }));
  } catch (error) {
    console.error("Failed to clear ride state:", error);
  }
};

export const useSyncedState = (
  key: keyof RideState,
  defaultValue: any,
  onUpdate?: (value: any) => void
) => {
  const state = getRideState();
  const value = state[key] ?? defaultValue;

  // Listen for state changes
  if (typeof window !== "undefined" && onUpdate) {
    window.addEventListener("auraride_state_change", ((e: CustomEvent) => {
      const newState = e.detail as Partial<RideState>;
      if (newState[key] !== undefined) {
        onUpdate(newState[key]);
      }
    }) as EventListener);
  }

  return value;
};
