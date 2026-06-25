import { useEffect, useState } from "react";

// AuraRide is a mobile-first app. On a real phone (or a narrow / device-emulated
// viewport) it renders full-bleed. On a wide desktop screen, instead of blocking,
// we render the app inside a centered phone frame so it can still be previewed and
// reviewed from a normal browser window.

export default function MobileOnly({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(true);

  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice =
        /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Desktop / wide viewport → show the app inside a phone frame.
  if (!isMobile) {
    return (
      <div className="size-full bg-neutral-900 flex flex-col items-center justify-center gap-4 p-6 overflow-auto">
        <div className="text-xs font-light tracking-[0.3em] text-white/40">
          AURARIDE · 移动端预览
        </div>
        <div
          className="relative shrink-0 overflow-hidden bg-black"
          style={{
            width: 390,
            height: 844,
            borderRadius: 46,
            border: "10px solid #1c1c1f",
            boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
            // A non-identity transform makes this frame the containing block for
            // position:fixed descendants, so modals/sheets/toasts stay INSIDE the
            // phone frame in desktop preview (on real mobile there's no frame, so
            // fixed = viewport = full screen, as intended).
            transform: "translateZ(0)",
          }}
        >
          {children}
        </div>
        <div className="text-[11px] font-light tracking-wide text-white/30">
          真机或窄窗口下为全屏显示
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
