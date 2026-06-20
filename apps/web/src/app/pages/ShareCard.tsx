import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { PIXEL_FONT, INK, INK_SOFT, CTA_COLORS, emotionToCtaColor, PixelButton, PixelField, PixelBack } from "../components/pixelKit";
import { repo, type RideRecord } from "../lib/rideRepo";
import { renderShareCard } from "../lib/shareCard";

// Turn a saved ride into a shareable poster (canvas) + publish it to 广场.
// Entry: navigate("/share", { state: { rideId } }). Falls back to the latest ride.

export default function ShareCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const rideId: string | undefined = location.state?.rideId;

  const [ride, setRide] = useState<RideRecord | null>(null);
  const [city, setCity] = useState("上海 · 北外滩");
  const [busy, setBusy] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    (async () => {
      const r = rideId ? await repo.getRide(rideId) : (await repo.listRides())[0] || null;
      setRide(r);
    })();
  }, [rideId]);

  useEffect(() => {
    if (ride && canvasRef.current) renderShareCard(canvasRef.current, ride);
  }, [ride]);

  const accent = ride ? CTA_COLORS[emotionToCtaColor(ride.colorId as any)] : CTA_COLORS.yellow;

  const saveImage = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    const a = document.createElement("a");
    a.download = `光屿骑行-${ride?.colorId || "card"}.png`;
    a.href = cv.toDataURL("image/png");
    a.click();
  };

  const publish = async () => {
    if (!ride || busy) return;
    setBusy(true);
    try {
      const post = await repo.publishRide(ride.id, { city, caption: ride.moodText });
      navigate(`/post/${post.id}`, { replace: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="size-full overflow-y-auto relative" style={{ fontFamily: PIXEL_FONT, background: "linear-gradient(180deg, #f4efe3 0%, #e9e2d2 100%)", color: INK }}>
      <div className="flex items-center justify-between px-5 pt-12">
        <PixelBack onClick={() => navigate(-1)} />
        <span style={{ fontSize: 15, fontWeight: 800, letterSpacing: 4, color: INK_SOFT }}>分享卡片</span>
        <div style={{ width: 40 }} />
      </div>

      {!ride ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: INK_SOFT }}>没有可分享的骑行</div>
      ) : (
        <div className="px-5" style={{ paddingTop: 18, paddingBottom: 30 }}>
          {/* poster preview */}
          <div style={{ boxShadow: "0 10px 30px rgba(58,40,23,0.25)", marginBottom: 22 }}>
            <canvas ref={canvasRef} style={{ width: "100%", height: "auto", display: "block" }} />
          </div>

          {/* publish target city */}
          <div style={{ marginBottom: 14 }}>
            <PixelField label="发布到广场时标注城市" value={city} onChange={setCity} accent={accent.fill} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <PixelButton onClick={publish} disabled={busy} fill={accent.fill} text={accent.text} height={56} fontSize={17} letter={4}>
              {busy ? "发布中…" : "发布到广场"}
            </PixelButton>
            <PixelButton onClick={saveImage} fill="#f6efdf" text={INK} height={50} fontSize={15} fontWeight={700} letter={3}>
              保存图片到本地
            </PixelButton>
          </div>
        </div>
      )}
    </div>
  );
}
