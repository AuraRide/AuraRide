# apps/api/ — AuraRide Go HTTP API

Go 1.22+ · gin · Postgres 16 · Redis 7 · 腾讯云 COS。详见 [docs/决策/ADR-003](../../docs/决策/ADR-003-后端技术栈.md) / [ADR-005](../../docs/决策/ADR-005-后端开发工作流.md)。

## Quickstart

```bash
# 一次性:中国镜像加速 go get
export GOPROXY=https://goproxy.cn,direct
export GOSUMDB=off

# 编译 + 跑测试(不需要 Postgres / Redis / COS)
make test-race      # 或 go test ./... -race -count=1
make build          # → bin/api

# 真跑(需要 Postgres + Redis,以及 dotenvx 注入的 .env)
make run            # go run ./cmd/api
```

## Endpoints (11 个,见 [plan §5](/Users/chenzhuowen/.claude/plans/ws2-go-api-plan.md))

| 方法     | 路径                              | 说明                                  |
| -------- | --------------------------------- | ------------------------------------- |
| `GET`    | `/healthz` `/readyz`              | 探活                                  |
| `GET`    | `/api/rides`                      | 当前用户的全部 ride(含 photos)       |
| `GET`    | `/api/rides/:id`                  | 单条 ride                             |
| `POST`   | `/api/rides`                      | 保存/更新一条 ride                    |
| `DELETE` | `/api/rides/:id`                  | 删除                                  |
| `PUT`    | `/api/rides`                      | replaceAll 用,事务覆盖整个列表       |
| `GET`    | `/api/me`                         | 当前 PublicUser                       |
| `POST`   | `/api/posts`                      | 把某条 ride 发布到广场                |
| `GET`    | `/api/posts/published/:rideId`    | 该 ride 是否已发布                    |
| `GET`    | `/api/posts`                      | feed,可选 `?colorId=&city=&sort=hot` |
| `GET`    | `/api/posts/:id`                  | 单条 post                             |
| `POST`   | `/api/posts/:id/like`             | 点赞/取消点赞,返回最新 PostJSON      |
| `POST`   | `/api/photos/sts`                 | 三段式上传 step 1:拿 COS PUT URL    |
| `POST`   | `/api/photos/commit`              | step 3:入库 + LPUSH VLM job         |

**JSON shape 与前端 `apps/web/src/app/lib/rideRepo.ts` + `journal.ts` 严格 1:1**——前端可零改动切换 repo。

## 环境变量

| 变量                | 必需 | 默认                          | 说明                              |
| ------------------- | ---- | ----------------------------- | --------------------------------- |
| `ENV`               | ❌   | `development`                 | `production` 时鉴权变严           |
| `PORT`              | ❌   | `8080`                        |                                   |
| `POSTGRES_URL`      | ✅   | localhost dev URL             | `postgres://user:pass@host/db?…`  |
| `REDIS_URL`         | ✅   | `redis://localhost:6379/0`    |                                   |
| `JWT_SECRET`        | ✅   | `dev-secret-change-me`        | 生产必须改                        |
| `COS_SECRET_ID/KEY` | ✅   | —                             | 子账号 auraride-claude            |
| `COS_BUCKET`        | ❌   | `auraride-photos-1315627382`  |                                   |
| `COS_REGION`        | ❌   | `ap-shanghai`                 |                                   |
| `DASHSCOPE_API_KEY` | ❌   | —                             | Python worker 用,Go 只透传        |
| `SEED_ENABLED`      | ❌   | `false`                       | 首次启动 seed 6 users + 5 rides   |

所有变量在 [`AuraRide-env/`](../../docs/工程/密钥管理指南.md) 私有仓库登记。**严禁**把明文写入本仓库。

## Migrations

`internal/migrations/*.sql` 通过 `//go:embed` 打进二进制,启动时 `golang-migrate` 自动 `Up()`。零脚本,零手动。

## Tests

无须 Postgres/Redis/COS。`internal/handlers/stub_test.go` 实现 `handlers.Querier` 内存 stub,21 个 test 全跑 `<1s`。

```bash
go test ./... -count=1 -race
```

## 部署 (后续 WS)

GH Actions → SSH → `systemctl restart auraride-api`。systemd unit 从 `/etc/auraride/api.env` 读 env(不动 binary)。
