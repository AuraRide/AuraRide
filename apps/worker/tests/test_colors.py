"""colors.py —— 与前端 moodColor.ts 的逐字对齐 + 解析/最近色逻辑。"""

from __future__ import annotations

from auraride_worker.colors import (
    ALLOWED_COLOR_VALUES,
    COLOR_ORDER,
    COLOR_PROFILES,
    ColorId,
    nearest_color_id,
    parse_color_id,
)


def test_color_id_values_match_frontend() -> None:
    """5 个 string 字面量必须与 apps/web/src/app/lib/moodColor.ts 一致。"""
    assert {c.value for c in ColorId} == {
        "calm-green",
        "lonely-blue",
        "explore-yellow",
        "release-red",
        "tired-gray",
    }


def test_color_profiles_hex_match_manifesto() -> None:
    """hex 值必须与 docs/产品/一切皆颜色.md §1 + moodColor.ts COLOR_PROFILES 一致。"""
    assert COLOR_PROFILES[ColorId.RELEASE_RED].hex == "#FF3344"
    assert COLOR_PROFILES[ColorId.LONELY_BLUE].hex == "#4FA8FF"
    assert COLOR_PROFILES[ColorId.CALM_GREEN].hex == "#34E89E"
    assert COLOR_PROFILES[ColorId.EXPLORE_YELLOW].hex == "#FFB54A"
    assert COLOR_PROFILES[ColorId.TIRED_GRAY].hex == "#C9D2D8"


def test_color_order_matches_frontend() -> None:
    assert COLOR_ORDER == (
        ColorId.CALM_GREEN,
        ColorId.LONELY_BLUE,
        ColorId.EXPLORE_YELLOW,
        ColorId.RELEASE_RED,
        ColorId.TIRED_GRAY,
    )


def test_parse_color_id_whitelist() -> None:
    assert parse_color_id("release-red") == ColorId.RELEASE_RED
    assert parse_color_id("  TIRED-GRAY  ") == ColorId.TIRED_GRAY
    assert parse_color_id("rainbow") is None  # 非法
    assert parse_color_id(None) is None
    assert parse_color_id("") is None


def test_allowed_values_is_frozen_and_complete() -> None:
    assert isinstance(ALLOWED_COLOR_VALUES, frozenset)
    assert len(ALLOWED_COLOR_VALUES) == 5


def test_nearest_color_id_for_pure_red() -> None:
    """纯红 (255,0,0) 离 #FF3344 (release-red) 最近。"""
    assert nearest_color_id((255, 0, 0)) == ColorId.RELEASE_RED


def test_nearest_color_id_for_gray() -> None:
    """中灰 (200,210,216) 几乎 == #C9D2D8 (tired-gray)。"""
    assert nearest_color_id((200, 210, 216)) == ColorId.TIRED_GRAY
