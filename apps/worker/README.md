# apps/worker/ — Python 异步 Worker(VLM 染色 + 段聚合)

AuraRide 的异步 worker:把上传到 COS 的骑行照片喂给阿里 DashScope 通义千问 VL,
得到 5 选 1 的 `ColorId`(`calm-green` / `lonely-blue` / `explore-yellow` / `release-red` / `tired-gray`),
写回 Postgres,再按段(ride)聚合出 `dominant_color`。

详见 [ADR-003 §5 VLM](../../docs/决策/ADR-003-后端技术栈.md) +
[ADR-005 后端开发工作流](../../docs/决策/ADR-005-后端开发工作流.md) +
[一切皆颜色 §3-4 染色与降级](../../docs/产品/一切皆颜色.md)。

## 快速上手

```bash
cd apps/worker

# 1) 安装依赖(首次,uv 自己装 Python 3.12)
uv sync
#   ↑ 国内慢就加 --index-url https://pypi.tuna.tsinghua.edu.cn/simple

# 2) 跑测试 —— 6 个,全不依赖真 Redis/Postgres/DashScope
uv run pytest

# 3) lint
uv run ruff check .

# 4) 本地起 worker(需要真 Redis + 至少 InMemoryPhotoRepo 兜底)
#    现在还跑不起来,等 Postgres schema 落地后 db.build_repo() 接通
uv run dramatiq auraride_worker.main --processes 1 --threads 4 --queues colorize aggregate
```

## 模块速查

| 文件 | 责任 |
| --- | --- |
| `src/auraride_worker/config.py` | pydantic-settings,所有 env 集中读 |
| `src/auraride_worker/colors.py` | **ColorId 真相源镜像** —— 与前端 `moodColor.ts` 逐字对齐 |
| `src/auraride_worker/prompts.py` | VLM 染色 prompt(JSON 输出 + 5 色白名单内联) |
| `src/auraride_worker/vlm_client.py` | DashScope 适配器 + **6 级优雅降级链** |
| `src/auraride_worker/budget.py` | Redis 当日预算闸门(¥20/天,超额抛 + 回滚) |
| `src/auraride_worker/actors.py` | 2 个 dramatiq actor:`colorize_photo` + `aggregate_segment_color` |
| `src/auraride_worker/db.py` | `PhotoRepo` 协议 + `InMemoryPhotoRepo` 测试实现 |
| `src/auraride_worker/cos_client.py` | COS 读对象(真 SDK 延迟 import) |
| `src/auraride_worker/broker.py` | dramatiq broker(生产 Redis / 测试 Stub) |
| `src/auraride_worker/main.py` | 进程入口,装配真实依赖后由 dramatiq 启动 |
| `deploy/auraride-worker.service` | systemd unit(MemoryMax 600M / CPUQuota 120%) |

## 降级链(必读)

`vlm_client.colorize(...)` 内部按顺序失败:

1. 没配 `DASHSCOPE_API_KEY` → Pillow 平均色
2. 当日 ¥20 预算耗尽 → Pillow 平均色
3. DashScope API 抛异常 → Pillow 平均色
4. 返回非 JSON → Pillow 平均色
5. `color_id` 不在 5 个白名单 → Pillow 平均色
6. Pillow 也炸(图损坏) → `tired-gray` 兜底

**绝不抛到 actor 外**,确保 manifesto "总能给出一种颜色" 不变量。

## 后续 TODO

- `db.build_repo()`:等 `apps/api` 的 `0001_init.up.sql` 落到生产 Postgres 后接 psycopg
- `cos_client.build_cos_client()`:实测 `qcloud_cos.CosS3Client` 端到端读取(密钥已 set 在 AuraRide-env)
- 端到端 dry run:Redis + COS + DashScope 三家都通后,造 5 张测试图跑完整链路
- 预算日报:Redis key `vlm:cost:YYYY-MM-DD` 留 48h,可加 cron 每天 push 到群

## chenzhuowen 醒来后要做的

1. 在 `~/Code/AuraRide-env/.env.production` 设 `DASHSCOPE_API_KEY=sk-...`(从 https://dashscope.console.aliyun.com 申请,~5 分钟,免费额度够 MVP)
2. `dotenvx encrypt` + commit + push
3. 等 `apps/api` 那边的 Postgres schema 上服务器后,实现 `db.build_repo()` + 删掉 `NotImplementedError`
4. 服务器 `cp apps/worker/deploy/auraride-worker.service /etc/systemd/system/` + `systemctl enable --now auraride-worker`
