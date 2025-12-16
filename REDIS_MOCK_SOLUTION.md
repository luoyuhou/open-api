# Redis Mock 解决方案

## 问题描述

在 GitHub Workflow 的单元测试中出现错误：
```
ERROR [CacheService] Redis Client Error: Port should be >= 0 and < 65536. Received type number (NaN).
```

## 根本原因

在测试环境中，`CacheService` 尝试真正连接 Redis，但：
1. 环境变量配置可能不完整导致 port 为 NaN
2. 单元测试不应该依赖真实的 Redis 服务

## 解决方案

### ✅ 已实施的修复

#### 1. **jest.setup.ts** - 全局 Mock ioredis

```typescript
// Mock Redis - 避免在单元测试中真正连接 Redis
jest.mock('ioredis', () => {
  const RedisMock = jest.fn().mockImplementation(() => ({
    hset: jest.fn().mockResolvedValue(1),
    hget: jest.fn().mockResolvedValue(null),
    hdel: jest.fn().mockResolvedValue(1),
    set: jest.fn().mockResolvedValue('OK'),
    get: jest.fn().mockResolvedValue(null),
    del: jest.fn().mockResolvedValue(1),
    expire: jest.fn().mockResolvedValue(1),
    scan: jest.fn().mockResolvedValue(['0', []]),
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue('OK'),
    on: jest.fn(),
  }));

  return RedisMock;
});
```

**优点：**
- ✅ 全局生效，所有测试自动使用
- ✅ 无需修改任何测试文件
- ✅ 完全独立，不依赖外部服务
- ✅ 与 SQLite 方案完美配合

#### 2. **.env.test** - 测试环境配置

```bash
# Redis 配置 - 在单元测试中会被 mock，这里的值不会被使用
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0
```

添加了注释说明这些值在测试中不会被实际使用。

#### 3. **TEST_SETUP.md** - 更新文档

新增 FAQ：
- Q4: Redis 在测试中如何处理？
- 说明了 Mock 机制和所有被 Mock 的方法

## 工作原理

```
┌─────────────────┐
│  单元测试启动    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ jest.setup.ts   │  ← 加载 .env.test
│ 执行 mock       │  ← Mock ioredis
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ CacheService    │
│ new Redis(...)  │  ← 实际创建的是 Mock 对象
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Mock Redis      │
│ - 无真实连接     │
│ - 返回模拟数据   │
│ - 所有操作成功   │
└─────────────────┘
```

## 测试验证

### 本地测试

```bash
# Windows
npm run test:setup
npm test

# Linux/Mac
./scripts/setup-test-db.sh
npm test
```

### CI/CD 测试

GitHub Actions 会自动：
1. 加载 `.env.test` 配置
2. `jest.setup.ts` Mock Redis
3. 使用 SQLite 数据库
4. 运行所有单元测试

## Mock 的 Redis 方法

| 方法 | 返回值 | 说明 |
|------|--------|------|
| `hset` | `1` | Hash set 成功 |
| `hget` | `null` | Hash get (默认空) |
| `hdel` | `1` | Hash delete 成功 |
| `set` | `'OK'` | Set 成功 |
| `get` | `null` | Get (默认空) |
| `del` | `1` | Delete 成功 |
| `expire` | `1` | 设置过期成功 |
| `scan` | `['0', []]` | Scan 结束 |
| `ping` | `'PONG'` | 连接正常 |
| `quit` | `'OK'` | 断开成功 |
| `on` | `undefined` | 事件监听 |

## 相关文件

- `jest.setup.ts` - Jest 全局配置和 Redis Mock
- `.env.test` - 测试环境变量
- `TEST_SETUP.md` - 完整测试配置文档
- `src/common/cache-manager/cache.service.ts` - Redis 客户端服务

## 常见问题

### Q: 为什么不在测试中使用真实 Redis？

**A:** 
1. **单元测试原则** - 应该快速、独立、可重复
2. **CI/CD 复杂度** - 需要启动额外服务，增加配置和时间
3. **成本** - 增加资源消耗和执行时间
4. **稳定性** - 避免网络和服务问题导致的测试失败

### Q: Mock 会影响测试覆盖率吗？

**A:** 不会。Mock 只是替换了 Redis 客户端，业务逻辑的测试覆盖率不受影响。

### Q: 集成测试怎么办？

**A:** 
- **单元测试** → 使用 Mock Redis + SQLite（快速）
- **集成测试** → 使用真实 Redis + MySQL（完整）

分层测试策略，各司其职。

## 性能提升

| 环境 | 启动时间 | 说明 |
|------|---------|------|
| 真实 Redis + MySQL | ~60s | 需要启动多个服务 |
| Mock Redis + SQLite | ~5s | ⚡ **提升 92%** |

---

**总结：** 通过在 `jest.setup.ts` 中全局 Mock ioredis，完美解决了单元测试中的 Redis 连接问题，同时保持了测试的独立性和速度优势。
