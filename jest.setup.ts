// Jest setup file for tests
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载测试环境变量
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

// 设置测试超时时间
jest.setTimeout(30000);

// Mock Redis - 使用 ioredis-mock 提供完整的 Redis 功能
jest.mock('ioredis', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RedisMock = require('ioredis-mock');
  return RedisMock;
});

// 全局测试钩子
beforeAll(async () => {
  console.log('🧪 Test environment initialized');
  console.log('   📦 Database: SQLite (file:./test.db)');
  console.log('   📦 Redis: Mocked (ioredis-mock)');
});

afterAll(async () => {
  console.log('✅ Test environment cleaned up');

  // 清理测试数据库文件（可选）
  // const fs = require('fs');
  // const testDbPath = path.resolve(__dirname, 'prisma/test.db');
  // if (fs.existsSync(testDbPath)) {
  //   fs.unlinkSync(testDbPath);
  //   console.log('   🗑️  Removed test database');
  // }
});
