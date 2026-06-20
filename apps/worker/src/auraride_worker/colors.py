"""ColorId 真相源镜像 —— 必须与前端 ``apps/web/src/app/lib/moodColor.ts`` 逐字对齐。

任何新增 / 改名 / 改 hex,**先改前端 moodColor.ts 与 docs/产品/一切皆颜色.md §1**,
**再改本文件**,**再补穷尽匹配的 switch**。这是 AGENTS.md 黄金法则第 8 条。
"""

from __future__ import annotations

from enum import StrEnum
from typing import NamedTuple


class ColorId(StrEnum):
    """5 个情绪色枚举(与前端 ``ColorId`` 字符串字面量一致)。"""

    CALM_GREEN = "calm-green"
    LONELY_BLUE = "lonely-blue"
    EXPLORE_YELLOW = "explore-yellow"
    RELEASE_RED = "release-red"
    TIRED_GRAY = "tired-gray"


class ColorProfile(NamedTuple):
    """色卡条目 —— hex + 中英名,供 prompt 内联 + 日志展示。"""

    id: ColorId
    en: str
    cn: str
    hex: str


COLOR_PROFILES: dict[ColorId, ColorProfile] = {
    ColorId.RELEASE_RED: ColorProfile(ColorId.RELEASE_RED, "EMBER", "余火", "#FF3344"),
    ColorId.LONELY_BLUE: ColorProfile(ColorId.LONELY_BLUE, "DEPTH", "深蓝", "#4FA8FF"),
    ColorId.CALM_GREEN: ColorProfile(ColorId.CALM_GREEN, "MOSS", "暗绿", "#34E89E"),
    ColorId.EXPLORE_YELLOW: ColorProfile(
        ColorId.EXPLORE_YELLOW, "TRACE", "赭黄", "#FFB54A"
    ),
    ColorId.TIRED_GRAY: ColorProfile(ColorId.TIRED_GRAY, "VOID", "灰白", "#C9D2D8"),
}

#: 与前端 ``COLOR_ORDER`` 一致,聚合时用于稳定排序。
COLOR_ORDER: tuple[ColorId, ...] = (
    ColorId.CALM_GREEN,
    ColorId.LONELY_BLUE,
    ColorId.EXPLORE_YELLOW,
    ColorId.RELEASE_RED,
    ColorId.TIRED_GRAY,
)

#: VLM 输出的白名单 —— 任何不在此集合内的字符串一律视为非法,降级。
ALLOWED_COLOR_VALUES: frozenset[str] = frozenset(c.value for c in ColorId)


def parse_color_id(raw: str | None) -> ColorId | None:
    """把 VLM/外部输入的字符串安全解析成 ``ColorId``;非法返回 ``None``。"""
    if not raw:
        return None
    normalized = raw.strip().lower()
    if normalized not in ALLOWED_COLOR_VALUES:
        return None
    return ColorId(normalized)


def hex_to_rgb(hex_str: str) -> tuple[int, int, int]:
    """``#FF3344`` → ``(255, 51, 68)``。色卡保证 7 字符。"""
    h = hex_str.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def nearest_color_id(rgb: tuple[int, int, int]) -> ColorId:
    """欧氏距离最近的 ``ColorId`` —— Pillow 平均色降级路径用。"""
    r, g, b = rgb
    best: ColorId = ColorId.TIRED_GRAY
    best_dist = float("inf")
    for cid in COLOR_ORDER:
        pr, pg, pb = hex_to_rgb(COLOR_PROFILES[cid].hex)
        dist = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        if dist < best_dist:
            best_dist = dist
            best = cid
    return best
