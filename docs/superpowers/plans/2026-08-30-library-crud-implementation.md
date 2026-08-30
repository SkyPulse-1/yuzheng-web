# Library CRUD 实施计划

1. 创建 `libraries` SQL migration、索引、更新时间触发器与 RLS policies。
2. 添加字段校验和 TypeScript 数据类型。
3. 实现 Library REST API，所有请求从当前会话派生 owner_id。
4. 实现工作台、列表页、详情页、创建/编辑弹窗和删除二次确认。
5. 执行 lint、production build、未登录路由检查和数据库隔离检查。
6. 阶段验收后单独提交 Git。
