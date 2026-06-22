# AuraRide 🚲

情绪驱动的骑行 App。根据骑行者当下的情绪状态，匹配并生成专属路线，并在骑行中提供沉浸式的 HUD 与回顾体验。

> 初始 UI 由 [Figma Make](https://www.figma.com/make/) 导出，已补全为可独立运行的 Vite 项目。

## 技术栈

- **React 18** + **react-router 7**
- **Vite 6** + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui**
- **motion** (Framer Motion) 动效
- **MUI** / **Radix UI** / **recharts** 等

## 快速开始

```bash
# 安装依赖（项目使用 pnpm）
corepack enable pnpm   # 若未安装 pnpm
pnpm install

# 启动开发服务器
pnpm dev

# 生产构建 / 本地预览
pnpm build
pnpm preview
```

> ⚠️ 应用为**移动端优先**设计（`MobileOnly` 容器）。请在浏览器中使用移动设备视口，或开启响应式调试模式查看。

## 页面路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/`、`/emotions` | EmotionSlider | 情绪滑块（入口） |
| `/phone` | ColorCompass | 色彩罗盘 |
| `/deep-sea` | DeepSeaState | 深海情绪态 |
| `/healing` | HealingState | 疗愈情绪态 |
| `/burnout` | BurnoutState | 燃尽情绪态 |
| `/trace` | TraceState | 痕迹情绪态 |
| `/matching` | RouteMatching | 路线匹配 |
| `/generate` | RouteGeneration | 路线生成 |
| `/ride` | RidingHUD | 骑行 HUD |
| `/ride-enhanced` | EnhancedRidingHUD | 增强骑行 HUD |
| `/review` | Review | 骑行回顾 |
| `/watch` | WatchRiding | 手表骑行 |
| `/journal` | Journal | 骑行日记 |

## 目录结构（monorepo, ADR-004）

```
apps/web/                # ⭐ 当前 MVP 战场（React + Vite）
└── src/
    ├── app/
    │   ├── App.tsx          # 根组件（MobileOnly + 路由）
    │   ├── routes.tsx       # 路由表
    │   ├── pages/           # 14 个页面
    │   ├── components/      # 业务组件 + shadcn/ui 组件库
    │   ├── data/            # 静态数据
    │   ├── lib/ · utils/    # 工具函数
    ├── imports/             # Figma 导出的图片资源
    ├── styles/              # 全局样式 / 主题 / 字体
    └── main.tsx             # 应用入口

apps/{ios,api,worker}/   # ⏳ 占位（详见各目录 README）
packages/types/          # ⏳ 共享 TS 类型（等 Go API 启动）
infra/                   # 部署 / 运维（Caddy / systemd / scripts）
docs/                    # VitePress 文档站
```

> `pnpm dev` / `pnpm build` / `pnpm typecheck` 仍在 root 跑，root `package.json` 转发到 `@auraride/web`。

## 协作约定

- 任何改动走 feature 分支 + Pull Request，不直接推 `main`。
- 提交前请确保 `pnpm build` 通过。
