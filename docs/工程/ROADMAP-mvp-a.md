# mvp-a 路线图

> 分支 `mvp-a` 的范围、做与不做、里程碑、ADR 索引。
> 上游真相源:[`PRD.md` §10 路线图](../产品/PRD.md) · [`一切皆颜色.md`](../产品/一切皆颜色.md)
> 本文件只规定**本分支阶段**做什么。比赛全局节奏看 PRD §0/§10。
>
> **本分支立意 framing**:报名**启明赛**,根据章程二次求证启明赛全程不需要可运行 App(只交文档+视频)。所以 mvp-a 的目标是:**把产品哲学和协作平面立住,让接下来 6/30 之前的所有精力都能高效落到设计与原型上**。

---

## 分支立意

mvp-a = **manifesto + 协作脚手架(harness + 在线文档)+ 关键页视觉拉满**,**不**做原生化。

理由:
- 初赛(2026-06-30)只要"文档 + 1 张图",不要可运行 App(见 PRD §0)。
- 当前最大风险是**产品哲学没集中外化**(一切皆颜色散落在 PRD/信息架构里)+ **两个人的协作没有共享视图**(陈娟看不到 PRD/AGENTS 的最新版,也不方便改)。
- 设计期最痛的是"做了又被推翻"。先把 manifesto 立住、把协作平面搭好,后续每一刀都能在共享认知上落,不重做。

---

## 在做(本分支的范围)

| # | 事项 | 状态 | 落到哪 |
|---|---|---|---|
| 1 | **manifesto 集中外化**——"一切皆颜色"独立成文,定义 5 色契约、三层结构、分类器统一签名、9 条工程不变量 | ✅ | [`docs/一切皆颜色.md`](../产品/一切皆颜色.md) |
| 2 | **AGENTS.md 接入 manifesto**——真相源表 + 第 8/9 条颜色契约黄金法则 | ✅ | [`AGENTS.md`](../../AGENTS.md) |
| 3 | **仓库特有 harness**——`.claude/agents/` 沉淀 `color-manifesto-guard` + `design-page-reviewer` | ✅ | [`.claude/agents/`](../../.claude/agents/) |
| 4 | **mvp-a 路线图(本文件)** | ✅ | 你正在读 |
| 5 | **ADR-001 在线协作文档平台选型** | ✅ 已决定 | [`ADR-001-在线文档平台.md`](../决策/ADR-001-在线文档平台.md) — **VitePress + GitHub Pages + Mermaid/PlantUML 插件**(陈娟会 git,无需 SaaS 编辑器) |
| 6 | **ADR-002 iOS 交付路径** | ✅ 已决定 | [`ADR-002-iOS交付路径.md`](../决策/ADR-002-iOS交付路径.md) — **全程网页原型,赛后真做 iOS 再走 SwiftUI 重写**;现在写 React 时遵守 7 条架构准备纪律保证未来一致性 |
| 7 | **比赛章程二次求证 + 启明赛 framing** | ✅ 完成 | [`PRD.md` §0 求证日志](../产品/PRD.md#0-比赛要求解读读完章程--初赛模板后重要更正以此为准) · 启明赛全程不需可运行 App |
| 8 | **落 VitePress 工程 + GH Actions 自动发布** | ✅ 完成 | https://auraride.github.io/AuraRide/ |
| 9 | **在 manifesto 插 mermaid 流程图** | ✅ 完成 | 见 manifesto §2 三层结构 |
| 10 | **ADR-003 后端技术栈 + ADR-004 monorepo 重组 + ADR-005 后端开发工作流** | ✅ 已决定 | [`决策/ADR-003`](../决策/ADR-003-后端技术栈.md) · [`ADR-004`](../决策/ADR-004-monorepo重组.md) · [`ADR-005`](../决策/ADR-005-后端开发工作流.md) |
| 11 | **dotenvx 加密密钥仓库 AuraRide/AuraRide-env** | ✅ 完成 | 与主仓库同级 clone,陈娟无感 |
| 12 | **腾讯云轻量服务器(122.51.109.165)+ COS(auraride-photos-1315627382)** | ✅ 已购 + COS 已验证 coscmd 端到端 | 等密码 rotate 后跑 `infra/scripts/init-server.sh` |
| 13 | **域名 auraride.cn + ICP 备案** | 🟡 已购,命名审核中 → 备案 7-15 天 | DNSPod 控制台 |
| 14 | **🔥 Monorepo 重组 src/ → apps/web/src/(ADR-004 实施)** | ✅ 完成 (`c215e4b`) | apps/web/ 已就位 |
| 15 | **🔥 前端 apiRepo + Vite proxy(陈娟无感切换后端)** | ✅ 完成 (`78ef47a`) | env-controlled,无 VITE_API_BASE_URL 时仍 localRepo |
| 16 | **🔥 Go API skeleton(11 endpoints + 5 表 + seed + 21 tests)** | ✅ 完成 (`6180631`) | `apps/api/`,等服务器 Postgres 装好后能直跑 |
| 17 | **🔥 Python worker skeleton(2 actor + VLM 染色 + 6 级降级 + 24 tests)** | ✅ 完成 (`161be7c`) | `apps/worker/`,等 DashScope key + Postgres 后能直跑 |
| 18 | **🔥 4 个 GH Actions workflow(api/worker/web/docs)** | ✅ 完成 (`33a2ce2`) | 全部 CI 绿,deploy step 等 SSH key 配好后启用 |
| 19 | **🔥 ADR-006 docker compose 化部署**(supersede ADR-003 部署形态 + ADR-005 deploy 命令) | ✅ 完成 | `docker-compose.yml` + 2 个 Dockerfile + `infra/scripts/deploy.sh` + init-server.sh 简化 |
| 20 | **关键页视觉拉满**——首页 / ColorReveal / 路线推荐 / 年度回顾,为初赛海报和截图服务 | 🟡 设计主导(陈娟) | `apps/web/src/app/pages/` |
| 21 | **"颜色索引相册"原型**(manifesto §6) | 🟡 看进度;若 ADR 优先则推后 | `apps/web/src/app/pages/` 新加 tab |

---

## 不做(本分支明确推迟)

| 事项 | 推迟到 | 理由 |
|---|---|---|
| Capacitor / Swift / RN 任何一条原生路径的实做 | 赛后真做 iOS 才启动 | 启明赛全程不要 iOS;ADR-002 已决定 |
| Supabase 后端 + RideRepo 切到 supabaseRepo | P1(初赛过后) | 见社交化-开发任务拆分.md §4 阶段表 |
| Apple 登录、HealthKit、灵动岛、推送 | 赛后 | 启明赛全程不需要 |
| 高德商用 key / 字体商用授权 | 赛后 | 现在用免费额度足够 |
| LLM 升级版"心情→色"分类器 | 等 manifesto 稳定后再考虑 | 现在的关键词版能跑;先用 manifesto 卡住接口,实现可后换 |
| 颜色卡扩到 6 种或以上 | 等真有第 6 种情感场景再说 | manifesto §1 留了门槛,防止色卡通胀 |

---

## 里程碑

- **M1 - 协作平面就位**(本周内):任务 1–7 ✅ + **任务 8/9**(落 VitePress + GH Actions + 在 manifesto 插 mermaid 流程图)
  - **完成定义**:你和陈娟都能通过 `auraride.github.io/AuraRide` 在线打开 manifesto/PRD;改动通过 GitHub Web 编辑器或本地 commit 都能 1 分钟内反映到线上
- **M2 - 比赛文档锁定**(对齐 PRD §10 第 2 周):
  - 完成定义:`作品说明文档-初稿.md` 完稿;关键页 3 张截图 + 1 张主视觉海报定稿
- **M3 - 初赛提交**(2026-06-28 前,留 2 天缓冲):
  - 完成定义:文档 + 海报上传成功,截图保留
- **M4 - 复赛预备**(若晋级,继续打磨原型 + 出演示视频;**启明赛复赛仍是网页原型录屏,无需 iOS 真机**)

---

## ADR 索引

`ADR-XXX-<topic>.md` 记录"为什么这么决定 + 当时已知 / 未知 / 反对意见"。决定**可以**之后被推翻,但理由要留痕。

| 编号 | 主题 | 状态 |
|---|---|---|
| [ADR-001](../决策/ADR-001-在线文档平台.md) | 在线协作文档平台选型 | ✅ 已决定:VitePress + GitHub Pages + Mermaid/PlantUML 插件 |
| [ADR-002](../决策/ADR-002-iOS交付路径.md) | iOS 交付路径(启明赛 framing) | ✅ 已决定:全程网页原型,赛后真做 iOS 再启 SwiftUI 重写 |
| [ADR-003](../决策/ADR-003-后端技术栈.md) | 后端技术栈 + 云架构 | ✅ 已决定:Go + Python sibling / 自托管 Postgres·Redis / Caddy / COS / DashScope |
| [ADR-004](../决策/ADR-004-monorepo重组.md) | monorepo 重组 | ✅ 已决定 + 已实施:`apps/{web,ios,api,worker}` + `packages/types` |
| [ADR-005](../决策/ADR-005-后端开发工作流.md) | 后端开发工作流 + apiRepo + seed | ✅ 已决定 + 已实施 |
| [ADR-006](../决策/ADR-006-docker-compose-部署.md) | docker compose 化部署(supersede ADR-003 部署形态) | ✅ 已决定 + 已实施 |
| ADR-007 | 颜色分类器实现路径(关键词 → LLM → VLM 的演进顺序) | 占位,等照片染色实做时再写 |

---

## 给 coding agent 的提示

进本分支前请先读:
1. [`docs/一切皆颜色.md`](../产品/一切皆颜色.md) — 任何特性必须能映射到颜色
2. [`AGENTS.md`](../../AGENTS.md) §⭐ 黄金法则 9 条(尤其第 8/9 关于颜色契约)
3. 本文件 — 看本分支做什么、不做什么

写完代码先跑 [`AGENTS.md` 验证回路](../../AGENTS.md#-验证回路verification-loop--改完必须自检),再考虑跑 `color-manifesto-guard` 子代理审计 diff。
