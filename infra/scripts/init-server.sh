#!/usr/bin/env bash
# =============================================================================
# AuraRide · 服务器初始化脚本(compose 化版本 / ADR-006)
# =============================================================================
# 在腾讯云轻量服务器(122.51.109.165, Ubuntu 22.04)上首次跑这个脚本,
# 把环境装齐:
#   1. SSH 加固(关密码登录,只允许 key)
#   2. 防火墙 UFW
#   3. fail2ban
#   4. deploy 用户
#   5. Docker + Compose Plugin
#   6. clone 主仓库 + AuraRide-env 仓库
#   7. 创建数据卷宿主目录 /var/lib/auraride/{postgres,redis} + /var/www/auraride
#
# 使用方式:
#   1. SSH 上服务器(用 ubuntu 用户 + 初始密码)
#   2. 把这个脚本 scp 上去:
#        scp infra/scripts/init-server.sh ubuntu@122.51.109.165:/tmp/
#   3. sudo bash /tmp/init-server.sh
#   4. 跑完后:从本机用 SSH key 登录(密码登录会被禁)
#
# Idempotent:多次跑同一个脚本无副作用。
# =============================================================================

set -euo pipefail

log() { echo "$(date '+%H:%M:%S')  $*"; }
err() { echo "$(date '+%H:%M:%S')  ❌ $*" >&2; exit 1; }

[ "$EUID" -eq 0 ] || err "请用 sudo 跑(需要 root 装 docker + 改 sshd_config)"
log "🚀 AuraRide 服务器初始化(docker compose 版)开始"


# -----------------------------------------------------------------------------
# 1. 系统更新 + 基础工具
# -----------------------------------------------------------------------------
log "📦 [1/7] 系统更新 + 基础工具"
apt update -y
apt upgrade -y
apt install -y \
    curl wget git vim \
    htop ncdu tmux \
    ufw fail2ban \
    ca-certificates gnupg lsb-release


# -----------------------------------------------------------------------------
# 2. SSH 加固
# -----------------------------------------------------------------------------
log "🔒 [2/7] SSH 加固"
SSHD_CONFIG=/etc/ssh/sshd_config
cp "$SSHD_CONFIG" "$SSHD_CONFIG.bak.$(date +%s)"
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD_CONFIG"
sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' "$SSHD_CONFIG"

echo ""
echo "⚠️  确认你已经把 chenzhuowen 的 SSH 公钥加到了 /home/ubuntu/.ssh/authorized_keys"
echo "    没加的话现在按 Ctrl+C 退出,先加,再重跑这个脚本"
read -p "    按 Enter 继续(将 reload sshd 禁用密码登录) > " _

systemctl reload sshd
log "    SSH 加固完成"


# -----------------------------------------------------------------------------
# 3. UFW 防火墙
# -----------------------------------------------------------------------------
log "🔥 [3/7] UFW 防火墙(默认拒,只开 22/80/443 + preview 端口段)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 8001:8099/tcp    # PR preview channels(将来用)
ufw --force enable
ufw status verbose


# -----------------------------------------------------------------------------
# 4. fail2ban
# -----------------------------------------------------------------------------
log "🛡  [4/7] fail2ban"
cat > /etc/fail2ban/jail.local <<'EOF'
[sshd]
enabled = true
port = ssh
maxretry = 3
findtime = 5m
bantime = 1h
EOF
systemctl enable fail2ban
systemctl restart fail2ban


# -----------------------------------------------------------------------------
# 5. deploy 用户(GH Actions 用,不是 root)
# -----------------------------------------------------------------------------
log "👤 [5/7] 创建 deploy 用户"
if ! id -u deploy >/dev/null 2>&1; then
    useradd -m -s /bin/bash deploy
    log "    新建 deploy 用户"
else
    log "    deploy 用户已存在"
fi

# deploy 用户拥有应用代码目录 + 数据目录
mkdir -p /opt/auraride /var/lib/auraride/postgres /var/lib/auraride/redis \
         /var/www/auraride/web /var/www/auraride/staging /var/log/caddy
chown -R deploy:deploy /opt/auraride /var/www/auraride
# postgres / redis 容器以容器内 root 跑(image 默认),宿主路径不需要 chown deploy

# deploy 加入 docker 组,可以无 sudo 跑 docker compose
# (docker 装完之后这一行才真生效;先建一遍组以防万一)
groupadd -f docker
usermod -aG docker deploy

# sudoers:deploy 只能 reload sshd(将来若有需要可加)
# 跑 docker 不需要 sudo,因为已 in docker group


# -----------------------------------------------------------------------------
# 6. Docker CE + Compose Plugin(腾讯云 mirror 加速)
# -----------------------------------------------------------------------------
log "🐳 [6/7] Docker CE + Compose Plugin"

if ! command -v docker >/dev/null 2>&1; then
    # 用阿里云 docker apt mirror(腾讯也有,二选一)
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg | \
        gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
        https://mirrors.aliyun.com/docker-ce/linux/ubuntu $(lsb_release -cs) stable" \
        > /etc/apt/sources.list.d/docker.list

    apt update -y
    apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

    # daemon.json:走腾讯云 docker registry mirror,加速 pull
    mkdir -p /etc/docker
    cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://mirror.ccs.tencentyun.com",
    "https://docker.m.daocloud.io"
  ],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF

    systemctl enable docker
    systemctl restart docker
    log "    Docker 装好"
else
    log "    Docker 已存在,跳过装包"
fi

docker --version
docker compose version


# -----------------------------------------------------------------------------
# 7. Clone 仓库(应用代码 + 加密 env 仓库)
# -----------------------------------------------------------------------------
log "📥 [7/7] Clone 仓库到 /opt/auraride 和 /opt/AuraRide-env"

# 用 deploy 身份 clone
# 主仓库公开,直接 https clone;env 仓库私有,需 deploy 用户配 SSH key 或临时 PAT
if [ ! -d /opt/auraride/.git ]; then
    sudo -u deploy git clone https://github.com/AuraRide/AuraRide.git /opt/auraride
    log "    主仓库 clone 完成"
else
    log "    主仓库已存在,git pull"
    sudo -u deploy git -C /opt/auraride pull --ff-only
fi

if [ ! -d /opt/AuraRide-env/.git ]; then
    echo ""
    echo "⚠️  /opt/AuraRide-env 需要从私有仓库 AuraRide/AuraRide-env clone"
    echo "    选项 A(推荐):配 deploy 用户的 SSH key 到 GitHub Deploy Key"
    echo "    选项 B:使用 GH PAT(临时):"
    echo "      sudo -u deploy git clone https://<PAT>@github.com/AuraRide/AuraRide-env.git /opt/AuraRide-env"
    echo "    跑完手动 clone 之后,再 dotenvx set 私钥到 /opt/AuraRide-env/.env.keys"
else
    log "    env 仓库已存在,git pull"
    sudo -u deploy git -C /opt/AuraRide-env pull --ff-only
fi


# -----------------------------------------------------------------------------
# 完工
# -----------------------------------------------------------------------------
echo ""
log "✅ 服务器初始化完成"
echo ""
echo "下一步(chenzhuowen):"
echo "  1. 本机验证 SSH key 能登录:ssh ubuntu@122.51.109.165(应免密)"
echo "  2. 如 /opt/AuraRide-env 还没 clone,手动 clone(见 [7/7] 提示)"
echo "  3. 装 dotenvx 到服务器(node + npm + npm i -g @dotenvx/dotenvx),或者用 binary install"
echo "  4. 把 .env.keys 私钥放到 /opt/AuraRide-env/.env.keys(scp / 手贴)"
echo "  5. 第一次启动:"
echo "       cd /opt/auraride && \\"
echo "         dotenvx run -f /opt/AuraRide-env/.env.production -- \\"
echo "         docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d"
echo "  6. 之后 GH Actions deploy 会自动 git pull + compose build + compose up -d"
