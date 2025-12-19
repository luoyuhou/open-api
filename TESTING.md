# 单元测试指南

本项目配置了使用 **SQLite** 和 **Mock Redis** 的单元测试环境，无需启动 MySQL 和 Redis 服务即可运行测试。

---

## 🎯 测试环境配置

### 数据库
- **开发/生产环境**: MySQL
- **测试环境**: SQLite (`file:./test.db`)

### 缓存
- **开发/生产环境**: Redis (ioredis)
- **测试环境**: Mock Redis (ioredis-mock)

---

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

确保已安装：
- `ioredis-mock`: Mock Redis
- `cross-env`: 跨平台环境变量设置

### 2. 初始化测试数据库

```bash
npm run test:setup
```

这会：
1. 生成 Prisma Client
2. 创建 SQLite 测试数据库
3. 应用测试 schema

### 3. 运行测试

```bash
# 运行所有测试
npm test

# 监听模式（开发时推荐）
npm run test:watch

# 生成覆盖率报告
npm run test:cov

# 调试模式
npm run test:debug

# E2E 测试
npm run test:e2e
```

---

## 📁 文件说明

### 配置文件

| 文件 | 用途 |
|------|------|
| `.env.test` | 测试环境变量 |
| `jest.setup.ts` | Jest 全局配置，Mock Redis |
| `prisma/schema.test.prisma` | 测试专用 Prisma Schema（SQLite） |
| `prisma/schema.prisma` | 生产 Prisma Schema（MySQL） |

### 环境变量 (`.env.test`)

```bash
# 数据库
DATABASE_URL=file:./test.db  # SQLite

# Redis（会被 mock，值不重要）
REDIS_HOST=localhost
REDIS_PORT=6379

# 其他配置
APP_SECRET=test-secret-key
IS_UNIT_TEST=true
```

---

## ✍️ 编写测试

### 基本示例

```typescript
// user.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UserService } from './user.service';
import { PrismaService } from '../prisma/prisma.service';
import { CacheService } from '../common/cache-manager/cache.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: PrismaService;
  let cache: CacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        PrismaService,
        CacheService,
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    prisma = module.get<PrismaService>(PrismaService);
    cache = module.get<CacheService>(CacheService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a user', async () => {
    const userData = {
      user_id: 'test-001',
      first_name: 'Test',
      last_name: 'User',
      phone: '1234567890',
      status: 1,
    };

    const result = await prisma.user.create({ data: userData });
    expect(result.user_id).toBe('test-001');
  });

  it('should use mocked Redis', async () => {
    // Redis 已被 mock，可以正常调用
    await cache.client.set('test-key', 'test-value');
    const value = await cache.client.get('test-key');
    expect(value).toBe('test-value');
  });
});
```

### 数据库测试最佳实践

```typescript
describe('Database Operations', () => {
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);

    // 清空测试数据
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    // 关闭数据库连接
    await prisma.$disconnect();
  });

  it('should insert and query data', async () => {
    // 插入
    await prisma.user.create({
      data: {
        user_id: 'user-001',
        first_name: 'John',
        last_name: 'Doe',
        phone: '1234567890',
        status: 1,
      },
    });

    // 查询
    const user = await prisma.user.findUnique({
      where: { user_id: 'user-001' },
    });

    expect(user).toBeDefined();
    expect(user.first_name).toBe('John');
  });
});
```

---

## 🔍 常见问题

### 1. 测试数据库文件在哪里？

SQLite 数据库文件：`prisma/test.db`

可以手动删除重新初始化：
```bash
rm prisma/test.db
npm run test:setup
```

### 2. Redis Mock 支持哪些命令？

`ioredis-mock` 支持大部分 Redis 命令：
- ✅ `set`, `get`, `del`
- ✅ `hset`, `hget`, `hdel`, `hgetall`
- ✅ `sadd`, `smembers`, `srem`
- ✅ `expire`, `ttl`
- ✅ `scan`, `keys`

查看完整列表：https://github.com/stipsan/ioredis-mock

### 3. 如何在测试中使用真实 Redis？

如果某些测试需要真实 Redis，可以在特定测试文件中覆盖 mock：

```typescript
// 在测试文件顶部
jest.unmock('ioredis');

import Redis from 'ioredis';

describe('Real Redis Test', () => {
  let redis: Redis;

  beforeAll(() => {
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 15, // 使用测试专用 DB
    });
  });

  afterAll(async () => {
    await redis.flushdb(); // 清空测试数据
    await redis.quit();
  });

  // 测试代码...
});
```

### 4. 测试时如何查看 SQL 查询？

在 `.env.test` 中设置：
```bash
PRISMA_LOG=query,info,warn,error
```

### 5. 如何跳过某些测试？

```typescript
// 跳过单个测试
it.skip('should do something', () => {
  // ...
});

// 跳过整个测试套件
describe.skip('Feature', () => {
  // ...
});

// 只运行某个测试
it.only('should run this test only', () => {
  // ...
});
```

---

## 📊 CI/CD 集成

### GitHub Actions 示例

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '16'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run tests
        run: npm run test:ci
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

---

## 🎯 测试覆盖率目标

推荐的覆盖率目标：

- **Statements**: > 80%
- **Branches**: > 75%
- **Functions**: > 80%
- **Lines**: > 80%

查看覆盖率报告：
```bash
npm run test:cov
# 打开 coverage/lcov-report/index.html
```

---

## 📝 总结

✅ **优势**：
- 无需启动 MySQL 和 Redis
- 测试运行更快
- CI/CD 友好
- 数据隔离，不影响开发数据库

✅ **最佳实践**：
- 每个测试前清空相关数据
- 使用 `beforeEach` 和 `afterAll` 钩子
- Mock 外部服务（API、第三方库）
- 保持测试独立，不依赖执行顺序

Happy Testing! 🎉
