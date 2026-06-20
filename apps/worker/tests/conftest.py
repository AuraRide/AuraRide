"""pytest 公共 fixture —— 所有测试**不**依赖真 Postgres / Redis / DashScope。

- broker:dramatiq ``StubBroker`` + ``Worker``,同步执行 actor
- redis:fakeredis(纯内存 Redis 协议实现)
- cos:``StubCosClient`` 预灌图片字节
- dashscope:可控 stub,既能模拟成功也能模拟异常 / 不合法 JSON
- repo:``InMemoryPhotoRepo`` 配合断言
"""

from __future__ import annotations

import io

import dramatiq
import fakeredis
import pytest
from dramatiq import Worker
from dramatiq.brokers.stub import StubBroker
from PIL import Image

from auraride_worker.broker import set_test_broker
from auraride_worker.config import get_settings
from auraride_worker.cos_client import StubCosClient
from auraride_worker.db import InMemoryPhotoRepo


@pytest.fixture(autouse=True)
def _reset_settings_cache(monkeypatch: pytest.MonkeyPatch) -> None:
    """每个 test 都拿到干净的 ``Settings`` —— 默认无 API key + 预算 ¥20。"""
    monkeypatch.delenv("DASHSCOPE_API_KEY", raising=False)
    monkeypatch.delenv("VLM_DAILY_BUDGET_CNY", raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def stub_broker() -> StubBroker:
    """全新 StubBroker —— 关键:必须在 import actors 之前 set 到 dramatiq。

    第一次 import 时 @dramatiq.actor 把 actor 绑到当时的 default broker。后续测试
    fixture 换新 StubBroker 时,我们 (1) 把新 broker 设为 default,(2) 把已注册的
    actor 重新 declare 到新 broker —— 否则 send/join 会 ``QueueNotFound``。
    """
    broker = StubBroker()
    broker.emit_after("process_boot")
    set_test_broker(broker)
    dramatiq.set_broker(broker)

    # 把 actors 模块里所有已声明的 actor 重新绑到这个 broker
    from auraride_worker import actors as _actors

    for name in dir(_actors):
        obj = getattr(_actors, name)
        if isinstance(obj, dramatiq.Actor):
            obj.broker = broker
            broker.declare_actor(obj)
    return broker


@pytest.fixture
def stub_worker(stub_broker: StubBroker):
    """同步消费 worker —— 测试调 ``stub_broker.join(queue)`` 等消息处理完。"""
    worker = Worker(stub_broker, worker_timeout=100)
    worker.start()
    yield worker
    worker.stop()


@pytest.fixture
def fake_redis() -> fakeredis.FakeRedis:
    return fakeredis.FakeRedis()


@pytest.fixture
def in_memory_repo() -> InMemoryPhotoRepo:
    return InMemoryPhotoRepo()


@pytest.fixture
def stub_cos() -> StubCosClient:
    return StubCosClient()


def _make_image_bytes(rgb: tuple[int, int, int]) -> bytes:
    """生成 64×64 纯色 JPEG —— Pillow 平均色降级路径测试用。"""
    img = Image.new("RGB", (64, 64), rgb)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()


@pytest.fixture
def make_image():
    return _make_image_bytes
