# infra/ — 服务器 / 部署 / 运维

> 这里放的不是代码,是**让 apps/* 在服务器上跑起来 / 看着它跑**的东西。

## 目录

| 子目录 | 内容 |
|---|---|
| `caddy/` | Caddyfile —— 反向代理 + 自动 HTTPS + PR preview channels |
| `systemd/` | systemd unit 模板(api / worker) |
| `scripts/` | 服务器初始化 / deploy / 备份 等脚本 |

## 关键脚本

- `scripts/init-server.sh` —— **首次** SSH 上服务器跑这个,把环境装齐(Postgres / Redis / Caddy / Go / Python / SSH 加固 / UFW / fail2ban / deploy 用户 / systemd 骨架)
- `scripts/deploy.sh` —— GH Actions 自动调用,推 binary + reload systemd(等 P1 启动时写)
- `scripts/spawn-preview.sh` —— PR 开启时调,起一个 PR preview channel(等 P1 启动时写)

## 关联文档

- [`docs/决策/ADR-003-后端技术栈.md`](../docs/决策/ADR-003-后端技术栈.md) —— 装这些组件的"为什么"
- [`docs/决策/ADR-005-后端开发工作流.md`](../docs/决策/ADR-005-后端开发工作流.md) —— server-as-CI 怎么配
- [`docs/工程/密钥管理指南.md`](../docs/工程/密钥管理指南.md) —— `/etc/auraride/api.env` 怎么填
