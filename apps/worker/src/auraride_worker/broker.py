"""dramatiq broker —— 默认 Redis,测试用 ``StubBroker`` 注入。

业务模块统一通过 ``set_default_broker`` 拿到当前 broker,actor 不直接 import。
"""

from __future__ import annotations

import dramatiq
from dramatiq.brokers.redis import RedisBroker

from .config import get_settings

_broker: dramatiq.Broker | None = None


def init_broker() -> dramatiq.Broker:
    """生产入口:构造 RedisBroker 并设为默认。幂等。"""
    global _broker
    if _broker is not None:
        return _broker
    settings = get_settings()
    broker = RedisBroker(url=settings.redis_url)
    dramatiq.set_broker(broker)
    _broker = broker
    return broker


def set_test_broker(broker: dramatiq.Broker) -> None:
    """测试夹具用:注入 ``StubBroker`` 后,所有 actor 同步执行。"""
    global _broker
    dramatiq.set_broker(broker)
    _broker = broker


def get_broker() -> dramatiq.Broker:
    """业务侧调用 —— 没初始化就懒加载 Redis。"""
    if _broker is None:
        return init_broker()
    return _broker
