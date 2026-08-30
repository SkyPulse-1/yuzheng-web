This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 本地配置

复制 `.env.example` 为 `.env.local`，填写 Supabase 公共 URL/Publishable Key，以及用户名登录所需的服务端变量：`SUPABASE_SECRET_KEY`（或兼容的 `SUPABASE_SERVICE_ROLE_KEY`）、`USERNAME_AUTH_SECRET`、`ACCOUNT_RECOVERY_SECRET`。服务端变量只在本机或部署平台保存，禁止提交到 GitHub。完整步骤见 [`docs/setup/supabase.md`](docs/setup/supabase.md)。

用户名登录不依赖可投递邮箱。Supabase Dashboard 的 Authentication → Providers → Email 需要关闭 Confirm email；新用户注册后会获得一次性恢复码。旧邮箱账号首次登录后会进入 `/account/setup`，设置用户名和新密码，原用户 UUID 与业务数据不会被删除。

## 验证

```bash
npm test
npm run lint
npm run build
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
