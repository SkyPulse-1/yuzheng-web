# HiAgent 对话接入配置

## 当前必需信息

- 学校已发布应用的 Base URL 与 API Key。
- 创建会话与对话路径；默认分别为 `/create_conversation`、`/chat_query_v2`。
- 确认学校端会使用传入的唯一 `UserID` 隔离不同用户的数据。
- 所有密钥只写入本机 `.env.local` 或部署平台的服务端环境变量，不写入代码和 Git。

```dotenv
HIAGENT_BASE_URL=https://<school-host>/api/proxy/api/v1
HIAGENT_API_KEY=
HIAGENT_CREATE_CONVERSATION_PATH=/create_conversation
HIAGENT_CHAT_PATH=/chat_query_v2
HIAGENT_TRUSTED_FILTERS_ENABLED=false
```

只有学校确认用户与知识库过滤规则有效后，才把 `HIAGENT_TRUSTED_FILTERS_ENABLED` 改为 `true`。在此之前，前端会保持问答功能关闭，避免不同用户之间的数据混用。

## 文档处理服务

文件上传后会先安全保存在 Supabase。要让文件真正进入学校知识库，还需要学校管理员提供独立的 `up-upload` 服务地址：

```dotenv
HIAGENT_UP_UPLOAD_ENDPOINT=
```

当前代码不会猜测该地址，也不会改动学校 HiAgent。管理员没有提供并确认隔离规则前，文档状态保持“已保存”，不会显示成“可使用”。
