"""actors.colorize_photo —— 端到端:COS 读 → 染色 → 写库 → 触发段聚合。"""

from __future__ import annotations

from auraride_worker.colors import ColorId
from auraride_worker.db import PhotoRecord


def test_colorize_photo_writes_color_and_fans_out(
    stub_broker, stub_worker, in_memory_repo, fake_redis, stub_cos, make_image
):
    """No-VLM 路径:Pillow 染色 → repo 更新 → aggregate actor 被入队消费。"""
    # 必须在 import actors 前完成 broker 注入(conftest 已做)
    from auraride_worker import actors

    actors.set_dependencies(
        repo=in_memory_repo,
        redis=fake_redis,
        cos=stub_cos,
        dashscope=None,
    )

    in_memory_repo.seed_photo(
        PhotoRecord(id="p1", ride_id="ride-A", cos_key="rides/A/p1.jpg")
    )
    stub_cos.put("rides/A/p1.jpg", make_image((52, 232, 158)))  # calm-green

    actors.colorize_photo.send("p1")
    stub_broker.join("colorize")
    stub_broker.join("aggregate")
    stub_worker.join()

    updated = in_memory_repo.get_photo("p1")
    assert updated is not None
    assert updated.color_id == ColorId.CALM_GREEN
    assert updated.source == "pillow"

    # 段聚合也跑了
    assert "ride-A" in in_memory_repo.ride_dominant
    assert in_memory_repo.ride_dominant["ride-A"].dominant == ColorId.CALM_GREEN


def test_colorize_photo_missing_id_is_noop(
    stub_broker, stub_worker, in_memory_repo, fake_redis, stub_cos
):
    from auraride_worker import actors

    actors.set_dependencies(
        repo=in_memory_repo,
        redis=fake_redis,
        cos=stub_cos,
        dashscope=None,
    )
    actors.colorize_photo.send("does-not-exist")
    stub_broker.join("colorize")
    stub_worker.join()
    # 不抛、不写、不触发聚合
    assert in_memory_repo.photos == {}
    assert in_memory_repo.ride_dominant == {}
