---
layout: home

hero:
  name: "AuraRide"
  text: "把心情骑成一条路线"
  tagline: "情绪驱动的骑行 App · 一切皆颜色"
  actions:
    - theme: brand
      text: 一切皆颜色(manifesto)
      link: /产品/一切皆颜色
    - theme: alt
      text: 产品骨架与页面
      link: /产品/产品骨架-信息架构
    - theme: alt
      text: GitHub
      link: https://github.com/AuraRide/AuraRide

features:
  - title: 🟢 产品哲学
    details: 一切皆颜色 manifesto、产品骨架与信息架构、PRD 与比赛节奏。
    link: /产品/一切皆颜色
    linkText: 进入
  - title: 🔵 关键决策(ADR)
    details: 在线文档平台 / iOS 交付路径等不可逆决定的"为什么 + 备选 + 否决理由"。
    link: /决策/ADR-001-在线文档平台
    linkText: 查看
  - title: 🟡 工程与协作
    details: mvp-a 路线图、社交化任务拆分、给陈娟的编辑指南。
    link: /工程/ROADMAP-mvp-a
    linkText: 查看
  - title: ⚪ 参赛资料
    details: 第十一届中国高校计算机大赛—移动应用创新赛(启明赛)的作品说明文档。
    link: /比赛/作品说明文档-初稿
    linkText: 查看
---

## 站点导航

| 你想找什么 | 去哪 |
| --- | --- |
| 为什么 AuraRide 要"一切皆颜色"——产品的灵魂 | [产品 / 一切皆颜色](./产品/一切皆颜色) |
| 14 个页面的全集和未来要加的视图 | [产品 / 产品骨架-信息架构](./产品/产品骨架-信息架构) |
| 比赛节奏、优先级、谁做什么 | [产品 / PRD](./产品/PRD) |
| 文档平台为什么是 VitePress + GH Pages | [决策 / ADR-001](./决策/ADR-001-在线文档平台) |
| iOS 路径为什么选 SwiftUI 重写、为什么不是 Capacitor | [决策 / ADR-002](./决策/ADR-002-iOS交付路径) |
| 当前分支(mvp-a)要做什么、不做什么 | [工程 / ROADMAP-mvp-a](./工程/ROADMAP-mvp-a) |
| 怎么改这个网站上的文档 | [工程 / HOW-TO-EDIT](./工程/HOW-TO-EDIT) |
| 比赛官方"作品说明文档"5 节模板初稿 | [比赛 / 作品说明文档](./比赛/作品说明文档-初稿) |

## 这个站是什么

它是 AuraRide 项目的**协作 wiki**——把所有产品哲学、决策记录、工程笔记、参赛资料都集中在一处,**用 markdown 当源、Git 当版本控制、GitHub Pages 当渲染**,你和陈娟都能在浏览器里看、在 VS Code 里改、在 GitHub 里评论。

每次有人 push 到 `main` 分支,GitHub Actions 自动重新构建发布,通常 2 分钟内你就能在这看到改动。
