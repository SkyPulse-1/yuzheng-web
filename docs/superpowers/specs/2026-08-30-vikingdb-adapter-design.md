# 火山知识库适配设计

## 已确认的官方接口

VikingDB Knowledge Base 使用 `/api/knowledge/doc/add` 导入 URL 文档，使用 `/api/knowledge/doc/info` 查询处理状态，使用 `/api/knowledge/doc/delete` 删除文档。请求通过火山引擎 HMAC-SHA256 V4 签名，服务名为 `air`。

## 隔离规则

每次入库由服务端生成并写入三个 string 标签：`owner_id`、`library_id`、`paper_name`。这些值只能来自当前 Supabase 会话和数据库记录，绝不接受用户问题或浏览器传入的 owner_id。

物理知识库必须预先初始化同名标签字段。检索阶段必须将 `owner_id + library_id` 作为最小过滤条件；SINGLE/MULTI 再追加 `paper_name`。

## 生命周期

上传到私有 Supabase Storage 后，服务端生成短时签名 URL，交给 VikingDB 导入。成功保存 `kb_document_id` 并轮询处理状态：0→READY，1→FAILED，2/3/6→PROCESSING，5→DELETING。

## 配置边界

AK、SK、知识库 Resource ID 均为服务端环境变量。当前仓库只完成可运行适配器；在未取得真实凭据和已初始化标签的物理知识库前，不会伪造“入库成功”。
