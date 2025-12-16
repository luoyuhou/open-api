// Jest setup file for tests
import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载测试环境变量
dotenv.config({ path: path.resolve(__dirname, '.env.test') });

// 设置测试超时时间
jest.setTimeout(30000);

// 全局测试钩子
beforeAll(async () => {
  console.log('🧪 Test environment initialized');
});

afterAll(async () => {
  console.log('✅ Test environment cleaned up');
});
