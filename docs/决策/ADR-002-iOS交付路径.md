# ADR-002 · iOS 交付路径(启明赛 framing)

> **状态**: ✅ 已决定(v3,2026-06-21 进一步简化:**MVP 用 web 手机框替代原生 demo,Capacitor + 7 天免费签名只供 chenzhuowen 个人测试**)
> **日期**: 2026-06-18 创建,2026-06-21 v3 简化
> **作者**: chenzhuowen + Claude
> **上下文**: [`PRD.md` §6 决策⚠️1](../产品/PRD.md) · [`ROADMAP-mvp-a.md`](../工程/ROADMAP-mvp-a.md) · [`ADR-005-后端开发工作流.md`](./ADR-005-后端开发工作流.md)

---

## 🆕 2026-06-21 v3 重大简化:Web 手机框 = MVP 的"iOS demo"

**触发**:chenzhuowen 提出"MVP 阶段把 iPhone 预览容器部署在 web 上"。

**事实核查**:陈娟早在 commit `9d5cd5f` (2026-06-08)已实现 —— [`apps/web/src/app/components/MobileOnly.tsx`](../../apps/web/src/app/components/MobileOnly.tsx) 在桌面浏览器自动渲染 **390×844 iPhone 框架**(iPhone 13/14 尺寸),真手机访问则全屏。**这就是我们的"iOS demo"**。

### 新交付矩阵

| 受众 | 看到什么 | 怎么访问 | 成本 |
|---|---|---|---|
| **评委 / 投资人 / 路人**(99% 流量) | iPhone 框架里的 web app | 浏览器开 `auraride.cn` | ¥0 |
| **陈娟**(daily UI 迭代) | 同上 | 同上 | ¥0 |
| **真手机用户**(国内访问) | 全屏 web | 手机浏览器开 `auraride.cn` | ¥0 |
| **chenzhuowen 个人验证 native 感**(1%) | 真 iPhone 上的原生壳 | Capacitor + 7 天免费签名 + Xcode + 数据线装 | ¥0 |

### 这意味着什么不要做

- ❌ **不付 $99/年 Apple Developer Program**(7 天免费签名不需要)
- ❌ **不上 TestFlight**(没账号也用不了,且陈娟和评委不需要装真 App)
- ❌ **不申请 App Store 上架**(初赛 + 复赛全程不需要,赛后再说)
- ❌ **不写 iOS 复杂的 Native 集成**(没必要)

### Capacitor 还要做吗?

**做,但极简**。半天工作量,只生成 Xcode 项目 + 用 Personal Team 免费签名 + 数据线装 chenzhuowen 自己 iPhone。

理由:
- 复赛视频里**几秒"真在 iPhone 上跑"的镜头**比"web 在 iPhone 框里跑"质感更高
- chenzhuowen 自己验证"真原生场景下(后台 GPS / 摄像头 / Live Activity)Capacitor 插件是否真能跑"
- 万一启迪决赛(虽然我们不是)需要,Capacitor 骨架已存在,只需切付费账号

### 时间预算调整

| 旧估计(原计划) | 新估计(v3 简化后) |
|---|---|
| iOS 套壳 1-3 天 + Apple 账号 1-3 天 + TestFlight 配置 1 天 = 3-7 天 | **Capacitor 半天 + 个人签名 30 分钟 = 半天** |

---

---

## ⚠️ 重要 framing 更正:启明赛全程不需要可运行 iOS App

**你确认参赛赛道是"启明赛"**。根据 [QUST 转载章程原文](https://xk.qust.edu.cn/info/1047/5998.htm) 的求证:

| 维度 | 启明赛道 |
|---|---|
| 初赛 | 只交"作品说明文档 + 可选海报",**无需可运行 App** |
| 复赛 | 文档 + 演示视频(网页录屏即可),**无需可运行 App** |
| 决赛演示 | **启明赛没有决赛演示**(原文:"是否需决赛演示:否(仅初赛、复赛)") |
| 初赛可运行 App | **否(原型设计赛道)** |

> ⚠️ caveat:这条结论强烈依赖 QUST 这一条二次源,未拿到 appcontest.net 原文。"启明赛没有决赛"如属实,则**整个比赛过程从头到尾都不需要 iOS 真机交付**。建议你人工去 appcontest.net 章程 PDF 二次核对。

**所以 ADR-002 的真正问题不再是"赛事什么时候要交 iOS App",而是:**

> 假如赛后你们想把 AuraRide 真正做成一个可上架的 iOS 产品,**现在写的 React 代码怎么安排,才能让未来 Swift 重写时尽量少改、视觉一致性尽量高?**

---

## 用户的两个要求(他自己说"由我来选")

1. **想用 Swift**(强偏好)
2. **架构要能快速迁移到 iOS,且一致性高**

这两个要求**有内在张力**——"Swift 重写"和"快速迁移"是矛盾的(重写永远不快)。真正能两全的办法是:**把"难翻译的东西"提前清出 UI 层**,这样 Swift 重写时只需"翻译表层 + 复用底层"。

## 三条路径的硬指标(已交叉验证)

| 维度 | Capacitor 套壳 | React Native | **SwiftUI 原生重写** |
|---|---|---|---|
| 现有 React 代码复用率 | 100%(整工程直接套 WebView) | 0%(JSX 一样但 Tailwind/framer-motion/路由全换) | 0%(完全重写) |
| 视觉与现有 web 版**一致性** | **100%**(根本就是同一份代码) | 约 70%(原生组件长得不一样) | **取决于设计系统**(本仓库有 `default_shadcn_theme.css`,可以做到 95%+) |
| 真机 demo 最快可达 | 1–2 天 | 2–3 周 | 4–8 周(全新工程) |
| Apple 评委观感 | "套壳网页"可能被看穿 | "跨平台框架" | "正宗 iOS" |
| 团队学习成本 | 0 | 中 | 高(Swift + SwiftUI + Xcode) |
| iOS 原生能力(后台 GPS / 灵动岛 / HealthKit) | 全靠[第三方插件](https://github.com/transistorsoft/capacitor-background-geolocation),个别商业 license,质量参差 | RN 生态较成熟 | **CoreLocation / ActivityKit / HealthKit 原生最佳** |
| 用户偏好"想用 Swift" | ❌ | ❌ | ✅ |

## 决定

**当前到比赛全程**:继续 React + Vite + Tailwind,**不做任何 iOS 工作**。比赛 100% 走网页原型 + 录屏 + 文档。

**赛后(如果你们决定继续做):走 SwiftUI 原生重写**。理由:
- 用户偏好 Swift
- 启明赛事前**不需要**任何 iOS 真机,所以"为了 demo 应急走 Capacitor"这个理由消失了
- SwiftUI 重写的"慢"不再是问题——没有 deadline
- 一致性靠**双向镜像的 design tokens + 纯函数共享算法**保证(详见下方架构准备清单)

**Capacitor 保留为"30 分钟应急 demo 工具"**:如果某天突然要给评委/投资人/朋友演示真机,临时 `pnpm cap add ios && pnpm cap sync && pnpm cap open ios` 就能产出一个能装在 iPhone 上的包,作为应急。

## 为未来 Swift 重写做的架构准备(本分支立刻可落)

这是真正能让"未来快速迁移 + 一致性高"成立的关键。每条都是当下就能在 React 代码里执行的纪律,**与比赛交付不冲突**,反而能让网页版代码本身更清晰。

| # | 原则 | 落地动作 | 给未来 Swift 的好处 |
|---|---|---|---|
| 1 | **纯算法函数与 UI 解耦** | [`apps/web/src/app/lib/moodColor.ts`](../../apps/web/src/app/lib/moodColor.ts) 这种纯函数,**不引用任何 React/DOM 类型**。未来 `apps/web/src/app/lib/colorEngines/*.ts` 也守住这条。 | Swift 重写时这些函数可以 1 周内被 LLM 翻成纯 Swift(算法 = 算法,语言无关) |
| 2 | **色卡常量是 manifesto §1 的镜像,不是散落的 hex** | [`COLOR_PROFILES`](../../apps/web/src/app/lib/moodColor.ts) 集中定义。Swift 端建一个同名 enum + struct,值从同一份 manifesto §1 表抄过来。 | 视觉一致性 = 同源数据 |
| 3 | **设计 token 镜像** | [`default_shadcn_theme.css`](../../apps/web/default_shadcn_theme.css) 的颜色/圆角/间距/字号,Swift 端建一个 `DesignTokens.swift` 1:1 翻一份。陈娟的 Figma 同时驱动两端。 | 视觉一致性 |
| 4 | **避免 React-only 的"难翻译"依赖** | 核心动效优先用 **CSS @keyframes / Web Animations API**(能 1:1 翻成 Core Animation),少用复杂的 framer-motion 编排;复杂效果限制在"装饰层",核心交互必须降级可用 | 减少 Swift 端动画工作量 |
| 5 | **数据访问通过 `repo` 抽象**(已经做了!) | [`rideRepo.ts`](../../apps/web/src/app/lib/rideRepo.ts) 是接口,localStorage 是实现。Swift 端实现同一接口的 Core Data / SwiftData 版即可 | 业务逻辑零改动 |
| 6 | **页面 = 视觉模板 + 调用纯函数**,不把业务逻辑塞进组件 | 每个 [`pages/`](../../apps/web/src/app/pages/) 组件理想是"从 repo 读数据 → 调纯函数算颜色 → 渲染",而不是组件里写算法 | Swift 端只需重画视觉模板 |
| 7 | **Figma 设计源文件版本化** | 陈娟把 Figma 文件 export 到 `design/` 目录,或者用 [Figma 链接 + Code Connect](https://www.figma.com/code-connect-docs/) 关联 React/SwiftUI 双端组件 | 一份设计、两端落地 |

> 这 7 条做到后,未来 Swift 重写大致是:**1 周翻算法 + 2 周搭设计系统 + 4 周做页面**——而不是"7 周重做一切"。

## 这次不做什么

- **不**安装 Capacitor / RN
- **不**写 Swift 任何代码
- **不**对现有 React 代码做"为了将来翻译而过度抽象"的重构——上述 7 条都是**写新代码时的纪律**,旧代码以"修改时顺手对齐"为原则,不专门重构

## 决策日志

| 日期 | 决定 | 推翻条件 |
|---|---|---|
| 2026-06-18 | 启明赛 framing 下,全程走 React + Vite,赛后真做 iOS 才启 SwiftUI 重写;Capacitor 仅当应急 | (1) 启明赛章程实际有"决赛真机"要求(待人工求证) (2) 比赛后用户决定不继续做 iOS (3) 陈娟坚持要先做 Capacitor 演示一版 |

## 引用

- 启明赛章程(QUST 转载): https://xk.qust.edu.cn/info/1047/5998.htm
- 启明赛章程(HITWH 转载): https://cst.hitwh.edu.cn/2026/0422/c371a212587/page.htm
- React Native 嵌入 SwiftUI(供未来参考): https://reactnative.dev/docs/integration-with-existing-apps · https://www.callstack.com/blog/exposing-swiftui-views-to-react-native-an-integration-guide
- Capacitor 应急方案插件:https://github.com/transistorsoft/capacitor-background-geolocation · https://github.com/ludufre/capacitor-live-activities
- Figma Code Connect(双端组件对齐):https://www.figma.com/code-connect-docs/
