import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { CreateUserByPasswordDto } from '../users/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { RoleManagementService } from './role-management/role-management.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        UsersService,
        PrismaService,
        JwtService,
        RoleManagementService,
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('Create User | Login by password', async () => {
    expect(service).toBeDefined();

    const password = Math.random().toString().slice(2, 15);
    const userInfo: CreateUserByPasswordDto = {
      first_name: password.slice(0, 5),
      last_name: password.slice(5, 10),
      phone: password,
      password,
    };

    const user = await service.createUserByPassword(userInfo);
    expect(user?.phone).toBe(password);

    const loginUserByPassword = await service.loginByPassword(
      password,
      password,
    );
    expect(loginUserByPassword?.phone).toBe(password);
  });
});
