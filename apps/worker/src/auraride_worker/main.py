"""Worker 启动入口 —— ``uv run python -m auraride_worker.main``。

实际生产由 ``dramatiq auraride_worker.main`` 调起(systemd unit 见 deploy/);
本模块负责:
1. 初始化日志 + broker
2. 构造真实依赖(COS / Redis / DashScope / Postgres)
3. 调 ``set_dependencies(...)`` 注入

测试**不会**走到这里 —— 它们直接 import ``actors`` + 注入 stub。
"""

from __future__ import annotations

import sys

import redis as redis_lib

from .broker import init_broker
from .config import get_settings
from .logging_setup import configure_logging, get_logger


def bootstrap() -> None:
    configure_logging()
    log = get_logger(__name__)
    settings = get_settings()

    log.info(
        "worker_bootstrap",
        redis_url=settings.redis_url.split("@")[-1],  # 不打 password
        has_vlm_key=settings.has_vlm_key,
        cos_bucket=settings.cos_bucket,
    )

    init_broker()

    # 真依赖装配 —— 当前阶段允许 graceful skip,等 Postgres / 真 key 就位再切
    try:
        from .actors import set_dependencies
        from .cos_client import build_cos_client
        from .db import build_repo
        from .vlm_client import DashScopeAdapter

        redis_client = redis_lib.Redis.from_url(settings.redis_url)
        cos = build_cos_client()
        repo = build_repo()
        dashscope = DashScopeAdapter(settings.dashscope_api_key) if settings.has_vlm_key else None

        set_dependencies(repo=repo, redis=redis_client, cos=cos, dashscope=dashscope)
        log.info("worker_dependencies_ready")
    except NotImplementedError as exc:
        # TODO(post-mvp): 等 Postgres schema / DashScope key 就位后这里不再触发
        log.error("worker_dependencies_incomplete", reason=str(exc))
        sys.exit(1)


if __name__ == "__main__":
    bootstrap()
