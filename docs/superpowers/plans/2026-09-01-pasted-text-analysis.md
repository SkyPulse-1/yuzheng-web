# 粘贴文字分析测试功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在知识库文档上传区域下方增加一个不保存原文和结果、但会真实调用现有 HiAgent 对话 API 的粘贴文字分析测试功能。

**Architecture:** 新建纯逻辑服务模块负责输入校验、分析查询构造和状态映射；新的 Next.js API 路由负责登录、Supabase 知识库访问校验和 HiAgent 适配。独立客户端卡片负责输入、请求、结果和错误状态，并由知识库详情页组合到文档模块下方。

**Tech Stack:** Next.js 16.3.3、React 19、TypeScript、Tailwind CSS、Vitest、Testing Library、Supabase、现有 HiAgent 客户端

**Spec:** `docs/superpowers/specs/2026-09-01-pasted-text-analysis-design.md`

## Global Constraints

- 粘贴文字最多 8000 个字符。
- 语证应用不把原文或结果写入 Supabase、Storage、日志或 Git。
- 不读取、展示或修改 `.env.local` 中的密钥值。
- 不修改 HiAgent 后台配置，不接入文件上传服务。
- 页面不显示“提示词”“Prompt”或内部分析指令。
- 测试调用只使用模拟数据；真实文字由用户在页面中亲自提交。
- 保留用户现有文件和未关联改动，不执行删除或覆盖操作。

---

### Task 1: 文字分析服务逻辑

**Files:**
- Create: `src/lib/text-analysis.ts`
- Test: `tests/text-analysis/service.test.ts`

**Interfaces:**
- Produces: `PASTED_TEXT_LIMIT`、`analyzePastedTextRequest(input, dependencies)`、`TextAnalysisResponse`。
- Consumes: 注入的知识库访问检查、HiAgent 配置检查、对话创建和文本分析函数。

- [ ] **Step 1: 写入输入边界和接口行为的失败测试**

测试必须断言：未登录返回 `401`；空文本和 8001 字返回 `400`；不可访问知识库返回 `404`；未配置 HiAgent 返回 `503`；成功时返回 `200` 和答案；异常返回 `502`；发送给 HiAgent 的查询包含四段分析要求和用户原文。

- [ ] **Step 2: 运行目标测试确认失败**

Run:

```powershell
npx vitest run tests/text-analysis/service.test.ts
```

Expected: 因 `src/lib/text-analysis.ts` 尚不存在而失败。

- [ ] **Step 3: 实现最小服务模块**

`analyzePastedTextRequest` 接收：

```ts
type TextAnalysisRequestInput = {
  userId?: string;
  body: unknown;
};
```

依赖接口：

```ts
type TextAnalysisDependencies = {
  libraryExists: (libraryId: string) => Promise<boolean>;
  isHiAgentConfigured: () => boolean;
  createConversation: (userId: string) => Promise<string>;
  analyze: (input: { userId: string; conversationId: string; query: string }) => Promise<string>;
};
```

返回：

```ts
type TextAnalysisResponse = {
  status: 200 | 400 | 401 | 404 | 502 | 503;
  body: { answer?: string; error?: string };
};
```

固定查询明确要求输出“内容摘要、关键观点、可核验的原文依据、信息不足或歧义”，并禁止补充原文之外的事实。

- [ ] **Step 4: 运行目标测试确认通过**

Run:

```powershell
npx vitest run tests/text-analysis/service.test.ts
```

Expected: 全部通过。

- [ ] **Step 5: 提交服务模块**

```powershell
git add src/lib/text-analysis.ts tests/text-analysis/service.test.ts
git commit -m "feat: add pasted text analysis service"
```

### Task 2: 受保护的文字分析 API

**Files:**
- Create: `src/app/api/text-analysis/route.ts`
- Modify: `tests/text-analysis/service.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `analyzePastedTextRequest`。
- Produces: `POST /api/text-analysis`，成功响应 `{ answer }`，失败响应 `{ error }`。

- [ ] **Step 1: 增加适配器行为测试**

在服务测试中增加断言：成功请求只调用一次 `createConversation` 和一次 `analyze`；服务模块不包含数据库保存依赖；返回值只包含 `answer`。

- [ ] **Step 2: 运行目标测试确认通过现有服务约束**

Run:

```powershell
npx vitest run tests/text-analysis/service.test.ts
```

Expected: 全部通过。

- [ ] **Step 3: 创建 Next.js 路由适配器**

路由必须：

```ts
const supabase = await createClient();
const { data: auth } = await supabase.auth.getUser();
```

知识库访问使用当前登录会话的 Supabase 客户端查询 `libraries.id`；HiAgent 依赖分别适配到 `isHiAgentConfigured`、`createHiAgentConversation` 和 `chatWithHiAgent`。路由不得执行任何 `insert`、`update`、`upsert`、Storage 调用或日志输出。

- [ ] **Step 4: 静态检查路由没有保存操作**

Run:

```powershell
rg -n "insert\(|update\(|upsert\(|storage\.|console\." src/app/api/text-analysis/route.ts
```

Expected: 无输出。

- [ ] **Step 5: 提交 API 路由**

```powershell
git add src/app/api/text-analysis/route.ts tests/text-analysis/service.test.ts
git commit -m "feat: expose pasted text analysis api"
```

### Task 3: 粘贴文字分析卡片

**Files:**
- Create: `src/components/documents/pasted-text-analysis.tsx`
- Modify: `src/app/libraries/[id]/page.tsx`
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `tests/components/pasted-text-analysis.test.tsx`

**Interfaces:**
- Consumes: `libraryId: string` 和 `POST /api/text-analysis`。
- Produces: 文档模块下方的独立测试卡片。

- [ ] **Step 1: 安装组件测试依赖**

Run:

```powershell
npm install --save-dev @testing-library/react @testing-library/user-event jsdom
```

Expected: 依赖只加入 `devDependencies`，审计无高危漏洞。

- [ ] **Step 2: 写入组件失败测试**

使用 `// @vitest-environment jsdom`，覆盖：标题与测试标识；8000 字计数；空文本按钮禁用；请求期间按钮禁用；成功显示回答；失败保留输入并显示中文错误；清空内容移除原文和结果。

- [ ] **Step 3: 运行组件测试确认失败**

Run:

```powershell
npx vitest run tests/components/pasted-text-analysis.test.tsx
```

Expected: 因组件尚不存在而失败。

- [ ] **Step 4: 实现卡片并接入知识库页面**

卡片使用现有 `surface-card`、`primary-button`、石色边框和琥珀色状态样式。`textarea` 使用 `maxLength={PASTED_TEXT_LIMIT}`，提交体为 `{ libraryId, text }`，结果以 `whitespace-pre-wrap` 安全显示。知识库详情页在 `<DocumentManager />` 后渲染 `<PastedTextAnalysis libraryId={id} />`。

- [ ] **Step 5: 运行组件测试确认通过**

Run:

```powershell
npx vitest run tests/components/pasted-text-analysis.test.tsx
```

Expected: 全部通过。

- [ ] **Step 6: 提交界面功能**

```powershell
git add package.json package-lock.json src/components/documents/pasted-text-analysis.tsx "src/app/libraries/[id]/page.tsx" tests/components/pasted-text-analysis.test.tsx
git commit -m "feat: add pasted text analysis test card"
```

### Task 4: 完整验证与本地交付

**Files:**
- Verify: 全部项目文件
- Preserve: `.env.local`、`tmp/` 和用户其他文件

**Interfaces:**
- Consumes: Tasks 1–3 的完整实现。
- Produces: 通过测试、Lint、生产构建和浏览器视觉检查的本地测试页面。

- [ ] **Step 1: 运行完整测试**

Run:

```powershell
npm test
```

Expected: 原有 36 项和新增文字分析测试全部通过。

- [ ] **Step 2: 运行代码检查和生产构建**

Run:

```powershell
npm run lint
npm run build
```

Expected: 两个命令退出码均为 0，构建路由包含 `/api/text-analysis`。

- [ ] **Step 3: 启动或刷新本地开发服务器**

Run:

```powershell
npm run dev -- -p 3100
```

Expected: `http://localhost:3100/` 返回 200。

- [ ] **Step 4: 浏览器视觉检查**

登录后打开一个知识库详情页，确认卡片位于文档模块下方、桌面和窄屏布局清晰、字符计数与按钮状态正确。不要自动提交真实文字；用户在页面中亲自进行 HiAgent 实测。
