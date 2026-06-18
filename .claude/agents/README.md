# .claude/agents/ — 仓库特有子代理

这里放的不是通用 Claude Code agent,而是 **AuraRide 这个仓库专属、把 manifesto/Guidelines 内化进 system prompt 的子代理**。它们是"harness engineering"的一部分:把仓库的不变量沉淀成可复用的 agent,而不是每次会话临场拼装。

## 现有子代理

| 名字 | 用途 | 何时主动用 |
| --- | --- | --- |
| `color-manifesto-guard` | 审计 diff 是否破坏 `docs/产品/一切皆颜色.md` §7 的 9 条工程不变量 | 任何动 `src/app/lib/moodColor.ts`、`src/app/lib/colorEngines/**` 或新增"染色"路径的 PR,合并前都应跑一次 |
| `design-page-reviewer` | 按 `guidelines/Guidelines.md` + manifesto §5 审视一个新页面 | 新增或大改 `src/app/pages/` 下任一文件后 |

## 怎么调用

在主会话里:

```
Agent({
  subagent_type: "color-manifesto-guard",
  description: "Audit color contract for mvp-a branch",
  prompt: "Audit main..HEAD for manifesto §7 violations. Focus on colorEngines/ and any new ColorId references."
})
```

## 加新子代理的判据

不是所有任务都该开一个子代理。新加之前问自己:

1. 它有**仓库特定的不变量**要检查吗?(色卡、信息架构、Guidelines 这种)如果只是通用任务,用 `general-purpose` 或 `Explore` 就好。
2. 它在**未来 3 个月会被重复调用 ≥ 5 次**吗?如果只是一次性,直接在主会话里写 prompt 就行。
3. 它的 system prompt 写下来 ≥ 30 行才说得清吗?如果一行能说清,不需要 agent。

只有三项都"是",才值得新建一个 .md。

## 设计原则(参考 OpenAI harness engineering 的可迁移做法)

- **read-only 默认**:守卫/审视类 agent 只报告,不改文件。让人类(或主 agent)看完再决定。
- **report 格式固定**:每个 agent 在 system prompt 末尾规定输出结构,主 agent 拿到回报后好处理。
- **职责单一**:不要做"既检查颜色又检查设计又跑测试"的全能 agent——会成为黑箱,失败原因不可追溯。
- **不绕开真相源**:agent 的"知识"全部指向 `docs/`、`guidelines/`、`AGENTS.md`,而不是把规则复制进 system prompt。规则改了,真相源改一处就行。
