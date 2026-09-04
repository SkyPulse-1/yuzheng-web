# 首页最近研究展示修复 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页稳定展示真实的最近研究摘要，并把背景书页改成不承载具体研究内容的抽象装饰。

**Architecture:** 扩展现有 `HomeResearchWorkspace` 视图模型，使它携带最新助手消息的安全摘要；仍只在证据卡能映射到同一知识库的本地未删除文档时生成来源链接。展示组件分别处理“已验证证据”和“真实回答但无可靠来源”两种状态，背景资产只保留抽象视觉信息。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Supabase、Vitest、Testing Library、Tailwind CSS 4 与项目全局 CSS。

**Spec:** `docs/superpowers/specs/2026-09-05-home-recent-research-design.md`

## Global Constraints

- 不修改 Supabase schema、RLS、HiAgent 协议或文档状态机。
- 不用示例内容冒充用户研究，不为缺少可靠映射的回答生成来源链接。
- 首页最多展示三个最近完成的工作台，轮换周期保持 20 秒。
- 背景装饰不显示具体论文、课本、问题或回答文字。
- 保持 `prefers-reduced-motion` 支持。

---

### Task 1: 扩展最近研究视图模型

**Files:**
- Modify: `tests/evidence/evidence-views.test.ts`
- Modify: `src/lib/evidence-views.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: Supabase `messages` 行中的 `content`、`evidence_cards_json`、`created_at`。
- Produces: `HomeResearchWorkspace.answerSummary: string | null`。

- [ ] **Step 1: 写失败测试**

在测试消息中加入 `content`，断言最新消息会生成去除多余空白且长度受限的 `answerSummary`；无消息内容时为 `null`。

- [ ] **Step 2: 运行定向测试并确认失败**

Run: `npm test -- tests/evidence/evidence-views.test.ts`

Expected: FAIL，因为视图模型尚无 `answerSummary`。

- [ ] **Step 3: 实现最小数据改动**

在 `HomeMessageRow` 增加 `content: string | null`，新增纯函数：

```ts
export function summarizeRecentAnswer(content: string | null | undefined, maxLength = 180): string | null
```

该函数把连续空白折叠为单个空格，空内容返回 `null`，超长内容在不超过 `maxLength` 的位置加省略号。`buildRecentResearchWorkspaces` 将最新助手消息摘要写入 `answerSummary`。首页查询把 `content` 加入 select。

- [ ] **Step 4: 运行定向测试并确认通过**

Run: `npm test -- tests/evidence/evidence-views.test.ts`

Expected: PASS。

---

### Task 2: 展示真实回答摘要与来源状态

**Files:**
- Modify: `tests/components/recent-evidence-carousel.test.tsx`
- Modify: `src/components/home/recent-evidence-carousel.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `HomeResearchWorkspace.answerSummary`、`card`、`sourceHref`。
- Produces: 已验证证据卡，或不含来源链接的真实回答摘要卡。

- [ ] **Step 1: 写失败测试**

添加一个 `card: null`、`sourceHref: null`、`answerSummary` 有真实内容的工作台，断言摘要可见、状态文案为“尚未形成可回溯证据”、没有“查看原文”，并可通过“继续研究”进入对应工作台。

- [ ] **Step 2: 运行定向测试并确认失败**

Run: `npm test -- tests/components/recent-evidence-carousel.test.tsx`

Expected: FAIL，因为当前无来源分支只显示通用空状态。

- [ ] **Step 3: 实现摘要卡**

保留有证据卡时的布局；在没有可靠证据但存在 `answerSummary` 时，使用同一张卡的标题、正文、状态徽标和底部入口展示真实回答。状态徽标使用中性色，不渲染来源文档或原文链接。完全没有回答内容时才显示原有空状态。

- [ ] **Step 4: 运行组件测试并确认通过**

Run: `npm test -- tests/components/recent-evidence-carousel.test.tsx`

Expected: PASS。

---

### Task 3: 抽象化背景并完成验证

**Files:**
- Modify: `src/components/home/recent-evidence-carousel.tsx`
- Modify: `src/app/globals.css`
- Create: `public/assets/research-document-backdrop-abstract.svg`

**Interfaces:**
- Consumes: 静态装饰资产。
- Produces: 无具体标题和正文的抽象双页纸张背景。

- [ ] **Step 1: 创建抽象背景资产**

用 SVG 绘制两张错开的米白纸页、低对比度行纹、索引点和页码符号。SVG 不包含具体研究标题、问题或结论。

- [ ] **Step 2: 替换组件引用并微调样式**

将背景路径改为 `/assets/research-document-backdrop-abstract.svg`，保持 `aria-hidden`、不可交互与现有响应式位置；调整透明度确保最近研究卡片始终是最高视觉层级。

- [ ] **Step 3: 运行全部自动验证**

Run:

```bash
npm test
npm run lint
npm run build
```

Expected: 现有测试和新增测试全部通过，lint 与 production build 成功。

- [ ] **Step 4: 浏览器视觉验收**

在桌面与窄屏下检查：最近研究标题、真实问题与回答摘要可读；来源按钮只在可靠来源存在时出现；背景不含具体文字；轮换、悬停暂停和 reduced motion 行为正常。

- [ ] **Step 5: 提交并推送当前功能分支**

```bash
git add src/app/page.tsx src/lib/evidence-views.ts src/components/home/recent-evidence-carousel.tsx src/app/globals.css public/assets/research-document-backdrop-abstract.svg tests/evidence/evidence-views.test.ts tests/components/recent-evidence-carousel.test.tsx
git commit -m "fix: surface real recent research summaries"
git push origin feat/hiagent-supported-basic-product
```

---

### Task 4: 部署与公网验证

**Files:**
- No source changes expected.

**Interfaces:**
- Consumes: 已关联的 EdgeOne Makers 项目 `yuzheng-web-preview` 与当前功能分支构建产物。
- Produces: EdgeOne Preview HTTPS URL。

- [ ] **Step 1: 部署 Preview**

Run: `edgeone makers deploy -n yuzheng-web-preview -e preview --json`

Expected: 返回成功部署记录和 HTTPS URL；不得触发购买或套餐升级。

- [ ] **Step 2: 回填站点地址**

把生成的 HTTPS URL 作为 EdgeOne 环境变量 `NEXT_PUBLIC_SITE_URL`，不写入源码或 Git，然后重新部署 Preview。

- [ ] **Step 3: 公网验收**

检查 `/`、`/login`、`/libraries` 和一个受保护 Route Handler；确认静态资源、CSS、JS、Supabase Auth 请求与服务端 Route Handler 行为。未能验证的学校文档处理与 HiAgent 请求必须明确记录为未验证，不伪造成功。

- [ ] **Step 4: 记录安全和访问边界**

确认部署中没有 `.env.local`、真实密钥或本地缓存；说明 EdgeOne 免费测试域名的普通 HTTPS 可访问性与正式中国大陆备案加速不是同一件事。
