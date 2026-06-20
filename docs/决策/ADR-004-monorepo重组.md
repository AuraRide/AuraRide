# ADR-004 · Monorepo 目录重组(`src/` → `apps/web/`)

> **状态**: 🟡 Proposed(待 chenzhuowen + 陈娟 review,review 后改为 ✅ Accepted)
> **日期**: 2026-06-21
> **作者**: chenzhuowen + Claude
> **依赖**: [`ADR-003-后端技术栈.md`](./ADR-003-后端技术栈.md) — 后端组件存在的前提

## 背景

当前仓库是单一 React app,代码全在 root `src/`,搭配 `docs/` `guidelines/` `.claude/` `.github/`。ADR-003 已经决定要引入 4 个独立进程(Go API / Python Worker / 未来 iOS / web 自己)+ 共享类型包 + 部署基础设施。继续在 root `src/` 单层结构下塞这些,**3 个月内就会变成"代码考古"**。

同时,这次重组**必须保护陈娟的工作面**——她现在做的事情(改 UI、改 manifesto 落地、跑 dev、改 React)在重组后**只能比现在更顺,绝不能比现在更难**。

## 决定一览

1. **目录结构**:`apps/{web,ios,api,worker}` + `packages/types` + `infra/`,3 个 Sibling 顶层目录(apps / packages / infra)+ 原有 docs/guidelines/.claude/.github 保留 root
2. **iOS = Capacitor 包**,与 web sibling(不是 child),通过 `apps/ios/capacitor.config.ts` 引用 `../web/dist`
3. **`web` 命名保留**,不改 prototype / studio / design 等
4. **陈娟通过 `RideRepo` 抽象层与后端解耦**,代码 0 修改,**dev 模式永远跑 localRepo**,production build 切 `goRepo`
5. **MVP 阶段只建 `apps/web/`**,其他目录留 README 占位(说明"待 X 阶段启动")
6. **物理迁移用一次性 atomic commit**,git rename 检测保留 history
7. **`pnpm-workspace.yaml` 一次配置定型**

## 最终目录(2 年内不需要改)

```
AuraRide/
├── apps/                       # 每个目录 = 一个独立部署的产物
│   ├── web/                    # ⭐ MVP 现在:陈娟战场,React + Vite,也是 iOS WebView source
│   │   ├── src/                # 原 root src/ 整体搬入
│   │   ├── public/  index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json  tsconfig.node.json
│   │   ├── default_shadcn_theme.css
│   │   └── package.json        # web 自己的 deps(原 root deps 拆过来)
│   │
│   ├── ios/                    # ⏳ 等启动:Capacitor 包,薄壳
│   │   ├── capacitor.config.ts # webDir: '../web/dist'
│   │   ├── package.json        # @capacitor/* plugins
│   │   ├── App.xcworkspace     # Xcode 工作区
│   │   ├── App/                # 99% 自动生成 + 1% 手填(Info.plist / 图标)
│   │   └── Podfile
│   │
│   ├── api/                    # ⏳ 服务器装好之后:Go HTTP API
│   │   ├── cmd/api/main.go
│   │   ├── internal/{auth,rides,posts,upload}/
│   │   ├── go.mod / go.sum
│   │   └── Dockerfile          # 可选
│   │
│   └── worker/                 # ⏳ api 之后:Python 异步 worker
│       ├── src/auraride_worker/
│       │   ├── vlm/            # DashScope 调用
│       │   ├── color_aggregate/# 染色聚合
│       │   └── main.py         # dramatiq broker
│       ├── pyproject.toml
│       └── Dockerfile          # 可选
│
├── packages/                   # 共享代码,不独立部署,被 apps/* 引用
│   ├── types/                  # ⏳ api 第一个接口写好时:从 Go 自动生成 TS 类型
│   │   ├── api.d.ts
│   │   └── package.json
│   │
│   └── (将来如果有)
│       ├── ui-tokens/          # design tokens 同源(SwiftUI 重写时)
│       ├── color-engine/       # 染色纯函数(跨平台共享)
│       └── utils/
│
├── infra/                      # ⏳ api 部署时:服务器 / 运维相关
│   ├── caddy/Caddyfile
│   ├── systemd/{api,worker}.service
│   ├── scripts/{init-server,deploy,backup}.sh
│   └── README.md               # 怎么从零搭一台新服务器
│
├── docs/                       # ✅ VitePress 站(已存在,不动)
├── guidelines/                 # ✅ 设计 Guidelines.md(已存在,不动)
│
├── .claude/  .github/          # 工具 / CI 配置(已存在,不动)
├── AGENTS.md  CLAUDE.md  README.md  ATTRIBUTIONS.md
├── package.json                # workspace root:只编排,无业务 deps
├── pnpm-workspace.yaml         # apps/* + packages/*
└── tsconfig.base.json          # 共享 TS 配置
```

## 三个分类逻辑(任何新东西先问"它属于哪类")

| 类 | 判据 | 例子 |
|---|---|---|
| **`apps/*`** | 部署到 App Store / Play Store / 服务器 / 浏览器,有独立 deploy 流水线 | web / ios / api / worker |
| **`packages/*`** | 是其他东西的依赖,自己不跑、不部署,通过 `import` 被引用 | types / ui-tokens / color-engine |
| **`infra/*`** | 怎么把 apps 跑起来 / 看着它跑;不是代码而是配置和脚本 | Caddyfile / systemd unit / 备份脚本 |

## 关键架构决定的论证

### 1. 为什么 iOS 是 web 的 sibling 而不是 child

Capacitor CLI 默认 `npx cap add ios` 会在当前目录生成 `ios/`(也就是 `apps/web/ios/`)。我们**显式不要这种 layout**:

**否决理由**:
- `apps/*` 应该全是同级独立部署单元,**iOS 是独立部署到 App Store 的产物,不是 web 的"子文件夹"**
- CI path filter 干净:`apps/ios/**` 触发 iOS 构建,`apps/web/**` 触发 web 构建,**互不交叉**
- 视觉上"web 里嵌着 iOS"很奇怪,职责边界模糊

**怎么实现 sibling**:
- `apps/ios/capacitor.config.ts` 里写 `webDir: '../web/dist'`
- 在 `apps/ios/` 跑 `npx cap add ios`(Capacitor 7+ 支持 monorepo 路径)
- CI `cap sync` 时自动从 `apps/web/dist/` 拷贝到 `apps/ios/App/App/public/`

### 2. 为什么 web 不直连后端,通过 `RideRepo` 解耦

陈娟的代码现状([`src/app/lib/rideRepo.ts:255`](../../src/app/lib/rideRepo.ts:255)):

```ts
export const repo: RideRepo = localRepo;
```

她所有页面都 `import { repo }`,**永远只看到接口名,看不到底层**。

未来产品化时:

```ts
const goRepo: RideRepo = { /* fetch /api/rides 等 */ };
export const repo: RideRepo = import.meta.env.PROD ? goRepo : localRepo;
```

**dev 模式永远 localRepo,prod build 才走 goRepo**。陈娟体感:
- 改 UI / 删页面 / 加新页面 / 重 design manifesto → **0 影响后端**
- 起 `pnpm dev` 永远不需要任何后端依赖,**不需要装 Postgres / Redis / Go**
- 她从来不需要"等后端 ready"

**这是 RideRepo 抽象的核心价值——它不是工程优雅,它是对陈娟创作自由的尊重**。

### 3. 为什么 `web` 命名保留

否决的备选:
- `prototype/` — 暗示"临时品",**贬低陈娟的工作**(她写的是真产品代码,不是 mockup)
- `studio/` / `design/` — 设计是工作内容,不是 app 的形态
- `client/` — 太抽象;iOS 也是 client
- `frontend/` — 同上;web 是 frontend 的一种

`web` 是行业标准词,**陈娟的 Claude、未来开发者、agent 都一秒看懂**,不在含糊空间里浪费心智。

### 4. 为什么 `packages/types/` 现在不建

MVP 阶段:
- 还没有 Go API 写出来,packages/types 无数据可生成
- 强行建空目录 = 增加"为啥这里没东西"的认知噪音

P1 阶段(Go API 写第一个接口时):
- `tygo` 工具一次性把 Go struct 转成 TS interface
- commit `packages/types/api.d.ts`
- 主仓库 `apps/web/` 通过 workspace 引用

## 物理迁移方案

### Phase 1:加目录骨架(0 风险)

```bash
mkdir -p apps/web apps/ios apps/api apps/worker packages/types infra/{caddy,systemd,scripts}
# 每个空目录加 .gitkeep 或一句话 README
echo "# apps/api/ — Go HTTP API\n等 ADR-003 §1 启动" > apps/api/README.md
echo "# apps/worker/ — Python 异步 worker\n等 apps/api 之后启动" > apps/worker/README.md
echo "# apps/ios/ — Capacitor 包\n等 chenzhuowen 启动" > apps/ios/README.md
echo "# packages/types/ — 共享 TS 类型\n等 Go API 写出第一个接口时启动" > packages/types/README.md
echo "# infra/ — 服务器 / 部署相关\n等 apps/api 部署时启动" > infra/README.md
```

### Phase 2:git mv 大搬家(git 检测 rename,history 不丢)

```bash
git mv src apps/web/src
git mv index.html apps/web/index.html
git mv vite.config.ts apps/web/vite.config.ts
git mv tsconfig.json apps/web/tsconfig.json
git mv tsconfig.node.json apps/web/tsconfig.node.json
git mv default_shadcn_theme.css apps/web/default_shadcn_theme.css
# public/ 也搬(如果有 root level 的)
```

### Phase 3:拆 package.json

root `package.json` 留下:

```json
{
  "name": "auraride",
  "private": true,
  "scripts": {
    "dev":      "pnpm --filter web dev",
    "build":    "pnpm --filter web build",
    "preview":  "pnpm --filter web preview",
    "typecheck": "pnpm -r typecheck",
    "docs:dev":    "vitepress dev docs",
    "docs:build":  "vitepress build docs",
    "docs:preview": "vitepress preview docs"
  },
  "devDependencies": {
    "@dotenvx/dotenvx": "^1.74.2",
    "vitepress": "...",
    "vitepress-plugin-mermaid": "..."
  }
}
```

新建 `apps/web/package.json`(从 root 拷贝所有 web-only deps):

```json
{
  "name": "@auraride/web",
  "private": true,
  "scripts": {
    "dev":     "dotenvx run -f ../../AuraRide-env/.env.public -- vite",
    "build":   "dotenvx run -f ../../AuraRide-env/.env.public -- vite build",
    "preview": "dotenvx run -f ../../AuraRide-env/.env.public -- vite preview",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": { /* react / radix / motion / mui / 等所有现 dependencies */ },
  "devDependencies": { /* @vitejs/plugin-react / tailwindcss / typescript / vite / 等 */ }
}
```

### Phase 4:改路径(关键风险点)

| 文件 | 改什么 |
|---|---|
| `apps/web/vite.config.ts` | 别名 `@/* → ./src/*` 仍工作(相对路径不变);若有 `envDir` 改为 `'../../AuraRide-env'`(如果用) |
| `apps/web/tsconfig.json` | `baseUrl`、`paths`(`@/*` → `src/*`)依然能解析(相对) |
| `apps/web/tsconfig.node.json` | references 路径如指向 root,改为相对路径 |
| `.github/workflows/docs.yml` | paths 加 `apps/web/**` 不需要;docs 路径不变 |
| `apps/web/.claude/`(无,不动) | 留 root `.claude/` 即可 |
| `pnpm-workspace.yaml` | 改为 `packages: ['apps/*', 'packages/*']` |
| `pnpm-lock.yaml` | 一次 `pnpm install` 自动重生成 |

### Phase 5:改文档 / agent 配置

| 文件 | 改 `src/` 引用为 `apps/web/src/` |
|---|---|
| `AGENTS.md` | 黄金法则、目录速查、所有 `src/` 路径 |
| `docs/产品/一切皆颜色.md` § 5 UX 入口表里的所有 `src/app/pages/X` | 全部加 `apps/web/` 前缀 |
| `docs/工程/ROADMAP-mvp-a.md` | 同上 |
| `.claude/agents/color-manifesto-guard.md` | description / how to run 里的 `src/app/lib/moodColor.ts` 加 `apps/web/` |
| `.claude/agents/design-page-reviewer.md` | 同上 `src/app/pages/` |
| `README.md` | 目录结构图 |

### Phase 6:验证(完成定义)

```bash
pnpm install                  # ✅ workspace 重装,无错
pnpm typecheck                # ✅ tsc --noEmit 零报错
pnpm build                    # ✅ web build 成功,产物在 apps/web/dist/
pnpm dev                      # ✅ 启动 vite,127.0.0.1:5173 能跑
# 浏览器跑一遍核心流程:
#   /  → /mood → /color → /generate → /journal → /discover
# 确认地图能加载,数据能注入,无 console error
```

## 陈娟那侧的影响

她需要做**一次** UI 上的目录切换:

```bash
cd ~/Code/AuraRide
git pull
pnpm install  # workspace 需要重装

# 以前: cd ~/Code/AuraRide && pnpm dev
# 现在: cd ~/Code/AuraRide && pnpm dev    ← 完全一样!
# 因为 root scripts 转发到 apps/web
```

她在 VS Code 里**改文件的路径变了**:从 `src/app/pages/X.tsx` → `apps/web/src/app/pages/X.tsx`。她搜索 / 跳定义都正常工作,只是路径前面多一段。

**陈娟的工作环境从命令视角是 0 变化的,从文件视角多了一级前缀,从 IDE 视角无感**。

## 回滚方案

如果决定推翻:

```bash
git revert <重组 commit>
```

前提:重组用**单一 atomic commit** 落地,不是散 N 个 commit。我会强制这条。

## 风险与 Caveats

1. **`vite.config.ts` 里的 alias `@/* → src/*`** — 路径表达是相对的,搬到 `apps/web/vite.config.ts` 后 `@` 仍指向 `apps/web/src/*`,**理论应无变化**。**实操前 spike 验证**。
2. **`tsconfig.json` references** — `tsconfig.node.json` 可能需要更新相对路径。
3. **GH Actions docs.yml** — `paths: docs/**` 路径不变,但未来 `web.yml` 要新建 `paths: apps/web/**`。
4. **Vite 的 `envDir`** — 当前 vite.config 没用 envDir,而是通过 dotenvx 注入 `process.env`。这个保持。但要确认 `../../AuraRide-env/.env.public` 在 `apps/web/` 视角下能 resolve(应该可以,2 层 `../`)。
5. **`tygo` / `packages/types` 等未来工具是否需要 monorepo 特殊配置** — P1 启动时验证。

## 关联

- [ADR-001-在线文档平台](./ADR-001-在线文档平台.md) — VitePress + GH Pages,docs/ 在 root
- [ADR-002-iOS交付路径](./ADR-002-iOS交付路径.md) — Capacitor 路径决策
- [ADR-003-后端技术栈](./ADR-003-后端技术栈.md) — apps/api / worker / packages/types 存在的前提
- [`docs/工程/社交化-开发任务拆分.md`](../工程/社交化-开发任务拆分.md) — RideRepo 接口契约(陈娟保护层)
- [`docs/工程/密钥管理指南.md`](../工程/密钥管理指南.md) — `.env.public` 路径变更

## 决策日志

| 日期 | 决定 | 推翻条件 |
|---|---|---|
| 2026-06-21 | apps/web/ + sibling ios/api/worker + packages/types/ + infra/ + Capacitor 路径 | 陈娟工作流出现重大摩擦 / Capacitor monorepo 集成失败 / 团队扩张到独立工程更优 |

## 引用

- pnpm workspace:https://pnpm.io/workspaces
- Capacitor monorepo 配置:https://capacitorjs.com/docs/getting-started
- tygo(Go struct → TS interface):https://github.com/gzuidhof/tygo
- Turborepo monorepo 模式参考:https://turbo.build/repo/docs/handbook
