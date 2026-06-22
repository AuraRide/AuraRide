"""budget.py —— Redis 当日累计 + 超额回滚 + BudgetExceeded。"""

from __future__ import annotations

import pytest

from auraride_worker.budget import BudgetExceeded, check_and_charge, current_spend
from auraride_worker.config import get_settings


def test_first_charge_sets_expire(fake_redis, monkeypatch):
    monkeypatch.setenv("VLM_DAILY_BUDGET_CNY", "1.0")
    monkeypatch.setenv("VLM_COST_PER_CALL_CNY", "0.1")
    get_settings.cache_clear()

    spend = check_and_charge(fake_redis)
    assert spend == pytest.approx(0.1, rel=1e-3)
    assert current_spend(fake_redis) == pytest.approx(0.1, rel=1e-3)


def test_budget_exceeded_rolls_back(fake_redis, monkeypatch):
    monkeypatch.setenv("VLM_DAILY_BUDGET_CNY", "0.2")
    monkeypatch.setenv("VLM_COST_PER_CALL_CNY", "0.15")
    get_settings.cache_clear()

    # 第 1 次:0.15 < 0.2 → 通过
    check_and_charge(fake_redis)
    # 第 2 次:0.30 > 0.2 → 抛 + 回滚
    with pytest.raises(BudgetExceeded):
        check_and_charge(fake_redis)
    # 回滚后累计还是 0.15
    assert current_spend(fake_redis) == pytest.approx(0.15, rel=1e-3)


def test_multiple_charges_accumulate(fake_redis, monkeypatch):
    monkeypatch.setenv("VLM_DAILY_BUDGET_CNY", "100.0")
    monkeypatch.setenv("VLM_COST_PER_CALL_CNY", "1.0")
    get_settings.cache_clear()

    for _ in range(5):
        check_and_charge(fake_redis)
    assert current_spend(fake_redis) == pytest.approx(5.0, rel=1e-3)
