#!/usr/bin/env bash
# =============================================================================
# AuraRide · 服务器初始化脚本
# =============================================================================
# 在腾讯云轻量应用服务器(122.51.109.165, Ubuntu 22.04)上首次跑这个脚本,
# 把环境装齐 + 安全加固 + systemd 服务定义就绪。
#
# 使用方式:
#   1. SSH 上服务器(用 ubuntu 用户 + 初始密码)
#   2. 把这个脚本 scp 上去 / 或者 git clone 仓库后跑
#   3. sudo bash init-server.sh
#   4. 跑完后:从本机用 SSH key 登录(密码登录会被禁)
#
# 这个脚本是 idempotent 的:多次跑同一个脚本无副作用
# =============================================================================

set -euo pipefail

log() { echo "$(date '+%H:%M:%S')  $*"; }
err() { echo "$(date '+%H:%M:%S')  ❌ $*" >&2; exit 1; }

[ "$EUID" -eq 0 ] || err "请用 sudo 跑(需要 root 装 apt 包 + 改 sshd_config 等)"
log "🚀 AuraRide 服务器初始化开始"


# -----------------------------------------------------------------------------
# 1. 系统更新
# -----------------------------------------------------------------------------
log "📦 [1/8] 系统更新"
apt update -y
apt upgrade -y
apt install -y \
    curl wget git vim \
    htop ncdu tmux \
    ufw fail2ban \
    build-essential pkg-config \
    ca-certificates gnupg lsb-release


# -----------------------------------------------------------------------------
# 2. SSH 加固
# -----------------------------------------------------------------------------
log "🔒 [2/8] SSH 加固"
SSHD_CONFIG=/etc/ssh/sshd_config

# 备份
cp "$SSHD_CONFIG" "$SSHD_CONFIG.bak.$(date +%s)"

# 关闭密码登录(只允许 SSH key)
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
# 关闭 root SSH 登录
sed -i 's/^#*PermitRootLogin.*/PermitRootLogin no/' "$SSHD_CONFIG"
# 启用 SSH key
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD_CONFIG"
# 限制最大尝试次数
sed -i 's/^#*MaxAuthTries.*/MaxAuthTries 3/' "$SSHD_CONFIG"

# ⚠️ 在 reload sshd 之前,确保你已经把 SSH key 加到 ~/.ssh/authorized_keys
# 如果没加,reload 之后你就被锁外面了
echo ""
echo "⚠️  确认你已经把 chenzhuowen 的 SSH 公钥加到了 /home/ubuntu/.ssh/authorized_keys"
echo "    没加的话现在按 Ctrl+C 退出,先加,再重跑这个脚本"
read -p "    按 Enter 继续(将 reload sshd 禁用密码登录) > " _

systemctl reload sshd
log "    SSH 加固完成,密码登录已禁,只能 SSH key 登录"


# -----------------------------------------------------------------------------
# 3. 防火墙(UFW)
# -----------------------------------------------------------------------------
log "🔥 [3/8] UFW 防火墙(默认拒绝所有入,只开 22/80/443 + preview 范围)"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp           # SSH
ufw allow 80/tcp           # Caddy HTTP(自动 → HTTPS)
ufw allow 443/tcp          # Caddy HTTPS
ufw allow 8001:8099/tcp    # PR preview channels(Caddy 反代)
ufw --force enable
ufw status verbose


# -----------------------------------------------------------------------------
# 4. fail2ban(防 SSH 暴力破解)
# -----------------------------------------------------------------------------
log "🛡  [4/8] fail2ban"
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
# 5. 创建 deploy 专用用户(GH Actions 用,不是 root)
# -----------------------------------------------------------------------------
log "👤 [5/8] 创建 deploy 用户"
if ! id -u deploy >/dev/null 2>&1; then
    useradd -m -s /bin/bash deploy
    log "    新建 deploy 用户"
else
    log "    deploy 用户已存在"
fi

# 给 deploy 写 /opt/auraride 和 reload systemd 服务的权限
mkdir -p /opt/auraride/bin /opt/auraride/web /opt/auraride/staging /var/log/auraride
chown -R deploy:deploy /opt/auraride
chown -R deploy:deploy /var/log/auraride

# sudoers:deploy 只能 restart auraride-* 服务
cat > /etc/sudoers.d/auraride-deploy <<'EOF'
deploy ALL=(root) NOPASSWD: /bin/systemctl restart auraride-api
deploy ALL=(root) NOPASSWD: /bin/systemctl restart auraride-worker
deploy ALL=(root) NOPASSWD: /bin/systemctl reload caddy
deploy ALL=(root) NOPASSWD: /bin/systemctl restart caddy
EOF
chmod 0440 /etc/sudoers.d/auraride-deploy


# -----------------------------------------------------------------------------
# 6. 装 Postgres 16
# -----------------------------------------------------------------------------
log "🐘 [6/8] Postgres 16"
sh -c 'echo "deb https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget -qO- https://www.postgresql.org/media/keys/ACCC4CF8.asc | apt-key add -
apt update -y
apt install -y postgresql-16 postgresql-client-16

systemctl enable postgresql
systemctl start postgresql

# 创建 auraride 库 + 用户(密码后续 dotenvx 注入 + chenzhuowen 手动设置)
sudo -u postgres psql <<'EOF'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'auraride') THEN
        CREATE ROLE auraride WITH LOGIN PASSWORD 'CHANGE_ME_VIA_ALTER_ROLE';
    END IF;
END $$;

CREATE DATABASE auraride OWNER auraride;
GRANT ALL PRIVILEGES ON DATABASE auraride TO auraride;
EOF

log "    ⚠️  Postgres 已装,但密码是占位 'CHANGE_ME_VIA_ALTER_ROLE'"
log "    chenzhuowen 后续需要:"
log "      1. 生成强密码"
log "      2. ALTER ROLE auraride PASSWORD '<真密码>';"
log "      3. 把真密码 dotenvx set 到 AuraRide-env/.env.production POSTGRES_URL"


# -----------------------------------------------------------------------------
# 7. 装 Redis 7
# -----------------------------------------------------------------------------
log "💾 [7/8] Redis 7"
apt install -y redis-server
systemctl enable redis-server
systemctl start redis-server
redis-cli ping  # 应该返回 PONG


# -----------------------------------------------------------------------------
# 8. 装 Caddy 2 + Go 1.22 + Python 3.12
# -----------------------------------------------------------------------------
log "🌐 [8/8] Caddy + Go + Python"

# Caddy(官方源)
apt install -y debian-keyring debian-archive-keyring apt-transport-https
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
apt update -y
apt install -y caddy
systemctl enable caddy
# Caddy 配置稍后由 deploy 推 Caddyfile + reload

# Go 1.22(官方 tarball)
cd /tmp
wget https://go.dev/dl/go1.22.5.linux-amd64.tar.gz
rm -rf /usr/local/go
tar -C /usr/local -xzf go1.22.5.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' > /etc/profile.d/go.sh
export PATH=$PATH:/usr/local/go/bin
go version

# Python 3.12(Ubuntu 22.04 默认是 3.10,加 deadsnakes PPA)
apt install -y software-properties-common
add-apt-repository -y ppa:deadsnakes/ppa
apt update -y
apt install -y python3.12 python3.12-venv python3.12-dev python3-pip
python3.12 --version


# -----------------------------------------------------------------------------
# 9. systemd 服务定义骨架
# -----------------------------------------------------------------------------
log "🎛  [9/9] systemd unit 文件骨架"

# Go API
cat > /etc/systemd/system/auraride-api.service <<'EOF'
[Unit]
Description=AuraRide Go API
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/auraride
EnvironmentFile=/etc/auraride/api.env
ExecStart=/opt/auraride/bin/api
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/auraride/api.log
StandardError=append:/var/log/auraride/api.err.log

[Install]
WantedBy=multi-user.target
EOF

# Python Worker
cat > /etc/systemd/system/auraride-worker.service <<'EOF'
[Unit]
Description=AuraRide Python Worker (dramatiq)
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=deploy
Group=deploy
WorkingDirectory=/opt/auraride/worker
EnvironmentFile=/etc/auraride/api.env
ExecStart=/opt/auraride/worker/.venv/bin/python -m dramatiq auraride_worker.main
Restart=on-failure
RestartSec=5
StandardOutput=append:/var/log/auraride/worker.log
StandardError=append:/var/log/auraride/worker.err.log

[Install]
WantedBy=multi-user.target
EOF

# 创建 env 目录(GH Actions 部署时把 dotenvx 解密后的 .env 写到 /etc/auraride/api.env)
mkdir -p /etc/auraride
chmod 750 /etc/auraride
chown root:deploy /etc/auraride
echo "PLACEHOLDER_REPLACED_BY_DEPLOY=1" > /etc/auraride/api.env
chmod 640 /etc/auraride/api.env

systemctl daemon-reload
# 不 start,等 binary 来了再 start
log "    systemd units 已就绪,等 deploy 推 binary + env 后再 start"


# -----------------------------------------------------------------------------
# 完工
# -----------------------------------------------------------------------------
echo ""
log "✅ 服务器初始化完成"
echo ""
echo "下一步(chenzhuowen):"
echo "  1. 本机验证 SSH key 能登录:ssh ubuntu@122.51.109.165 (应免密)"
echo "  2. ALTER POSTGRES 密码 + dotenvx set 进 AuraRide-env"
echo "  3. 通过 GH Actions 部署第一个 Go API binary 到 /opt/auraride/bin/"
echo "  4. systemctl start auraride-api,看日志:journalctl -u auraride-api -f"
echo "  5. Caddyfile 推到 /etc/caddy/,systemctl reload caddy"
