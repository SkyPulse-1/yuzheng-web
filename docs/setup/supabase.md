# Supabase 项目配置

## 应用环境变量

复制 `.env.example` 为 `.env.local`，至少填写：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

旧项目只有 anon key 时，可改填 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。用户名登录还需要以下服务端变量；它们不能提交到 GitHub，也不能加 `NEXT_PUBLIC_` 前缀：

```dotenv
SUPABASE_SECRET_KEY=sb_secret_...
USERNAME_AUTH_SECRET=<至少 32 位随机字符串>
ACCOUNT_RECOVERY_SECRET=<至少 32 位随机字符串>
```

旧项目若没有 `SUPABASE_SECRET_KEY`，可临时使用 `SUPABASE_SERVICE_ROLE_KEY` 兼容变量。两个应用密钥可在本机生成，例如 `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`，生成后只保存到 `.env.local`。

## Auth 配置

用户名登录使用 Supabase Auth 的密码会话，但公开界面不要求邮箱。请在 Authentication → Providers → Email 中关闭 **Confirm email**；否则 Supabase 会等待一个不可投递的内部地址确认邮件，新账号无法直接登录。

在 Authentication → URL Configuration 设置：

- Site URL：本地开发使用 `http://localhost:3000`。
- Redirect URLs：加入 `http://localhost:3000/auth/callback`。
- 部署后再加入正式站点的 `/auth/callback` 地址。

保留 `/auth/callback` 是为了兼容历史邮箱账号迁移；用户名注册/登录本身不发送邮件。若后续临时启用 Magic Link，自定义模板可使用：

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">登录语证</a>
```

默认邮件模板无需修改即可先通过 `/auth/callback` 联调。

## 数据库迁移

首次配置项目时，在 Supabase SQL Editor 执行：

```text
supabase/migrations/202608300001_create_libraries.sql
supabase/migrations/202608300002_create_documents.sql
supabase/migrations/202608300003_create_conversations.sql
supabase/migrations/202608300004_create_username_auth.sql
supabase/migrations/202608300005_add_recovery_lock_function.sql
```

迁移会创建 `libraries`、`documents`、`conversations`、`profiles`、`account_recovery` 表以及私有 `documents` Storage bucket。执行后应确认业务表均启用 RLS；登录用户只能读写 `owner_id = auth.uid()` 的记录，文件路径第一段也必须是当前用户 ID。`profiles.username_normalized` 有唯一索引，用户名不区分大小写。

`account_recovery` 没有浏览器端读写策略，只能由服务端管理员客户端访问；恢复码只在注册或重置后显示一次。旧的、尚未迁移的 Auth 用户首次登录后会被送到 `/account/setup`，填写用户名和新密码即可保留原 UUID 与业务数据。

## 验收

1. 打开 `/login`，用未使用的用户名和至少 8 位密码注册。
2. 页面只展示一次恢复码；保存后确认能进入 `/dashboard`。
3. 退出后用同一用户名和密码登录。
4. 在另一台设备或无痕窗口用同一账号登录，确认知识库、文档和对话内容一致。
5. 用恢复码设置新密码，确认旧密码失效、恢复码轮换。
6. 使用错误恢复码连续 5 次，确认恢复入口短暂锁定。
