# 登录阶段设计

## 范围

本阶段实现 Supabase Auth 的邮箱魔法链接登录、SSR Cookie 会话、认证回调、退出登录和受保护的工作台。Library CRUD、文档、火山知识库和 HiAgent 均不在本阶段实现。

## 方案比较与选择

- 邮箱魔法链接：无需保存密码，Supabase 默认支持，比赛演示配置最少；本阶段采用。
- 邮箱密码：登录直观，但需要注册、确认、找回密码等额外流程。
- GitHub OAuth：体验顺畅，但需要额外创建 OAuth App 和管理回调地址。

## 路由与组件

- `/`：产品欢迎页；已登录用户可直接进入工作台。
- `/login`：邮箱输入、发送状态、失败提示和返回首页入口。
- `/auth/confirm`：用 `token_hash` 与 `type` 换取服务端 Cookie 会话。
- `/auth/callback`：兼容 Supabase PKCE `code` 回调。
- `/dashboard`：受保护工作台，展示当前账号和下一阶段入口。
- `src/lib/supabase/client.ts`：浏览器客户端工厂。
- `src/lib/supabase/server.ts`：按请求创建的服务端客户端工厂。
- `src/lib/supabase/proxy.ts`：刷新会话并保护认证路由。
- `src/proxy.ts`：Next.js 16 Proxy 入口。

## 数据流

用户提交邮箱后，Server Action 调用 `signInWithOtp` 并把回调地址设为 `/auth/confirm`。用户点击邮件链接后，Route Handler 验证 token hash、写入 Cookie，并跳转 `/dashboard`。所有受保护页面在服务端再次调用 `getClaims()`，不依赖前端隐藏作为权限边界。

## 配置与安全

- 浏览器只使用 `NEXT_PUBLIC_SUPABASE_URL` 和 Supabase publishable/anon key。
- `SUPABASE_SERVICE_ROLE_KEY` 不参与登录流程，也不得进入客户端代码。
- Supabase 客户端必须在每次请求内创建，不能跨用户复用。
- 回调的 `next` 参数只能接受站内绝对路径，防止开放重定向。
- 本地缺少 Supabase 环境变量时，页面显示可操作的配置说明，构建不得崩溃。

## 验收

- `/` 与 `/login` 可访问，视觉风格学术、克制、简洁。
- 未登录访问 `/dashboard` 会跳转 `/login`。
- 配置真实 Supabase 后，邮箱链接可建立 Cookie 会话并进入 `/dashboard`。
- 退出后会话被清除并返回首页。
- ESLint、TypeScript 与生产构建通过。

