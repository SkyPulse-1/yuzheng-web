# 语证首页“数字研究台”实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已确认的首页设计稿实现为响应式、可交互、可测试的语证首页，同时保留现有认证、最近证据查询和文件原文入口。

**Architecture:** 服务端首页继续负责认证与最近证据读取；客户端 `RecentEvidenceCarousel` 承担研究台呈现、轮播和指针光泽。视觉样式集中在现有 Tailwind/CSS 设计层，不新增依赖或后端接口。

**Tech Stack:** Next.js 16 App Router、React 19、TypeScript、Tailwind CSS 4、Vitest、Testing Library。

**Spec:** `docs/superpowers/specs/2026-09-01-home-digital-research-desk-design.md`

## Global Constraints

- 不修改 Supabase、HiAgent、认证或最近证据查询的数据契约。
- 不新增运行时依赖，不创建新路由，不部署。
- 不在客户端代码中读取或呈现服务端密钥。
- 保持示例证据卡和真实证据卡的五秒轮播、暂停与手动切换能力。
- 所有动效遵循 `prefers-reduced-motion`。
- 不删除或提交现有未跟踪的 `artifacts/` 审计目录。

---

### Task 1: 锁定研究台组件行为

**Files:**
- Create: `tests/components/recent-evidence-carousel.test.tsx`
- Modify: `src/components/home/recent-evidence-carousel.tsx`

**Interfaces:**
- Consumes: `EvidenceCard[]` 和 `EvidenceCard.document_id`。
- Produces: `RecentEvidenceCarousel({ cards }: { cards: EvidenceCard[] })`，包含最近研究标题、证据内容、来源链接和可访问轮播点。

- [ ] **Step 1: 写失败测试**

```tsx
// @vitest-environment jsdom
render(<RecentEvidenceCarousel cards={[]} />);
expect(screen.getByText("最近研究")).toBeTruthy();
expect(screen.getByText("长征战略意义比较")).toBeTruthy();
expect(screen.getByText("原文证据")).toBeTruthy();
```

再渲染两张真实卡，断言手动点击“第 2 张证据”后标题和来源切换，并断言有 `document_id` 时存在“查看原文”链接。

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- tests/components/recent-evidence-carousel.test.tsx`

Expected: FAIL，因为现有组件没有“最近研究”研究台语义和新的进度点标签。

- [ ] **Step 3: 实现最小研究台结构**

把现有单卡容器调整为三层研究台：背景资料层、玻璃工作台、前景证据卡。保留已有轮播定时器、暂停、减少动效和原文链接逻辑，并增加局部指针光泽 CSS 变量更新。

- [ ] **Step 4: 运行组件测试**

Run: `npm test -- tests/components/recent-evidence-carousel.test.tsx`

Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add tests/components/recent-evidence-carousel.test.tsx src/components/home/recent-evidence-carousel.tsx
git commit -m "feat: build digital evidence research desk"
```

### Task 2: 实现首页结构与视觉层级

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/app/globals.css`

**Interfaces:**
- Consumes: `destination`、`loggedIn`、`recentCards` 和 Task 1 的 `RecentEvidenceCarousel`。
- Produces: 语义明确的首页导航、主视觉、两个 CTA、研究台和原则区。

- [ ] **Step 1: 写静态结构测试**

在 `tests/components/recent-evidence-carousel.test.tsx` 补充研究台所需可访问名称断言；首页服务端数据逻辑通过 TypeScript 和生产构建验证，不模拟 Supabase 服务端模块。

- [ ] **Step 2: 更新首页文案与布局**

在 `src/app/page.tsx` 使用已确认文案：眉题“个人证据研究台”、主标题“让每一个结论，都能回到原文。”、说明文案和两个入口。原则区保持一个共同表面，以细分隔线组织三项。

- [ ] **Step 3: 增加响应式与动效样式**

在 `src/app/globals.css` 增加 `home-shell`、`home-hero`、`research-desk`、`research-paper-layer`、`research-card`、`home-principles` 等可复用类；确保 1440、1024 和 390 宽度均不溢出，并在减少动效模式关闭过渡。

- [ ] **Step 4: 运行静态检查**

Run: `npm run lint`

Run: `npx tsc --noEmit`

Expected: 两条命令均成功退出。

- [ ] **Step 5: 提交**

```bash
git add src/app/page.tsx src/app/globals.css
git commit -m "feat: redesign homepage as digital research desk"
```

### Task 3: 全量回归与视觉验收

**Files:**
- Create: `design-qa.md`
- Create/Update: `artifacts/design-audit/home-digital-research-desk.png`（仅本地审计，不提交）

**Interfaces:**
- Consumes: 已确认设计图和本地渲染首页。
- Produces: 可复查的设计 QA 结论与保持运行的本地预览。

- [ ] **Step 1: 跑完整自动化验证**

Run: `npm test`

Run: `npm run lint`

Run: `npx tsc --noEmit`

Run: `npm run build`

Expected: 测试、ESLint、TypeScript 和生产构建全部通过。

- [ ] **Step 2: 启动本地预览**

Run: `npm run dev -- --port 3100`

Expected: 首页可在 `http://localhost:3100/` 打开。

- [ ] **Step 3: 在用户选择的应用内浏览器验收**

分别检查桌面与移动视口，验证主按钮、辅助锚点、最近证据切换、暂停、来源链接和键盘焦点。保存同视口截图。

- [ ] **Step 4: 完成设计对照检查**

对照 `docs/design/yuzheng-home-digital-research-desk-v1.png` 检查层级、留白、字体、卡片比例、边缘、圆角和响应式。把问题与修正结果写入 `design-qa.md`，最终必须包含 `final result: passed`。

- [ ] **Step 5: 提交验收记录**

```bash
git add design-qa.md
git commit -m "test: verify digital research desk homepage"
```
