// StartUI.tsx — the start screen's interactive layer, in REAL screen coordinates
// (not the cover-scaled stage), so the title, CTA cluster and auth sheet always
// fit the phone frame. Buttons/inputs use the shared pixelKit so the home screen
// speaks the same visual language as the rest of the app.

import React from "react";
import { useNavigate } from "react-router";
import { motion } from "motion/react";
import { X } from "lucide-react";
import {
  PIXEL_FONT,
  PIXEL_OUT,
  PAPER,
  PAPER_2,
  INK,
  INK_SOFT,
  INK_FAINT,
  CTA_COLORS,
  TOP_STAIR,
  STAIR,
  PixelButton,
  PixelField,
  type CtaColor,
} from "../../components/pixelKit";
import SceneTitle from "./SceneTitle";
import { type ColorId } from "../../lib/moodColor";
import { setAccount } from "../../lib/session";

// scene colour (CtaColor) → emotion colourId. The ride flow is now COLOUR-FIRST:
// the scene you're looking at IS your colour, and 开始骑行 takes that colour
// straight to route planning (no mood sentence / scene-state detour).
const CTA_TO_COLORID: Record<CtaColor, ColorId> = {
  yellow: "explore-yellow",
  blue: "lonely-blue",
  green: "calm-green",
  red: "release-red",
  gray: "tired-gray",
};

function BikeGlyph({ size = 26, stroke = "#fff" }: { size?: number; stroke?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="33" r="8.5" stroke={stroke} strokeWidth="3" />
      <circle cx="36" cy="33" r="8.5" stroke={stroke} strokeWidth="3" />
      <path d="M12 33l9-16h10l-7 16M21 17l-3-5h-4M28 17h7l3 16" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// mode "start" = the 出发 tab (scene + 就这样出发, rider fully visible, no auth
// buttons). mode "auth" = the standalone 登录/注册 page reached from a personal
// tab's profile header; it opens the auth card over the scene and returns on done.
export default function StartUI({ color, t, mode = "start" }: { color: CtaColor; t: number; mode?: "start" | "auth" }) {
  const navigate = useNavigate();
  const c = CTA_COLORS[color] || CTA_COLORS.yellow;
  const [sheet, setSheet] = React.useState<null | "login" | "register">(mode === "auth" ? "login" : null);
  const [phone, setPhone] = React.useState("");
  const [pwd, setPwd] = React.useState("");
  const [pwd2, setPwd2] = React.useState("");
  const [done, setDone] = React.useState(false);

  // closing the auth card: on the dedicated /login page, go back where we came
  // from; otherwise just dismiss the overlay.
  const closeSheet = () => {
    if (mode === "auth") navigate(-1);
    else setSheet(null);
  };
  // After login/register persist the account, then land on 颜色记忆 (auth page) or
  // simply close and stay on the 出发 scene.
  const submit = () => {
    setDone(true);
    setAccount(phone.trim() || "骑行者");
    setTimeout(() => {
      if (mode === "auth") navigate("/colors", { replace: true });
      else {
        setSheet(null);
        setDone(false);
      }
    }, 1400);
  };
  // 开始骑行 — colour-first: take the current scene's colour straight to route
  // planning. The carousel (swipe / dots) is the colour picker.
  const startRide = () => {
    navigate("/generate", { state: { colorId: CTA_TO_COLORID[color] || "explore-yellow" } });
  };

  return (
    <React.Fragment>
      {/* nav now lives in the bottom tab bar; colour is implied only by the tinted
          opening scene (never named in the UI). */}

      {/* title — top, responsive width, never cropped (flex-centred so framer's
          transform animation doesn't clobber the centering) */}
      <motion.div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "calc(env(safe-area-inset-top, 0px) + 17%)",
          display: "flex",
          justifyContent: "center",
          zIndex: 20,
        }}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div style={{ width: "min(63vw, 320px)" }}>
          <SceneTitle color={color} t={t} />
        </div>
      </motion.div>

      {/* legibility scrim behind the cluster */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: "34%",
          background: "linear-gradient(180deg, rgba(30,24,14,0) 0%, rgba(30,24,14,0.05) 45%, rgba(30,24,14,0.18) 100%)",
          pointerEvents: "none",
          zIndex: 18,
        }}
      />

      {/* CTA — only the 出发 action, sat just above the bottom tab bar so the
          rider in the scene stays fully visible (登录/注册 now lives on the
          personal tabs). Hidden on the dedicated /login page. */}
      {mode === "start" && (
        <motion.div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 74px)",
            padding: "0 24px",
            maxWidth: 440,
            margin: "0 auto",
            zIndex: 20,
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.15 }}
        >
          <PixelButton onClick={startRide} fill={c.fill} text={c.text} height={60} fontSize={21} fontWeight={800} letter={5}>
            <BikeGlyph stroke={c.text} />
            就这样出发
          </PixelButton>
        </motion.div>
      )}

      {/* auth — centered modal */}
      {sheet && (
        <div style={{ position: "absolute", inset: 0, zIndex: 60, fontFamily: PIXEL_FONT }}>
          <div onClick={closeSheet} style={{ position: "absolute", inset: 0, background: "rgba(20,16,8,0.5)" }} />
          <div
            className="pixel-pop"
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              width: "min(76%, 310px)",
              background: PAPER,
              clipPath: STAIR,
              padding: "22px 22px 24px",
              boxShadow: "inset 0 0 0 3px " + PIXEL_OUT,
            }}
          >
            {done ? (
              <div style={{ textAlign: "center", padding: "18px 0 10px" }}>
                <div
                  style={{
                    width: 64,
                    height: 64,
                    clipPath: STAIR,
                    background: c.fill,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                    boxShadow: "inset 0 0 0 3px " + PIXEL_OUT,
                  }}
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
                    <path d="M5 13l4 4 10-11" stroke={c.text} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: INK }}>{sheet === "login" ? "欢迎回来，准备出发" : "注册成功，开始骑行"}</div>
              </div>
            ) : (
              <React.Fragment>
                {/* close */}
                <button onClick={closeSheet} style={{ position: "absolute", top: 12, right: 12, width: 30, height: 30, display: "grid", placeItems: "center", background: "none", border: "none", cursor: "pointer", color: INK_FAINT }}>
                  <X size={18} />
                </button>

                <div style={{ display: "flex", gap: 24, marginBottom: 18, justifyContent: "center" }}>
                  {([["login", "登录"], ["register", "注册"]] as const).map(([mode, label]) => (
                    <button
                      key={mode}
                      onClick={() => setSheet(mode)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontFamily: PIXEL_FONT,
                        fontSize: 19,
                        fontWeight: sheet === mode ? 800 : 600,
                        color: sheet === mode ? INK : INK_FAINT,
                        padding: "2px 4px 7px",
                        borderBottom: sheet === mode ? "3px solid " + c.fill : "3px solid transparent",
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <PixelField label="手机号" type="tel" value={phone} onChange={setPhone} placeholder="请输入手机号" accent={c.fill} />
                  <PixelField label="密码" type="password" value={pwd} onChange={setPwd} placeholder="请输入密码" accent={c.fill} />
                  {sheet === "register" && <PixelField label="确认密码" type="password" value={pwd2} onChange={setPwd2} placeholder="请再次输入密码" accent={c.fill} />}
                </div>

                <div style={{ marginTop: 16 }}>
                  <PixelButton onClick={submit} fill={c.fill} text={c.text} height={50} fontSize={17} fontWeight={800} letter={2}>
                    {sheet === "login" ? "登录" : "注册并开始"}
                  </PixelButton>
                </div>

                <div style={{ textAlign: "center", marginTop: 14, fontSize: 12, color: INK_FAINT }}>
                  {sheet === "login" ? "还没有账号？点上方「注册」" : "已有账号？点上方「登录」"}
                </div>
              </React.Fragment>
            )}
          </div>
        </div>
      )}
    </React.Fragment>
  );
}
