import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { Request } from 'express';
import { UserEntity } from '../entities/user.entity';
import { ApiTags } from '@nestjs/swagger';

@UseGuards(SessionAuthGuard)
@Controller('users/address')
@ApiTags('users/address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  @Post()
  create(@Req() req: Request, @Body() createAddressDto: CreateAddressDto) {
    return this.addressService.create(req.user as UserEntity, createAddressDto);
  }

  @Get()
  findAll(@Req() req: Request) {
    return this.addressService.findAll(req.user as UserEntity);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.addressService.findOne(id);
  }

  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updateAddressDto: UpdateAddressDto,
  ) {
    return this.addressService.update(
      id,
      updateAddressDto,
      req.user as UserEntity,
    );
  }

  @Delete(':id')
  remove(@Req() req: Request, @Param('id') id: string) {
    return this.addressService.remove(id, req.user as UserEntity);
  }
}
