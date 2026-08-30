# HiAgent 对话阶段设计

服务端 `/api/chat` 先验证 Library 属于当前用户，再验证所有 selectedDocumentIds 均属于该 Library 且状态为 READY。0/1/多篇分别映射 GENERAL/SINGLE/MULTI，并由服务端注入完整文件名。

HiAgent 调用只在 `HIAGENT_TRUSTED_FILTERS_ENABLED=true` 时开放。这个开关代表已验证工作流 Start 与知识库检索节点会使用服务端传入的 `owner_id`、`library_id`、`selected_documents` 做强制过滤；未验证时返回 503，绝不降级为不安全的自然语言权限边界。

对话和消息存入 Supabase，均启用 owner RLS。HiAgent 当前 `evidence_cards` JSON 字符串由服务端解析为数组；解析失败仍保留 answer。
