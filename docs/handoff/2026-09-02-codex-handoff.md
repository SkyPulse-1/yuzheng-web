# 语证 · 2026-09-02 本次会话交接（Codex → 下一个模型）

这份文档记录本次会话（从 `b08de2d` 之后）做了什么，便于下一个模型无缝接手。真实代码和 migration 仍是最高事实来源；本文件与代码冲突时以代码为准。

## 0. 一句话总结

把「文件只能安全保存、不能分析」补齐为「文件可上传到学校 HiAgent 并参与证据问答」，同时修复了文档写权限安全漏洞、HiAgent 请求缺 `AppKey` 的问题、研究卡片删除键，并把研究卡片/详情弹窗的样式对齐“内容摘要”卡片。

## 1. 本次会话的 Git 提交

按时间顺序：

1. `a9e2cda` fix: harden document writes and bind storage uploads
2. `73b9987` feat: add HiAgent up-upload client
3. `70abbbc` fix: include HiAgent AppKey in chat requests
4. `05f63fd` fix: grant service_role access to documents
5. `fc713d5` fix: make research card delete button work inline
6. `e059541` feat: enable file analysis via HiAgent up-upload
7. `781fbc7` style: align research card with analysis card
8. `b68de05` style: match research card layout to analysis card
9. `d00a08c` style: align question detail dialog with analysis dialog

当前 HEAD：`d00a08c`。分支 `feat/hiagent-supported-basic-product` 领先 `origin` 若干提交，尚未 push，也未 merge（PR #3 仍 open）。

## 2. 改动文件清单

新增：

- `src/lib/supabase/service.ts`
- `src/lib/hiagent/up-upload.ts`
- `src/lib/hiagent/file-ingestion.ts`
- `supabase/migrations/202609020001_harden_document_writes.sql`
- `supabase/migrations/202609020002_grant_documents_to_service_role.sql`
- `tests/hiagent/up-upload.test.ts`

修改：

- `.env.example`
- `src/lib/hiagent/client.ts`
- `src/lib/single-source-analysis.ts`
- `src/lib/assistant-sources.ts`
- 12 个 API route（`chat`、`analyze-source`、`analyze-text`、`complete`、`ingest`、`restore`、`status`、`text-source`、`documents/[id]`、`libraries/[id]/documents`、`libraries/[id]/text-sources`，以及 `chat` 中的文档锁）
- `src/components/assistant/assistant-workspace.tsx`
- `src/components/assistant/question-card.tsx`
- `src/components/assistant/question-detail-dialog.tsx`
- `tests/hiagent/client.test.ts`
- `tests/assistant/sources.test.ts`

## 3. 每个改动的作用

### 3.1 文档写权限安全加固（`a9e2cda` + `05f63fd`）

- 新增 migration `202609020001`：收回 `authenticated` 对 `documents` 表的 `insert/update/delete`，把 Storage 上传绑定到「当前用户拥有的、状态为 UPLOADING、路径精确匹配」的文档记录；并把 `documents` 写权限授予 `service_role`。
- 新增 `src/lib/supabase/service.ts`：`createServiceClient()`（用 `SUPABASE_SECRET_KEY` 的服务端写库客户端）。
- 把所有 `documents` 写操作从用户会话客户端改为 service-role 客户端，并补显式 `owner_id` 校验。
- **重要**：`202609020002` 单独补 `grant select, insert, update, delete on public.documents to service_role;`（因为 Supabase 默认不给 service_role 表权限）。如果线上/新环境还没跑这条，文档写操作会报 `permission denied for table documents`。

### 3.2 HiAgent up-upload 客户端（`73b9987`）

- `src/lib/hiagent/up-upload.ts`：火山 SignerV4 签名的 `UploadRaw`（`POST /up?Action=UploadRaw&Version=2022-01-01`，service=`up`，region=`cn-north-1`），返回 `Path/Size/Sha256/ShortLink/PresignKey`。
- 依赖 `VOLCENGINE_ACCESS_KEY_ID` / `VOLCENGINE_SECRET_ACCESS_KEY` 和 `HIAGENT_UP_UPLOAD_ENDPOINT`。

### 3.3 HiAgent 请求补 `AppKey`（`70abbbc`）

- `src/lib/hiagent/client.ts` 现在读 `HIAGENT_APP_ID`，在 `create_conversation` 和 `chat_query_v2` 请求体里发 `AppKey`，并把请求头从 `ApiKey` 对齐为官方 SDK 的 `Apikey`。
- 此前缺少 `AppKey`，真实 HiAgent 聊天根本不通；本会话用官方 SDK 实测确认了这一点。

### 3.4 文件分析打通（`e059541`）

- `src/lib/hiagent/file-ingestion.ts`：`prepareFileForHiAgent()` = 从 Supabase 下载文件 → 上传到 up → 生成 Supabase 签名 URL，返回 `{path,name,size,url}`。
- `client.ts` 的 `chatWithHiAgent()` 支持 `files`，放入 `QueryExtends.Files`。
- `chat` 和 `analyze-source` 两个 route 对文件资料调用 `prepareFileForHiAgent` 并把文件传给 HiAgent。
- `assistant-sources.ts` 允许 `STORED` 文件作为可选资料（原来是 `TEXT` 或 `READY`）。

### 3.5 删除键与样式（`fc713d5`、`781fbc7`、`b68de05`、`d00a08c`）

- 研究卡片删除从 `window.confirm` 改为卡片内联两步确认（内置浏览器里 `window.confirm` 不可靠）。
- 研究卡片与研究卡片详情弹窗的文案/结构对齐“内容摘要”卡片（`.eyebrow` 标签、简洁描述、短预览、`打开详情`）。

## 4. 现在能工作的功能

- 用户名注册/登录/恢复码、旧账号迁移。
- 知识库 CRUD、文件上传（TUS 直传私有 Storage）、粘贴文字、回收站。
- 文字资料分析与文件资料分析（文件会经 up-upload + QueryExtends.Files 交给 HiAgent）。
- 证据卡片、原文查看、首页最近工作台。

## 5. 已实测验证的 HiAgent 外部契约（关键，勿改）

本会话用官方 SDK（`hiagent-api==2.2.0`，Go 版 `volcengine/hiagent-go-sdk`，Python 版 `volcengine/hiagent-python-sdk`）对真实学校服务做了端到端验证，结论如下：

- 聊天 API：`{HIAGENT_BASE_URL}/{action}`，请求头 `Apikey: {HIAGENT_API_KEY}`，请求体含 `AppKey={HIAGENT_APP_ID}`、`UserID`、`AppConversationID`、`Query`、`ResponseMode`。`create_conversation` 返回 `Conversation.AppConversationID`。
- up-upload：`POST /up?Action=UploadRaw&Version=2022-01-01&Id=...&Sha256=...&Expire=...&ContentType=...`，火山 SignerV4（service=`up`，region=`cn-north-1`），文件作为 body，返回 `Result.Path`。
- 文件如何交给聊天：`chat_query_v2` 的 `QueryExtends.Files=[{Path,Name,Size,Url}]`；**`Url` 用 Supabase 签名 URL 已验证可行**（HiAgent 后端会下载该 URL 并把文件写入“研究资料库”）。
- 这些契约与官方 SDK 一致；不要改回旧的“只按 UserID、无 AppKey”的调用方式。

## 6. 环境与配置（只列变量名，不写值）

`.env.local`（服务端，勿提交）需要：

- Supabase：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（或 `ANON_KEY`）、`SUPABASE_SECRET_KEY`、`USERNAME_AUTH_SECRET`、`ACCOUNT_RECOVERY_SECRET`。
- HiAgent：`HIAGENT_BASE_URL`、`HIAGENT_API_KEY`、`HIAGENT_APP_ID`、`HIAGENT_TRUSTED_FILTERS_ENABLED`、`HIAGENT_UP_UPLOAD_ENDPOINT`。
- 火山（up-upload 用）：`VOLCENGINE_ACCESS_KEY_ID`、`VOLCENGINE_SECRET_ACCESS_KEY`（`VOLCENGINE_REGION` 是旧 VikingDB 用的 `cn-beijing`，up 服务签名固定用 `cn-north-1`）。

`.env.example` 已补 `HIAGENT_APP_ID`。数据库 migration 需按文件名升序执行；`202609020002` 是本次必须补跑的一条。

## 7. 安全注意

- 本次把「文件分析」从“要求 `HIAGENT_TRUSTED_FILTERS_ENABLED=true`”放宽为“transport 配置即可”，因为文件现在是每条问题直接带过去（不是共享知识库检索）。该开关仍保持 `false`；学校确认多用户隔离后，可再决定是否加回更严格的文件门控。
- 服务端写 `documents` 用 service-role 客户端，需保持 `202609020002` 的 grant 已生效。
- `.env.local`、真实密钥、数据库内容、用户文件不得进 Git/日志/交接包。

## 8. 已知问题与限制

- 扫描版/图片型 PDF（无文字层）会返回“证据不足”，需用可复制文字的 PDF/DOCX/TXT 验证。
- `/api/chat` 仍每次新建 HiAgent Conversation（不复用 `hiagent_conversation_id`），与旧计划“复用”的说法不一致。
- 旧 VikingDB 适配器和 `ingest`/`status` route 仍在，但不是当前文件链路，别误接回。
- 文件资料的 `status` 目前仍停留在 `STORED`（未走 `PROCESSING/READY` 状态机）；本次改的是“上传即随问随附”，没有引入正式 ingestion 状态推进。

## 9. 下一步建议

1. 让用户/学校确认多用户隔离，决定是否恢复更严格的 `HIAGENT_TRUSTED_FILTERS_ENABLED` 门控。
2. 观察文件分析的证据卡格式是否与 `parseHiAgentSse`/fixtures 一致；如实际返回结构不同，补解析兼容。
3. 评估是否需要把 up 上传的结果（Path）持久化到 documents（例如复用 `kb_document_id` 或新列），支持“只上传一次、后续直接引用”。
4. 正式部署前的生产回归、RLS/migration 核验、双用户隔离测试。

## 10. 当前运行状态（会话结束时）

- 开发服务器：`npm run dev`，`http://localhost:3000`（仍在运行）。
- 生产服务器：`next start -H 127.0.0.1 -p 3200`（PID 见进程），仅本机。
- 临时公网测试：Pinggy 隧道 `https://xomqv-114-94-17-138.run.pinggy-free.link`（约 60 分钟失效，需保持电脑开机；测试结束应停止）。

## 11. 给下一个模型的第一优先动作

先读 `AGENTS.md` → 本文件 → `docs/handoff/CURRENT_STATE.md`，再确认：`HIAGENT_APP_ID` 已配置、`202609020002` 已跑、`.env.local` 的 AK/SK 已填。不要改动上述已验证的 HiAgent 契约、文档状态机或 Supabase 架构，除非用户明确要求。
