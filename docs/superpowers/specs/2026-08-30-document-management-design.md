# 文档管理阶段设计

## 范围

本阶段实现 Library 内的 PDF、DOCX、TXT 上传、私有存储、文档列表、状态展示、安全查看和删除。文件上传成功后进入 `PROCESSING`，下一阶段接入火山知识库后再推进到 `READY` 或 `FAILED`。

## 数据与存储

`public.documents` 保存归属、原始文件名、MIME、大小、私有存储路径、知识库侧 ID 和生命周期状态。`owner_id` 冗余保存用于数据库和后续检索的双重权限校验。

Supabase Storage 使用私有 `documents` bucket。对象路径固定为 `owner_id/library_id/document_id.ext`，不使用原始文件名，避免路径注入、重名覆盖和越权访问。数据库与存储均用 RLS 限制为当前用户目录。

## 接口

- `GET/POST /api/libraries/:id/documents`
- `DELETE /api/documents/:id`
- `GET /api/documents/:id/status`
- `GET /api/documents/:id/file`

上传限制为单文件 50MB，格式只允许 PDF、DOCX、TXT；界面一次可选择 1–10 个文件并逐个报告结果。删除必须二次确认。

## 验收

用户可在自己的 Library 中上传允许格式，刷新后仍能看到文件名、大小和状态；文件不能通过公开 URL 访问，只能由鉴权接口生成短时签名链接。
