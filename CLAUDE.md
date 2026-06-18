# CLAUDE.md

Claude Code 启动时会自动加载本文件。下方的 `@` import 会把 **AGENTS.md** 的全部内容强制拉入上下文 —— 让本仓库对 Claude Code 与 Codex 共用同一份约定(单一真相源)。

**所有工作约定、黄金法则与验证回路,均以 AGENTS.md 为准:**

@AGENTS.md

---

## Claude Code 专属提示

- 修改后,运行 AGENTS.md「验证回路」一节的命令自检(`pnpm typecheck` → `pnpm build`),不要跳过。
- 需要把项目跑起来时,优先用 `.claude/launch.json` 里的 `auraride` 配置(Vite,端口 5173)。
- 更新约定时改 **AGENTS.md**(真相源),不要在本文件里另写一份,避免两边漂移。
