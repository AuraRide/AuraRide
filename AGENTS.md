# AGENTS.md — AuraRide

> 本文件是 **目录(table of contents)**,不是百科。它把 agent 引向真相源,并固化少量"黄金法则"。
> 详细信息请跳转到对应的真相源文件,**不要在此重复**。

AuraRide 是一个**情绪驱动的骑行 App**(移动端优先的前端项目)。

## 🧭 真相源(System of Record) — 先读这些

> **先读顺序**:产品哲学(为什么) → 产品骨架(怎么落) → PRD(工期) → 技术栈(怎么搭)。
> 写代码前**至少**扫一遍前两份,否则容易做出"逻辑漂亮但和 manifesto 不一致"的方案。

| 主题 | 真相源 | 说明 |
| --- | --- | --- |
| **产品哲学(manifesto)** | [`docs/一切皆颜色.md`](./docs/产品/一切皆颜色.md) | **AuraRide 的"为什么"。`ColorId`、分类器、聚合、工程不变量。任何特性要先能映射到一种颜色或颜色聚合,否则停下来 challenge** |
| 产品骨架 / 信息架构 / 页面全集 | [`docs/产品骨架-信息架构.md`](./docs/产品/产品骨架-信息架构.md) | 页面、跨页功能、数据模型、色彩聚合算法 §5 |
| 产品需求 / 工期 / 比赛节奏 | [`docs/PRD.md`](./docs/产品/PRD.md) | §0 是比赛章程解读,§6 是 6 项关键决策,§10 是路线图 |
| 作品说明文档(参赛初赛交付物) | [`docs/作品说明文档-初稿.md`](./docs/比赛/作品说明文档-初稿.md) | 5 节官方模板;改产品定位时记得同步 |
| 社交化 / 后端契约 | [`docs/社交化-开发任务拆分.md`](./docs/工程/社交化-开发任务拆分.md) | `RideRepo` 接口,前端零改动换后端 |
| 技术栈 / 路由表 / 目录结构 | [`README.md`](./README.md) | 页面列表、运行命令 |
| 设计系统 / UI 规则 | [`guidelines/Guidelines.md`](./guidelines/Guidelines.md) | 视觉、布局、组件使用 |
| 主题 token | [`apps/web/default_shadcn_theme.css`](./apps/web/default_shadcn_theme.css) · `apps/web/src/styles/` | 颜色/圆角/间距等设计变量 |
| 构建配置 | `apps/web/vite.config.ts` · `apps/web/tsconfig.json` | 路径别名、插件、资源类型 |
| 仓库特有子代理 | [`.claude/agents/`](./.claude/agents/) | manifesto 守卫、设计页面审视等仓库定制 agent |
| mvp-a 阶段路线图 / ADR | [`docs/ROADMAP-mvp-a.md`](./docs/工程/ROADMAP-mvp-a.md) · [`docs/ADR-*`](./docs/) | 当前分支做什么、不做什么、关键决策的记录 |
| **密钥管理(单一真相源 = AuraRide-env)** | [`docs/工程/密钥管理指南.md`](./docs/工程/密钥管理指南.md) | **任何 env 引用必读**。规则:写 `process.env.X` / `import.meta.env.X` 前先在 `../AuraRide-env/` 登记 |

修改某主题前,先读它的真相源;新增持久知识时,写进真相源并在此加一行指针,**不要把内容堆进本文件**。

## ⭐ 黄金法则(Golden Rules) — 机械、强制

1. **包管理器只用 `pnpm`**。仓库有 `pnpm-lock.yaml` 与 `pnpm-workspace.yaml`(workspace = `apps/* + packages/*`);禁止 `npm` / `yarn`,否则会破坏 lockfile。
2. **路径别名用 `@/*` → `apps/web/src/*`**。新增别名必须同时改 `apps/web/vite.config.ts` 和 `apps/web/tsconfig.json`(两处必须镜像)。
3. **移动端优先**。所有页面经 `apps/web/src/app/components/MobileOnly.tsx` 容器渲染;按移动视口设计与验证,不要做桌面端布局。
4. **优先复用,不要手搓**。UI 组件在 `apps/web/src/app/components/ui/`(shadcn/ui),业务组件在 `apps/web/src/app/components/`。先找现成的再考虑新建——把不变量集中,别散落重复实现。
5. **新增页面 = 两处登记**:在 `apps/web/src/app/pages/` 新建组件,并在 `apps/web/src/app/routes.tsx` 注册路由。两者必须一致。
6. **别动构建底座**:不要移除 `apps/web/vite.config.ts` 里的 `react()` / `tailwindcss()` 插件;不要往 `assetsInclude` 加 `.css` / `.ts` / `.tsx`。
7. **不要 YOLO 猜数据形状**。静态数据在 `apps/web/src/app/data/`;依赖类型定义,缺类型先补类型,别基于猜测的字段往下写。
8. **颜色契约(manifesto 衍生)**:`ColorId` 枚举与 [`docs/一切皆颜色.md`](./docs/产品/一切皆颜色.md) §1 色卡表**逐字镜像**。新增/改名/改 hex,**先改 manifesto,再改 [`apps/web/src/app/lib/moodColor.ts`](./apps/web/src/app/lib/moodColor.ts),再补穷尽匹配的 switch**。任何"把多模态输入压扁成颜色"的能力,写到 `apps/web/src/app/lib/colorEngines/<name>.ts` 并实现 `ColorClassifier<T>` 统一签名——禁止在页面里 if/switch 临时染色。
9. **改产品定位前先读 manifesto §7 工程不变量**。新特性如果不能映射到"颜色"这条主线(或暂时无法,等明显的扩展槽),先在 PR 描述里 challenge manifesto 而不是绕过。
10. **密钥单一真相源 = `../AuraRide-env/`**(私有仓库 `AuraRide/AuraRide-env`,与本仓库同级 clone)。任何写 `import.meta.env.X` / `process.env.X` / `os.Getenv("X")` 的代码,**X 必须先在 `../AuraRide-env/.env.production`(后端真密钥)或 `../AuraRide-env/.env.public`(前端公开 env)里登记**(`dotenvx set X=... -f .env.production` + commit + push)——否则部署时找不到 X 会崩。详见 [`docs/工程/密钥管理指南.md`](./docs/工程/密钥管理指南.md)。**禁止**把任何形如 `KEY=` / `SECRET=` / `TOKEN=` 的明文值写进主仓库的任何文件(包括 docs / 注释 / 测试)。

## 🔁 验证回路(Verification Loop) — 改完必须自检

computational sensors(确定性,先跑这些):

```bash
pnpm install        # 首次或依赖变更后
pnpm typecheck      # tsc --noEmit —— 类型必须零报错
pnpm build          # 完整构建,捕获编译/打包错误
```

inferential / 人工验证:

```bash
pnpm dev            # http://localhost:5173 —— 用移动视口(响应式调试)查看
```

**完成定义**:`pnpm typecheck` 与 `pnpm build` 均通过,且改动页面在移动视口下视觉/交互正常。报告结果时如实陈述哪一步过了、哪一步没过。

## 📂 目录速查(详见 README)

```
apps/
├── web/                # ⭐ 当前 MVP 战场 = 陈娟改的地方
│   ├── src/app/
│   │   ├── App.tsx        # 根组件(MobileOnly + RouterProvider)
│   │   ├── routes.tsx     # 路由表(新增页面在此登记)
│   │   ├── pages/         # 14 个页面组件
│   │   ├── components/    # 业务组件 + ui/(shadcn) + figma/
│   │   ├── data/          # 静态数据
│   │   ├── lib/ · utils/  # 工具函数(journal.ts / syncState.ts)
│   │   └── styles/        # 全局样式 / 主题
│   ├── vite.config.ts · tsconfig.json
│   └── package.json
├── ios/                # ⏳ Capacitor 壳(等 chenzhuowen 启动)
├── api/                # ⏳ Go HTTP API(等 ADR-003 启动)
└── worker/             # ⏳ Python 异步 worker(等 api 之后)

packages/types/         # ⏳ Go struct → TS 类型(等 API 第一个接口)
infra/                  # 部署 / 运维(Caddy / systemd / scripts)
docs/  guidelines/      # 真相源文档(不动)
```

> root `package.json` 只做 workspace 编排 + VitePress;`pnpm dev` / `pnpm build` / `pnpm typecheck` 命令仍直接在 root 跑(转发到 `@auraride/web`)。

## ✍️ 提交约定

- 提交前确保通过验证回路。
- commit message 用祈使句、说明"为什么";本仓库用 PR 流程合并到 `main`。
- **禁止直接推 `main`**:任何改动(包括 fix / chore / 文档)都走 `feature-branch → PR → gh pr merge --squash` 流程。理由:
  - main 历史保持线性 + 每个 squash commit = 一个完整 PR 描述(为什么 + 测试 + 影响面)
  - CI 真起 gate 作用(skip 不再无所谓,deploy step 红就拦)
  - 给 `code-review` 子代理留切入点 — 直接 push 跳过审计
  - 灾后 `git revert <squash-sha>` 一次撤干净,不用追溯多个 cherry-pick
- 例外:**热修**才允许 cherry-pick 推 main,但 commit message 必须含 `hotfix:` 前缀 + 事后补 PR 把同一 commit 走流程一遍。
