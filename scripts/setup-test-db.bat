@echo off
REM 测试数据库设置脚本 - Windows 版本

echo Setting up test database with SQLite...

REM 删除旧的测试数据库
if exist test.db del /f test.db
if exist test.db-journal del /f test.db-journal

REM 使用测试 schema 生成 Prisma Client
echo Generating Prisma Client for test...
call npx prisma generate --schema=./prisma/schema.test.prisma

REM 创建数据库表
echo Creating database tables...
call npx prisma db push --schema=./prisma/schema.test.prisma --skip-generate

echo Test database setup complete!
