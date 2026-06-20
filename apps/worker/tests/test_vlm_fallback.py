"""vlm_client.py —— 6 级优雅降级链每一级都覆盖到。"""

from __future__ import annotations

from typing import Any

import pytest

from auraride_worker.colors import ColorId
from auraride_worker.config import get_settings
from auraride_worker.vlm_client import colorize


class _StubDashScope:
    """可控 stub:可成功 / 抛异常 / 返回非法 JSON 形状。"""

    def __init__(self, *, payload: dict | Exception):
        self.payload = payload
        self.calls = 0

    def call(self, *, model: str, image_bytes: bytes) -> dict:
        self.calls += 1
        if isinstance(self.payload, Exception):
            raise self.payload
        return self.payload


def test_no_api_key_falls_back_to_pillow(fake_redis, make_image):
    """L1 降级:无 key → Pillow 平均色,且不调 DashScope。"""
    get_settings.cache_clear()
    red_img = make_image((255, 30, 40))  # 接近 release-red
    vote = colorize(red_img, redis=fake_redis, dashscope=None)
    assert vote.source == "pillow"
    assert vote.color_id == ColorId.RELEASE_RED


def test_budget_exceeded_falls_back_to_pillow(fake_redis, make_image, monkeypatch):
    """L2 降级:有 key 但当日预算耗尽 → Pillow。"""
    monkeypatch.setenv("DASHSCOPE_API_KEY", "sk-test")
    monkeypatch.setenv("VLM_DAILY_BUDGET_CNY", "0.01")
    monkeypatch.setenv("VLM_COST_PER_CALL_CNY", "0.05")
    get_settings.cache_clear()

    stub = _StubDashScope(payload={"color_id": "release-red", "confidence": 0.9})
    blue_img = make_image((80, 168, 255))  # 接近 lonely-blue
    vote = colorize(blue_img, redis=fake_redis, dashscope=stub)

    assert vote.source == "pillow"  # 没让它打 API
    assert vote.color_id == ColorId.LONELY_BLUE
    assert stub.calls == 0


def test_vlm_api_error_falls_back_to_pillow(fake_redis, make_image, monkeypatch):
    """L3 降级:DashScope 抛异常 → Pillow。"""
    monkeypatch.setenv("DASHSCOPE_API_KEY", "sk-test")
    get_settings.cache_clear()

    stub = _StubDashScope(payload=RuntimeError("dashscope upstream 500"))
    green_img = make_image((52, 232, 158))  # 接近 calm-green
    vote = colorize(green_img, redis=fake_redis, dashscope=stub)
    assert vote.source == "pillow"
    assert vote.color_id == ColorId.CALM_GREEN


def test_vlm_unknown_color_id_falls_back_to_pillow(fake_redis, make_image, monkeypatch):
    """L4+L5 降级:DashScope 返回不在白名单 → Pillow。"""
    monkeypatch.setenv("DASHSCOPE_API_KEY", "sk-test")
    get_settings.cache_clear()

    stub = _StubDashScope(payload={"color_id": "rainbow-burst", "confidence": 0.9})
    yellow_img = make_image((255, 181, 74))
    vote = colorize(yellow_img, redis=fake_redis, dashscope=stub)
    assert vote.source == "pillow"
    assert vote.color_id == ColorId.EXPLORE_YELLOW


def test_vlm_happy_path(fake_redis, make_image, monkeypatch):
    """正常路径:DashScope 返回合法白名单 → source=vlm。"""
    monkeypatch.setenv("DASHSCOPE_API_KEY", "sk-test")
    get_settings.cache_clear()

    stub = _StubDashScope(
        payload={"color_id": "tired-gray", "confidence": 0.85, "reason": "灰调"}
    )
    gray_img = make_image((201, 210, 216))
    vote = colorize(gray_img, redis=fake_redis, dashscope=stub)
    assert vote.source == "vlm"
    assert vote.color_id == ColorId.TIRED_GRAY
    assert vote.confidence == pytest.approx(0.85)
    assert stub.calls == 1


def test_ultimate_fallback_for_broken_image(fake_redis, monkeypatch):
    """L6 兜底:图损坏 + 无 key → tired-gray。"""
    get_settings.cache_clear()
    junk: Any = b"not-an-image-payload-at-all"
    vote = colorize(junk, redis=fake_redis, dashscope=None)
    assert vote.source == "fallback"
    assert vote.color_id == ColorId.TIRED_GRAY
