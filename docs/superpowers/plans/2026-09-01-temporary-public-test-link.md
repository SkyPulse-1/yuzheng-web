# 语证临时公网测试链接 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在不正式部署、不泄露任何密钥的前提下，为当前语证生产构建生成一个测试者可直接打开的临时 HTTPS 地址。

**Architecture:** 本机运行 Next.js 生产服务，仅监听独立端口 `3200`。Cloudflare Quick Tunnel 通过出站连接把随机 `trycloudflare.com` HTTPS 地址转发到该端口；Supabase 和 HiAgent 配置继续仅由本机服务端读取。

**Tech Stack:** Next.js 16.3.3、Node.js、npm、Vitest、Cloudflare Wrangler Quick Tunnel、PowerShell

**Spec:** `docs/superpowers/specs/2026-09-01-temporary-public-test-link-design.md`

## Global Constraints

- 不读取、复制、输出、提交或传输 `.env.local` 中任何变量值。
- 不删除或覆盖用户文件；运行日志只写入 `C:\Users\huang\AppData\Local\Temp\yuzheng-web-public-test\`。
- 不修改 HiAgent、Supabase 或 GitHub 上的配置与数据。
- 只暴露本机 `127.0.0.1:3200` 的 Next.js 生产服务，不暴露开发服务器或其他端口。
- 不在自动验证中注册账号、登录账号或上传文件；涉及这些外部数据写入时由用户或测试者操作。
- 临时链接只用于测试，正式部署仍等待用户最终确认。

---

### Task 1: 生产发布前检查

**Files:**
- Read: `src/app/api/**/*.ts`
- Read: `src/app/login/actions.ts`
- Read: `supabase/migrations/*.sql`
- Preserve: `.env.local`

**Interfaces:**
- Consumes: 当前 `feat/hiagent-supported-basic-product` 分支和已有依赖。
- Produces: 通过测试、代码检查、生产构建及接口登录保护检查的 `.next` 输出。

- [ ] **Step 1: 确认工作区状态且不读取环境变量值**

Run:

```powershell
git status --short
git branch --show-current
```

Expected: 分支为 `feat/hiagent-supported-basic-product`，除本计划文档外没有未说明改动。

- [ ] **Step 2: 确认全部业务 API 在访问数据前验证用户**

Run:

```powershell
rg -L "auth\.getUser\(" src/app/api -g "route.ts"
```

Expected: 不输出业务 API 路由；若有输出，停止公网分享并检查该路由。

- [ ] **Step 3: 运行自动测试**

Run:

```powershell
npm test
```

Expected: 8 个测试文件、36 项测试全部通过。

- [ ] **Step 4: 运行代码检查**

Run:

```powershell
npm run lint
```

Expected: 退出码为 0，无 ESLint 错误。

- [ ] **Step 5: 生成生产构建**

Run:

```powershell
npm run build
```

Expected: Next.js 构建成功，所有页面与 API 路由生成完成。

### Task 2: 启动本机生产源站

**Files:**
- Create at runtime: `C:\Users\huang\AppData\Local\Temp\yuzheng-web-public-test\next.out.log`
- Create at runtime: `C:\Users\huang\AppData\Local\Temp\yuzheng-web-public-test\next.err.log`
- Preserve: `.env.local`

**Interfaces:**
- Consumes: Task 1 生成的 `.next` 构建。
- Produces: 仅供隧道访问的 `http://127.0.0.1:3200` 生产服务和进程 ID。

- [ ] **Step 1: 检查端口没有被其他进程占用**

Run:

```powershell
Get-NetTCPConnection -LocalPort 3200 -State Listen -ErrorAction SilentlyContinue
```

Expected: 无输出；若已有语证生产服务，验证后复用，不结束未知进程。

- [ ] **Step 2: 在隐藏窗口启动生产服务**

Run:

```powershell
$testRuntimeDir = 'C:\Users\huang\AppData\Local\Temp\yuzheng-web-public-test'
New-Item -ItemType Directory -Force -Path $testRuntimeDir | Out-Null
$npmPath = (Get-Command npm.cmd).Source
Start-Process -FilePath $npmPath -ArgumentList @('run','start','--','-H','127.0.0.1','-p','3200') -WorkingDirectory (Get-Location) -RedirectStandardOutput (Join-Path $testRuntimeDir 'next.out.log') -RedirectStandardError (Join-Path $testRuntimeDir 'next.err.log') -WindowStyle Hidden -PassThru
```

Expected: 返回 Next.js 生产服务进程，日志出现 `Ready`。

- [ ] **Step 3: 验证本机源站**

Run:

```powershell
(Invoke-WebRequest -Uri 'http://127.0.0.1:3200/' -UseBasicParsing -TimeoutSec 10).StatusCode
```

Expected: `200`。

### Task 3: 创建临时 HTTPS 隧道

**Files:**
- Create at runtime: `C:\Users\huang\AppData\Local\Temp\yuzheng-web-public-test\tunnel.out.log`
- Create at runtime: `C:\Users\huang\AppData\Local\Temp\yuzheng-web-public-test\tunnel.err.log`

**Interfaces:**
- Consumes: Task 2 的 `http://127.0.0.1:3200`。
- Produces: 一个随机 `https://*.trycloudflare.com` 地址和隧道进程 ID。

- [ ] **Step 1: 使用 npm 临时缓存启动官方 Quick Tunnel 工具**

Run:

```powershell
$testRuntimeDir = 'C:\Users\huang\AppData\Local\Temp\yuzheng-web-public-test'
$npxPath = (Get-Command npx.cmd).Source
Start-Process -FilePath $npxPath -ArgumentList @('--yes','wrangler@latest','tunnel','quick-start','http://127.0.0.1:3200') -WorkingDirectory (Get-Location) -RedirectStandardOutput (Join-Path $testRuntimeDir 'tunnel.out.log') -RedirectStandardError (Join-Path $testRuntimeDir 'tunnel.err.log') -WindowStyle Hidden -PassThru
```

Expected: 进程保持运行，日志出现随机 `https://*.trycloudflare.com` 地址；项目依赖和 `package.json` 不发生变化。

- [ ] **Step 2: 从日志中提取临时地址**

Run:

```powershell
$logs = Get-Content 'C:\Users\huang\AppData\Local\Temp\yuzheng-web-public-test\tunnel*.log' -Raw
[regex]::Match($logs, 'https://[a-z0-9-]+\.trycloudflare\.com').Value
```

Expected: 输出一个 HTTPS 地址，不输出任何环境变量或密钥。

### Task 4: 公网只读验证与交付

**Files:**
- Read: 临时公网首页和未登录页面。
- Preserve: 所有本地和远程用户数据。

**Interfaces:**
- Consumes: Task 3 的临时 HTTPS 地址。
- Produces: 已验证可打开的测试链接、使用限制和停止条件。

- [ ] **Step 1: 验证公网首页返回成功**

Run:

```powershell
(Invoke-WebRequest -Uri $publicTestUrl -UseBasicParsing -TimeoutSec 20).StatusCode
```

Expected: `200`。

- [ ] **Step 2: 验证未登录访问工作区不会返回私有内容**

Run:

```powershell
$response = Invoke-WebRequest -Uri ($publicTestUrl + '/dashboard') -UseBasicParsing -MaximumRedirection 0 -SkipHttpErrorCheck
$response.StatusCode
$response.Headers.Location
```

Expected: 跳转至登录页，或返回不包含 Library、文档及证据数据的未登录页面。

- [ ] **Step 3: 在浏览器打开并保留临时首页**

Expected: 页面标题为“语证｜可溯源学术证据工具”，首页布局正常，不执行注册、登录或文件上传。

- [ ] **Step 4: 向用户交付链接和限制**

Expected: 明确说明电脑需保持开机、链接为临时链接、HiAgent 文档处理尚未接通、测试者应使用独立账号和非敏感测试文件。
