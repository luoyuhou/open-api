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
  Query,
} from '@nestjs/common';
import { UsersOrderService } from './users.order.service';
import { CreateOrderDto } from '../../order/dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { Request } from 'express';
import { UserEntity } from '../entities/user.entity';
import { ListOrderDto } from './dto/list-order.dto';
import { UpdatePayProofDto } from './dto/update-pay-proof.dto';

@UseGuards(SessionAuthGuard)
@Controller('users/order')
@ApiTags('users/order')
export class UsersOrderController {
  constructor(private readonly userOrderService: UsersOrderService) {}

  @Get('list')
  @ApiOperation({ summary: '获取订单列表 (倒叙)' })
  async list(
    @Req() request: Request,
    @Query() { page, pageSize, stage }: ListOrderDto,
  ) {
    const { user } = request;
    const filtered: { id: string; value: string | number }[] = [
      { id: 'user_id', value: (user as { user: UserEntity }).user.user_id },
    ];
    if (stage) filtered.push({ id: 'stage', value: +stage });
    return this.userOrderService.pagination({
      pageNum: +page - 1,
      pageSize: +pageSize,
      sorted: [{ id: 'id', desc: true }],
      filtered,
    });
  }

  @Post()
  create(@Req() request: Request, @Body() createOrderDto: CreateOrderDto) {
    return this.userOrderService.create(
      (request.user as { user: UserEntity }).user,
      createOrderDto,
    );
  }

  @Post(':id/pay-proof')
  @ApiOperation({ summary: '上传订单支付凭证 URL（用户端）' })
  async uploadPayProof(
    @Req() request: Request,
    @Param('id') id: string,
    @Body() body: UpdatePayProofDto,
  ) {
    const user = (request.user as { user: UserEntity }).user;
    await this.userOrderService.updatePayProof(user, id, body.pay_proof_url);
    return { message: 'ok' };
  }

  @Get()
  findAll() {
    return this.userOrderService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userOrderService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateOrderDto: UpdateOrderDto) {
    return this.userOrderService.update(+id, updateOrderDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userOrderService.remove(+id);
  }
}
