# ADR-006 · 部署形态切换为 Docker Compose

> **状态**: ✅ Accepted
> **日期**: 2026-06-21
> **作者**: chenzhuowen + Claude
> **Supersedes**: [`ADR-003 §3 Caddy`](./ADR-003-后端技术栈.md) · [`ADR-003 §8 部署:SSH + systemd`](./ADR-003-后端技术栈.md) · [`ADR-003 §9 架构形态`](./ADR-003-后端技术栈.md)(只是部署形态从 systemd 改为 compose,**模块化单体 + 异步 worker 的架构不变**) · [`ADR-005 § GH Actions deploy`](./ADR-005-后端开发工作流.md)
> **不动**: 语言选型(Go + Python)/ 数据库选型(Postgres + Redis 自托管)/ 反向代理(Caddy)/ 文件存储(COS)/ VLM(DashScope)/ 云宿主(腾讯轻量)/ 密钥(dotenvx)

## 背景

ADR-003 写成时选了 **systemd + apt 装 Postgres/Redis/Caddy/Go/Python**,理由是"2C4G6M 上 docker daemon 太贵"。chenzhuowen 在 06-21 提出疑问:"部署应该走 docker compose 吧?"

复审三条理由:

| 维度 | systemd 原计划 | docker compose | 谁赢 |
|---|---|---|---|
| 启动复杂度 | `bash init-server.sh`,200 行装一堆东西 | `docker compose up -d`,一行 | compose |
| 复现性 | 依赖宿主机版本,迁服务器要重新跑 init 脚本 | image tag pin 死,1 分钟拉起 | compose |
| 本地能否跑全栈 | ❌ 陈娟没有 Postgres,前端只能 mock | ✅ `docker compose up postgres redis` 就有 | compose |
| 回滚 | 重新 scp 旧 binary + systemctl restart | `docker compose up <previous-image-tag>` | compose |
| 资源开销 | ~50MB(systemd 接近 0) | ~300MB(daemon + 容器) | systemd |
| 2C4G 上残留预算 | ~3.5GB 业务可用 | ~3.2GB 业务可用 | 都够 |

**300MB 在 4GB 上是 7.5%,不致命**。换来的复现性 + 本地全栈 + 简单回滚远值这个开销。

## 决定

部署形态从"systemd + 宿主机装一堆"改为"**docker compose 一把梭**"。

```
本机(陈娟/chenzhuowen)            服务器(122.51.109.165)
  ┌──────────────────────────┐     ┌─────────────────────────────┐
  │ docker compose up        │     │ docker compose up -d        │
  │                          │     │                             │
  │ postgres + redis 起来    │     │ postgres + redis            │
  │ (可选:api + worker)     │     │ api + worker + caddy        │
  │                          │     │                             │
  │ 前端 pnpm dev 连 :8080   │     │ caddy:443 → api:8080        │
  └──────────────────────────┘     └─────────────────────────────┘
                                    ↓
                                    image 在哪里 build?
                                    答:**服务器本地 build**(无 registry)
```

## 关键设计

### 1. 不用 registry,服务器本地 build

GitHub Actions 的工作:`go build + go test` / `uv run pytest`(纯验证),验证通过 → ssh 服务器 → `git pull && docker compose build <svc> && docker compose up -d --no-deps <svc>`。

**为什么不用 registry**(虽然 registry 更"工业标准"):

- 阿里云 ACR / 腾讯 TCR 个人版免费但要绑账号 + 配凭据 + 多一层失败点
- 服务器 build Go ~1 分钟、build Python ~3 分钟,完全可接受
- **secret 不必塞进 image**:dotenvx 在服务器 decrypt → 通过 compose `environment:` 传进容器,镜像里只有代码
- 服务器只服务一个产品,无多机分发需要

未来痛了再切 registry,不是 deal-breaker。

### 2. compose 文件分两层

- **`docker-compose.yml`** —— 仓库根,所有服务的"骨架"(image / port / env / depends_on)。本机 + 服务器**同一份**。
- **`docker-compose.override.yml`** —— 服务器才有,只覆盖 production-specific 的东西(数据卷映射到 `/var/lib/auraride/`、暴露 80/443、生产域名)。本机不要这个文件 → compose 默认只用主文件 → 本机干净。

### 3. 密钥注入:dotenvx → compose interpolation

服务器上的 deploy 命令是:

```bash
cd /opt/auraride && \
  dotenvx run -f /opt/AuraRide-env/.env.production -- \
  docker compose up -d --no-deps api
```

`dotenvx run` 把解密后的 env vars 注入到当前 shell;`docker compose` 看到 `environment: { POSTGRES_URL: ${POSTGRES_URL} }` 时**用 shell 里的值替换**;容器启动后里头有真密钥。

**好处**:

- 镜像里 0 密钥
- 本机 `docker compose up` 时这些 env 是空的,api 服务用本机 postgres 默认密码,**陈娟不需要私钥也能跑全栈**
- 旋转密钥时 `dotenvx set X=... + git push` → `ssh server 'cd /opt/AuraRide-env && git pull'` → 下次 `compose up -d` 生效

### 4. 服务边界

| 服务 | image | 端口 | 数据 |
|---|---|---|---|
| `postgres` | `postgres:16-alpine` | 5432(只对内) | named volume `pg_data` |
| `redis` | `redis:7-alpine` | 6379(只对内) | named volume `redis_data` |
| `api` | 本地 build,`apps/api/Dockerfile` | 8080(只对内) | 无 |
| `worker` | 本地 build,`apps/worker/Dockerfile` | 无 | 无 |
| `caddy` | `caddy:2-alpine` | 80, 443 | named volumes `caddy_data`, `caddy_config` + bind mount `/var/www/auraride` |

**没有 nginx、没有 traefik**:caddy 就够,ADR-003 §3 已决。

### 5. 陈娟本机怎么用

她**不必**会 docker(选用):

```bash
# 路径 A:只跑前端(跟以前一样,不需要 docker)
pnpm dev
# 前端走 localRepo(localStorage),完全本机

# 路径 B:跑前端 + 真后端(本机全栈)
docker compose up -d postgres redis api worker
VITE_API_BASE_URL=http://localhost:8080 pnpm dev
# 前端走 apiRepo → 本机 docker 里的 Go API → 本机 docker 里的 Postgres
```

路径 A 是默认,**完全不破现有体感**;路径 B 是"想看真后端的样子"时她可以选,装 Docker Desktop 半小时就行。

## 不变的事

- **架构**:仍是模块化单体 + 异步 worker,api 和 worker 共享 postgres,通过 redis 队列异步通信
- **语言**:Go + Python
- **存储**:照片走 COS,不进容器卷
- **CI/CD 的精神**:GH Actions build/test → push 触发服务器 update。只是 update 方式从 `scp binary + systemctl restart` 变成 `git pull + compose build + compose up`
- **零停机非必要**:compose `up -d --no-deps` 重启服务时有 1-2 秒中断,MVP 接受

## 推翻条件

- 服务器 build 时间超过 5 分钟 → 切 GHCR/TCR/ACR registry,服务器只 pull
- 一台机器装不下了(P3+ 万级 DAU) → 拆 compose 为多机 stack 或上 k8s
- 镜像里发现 secret 泄露(走错配置) → 改用 docker secrets / Vault

## 决策日志

| 日期 | 决定 | 推翻条件 |
|---|---|---|
| 2026-06-21 | systemd → docker compose,服务器本地 build,不用 registry | 见上 |

## 关联

- [ADR-003 后端技术栈](./ADR-003-后端技术栈.md) — 语言/数据库/反代/存储选型(不变)
- [ADR-005 后端开发工作流](./ADR-005-后端开发工作流.md) — server-as-CI + apiRepo + seed(不变,只 deploy 命令换)
- [`docs/工程/密钥管理指南.md`](../工程/密钥管理指南.md) — dotenvx 怎么和 compose 配合
