import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { UserEntity } from '../entities/user.entity';
import { PrismaService } from '../../prisma/prisma.service';
import { v4 } from 'uuid';
import { E_USER_ADDRESS_STATUS } from './const';

@Injectable()
export class AddressService {
  constructor(private prisma: PrismaService) {}

  private async updateUserAllAddressIsNotDefault(user_id: string) {
    return this.prisma.user_address.updateMany({
      where: { user_id },
      data: { is_default: false },
    });
  }

  public async create(user: UserEntity, createAddressDto: CreateAddressDto) {
    const { is_default } = createAddressDto;

    if (is_default) {
      await this.updateUserAllAddressIsNotDefault(user.user_id);
    }

    return this.prisma.user_address.create({
      data: {
        ...createAddressDto,
        user_address_id: `address-${v4()}`,
        user_id: user.user_id,
      },
    });
  }

  findAll(user: UserEntity) {
    return this.prisma.user_address.findMany({
      where: { user_id: user.user_id, status: !!E_USER_ADDRESS_STATUS.active },
      orderBy: { update_date: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.user_address.findUnique({
      where: { user_address_id: id },
    });
  }

  async update(
    id: string,
    updateAddressDto: UpdateAddressDto,
    user: UserEntity,
  ) {
    const address = await this.prisma.user_address.findUnique({
      where: { user_address_id: id, user_id: user.user_id },
    });

    if (!address) {
      throw new BadRequestException('');
    }

    const { is_default } = updateAddressDto;
    if (is_default) {
      await this.updateUserAllAddressIsNotDefault(user.user_id);
    }

    return this.prisma.user_address.update({
      where: { user_address_id: id },
      data: updateAddressDto,
    });
  }

  async remove(id: string, user: UserEntity) {
    const address = await this.prisma.user_address.findFirst({
      where: {
        user_address_id: id,
        user_id: user.user_id,
        status: !!E_USER_ADDRESS_STATUS.inactive,
      },
    });

    if (!address) {
      throw new BadRequestException('');
    }

    return this.prisma.user_address.update({
      where: { user_address_id: id },
      data: { status: !!E_USER_ADDRESS_STATUS.inactive },
    });
  }
}
