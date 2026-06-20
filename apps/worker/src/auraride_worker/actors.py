"""dramatiq actor 定义 —— 业务唯一外部入口。

设计:actor 函数本身 *不* 直接 import broker(被 dramatiq 装饰后绑定到当前 default
broker)。测试用 ``StubBroker`` + ``Worker(..., worker_timeout=100)`` 同步消费。

依赖通过模块级"句柄"注入:
- ``set_dependencies(repo=..., redis=..., cos=..., dashscope=...)``

这样测试 fixture 把 ``InMemoryPhotoRepo`` / ``FakeRedis`` / ``StubCosClient`` /
``StubDashScope`` 注进来就能跑完整链路。
"""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field

import dramatiq

from .budget import RedisLike
from .colors import COLOR_ORDER, ColorId
from .cos_client import CosClient
from .db import PhotoRepo, SegmentAggregate
from .logging_setup import get_logger
from .vlm_client import DashScopeLike, colorize

log = get_logger(__name__)


# --- 依赖注入容器(不用 DI 框架,够简单) ---


@dataclass(slots=True)
class _Deps:
    repo: PhotoRepo | None = None
    redis: RedisLike | None = None
    cos: CosClient | None = None
    dashscope: DashScopeLike | None = None
    extras: dict = field(default_factory=dict)


_deps = _Deps()


def set_dependencies(
    *,
    repo: PhotoRepo | None = None,
    redis: RedisLike | None = None,
    cos: CosClient | None = None,
    dashscope: DashScopeLike | None = None,
) -> None:
    """生产入口 / 测试 fixture 都通过它注入。任一参数为 None 时保留旧值。"""
    if repo is not None:
        _deps.repo = repo
    if redis is not None:
        _deps.redis = redis
    if cos is not None:
        _deps.cos = cos
    if dashscope is not None:
        _deps.dashscope = dashscope


def _require(name: str, value):
    if value is None:
        raise RuntimeError(
            f"actor 依赖 '{name}' 未注入 —— 请在启动入口调 set_dependencies(...)"
        )
    return value


# 注:不在 import 时初始化 broker —— 生产由 main.bootstrap() 显式 init_broker(),
# 测试 conftest fixture 在 import 后把 actor 重新绑到 StubBroker。


# --- Actor 1:对单张照片染色 ---


@dramatiq.actor(max_retries=2, min_backoff=1_000, max_backoff=10_000, queue_name="colorize")
def colorize_photo(photo_id: str) -> None:
    """读照片 → VLM/Pillow 染色 → 写库 → 触发段聚合。

    单 actor 内部所有失败都被 ``colorize()`` 的 6 级降级链吃掉,理论上不会重试;
    保留 max_retries=2 处理 DB 短暂不可达。
    """
    repo: PhotoRepo = _require("repo", _deps.repo)
    cos: CosClient = _require("cos", _deps.cos)
    redis: RedisLike = _require("redis", _deps.redis)
    dashscope = _deps.dashscope  # 允许 None(走 Pillow)

    record = repo.get_photo(photo_id)
    if record is None:
        log.warning("colorize_photo_not_found", photo_id=photo_id)
        return

    log.info("colorize_photo_start", photo_id=photo_id, ride_id=record.ride_id)
    image_bytes = cos.get_object_bytes(record.cos_key)
    vote = colorize(image_bytes, redis=redis, dashscope=dashscope)

    repo.update_photo_color(
        photo_id,
        color_id=vote.color_id,
        confidence=vote.confidence,
        source=vote.source,
    )
    log.info(
        "colorize_photo_done",
        photo_id=photo_id,
        color_id=vote.color_id.value,
        confidence=vote.confidence,
        source=vote.source,
    )

    # 触发段聚合(消息进队列,不阻塞当前 actor)
    aggregate_segment_color.send(record.ride_id)


# --- Actor 2:聚合段(ride)主色 ---


@dramatiq.actor(max_retries=2, min_backoff=1_000, max_backoff=10_000, queue_name="aggregate")
def aggregate_segment_color(ride_id: str) -> None:
    """对一次骑行的所有已染色照片做"加权投票",写回 ``rides.dominant_color``。

    权重:``confidence``;同票时按 ``COLOR_ORDER`` 稳定优先。
    无任何已染色照片 → 短路返回(等下次 photo 染完会再触发)。
    """
    repo: PhotoRepo = _require("repo", _deps.repo)
    photos = [p for p in repo.list_ride_photos(ride_id) if p.color_id is not None]
    if not photos:
        log.info("aggregate_skip_empty", ride_id=ride_id)
        return

    weighted: Counter[ColorId] = Counter()
    raw_votes: Counter[ColorId] = Counter()
    for p in photos:
        weight = max(0.1, p.confidence or 0.5)
        weighted[p.color_id] += weight  # type: ignore[index]
        raw_votes[p.color_id] += 1  # type: ignore[index]

    # 稳定排序:weighted desc → COLOR_ORDER index asc
    order_index = {cid: idx for idx, cid in enumerate(COLOR_ORDER)}
    dominant = min(
        weighted.keys(),
        key=lambda cid: (-weighted[cid], order_index[cid]),
    )

    agg = SegmentAggregate(
        ride_id=ride_id,
        dominant=dominant,
        votes=dict(raw_votes),
    )
    repo.update_ride_dominant(agg)
    log.info(
        "aggregate_done",
        ride_id=ride_id,
        dominant=dominant.value,
        total_photos=len(photos),
        votes={k.value: v for k, v in raw_votes.items()},
    )
