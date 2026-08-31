# 语证 Web App

语证是一个面向课程资料与研究文献的可溯源证据工具：用户建立知识库、保存文档，并在文档完成处理后进行证据问答。

当前版本是未部署的本地测试版。正式部署会等功能全部确认后再进行。

## 本地运行

```bash
npm install
Copy-Item .env.example .env.local
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。如果 3000 端口被占用，以终端显示的其他端口为准。

## 本地配置

复制 `.env.example` 为 `.env.local`，填写自己的 Supabase 公共 URL/Publishable Key，以及用户名登录所需的服务端变量。服务端变量只在本机或部署平台保存，禁止提交到 GitHub。完整步骤见 [`docs/setup/supabase.md`](docs/setup/supabase.md)。

用户名登录不依赖可投递邮箱。Supabase Dashboard 的 Authentication → Providers → Email 需要关闭 Confirm email；新用户注册后会获得一次性恢复码。旧邮箱账号首次登录后会进入 `/account/setup`，设置用户名和新密码，原用户 UUID 与业务数据不会被删除。

## 分享给他人测试

可分享不含密钥的源码包或 GitHub 分支。测试者必须使用自己的 Supabase 项目和自己的服务端配置；不要把你的 `.env.local`、Supabase Secret Key、HiAgent API Key 或数据库内容发给任何人。详细步骤和验收清单见 [`docs/share/testing-guide.md`](docs/share/testing-guide.md)。

当前学校文档处理服务地址尚未提供，因此上传的文件会显示为“已保存”，不会被错误标记为“可分析”。这不影响登录、知识库管理和文件保存测试。

## 验证

```bash
npm test
npm run lint
npm run build
```

Vercel 部署暂不执行，等所有功能和外部依赖确认后再开始。
