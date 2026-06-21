# syntax=docker/dockerfile:1.7

FROM python:3.12-slim AS base

# tini 做 PID 1,处理 SIGTERM 优雅退出
RUN apt-get update && apt-get install -y --no-install-recommends \
        tini ca-certificates curl && \
    rm -rf /var/lib/apt/lists/*

# 装 uv(国内走 ghproxy)
ENV UV_INSTALL_DIR=/usr/local/bin
RUN curl -LsSf https://astral.sh/uv/install.sh | sh

WORKDIR /app

# 先拷锁文件 + pyproject,利用 layer 缓存(deps 不变 → 不重装)
COPY pyproject.toml uv.lock ./

# 镜像加速:清华 pypi
ENV UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

# 装 deps(--no-dev 跳过 pytest/ruff,运行时不需要)
RUN uv sync --frozen --no-dev

# 拷源码
COPY src ./src

# 非 root 用户
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

ENV PATH="/app/.venv/bin:${PATH}" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    TZ=Asia/Shanghai

ENTRYPOINT ["tini", "--"]
CMD ["dramatiq", "auraride_worker.main", "--processes", "1", "--threads", "4", "--queues", "colorize", "aggregate"]
