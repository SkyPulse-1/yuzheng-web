# VikingDB / 火山知识库配置

## 需要提供

1. `VOLCENGINE_ACCESS_KEY_ID` 与 `VOLCENGINE_SECRET_ACCESS_KEY`（只写部署平台环境变量）。
2. 物理知识库 Resource ID：`VOLCENGINE_KB_ID`。
3. 知识库所在区域和项目，默认 `cn-beijing` / `default`。
4. 在知识库中预先初始化三个 string 标签：`owner_id`、`library_id`、`paper_name`。

## 环境变量

```dotenv
VOLCENGINE_ACCESS_KEY_ID=
VOLCENGINE_SECRET_ACCESS_KEY=
VOLCENGINE_REGION=cn-beijing
VOLCENGINE_KB_ID=
VOLCENGINE_KB_PROJECT=default
VOLCENGINE_KB_HOST=api-knowledgebase.mlp.cn-beijing.volces.com
VOLCENGINE_KB_SERVICE=air
```

## 安全验收

- 上传 A 用户文档后，火山侧三个标签与数据库值一致。
- A 用户检索必须带 `owner_id=A + library_id=目标库`。
- B 用户使用相同问题或文件名不能召回 A 的任何切片。
- SINGLE/MULTI 需额外按完整 `paper_name` 过滤。
