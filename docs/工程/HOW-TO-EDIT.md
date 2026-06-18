# HOW-TO-EDIT · 怎么改这个文档站

> 这份给陈娟。三种改文档的方式,**按"今天就想改"还是"我要慢慢调"选**。
> 改完 commit + push,GH Actions 自动把网站重新构建发布(2 分钟内生效)。

---

## 方式 1:在浏览器里直接改(最快,适合临时小修)

每篇文档右下角有 **"在 GitHub 上编辑"** 链接。点进去:

1. 进入 GitHub 的文件页,右上有铅笔图标点一下
2. 在浏览器里改 markdown,**右上角预览能看到渲染效果**
3. 拉到最下面填一句 commit 信息("修正 manifesto 第 3 节错字"这种)
4. 选"Commit directly to the main branch"(我们俩都是 owner,可以直接推)
5. **2 分钟后**网站自动更新

适合:错别字、小改动、临时补一个想法。
不适合:大改、加图、改多个文件。

---

## 方式 2:VS Code 本地改(适合大改 + 加图)

### 第一次要做的(只做一次):

```bash
# 1. clone 仓库
git clone git@github.com:AuraRide/AuraRide.git
cd AuraRide

# 2. 装依赖(pnpm 是包管理器,首次要先装它)
corepack enable pnpm
pnpm install

# 3. 启动文档本地预览
pnpm docs:dev
# 浏览器自动打开 http://localhost:5173,你改 markdown 它实时刷新
```

### 之后每次改文档:

```bash
git pull           # 拉取最新
# 用 VS Code 打开 docs/ 下任意 .md 文件改
# 启动本地预览看效果
pnpm docs:dev
# 改好了
git add docs/
git commit -m "改了什么"
git push
```

VS Code 推荐装插件:**Markdown All in One**(自动补全列表/表格/标题),**Mermaid Preview**(看 mermaid 图实时效果)。

---

## 方式 3:GitHub Web UI 全功能(介于 1 和 2 之间)

在 https://github.com/AuraRide/AuraRide 里:
- 按 `.` 键(英文句号)→ 浏览器进入 **github.dev** 网页版 VS Code
- 直接改任意文件、git commit、push,完全不用本地装
- 适合:在别人电脑上、出门在外、改一组相关文件

---

## 怎么加图片

1. 把图片放到 `docs/public/images/` 下对应子目录:
   - `manifesto/` — manifesto 用的图
   - `design/` — 设计稿、截图
   - `poster/` — 比赛海报、分享图
2. 在 markdown 里引用,**用绝对路径**(以 `/` 开头):
   ```markdown
   ![描述文字](/AuraRide/images/manifesto/三层结构.png)
   ```
   注意 base path 是 `/AuraRide/`,因为部署在 `auraride.github.io/AuraRide/` 下。

---

## 怎么插流程图(mermaid)

直接在 markdown 里写:

````markdown
```mermaid
flowchart LR
    A[写心情] --> B[颜色揭晓]
    B --> C[路线推荐]
    C --> D[骑行中]
    D --> E[回顾]
```
````

效果(站上自动渲染成图):

```mermaid
flowchart LR
    A[写心情] --> B[颜色揭晓]
    B --> C[路线推荐]
    C --> D[骑行中]
    D --> E[回顾]
```

更多语法:[Mermaid 中文文档](https://mermaid.js.org/intro/)。常用图:
- `flowchart` — 流程图(箭头连)
- `sequenceDiagram` — 时序图(谁先做什么后做什么)
- `stateDiagram` — 状态图(切换)
- `erDiagram` — 实体关系图(数据)
- `gantt` — 甘特图(时间线)
- `mindmap` — 思维导图

---

## 文档放在哪里

```
docs/
├── 产品/       ← 哲学和定义(陈娟主阵地)
├── 决策/       ← ADR
├── 工程/       ← 给开发/agent 看
├── 比赛/       ← 参赛资料
├── public/     ← 图片、字体、favicon
└── index.md    ← 站点首页
```

新文档,看属于哪一类,放对应文件夹。**新文档必须在 [`docs/.vitepress/config.ts`](../../docs/.vitepress/config.ts) 的 sidebar 里加一行**,否则侧边栏看不到——告诉技术同学(我)帮你加。

---

## 紧急情况

- 网站打不开 → 看 https://github.com/AuraRide/AuraRide/actions ,看最新一次 build 是不是红了
- 改完了不显示 → 通常是 build 还没跑完,等 1–2 分钟;或浏览器强制刷新(Cmd+Shift+R)
- markdown 在浏览器里看着对、发布后乱了 → 多半是用了非标准 markdown 语法,直接问技术同学
