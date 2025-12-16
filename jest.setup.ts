// Jest setup file for tests
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载测试环境变量
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

// 设置测试超时时间
jest.setTimeout(30000);

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

// 全局测试钩子
beforeAll(async () => {
  console.log('🧪 Test environment initialized with mocked Redis');
});

afterAll(async () => {
  console.log('✅ Test environment cleaned up');
});
