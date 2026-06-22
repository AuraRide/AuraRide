#!/usr/bin/env bash
# =============================================================================
# AuraRide · 服务器侧 deploy 脚本(GH Actions 通过 ssh 调用)
# =============================================================================
# 位置:/opt/auraride/infra/scripts/deploy.sh(已在 git 仓库里,init-server clone 时一起进来)
#
# 用法(GH Actions):
#   ssh deploy@<server> '/opt/auraride/infra/scripts/deploy.sh <service>'
#
# <service> 可选:
#   api      - 重建并重启 Go API
#   worker   - 重建并重启 Python worker
#   web      - 只 git pull(rsync 由 GH Actions 单独做)
#   all      - api + worker
#
# 假设:
#   - /opt/auraride 是主仓库 clone
#   - /opt/AuraRide-env 是密钥仓库 clone,/.env.keys 已 scp 到位
#   - deploy 用户在 docker 组,可无 sudo 跑 docker compose
#   - dotenvx 已装(/usr/local/bin/dotenvx 或全局 npm)
# =============================================================================

set -euo pipefail

SERVICE="${1:-}"
if [ -z "$SERVICE" ]; then
    echo "用法:$0 <api|worker|web|all>" >&2
    exit 1
fi

REPO_DIR=/opt/auraride
ENV_DIR=/opt/AuraRide-env
ENV_FILE="$ENV_DIR/.env.production"

cd "$REPO_DIR"

# 部署分支:GitHub 上 mvp-a → main merge 后,生产从 main 拉
DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"

echo "▶ git pull 主仓库($DEPLOY_BRANCH)"
git fetch --quiet origin
git checkout "$DEPLOY_BRANCH" 2>/dev/null || true
git reset --hard "origin/$DEPLOY_BRANCH"

if [ -d "$ENV_DIR/.git" ]; then
    echo "▶ git pull env 仓库"
    git -C "$ENV_DIR" pull --ff-only --quiet 2>&1 || \
        echo "⚠ env 仓库 pull 失败(可能 PAT 过期),沿用现有 .env"
fi

# dotenvx 可选:装了 + .env.keys 在位才注入真密钥;否则用 compose 默认值
# (MVP 阶段都是 compose 默认 dev 密码,等需要真 COS / DashScope 时
# scp .env.keys + apt 装 dotenvx 即可激活)
if command -v dotenvx >/dev/null 2>&1 && [ -f "$ENV_DIR/.env.keys" ]; then
    DOTENVX_WRAP=(dotenvx run -f "$ENV_FILE" --)
    echo "▶ dotenvx detected — 注入真密钥"
else
    DOTENVX_WRAP=()
    echo "⚠ dotenvx 未装或 .env.keys 缺失 — 用 docker compose 默认值(dev 密码)"
fi

# WEB_DIST_DIR 让 caddy bind mount 指向生产 dist 路径
export WEB_DIST_DIR="${WEB_DIST_DIR:-/var/www/auraride/web}"

# compose 命令前缀,统一两个 -f
COMPOSE=(docker compose -f docker-compose.yml -f docker-compose.prod.yml)

case "$SERVICE" in
    api|worker)
        echo "▶ docker compose build $SERVICE"
        "${DOTENVX_WRAP[@]}" "${COMPOSE[@]}" build "$SERVICE"

        echo "▶ docker compose up -d --no-deps $SERVICE"
        "${DOTENVX_WRAP[@]}" "${COMPOSE[@]}" up -d --no-deps "$SERVICE"

        echo "▶ 健康检查"
        sleep 3
        if [ "$SERVICE" = "api" ]; then
            "${COMPOSE[@]}" exec -T api \
                wget -qO- http://localhost:8080/healthz \
                && echo "✅ api healthy" \
                || { echo "❌ api 不健康" >&2; exit 1; }
        else
            "${COMPOSE[@]}" ps "$SERVICE" \
                | grep -q "Up\|running" \
                && echo "✅ $SERVICE running" \
                || { echo "❌ $SERVICE 没起来" >&2; exit 1; }
        fi
        ;;

    web)
        echo "▶ web: GH Actions 已 rsync dist/ 到 /var/www/auraride/web,caddy 自动 serve,无需重启"
        ;;

    all)
        "$0" api
        "$0" worker
        ;;

    *)
        echo "未知 service: $SERVICE" >&2
        exit 1
        ;;
esac

echo "🎉 deploy $SERVICE 完成"
