# HiAgent 联调配置

## 必需信息

- 已发布工作流 Base URL、App ID、API Key。
- 确认 Run/Query 路径；默认分别为 `/run_app_workflow`、`/query_app_workflow`。
- 确认 Start 输入包含 `query`、`owner_id`、`library_id`、`selected_documents`。
- 确认知识库检索节点确实把后三项绑定到标签过滤。
- 提供 GENERAL / SINGLE / MULTI / PARTIAL 四份真实输出 JSON。

```dotenv
HIAGENT_BASE_URL=https://<host>/api/proxy/api/v1
HIAGENT_APP_ID=
HIAGENT_API_KEY=
HIAGENT_RUN_PATH=/run_app_workflow
HIAGENT_QUERY_PATH=/query_app_workflow
HIAGENT_TRUSTED_FILTERS_ENABLED=false
```

只有完成上述过滤验证后才把最后一项改为 `true`。
