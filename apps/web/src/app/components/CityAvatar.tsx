import { PIXEL_OUT, STAIR } from "./pixelKit";

// Pixel-embroidery city avatars. Each region is drawn as its landmark silhouette
// in dark thread-ink on a pale wash of its colour. Iconic landmarks are hand-drawn
// bitmaps; regions without one fall back to a deterministic, 4-fold-symmetric
// pixel "crest" derived from the name — so every one of China's 34 provincial
// regions gets a distinct, tidy avatar in the app's own pixel style.

const INK = "#3a2817";
const CREAM = "#f7f1e4";

function hexToRgb(hex: string): [number, number, number] {
  const h = (hex || "#888").replace("#", "");
  const v = h.length === 3 ? h.split("").map((c) => c + c).join("") : h.padEnd(6, "0").slice(0, 6);
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
function wash(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  const [cr, cg, cb] = hexToRgb(CREAM);
  const t = 0.62; // pale wash so the dark silhouette always reads
  const mix = (a: number, c: number) => Math.round(a + (c - a) * t);
  return `rgb(${mix(r, cr)},${mix(g, cg)},${mix(b, cb)})`;
}

// '#' = ink pixel, '.' = empty. Every row in a landmark must be the same width.
const LANDMARKS: Record<string, string[]> = {
  shanghai: [ // 东方明珠
    "......##........", "......##........", ".....####.......", "......##........",
    "......##........", "....######......", "...########.....", "...########.....",
    "....######......", "......##........", "......##........", ".....####.......",
    "......##........", ".....#..#.......", "....#....#......", "...##....##.....",
  ],
  hangzhou: [ // 雷峰塔
    ".......##.......", ".....######.....", "......####......", "....########....",
    ".....######.....", "...##########...", "....########....", "..############..",
    "...##########...", "..############..", "..#####..#####..", ".##############.",
  ],
  chengdu: [ // 熊猫
    ".####.....####..", ".####.....####..", ".####.....####..", "................",
    "...###....###...", "..#####..#####..", "..#####..#####..", "...###....###...",
    "................", "......####......", ".....######.....",
  ],
  guangzhou: [ // 广州塔
    ".......#........", ".......#........", "......###.......", "......###.......",
    ".......#........", ".......#........", ".......#........", ".......#........",
    "......###.......", "......###.......", ".....#####......", ".....#####......",
    "....#######.....", "....#######.....",
  ],
  beijing: [ // 天安门
    ".......#........", ".......#........", "......###.......", ".....#####......",
    "......###.......", "...#########....", "..###########...", ".#############..",
    "..###########...", "..###########...", "..##.##.##.##...", "..###########...",
    ".#############..",
  ],
  greatwall: [ // 长城
    "................", ".....#.#.#......", ".....#####......", ".....#...#......",
    "...#########....", "#.#.#.#.#.#.#.#.", "################", "################",
    "################",
  ],
  yurt: [ // 蒙古包
    "......####......", "....########....", "..############..", ".##############.",
    "################", "######....######", "######....######", "################",
  ],
  palm: [ // 椰树
    "..#...##...#....", ".###.####.###...", "..##########....", "....#####.......",
    "......##........", ".......##.......", "......##........", "......###.......",
    "....########....",
  ],
  karst: [ // 桂林山水
    ".....##.........", "....####...##...", "...######.####..", "..########.####.",
    ".##############.", "................",
  ],
  potala: [ // 布达拉宫
    "......####......", "......####......", ".....######.....", "....########....",
    "...##########...", "..############..", ".##############.", "#.#.#.#.#.#.#.#.",
    "################", "################",
  ],
  taipei101: [ // 台北101
    ".......#........", ".......#........", "......###.......", "......###.......",
    ".....#####......", ".....#####......", "......###.......", ".....#####......",
    ".....#####......", "......###.......", ".....#####......", "....#######.....",
    "....#######.....",
  ],
  ruins: [ // 大三巴
    ".......#........", "......###.......", ".....#####......", "....#######.....",
    "...#########....", "..###########...", "..#.#.#.#.#.#...", "..###########...",
    "..##.##.##.##...", ".#############..", "###############.",
  ],
  hkskyline: [ // 香港天际线
    ".....#..........", ".....#....#.....", "..#..#....#..##.", "..#.##..#.#.##.#",
    ".####.#.###.####", "################", "################",
  ],
};

// region keyword → landmark key (first match wins)
const MATCH: Array<[string[], string]> = [
  [["上海"], "shanghai"],
  [["浙江", "西湖", "杭州"], "hangzhou"],
  [["四川", "成都", "锦江"], "chengdu"],
  [["广东", "广州", "珠江"], "guangzhou"],
  [["北京"], "beijing"],
  [["河北", "山海关", "长城"], "greatwall"],
  [["内蒙古", "呼伦", "蒙古"], "yurt"],
  [["海南", "三亚"], "palm"],
  [["广西", "桂林"], "karst"],
  [["西藏", "拉萨", "布达拉"], "potala"],
  [["台湾", "台北"], "taipei101"],
  [["澳门", "大三巴"], "ruins"],
  [["香港", "维港"], "hkskyline"],
];

function matchLandmark(city: string): string | null {
  for (const [keys, k] of MATCH) if (keys.some((kw) => city.includes(kw))) return k;
  return null;
}

// deterministic 4-fold-symmetric pixel crest from a name (tidy, never noisy-looking)
function emblem(name: string): string[] {
  let h = 2166136261;
  for (let i = 0; i < name.length; i++) { h ^= name.charCodeAt(i); h = Math.imul(h, 16777619); }
  let a = h >>> 0;
  const rnd = () => { a = (a * 1664525 + 1013904223) % 4294967296; return a / 4294967296; };
  const Q = 6;
  const quad: boolean[][] = [];
  for (let y = 0; y < Q; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < Q; x++) {
      // denser toward the centre so it reads as a medallion, sparse at edges
      const edge = (x + y) / (Q * 2);
      row.push(rnd() < 0.62 - edge * 0.5);
    }
    quad.push(row);
  }
  const W = Q * 2;
  const rows: string[] = [];
  for (let y = 0; y < W; y++) {
    let s = "";
    for (let x = 0; x < W; x++) {
      const qy = y < Q ? y : W - 1 - y;
      const qx = x < Q ? x : W - 1 - x;
      s += quad[qy][qx] ? "#" : ".";
    }
    rows.push(s);
  }
  return rows;
}

export default function CityAvatar({ city, color, size = 34 }: { city: string; color: string; size?: number }) {
  const key = matchLandmark(city);
  const rows = key ? LANDMARKS[key] : emblem(city);
  const w = rows[0].length;
  const h = rows.length;
  return (
    <div
      style={{
        flex: "none",
        width: size,
        height: size,
        background: wash(color),
        clipPath: STAIR,
        boxShadow: "inset 0 0 0 2px " + PIXEL_OUT,
        display: "grid",
        placeItems: "center",
      }}
    >
      <svg width="76%" height="76%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid meet" style={{ shapeRendering: "crispEdges" }}>
        {rows.flatMap((row, y) =>
          [...row].map((ch, x) => (ch === "#" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={INK} /> : null))
        )}
      </svg>
    </div>
  );
}
