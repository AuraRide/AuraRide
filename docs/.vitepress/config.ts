import { defineConfig } from "vitepress";
import { withMermaid } from "vitepress-plugin-mermaid";

// VitePress 站点配置 — 部署到 https://auraride.github.io/AuraRide/
// 任何改动,git push 到 main 后,GH Actions 自动重新构建+发布(见 .github/workflows/docs.yml)

export default withMermaid(
  defineConfig({
    title: "AuraRide",
    description: "情绪驱动的骑行 App · 一切皆颜色",
    lang: "zh-CN",
    base: "/AuraRide/",
    cleanUrls: true,
    lastUpdated: true,
    // Out-of-docs links work in GitHub view but VitePress can't resolve them. Skip:
    //  - ../../X  — links from docs/<sub>/ pointing back to repo root
    //  - ./docs/X / ./guidelines/X / ./.claude/X — root-relative paths inside files
    //    @include'd from repo root (AGENTS.md, README.md etc) into docs/根文档/
    // In-docs dead links still error.
    ignoreDeadLinks: [
      /\.\.\/\.\.\//,
      /^\.\/docs\//,
      /^\.\/guidelines\//,
      /^\.\/\.claude\//,
      /^\.\/(README|AGENTS|CLAUDE|ATTRIBUTIONS)/,
    ],

    head: [
      ["meta", { name: "theme-color", content: "#FF6A5E" }],
      ["meta", { property: "og:title", content: "AuraRide · 把心情骑成一条路线" }],
      ["meta", { property: "og:description", content: "情绪驱动的骑行 App。一切皆颜色。" }],
    ],

    themeConfig: {
      nav: [
        { text: "产品", link: "/产品/一切皆颜色" },
        { text: "决策", link: "/决策/ADR-001-在线文档平台" },
        { text: "工程", link: "/工程/ROADMAP-mvp-a" },
        { text: "比赛", link: "/比赛/作品说明文档-初稿" },
        { text: "根文档", link: "/根文档/README" },
        { text: "GitHub", link: "https://github.com/AuraRide/AuraRide" },
      ],

      sidebar: {
        "/产品/": [
          {
            text: "产品哲学与定义",
            items: [
              { text: "一切皆颜色(manifesto)", link: "/产品/一切皆颜色" },
              { text: "产品骨架 / 信息架构", link: "/产品/产品骨架-信息架构" },
              { text: "PRD(产品需求 + 比赛节奏)", link: "/产品/PRD" },
            ],
          },
        ],
        "/决策/": [
          {
            text: "ADR(Architecture Decision Records)",
            items: [
              { text: "ADR-001 在线文档平台", link: "/决策/ADR-001-在线文档平台" },
              { text: "ADR-002 iOS 交付路径", link: "/决策/ADR-002-iOS交付路径" },
            ],
          },
        ],
        "/工程/": [
          {
            text: "工程与协作",
            items: [
              { text: "mvp-a 路线图", link: "/工程/ROADMAP-mvp-a" },
              { text: "社交化 / 后端契约", link: "/工程/社交化-开发任务拆分" },
              { text: "HOW-TO-EDIT(给陈娟)", link: "/工程/HOW-TO-EDIT" },
            ],
          },
        ],
        "/比赛/": [
          {
            text: "参赛资料",
            items: [{ text: "作品说明文档(初稿)", link: "/比赛/作品说明文档-初稿" }],
          },
        ],
        "/根文档/": [
          {
            text: "仓库根文档(镜像)",
            items: [
              { text: "README · 项目简介", link: "/根文档/README" },
              { text: "AGENTS.md · 给 AI 协作者的约定", link: "/根文档/AGENTS" },
              { text: "CLAUDE.md · 给 Claude Code 的入口", link: "/根文档/CLAUDE" },
              { text: "ATTRIBUTIONS · 致谢", link: "/根文档/ATTRIBUTIONS" },
            ],
          },
        ],
      },

      socialLinks: [{ icon: "github", link: "https://github.com/AuraRide/AuraRide" }],

      // 本地全文搜索(免后端,中文 OK)
      search: {
        provider: "local",
        options: {
          translations: {
            button: { buttonText: "搜索文档", buttonAriaLabel: "搜索文档" },
            modal: {
              displayDetails: "显示详情",
              resetButtonTitle: "清空查询",
              backButtonTitle: "关闭搜索",
              noResultsText: "无结果",
              footer: {
                selectText: "选择",
                selectKeyAriaLabel: "选择",
                navigateText: "切换",
                navigateUpKeyAriaLabel: "上一项",
                navigateDownKeyAriaLabel: "下一项",
                closeText: "关闭",
                closeKeyAriaLabel: "关闭",
              },
            },
          },
        },
      },

      editLink: {
        pattern: "https://github.com/AuraRide/AuraRide/edit/main/docs/:path",
        text: "在 GitHub 上编辑",
      },

      lastUpdated: { text: "最近更新", formatOptions: { dateStyle: "medium", timeStyle: "short" } },
      docFooter: { prev: "上一篇", next: "下一篇" },
      darkModeSwitchLabel: "外观",
      sidebarMenuLabel: "目录",
      returnToTopLabel: "回到顶部",
      langMenuLabel: "选择语言",

      footer: {
        message: "把心情骑成一条路线 · AGPL-style 协作",
        copyright: "© 2026 AuraRide Team",
      },
    },

    // mermaid 渲染选项(题图/暗色友好)
    mermaid: {
      theme: "default",
    },
    mermaidPlugin: {
      class: "mermaid my-class",
    },
  })
);
