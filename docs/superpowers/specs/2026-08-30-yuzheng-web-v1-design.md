# 语证 Web App V1.0 架构与交付约束

## 目标

依据《语证 Web App V1.0 产品与技术交付规格》分阶段交付可部署的 Next.js 应用。当前阶段只完成可运行的前端工程骨架，不接入 HiAgent，也不一次性生成完整系统。

## 技术架构

- Web：Next.js App Router、TypeScript、Tailwind CSS、ESLint，源码位于 `src/`。
- 服务边界：浏览器只访问 Next.js 页面与受控服务端接口；服务端负责第三方密钥、权限校验和外部工作流调用。
- 身份与数据：Supabase Auth、PostgreSQL、Storage。
- 知识检索：后续接入火山知识库/VikingDB。
- 智能工作流：最后接入 HiAgent，并以已验证样例做契约测试。
- 部署：Vercel 因国内手机号注册限制，由用户决定在部署阶段继续处理或选用替代方案，不阻塞本地开发。

## 开发顺序

1. 项目骨架与本地运行验证。
2. 登录。
3. Library CRUD。
4. 文档管理。
5. 火山知识库/VikingDB。
6. HiAgent。
7. Evidence Cards。
8. 部署与比赛提交网址。

每完成一个阶段都先验证，再创建独立 Git 提交；接口变更不得跨阶段无边界重写。

## 业务与安全边界

- 文档数量映射：0 个文档为 `GENERAL`，1 个文档为 `SINGLE`，多个文档为 `MULTI`。
- 用户数据访问必须同时满足 `owner_id` 与 `library_id` 的归属校验。
- Supabase 服务端密钥、火山知识库凭据和 HiAgent 调用密钥只允许存在于服务端环境变量中。
- `retrieval_score` 仅供服务端判断和调试，不直接暴露给最终用户。
- 接入 HiAgent 前必须取得已发布工作流调用信息、4 组已验证测试样例和测试 PDF。

## 当前阶段验收

- `node -v`、`npm -v`、`git --version`、`codex --version` 可执行。
- Next.js 工程启用 TypeScript、ESLint、Tailwind CSS、App Router 与 `src/` 目录。
- `npm run lint` 和 `npm run build` 通过。
- `npm run dev` 后本地首页返回 HTTP 200。

