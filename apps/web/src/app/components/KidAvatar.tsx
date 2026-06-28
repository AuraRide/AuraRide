import { PIXEL_OUT, STAIR } from "./pixelKit";

// KidAvatar — a small pixel-embroidery child's face, matching the boy/girl riders
// the app is built around. Used as the default avatar in the personal tabs'
// profile header (the "未登录的骑行者" is, like every rider here, a kid).
// 16×16 chibi (Q版) face — big round eyes with a sparkle, rosy cheeks, tiny mouth.
const ROWS = [
  "................",
  ".....HHHHHH.....",
  "...HHHHHHHHHH...",
  "..HHHHHHHHHHHH..",
  "..HHHHHHHHHHHH..",
  "..HHSSSSSSSSHH..",
  "..HSSSSSSSSSSH..",
  "..SEEESSSSEEES..",
  "..SWEESSSSWEES..",
  "..SEEESSSSEEES..",
  "..SSSSSSSSSSSS..",
  "..SCSSSMMSSSCS..",
  "..SSSSSSSSSSSS..",
  "...SSSSSSSSSS...",
  "....SSSSSSSS....",
  "................",
];
const FILL: Record<string, string> = {
  H: "#6b4a2b", // hair
  S: "#f6d2ab", // skin
  E: "#33291c", // eyes
  W: "#ffffff", // eye sparkle
  C: "#f2a7a0", // cheeks
  M: "#c2674a", // mouth
};

export default function KidAvatar({ size = 44, bg = "#f6efdf" }: { size?: number; bg?: string }) {
  const cells: React.ReactNode[] = [];
  ROWS.forEach((row, y) =>
    row.split("").forEach((ch, x) => {
      if (ch === ".") return;
      cells.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={FILL[ch]} />);
    })
  );
  return (
    <span style={{ flex: "none", width: size, height: size, background: bg, clipPath: STAIR, boxShadow: "inset 0 0 0 2px " + PIXEL_OUT, display: "grid", placeItems: "center", overflow: "hidden" }}>
      <svg width={size * 0.84} height={size * 0.84} viewBox="0 0 16 16" shapeRendering="crispEdges">
        {cells}
      </svg>
    </span>
  );
}
