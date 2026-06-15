# prisma

## 数据库迁移（生产使用 Prisma Migrate）

开发时修改 `prisma/schema.prisma` 后：

```bash
npx prisma migrate dev --name add_field_name --create-only
# 检查 prisma/migrations/ 下的 SQL，提交到 git
```

合并到 `master` 后，GitHub Actions 自动执行 `prisma migrate deploy`，无需人工介入。

服务器上如需手动执行 migration：

```bash
cd /home/apps/open-api && set -a && source .env && set +a && npx prisma migrate deploy
```

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