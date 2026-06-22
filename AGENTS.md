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

## ✍️ 提交约定 — 2 长期分支(main / mvp-a)+ Squash

### 黄金分支规则

| 分支 | 角色 | 谁能 push | merge from |
|---|---|---|---|
| **`main`** | 生产稳定,部署对应 `auraride.cn` / `122.51.109.165` 真线上 | 任何人(via PR + squash) | `mvp-a`(milestone 时) |
| **`mvp-a`** | 当前阶段活跃 dev,部署 `staging.auraride.cn` / `/var/www/auraride/staging` | 任何人(via PR + squash) | topic branch |
| `feat/*` `fix/*` `chore/*` `docs/*` | 短期 topic branch | 作者(via PR + squash 后被删除) | — |

**全部改动经过:`topic branch → PR → squash merge → 删除 topic`**。**禁止直接 `git push` 任何长期分支**(main 或 mvp-a 都不行)。

里程碑用 git tag,**不**用长期分支:

```bash
git tag milestone/mvp-b <sha> -m "下一阶段里程碑"
git push origin milestone/mvp-b
```

### 日常工作流(陈娟 / chenzhuowen 都走这一套)

```bash
# 1. 同步 mvp-a
git checkout mvp-a && git pull

# 2. 开 topic branch
git checkout -b feat/ride-detail-share

# 3. 改 + 跑验证回路
pnpm typecheck && pnpm build   # 后端:go test / uv run pytest

# 4. 提交 + push
git add ... && git commit -m "祈使句 + 为什么"
git push -u origin feat/ride-detail-share

# 5. PR → mvp-a(注意 base 是 mvp-a 不是 main)
gh pr create --base mvp-a --title "..." --body "..."

# 6. squash merge + 删 topic
gh pr merge <num> --squash --delete-branch
```

### 阶段 milestone 发布(mvp-a → main)

每隔一段时间(陈娟设计完一组关键页 / chenzhuowen 后端完成一组功能),开 mvp-a → main PR,把累计的若干 squash commit 一次性合到 main:

```bash
gh pr create --base main --head mvp-a \
  --title "release/mvp-a-week-N: 本期上线内容 ..." \
  --body "# 本次发布
  ## 包含
  - feat: ...(#PR1)
  - fix: ...(#PR2)
  ...
  ## 验证
  - [ ] staging 已测 N 天无回归
  - [ ] 真线上灰度 K%"

# milestone merge 用 --merge(不 squash),保留 mvp-a 期间的 squash commit 节点,
# 让 main 历史能看到"这一周做了哪些事"
gh pr merge <num> --merge
git tag milestone/mvp-a-week-N main
git push origin milestone/mvp-a-week-N
```

⚠ **mvp-a → main 是这条规则的唯一 `--merge` 用法**(其他场景全 squash)。

### 为什么 squash 默认

| 维度 | squash merge | merge commit / direct push |
|---|---|---|
| 长期分支历史 | 1 PR = 1 commit,带完整 description | N 个 WIP commit 铺开 |
| `git revert` | 一次撤干净 | 要追多个 cherry-pick |
| `code-review` 子代理触发点 | PR diff 是天然审计边界 | 跳过审计 |
| CI gate | red 真拦 merge | direct push 时 CI 跑了也只能事后哭 |
| `git bisect` | commit 数少,二分快 | noise commits 多 |

### CI / 部署差异

| Workflow | main 行为 | mvp-a 行为 |
|---|---|---|
| `web.yml` | build + 部署到 `/var/www/auraride/web`(prod) | build + 部署到 `/var/www/auraride/staging`(预览) |
| `api.yml` | build + test + **真 deploy** | build + test only(不动生产 api) |
| `worker.yml` | 同 api.yml | 同 api.yml |
| `docs.yml` | 部署 GitHub Pages | 部署 GitHub Pages(覆盖 prod docs;后期可改成 PR preview) |

**为什么 mvp-a 不部署 api/worker**:服务器只有一套 postgres / redis,mvp-a 部署 api/worker 会**覆盖 prod backend**,等于 mvp-a 一改后端就影响线上。等将来加 staging 数据库再开 mvp-a deploy。

### 例外(就一条)

**hotfix**:线上挂掉、人在赶飞机,允许 cherry-pick 直接 push main,但 commit message **必须**含 `hotfix:` 前缀 + 事后 24h 内补一个 PR(base=main)把同一改动走流程一遍(留下审计痕迹)。**hotfix 之后必须 git pull main 到 mvp-a**,让两条分支重新同步。

### Anti-patterns(被发现就 revert)

- ❌ `git push origin <branch>:main` 或 `<branch>:mvp-a` —— 用别的分支名伪装直推
- ❌ `git push --force` 任何长期分支(除非全员同意 + 同步 server / 所有 clone)
- ❌ PR base 错(`feat/*` 应当 PR 到 `mvp-a`,只有 milestone 才 PR 到 `main`)
- ❌ `gh pr merge --merge` 当 topic→mvp-a 的默认(squash 才是默认)
- ❌ 在 main 或 mvp-a 上 `git commit` 后再 push —— 这一步本身已经错了,branch 出去重做
