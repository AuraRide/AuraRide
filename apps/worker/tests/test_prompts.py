"""prompts.py —— 确保 5 个 ColorId 都内联到 prompt,且要求 JSON 输出。

回归 guard:任何人改色卡时,prompt 不会漂移。
"""

from __future__ import annotations

from auraride_worker.colors import ColorId
from auraride_worker.prompts import COLORIZE_SYSTEM_PROMPT, COLORIZE_USER_PROMPT


def test_all_5_color_ids_appear_in_system_prompt() -> None:
    for cid in ColorId:
        assert cid.value in COLORIZE_SYSTEM_PROMPT, f"prompt 缺少 {cid.value}"


def test_prompt_requires_json_output() -> None:
    """硬约束:输出必须是 JSON,否则 VLM 易跑偏 → 解析失败 → 降级。"""
    assert "JSON" in COLORIZE_SYSTEM_PROMPT
    assert '"color_id"' in COLORIZE_SYSTEM_PROMPT
    assert '"confidence"' in COLORIZE_SYSTEM_PROMPT


def test_prompt_mentions_5_choice_constraint() -> None:
    assert "5" in COLORIZE_SYSTEM_PROMPT  # "5 种" / "5 选 1"


def test_user_prompt_is_short_and_directive() -> None:
    assert "JSON" in COLORIZE_USER_PROMPT
    assert len(COLORIZE_USER_PROMPT) < 100
