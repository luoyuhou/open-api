import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { WxUserInfo } from '../auth/dto/login.dto';

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, PrismaService],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('Create User by Wechat', async () => {
    expect(service).toBeDefined();

    const openId = Math.random().toString().slice(2, 15);
    const userInfo: WxUserInfo = {
      avatarUrl: '',
      city: '',
      country: '',
      gender: 0,
      language: 'zh_CN',
      nickName: `nickName-${openId}`,
      province: '',
    };

    const user = await service.createByWechat(userInfo, openId);
    expect(user?.first_name).toBe(`nickName-${openId}`);
  });
});
