// rideAnnounce.ts — STUB for in-ride voice / haptic cues (每公里、配速、转向).
//
// Left intentionally empty for now (per request — voice to be added later).
// The HUD calls `announceKm` once per whole kilometre; fill in the body with
// Web Speech (speechSynthesis) + navigator.vibrate when you're ready. Keeping
// the call-site wired means no HUD changes are needed to switch it on.

export interface AnnounceContext {
  km: number; // the kilometre just completed
  avgSpeedKmh: number;
  paceStr: string; // mm:ss /km
  durationSec: number;
}

/** Called once each time the rider crosses a whole-km boundary. No-op for now. */
export function announceKm(_ctx: AnnounceContext): void {
  // TODO(voice): e.g.
  //   const u = new SpeechSynthesisUtterance(`${_ctx.km} 公里，配速 ${_ctx.paceStr}`);
  //   u.lang = "zh-CN"; speechSynthesis.speak(u);
  //   navigator.vibrate?.([60, 40, 60]);
}
