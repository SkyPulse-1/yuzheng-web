# Supabase 项目配置

## 应用环境变量

复制 `.env.example` 为 `.env.local`，至少填写：

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

旧项目只有 anon key 时，可改填 `NEXT_PUBLIC_SUPABASE_ANON_KEY`。`SUPABASE_SERVICE_ROLE_KEY` 只能供后续服务端管理任务使用，不得加 `NEXT_PUBLIC_` 前缀。

## Auth URL 配置

在 Supabase Dashboard 的 Authentication → URL Configuration 设置：

- Site URL：本地开发使用 `http://localhost:3000`。
- Redirect URLs：加入 `http://localhost:3000/auth/callback`。
- 部署后再加入正式站点的 `/auth/callback` 地址。

当前应用同时支持 PKCE code callback 与 token hash confirm。若自定义 Magic Link 邮件模板，可将链接设置为：

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">登录语证</a>
```

默认邮件模板无需修改即可先通过 `/auth/callback` 联调。

## 验收

1. 打开 `/login` 输入测试邮箱。
2. 邮件发送后页面显示成功提示。
3. 点击邮件链接进入 `/dashboard`。
4. 点击退出登录后回到首页。
5. 再次访问 `/dashboard` 应跳转 `/login`。
