import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard';
import { ApiProperty, ApiTags } from '@nestjs/swagger';
import { Pagination } from '../../common/dto/pagination';
import { StoreOrderService } from './store.order.service';
import { Request } from 'express';
import { UserEntity } from '../../users/entities/user.entity';

@UseGuards(SessionAuthGuard)
@Controller('store/order')
@ApiTags('store/order')
export class StoreOrderController {
  constructor(private storeOrderService: StoreOrderService) {}

  @Post('pagination')
  @ApiProperty()
  async pagination(@Req() req: Request, @Body() pagination: Pagination) {
    const user = req.user as UserEntity;
    return this.storeOrderService.pagination(user.user_id, pagination);
  }
}
