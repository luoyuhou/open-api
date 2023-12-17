import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateStoreDto, CreateStoreInputDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { PrismaService } from '../prisma/prisma.service';
import { v4 } from 'uuid';
import { ApplicantStoreHistoryInputDto } from './dto/apply-store-history.dto';
import { STORE_ACTION_TYPES } from './const';
import { UserEntity } from '../users/entities/user.entity';

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}
  public async create(user: UserEntity, createStoreDto: CreateStoreInputDto) {
    const store_id = 'store-' + v4();
    const data: CreateStoreDto = {
      store_id,
      status: 0,
      user_id: user.user_id,
      ...createStoreDto,
    };

    const history: ApplicantStoreHistoryInputDto = {
      store_id,
      action_type: STORE_ACTION_TYPES.apply,
      action_content: `${user.first_name} ${user.last_name} apply store name is ${createStoreDto.store_name}`,
      applicant_user_id: user.user_id,
      applicant_date: new Date(),
    };
    await this.prisma.store.create({ data });
    await this.prisma.store_history.create({ data: history });
  }

  public async approvedForApply(
    id: string,
    data: { replient_content: string },
    user: UserEntity,
  ) {
    const lastStoreHistory = await this.prisma.store_history.findFirst({
      where: {
        store_id: id,
      },
      orderBy: { create_date: { sort: 'desc' } },
    });
    if (!lastStoreHistory) {
      throw new BadRequestException('');
    }

    if (lastStoreHistory.action_type !== STORE_ACTION_TYPES.apply) {
      throw new BadRequestException('');
    }

    if (lastStoreHistory.replient_content) {
      throw new BadRequestException('');
    }

    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { store_id: id },
        data: { status: 1 },
      }),
      this.prisma.store_history.update({
        where: { id: lastStoreHistory.id },
        data: {
          replient_date: new Date(),
          replient_user_id: user.user_id,
          replient_content: `${user.first_name} ${user.last_name} approved this store`,
        },
      }),
    ]);
  }

  public async findAll() {
    return this.prisma.store.findMany();
  }

  public async findOne(id: string) {
    return this.prisma.store.findUnique({ where: { store_id: id } });
  }

  public async transform(
    id: string,
    updateStoreDto: UpdateStoreDto,
    user: UserEntity,
  ) {
    return this.prisma.store_history.create({
      data: {
        store_id: id,
        action_type: STORE_ACTION_TYPES.transform_apply,
        action_content: '',
        applicant_user_id: user.user_id,
        applicant_date: new Date(),
      },
    });
  }

  public async update(
    id: string,
    updateStoreDto: UpdateStoreDto,
    user: UserEntity,
  ) {
    await this.prisma.$transaction([
      this.prisma.store.update({
        where: { store_id: id },
        data: updateStoreDto,
      }),
      this.prisma.store_history.create({
        data: {
          store_id: id,
          action_content: ``,
          action_type: STORE_ACTION_TYPES.apply,
          applicant_date: new Date(),
          applicant_user_id: user.user_id,
        },
      }),
    ]);
  }

  public async approve(id: number) {
    return `This action removes a #${id} store`;
  }

  public async frozen() {
    return '';
  }
}
