"""极薄 DB 接口 —— actor 通过 ``PhotoRepo`` 协议读写,真实现用 psycopg。

测试用 ``InMemoryPhotoRepo`` 注入,完全不需要真 Postgres。
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol

from .colors import ColorId


@dataclass(slots=True)
class PhotoRecord:
    """对应 ``ride_photos`` 表的最小投影,只取染色链需要的字段。"""

    id: str
    ride_id: str
    cos_key: str
    color_id: ColorId | None = None
    confidence: float | None = None
    source: str | None = None  # "vlm" | "pillow" | "fallback"


@dataclass(slots=True)
class SegmentAggregate:
    """段聚合产物 —— 写回 ``rides`` 表的 ``dominant_color`` / ``color_votes``。"""

    ride_id: str
    dominant: ColorId
    votes: dict[ColorId, int] = field(default_factory=dict)


class PhotoRepo(Protocol):
    def get_photo(self, photo_id: str) -> PhotoRecord | None: ...
    def update_photo_color(
        self,
        photo_id: str,
        *,
        color_id: ColorId,
        confidence: float,
        source: str,
    ) -> None: ...
    def list_ride_photos(self, ride_id: str) -> list[PhotoRecord]: ...
    def update_ride_dominant(self, agg: SegmentAggregate) -> None: ...


class InMemoryPhotoRepo:
    """测试夹具 —— 一切都在 dict 里,断言用 ``.photos[pid].color_id``。"""

    def __init__(self) -> None:
        self.photos: dict[str, PhotoRecord] = {}
        self.ride_dominant: dict[str, SegmentAggregate] = {}

    # 写入方便测试时构造场景
    def seed_photo(self, record: PhotoRecord) -> None:
        self.photos[record.id] = record

    # --- PhotoRepo 协议 ---
    def get_photo(self, photo_id: str) -> PhotoRecord | None:
        return self.photos.get(photo_id)

    def update_photo_color(
        self,
        photo_id: str,
        *,
        color_id: ColorId,
        confidence: float,
        source: str,
    ) -> None:
        existing = self.photos.get(photo_id)
        if existing is None:
            raise KeyError(photo_id)
        self.photos[photo_id] = PhotoRecord(
            id=existing.id,
            ride_id=existing.ride_id,
            cos_key=existing.cos_key,
            color_id=color_id,
            confidence=confidence,
            source=source,
        )

    def list_ride_photos(self, ride_id: str) -> list[PhotoRecord]:
        return [p for p in self.photos.values() if p.ride_id == ride_id]

    def update_ride_dominant(self, agg: SegmentAggregate) -> None:
        self.ride_dominant[agg.ride_id] = agg


def build_repo() -> PhotoRepo:
    """生产:psycopg 真实现。

    TODO(post-mvp): 接 ``psycopg.connect(settings.postgres_url)`` + 写 SQL;
    现在 MVP 阶段 actor 启动走 ``InMemoryPhotoRepo`` 兜底,等 Postgres schema
    随 Go API 落地后再切。
    """
    raise NotImplementedError(
        "TODO(post-mvp): 等 apps/api 的 0001_init.up.sql 落到生产 Postgres 后再实现"
    )
