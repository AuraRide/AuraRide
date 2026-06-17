// riderChoice.ts — which rider (boy/girl) the user picked. Persisted so the
// choice is consistent across the start screen and every interior scene backdrop.
// Tapping the rider on the start screen toggles it.

import { BoyArt, type RiderArt } from "./riderBoy";
import { GirlArt } from "./riderGirl";

export type RiderId = "boy" | "girl";
const KEY = "auraride.rider";

export function getRiderId(): RiderId {
  try {
    return (localStorage.getItem(KEY) as RiderId) === "girl" ? "girl" : "boy";
  } catch {
    return "boy";
  }
}
export function setRiderId(id: RiderId) {
  try {
    localStorage.setItem(KEY, id);
  } catch {
    /* ignore */
  }
}
export function riderArt(id: RiderId): RiderArt {
  return id === "girl" ? GirlArt : BoyArt;
}
