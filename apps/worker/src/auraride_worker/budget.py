"""VLM 预算闸门 —— Redis 当日累计成本,超过 ``VLM_DAILY_BUDGET_CNY`` 拒绝调用。

实现要点:
- key 用 ``vlm:cost:YYYY-MM-DD``,自然按天滚动,UTC+8 简化处理(国内业务可接受)
- ``check_and_charge`` 原子 ``incrbyfloat``,**先扣再问**,超额回滚 + 抛 ``BudgetExceeded``
- 配合 ``vlm_client`` 的降级链 —— 这里只负责"额度",不管业务怎么降级
"""

from __future__ import annotations

from datetime import datetime
from typing import Protocol

from .config import get_settings


class BudgetExceeded(Exception):
    """当日 VLM 预算用尽,调用方应降级,不要重试。"""


class RedisLike(Protocol):
    """最小 Redis 接口 —— 真 ``redis.Redis`` 与 ``fakeredis.FakeRedis`` 均满足。"""

    def incrbyfloat(self, name: str, amount: float) -> float: ...
    def expire(self, name: str, time: int) -> bool: ...
    def get(self, name: str) -> bytes | None: ...


def _today_key() -> str:
    """以本地日期(UTC+8 系统时区)切片;生产服务器 ``timedatectl set-timezone Asia/Shanghai``。"""
    return f"vlm:cost:{datetime.now().strftime('%Y-%m-%d')}"


def current_spend(redis: RedisLike) -> float:
    raw = redis.get(_today_key())
    if raw is None:
        return 0.0
    try:
        return float(raw)
    except (ValueError, TypeError):
        return 0.0


def check_and_charge(redis: RedisLike, cost_cny: float | None = None) -> float:
    """原子扣费;超额回滚 + 抛 ``BudgetExceeded``。返回扣费后累计值。

    设计上"先扣再问"避免并发下两个 worker 同时通过 ``get + compare`` 双扣;
    超额时主动 ``incrbyfloat(-cost)`` 回滚,容忍少量瞬时漂移(< 1 次调用成本)。
    """
    settings = get_settings()
    cost = cost_cny if cost_cny is not None else settings.vlm_cost_per_call_cny
    budget = settings.vlm_daily_budget_cny
    key = _today_key()

    new_total = redis.incrbyfloat(key, cost)
    # 第一次写入设过期:48h 留余地查日报
    if abs(new_total - cost) < 1e-9:
        redis.expire(key, 60 * 60 * 48)

    if new_total > budget:
        redis.incrbyfloat(key, -cost)  # 回滚
        raise BudgetExceeded(
            f"VLM 当日预算超限:已用 ¥{new_total - cost:.4f} + 本次 ¥{cost:.4f} > ¥{budget:.2f}"
        )
    return new_total
