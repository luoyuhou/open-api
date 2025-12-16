#!/bin/bash

# 测试数据库设置脚本

echo "🧪 Setting up test database with SQLite..."

# 删除旧的测试数据库
rm -f ./test.db ./test.db-journal

# 使用测试 schema 生成 Prisma Client
echo "📦 Generating Prisma Client for test..."
npx prisma generate --schema=./prisma/schema.test.prisma

# 创建数据库表
echo "🗄️ Creating database tables..."
npx prisma db push --schema=./prisma/schema.test.prisma --skip-generate

echo "✅ Test database setup complete!"
