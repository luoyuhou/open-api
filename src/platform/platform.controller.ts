import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { PlatformService } from './platform.service';
import { UserEntity } from '../users/entities/user.entity';
import { CreateQuotaOrderDto } from './dto/create-quota-order.dto';
import { RedeemMemberQuotaDto, ValidateCodeDto } from './dto/validate-code.dto';
import { Pagination } from '../common/dto/pagination';
import { UpdateDutyUsersDto } from './dto/update-duty-users.dto';

@UseGuards(SessionAuthGuard)
@ApiTags('platform')
@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Get('quota/store-check')
  getStoreQuotaCheck(@Req() req: { user: UserEntity }) {
    return this.platformService.getStoreQuotaCheck(req.user);
  }

  @Get('quota/member-info')
  getMemberQuotaInfo(@Query('store_id') storeId: string) {
    return this.platformService.getMemberQuotaInfo(storeId);
  }

  @Post('quota-orders')
  createQuotaOrder(
    @Req() req: { user: UserEntity },
    @Body() dto: CreateQuotaOrderDto,
  ) {
    return this.platformService.createQuotaOrder(req.user, dto);
  }

  @Get('quota-orders/mine')
  listMyOrders(@Req() req: { user: UserEntity }) {
    return this.platformService.listMyOrders(req.user);
  }

  @Post('quota-orders/pagination')
  paginationOrders(@Body() pagination: Pagination) {
    return this.platformService.paginationOrders(pagination);
  }

  @Get('quota-orders/pending-count')
  getPendingOrderCount() {
    return this.platformService.getPendingOrderCount();
  }

  @Patch('quota-orders/:orderId/confirm')
  confirmOrder(
    @Param('orderId') orderId: string,
    @Req() req: { user: UserEntity },
  ) {
    return this.platformService.confirmOrder(orderId, req.user);
  }

  @Patch('quota-orders/:orderId/cancel')
  cancelOrder(@Param('orderId') orderId: string) {
    return this.platformService.cancelOrder(orderId);
  }

  @Post('codes/validate')
  validateCode(@Req() req: { user: UserEntity }, @Body() dto: ValidateCodeDto) {
    return this.platformService.validateCode(req.user, dto);
  }

  @Post('codes/redeem-member-quota')
  redeemMemberQuota(
    @Req() req: { user: UserEntity },
    @Body() dto: RedeemMemberQuotaDto,
  ) {
    return this.platformService.redeemMemberQuotaCode(
      req.user,
      dto.code,
      dto.store_id,
    );
  }

  @Post('codes/pagination')
  paginationCodes(@Body() pagination: Pagination) {
    return this.platformService.paginationCodes(pagination);
  }

  @Get('settings/duty-users')
  getDutyUsers() {
    return this.platformService.getDutyUserIds();
  }

  @Patch('settings/duty-users')
  updateDutyUsers(@Body() dto: UpdateDutyUsersDto) {
    return this.platformService.updateDutyUserIds(dto.user_ids);
  }
}
