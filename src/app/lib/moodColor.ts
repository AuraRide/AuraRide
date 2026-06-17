// Mood → Color engine.
//
// Step 2 of the product flow: take the user's one-sentence mood and derive the
// single best-fitting "emotion color". This is the heart of AuraRide — the user
// writes how they feel, and the system answers with a color (and a route theme).
//
// v1 is an on-device keyword/sentiment heuristic over the 5 emotion buckets so
// it works with no backend. The `analyzeMood` signature is intentionally stable
// so it can later be swapped for an LLM/sentiment API call without touching the
// UI: keep returning { colorId, matched, scores }.

export type ColorId =
  | "calm-green"
  | "lonely-blue"
  | "explore-yellow"
  | "release-red"
  | "tired-gray";

export interface ColorProfile {
  id: ColorId;
  en: string;
  cn: string;
  hex: string;
  /** two-stop gradient for orbs / backgrounds */
  gradient: [string, string];
  /** poetic one-liner shown on the reveal screen */
  line: string;
  /** keywords that pull a sentence toward this color */
  keywords: string[];
}

export const COLOR_PROFILES: Record<ColorId, ColorProfile> = {
  "release-red": {
    id: "release-red",
    en: "EMBER",
    cn: "余火",
    hex: "#FF3344",
    gradient: ["#FF6A5E", "#FF1E3C"],
    line: "撕开风阻，让不安在直道上彻底燃尽。",
    keywords: [
      "烦", "气", "愤怒", "生气", "压力", "崩溃", "焦虑", "暴躁", "发泄",
      "释放", "燃", "爆发", "冲", "不爽", "火大", "急躁", "想骂", "受够",
      "炸", "憋", "躁", "拼", "燃烧", "发疯",
    ],
  },
  "lonely-blue": {
    id: "lonely-blue",
    en: "DEPTH",
    cn: "深蓝",
    hex: "#4FA8FF",
    gradient: ["#5FB8FF", "#1E5FC8"],
    line: "潜入暗流，把喧嚣沉降于底面。",
    keywords: [
      "孤独", "孤单", "难过", "想哭", "失落", "低落", "emo", "一个人", "静静",
      "沉", "思念", "想念", "伤心", "委屈", "空落", "忧郁", "寂寞", "想静",
      "安静", "独处", "想消失一会", "心事", "钝痛", "下雨",
    ],
  },
  "calm-green": {
    id: "calm-green",
    en: "MOSS",
    cn: "暗绿",
    hex: "#34E89E",
    gradient: ["#5BF0B0", "#16B57E"],
    line: "顺应风向，把心跳交还给潮汐。",
    keywords: [
      "平静", "放松", "治愈", "舒服", "安心", "慢", "休息", "恢复", "温柔",
      "自在", "松弛", "惬意", "平和", "轻松", "安稳", "放空一下", "深呼吸",
      "缓缓", "踏实", "宁静", "温暖", "晒太阳",
    ],
  },
  "explore-yellow": {
    id: "explore-yellow",
    en: "TRACE",
    cn: "赭黄",
    hex: "#FFB54A",
    gradient: ["#FFD27A", "#FF9A2E"],
    line: "从容探索街区肌理，收集长长的回声。",
    keywords: [
      "好奇", "探索", "出门", "新鲜", "阳光", "期待", "发现", "走走", "活力",
      "兴奋", "开心", "想出去", "元气", "好天气", "出去玩", "想动", "雀跃",
      "冒险", "新", "高兴", "愉快", "想看看", "轻快", "希望",
    ],
  },
  "tired-gray": {
    id: "tired-gray",
    en: "VOID",
    cn: "灰白",
    hex: "#C9D2D8",
    gradient: ["#DDE4E9", "#9AA6AE"],
    line: "隐入网格，做一阵没有轨迹的风。",
    keywords: [
      "累", "麻木", "空", "没感觉", "无聊", "平淡", "想消失", "放空", "疲惫",
      "提不起劲", "无所谓", "没意思", "倦", "木", "无力", "失眠", "撑", "耗",
      "迷茫", "停", "灰", "什么都不想",
    ],
  },
};

export const COLOR_ORDER: ColorId[] = [
  "calm-green",
  "lonely-blue",
  "explore-yellow",
  "release-red",
  "tired-gray",
];

export interface MoodResult {
  colorId: ColorId;
  /** keyword that tipped the decision, for flavor copy ("" if defaulted) */
  matched: string;
  /** raw per-bucket scores, useful for debugging / future tuning */
  scores: Record<ColorId, number>;
}

/**
 * Derive the best-fitting emotion color from a free-form mood sentence.
 * Longer keyword matches weigh slightly more (more specific = stronger signal).
 * On no signal, falls back to VOID (灰白) — "a wind with no trajectory".
 */
export function analyzeMood(text: string): MoodResult {
  const normalized = (text || "").toLowerCase();
  const scores = {
    "calm-green": 0,
    "lonely-blue": 0,
    "explore-yellow": 0,
    "release-red": 0,
    "tired-gray": 0,
  } as Record<ColorId, number>;

  let matched = "";
  let bestMatchLen = 0;

  for (const id of COLOR_ORDER) {
    for (const kw of COLOR_PROFILES[id].keywords) {
      if (normalized.includes(kw.toLowerCase())) {
        scores[id] += 1 + kw.length * 0.15;
        if (kw.length > bestMatchLen) {
          bestMatchLen = kw.length;
          matched = kw;
        }
      }
    }
  }

  let colorId: ColorId = "tired-gray";
  let bestScore = 0;
  for (const id of COLOR_ORDER) {
    if (scores[id] > bestScore) {
      bestScore = scores[id];
      colorId = id;
    }
  }

  return { colorId, matched: bestScore > 0 ? matched : "", scores };
}
