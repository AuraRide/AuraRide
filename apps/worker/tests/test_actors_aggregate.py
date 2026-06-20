"""actors.aggregate_segment_color —— 加权投票 + 同票稳定优先。"""

from __future__ import annotations

from auraride_worker.colors import ColorId
from auraride_worker.db import PhotoRecord


def test_aggregate_picks_highest_weighted(
    stub_broker, stub_worker, in_memory_repo, fake_redis, stub_cos
):
    """3 票:2 lonely-blue (低置信) + 1 release-red (高置信) → release-red 胜。"""
    from auraride_worker import actors

    actors.set_dependencies(
        repo=in_memory_repo,
        redis=fake_redis,
        cos=stub_cos,
    )

    ride = "ride-vote"
    in_memory_repo.seed_photo(
        PhotoRecord("p1", ride, "k1", color_id=ColorId.LONELY_BLUE, confidence=0.3, source="vlm")
    )
    in_memory_repo.seed_photo(
        PhotoRecord("p2", ride, "k2", color_id=ColorId.LONELY_BLUE, confidence=0.3, source="vlm")
    )
    in_memory_repo.seed_photo(
        PhotoRecord("p3", ride, "k3", color_id=ColorId.RELEASE_RED, confidence=0.95, source="vlm")
    )

    actors.aggregate_segment_color.send(ride)
    stub_broker.join("aggregate")
    stub_worker.join()

    agg = in_memory_repo.ride_dominant[ride]
    # 加权:lonely-blue = 0.6,release-red = 0.95 → release-red
    assert agg.dominant == ColorId.RELEASE_RED
    assert agg.votes == {ColorId.LONELY_BLUE: 2, ColorId.RELEASE_RED: 1}


def test_aggregate_skips_when_no_colored_photos(
    stub_broker, stub_worker, in_memory_repo, fake_redis, stub_cos
):
    """所有照片都还没染色 → 短路返回,不写 ride_dominant。"""
    from auraride_worker import actors

    actors.set_dependencies(
        repo=in_memory_repo,
        redis=fake_redis,
        cos=stub_cos,
    )

    ride = "ride-empty"
    in_memory_repo.seed_photo(PhotoRecord("p1", ride, "k1"))  # color_id=None

    actors.aggregate_segment_color.send(ride)
    stub_broker.join("aggregate")
    stub_worker.join()

    assert ride not in in_memory_repo.ride_dominant
