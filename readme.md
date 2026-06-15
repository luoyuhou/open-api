# prisma

## 数据库变更（单 init migration 模式）

本项目采用 **单一 init migration 文件** + **`db push` 部署** 的方式，不新增 migration 文件夹。

### 每次改 schema 的流程

```bash
# 1. 修改 prisma/schema.prisma

# 2. 重新生成 init/migration.sql（完整建表 SQL，与 schema 保持一致）
npm run db:init-sql

# 3. 本地验证
npm run schema2mysql

# 4. 提交 schema.prisma + migrations/20250615000000_init/migration.sql，merge 到 master
#    GitHub Actions 自动 db push 同步生产库
```

### 文件说明

| 文件 | 作用 |
|------|------|
| `schema.prisma` | 模型定义，Prisma Client 和 db push 的源 |
| `migrations/20250615000000_init/migration.sql` | 完整 DDL 快照，供全新库 `migrate deploy` 初始化 |
| `migrations/migration_lock.toml` | 数据库类型锁定（sqlite） |

### 部署行为

| 场景 | 命令 |
|------|------|
| 全新服务器（无 prod.db） | `migrate deploy` 执行 init/migration.sql |
| 已有生产库 | `db push` 按 schema.prisma 增量同步 |

### 注意

- **不要**在 init 已应用于生产后修改其 checksum 并再跑 `migrate deploy`（Prisma 会报 migration 被篡改）
- 已有库的变更靠 **`db push`**，init.sql 仅作 DDL 文档和全新环境初始化
- 破坏性变更（删列等）db push 可能失败，需人工处理

## 其他命令

1. tsconfig.json
    1. ```{"compilerOptions": {"sourceMap": true,"outDir": "dist","strict": true,"lib": ["esnext"],"esModuleInterop": true}}```
2. `npx prisma`
3. init
    1. `npx prisma init`
4. migrate
    1. `npx prisma migrate dev --name init`
5. schema
    1. `npx prisma db pull`
6. generate
    1. `npx prisma generate`
7. other
