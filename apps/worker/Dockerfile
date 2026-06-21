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

# 镜像加速:清华 pypi
ENV UV_INDEX_URL=https://pypi.tuna.tsinghua.edu.cn/simple

# COPY 所有源码 + 配置(包括 src,这样 editable install 能正确指向 src/auraride_worker)
# 牺牲一点 layer 缓存(src 变了 deps 会重装),换 editable install 正确性
COPY pyproject.toml uv.lock README.md ./
COPY src ./src

# 装 deps + editable install 本地包(--no-dev 跳过 pytest/ruff)
RUN uv sync --frozen --no-dev

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
