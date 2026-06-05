import { useEffect, useState } from "react";

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

  if (!isMobile) {
    return (
      <div className="size-full bg-black text-white flex items-center justify-center p-8">
        <div className="max-w-md text-center space-y-6">
          <div className="text-6xl font-thin tracking-tighter text-white/80">
            AuraRide
          </div>
          <div className="text-sm font-extralight tracking-wide text-white/50 leading-relaxed">
            此应用仅支持移动设备访问
          </div>
          <div className="text-xs font-light tracking-wider text-white/30 mt-8">
            请在 iPhone 或 Apple Watch 上打开此应用
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
